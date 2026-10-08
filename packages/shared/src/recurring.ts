import type { CreateTransactionInput, TransactionType } from './types';

/**
 * Recurring transactions (owner, 6 Oct 2026): salary, rent, subscriptions. A rule remembers what to
 * record and how often; due copies are added on the phone when the app opens, catching up any
 * periods missed while it was closed. Records only: FireBuddy never moves money.
 */

export type RecurringFrequency = 'weekly' | 'monthly' | 'yearly';

export const RECURRING_FREQUENCIES: readonly RecurringFrequency[] = ['weekly', 'monthly', 'yearly'];

export const recurringFrequencyLabels: Record<RecurringFrequency, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
};

export interface RecurringTemplate {
  transactionType: TransactionType;
  amount: string;
  categoryId: string | null;
  accountId: string;
  description: string;
  tagIds: string[];
}

export interface RecurringRule {
  id: string;
  template: RecurringTemplate;
  frequency: RecurringFrequency;
  /** YYYY-MM-DD of occurrence 0. Every later date is counted from here, so month ends never drift. */
  startDate: string;
  /** Index of the next occurrence still to be recorded (occurrence 0 is usually the transaction that created the rule). */
  nextIndex: number;
  /** Last date an occurrence may fall on, inclusive; null repeats until stopped. */
  endDate: string | null;
  paused: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Upper bound on occurrences added in one pass, so a bad date can never flood the ledger. */
export const MAX_CATCH_UP = 400;

function parseKey(dateKey: string): [number, number, number] | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return null;
  return [year, month, day];
}

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function toKey(year: number, month: number, day: number) {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function isValidDateKey(dateKey: string) {
  return parseKey(dateKey) !== null;
}

/**
 * Date of occurrence `index` (0 = the start date). Monthly and yearly keep the start's day of
 * month and clamp it to shorter months: a rule started on 31 Jan falls on 28 or 29 Feb, then
 * back on 31 Mar; one started on 29 Feb falls on 28 Feb in other years.
 */
export function occurrenceDate(startDate: string, frequency: RecurringFrequency, index: number): string {
  const parsed = parseKey(startDate);
  if (!parsed) throw new Error(`Invalid start date: ${startDate}`);
  const [year, month, day] = parsed;
  if (frequency === 'weekly') {
    const shifted = new Date(Date.UTC(year, month - 1, day + index * 7));
    return toKey(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, shifted.getUTCDate());
  }
  const monthsAhead = frequency === 'monthly' ? index : index * 12;
  const totalMonths = (year * 12 + (month - 1)) + monthsAhead;
  const targetYear = Math.floor(totalMonths / 12);
  const targetMonth = (totalMonths % 12) + 1;
  return toKey(targetYear, targetMonth, Math.min(day, daysInMonth(targetYear, targetMonth)));
}

/** The date the rule records next, or null once it has passed its end date. */
export function nextDueDate(rule: RecurringRule): string | null {
  const date = occurrenceDate(rule.startDate, rule.frequency, rule.nextIndex);
  return rule.endDate && date > rule.endDate ? null : date;
}

export interface DueOccurrence {
  index: number;
  date: string;
}

/** Occurrences due on or before `today` that have not been recorded yet. Paused rules have none. */
export function dueOccurrences(rule: RecurringRule, today: string): DueOccurrence[] {
  if (rule.paused || !parseKey(rule.startDate) || !parseKey(today)) return [];
  const due: DueOccurrence[] = [];
  for (let index = Math.max(0, rule.nextIndex); due.length < MAX_CATCH_UP; index += 1) {
    const date = occurrenceDate(rule.startDate, rule.frequency, index);
    if (date > today || (rule.endDate && date > rule.endDate)) break;
    due.push({ index, date });
  }
  return due;
}

export interface MaterialisedRecurring {
  /** Transactions to add, oldest first, each tagged with its rule. */
  inputs: Array<CreateTransactionInput & { recurringId: string }>;
  /** Every rule, with `nextIndex` moved past what was added. Unchanged rules are the same objects. */
  rules: RecurringRule[];
}

/**
 * Turn every due occurrence into a transaction input and advance the rules. Pure: running it twice
 * with the returned rules adds nothing the second time.
 */
export function materialiseRecurring(rules: readonly RecurringRule[], today: string, now: string): MaterialisedRecurring {
  const inputs: MaterialisedRecurring['inputs'] = [];
  const nextRules = rules.map((rule) => {
    const due = dueOccurrences(rule, today);
    if (due.length === 0) return rule;
    for (const occurrence of due) {
      inputs.push({ ...rule.template, tagIds: [...rule.template.tagIds], date: occurrence.date, recurringId: rule.id });
    }
    return { ...rule, nextIndex: due[due.length - 1].index + 1, updatedAt: now };
  });
  inputs.sort((a, b) => a.date.localeCompare(b.date));
  return { inputs, rules: nextRules };
}

/**
 * A new rule from the transaction that starts it. That transaction is occurrence 0, so the rule's
 * first copy is one period after it.
 */
export function createRecurringRule(
  input: CreateTransactionInput,
  frequency: RecurringFrequency,
  endDate: string | null,
  id: string,
  now: string,
): RecurringRule {
  return {
    id,
    template: {
      transactionType: input.transactionType,
      amount: input.amount,
      categoryId: input.categoryId,
      accountId: input.accountId,
      description: input.description,
      tagIds: [...input.tagIds],
    },
    frequency,
    startDate: input.date,
    nextIndex: 1,
    endDate,
    paused: false,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Resume a paused rule without back-filling the paused stretch: it picks up from the first
 * occurrence on or after `today`.
 */
export function resumeRecurringRule(rule: RecurringRule, today: string, now: string): RecurringRule {
  let index = Math.max(0, rule.nextIndex);
  for (let guard = 0; guard < MAX_CATCH_UP * 10 && occurrenceDate(rule.startDate, rule.frequency, index) < today; guard += 1) index += 1;
  return { ...rule, paused: false, nextIndex: index, updatedAt: now };
}

/**
 * Change how often a rule repeats. The schedule restarts from its next due date, so nothing
 * already recorded is repeated or skipped.
 */
export function rescheduleRecurringRule(rule: RecurringRule, frequency: RecurringFrequency, now: string): RecurringRule {
  if (frequency === rule.frequency) return rule;
  const next = occurrenceDate(rule.startDate, rule.frequency, rule.nextIndex);
  return { ...rule, frequency, startDate: next, nextIndex: 0, updatedAt: now };
}

/** "Monthly on the 25th", "Weekly on Mondays", "Yearly on 29 Feb" for a rule's schedule. */
export function describeRecurringSchedule(rule: Pick<RecurringRule, 'frequency' | 'startDate'>): string {
  const parsed = parseKey(rule.startDate);
  if (!parsed) return recurringFrequencyLabels[rule.frequency];
  const [year, month, day] = parsed;
  if (rule.frequency === 'weekly') {
    const weekday = new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-SG', { weekday: 'long', timeZone: 'UTC' });
    return `Weekly on ${weekday}s`;
  }
  if (rule.frequency === 'monthly') return `Monthly on the ${ordinal(day)}`;
  const monthName = new Date(Date.UTC(2000, month - 1, 1)).toLocaleDateString('en-SG', { month: 'short', timeZone: 'UTC' });
  return `Yearly on ${day} ${monthName}`;
}

function ordinal(day: number) {
  const suffix = day % 100 >= 11 && day % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[day % 10] ?? 'th';
  return `${day}${suffix}`;
}
