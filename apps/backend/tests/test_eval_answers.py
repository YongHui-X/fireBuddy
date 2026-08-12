import sys
import unittest
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from rag.evaluation.eval_answers import (
    AnswerEvalCase,
    citation_recall,
    concept_coverage,
    looks_like_refusal,
    numeric_accuracy,
    report_as_markdown,
    summarize_results,
)


class AnswerEvaluationTests(unittest.TestCase):
    def test_concept_and_number_checks_accept_alternatives_and_formatting(self):
        answer = "Keep an emergency fund of 3 to 6 months, readily accessible. The cap is $80,000."

        self.assertEqual(
            concept_coverage(answer, (("emergency fund",), ("liquid", "readily accessible"))),
            1.0,
        )
        self.assertEqual(numeric_accuracy(answer, ("3", "6", "80000")), 1.0)

    def test_citation_recall_uses_expected_document_paths(self):
        self.assertEqual(
            citation_recall(("a.md",), ("a.md", "b.md")),
            0.5,
        )

    def test_controlled_advisor_message_counts_as_refusal(self):
        self.assertTrue(
            looks_like_refusal("I can only help with the Singapore personal-finance topics covered by FireBuddy.")
        )
        self.assertFalse(looks_like_refusal("CPF contribution rates are 37%."))

    def test_summary_separates_positive_quality_and_refusal_accuracy(self):
        results = [
            {
                "expected_refusal": False,
                "passed": True,
                "refused": False,
                "concept_coverage": 1.0,
                "numeric_accuracy": 1.0,
                "citation_recall": 1.0,
                "judge": {
                    "groundedness": 5,
                    "factual_correctness": 4,
                    "citation_support": 5,
                    "numerical_accuracy": 5,
                },
            },
            {
                "expected_refusal": True,
                "passed": True,
                "refused": True,
                "concept_coverage": 1.0,
                "numeric_accuracy": 1.0,
                "citation_recall": 1.0,
                "judge": None,
            },
        ]

        summary = summarize_results(results)

        self.assertEqual(summary["overall_pass_rate"], 1.0)
        self.assertEqual(summary["refusal_accuracy"], 1.0)
        self.assertEqual(summary["judge_factual_correctness"], 0.8)

    def test_markdown_report_contains_case_results(self):
        report = {
            "generated_at": "2026-08-12T00:00:00+00:00",
            "case_count": 1,
            "judge_enabled": False,
            "summary": {"overall_pass_rate": 1.0},
            "cases": [
                {
                    "id": "case-one",
                    "expected_refusal": False,
                    "passed": True,
                    "concept_coverage": 1.0,
                    "numeric_accuracy": 1.0,
                    "citation_recall": 1.0,
                }
            ],
        }

        markdown = report_as_markdown(report)

        self.assertIn("# FireBuddy answer-quality evaluation", markdown)
        self.assertIn("case-one", markdown)


if __name__ == "__main__":
    unittest.main()
