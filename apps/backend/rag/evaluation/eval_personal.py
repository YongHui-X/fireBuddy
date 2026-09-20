"""
Evaluate Ember answers that use the signed-in user's own data.

Runs the production planner path (`answer_ember_question`) for one local
account, the Jen demo user by default, and checks that each answer chose an
allowed mode, quotes the numbers the deterministic tools computed, never leaks
raw records, and stays grounded according to the LLM judge. Expected facts are
computed at run time from the same tools, never hardcoded, so the suite keeps
working after the demo dataset is reseeded.

Run from the repo root with the local Supabase instance up:
    python apps/backend/rag/evaluation/eval_personal.py --email jen@demo.com --run-label "..."
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import uuid
from dataclasses import dataclass
from datetime import date, datetime, timezone
from decimal import Decimal, InvalidOperation
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[2]
EVALUATION_DIR = Path(__file__).resolve().parent
DEFAULT_CASES_PATH = EVALUATION_DIR / "personal_eval_cases.json"
DEFAULT_RESULTS_DIR = EVALUATION_DIR / "results"
DEFAULT_JSON_OUTPUT = DEFAULT_RESULTS_DIR / "personal_latest.json"
DEFAULT_MARKDOWN_OUTPUT = DEFAULT_RESULTS_DIR / "personal_latest.md"
DEFAULT_EMAIL = os.getenv("RAG_EVAL_USER_EMAIL", "jen@demo.com")
MISSING_DATA_PHRASES = (
    "no matching expenses",
    "cannot calculate",
    "not enough reliable context",
    "no recorded",
    "have not recorded",
    "no expenses recorded",
)
MIN_LEAK_DESCRIPTION_CHARS = 4

if str(BACKEND_DIR) not in sys.path:
    sys.path.append(str(BACKEND_DIR))

from rag.evaluation.eval_answers import AnswerEvalCase, judge_answer, normalized_numbers
from rag.evaluation.report_history import VersionedReportPaths, save_versioned_report
from rag.retrieval import get_supabase_client, retrieve_chunks
from services.ember_data_tools import run_ember_data_tool
from services.ember_personal_context import build_personal_context
from services.ember_planner import EmberPlan
from services.ember_service import answer_ember_question
from services.rag_service import format_retrieved_context


@dataclass(frozen=True)
class PersonalEvalCase:
    id: str
    question: str
    expected_modes: tuple[str, ...]
    required_facts: tuple[dict, ...]
    user: str
    expected_missing_data: bool


def load_cases(path: Path = DEFAULT_CASES_PATH) -> list[PersonalEvalCase]:
    raw = json.loads(path.read_text(encoding="utf-8"))
    return [
        PersonalEvalCase(
            id=item["id"],
            question=item["question"],
            expected_modes=tuple(item.get("expected_modes", [])),
            required_facts=tuple(item.get("required_facts", [])),
            user=item.get("user", "primary"),
            expected_missing_data=bool(item.get("expected_missing_data", False)),
        )
        for item in raw
    ]


def resolve_user_id(email: str) -> str:
    """Find the local account by email through the profiles table, then auth admin."""

    client = get_supabase_client()
    rows = client.table("profiles").select("id").eq("email", email).execute().data or []
    if len(rows) == 1:
        return str(rows[0]["id"])
    if len(rows) > 1:
        raise RuntimeError(f"More than one profile matches {email}")

    users = client.auth.admin.list_users()
    matches = [user for user in users if (user.email or "").lower() == email.lower()]
    if len(matches) != 1:
        raise RuntimeError(f"Expected exactly one auth user for {email}; found {len(matches)}")
    return str(matches[0].id)


def _data_plan(tool: str, **dates) -> EmberPlan:
    return EmberPlan(
        mode="data", tool=tool,
        start_date=dates.get("start_date"), end_date=dates.get("end_date"),
        comparison_start_date=dates.get("comparison_start_date"),
        comparison_end_date=dates.get("comparison_end_date"),
        category_name=None, requires_explanation=False, clarification_question=None,
    )


DATE_PATTERN = re.compile(r"\d{4}-\d{2}-\d{2}")


def expected_facts_for_evidence(user_id: str, evidence, expected: dict) -> dict:
    """
    Recompute the period-dependent facts for the dates the planner chose.

    The planner may legitimately pick a different window from the tool
    default (a full calendar month rather than month-to-date), so the
    comparison must use the same period the answer was built from. The period
    label in the evidence carries those dates.
    """

    if evidence is None or evidence.tool not in ("expense_summary", "spending_comparison"):
        return expected
    dates = [date.fromisoformat(item) for item in DATE_PATTERN.findall(evidence.period)]
    updated = dict(expected)
    if evidence.tool == "expense_summary" and len(dates) >= 1:
        start, end = dates[0], dates[-1]
        updated["expense"] = run_ember_data_tool(user_id, _data_plan("expense_summary", start_date=start, end_date=end)).facts
    elif evidence.tool == "spending_comparison" and len(dates) >= 2:
        current = dates[:2] if len(dates) >= 4 else [dates[0], dates[0]]
        previous = dates[2:4] if len(dates) >= 4 else [dates[1], dates[1]]
        updated["comparison"] = run_ember_data_tool(
            user_id,
            _data_plan(
                "spending_comparison",
                start_date=current[0], end_date=current[1],
                comparison_start_date=previous[0], comparison_end_date=previous[1],
            ),
        ).facts
    return updated


def compute_expected_facts(user_id: str) -> dict:
    """Run the deterministic tools once so every case compares against live numbers."""

    return {
        "expense": run_ember_data_tool(user_id, _data_plan("expense_summary")).facts,
        "comparison": run_ember_data_tool(user_id, _data_plan("spending_comparison")).facts,
        "personal": build_personal_context(user_id).facts,
    }


def deterministic_answer_for(user_id: str, evidence) -> str | None:
    """Return the tool's exact sentence for the evidence period, if it is a data tool."""

    if evidence is None or evidence.tool in ("personal_context", "figure_lookup"):
        return None
    dates = [date.fromisoformat(item) for item in DATE_PATTERN.findall(evidence.period)]
    kwargs: dict = {}
    if evidence.tool == "expense_summary" and dates:
        kwargs = {"start_date": dates[0], "end_date": dates[-1]}
    elif evidence.tool == "spending_comparison" and len(dates) >= 4:
        kwargs = {
            "start_date": dates[0], "end_date": dates[1],
            "comparison_start_date": dates[2], "comparison_end_date": dates[3],
        }
    elif evidence.tool in ("financial_summary", "fire_projection", "financial_health_review") and dates:
        kwargs = {"end_date": dates[0]}
    try:
        return run_ember_data_tool(user_id, _data_plan(evidence.tool, **kwargs)).exact_answer
    except Exception:
        return None


def load_user_descriptions(user_id: str) -> list[str]:
    """Raw transaction descriptions that must never appear in an answer."""

    client = get_supabase_client()
    rows = client.table("expenses").select("description").eq("user_id", user_id).execute().data or []
    return sorted({
        str(row.get("description") or "").strip()
        for row in rows
        if len(str(row.get("description") or "").strip()) >= MIN_LEAK_DESCRIPTION_CHARS
    })


def lookup_path(facts: dict, path: str):
    current = facts
    for part in path.split("."):
        if isinstance(current, list):
            index = int(part)
            current = current[index] if index < len(current) else None
        elif isinstance(current, dict):
            current = current.get(part)
        else:
            return None
        if current is None:
            return None
    return current


def _decimal(value) -> Decimal | None:
    try:
        return Decimal(str(value))
    except (InvalidOperation, ValueError, TypeError):
        return None


def fact_present(answer: str, value, fmt: str) -> bool:
    """Check that the answer states the deterministic value in an acceptable form."""

    if value is None:
        return fmt == "text_optional"
    lowered = answer.lower()
    if fmt in ("text", "text_optional", "status"):
        needle = str(value).lower().replace("_", " ")
        return needle in lowered or str(value).lower() in lowered

    number = _decimal(value)
    if number is None:
        return False
    answer_numbers = {_decimal(item) for item in normalized_numbers(answer)}
    answer_numbers.discard(None)

    if fmt == "money":
        candidates = {number.quantize(Decimal("0.01")), number.quantize(Decimal("1"))}
    elif fmt == "rate":
        percent = number * 100
        candidates = {
            percent.quantize(Decimal("0.1")), percent.quantize(Decimal("1")),
            number.quantize(Decimal("0.01")), number.quantize(Decimal("0.001")),
        }
    elif fmt == "months":
        candidates = {number.quantize(Decimal("0.1")), number.quantize(Decimal("1"))}
    else:
        candidates = {number}
    return any(
        _matches_at_precision(candidate, found)
        for candidate in candidates
        for found in answer_numbers
    )


def _matches_at_precision(candidate: Decimal, found: Decimal) -> bool:
    """Compare a number from the answer at the candidate's own precision."""

    exponent = candidate.as_tuple().exponent
    step = Decimal(1).scaleb(exponent) if isinstance(exponent, int) else Decimal(1)
    try:
        return candidate == found.quantize(step)
    except InvalidOperation:
        return False


def leaked_strings(answer: str, descriptions: list[str], user_id: str) -> list[str]:
    lowered = answer.lower()
    leaks = [item for item in descriptions if item.lower() in lowered]
    if user_id and user_id.lower() in lowered:
        leaks.append("user id")
    if "user-" in lowered:
        leaks.append("user- token")
    return leaks


def looks_like_missing_data(answer: str) -> bool:
    lowered = answer.lower()
    return any(phrase in lowered for phrase in MISSING_DATA_PHRASES)


def evaluate_case(
    case: PersonalEvalCase,
    *,
    user_id: str,
    expected: dict,
    descriptions: list[str],
    use_judge: bool,
) -> dict:
    target_user = str(uuid.uuid4()) if case.user == "missing" else user_id
    response = answer_ember_question(target_user, case.question)
    answer = response.answer
    if case.user != "missing":
        expected = expected_facts_for_evidence(user_id, response.data_evidence, expected)

    mode_ok = response.mode in case.expected_modes if case.expected_modes else True
    fact_results = []
    for fact in case.required_facts:
        # A fact may list alternatives ("any_of"): the answer must state at
        # least one of them, for example the savings rate or the savings amount.
        alternatives = fact.get("any_of") or [fact]
        checks = [
            (alt["path"], lookup_path(expected, alt["path"]), alt.get("format", "text"))
            for alt in alternatives
        ]
        present = any(fact_present(answer, value, fmt) for _, value, fmt in checks)
        fact_results.append({
            "path": " | ".join(path for path, _, _ in checks),
            "expected": [value for _, value, _ in checks] if len(checks) > 1 else checks[0][1],
            "present": present,
        })
    facts_ok = all(item["present"] for item in fact_results)
    leaks = leaked_strings(answer, descriptions, user_id)
    leak_free = not leaks
    missing_ok = looks_like_missing_data(answer) if case.expected_missing_data else True
    forbidden_numbers = set()
    if case.expected_missing_data:
        for path in ("expense.total", "personal.netWorth"):
            value = lookup_path(expected, path)
            if value is not None:
                forbidden_numbers.add(str(_decimal(value).quantize(Decimal("1"))))
        jen_numbers = {str(_decimal(item).quantize(Decimal("1"))) for item in normalized_numbers(answer)}
        missing_ok = missing_ok and not (forbidden_numbers & jen_numbers)

    # A data answer that equals the tool's own deterministic sentence needs no
    # groundedness judge: it was not generated by a model.
    deterministic = (
        not case.expected_missing_data
        and answer.strip() == (deterministic_answer_for(user_id, response.data_evidence) or "").strip()
    )
    judge = None
    if use_judge and not case.expected_missing_data and not deterministic:
        context = json.dumps(expected, indent=2, sort_keys=True)
        if response.mode == "hybrid":
            try:
                context += "\n\n" + format_retrieved_context(retrieve_chunks(case.question))
            except Exception:
                pass
        judge = judge_answer(
            AnswerEvalCase(
                id=case.id, question=case.question, expected_source_paths=(),
                required_concepts=(), required_numbers=(),
                reference_answer="The answer must use only the trusted FireBuddy facts and curated context supplied.",
                expected_refusal=False,
            ),
            answer,
            context,
        )
    judge_ok = judge is None or judge["groundedness"] >= 4

    return {
        "id": case.id,
        "question": case.question,
        "user": case.user,
        "mode": response.mode,
        "expected_modes": list(case.expected_modes),
        "answer": answer,
        "data_evidence": response.data_evidence.model_dump() if response.data_evidence else None,
        "mode_ok": mode_ok,
        "facts": fact_results,
        "facts_ok": facts_ok,
        "leaks": leaks,
        "leak_free": leak_free,
        "missing_data_ok": missing_ok,
        "deterministic_answer": deterministic,
        "judge": judge,
        "passed": mode_ok and facts_ok and leak_free and missing_ok and judge_ok,
    }


def summarize(results: list[dict]) -> dict:
    def average(values: list[float]) -> float:
        return sum(values) / len(values) if values else 0.0

    missing = [item for item in results if item["user"] == "missing"]
    judged = [item["judge"] for item in results if item["judge"]]
    return {
        "overall_pass_rate": average([float(item["passed"]) for item in results]),
        "mode_accuracy": average([float(item["mode_ok"]) for item in results]),
        "fact_accuracy": average([float(item["facts_ok"]) for item in results]),
        "leak_free_rate": average([float(item["leak_free"]) for item in results]),
        "missing_data_refusal_accuracy": average([float(item["missing_data_ok"]) for item in missing]) if missing else 1.0,
        "judge_groundedness": average([item["groundedness"] / 5 for item in judged]),
    }


def build_report(results: list[dict], *, email: str, use_judge: bool) -> dict:
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "case_count": len(results),
        "account_email": email,
        "judge_enabled": use_judge,
        "summary": summarize(results),
        "cases": results,
    }


def report_as_markdown(report: dict) -> str:
    lines = [
        "# FireBuddy personal-data evaluation",
        "",
        f"Generated: `{report['generated_at']}`",
        f"Cases: **{report['case_count']}**",
        f"Account: **{report['account_email']}**",
        f"LLM judge: **{'enabled' if report['judge_enabled'] else 'disabled'}**",
        "",
        "## Summary",
        "",
        "| Metric | Score |",
        "|---|---:|",
    ]
    lines.extend(f"| {name} | {value:.4f} |" for name, value in report["summary"].items())
    lines.extend(["", "## Cases", "", "| Case | Mode | Result | Facts | Leak-free | Judge |", "|---|---|---|---|---|---:|"])
    for case in report["cases"]:
        facts = f"{sum(f['present'] for f in case['facts'])}/{len(case['facts'])}" if case["facts"] else "n/a"
        judge = (
            f"{case['judge']['groundedness']}/5" if case["judge"]
            else ("deterministic" if case.get("deterministic_answer") else "n/a")
        )
        lines.append(
            f"| {case['id']} | {case['mode']} | {'pass' if case['passed'] else 'fail'} | "
            f"{facts} | {'yes' if case['leak_free'] else 'NO'} | {judge} |"
        )
    return "\n".join(lines) + "\n"


def save_report(report: dict, json_path: Path, markdown_path: Path, run_label: str) -> VersionedReportPaths:
    return save_versioned_report(
        suite="personal",
        report=report,
        markdown=report_as_markdown(report),
        results_directory=json_path.parent,
        latest_json_path=json_path,
        latest_markdown_path=markdown_path,
        run_label=run_label,
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="Evaluate Ember answers over a local account's data")
    parser.add_argument("--email", default=DEFAULT_EMAIL)
    parser.add_argument("--cases", type=Path, default=DEFAULT_CASES_PATH)
    parser.add_argument("--json-output", type=Path, default=DEFAULT_JSON_OUTPUT)
    parser.add_argument("--markdown-output", type=Path, default=DEFAULT_MARKDOWN_OUTPUT)
    parser.add_argument("--run-label", default="Major personal-data evaluation")
    parser.add_argument("--no-judge", action="store_true")
    parser.add_argument("--no-save", action="store_true")
    parser.add_argument("--case-id", action="append")
    args = parser.parse_args()

    user_id = resolve_user_id(args.email)
    expected = compute_expected_facts(user_id)
    descriptions = load_user_descriptions(user_id)
    cases = load_cases(args.cases)
    if args.case_id:
        cases = [case for case in cases if case.id in set(args.case_id)]

    results = [
        evaluate_case(
            case, user_id=user_id, expected=expected, descriptions=descriptions,
            use_judge=not args.no_judge,
        )
        for case in cases
    ]
    report = build_report(results, email=args.email, use_judge=not args.no_judge)
    for name, value in report["summary"].items():
        print(f"{name}: {value:.4f}")
    for result in results:
        if not result["passed"]:
            print(f"[FAIL] {result['id']} mode={result['mode']} facts={result['facts']} leaks={result['leaks']}")
            print(f"       {result['answer'][:300]}")

    if not args.no_save:
        saved = save_report(report, args.json_output, args.markdown_output, args.run_label)
        print(f"Saved report version: Version {saved.version}")
    return 0 if all(result["passed"] for result in results) else 1


if __name__ == "__main__":
    raise SystemExit(main())
