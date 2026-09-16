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
from services.ember_planner import EmberPlan, EmberPlannerResponse


class EmberPlannerTests(unittest.TestCase):
    def test_plan_schema_rejects_identity_and_sql_fields(self):
        with self.assertRaises(ValidationError):
            EmberPlan.model_validate({
                "mode": "data", "tool": "expense_summary", "start_date": "2026-08-01", "end_date": "2026-08-31",
                "comparison_start_date": None, "comparison_end_date": None, "category_name": None,
                "requires_explanation": False, "clarification_question": None,
                "user_id": "user-b", "sql": "select * from expenses",
            })

    def test_structured_response_rejects_knowledge_plan_with_data_tool(self):
        with self.assertRaises(ValidationError):
            EmberPlannerResponse.model_validate({
                "plan": {
                    "mode": "knowledge", "tool": "financial_summary", "start_date": None,
                    "end_date": None, "comparison_start_date": None, "comparison_end_date": None,
                    "category_name": None, "requires_explanation": True,
                    "clarification_question": None, "retrieval_query": "What is CPF?",
                },
            })

    def test_structured_response_requires_tool_for_data_plan(self):
        with self.assertRaises(ValidationError):
            EmberPlannerResponse.model_validate({
                "plan": {
                    "mode": "data", "tool": None, "start_date": "2026-08-01",
                    "end_date": "2026-08-31", "comparison_start_date": None,
                    "comparison_end_date": None, "category_name": None,
                    "requires_explanation": False, "clarification_question": None,
                    "retrieval_query": None,
                },
            })

    def test_knowledge_plan_requires_a_retrieval_query(self):
        with self.assertRaises(ValidationError):
            EmberPlannerResponse.model_validate({
                "plan": {
                    "mode": "knowledge", "tool": None, "start_date": None,
                    "end_date": None, "comparison_start_date": None, "comparison_end_date": None,
                    "category_name": None, "requires_explanation": True,
                    "clarification_question": None, "retrieval_query": None,
                },
            })

    def test_figure_lookup_plan_requires_a_known_figure_key(self):
        parsed = EmberPlannerResponse.model_validate({
            "plan": {
                "mode": "data", "tool": "figure_lookup", "start_date": None,
                "end_date": None, "comparison_start_date": None, "comparison_end_date": None,
                "category_name": None, "requires_explanation": False,
                "clarification_question": None, "retrieval_query": None,
                "figure_key": "cpf_full_retirement_sum", "figure_year": 2026,
            },
        })
        plan = EmberPlan.model_validate(parsed.plan.model_dump())
        self.assertEqual(plan.figure_key, "cpf_full_retirement_sum")
        self.assertEqual(plan.figure_year, 2026)

        with self.assertRaises(ValidationError):
            EmberPlannerResponse.model_validate({
                "plan": {
                    "mode": "data", "tool": "figure_lookup", "start_date": None,
                    "end_date": None, "comparison_start_date": None, "comparison_end_date": None,
                    "category_name": None, "requires_explanation": False,
                    "clarification_question": None, "retrieval_query": None,
                    "figure_key": "cpf_secret_rate", "figure_year": None,
                },
            })
        with self.assertRaises(ValidationError):
            EmberPlan.model_validate({
                "mode": "data", "tool": "expense_summary", "start_date": None,
                "end_date": None, "comparison_start_date": None, "comparison_end_date": None,
                "category_name": None, "requires_explanation": False,
                "clarification_question": None, "figure_key": "cpf_full_retirement_sum",
            })

    def test_planner_prompt_contains_tools_and_date_but_no_user_identity(self):
        parsed = EmberPlannerResponse.model_validate({
            "plan": {
                "mode": "data", "tool": "fire_projection", "start_date": None,
                "end_date": date(2026, 9, 4), "comparison_start_date": None,
                "comparison_end_date": None, "category_name": None,
                "requires_explanation": True, "clarification_question": None,
                "retrieval_query": None,
            },
        })
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
        self.assertIn("figure_lookup", prompt)
        self.assertIn("cpf_full_retirement_sum", prompt)
        self.assertIn("retrieval_query", prompt)
        self.assertNotIn("user-a", prompt)
        self.assertNotIn("user-b", prompt)
        self.assertIs(payload["response_format"], EmberPlannerResponse)


if __name__ == "__main__":
    unittest.main()
