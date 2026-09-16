"""
Fail when the committed evaluation reports fall below the recorded thresholds.

CI has no OpenAI or Supabase credentials, so it cannot run the live evals.
What it can do is refuse a commit whose `*_latest.json` reports are worse than
the thresholds in `baseline_thresholds.json`. Raise the thresholds when a run
improves the numbers; never lower them silently.

Run from the repo root:
    python apps/backend/rag/evaluation/check_regression.py
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


EVALUATION_DIR = Path(__file__).resolve().parent
DEFAULT_THRESHOLDS_PATH = EVALUATION_DIR / "baseline_thresholds.json"
DEFAULT_RETRIEVAL_REPORT = EVALUATION_DIR / "results" / "retrieval_latest.json"
DEFAULT_ANSWER_REPORT = EVALUATION_DIR / "results" / "answer_latest.json"


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def find_regressions(
    thresholds: dict,
    retrieval_report: dict,
    answer_report: dict,
) -> list[str]:
    """Return one line per metric that is below its threshold minus tolerance."""

    tolerance = float(thresholds.get("tolerance", 0.0))
    problems: list[str] = []

    checks = (
        ("retrieval", thresholds.get("retrieval", {}), retrieval_report.get("metrics", {})),
        ("answer", thresholds.get("answer", {}), answer_report.get("summary", {})),
    )
    for suite, minimums, actual in checks:
        for metric, minimum in minimums.items():
            value = actual.get(metric)
            if value is None:
                problems.append(f"{suite}.{metric}: missing from the latest report")
                continue
            if float(value) + tolerance < float(minimum):
                problems.append(
                    f"{suite}.{metric}: {float(value):.4f} is below the threshold "
                    f"{float(minimum):.4f} (tolerance {tolerance:.2f})"
                )

    for suite, report, key in (
        ("retrieval", retrieval_report, "min_retrieval_cases"),
        ("answer", answer_report, "min_answer_cases"),
    ):
        minimum_cases = thresholds.get(key)
        if minimum_cases is not None and report.get("case_count", 0) < minimum_cases:
            problems.append(
                f"{suite}: only {report.get('case_count', 0)} cases; "
                f"expected at least {minimum_cases}"
            )
    return problems


def main() -> int:
    parser = argparse.ArgumentParser(description="Check RAG eval reports against thresholds")
    parser.add_argument("--thresholds", type=Path, default=DEFAULT_THRESHOLDS_PATH)
    parser.add_argument("--retrieval-report", type=Path, default=DEFAULT_RETRIEVAL_REPORT)
    parser.add_argument("--answer-report", type=Path, default=DEFAULT_ANSWER_REPORT)
    args = parser.parse_args()

    problems = find_regressions(
        load_json(args.thresholds),
        load_json(args.retrieval_report),
        load_json(args.answer_report),
    )
    if problems:
        print("RAG evaluation regression detected:")
        for problem in problems:
            print(f"  - {problem}")
        return 1
    print("RAG evaluation reports meet the recorded thresholds.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
