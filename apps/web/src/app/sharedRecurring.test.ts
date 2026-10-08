import { describe, expect, it } from 'vitest';
import {
  MAX_CATCH_UP,
  createRecurringRule,
  describeRecurringSchedule,
  dueOccurrences,
  materialiseRecurring,
  nextDueDate,
  occurrenceDate,
  rescheduleRecurringRule,
  resumeRecurringRule,
  type RecurringRule,
} from '@firebuddy/shared';

const now = '2026-10-06T12:00:00.000Z';

function rule(overrides: Partial<RecurringRule> = {}): RecurringRule {
  return {
    id: 'rule-1',
    template: {
      transactionType: 'expense',
      amount: '25.00',
      categoryId: 'category-1',
      accountId: 'account-1',
      description: 'Monthly payment',
      tagIds: ['tag-1'],
    },
    frequency: 'monthly',
    startDate: '2026-01-10',
    nextIndex: 1,
    endDate: null,
    paused: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('shared recurring helpers', () => {
  it('calculates weekly occurrence dates across year boundaries', () => {
    expect(occurrenceDate('2026-10-06', 'weekly', 1)).toBe('2026-10-13');
    expect(occurrenceDate('2026-12-29', 'weekly', 1)).toBe('2027-01-05');
  });

  it('clamps monthly dates without drifting and handles leap years', () => {
    expect(occurrenceDate('2026-01-31', 'monthly', 1)).toBe('2026-02-28');
    expect(occurrenceDate('2026-01-31', 'monthly', 2)).toBe('2026-03-31');
    expect(occurrenceDate('2026-01-31', 'monthly', 3)).toBe('2026-04-30');
    expect(occurrenceDate('2028-01-31', 'monthly', 1)).toBe('2028-02-29');
    expect(occurrenceDate('2026-12-15', 'monthly', 1)).toBe('2027-01-15');
  });

  it('clamps yearly leap day occurrences', () => {
    expect(occurrenceDate('2028-02-29', 'yearly', 1)).toBe('2029-02-28');
    expect(occurrenceDate('2028-02-29', 'yearly', 4)).toBe('2032-02-29');
  });

  it.each(['2026-02-30', 'nope'])('throws for invalid start date %s', (startDate) => {
    expect(() => occurrenceDate(startDate, 'monthly', 1)).toThrow();
  });

  it('returns due monthly occurrences up to today and respects end dates', () => {
    const monthly = rule({ startDate: '2026-07-25' });
    expect(dueOccurrences(monthly, '2026-10-26')).toEqual([
      { index: 1, date: '2026-08-25' },
      { index: 2, date: '2026-09-25' },
      { index: 3, date: '2026-10-25' },
    ]);
    expect(dueOccurrences(monthly, '2026-10-24')).toEqual([
      { index: 1, date: '2026-08-25' },
      { index: 2, date: '2026-09-25' },
    ]);
    expect(dueOccurrences({ ...monthly, paused: true }, '2026-10-26')).toEqual([]);
    expect(dueOccurrences({ ...monthly, endDate: '2026-09-01' }, '2026-10-26')).toEqual([
      { index: 1, date: '2026-08-25' },
    ]);
    expect(dueOccurrences(monthly, 'not-a-date')).toEqual([]);
  });

  it('materialises due rules once, sorts inputs, and preserves template arrays', () => {
    const first = rule({ id: 'first', startDate: '2026-07-25' });
    const second = rule({ id: 'second', startDate: '2026-09-01', template: { ...rule().template, tagIds: ['tag-2'] } });
    const result = materialiseRecurring([first, second], '2026-10-02', now);

    expect(result.inputs.map((input) => [input.recurringId, input.date])).toEqual([
      ['first', '2026-08-25'],
      ['first', '2026-09-25'],
      ['second', '2026-10-01'],
    ]);
    expect(result.inputs[0]).toMatchObject({ ...first.template, recurringId: 'first', date: '2026-08-25' });
    expect(result.inputs[0].tagIds).not.toBe(first.template.tagIds);
    result.inputs[0].tagIds.push('changed');
    expect(first.template.tagIds).toEqual(['tag-1']);
    expect(materialiseRecurring(result.rules, '2026-10-02', now).inputs).toEqual([]);

    const untouched = rule({ startDate: '2026-10-01', nextIndex: 1 });
    expect(materialiseRecurring([untouched], '2026-09-30', now).rules[0]).toBe(untouched);
  });

  it('caps catch-up at MAX_CATCH_UP occurrences', () => {
    const result = materialiseRecurring([
      rule({ frequency: 'weekly', startDate: '2006-01-01', nextIndex: 1 }),
    ], '2026-10-06', now);
    expect(result.inputs).toHaveLength(MAX_CATCH_UP);
  });

  it('creates a rule from the transaction template', () => {
    const input = {
      transactionType: 'income' as const,
      amount: '3000.00',
      categoryId: 'salary',
      accountId: 'bank',
      description: 'Salary',
      date: '2026-10-01',
      tagIds: ['income'],
    };
    const created = createRecurringRule(input, 'monthly', '2027-10-01', 'rule-new', now);

    expect(created).toEqual({
      id: 'rule-new',
      template: {
        transactionType: input.transactionType,
        amount: input.amount,
        categoryId: input.categoryId,
        accountId: input.accountId,
        description: input.description,
        tagIds: input.tagIds,
      },
      frequency: 'monthly',
      startDate: input.date,
      nextIndex: 1,
      endDate: '2027-10-01',
      paused: false,
      createdAt: now,
      updatedAt: now,
    });
    expect(created.template.tagIds).not.toBe(input.tagIds);
  });

  it('resumes without back-filling paused monthly occurrences', () => {
    const paused = rule({ paused: true, nextIndex: 2 });
    expect(resumeRecurringRule(paused, '2026-06-01', now)).toMatchObject({
      paused: false,
      nextIndex: 5,
      updatedAt: now,
    });
    expect(nextDueDate(resumeRecurringRule(paused, '2026-06-01', now))).toBe('2026-06-10');
    expect(nextDueDate(resumeRecurringRule(paused, '2026-06-10', now))).toBe('2026-06-10');
  });

  it('reschedules from the old next due date and preserves same-frequency rules', () => {
    const monthly = rule({ nextIndex: 2 });
    const weekly = rescheduleRecurringRule(monthly, 'weekly', now);
    expect(weekly).toMatchObject({ startDate: '2026-03-10', nextIndex: 0, frequency: 'weekly', updatedAt: now });
    expect(rescheduleRecurringRule(monthly, 'monthly', now)).toBe(monthly);
  });

  it('returns null when the next occurrence is past the end date', () => {
    expect(nextDueDate(rule({ endDate: '2026-01-01' }))).toBeNull();
  });

  it('describes monthly, yearly and weekly schedules', () => {
    expect(describeRecurringSchedule({ frequency: 'monthly', startDate: '2026-10-01' })).toBe('Monthly on the 1st');
    expect(describeRecurringSchedule({ frequency: 'monthly', startDate: '2026-10-22' })).toBe('Monthly on the 22nd');
    expect(describeRecurringSchedule({ frequency: 'monthly', startDate: '2026-10-11' })).toBe('Monthly on the 11th');
    expect(describeRecurringSchedule({ frequency: 'monthly', startDate: '2026-10-13' })).toBe('Monthly on the 13th');
    expect(describeRecurringSchedule({ frequency: 'yearly', startDate: '2028-02-29' })).toBe('Yearly on 29 Feb');
    expect(describeRecurringSchedule({ frequency: 'weekly', startDate: '2026-10-05' })).toBe('Weekly on Mondays');
  });
});
