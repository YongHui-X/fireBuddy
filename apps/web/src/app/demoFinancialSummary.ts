import {
  buildDebtSummary,
  calculateRetirement,
  calculateSavingsRate,
  highestInterestLiability,
  type FinancialSummary,
  type FireProfile,
  type FireScenarioRequest,
  type WealthContribution,
  type WealthPosition,
  type WealthPositionSnapshot,
} from '@firebuddy/shared';

import type { Transaction } from './fireBuddyModel';

export function localDate(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Singapore', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

export function latestByPosition(snapshots: WealthPositionSnapshot[], asOf: string) {
  const result = new Map<string, WealthPositionSnapshot>();
  [...snapshots].filter((item) => item.valueDate <= asOf).sort((a, b) => b.valueDate.localeCompare(a.valueDate)).forEach((item) => {
    if (!result.has(item.wealthPositionId)) result.set(item.wealthPositionId, item);
  });
  return result;
}

/** Calculate the local demo with the same disclosed formulas as the backend service. */
export function buildDemoFinancialSummary(
  positions: WealthPosition[], snapshots: WealthPositionSnapshot[], contributions: WealthContribution[],
  profile: FireProfile | null, transactions: Transaction[], essentialIds: string[],
  asOf = localDate(), scenario: FireScenarioRequest = {},
): FinancialSummary {
  const active = positions.filter((item) => !item.isArchived);
  const latest = latestByPosition(snapshots, asOf);
  const complete = active.length > 0 && active.every((item) => latest.has(item.id));
  const total = (kind: 'asset' | 'liability') => active.filter((item) => item.positionKind === kind)
    .reduce((sum, item) => sum + Number(latest.get(item.id)?.amount ?? 0), 0);
  const assets = total('asset');
  const liabilities = total('liability');
  const investable = complete ? active.filter((item) => item.positionKind === 'asset' && item.includeInFi)
    .reduce((sum, item) => sum + Number(latest.get(item.id)?.amount ?? 0), 0) : null;
  const emergency = complete ? active.filter((item) => item.isEmergencyFund)
    .reduce((sum, item) => sum + Number(latest.get(item.id)?.amount ?? 0), 0) : null;
  const month = asOf.slice(0, 7);
  const current = transactions.filter((item) => item.date.slice(0, 7) === month && item.date <= asOf);
  const income = current.filter((item) => item.transactionType === 'income').reduce((sum, item) => sum + Math.abs(item.amount), 0);
  const spending = current.filter((item) => item.transactionType === 'expense').reduce((sum, item) => sum + Math.abs(item.amount), 0);
  const savingsRate = calculateSavingsRate(income, spending);
  const invested = contributions.filter((item) => item.contributionDate.slice(0, 7) === month && item.contributionDate <= asOf)
    .reduce((sum, item) => sum + Number(item.amount), 0);
  // Same shared helper as the backend, so demo payoff figures match the API to the cent.
  const debt = buildDebtSummary(active, new Map([...latest].map(([id, snapshot]) => [id, snapshot.amount])), current.length ? income : null, asOf);
  const debtService = Number(debt.totalMonthlyDebtService);
  const historicalExpenses = transactions.filter((item) => item.transactionType === 'expense' && item.date.slice(0, 7) < month);
  const asOfDate = new Date(`${asOf}T00:00:00`);
  const completedEnd = new Date(asOfDate.getFullYear(), asOfDate.getMonth(), 0);
  const earliestAllowed = new Date(completedEnd.getFullYear(), completedEnd.getMonth() - 11, 1);
  const firstExpense = historicalExpenses.length ? new Date(`${[...historicalExpenses].sort((a, b) => a.date.localeCompare(b.date))[0].date.slice(0, 7)}-01T00:00:00`) : null;
  const baselineStart = firstExpense && firstExpense > earliestAllowed ? firstExpense : earliestAllowed;
  const completedMonths = firstExpense
    ? (completedEnd.getFullYear() - baselineStart.getFullYear()) * 12 + completedEnd.getMonth() - baselineStart.getMonth() + 1
    : 0;
  const baselineStartKey = localDate(baselineStart).slice(0, 7);
  const periodExpenses = historicalExpenses.filter((item) => item.date.slice(0, 7) >= baselineStartKey);
  const expenseTotal = periodExpenses.reduce((sum, item) => sum + Math.abs(item.amount), 0);
  const essentialTotal = periodExpenses.filter((item) => essentialIds.includes(item.category)).reduce((sum, item) => sum + Math.abs(item.amount), 0);
  const essentialAverage = completedMonths > 0 && essentialIds.length > 0 ? essentialTotal / completedMonths : null;
  const plan = profile?.activePlan ? { ...profile.activePlan, ...scenario.planOverrides,
    ...(scenario.monthlyContribution !== undefined ? { monthlyContribution: Number(scenario.monthlyContribution) } : {}),
    ...(scenario.retirementSpending !== undefined ? { monthlySpending: Number(scenario.retirementSpending) } : {}),
  } : null;
  const eligible = active.filter(item => item.positionKind === 'asset' && plan?.assetIds.includes(item.id));
  const completePortfolio = plan && plan.assetIds.every(id => eligible.some(item => item.id === id) && latest.has(id));
  const spendable = completePortfolio ? eligible.reduce((sum, item) => sum + Number(latest.get(item.id)!.amount), 0) : null;
  const fire = calculateRetirement(plan, spendable, asOf);
  if (plan && !plan.portfolioOverride) {
    fire.actualPath = [...new Set(snapshots.filter(item => item.valueDate <= asOf).map(item => item.valueDate.slice(0, 7)))].sort().flatMap(pathMonth => {
      const values = latestByPosition(snapshots, pathMonth === month ? asOf : `${pathMonth}-31`);
      if (!eligible.length || !eligible.every(item => values.has(item.id))) return [];
      return [{ date: `${pathMonth}-01`, amount: eligible.reduce((sum, item) => sum + Number(values.get(item.id)!.amount), 0).toFixed(2), kind: 'actual' as const }];
    });
  }
  fire.spendingBaseline = {
    status: completedMonths === 12 ? 'available' : completedMonths > 0 ? 'limited' : 'insufficient_data',
    source: completedMonths > 0 ? 'transactions' : 'none', startDate: completedMonths > 0 ? `${baselineStartKey}-01` : null,
    endDate: completedMonths > 0 ? localDate(completedEnd) : null, completedMonths,
    expenseTotal: completedMonths ? expenseTotal.toFixed(2) : null,
    annualisedSpending: completedMonths ? (expenseTotal / completedMonths * 12).toFixed(2) : null,
  };
  if (completedMonths < 12) fire.warnings.push({ code: 'limited_history', message: 'Fewer than 12 completed months of recorded expenses. Missing records do not prove zero spending.' });
  const recordedIncome = transactions.filter(item => item.transactionType === 'income' && item.date.slice(0, 7) >= baselineStartKey && item.date.slice(0, 7) < month).reduce((sum, item) => sum + Math.abs(item.amount), 0);
  if (completedMonths && plan && plan.monthlyContribution > (recordedIncome - expenseTotal) / completedMonths) fire.warnings.push({ code: 'contribution_above_savings', message: 'Confirmed investment contributions exceed recorded average savings. Review affordability and incomplete records.' });
  const snapshotDates = [...latest.values()].map((item) => item.valueDate);
  const stale = snapshotDates.some((value) => (new Date(`${asOf}T00:00:00`).getTime() - new Date(`${value}T00:00:00`).getTime()) / 86_400_000 > 35);
  if (stale) fire.warnings.push({ code: 'stale_snapshot', message: 'At least one wealth value is older than 35 days.' });
  const snapshotStatus = !complete ? 'missing' : stale ? 'stale' : new Set(snapshotDates).size > 1 ? 'mixed' : 'current';
  let recommendedAction: FinancialSummary['recommendedAction'] = null;
  if (!active.length) recommendedAction = action('add_position', 'Add your first wealth position', 'Net worth needs a dated asset or liability value.', '/wealth', 'foundation.v1.add_position');
  else if (!complete) recommendedAction = action('add_snapshot', 'Complete your wealth values', 'One or more positions has no current value.', '/wealth', 'foundation.v1.missing_snapshot');
  else if (stale) recommendedAction = action('refresh_snapshot', 'Refresh a stale wealth value', 'A value is older than 35 days.', '/wealth', 'foundation.v1.stale_snapshot');
  else if (!active.some((item) => item.isEmergencyFund)) recommendedAction = action('designate_emergency_fund', 'Designate an emergency fund', 'Runway needs one eligible liquid asset.', '/wealth', 'foundation.v1.emergency_fund');
  else if (!essentialIds.length) recommendedAction = action('select_essentials', 'Choose essential categories', 'Runway needs confirmed essential expenses.', '/plan', 'foundation.v1.essential_categories');
  else {
    const expensive = highestInterestLiability(debt);
    if (expensive) recommendedAction = action('pay_down_high_interest_debt', `Pay down ${expensive.name} first`, 'This liability charges more than 6% a year, above typical long-run investment returns.', '/wealth', 'foundation.v1.high_interest_debt');
  }
  return {
    effectiveDate: asOf, dataMode: 'demo', netWorth: complete ? (assets - liabilities).toFixed(2) : null,
    assetTotal: complete ? assets.toFixed(2) : null, liabilityTotal: complete ? liabilities.toFixed(2) : null,
    priorMonthNetWorth: null, monthlyNetWorthChange: null, investableAssets: investable?.toFixed(2) ?? null,
    emergencyEligibleAssets: emergency?.toFixed(2) ?? null,
    averageMonthlyEssentialSpending: essentialAverage?.toFixed(2) ?? null,
    emergencyRunwayMonths: emergency !== null && essentialAverage ? (emergency / essentialAverage).toFixed(6) : null,
    averageMonthlyDebtService: debt.liabilities.length ? debtService.toFixed(2) : null,
    emergencyRunwayMonthsWithDebt: emergency !== null && essentialAverage ? (emergency / (essentialAverage + debtService)).toFixed(6) : null,
    debt,
    latestSnapshotDate: snapshotDates.sort().at(-1) ?? null, snapshotStatus,
    pulse: { month, income: income.toFixed(2), spending: spending.toFixed(2), savingsAmount: (income - spending).toFixed(2),
      savingsRate: savingsRate?.toFixed(6) ?? null, savingsRateStatus: savingsRate === null ? 'unavailable' : 'available',
      investedAmount: invested.toFixed(2), debtService: debtService.toFixed(2), completeness: current.length ? 'complete' : 'limited' },
    fire, recommendedAction, transactionAnomalies: [], warnings: stale ? [{ code: 'stale_snapshot', message: 'At least one wealth value is older than 35 days.' }] : [],
  };
}

export function action(actionType: string, title: string, rationale: string, destination: string, ruleId: string) {
  return { actionType, title, rationale, destination, ruleId, evidence: localDate(), limitations: null };
}
