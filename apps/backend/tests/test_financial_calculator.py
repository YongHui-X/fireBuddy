import sys
import unittest
from datetime import date
from decimal import Decimal
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from services.financial_calculator import ProjectionInput, calculate_savings_rate, project_fire
from services.financial_summary import build_financial_summary, detect_transaction_anomalies


class FinancialCalculatorTests(unittest.TestCase):
    def test_matches_prd_fi_target_progress_and_required_contribution(self):
        result = project_fire(ProjectionInput(
            effective_date=date(2026, 8, 23),
            current_assets=Decimal("223200"),
            annual_spending=Decimal("48000"),
            monthly_contribution=Decimal("2500"),
            nominal_return=Decimal("0.07"),
            inflation_rate=Decimal("0.02"),
            withdrawal_rate=Decimal("0.04"),
            target_date=date(2042, 8, 23),
        ))

        self.assertEqual(result["fiTarget"], "1200000.00")
        self.assertEqual(result["progressRate"], "0.186000")
        self.assertAlmostEqual(float(result["requiredMonthlyInvestment"]), 2501, delta=15)
        self.assertEqual(result["status"], "projected")

    def test_handles_zero_income_and_unreachable_projection(self):
        self.assertIsNone(calculate_savings_rate(Decimal("0"), Decimal("100")))
        result = project_fire(ProjectionInput(
            effective_date=date(2026, 8, 23), current_assets=Decimal("100"),
            annual_spending=Decimal("48000"), monthly_contribution=Decimal("0"),
            nominal_return=Decimal("-0.20"), inflation_rate=Decimal("0.20"),
            withdrawal_rate=Decimal("0.04"),
        ))
        self.assertEqual(result["status"], "unreachable")
        self.assertIsNone(result["estimatedFiYear"])

    def test_summary_derives_net_worth_pulse_runway_and_action(self):
        positions = [
            {"id": "cash", "name": "Cash reserve", "position_kind": "asset", "include_in_fi": True, "is_emergency_fund": True, "is_archived": False},
            {"id": "broker", "name": "Brokerage", "position_kind": "asset", "include_in_fi": True, "is_emergency_fund": False, "is_archived": False},
            {"id": "home", "name": "Home", "position_kind": "asset", "include_in_fi": False, "is_emergency_fund": False, "is_archived": False},
            {"id": "mortgage", "name": "Mortgage", "position_kind": "liability", "include_in_fi": False, "is_emergency_fund": False, "is_archived": False},
        ]
        snapshots = [
            {"wealth_position_id": "cash", "value_date": "2026-08-20", "amount": "31200"},
            {"wealth_position_id": "broker", "value_date": "2026-08-20", "amount": "192000"},
            {"wealth_position_id": "home", "value_date": "2026-08-20", "amount": "120000"},
            {"wealth_position_id": "mortgage", "value_date": "2026-08-20", "amount": "56800"},
        ]
        transactions = [
            {"id": "old", "date": "2026-07-10", "amount": "6000", "transaction_type": "expense", "category_id": "essential"},
            {"id": "salary", "date": "2026-08-02", "amount": "6200", "transaction_type": "income", "category_id": "income"},
            {"id": "spend", "date": "2026-08-04", "amount": "3180", "transaction_type": "expense", "category_id": "other"},
        ]
        profile = {"monthly_contribution": "2500", "expected_return_rate": "0.07", "inflation_rate": "0.02",
                   "withdrawal_rate": "0.04", "retirement_spending_override": "4000", "target_fi_date": "2042-08-23"}
        summary = build_financial_summary(
            positions=positions, snapshots=snapshots, contributions=[{"contribution_date": "2026-08-05", "amount": "2480"}],
            transactions=transactions, selected_essentials=["essential"], profile=profile, as_of=date(2026, 8, 23),
        )
        self.assertEqual(summary["netWorth"], "286400.00")
        self.assertEqual(summary["investableAssets"], "223200.00")
        self.assertEqual(summary["pulse"]["savingsRate"], "0.487097")
        self.assertEqual(summary["emergencyRunwayMonths"], "5.200000")

    def test_duplicate_indicator_takes_precedence(self):
        rows = [
            {"id": "one", "date": "2026-08-20", "description": "Cafe", "account_id": "a", "category_id": "c", "transaction_type": "expense", "amount": "80"},
            {"id": "two", "date": "2026-08-22", "description": " cafe ", "account_id": "a", "category_id": "c", "transaction_type": "expense", "amount": "80.00"},
        ]
        result = detect_transaction_anomalies(rows, date(2026, 8, 23))
        self.assertEqual(result[0]["kind"], "possible_duplicate")


if __name__ == "__main__":
    unittest.main()
