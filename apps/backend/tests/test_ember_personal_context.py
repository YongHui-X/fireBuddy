import json
import sys
import unittest
from datetime import date
from pathlib import Path
from unittest.mock import patch


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from services import ember_personal_context
from services.ember_personal_context import (
    MAX_PERSONAL_CONTEXT_CHARS,
    build_personal_context,
    personal_context_from_summary,
    spending_block,
)
from services.financial_summary import build_financial_summary


def fixture_records() -> dict:
    """Mirror the summary fixture used by test_financial_calculator."""

    positions = [
        {"id": "cash", "name": "Cash reserve", "position_kind": "asset", "include_in_fi": True, "is_emergency_fund": True, "is_archived": False, "position_type": "investment", "restriction_type": "none", "liquidity_class": "liquid"},
        {"id": "broker", "name": "Brokerage", "position_kind": "asset", "include_in_fi": True, "is_emergency_fund": False, "is_archived": False, "position_type": "investment", "restriction_type": "none", "liquidity_class": "liquid"},
        {"id": "home", "name": "Home", "position_kind": "asset", "include_in_fi": False, "is_emergency_fund": False, "is_archived": False, "position_type": "investment", "restriction_type": "none", "liquidity_class": "liquid"},
        {"id": "mortgage", "name": "Mortgage", "position_kind": "liability", "include_in_fi": False, "is_emergency_fund": False, "is_archived": False, "position_type": "investment", "restriction_type": "none", "liquidity_class": "liquid"},
    ]
    snapshots = [
        {"wealth_position_id": "cash", "value_date": "2026-08-20", "amount": "31200"},
        {"wealth_position_id": "broker", "value_date": "2026-08-20", "amount": "192000"},
        {"wealth_position_id": "home", "value_date": "2026-08-20", "amount": "120000"},
        {"wealth_position_id": "mortgage", "value_date": "2026-08-20", "amount": "56800"},
    ]
    transactions = [
        {"id": "old", "date": "2026-07-10", "amount": "6000", "transaction_type": "expense", "category_id": "essential", "description": "Secret landlord"},
        {"id": "salary", "date": "2026-08-02", "amount": "6200", "transaction_type": "income", "category_id": "income", "description": "Acme payroll"},
        {"id": "spend", "date": "2026-08-04", "amount": "3180", "transaction_type": "expense", "category_id": "other", "description": "Clinic visit"},
    ]
    profile = {"monthly_contribution": "2500", "expected_return_rate": "0.07", "inflation_rate": "0.02",
               "withdrawal_rate": "0.04", "retirement_spending_override": "4000", "target_fi_date": "2042-08-23"}
    return {
        "positions": positions, "snapshots": snapshots,
        "contributions": [{"contribution_date": "2026-08-05", "amount": "2480"}],
        "transactions": transactions, "selected_essentials": ["essential"], "profile": profile,
    }


class EmberPersonalContextTests(unittest.TestCase):
    def setUp(self):
        self.summary = build_financial_summary(**fixture_records(), as_of=date(2026, 8, 23))

    def test_copies_only_aggregate_keys(self):
        context = personal_context_from_summary(self.summary)

        self.assertEqual(set(context.facts), {
            "effectiveDate", "snapshotStatus", "netWorth", "investableAssets",
            "emergencyRunwayMonths", "averageMonthlyEssentialSpending", "monthlyPulse",
            "fire", "recommendedAction", "anomalyCounts", "warningCodes", "spending",
        })
        self.assertEqual(context.facts["netWorth"], "286400.00")
        self.assertEqual(context.facts["emergencyRunwayMonths"], "5.200000")
        self.assertEqual(context.facts["monthlyPulse"]["savingsRate"], "0.487097")
        self.assertEqual(set(context.facts["fire"]), {
            "fundingStatus", "fiTarget", "progressRate", "requiredMonthlyInvestment",
            "estimatedFiYear", "earliestRetirementMonth",
        })
        self.assertEqual(context.facts["anomalyCounts"], {"possible_duplicate": 0, "high_category_amount": 0})
        self.assertLessEqual(len(json.dumps(context.facts)), MAX_PERSONAL_CONTEXT_CHARS)

    def test_block_never_carries_records_descriptions_or_identity(self):
        context = personal_context_from_summary(self.summary)
        block = context.context()

        for forbidden in ("Secret landlord", "Acme payroll", "Clinic visit", "transactionAnomalies",
                          "transactionId", "monthlyCashFlows", "user-a", "Brokerage"):
            self.assertNotIn(forbidden, block)
        self.assertIn("Trusted FireBuddy data calculated by the backend", block)
        self.assertIn("do not recalculate", block)

    def test_evidence_points_at_home_with_the_effective_date(self):
        evidence = personal_context_from_summary(self.summary).evidence()

        self.assertEqual(evidence.tool, "personal_context")
        self.assertEqual(evidence.destination, "/")
        self.assertEqual(evidence.period, "2026-08-23")
        self.assertIsNone(evidence.record_count)

    def test_oversized_summary_is_rejected(self):
        bloated = dict(self.summary)
        bloated["warnings"] = [{"code": letter * 400, "message": ""} for letter in "abcdef"]

        with self.assertRaises(ValueError):
            personal_context_from_summary(bloated)

    def test_spending_block_totals_current_and_previous_month_by_category(self):
        transactions = [
            {"date": "2026-08-04", "amount": "3180", "transaction_type": "expense", "category_id": "other", "description": "Clinic visit"},
            {"date": "2026-08-10", "amount": "120.50", "transaction_type": "expense", "category_id": "food", "description": "Hawker"},
            {"date": "2026-08-02", "amount": "6200", "transaction_type": "income", "category_id": "income", "description": "Acme payroll"},
            {"date": "2026-07-10", "amount": "6000", "transaction_type": "expense", "category_id": "essential", "description": "Secret landlord"},
            {"date": "2026-06-30", "amount": "50", "transaction_type": "expense", "category_id": "food", "description": "Old"},
        ]
        block = spending_block(
            transactions, {"other": "Healthcare", "food": "Food & Drink", "essential": "Housing"}, date(2026, 8, 23),
        )

        self.assertEqual(block["currentMonth"]["period"], "2026-08-01 to 2026-08-23")
        self.assertEqual(block["currentMonth"]["total"], "3300.50")
        self.assertEqual(block["currentMonth"]["topCategories"][0], {"category": "Healthcare", "amount": "3180.00"})
        self.assertEqual(block["currentMonth"]["topCategories"][1]["category"], "Food & Drink")
        self.assertEqual(block["previousMonth"]["period"], "2026-07-01 to 2026-07-31")
        self.assertEqual(block["previousMonth"]["total"], "6000.00")
        self.assertNotIn("Secret landlord", json.dumps(block))

    def test_builder_loads_owner_scoped_records_once(self):
        with patch.object(
            ember_personal_context, "load_financial_records", return_value=fixture_records(),
        ) as load, patch.object(
            ember_personal_context, "_category_names", return_value={"other": "Healthcare"},
        ):
            context = build_personal_context("user-a", today=date(2026, 8, 23))

        load.assert_called_once_with("user-a", date(2026, 8, 23))
        self.assertEqual(context.facts["netWorth"], "286400.00")
        self.assertEqual(context.facts["spending"]["currentMonth"]["topCategories"][0]["category"], "Healthcare")
        self.assertNotIn("Clinic visit", context.context())

        with self.assertRaisesRegex(ValueError, "Authenticated user id"):
            build_personal_context("")


if __name__ == "__main__":
    unittest.main()
