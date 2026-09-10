import { describe, expect, it } from 'vitest';
import type { FireProfile, RetirementPlan, WealthPosition, WealthPositionSnapshot } from '@firebuddy/shared';
import fixtures from '../../../../packages/shared/fixtures/retirement.json';
import { eligibleRetirementAsset } from './retirementSetup';

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
  it('excludes locked assets and emergency reserves regardless of legacy flags', () => {
    const positions = [position('cash', 'asset', true, true), { ...position('cpf', 'asset', true), positionType: 'cpf' as const, restrictionType: 'cpf' as const, liquidityClass: 'restricted' as const },
      { ...position('srs', 'asset', true), restrictionType: 'other_restricted' as const, liquidityClass: 'restricted' as const },
      { ...position('property', 'asset', true), positionType: 'property' as const }, position('broker', 'asset', true)];
    expect(positions.filter(eligibleRetirementAsset).map(p => p.id)).toEqual(['broker']);
    const activePlan = { ...fixtures.base, retirementMonth: '2030-01', assetIds: ['broker'] } as RetirementPlan;
    const profile = { activePlan } as FireProfile;
    const snapshots = positions.map(p => ({ id: p.id, userId, wealthPositionId: p.id, amount: '1000', valueDate: '2026-01-01', createdAt: now, updatedAt: now }));
    const result = buildDemoFinancialSummary(positions, snapshots, [], profile, [], [], '2026-01-01');
    expect(result.fire.currentInvestableAssets).toBe('1000.00');
    const overridden = buildDemoFinancialSummary(positions, snapshots, [], { ...profile, activePlan: { ...activePlan, portfolioOverride: { amount: 5000, date: '2025-01-01' } } }, [], [], '2026-01-01');
    expect(overridden.fire.currentInvestableAssets).toBe('5000.00');
    expect(overridden.fire.warnings.some(w => w.code === 'stale_snapshot')).toBe(true);
    expect(buildDemoFinancialSummary(positions, [], [], profile, [], [], '2026-01-01').fire.fundingStatus).toBe('review_required');
  });
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
    expect(result.fire.fiTarget).toBeNull();
    expect(result.fire.fundingStatus).toBe('review_required');
    expect(result.pulse.savingsRateStatus).toBe('unavailable');
  });
});
