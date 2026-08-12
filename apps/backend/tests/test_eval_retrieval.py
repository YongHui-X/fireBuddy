import sys
import unittest
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from rag.evaluation.eval_retrieval import (
    EvalCase,
    build_report,
    calculate_hit_rate,
    calculate_metrics,
    deduplicate_paths,
    report_as_markdown,
    run_evaluation,
    score_case,
)


class RetrievalEvalTests(unittest.TestCase):
    def test_score_case_hits_expected_source_path(self):
        case = EvalCase(
            id="cpf_case",
            question="What are CPF retirement sums?",
            expected_source_paths=("markdown-cache/cpf/cpf-retirement-sums.md",),
            expected_topics=("cpf-retirement-sums",),
            tags=("cpf",),
        )
        matches = [
            {
                "source_path": "markdown-cache/cpf/cpf-retirement-sums.md",
                "topic": "cpf-retirement-sums",
                "similarity": 0.72,
            }
        ]

        result = score_case(case, matches)

        self.assertTrue(result.hit)
        self.assertEqual(
            result.matched_source_paths,
            ("markdown-cache/cpf/cpf-retirement-sums.md",),
        )
        self.assertEqual(result.similarities, (0.72,))
        self.assertEqual(result.first_relevant_rank, 1)

    def test_score_case_records_miss_and_retrieved_metadata(self):
        case = EvalCase(
            id="ssb_case",
            question="How do SSB redemptions work?",
            expected_source_paths=("markdown-cache/mas/singapore-savings-bonds-faqs.md",),
            expected_topics=("singapore-savings-bonds-faqs",),
            tags=("mas", "ssb"),
        )
        matches = [
            {
                "source_path": "manual/investing/investing-in-singapore.md",
                "topic": "investing",
                "similarity": "0.51",
            }
        ]

        result = score_case(case, matches)

        self.assertFalse(result.hit)
        self.assertEqual(result.retrieved_source_paths, ("manual/investing/investing-in-singapore.md",))
        self.assertEqual(result.retrieved_topics, ("investing",))
        self.assertEqual(result.similarities, (0.51,))

    def test_calculate_hit_rate(self):
        passing = EvalCase("pass", "Question", ("a.md",), (), ())
        failing = EvalCase("fail", "Question", ("b.md",), (), ())
        results = [
            score_case(passing, [{"source_path": "a.md"}]),
            score_case(failing, [{"source_path": "a.md"}]),
        ]

        self.assertEqual(calculate_hit_rate(results), 0.5)

    def test_metrics_use_unique_document_paths(self):
        case = EvalCase("one", "Question", ("a.md", "b.md"), (), ())
        result = score_case(
            case,
            [
                {"source_path": "noise.md"},
                {"source_path": "a.md"},
                {"source_path": "a.md"},
                {"source_path": "b.md"},
            ],
        )

        metrics = calculate_metrics([result])

        self.assertEqual(deduplicate_paths(result.retrieved_source_paths), ("noise.md", "a.md", "b.md"))
        self.assertEqual(metrics["hit_rate@1"], 0.0)
        self.assertEqual(metrics["hit_rate@3"], 1.0)
        self.assertAlmostEqual(metrics["precision@3"], 2 / 3)
        self.assertEqual(metrics["recall@3"], 1.0)
        self.assertAlmostEqual(metrics["mrr"], 0.5)
        self.assertGreater(metrics["ndcg@3"], 0.0)
        self.assertLess(metrics["ndcg@3"], 1.0)

    def test_report_contains_metrics_and_markdown(self):
        case = EvalCase("one", "Question", ("one.md",), (), ("test",))
        report = build_report(
            [score_case(case, [{"source_path": "one.md", "similarity": 0.8}])],
            match_count=5,
        )

        markdown = report_as_markdown(report)

        self.assertEqual(report["case_count"], 1)
        self.assertEqual(report["metrics"]["hit_rate@1"], 1.0)
        self.assertIn("# FireBuddy retrieval evaluation", markdown)
        self.assertIn("one.md", markdown)

    def test_run_evaluation_uses_injected_retriever(self):
        cases = [
            EvalCase("one", "First?", ("one.md",), (), ()),
            EvalCase("two", "Second?", ("two.md",), (), ()),
        ]

        def fake_retrieve(question: str, match_count: int):
            return [{"source_path": f"{question.split('?')[0].lower()}.md"}]

        results = run_evaluation(cases, fake_retrieve, match_count=5)

        self.assertEqual([result.hit for result in results], [False, False])
        self.assertEqual(results[0].retrieved_source_paths, ("first.md",))


if __name__ == "__main__":
    unittest.main()
