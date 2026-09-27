"""Independent numerical checks and the shared TypeScript/Python debt fixture printer."""
import json
import sys
import unittest
from datetime import date
from decimal import Decimal
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / 'apps/backend'))
from services.debt_calculator import build_debt_summary, calculate_debt_payoff, highest_interest_liability

FIXTURES = json.loads((ROOT / 'packages/shared/fixtures/debt.json').read_text())
AS_OF = date.fromisoformat(FIXTURES['asOf'])


def run_case(case: dict) -> dict:
    return calculate_debt_payoff(Decimal(str(case['balance'])), Decimal(str(case['rate'])), Decimal(str(case['payment'])), AS_OF)


class DebtCalculatorTests(unittest.TestCase):
    def test_fixture_statuses(self):
        statuses = {case['name']: run_case(case)['status'] for case in FIXTURES['cases']}
        self.assertEqual(statuses['zero balance is already paid off'], 'paid_off')
        self.assertEqual(statuses['five year car loan'], 'projected')
        self.assertEqual(statuses['credit card where the payment is below monthly interest'], 'payment_below_interest')
        self.assertEqual(statuses['payment exactly equal to monthly interest'], 'payment_below_interest')
        self.assertEqual(statuses['payment one cent above interest hits the 600 month cap'], 'payment_below_interest')
        self.assertEqual(statuses['missing payment'], 'missing_terms')

    def test_zero_interest_loan_is_simple_division(self):
        result = calculate_debt_payoff(Decimal('1000'), Decimal('0'), Decimal('300'), AS_OF)
        self.assertEqual(result['monthsRemaining'], 4)
        self.assertEqual(result['totalInterest'], '0.00')
        self.assertEqual(result['payoffMonth'], '2026-05')

    def test_car_loan_matches_amortisation_formula(self):
        # 30,000 at 3.5% over 60 months has a standard payment of about 545.74; 546.50 clears it in 60.
        result = calculate_debt_payoff(Decimal('30000'), Decimal('0.035'), Decimal('546.50'), AS_OF)
        self.assertEqual(result['monthsRemaining'], 60)
        self.assertEqual(result['payoffMonth'], '2031-01')
        self.assertGreater(Decimal(result['totalInterest']), Decimal('2700'))
        self.assertLess(Decimal(result['totalInterest']), Decimal('2800'))

    def test_summary_totals_service_and_flags_high_interest(self):
        positions = [
            {'id': 'car', 'name': 'Car loan', 'position_kind': 'liability', 'is_archived': False, 'interest_rate': '0.0350', 'monthly_payment': '546.50'},
            {'id': 'card', 'name': 'Visa', 'position_kind': 'liability', 'is_archived': False, 'interest_rate': '0.2600', 'monthly_payment': '400'},
            {'id': 'gone', 'name': 'Archived', 'position_kind': 'liability', 'is_archived': True, 'interest_rate': '0.5', 'monthly_payment': '999'},
            {'id': 'bare', 'name': 'Old loan', 'position_kind': 'liability', 'is_archived': False},
            {'id': 'cash', 'name': 'Cash', 'position_kind': 'asset', 'is_archived': False},
        ]
        latest = {'car': {'amount': '30000'}, 'card': {'amount': '12000'}, 'bare': {'amount': '500'}, 'cash': {'amount': '1'}}
        summary = build_debt_summary(positions, latest, Decimal('6000'), AS_OF)
        self.assertEqual([item['positionId'] for item in summary['liabilities']], ['car', 'card', 'bare'])
        self.assertEqual(summary['totalMonthlyDebtService'], '946.50')
        self.assertEqual(summary['highestInterestRate'], '0.2600')
        self.assertEqual(summary['debtToIncome'], '0.157750')
        self.assertEqual(summary['liabilities'][2]['status'], 'missing_terms')
        self.assertEqual(highest_interest_liability(summary)['positionId'], 'card')
        self.assertIsNone(build_debt_summary(positions[:1], latest, None, AS_OF)['debtToIncome'])
        self.assertIsNone(highest_interest_liability(build_debt_summary(positions[:1], latest, None, AS_OF)))


if __name__ == '__main__':
    if '--fixtures' in sys.argv:
        print(json.dumps([run_case(case) for case in FIXTURES['cases']]))
    else:
        unittest.main()
