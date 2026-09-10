"""Independent numerical checks and common Python/demo fixture verification."""
import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / 'apps/backend'))
from services.retirement_calculator import calculate_retirement
from schemas.retirement import RetirementPlan

FIXTURES = json.loads((ROOT / 'packages/shared/fixtures/retirement.json').read_text())


class RetirementCalculatorTests(unittest.TestCase):
    def project(self, **overrides):
        return calculate_retirement({**FIXTURES['base'], **overrides}, 1080000, '2026-01-01')

    def test_common_targets_and_forward_liquidity(self):
        for case in FIXTURES['cases']:
            with self.subTest(case=case['name']):
                result = calculate_retirement({**FIXTURES['base'], **case['overrides']}, case['assets'], '2026-01-01')
                if 'target' in case:
                    self.assertEqual(result['fiTarget'], case['target'])
                self.assertEqual(result['calculationVersion'], 'sg-monthly.v2')
        funded = self.project()
        self.assertTrue(all(float(row['balance']) >= 0 for row in funded['monthlyCashFlows']))
        self.assertEqual(funded['monthlyCashFlows'][-1]['balance'], '0.00')

    def test_discounted_target_matches_independent_present_value(self):
        result = self.project(afterReturn=0.03, cpfPlan='unknown')
        monthly = 1.03 ** (1 / 12)
        expected = sum(3000 / monthly ** i for i in range(1, 541))
        self.assertAlmostEqual(float(result['fiTarget']), expected, places=2)

    def test_cpf_starts_and_escalates_on_anniversary_without_preinflation(self):
        rows = {r['month']: r for r in self.project(cpfPlan='escalating', inflation=0.025)['monthlyCashFlows']}
        self.assertEqual(rows['2040-12']['cpf'], '0.00')
        self.assertEqual(rows['2041-01']['cpf'], '1500.00')
        self.assertEqual(rows['2041-12']['cpf'], '1500.00')
        self.assertEqual(rows['2042-01']['cpf'], '1530.00')

    def test_growth_then_contribution_and_required_investment(self):
        plan = {**FIXTURES['base'], 'retirementMonth': '2027-01', 'beforeReturn': 0.12, 'monthlyContribution': 2000}
        result = calculate_retirement(plan, 100000, '2026-01-01')
        first = result['monthlyCashFlows'][0]
        self.assertAlmostEqual(float(first['balance']), 100000 * 1.12 ** (1 / 12) + 2000, places=2)
        required = float(result['requiredMonthlyInvestment'])
        funded = calculate_retirement({**plan, 'monthlyContribution': required}, 100000, '2026-01-01')
        self.assertEqual(funded['fundingStatus'], 'funded')
        self.assertEqual(funded['monthlyCashFlows'][12]['contribution'], '0.00')

    def test_spending_basis_survives_later_recalculation(self):
        plan = {**FIXTURES['base'], 'retirementMonth': '2027-01', 'inflation': 0.025}
        early = calculate_retirement(plan, 0, '2026-01-01')
        later = calculate_retirement(plan, 0, '2026-06-01')
        self.assertEqual(next(r['expenses'] for r in early['monthlyCashFlows'] if r['month'] == '2027-01'),
                         next(r['expenses'] for r in later['monthlyCashFlows'] if r['month'] == '2027-01'))

    def test_missing_invalid_unknown_and_stale(self):
        self.assertEqual(calculate_retirement(None, 100, '2026-01-01')['fundingStatus'], 'review_required')
        self.assertEqual(self.project(retirementMonth='2100-01')['fundingStatus'], 'review_required')
        self.assertEqual(calculate_retirement(FIXTURES['base'], None, '2026-01-01')['fundingStatus'], 'review_required')
        self.assertIn('cpf_not_included', [w['code'] for w in self.project(cpfPlan='unknown')['warnings']])
        self.assertIn('stale_snapshot', [w['code'] for w in self.project(portfolioOverride={'amount': 1, 'date': '2025-01-01'})['warnings']])
        with self.assertRaises(ValueError):
            RetirementPlan.model_validate({**FIXTURES['base'], 'afterReturn': float('nan')})


if __name__ == '__main__':
    if '--fixtures' in sys.argv:
        print(json.dumps([calculate_retirement({**FIXTURES['base'], **c['overrides']}, c['assets'], '2026-01-01') for c in FIXTURES['cases']]))
    else:
        unittest.main()
