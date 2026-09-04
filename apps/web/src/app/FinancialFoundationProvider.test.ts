import { describe, expect, it } from 'vitest';
import type { FireProfile, WealthPosition, WealthPositionSnapshot } from '@firebuddy/shared';

import { buildDemoFinancialSummary } from './FinancialFoundationProvider';

const userId = '00000000-0000-4000-8000-000000000001';
const now = '2026-08-23T00:00:00.000Z';

function position(id: string, kind: 'asset' | 'liability', includeInFi: boolean, emergency = false): WealthPosition {
  return { id, userId, name: id, positionKind: kind, positionType: kind === 'liability' ? 'loan' : 'cash',
    liquidityClass: emergency ? 'liquid' : 'less_liquid', includeInFi, isEmergencyFund: emergency,
    restrictionType: 'none', currency: 'SGD', isArchived: false, archivedAt: null, latestSnapshot: null,
    createdAt: now, updatedAt: now };
}

describe('demo financial summary', () => {
  it('derives the PRD net worth, FI target, progress, and zero-income state from records', () => {
    const positions = [position('cash', 'asset', true, true), position('broker', 'asset', true), position('home', 'asset', false), position('mortgage', 'liability', false)];
    const amounts = { cash: '31200', broker: '192000', home: '120000', mortgage: '56800' };
    const snapshots: WealthPositionSnapshot[] = positions.map((item) => ({ id: `${item.id}-snapshot`, userId,
      wealthPositionId: item.id, valueDate: '2026-08-23', amount: amounts[item.id as keyof typeof amounts], createdAt: now, updatedAt: now }));
    const profile: FireProfile = { id: 'profile', userId, monthlyContribution: '2500', expectedReturnRate: '0.07',
      inflationRate: '0.02', withdrawalRate: '0.04', retirementSpendingOverride: '4000', targetFiDate: '2042-08-23',
      birthYear: 1994, createdAt: now, updatedAt: now };

    const result = buildDemoFinancialSummary(positions, snapshots, [], profile, [], [], '2026-08-23');

    expect(result.netWorth).toBe('286400.00');
    expect(result.fire.fiTarget).toBe('1200000.00');
    expect(result.fire.progressRate).toBe('0.186000');
    expect(result.pulse.savingsRateStatus).toBe('unavailable');
  });
});
