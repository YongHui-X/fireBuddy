import { calendarMonth, monthIndex, type FireProfile, type RetirementPlan, type WealthPosition } from '@firebuddy/shared';

/** Any active asset can be chosen for retirement; the user decides what they can spend. Liabilities never qualify. */
export function eligibleRetirementAsset(p: WealthPosition) {
  return !p.isArchived && p.positionKind === 'asset';
}
/** Plain label for assets the user may not be able to spend freely, shown beside the checkbox rather than blocking it. */
export function retirementAssetNote(p: WealthPosition) {
  if (p.positionKind === 'liability') return 'Liability';
  if (p.positionType === 'cpf' || p.restrictionType !== 'none' || p.liquidityClass === 'restricted') return 'Restricted';
  if (p.positionType === 'property') return 'Property';
  if (p.isEmergencyFund) return 'Emergency fund';
  return 'Spendable';
}
/** Reuse values for confirmation without activating defaults. */
export function initialRetirementPlan(profile: FireProfile | null, positions: WealthPosition[]): RetirementPlan {
  return profile?.draftPlan?.inputs ?? profile?.activePlan ?? {
    version: 2, spendingMonth: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Singapore', year: 'numeric', month: '2-digit' }).format(new Date()).slice(0, 7), birthMonth: profile?.birthYear ? `${profile.birthYear}-01` : '', retirementMonth: profile?.targetFiDate?.slice(0, 7) ?? '', endAge: 95,
    monthlySpending: Number(profile?.retirementSpendingOverride ?? 0), monthlyContribution: Number(profile?.monthlyContribution ?? 0),
    assetIds: positions.filter(p => eligibleRetirementAsset(p) && p.includeInFi).map(p => p.id), portfolioOverride: null,
    cpfPlan: 'unknown', cpfStartAge: 65, cpfMonthlyPayout: 0, otherIncome: [],
    beforeReturn: Number(profile?.expectedReturnRate ?? 0.05), afterReturn: 0.03, inflation: Number(profile?.inflationRate ?? 0.025),
    provenance: { birthMonth: 'assumed', retirementMonth: 'recorded', monthlySpending: 'user-entered', monthlyContribution: 'user-entered', assetIds: 'recorded', cpfMonthlyPayout: 'user-entered', beforeReturn: 'assumed', afterReturn: 'assumed', inflation: 'assumed', endAge: 'assumed' },
  };
}
/** Preserve legacy columns for compatibility and review. */
export function legacyProfileValues(profile: FireProfile | null) {
  return { monthlyContribution: profile?.monthlyContribution ?? '0', expectedReturnRate: profile?.expectedReturnRate ?? '0.05', inflationRate: profile?.inflationRate ?? '0.025', withdrawalRate: profile?.withdrawalRate ?? '0.04', retirementSpendingOverride: profile?.retirementSpendingOverride ?? null, targetFiDate: profile?.targetFiDate ?? null, birthYear: profile?.birthYear ?? null };
}
/** Translate a confirmed age into its Singapore calendar month. */
export function retirementAtAge(birth: string, age: number) {
  return birth ? calendarMonth(monthIndex(birth) + age * 12) : '';
}
