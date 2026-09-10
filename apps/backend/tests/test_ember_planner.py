import sys
import unittest
from datetime import date
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from pydantic import ValidationError


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from services import ember_planner
from services.ember_planner import EmberPlan


class EmberPlannerTests(unittest.TestCase):
    def test_plan_schema_rejects_identity_and_sql_fields(self):
        with self.assertRaises(ValidationError):
            EmberPlan.model_validate({
                "mode": "data", "tool": "expense_summary", "start_date": "2026-08-01", "end_date": "2026-08-31",
                "comparison_start_date": None, "comparison_end_date": None, "category_name": None,
                "requires_explanation": False, "clarification_question": None,
                "user_id": "user-b", "sql": "select * from expenses",
            })

    def test_planner_prompt_contains_tools_and_date_but_no_user_identity(self):
        parsed = EmberPlan(
            mode="data", tool="fire_projection", start_date=None, end_date=date(2026, 9, 4),
            comparison_start_date=None, comparison_end_date=None, category_name=None,
            requires_explanation=True, clarification_question=None,
        )
        parse = unittest.mock.Mock(return_value=SimpleNamespace(
            choices=[SimpleNamespace(message=SimpleNamespace(parsed=parsed))],
        ))
        client = SimpleNamespace(chat=SimpleNamespace(completions=SimpleNamespace(parse=parse)))
        with patch.object(ember_planner, "OpenAI", return_value=client):
            result = ember_planner.plan_ember_question(
                "How long more to FIRE?", today=date(2026, 9, 4),
            )

        self.assertEqual(result.tool, "fire_projection")
        payload = parse.call_args.kwargs
        self.assertFalse(payload["store"])
        prompt = str(payload["messages"])
        self.assertIn("2026-09-04", prompt)
        self.assertIn("fire_projection", prompt)
        self.assertNotIn("user-a", prompt)
        self.assertNotIn("user-b", prompt)


if __name__ == "__main__":
    unittest.main()
