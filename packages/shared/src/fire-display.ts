import { calendarMonth, monthIndex } from './retirement';
import type { FireCalculationResult } from './types';

/**
 * A future amount in today's money: divides by monthly-compounded inflation from `fromMonth`
 * (normally this month) to `month`. Months before `fromMonth` are returned unchanged.
 */
export function toTodaysMoney(amount: number, month: string, fromMonth: string, inflation: number) {
  const months = Math.max(0, monthIndex(month) - monthIndex(fromMonth));
  if (!Number.isFinite(amount) || !Number.isFinite(inflation) || inflation <= -1) return amount;
  return amount / (1 + inflation) ** (months / 12);
}

/**
 * Round axis ticks for a chart that runs from `min` (0 or below) to `max`: a 1, 2 or 5 step
 * times a power of ten, so labels read $250k, $500k rather than $463k. Always includes 0, and
 * the last tick is at or above `max`.
 */
export function niceTicks(max: number, min = 0, target = 4): number[] {
  const top = Math.max(max, 1);
  const bottom = Math.min(min, 0);
  const raw = (top - bottom) / Math.max(target - 1, 1);
  const power = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * power).find((candidate) => candidate >= raw) ?? 10 * power;
  const ticks: number[] = [];
  const first = Math.floor(bottom / step + 1e-9);
  for (let k = first; ; k += 1) {
    const value = Number((k * step).toPrecision(12));
    ticks.push(value === 0 ? 0 : value);
    if (value >= top - 1e-9) break;
  }
  return ticks;
}

export interface AxisLabel {
  key: string;
  /** Centre (or anchor) position in pixels. */
  x: number;
  /** Estimated width in pixels. */
  width: number;
  /** Higher keeps its place when two labels would overlap. */
  priority: number;
}

/**
 * Keeps the x-axis labels that fit without overlapping, highest priority first, and clamps
 * each inside `[left, right]`. Returns the kept labels with their final centre positions.
 */
export function placeAxisLabels(labels: readonly AxisLabel[], left: number, right: number, gap = 6): (AxisLabel & { center: number })[] {
  const kept: (AxisLabel & { center: number })[] = [];
  for (const label of [...labels].sort((a, b) => b.priority - a.priority)) {
    const half = label.width / 2;
    const center = Math.min(Math.max(label.x, left + half), right - half);
    const clashes = kept.some((other) => Math.abs(other.center - center) < half + other.width / 2 + gap);
    if (!clashes) kept.push({ ...label, center });
  }
  return kept.sort((a, b) => a.center - b.center);
}

/**
 * The first month Coast FIRE can start: the end of the earliest month whose balance, left to grow
 * at the before-retirement return with no more contributions, still reaches the amount needed by
 * retirement. Today's month when the starting assets already do; null when it is never reached
 * before retirement, or the plan has no result.
 */
export function coastStartMonth(fire: FireCalculationResult): string | null {
  const plan = fire.plan;
  if (!plan || fire.fiTarget == null || fire.currentInvestableAssets == null) return null;
  const target = Number(fire.fiTarget);
  const monthly = (1 + plan.beforeReturn) ** (1 / 12);
  const rows = fire.monthlyCashFlows ?? [];
  const retirement = monthIndex(plan.retirementMonth);
  const reaches = (balance: number, afterMonth: number) => balance * monthly ** Math.max(0, retirement - afterMonth) + 1e-7 >= target;
  const now = monthIndex(fire.effectiveDate);
  if (reaches(Number(fire.currentInvestableAssets), now)) return fire.effectiveDate.slice(0, 7);
  for (const row of rows) {
    if (row.phase !== 'accumulation') break;
    // Balances are month-end, so growth counts from the following month.
    if (reaches(Number(row.balance), monthIndex(row.month) + 1)) return row.month;
  }
  return null;
}

export interface FireStage {
  key: 'fire' | 'coast' | 'barista' | 'full';
  /** "Coast age", "Retire", "Barista FIRE", "Stop part-time work". */
  title: string;
  /** What changes for the person: "Stop investing", "Go part-time". */
  action: string;
  /** YYYY-MM; null when it is not reached on this plan. */
  month: string | null;
  /** The stage at the age the person typed (`plan.retirementMonth`); the hero leads with it. */
  primary: boolean;
}

/**
 * The stages of the plan's FIRE type, in order, named the way FIRE calculators name them
 * (DBS, The Financial Coconut, A Brother Abroad; owner, 10 Oct 2026). Lean, Regular, Fat and
 * Custom have one stage: retire. Coast reaches its Coast age first, when investing stops (the typed
 * `coastMonth`, or `coastStartMonth` for older plans), then retires at the typed age. Barista goes part-time at the typed age, then
 * stops part-time work when that income ends.
 */
export function fireStages(fire: FireCalculationResult): FireStage[] {
  const plan = fire.plan;
  if (!plan) return [];
  const type = plan.fireType ?? 'custom';
  if (type === 'coast') {
    return [
      { key: 'coast', title: 'Coast age', action: 'Stop investing', month: plan.coastMonth ?? coastStartMonth(fire), primary: false },
      { key: 'full', title: 'Retire', action: 'Stop working', month: plan.retirementMonth, primary: true },
    ];
  }
  if (type === 'barista') {
    const partTime = plan.otherIncome.find((income) => income.source === 'barista');
    const planEnd = monthIndex(plan.birthMonth) + plan.endAge * 12;
    const ends = partTime && monthIndex(partTime.endMonth) < planEnd ? partTime.endMonth : null;
    return [
      { key: 'barista', title: 'Barista FIRE', action: 'Go part-time', month: plan.retirementMonth, primary: true },
      { key: 'full', title: 'Stop part-time work', action: 'Stop working', month: ends, primary: false },
    ];
  }
  return [{ key: 'fire', title: 'Retire', action: 'Stop working', month: plan.retirementMonth, primary: true }];
}

/**
 * Converts the engine's dollar amounts into today's money, the only money the phone's planner
 * shows (PRD 6.6.1, 4). The base is the end of last month, the point the engine prices today's
 * spending from, so a S$3,000 budget typed this month reads S$3,000 in every month.
 */
export function fireTodaysMoney(fire: FireCalculationResult) {
  const base = calendarMonth(monthIndex(fire.effectiveDate) - 1);
  const inflation = fire.plan?.inflation ?? 0;
  return (value: number | string | null | undefined, month: string) =>
    (value == null ? null : toTodaysMoney(Number(value), month, base, inflation));
}
