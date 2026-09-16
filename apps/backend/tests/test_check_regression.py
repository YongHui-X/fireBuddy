import sys
import unittest
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from rag.evaluation.check_regression import (
    DEFAULT_ANSWER_REPORT,
    DEFAULT_RETRIEVAL_REPORT,
    DEFAULT_THRESHOLDS_PATH,
    find_regressions,
    load_json,
)


class RegressionCheckTests(unittest.TestCase):
    def test_reports_metrics_below_threshold_and_missing_metrics(self):
        thresholds = {
            "tolerance": 0.01,
            "retrieval": {"hit_rate@3": 0.95, "ndcg@5": 0.80},
            "answer": {"refusal_accuracy": 1.0},
            "min_retrieval_cases": 10,
        }
        problems = find_regressions(
            thresholds,
            {"case_count": 5, "metrics": {"hit_rate@3": 0.945}},
            {"summary": {"refusal_accuracy": 0.5}},
        )

        self.assertEqual(len(problems), 3)
        self.assertTrue(any("ndcg@5: missing" in p for p in problems))
        self.assertTrue(any("refusal_accuracy" in p for p in problems))
        self.assertTrue(any("only 5 cases" in p for p in problems))

    def test_committed_reports_meet_committed_thresholds(self):
        problems = find_regressions(
            load_json(DEFAULT_THRESHOLDS_PATH),
            load_json(DEFAULT_RETRIEVAL_REPORT),
            load_json(DEFAULT_ANSWER_REPORT),
        )

        self.assertEqual(problems, [])


if __name__ == "__main__":
    unittest.main()
