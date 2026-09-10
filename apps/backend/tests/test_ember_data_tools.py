import sys
import unittest
from datetime import date
from pathlib import Path
from unittest.mock import patch


BACKEND_DIR = Path(__file__).resolve().parents[1]
TESTS_DIR = Path(__file__).resolve().parent
for path in (BACKEND_DIR, TESTS_DIR):
    if str(path) not in sys.path:
        sys.path.insert(0, str(path))

from services import ember_data_tools
from services.ember_planner import EmberPlan
from fake_supabase import FakeSupabase


def plan(tool: str, **overrides) -> EmberPlan:
    values = {
        "mode": "data",
        "tool": tool,
        "start_date": date(2026, 8, 1),
        "end_date": date(2026, 8, 31),
        "comparison_start_date": None,
        "comparison_end_date": None,
        "category_name": None,
        "requires_explanation": False,
        "clarification_question": None,
    }
    return EmberPlan(**{**values, **overrides})


class EmberDataToolTests(unittest.TestCase):
    def setUp(self):
        self.store = FakeSupabase({
            "categories": [
                {"id": "food", "user_id": None, "name": "Food & Drink", "category_type": "expense", "is_default": True},
                {"id": "hobby-a", "user_id": "user-a", "name": "Hobbies", "category_type": "expense", "is_default": False},
                {"id": "hobby-b", "user_id": "user-b", "name": "Hobbies", "category_type": "expense", "is_default": False},
            ],
            "expenses": [
                {"user_id": "user-a", "amount": "10.00", "date": "2026-08-03", "category_id": "food", "transaction_type": "expense"},
                {"user_id": "user-a", "amount": "25.00", "date": "2026-08-05", "category_id": "hobby-a", "transaction_type": "expense"},
                {"user_id": "user-b", "amount": "9999.00", "date": "2026-08-04", "category_id": "hobby-b", "transaction_type": "expense"},
                {"user_id": "user-a", "amount": "5000.00", "date": "2026-08-06", "category_id": "food", "transaction_type": "income"},
            ],
        })

    def test_expense_summary_cannot_include_another_users_rows(self):
        with patch.object(ember_data_tools, "supabase", self.store):
            result = ember_data_tools.run_ember_data_tool("user-a", plan("expense_summary"))

        self.assertEqual(result.facts["total"], "35.00")
        self.assertEqual(result.record_count, 2)
        self.assertNotIn("9999", result.exact_answer)
        self.assertNotIn("user-a", result.context())
        self.assertNotIn("user-b", result.context())

    def test_category_filter_uses_only_visible_system_and_owned_categories(self):
        with patch.object(ember_data_tools, "supabase", self.store):
            result = ember_data_tools.run_ember_data_tool(
                "user-a",
                plan("expense_summary", category_name="Hobbies"),
            )

        self.assertEqual(result.facts["total"], "25.00")
        self.assertEqual(result.record_count, 1)

    def test_rejects_missing_authenticated_user(self):
        with self.assertRaisesRegex(ValueError, "Authenticated user id"):
            ember_data_tools.run_ember_data_tool("", plan("expense_summary"))

    def test_fire_explanation_uses_versioned_results_and_unknown_cpf(self):
        from test_retirement_calculator import FIXTURES
        from services.retirement_calculator import calculate_retirement
        fire = calculate_retirement({**FIXTURES['base'], 'cpfPlan': 'unknown'}, 100000, '2026-01-01')
        with patch.object(ember_data_tools, '_load_summary', return_value={'fire': fire}):
            result = ember_data_tools.run_ember_data_tool('user-a', plan('fire_projection'))
        self.assertEqual(result.facts['calculationVersion'], 'sg-monthly.v2')
        self.assertEqual(result.facts['fiTarget'], fire['fiTarget'])
        self.assertEqual(result.facts['projectedPortfolio'], fire['projectedPortfolio'])
        self.assertIn('CPF income not included', result.exact_answer)
        self.assertNotIn('monthlyCashFlows', result.facts)
        self.assertNotIn('assetIds', result.facts['assumptions'])


if __name__ == "__main__":
    unittest.main()
