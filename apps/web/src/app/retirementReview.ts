import { monthIndex, type RetirementPlan } from '@firebuddy/shared';
import { formatSGD } from './fireBuddyModel';

/** Turn a YYYY-MM calendar month into a readable Singapore month name. */
export const monthLabel = (month: string) => /^\d{4}-\d{2}$/.test(month) ? new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1, 1).toLocaleDateString('en-SG', { month: 'long', year: 'numeric' }) : '';
/** Print a decimal rate as a percentage without binary float noise such as 7.000000000000001. */
export const pct = (rate: number) => `${Number((rate * 100).toFixed(2))}%`;
/** Whole years and months between two calendar months, for plain-language feedback. */
export const span = (from: string, to: string) => { const months = monthIndex(to) - monthIndex(from); return months <= 0 ? 'now' : `${Math.floor(months / 12)} years${months % 12 ? ` ${months % 12} months` : ''}`; };
/** Completed age in the given calendar month, or null when the birth month is not usable. */
export const ageAt = (birthMonth: string, month: string) => /^\d{4}-\d{2}$/.test(birthMonth) && /^\d{4}-\d{2}$/.test(month) ? Math.floor((monthIndex(month) - monthIndex(birthMonth)) / 12) : null;

export interface ReviewFact { headline: string; detail: string; provenanceKeys: string[] }
export type ProvenanceLabel = 'Recorded' | 'Typed by you' | 'Default';

/** The strongest provenance wins: one typed value makes the whole group the person's own answer. */
export function provenanceLabel(plan: RetirementPlan, keys: string[]): ProvenanceLabel {
  const values = keys.map(key => plan.provenance[key]).filter(Boolean);
  if (values.includes('user-entered')) return 'Typed by you';
  if (values.includes('recorded')) return 'Recorded';
  return 'Default';
}

export function describeTimeline(plan: RetirementPlan, today: string): ReviewFact {
  const age = ageAt(plan.birthMonth, plan.retirementMonth);
  const month = monthLabel(plan.retirementMonth);
  return {
    headline: month ? `Retire ${month}${age !== null ? ` at ${age}` : ''}` : 'Retirement month missing',
    detail: `Plan through age ${plan.endAge}${month && monthIndex(plan.retirementMonth) >= monthIndex(today) ? ` · ${span(today, plan.retirementMonth)} away` : ''}`,
    provenanceKeys: ['birthMonth', 'retirementMonth', 'endAge'],
  };
}

export function describeSpending(plan: RetirementPlan): ReviewFact {
  return {
    headline: plan.monthlySpending > 0 ? `${formatSGD(plan.monthlySpending, 0)} / month in retirement (today’s money)` : 'Retirement spending missing',
    detail: `Investing ${formatSGD(plan.monthlyContribution, 0)} / month until retirement`,
    provenanceKeys: ['monthlySpending', 'monthlyContribution'],
  };
}

export function describeAssets(plan: RetirementPlan, selectedAssets: number): ReviewFact {
  const count = plan.assetIds.length;
  return {
    headline: `${formatSGD(selectedAssets, 0)} starting portfolio`,
    detail: plan.portfolioOverride ? `Typed total, dated ${plan.portfolioOverride.date}` : count ? `From ${count} selected asset${count === 1 ? '' : 's'}` : 'No assets selected, so the plan starts from zero',
    provenanceKeys: plan.portfolioOverride ? ['portfolioOverride'] : ['assetIds'],
  };
}

export function describeIncome(plan: RetirementPlan): ReviewFact {
  const cpfIncluded = plan.cpfPlan === 'standard' || plan.cpfPlan === 'escalating';
  const sources = plan.otherIncome.length;
  const atStart = plan.otherIncome.reduce((sum, item) => sum + item.monthlyAmount, 0);
  return {
    headline: cpfIncluded ? `CPF LIFE ${plan.cpfPlan === 'standard' ? 'Standard' : 'Escalating'} ${formatSGD(plan.cpfMonthlyPayout, 0)} from ${plan.cpfStartAge}` : 'CPF LIFE not included',
    detail: sources ? `${sources} other source${sources === 1 ? '' : 's'} · ${formatSGD(atStart, 0)} / month at start` : 'No other retirement income',
    // With nothing included, only the plan choice itself counts; the seeded payout provenance would mislabel an empty step.
    provenanceKeys: cpfIncluded ? ['cpfPlan', 'cpfMonthlyPayout', 'cpfStartAge', 'otherIncome'] : sources ? ['cpfPlan', 'otherIncome'] : ['cpfPlan'],
  };
}
