import json
import sys
import tempfile
import unittest
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
FETCH_DIR = BACKEND_DIR / "rag" / "fetchAndConvert"
if str(FETCH_DIR) not in sys.path:
    sys.path.insert(0, str(FETCH_DIR))

import check_figure_drift


CURATED = {
    "figures": {
        "cpf_ordinary_wage_ceiling": {"values": {"2026": 8000}},
        "cpf_full_retirement_sum": {"values": {"2025": 213000, "2026": 220400}},
        "cpf_interest_rates": {
            "values": {"2026": {"Ordinary Account": 2.5, "Special Account": 4}}
        },
    }
}


class FigureDriftTests(unittest.TestCase):
    def test_matching_figures_report_no_drift(self):
        extracted = {
            "year": 2026,
            "cpf": {
                "ordinary_wage_ceiling_monthly": 8000,
                "interest_rates": {"OA": 2.5, "SA": 4},
            },
        }

        self.assertEqual(check_figure_drift.find_drift(CURATED, extracted), [])

    def test_changed_ceiling_is_reported(self):
        extracted = {"year": 2026, "cpf": {"ordinary_wage_ceiling_monthly": 8500}}

        drift = check_figure_drift.find_drift(CURATED, extracted)

        self.assertEqual(len(drift), 1)
        self.assertIn("cpf_ordinary_wage_ceiling[2026]", drift[0])
        self.assertIn("8500", drift[0])

    def test_retirement_sums_compare_against_their_own_year(self):
        """The sums PDF names the year it applies to, which may not be current."""

        extracted = {
            "year": 2026,
            "cpf": {"retirement_sums": {"frs": 213000, "year_applicable": 2025}},
        }

        self.assertEqual(check_figure_drift.find_drift(CURATED, extracted), [])

    def test_missing_extracted_fields_are_skipped(self):
        self.assertEqual(check_figure_drift.find_drift(CURATED, {"year": 2026}), [])

    def test_absent_extracted_file_is_not_a_failure(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            curated = Path(temp_dir) / "curated.json"
            curated.write_text(json.dumps(CURATED), encoding="utf-8")
            exit_code = check_figure_drift.main([
                "--curated", str(curated),
                "--extracted", str(Path(temp_dir) / "absent.json"),
            ])

        self.assertEqual(exit_code, 0)

    def test_drift_exits_non_zero(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            curated = Path(temp_dir) / "curated.json"
            curated.write_text(json.dumps(CURATED), encoding="utf-8")
            extracted = Path(temp_dir) / "extracted.json"
            extracted.write_text(
                json.dumps({"year": 2026, "cpf": {"ordinary_wage_ceiling_monthly": 9000}}),
                encoding="utf-8",
            )
            exit_code = check_figure_drift.main([
                "--curated", str(curated), "--extracted", str(extracted),
            ])

        self.assertEqual(exit_code, 1)


if __name__ == "__main__":
    unittest.main()
