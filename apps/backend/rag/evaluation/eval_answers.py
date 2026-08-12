"""Evaluate final RAG answers for evidence, facts, numbers, citations, and refusals."""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

from openai import OpenAI


BACKEND_DIR = Path(__file__).resolve().parents[2]
EVALUATION_DIR = Path(__file__).resolve().parent
DEFAULT_CASES_PATH = EVALUATION_DIR / "answer_eval_cases.json"
DEFAULT_RESULTS_DIR = EVALUATION_DIR / "results"
DEFAULT_JSON_OUTPUT = DEFAULT_RESULTS_DIR / "answer_latest.json"
DEFAULT_MARKDOWN_OUTPUT = DEFAULT_RESULTS_DIR / "answer_latest.md"
REFUSAL_PHRASES = (
    "i can only help with",
    "i do not have enough reliable context",
    "i could not find relevant information",
    "outside the firebuddy knowledge base",
)

if str(BACKEND_DIR) not in sys.path:
    sys.path.append(str(BACKEND_DIR))

from rag.evaluation.report_history import (
    VersionedReportPaths,
    save_versioned_report,
)
from rag.retrieval import retrieve_chunks
from services.rag_service import (
    answer_financial_advisor_question,
    format_retrieved_context,
)


@dataclass(frozen=True)
class AnswerEvalCase:
    """Defines the evidence and behavior expected for one advisor question."""

    id: str
    question: str
    expected_source_paths: tuple[str, ...]
    required_concepts: tuple[tuple[str, ...], ...]
    required_numbers: tuple[str, ...]
    reference_answer: str
    expected_refusal: bool


def load_answer_cases(path: Path = DEFAULT_CASES_PATH) -> list[AnswerEvalCase]:
    """Load answer-quality cases from JSON."""

    raw_cases = json.loads(path.read_text(encoding="utf-8"))
    return [
        AnswerEvalCase(
            id=item["id"],
            question=item["question"],
            expected_source_paths=tuple(item.get("expected_source_paths", [])),
            required_concepts=tuple(
                tuple(alternatives) for alternatives in item.get("required_concepts", [])
            ),
            required_numbers=tuple(item.get("required_numbers", [])),
            reference_answer=item["reference_answer"],
            expected_refusal=bool(item.get("expected_refusal", False)),
        )
        for item in raw_cases
    ]


def normalize_text(value: str) -> str:
    """Normalize case and punctuation for deterministic answer checks."""

    return " ".join(re.sub(r"[^a-z0-9.%$]+", " ", value.lower()).split())


def normalized_numbers(value: str) -> set[str]:
    """Extract comparable numeric tokens while ignoring commas and currency signs."""

    compact = value.replace(",", "")
    return set(re.findall(r"\d+(?:\.\d+)?", compact))


def concept_coverage(answer: str, concepts: tuple[tuple[str, ...], ...]) -> float:
    """Measure how many required concept groups appear in the answer."""

    if not concepts:
        return 1.0
    normalized = normalize_text(answer)
    covered = sum(
        any(normalize_text(alternative) in normalized for alternative in alternatives)
        for alternatives in concepts
    )
    return covered / len(concepts)


def numeric_accuracy(answer: str, required_numbers: tuple[str, ...]) -> float:
    """Measure exact presence of required numeric facts."""

    if not required_numbers:
        return 1.0
    answer_numbers = normalized_numbers(answer)
    expected_numbers = {number.replace(",", "") for number in required_numbers}
    return len(answer_numbers & expected_numbers) / len(expected_numbers)


def citation_recall(source_paths: tuple[str, ...], expected_paths: tuple[str, ...]) -> float:
    """Measure how many labeled source documents are cited by the response."""

    if not expected_paths:
        return 1.0
    return len(set(source_paths) & set(expected_paths)) / len(set(expected_paths))


def looks_like_refusal(answer: str) -> bool:
    """Detect the advisor's controlled refusal responses."""

    normalized = answer.lower()
    return any(phrase in normalized for phrase in REFUSAL_PHRASES)


def get_judge_model() -> str:
    """Return a plain OpenAI model name for structured answer judging."""

    model = os.getenv("RAG_EVAL_MODEL", os.getenv("RAG_MODEL", "gpt-4o-mini")).strip()
    return model.removeprefix("openai/") or "gpt-4o-mini"


def judge_answer(
    case: AnswerEvalCase,
    answer: str,
    context: str,
) -> dict:
    """Use a structured judge to score evidence grounding and factual quality."""

    response = OpenAI().chat.completions.create(
        model=get_judge_model(),
        temperature=0,
        response_format={"type": "json_object"},
        messages=[
            {
                "role": "system",
                "content": (
                    "You evaluate a Singapore personal-finance RAG answer. "
                    "Use only the supplied retrieved context and reference criteria. "
                    "Return JSON with integer scores from 1 to 5 for groundedness, "
                    "factual_correctness, citation_support, and numerical_accuracy, "
                    "plus a short rationale. A score of 5 means fully supported and "
                    "correct; 1 means unsupported or materially wrong."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Question:\n{case.question}\n\n"
                    f"Reference criteria:\n{case.reference_answer}\n\n"
                    f"Answer:\n{answer}\n\n"
                    f"Retrieved context:\n{context}"
                ),
            },
        ],
    )
    raw = response.choices[0].message.content or "{}"
    parsed = json.loads(raw)
    return {
        "groundedness": int(parsed.get("groundedness", 1)),
        "factual_correctness": int(parsed.get("factual_correctness", 1)),
        "citation_support": int(parsed.get("citation_support", 1)),
        "numerical_accuracy": int(parsed.get("numerical_accuracy", 1)),
        "rationale": str(parsed.get("rationale", "")),
    }


def evaluate_case(case: AnswerEvalCase, *, use_judge: bool = True) -> dict:
    """Run the actual advisor flow and score one answer-quality case."""

    matches = [] if case.expected_refusal else retrieve_chunks(case.question)
    response = answer_financial_advisor_question(
        case.question,
        retrieved_matches=matches,
    )
    source_paths = tuple(
        source.path for source in response.source_details if source.path
    )
    refused = looks_like_refusal(response.answer)
    concepts = concept_coverage(response.answer, case.required_concepts)
    numbers = numeric_accuracy(response.answer, case.required_numbers)
    citations = citation_recall(source_paths, case.expected_source_paths)
    context = format_retrieved_context(matches)

    judge = None
    if use_judge and not case.expected_refusal and context:
        judge = judge_answer(case, response.answer, context)

    if case.expected_refusal:
        passed = refused and not source_paths
    else:
        judge_passed = judge is None or (
            judge["groundedness"] >= 4
            and judge["citation_support"] >= 4
            and judge["factual_correctness"] == 5
            and judge["numerical_accuracy"] == 5
        )
        passed = (
            not refused
            and concepts == 1.0
            and numbers == 1.0
            and citations > 0.0
            and judge_passed
        )

    return {
        "id": case.id,
        "question": case.question,
        "expected_refusal": case.expected_refusal,
        "answer": response.answer,
        "refused": refused,
        "passed": passed,
        "concept_coverage": concepts,
        "numeric_accuracy": numbers,
        "citation_recall": citations,
        "expected_source_paths": list(case.expected_source_paths),
        "source_paths": list(source_paths),
        "judge": judge,
    }


def summarize_results(results: list[dict]) -> dict:
    """Aggregate deterministic and judge-based answer metrics."""

    positive = [result for result in results if not result["expected_refusal"]]
    negative = [result for result in results if result["expected_refusal"]]
    judged = [result["judge"] for result in positive if result["judge"]]

    def average(values: list[float]) -> float:
        return sum(values) / len(values) if values else 0.0

    summary = {
        "overall_pass_rate": average([float(result["passed"]) for result in results]),
        "positive_pass_rate": average([float(result["passed"]) for result in positive]),
        "refusal_accuracy": average([float(result["refused"]) for result in negative]),
        "concept_coverage": average([result["concept_coverage"] for result in positive]),
        "numeric_accuracy": average([result["numeric_accuracy"] for result in positive]),
        "citation_recall": average([result["citation_recall"] for result in positive]),
    }
    for name in (
        "groundedness",
        "factual_correctness",
        "citation_support",
        "numerical_accuracy",
    ):
        summary[f"judge_{name}"] = average([item[name] / 5 for item in judged])
    return summary


def build_report(results: list[dict], use_judge: bool) -> dict:
    """Create the persisted answer-quality report."""

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "case_count": len(results),
        "judge_enabled": use_judge,
        "judge_model": get_judge_model() if use_judge else None,
        "summary": summarize_results(results),
        "cases": results,
    }


def report_as_markdown(report: dict) -> str:
    """Render answer-quality results as a compact Markdown artifact."""

    lines = [
        "# FireBuddy answer-quality evaluation",
        "",
        f"Generated: `{report['generated_at']}`",
        f"Cases: **{report['case_count']}**",
        f"LLM judge: **{'enabled' if report['judge_enabled'] else 'disabled'}**",
        "",
        "## Summary",
        "",
        "| Metric | Score |",
        "|---|---:|",
    ]
    lines.extend(
        f"| {name} | {value:.4f} |"
        for name, value in report["summary"].items()
    )
    lines.extend(
        [
            "",
            "## Cases",
            "",
            "| Case | Expected behavior | Result | Concepts | Numbers | Citations |",
            "|---|---|---|---:|---:|---:|",
        ]
    )
    for case in report["cases"]:
        expected = "refuse" if case["expected_refusal"] else "answer"
        result = "pass" if case["passed"] else "fail"
        lines.append(
            f"| {case['id']} | {expected} | {result} | "
            f"{case['concept_coverage']:.2f} | {case['numeric_accuracy']:.2f} | "
            f"{case['citation_recall']:.2f} |"
        )
    return "\n".join(lines) + "\n"


def save_report(
    report: dict,
    json_path: Path,
    markdown_path: Path,
    run_label: str,
) -> VersionedReportPaths:
    """Persist an immutable answer version and refresh the latest copies."""

    return save_versioned_report(
        suite="answer",
        report=report,
        markdown=report_as_markdown(report),
        results_directory=json_path.parent,
        latest_json_path=json_path,
        latest_markdown_path=markdown_path,
        run_label=run_label,
    )


def main() -> int:
    """Run live answer evaluation and save a numbered report version."""

    parser = argparse.ArgumentParser(description="Evaluate FireBuddy final RAG answers")
    parser.add_argument("--cases", type=Path, default=DEFAULT_CASES_PATH)
    parser.add_argument("--json-output", type=Path, default=DEFAULT_JSON_OUTPUT)
    parser.add_argument("--markdown-output", type=Path, default=DEFAULT_MARKDOWN_OUTPUT)
    parser.add_argument(
        "--run-label",
        default="Major answer-quality evaluation",
        help="Short description shown beside this immutable report version",
    )
    parser.add_argument("--no-judge", action="store_true")
    parser.add_argument("--no-save", action="store_true")
    parser.add_argument(
        "--case-id",
        action="append",
        help="Run only the named case; repeat this option for multiple cases",
    )
    args = parser.parse_args()

    use_judge = not args.no_judge
    cases = load_answer_cases(args.cases)
    if args.case_id:
        selected_ids = set(args.case_id)
        cases = [case for case in cases if case.id in selected_ids]
        missing_ids = selected_ids - {case.id for case in cases}
        if missing_ids:
            parser.error(f"Unknown case id(s): {', '.join(sorted(missing_ids))}")

    results = [
        evaluate_case(case, use_judge=use_judge)
        for case in cases
    ]
    report = build_report(results, use_judge)

    for name, value in report["summary"].items():
        print(f"{name}: {value:.4f}")
    for result in results:
        if not result["passed"]:
            print(f"[FAIL] {result['id']}: {result['answer']}")

    if not args.no_save:
        saved = save_report(
            report,
            args.json_output,
            args.markdown_output,
            args.run_label,
        )
        print(f"Saved report version: Version {saved.version}")
        print(f"Saved versioned JSON: {saved.json_path}")
        print(f"Saved versioned Markdown: {saved.markdown_path}")
        print(f"Saved JSON report: {args.json_output}")
        print(f"Saved Markdown report: {args.markdown_output}")

    return 0 if all(result["passed"] for result in results) else 1


if __name__ == "__main__":
    raise SystemExit(main())
