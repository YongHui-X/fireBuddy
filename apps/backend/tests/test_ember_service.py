import sys
import unittest
from datetime import date
from pathlib import Path
from unittest.mock import patch


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from services import ember_service
from services.ember_data_tools import EmberDataResult
from services.ember_planner import EmberPlan


class EmberServiceTests(unittest.TestCase):
    def test_data_question_executes_one_tool_with_server_user_id(self):
        planned = EmberPlan(
            mode="data", tool="expense_summary", start_date=date(2026, 8, 1), end_date=date(2026, 8, 31),
            comparison_start_date=None, comparison_end_date=None, category_name=None,
            requires_explanation=False, clarification_question=None,
        )
        result = EmberDataResult(
            tool="expense_summary", label="Expense summary", period="2026-08-01 to 2026-08-31",
            record_count=2, destination="/insights", facts={"total": "35.00"}, exact_answer="You spent S$35.00.",
        )
        with patch.object(ember_service, "plan_ember_question", return_value=planned), patch.object(
            ember_service, "run_ember_data_tool", return_value=result,
        ) as tool:
            response = ember_service.answer_ember_question("user-a", "What did I spend in August?")

        tool.assert_called_once_with("user-a", planned)
        self.assertEqual(response.mode, "data")
        self.assertEqual(response.answer, "You spent S$35.00.")
        self.assertEqual(response.data_evidence.record_count, 2)

    def test_simple_data_answer_does_not_make_a_second_model_call(self):
        planned = EmberPlan(
            mode="data", tool="expense_summary", start_date=date(2026, 8, 1), end_date=date(2026, 8, 31),
            comparison_start_date=None, comparison_end_date=None, category_name=None,
            requires_explanation=False, clarification_question=None,
        )
        result = EmberDataResult("expense_summary", "Expense summary", "August", 1, "/insights", {"total": "10.00"}, "S$10.00")
        with patch.object(ember_service, "plan_ember_question", return_value=planned), patch.object(
            ember_service, "run_ember_data_tool", return_value=result,
        ), patch.object(ember_service, "generate_grounded_answer") as generate:
            ember_service.answer_ember_question("user-a", "August total")

        generate.assert_not_called()

    def test_stream_includes_aggregate_evidence_without_identity(self):
        planned = EmberPlan(
            mode="data", tool="expense_summary", start_date=date(2026, 8, 1), end_date=date(2026, 8, 31),
            comparison_start_date=None, comparison_end_date=None, category_name=None,
            requires_explanation=False, clarification_question=None,
        )
        result = EmberDataResult("expense_summary", "Expense summary", "August", 1, "/insights", {"total": "10.00"}, "S$10.00")
        with patch.object(ember_service, "plan_ember_question", return_value=planned), patch.object(
            ember_service, "run_ember_data_tool", return_value=result,
        ):
            events = list(ember_service.stream_ember_question("user-a", "August total"))

        evidence = next(event for event in events if event["event"] == "evidence")
        self.assertEqual(evidence["data"]["dataEvidence"]["tool"], "expense_summary")
        self.assertNotIn("user-a", str(events))


if __name__ == "__main__":
    unittest.main()
