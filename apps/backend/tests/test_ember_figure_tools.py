import sys
import unittest
from datetime import date
from pathlib import Path
from unittest.mock import patch


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from services import ember_data_tools, ember_figure_tools
from services.ember_figure_tools import FIGURE_KEYS, FigureNotFoundError, load_figures, lookup_figure
from services.ember_planner import EmberPlan


class EmberFigureToolTests(unittest.TestCase):
    def test_curated_file_covers_every_planner_figure_key(self):
        figures = load_figures()["figures"]
        for key in FIGURE_KEYS:
            self.assertIn(key, figures)
            self.assertTrue(figures[key]["source_path"])

    def test_year_specific_lookup_returns_exact_value_and_citation(self):
        result = lookup_figure("cpf_full_retirement_sum", 2026, today=date(2026, 9, 15))

        self.assertEqual(result["value"], 220400)
        self.assertIn("S$220,400", result["exact_answer"])
        self.assertIn("2026", result["exact_answer"])
        self.assertEqual(result["source"].path, "manual/cpf/cpf-retirement-sums.md")

    def test_missing_year_uses_current_year_then_latest(self):
        current = lookup_figure("cpf_basic_retirement_sum", None, today=date(2026, 3, 1))
        self.assertEqual(current["year"], 2026)

        latest = lookup_figure("cpf_basic_retirement_sum", None, today=date(2031, 3, 1))
        self.assertEqual(latest["year"], 2027)

    def test_unlisted_year_raises_instead_of_guessing(self):
        with self.assertRaises(FigureNotFoundError):
            lookup_figure("cpf_full_retirement_sum", 2010, today=date(2026, 1, 1))

    def test_nested_table_figure_renders_every_row(self):
        result = lookup_figure("cpf_contribution_rates", 2026, today=date(2026, 1, 1))

        self.assertIn("55 and below: total 37%, employee 20%, employer 17%", result["exact_answer"])
        self.assertIn("Above 70", result["exact_answer"])

    def test_figure_lookup_tool_reads_no_user_data_and_cites_source(self):
        plan = EmberPlan(
            mode="data", tool="figure_lookup", start_date=None, end_date=None,
            comparison_start_date=None, comparison_end_date=None, category_name=None,
            requires_explanation=False, clarification_question=None,
            figure_key="cpf_enhanced_retirement_sum", figure_year=2025,
        )
        with patch.object(ember_data_tools, "supabase") as store:
            result = ember_data_tools.run_ember_data_tool("user-a", plan, today=date(2026, 1, 1))

        store.table.assert_not_called()
        self.assertEqual(result.tool, "figure_lookup")
        self.assertIn("S$426,000", result.exact_answer)
        self.assertEqual(result.sources[0].path, "manual/cpf/cpf-retirement-sums.md")
        self.assertIn("official reference figure", result.context())
        self.assertNotIn("user-a", result.context())


if __name__ == "__main__":
    unittest.main()
