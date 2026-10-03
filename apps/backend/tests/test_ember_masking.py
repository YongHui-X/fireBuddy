import sys
import unittest
from datetime import date
from decimal import Decimal
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from services.ember_masking import (
    MAX_MASKED_CONTEXT_CHARS,
    MAX_TOKEN_LENGTH,
    MaskingSession,
    UserNames,
    money_band,
    months_band,
    percent_band,
)
from services.ember_personal_context import personal_context_from_summary
from services.financial_summary import build_financial_summary
from tests.test_ember_personal_context import fixture_records


class EmberMaskingTests(unittest.TestCase):
    def test_money_band_edges_and_negative_amounts(self):
        cases = {
            "0": "zero",
            "999.99": "under 1k",
            "1000": "1k-5k",
            "999999.99": "500k-1M",
            "1000000": "over 1M",
            "-999.99": "negative, under 1k",
            "-1000000": "negative, over 1M",
        }
        for amount, expected in cases.items():
            with self.subTest(amount=amount):
                self.assertEqual(money_band(Decimal(amount)), expected)

    def test_percent_band_edges_and_negative_percentages(self):
        cases = {
            "0": "0-10%",
            "9.99": "0-10%",
            "10": "10-20%",
            "99.99": "90-100%",
            "100": "90-100%",
            "100.01": "over 100%",
            "-0.01": "-10 to 0%",
            "-10": "-10 to 0%",
        }
        for percent, expected in cases.items():
            with self.subTest(percent=percent):
                self.assertEqual(percent_band(Decimal(percent)), expected)

    def test_months_band_edges_and_negative_months(self):
        cases = {
            "-1": "0-1 months",
            "0": "0-1 months",
            "0.99": "0-1 months",
            "1": "1-3 months",
            "2.99": "1-3 months",
            "3": "3-6 months",
            "5.99": "3-6 months",
            "6": "6-12 months",
            "11.99": "6-12 months",
            "12": "over 12 months",
        }
        for months, expected in cases.items():
            with self.subTest(months=months):
                self.assertEqual(months_band(Decimal(months)), expected)

    def test_mask_facts_masks_typed_values_and_reuses_repeated_money(self):
        session = MaskingSession(enabled=True)
        masked = session.mask_facts({
            "netWorth": "6800.00",
            "amount": "6800.00",
            "savingsRate": "0.065",
            "changePercent": "6.5",
            "emergencyRunwayMonths": "5.2",
            "otherAmount": "15000",
        })

        self.assertEqual(masked["netWorth"], "{{M1}} (range: 5k-10k)")
        self.assertEqual(masked["amount"], masked["netWorth"])
        self.assertRegex(masked["savingsRate"], r"^\{\{R\d+\}\} \(range: 0-10%\)$")
        self.assertRegex(masked["changePercent"], r"^\{\{R\d+\}\} \(range: 0-10%\)$")
        self.assertRegex(masked["emergencyRunwayMonths"], r"^\{\{N\d+\}\} \(range: 3-6 months\)$")
        self.assertEqual(masked["otherAmount"], "{{M2}} (range: 10k-25k)")
        self.assertEqual(session.unmask(masked["netWorth"]), "S$6,800.00")
        self.assertEqual(session.unmask(masked["otherAmount"]), "S$15,000.00")

    def test_mask_facts_keeps_passthrough_values(self):
        facts = {
            "effectiveDate": "2026-03-01",
            "month": "2026-03",
            "estimatedFiYear": 2045,
            "warningCodes": ["missing_snapshot"],
            "code": "missing_snapshot",
            "recordCount": 3,
        }
        self.assertEqual(MaskingSession(enabled=True).mask_facts(facts), facts)

    def test_text_fields_mask_figures_percentages_and_position_names(self):
        session = MaskingSession(UserNames(positions=("Car loan",)), enabled=True)
        facts = {"evidence": "6.50% on S$56800.00", "title": "Pay down Car loan first"}
        masked = session.mask_facts(facts)

        self.assertRegex(masked["evidence"], r"^\{\{R\d+\}\} \(range: 0-10%\) on \{\{M\d+\}\} \(range: 50k-100k\)$")
        self.assertEqual(masked["title"], "Pay down {{P1}} first")
        self.assertEqual(session.unmask(masked["evidence"]), "6.50% on S$56,800.00")
        self.assertEqual(session.unmask(masked["title"]), facts["title"])

    def test_unmask_removes_echoed_range_and_marks_unknown_token(self):
        session = MaskingSession(enabled=True)
        token = session.mask_facts({"amount": "6800"})["amount"].split()[0]
        self.assertEqual(session.unmask(f"Balance {token} (range: 5k-10k)."), "Balance S$6,800.00.")
        self.assertEqual(session.unmask("Balance {{M999}}."), "Balance [figure unavailable].")

    def test_streaming_unmasker_restores_tokens_split_across_deltas(self):
        for deltas in (
            ["Your net worth {", "{M1}} is"],
            ["{{M", "1}}"],
            ["{{", "M1", "}}"],
        ):
            with self.subTest(deltas=deltas):
                session = MaskingSession(enabled=True)
                session.mask_facts({"netWorth": "6800"})
                unmasker = session.unmasker()
                restored = "".join(unmasker.feed(delta) for delta in deltas) + unmasker.flush()
                prefix = "Your net worth " if deltas[0].startswith("Your") else ""
                suffix = " is" if prefix else ""
                self.assertEqual(restored, f"{prefix}S$6,800.00{suffix}")

    def test_streaming_unmasker_flushes_lone_brace(self):
        unmasker = MaskingSession(enabled=True).unmasker()
        self.assertEqual(unmasker.feed("Plain text {"), "Plain text ")
        self.assertEqual(unmasker.flush(), "{")

    def test_streaming_unmasker_does_not_hold_long_plain_braces(self):
        unmasker = MaskingSession(enabled=True).unmasker()
        plain = "Plain {" + "x" * (MAX_TOKEN_LENGTH + 3)
        self.assertEqual(unmasker.feed(plain), plain)
        self.assertEqual(unmasker.flush(), "")

    def test_masked_personal_context_is_bounded_and_hides_raw_values(self):
        summary = build_financial_summary(**fixture_records(), as_of=date(2026, 8, 23))
        context = personal_context_from_summary(summary)
        masked = context.context(MaskingSession(UserNames(positions=("Brokerage",)), enabled=True))

        self.assertLessEqual(len(masked), MAX_MASKED_CONTEXT_CHARS)
        for private_value in ("286400.00", "56800.00", "Brokerage"):
            with self.subTest(private_value=private_value):
                self.assertNotIn(private_value, masked)


if __name__ == "__main__":
    unittest.main()
