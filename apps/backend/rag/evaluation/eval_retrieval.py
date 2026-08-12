"""Evaluate FireBuddy retrieval quality and persist comparable reports."""

from __future__ import annotations

import argparse
import json
import math
import sys
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable


BACKEND_DIR = Path(__file__).resolve().parents[2]
EVALUATION_DIR = Path(__file__).resolve().parent
DEFAULT_QUESTIONS_PATH = EVALUATION_DIR / "rag_questions.json"
DEFAULT_RESULTS_DIR = EVALUATION_DIR / "results"
DEFAULT_JSON_OUTPUT = DEFAULT_RESULTS_DIR / "retrieval_latest.json"
DEFAULT_MARKDOWN_OUTPUT = DEFAULT_RESULTS_DIR / "retrieval_latest.md"
DEFAULT_K_VALUES = (1, 3, 5)

if str(BACKEND_DIR) not in sys.path:
    sys.path.append(str(BACKEND_DIR))

from rag.evaluation.report_history import (
    VersionedReportPaths,
    save_versioned_report,
)


@dataclass(frozen=True)
class EvalCase:
    """Represents one retrieval question and its relevant documents."""

    id: str
    question: str
    expected_source_paths: tuple[str, ...]
    expected_topics: tuple[str, ...]
    tags: tuple[str, ...]


@dataclass(frozen=True)
class CaseResult:
    """Stores retrieved metadata and document-level relevance for one case."""

    case: EvalCase
    hit: bool
    matched_source_paths: tuple[str, ...]
    retrieved_source_paths: tuple[str, ...]
    unique_retrieved_source_paths: tuple[str, ...]
    retrieved_topics: tuple[str, ...]
    similarities: tuple[float, ...]
    first_relevant_rank: int | None


def load_eval_cases(path: Path = DEFAULT_QUESTIONS_PATH) -> list[EvalCase]:
    """Load retrieval evaluation cases from JSON."""

    raw_cases = json.loads(path.read_text(encoding="utf-8"))
    return [
        EvalCase(
            id=raw_case["id"],
            question=raw_case["question"],
            expected_source_paths=tuple(raw_case["expected_source_paths"]),
            expected_topics=tuple(raw_case.get("expected_topics", [])),
            tags=tuple(raw_case.get("tags", [])),
        )
        for raw_case in raw_cases
    ]


def _safe_similarity(value) -> float:
    """Convert stored similarity values to floats for stable reporting."""

    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def deduplicate_paths(paths: tuple[str, ...]) -> tuple[str, ...]:
    """Keep the first occurrence of each retrieved document path."""

    return tuple(dict.fromkeys(paths))


def score_case(case: EvalCase, matches: list[dict]) -> CaseResult:
    """Score one case using unique document paths instead of duplicate chunks."""

    expected_paths = set(case.expected_source_paths)
    retrieved_paths = tuple(
        path for path in (match.get("source_path") for match in matches) if path
    )
    unique_paths = deduplicate_paths(retrieved_paths)
    matched_paths = tuple(path for path in unique_paths if path in expected_paths)
    first_relevant_rank = next(
        (index for index, path in enumerate(unique_paths, start=1) if path in expected_paths),
        None,
    )

    return CaseResult(
        case=case,
        hit=bool(matched_paths),
        matched_source_paths=matched_paths,
        retrieved_source_paths=retrieved_paths,
        unique_retrieved_source_paths=unique_paths,
        retrieved_topics=tuple(
            topic for topic in (match.get("topic") for match in matches) if topic
        ),
        similarities=tuple(
            _safe_similarity(match.get("similarity")) for match in matches
        ),
        first_relevant_rank=first_relevant_rank,
    )


def relevant_count_at_k(result: CaseResult, k: int) -> int:
    """Count distinct relevant documents retrieved within the first k documents."""

    expected = set(result.case.expected_source_paths)
    return sum(
        1 for path in result.unique_retrieved_source_paths[:k] if path in expected
    )


def hit_rate_at_k(results: list[CaseResult], k: int) -> float:
    """Return the fraction of cases with at least one relevant document by k."""

    if not results:
        return 0.0
    return sum(relevant_count_at_k(result, k) > 0 for result in results) / len(results)


def precision_at_k(results: list[CaseResult], k: int) -> float:
    """Return macro-averaged document precision at k."""

    if not results or k <= 0:
        return 0.0
    return sum(relevant_count_at_k(result, k) / k for result in results) / len(results)


def recall_at_k(results: list[CaseResult], k: int) -> float:
    """Return macro-averaged recall of labeled relevant documents at k."""

    if not results:
        return 0.0
    recalls = [
        relevant_count_at_k(result, k) / len(result.case.expected_source_paths)
        for result in results
        if result.case.expected_source_paths
    ]
    return sum(recalls) / len(recalls) if recalls else 0.0


def reciprocal_rank(result: CaseResult) -> float:
    """Return reciprocal rank of the first relevant document."""

    return 1 / result.first_relevant_rank if result.first_relevant_rank else 0.0


def mean_reciprocal_rank(results: list[CaseResult]) -> float:
    """Return mean reciprocal rank across all cases."""

    if not results:
        return 0.0
    return sum(reciprocal_rank(result) for result in results) / len(results)


def average_precision_at_k(result: CaseResult, k: int) -> float:
    """Return average precision at k for one binary-relevance case."""

    expected = set(result.case.expected_source_paths)
    if not expected:
        return 0.0

    hits = 0
    precision_sum = 0.0
    for rank, path in enumerate(result.unique_retrieved_source_paths[:k], start=1):
        if path in expected:
            hits += 1
            precision_sum += hits / rank

    return precision_sum / min(len(expected), k)


def mean_average_precision_at_k(results: list[CaseResult], k: int) -> float:
    """Return mean average precision at k."""

    if not results:
        return 0.0
    return sum(average_precision_at_k(result, k) for result in results) / len(results)


def ndcg_at_k(results: list[CaseResult], k: int) -> float:
    """Return macro-averaged normalized discounted cumulative gain at k."""

    if not results:
        return 0.0

    scores = []
    for result in results:
        expected = set(result.case.expected_source_paths)
        if not expected:
            continue
        dcg = sum(
            1 / math.log2(rank + 1)
            for rank, path in enumerate(result.unique_retrieved_source_paths[:k], start=1)
            if path in expected
        )
        ideal_relevant = min(len(expected), k)
        idcg = sum(1 / math.log2(rank + 1) for rank in range(1, ideal_relevant + 1))
        scores.append(dcg / idcg if idcg else 0.0)

    return sum(scores) / len(scores) if scores else 0.0


def calculate_hit_rate(results: list[CaseResult]) -> float:
    """Keep the original full-result hit-rate helper for compatibility."""

    if not results:
        return 0.0
    max_k = max((len(result.unique_retrieved_source_paths) for result in results), default=0)
    return hit_rate_at_k(results, max_k)


def calculate_metrics(
    results: list[CaseResult],
    k_values: tuple[int, ...] = DEFAULT_K_VALUES,
) -> dict[str, float]:
    """Calculate comparable document-retrieval metrics."""

    metrics = {"mrr": mean_reciprocal_rank(results)}
    for k in k_values:
        metrics[f"hit_rate@{k}"] = hit_rate_at_k(results, k)
        metrics[f"precision@{k}"] = precision_at_k(results, k)
        metrics[f"recall@{k}"] = recall_at_k(results, k)
        metrics[f"map@{k}"] = mean_average_precision_at_k(results, k)
        metrics[f"ndcg@{k}"] = ndcg_at_k(results, k)
    return metrics


def run_evaluation(
    cases: list[EvalCase],
    retrieve: Callable[[str, int], list[dict]],
    *,
    match_count: int = 5,
) -> list[CaseResult]:
    """Run retrieval for every case and return structured results."""

    return [
        score_case(case, retrieve(case.question, match_count))
        for case in cases
    ]


def build_report(results: list[CaseResult], match_count: int) -> dict:
    """Create a JSON-serializable retrieval evaluation report."""

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "match_count": match_count,
        "case_count": len(results),
        "metrics": calculate_metrics(results),
        "cases": [
            {
                "id": result.case.id,
                "question": result.case.question,
                "expected_source_paths": list(result.case.expected_source_paths),
                "tags": list(result.case.tags),
                "hit": result.hit,
                "first_relevant_rank": result.first_relevant_rank,
                "matched_source_paths": list(result.matched_source_paths),
                "retrieved_source_paths": list(result.retrieved_source_paths),
                "unique_retrieved_source_paths": list(result.unique_retrieved_source_paths),
                "similarities": list(result.similarities),
            }
            for result in results
        ],
    }


def report_as_markdown(report: dict) -> str:
    """Render a concise Markdown summary and per-case ranking table."""

    lines = [
        "# FireBuddy retrieval evaluation",
        "",
        f"Generated: `{report['generated_at']}`",
        f"Cases: **{report['case_count']}**",
        f"Retrieved chunks per question: **{report['match_count']}**",
        "",
        "## Metrics",
        "",
        "| Metric | Score |",
        "|---|---:|",
    ]
    lines.extend(
        f"| {name} | {value:.4f} |"
        for name, value in report["metrics"].items()
    )
    lines.extend(
        [
            "",
            "## Cases",
            "",
            "| Case | First relevant rank | Relevant paths found |",
            "|---|---:|---|",
        ]
    )
    for case in report["cases"]:
        rank = case["first_relevant_rank"] or "miss"
        matches = "<br>".join(case["matched_source_paths"]) or "None"
        lines.append(f"| {case['id']} | {rank} | {matches} |")
    return "\n".join(lines) + "\n"


def save_report(
    report: dict,
    json_path: Path,
    markdown_path: Path,
    run_label: str,
) -> VersionedReportPaths:
    """Persist an immutable retrieval version and refresh the latest copies."""

    return save_versioned_report(
        suite="retrieval",
        report=report,
        markdown=report_as_markdown(report),
        results_directory=json_path.parent,
        latest_json_path=json_path,
        latest_markdown_path=markdown_path,
        run_label=run_label,
    )


def print_report(report: dict) -> None:
    """Print the metric summary and failed cases."""

    print(f"Retrieval evaluation: {report['case_count']} cases")
    for name, value in report["metrics"].items():
        print(f"{name}: {value:.4f}")

    misses = [case for case in report["cases"] if not case["hit"]]
    for case in misses:
        print(f"\n[FAIL] {case['id']}")
        print(f"Question: {case['question']}")
        print(f"Expected paths: {case['expected_source_paths']}")
        print(f"Retrieved paths: {case['unique_retrieved_source_paths']}")


def main() -> int:
    """Run live retrieval evaluation and persist a numbered report version."""

    parser = argparse.ArgumentParser(
        description="Evaluate FireBuddy retrieval and save metrics"
    )
    parser.add_argument("--questions", type=Path, default=DEFAULT_QUESTIONS_PATH)
    parser.add_argument("--match-count", type=int, default=5)
    parser.add_argument("--json-output", type=Path, default=DEFAULT_JSON_OUTPUT)
    parser.add_argument("--markdown-output", type=Path, default=DEFAULT_MARKDOWN_OUTPUT)
    parser.add_argument(
        "--run-label",
        default="Major retrieval evaluation",
        help="Short description shown beside this immutable report version",
    )
    parser.add_argument("--no-save", action="store_true")
    args = parser.parse_args()

    from rag.retrieval import retrieve_chunks

    cases = load_eval_cases(args.questions)
    results = run_evaluation(cases, retrieve_chunks, match_count=args.match_count)
    report = build_report(results, args.match_count)
    print_report(report)

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

    return 0 if report["metrics"].get("hit_rate@5") == 1.0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
