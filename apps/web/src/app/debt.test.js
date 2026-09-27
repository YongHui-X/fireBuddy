import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { buildDebtSummary, calculateDebtPayoff, highestInterestLiability, roundCents } from '@firebuddy/shared';
import fixtures from '../../../../packages/shared/fixtures/debt.json';

describe('debt payoff engine', () => {
  it('matches the Python calculator on every shared fixture', () => {
    const script = '../backend/tests/test_debt_calculator.py';
    const python = JSON.parse(execFileSync('python', [script, '--fixtures'], { encoding: 'utf8' }));
    fixtures.cases.forEach((fixture, index) => {
      expect(calculateDebtPayoff(fixture.balance, fixture.rate, fixture.payment, fixtures.asOf), fixture.name).toEqual(python[index]);
    });
  });

  it('rounds half away from zero like Decimal ROUND_HALF_UP', () => {
    expect(roundCents(2.675)).toBe(2.68);
    expect(roundCents(1.005)).toBe(1.01);
    expect(roundCents(-2.675)).toBe(-2.68);
  });

  it('summarises service, the costliest rate and the payoff-first candidate', () => {
    const positions = [
      { id: 'car', name: 'Car loan', positionKind: 'liability', isArchived: false, interestRate: '0.0350', monthlyPayment: '546.50' },
      { id: 'card', name: 'Visa', positionKind: 'liability', isArchived: false, interestRate: '0.2600', monthlyPayment: '400' },
      { id: 'cash', name: 'Cash', positionKind: 'asset', isArchived: false, interestRate: null, monthlyPayment: null },
    ];
    const summary = buildDebtSummary(positions, { car: '30000', card: '12000', cash: '1' }, 6000, '2026-01-15');
    expect(summary.totalMonthlyDebtService).toBe('946.50');
    expect(summary.highestInterestRate).toBe('0.2600');
    expect(summary.debtToIncome).toBe('0.157750');
    expect(highestInterestLiability(summary)?.positionId).toBe('card');
    expect(highestInterestLiability(buildDebtSummary(positions.slice(0, 1), { car: '30000' }, null, '2026-01-15'))).toBeNull();
  });
});
