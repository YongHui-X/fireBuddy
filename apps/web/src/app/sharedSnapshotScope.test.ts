import { describe, expect, it } from 'vitest';
import {
  MaskingSession, SNAPSHOT_SECTION_KEYS, buildPersonalSnapshot, createDemoRetirementPlan, createDemoTransactions,
  createDemoWealth, demoCategories, describeMissingRecords, findMissingRecords, requestedSpendingMonths, sectionsWithRecords, scopeSnapshotFacts, selectSnapshotSections, selectSnapshotSectionsForTurn,
} from '@firebuddy/shared';

const todayKey = '2026-10-03';

describe('requestedSpendingMonths', () => {
  it.each([
    ['this month and in july', ['2026-07']],
    ['Sept and December 2025', ['2025-12']],
    ['I may spend more', []],
    ['spending in may', ['2026-05']],
    ['march and november', ['2026-03', '2025-11']],
    ['october', []],
    ['January February March April June July', ['2026-01', '2026-02', '2026-03']],
    ['July and July 2026', ['2026-07']],
  ])('selects extra months for %s', (question, expected) => {
    expect(requestedSpendingMonths(question as string, '2026-10-04')).toEqual(expected);
  });
});

function demoFacts() {
  const wealth = createDemoWealth(todayKey);
  return buildPersonalSnapshot({
    transactions: createDemoTransactions(todayKey), categories: demoCategories,
    ...wealth, retirementPlan: createDemoRetirementPlan(todayKey),
    essentialCategoryIds: demoCategories.filter((category) => category.categoryType === 'expense').map((category) => category.id),
    todayKey,
  }).facts;
}

describe('selectSnapshotSections', () => {
  it.each([
    'How does CPF LIFE work?',
    'What are the CPF contribution rates for 2026, and how do they vary by age?',
    'How do Singapore Savings Bonds work?',
    'What is FIRE?',
    'How do I apply for a Singapore Savings Bond?',
    'Hello there',
  ])('sends no figures for a general question: %s', (question) => {
    expect(selectSnapshotSections(question)).toEqual([]);
  });

  it.each([
    ['How much have I spent this month, and which categories are highest?', ['spending']],
    ['Am I overspending on food?', ['spending']],
    ['Is my emergency fund large enough compared with MoneySense guidance?', ['emergency']],
    ['How long more to FIRE based on my current FireBuddy data?', ['fire']],
    ['Can I retire at 55?', ['fire']],
    ['Am I saving enough of my income?', ['cashflow']],
    ["What's my net worth?", ['netWorth']],
    ['Can I afford a car loan of {{Q1}}?', ['cashflow', 'netWorth']],
  ] as const)('picks only the matching sections: %s', (question, expected) => {
    expect(selectSnapshotSections(question)).toEqual(expected);
  });
});

describe('selectSnapshotSectionsForTurn', () => {
  const spendingHistory = [
    { role: 'user', content: 'How much have I spent this month?' },
    { role: 'assistant', content: 'Your recorded spending this month is S$1,176.' },
  ];

  it('reuses spending for a last month follow-up', () => {
    expect(selectSnapshotSectionsForTurn('And last month?', spendingHistory)).toEqual(['spending']);
  });

  it('uses the question topic instead of history', () => {
    expect(selectSnapshotSectionsForTurn('What is my net worth?', spendingHistory)).toEqual(['netWorth']);
  });

  it('sends no figures for a long question without a topic or follow-up cue', () => {
    expect(selectSnapshotSectionsForTurn(
      'Could you explain the general principles behind making thoughtful decisions in everyday life?',
      spendingHistory,
    )).toEqual([]);
  });

  it('currently reuses spending for an SRS follow-up', () => {
    // Current behavior carries personal spending into a general SRS question.
    expect(selectSnapshotSectionsForTurn('What about SRS?', spendingHistory)).toEqual(['spending']);
  });

  it('sends no figures when there is no previous user message', () => {
    expect(selectSnapshotSectionsForTurn('And last month?', [])).toEqual([]);
    expect(selectSnapshotSectionsForTurn('And last month?', [
      { role: 'assistant', content: 'How much have I spent this month?' },
    ])).toEqual([]);
  });
});

describe('scopeSnapshotFacts', () => {
  it('includes requested historical expense totals with the spending section', () => {
    const date = '2026-10-04';
    const wealth = createDemoWealth(date);
    const template = createDemoTransactions(date)[0];
    const snapshot = buildPersonalSnapshot({
      transactions: [
        { ...template, id: 'july-expense', date: '2026-07-14', amount: '25.00', transactionType: 'expense' },
        { ...template, id: 'july-income', date: '2026-07-15', amount: '900.00', transactionType: 'income' },
        { ...template, id: 'march-expense', date: '2026-03-01', amount: '10.00', transactionType: 'expense' },
      ],
      categories: demoCategories, ...wealth, retirementPlan: null, essentialCategoryIds: [], todayKey: date,
      extraSpendingMonths: requestedSpendingMonths('my spending in july', date),
    });
    const facts = scopeSnapshotFacts(snapshot.facts, ['spending']);
    expect(facts).toMatchObject({ spending: { otherMonths: [
      { month: '2026-07', period: '2026-07-01 to 2026-07-31', total: '25.00' },
    ] } });
    expect(scopeSnapshotFacts(snapshot.facts, ['netWorth'])).not.toHaveProperty('spending');
  });

  it('returns null when no section is chosen', () => {
    expect(scopeSnapshotFacts(demoFacts(), [])).toBeNull();
  });

  it('keeps the freshness keys and only the chosen section', () => {
    const scoped = scopeSnapshotFacts(demoFacts(), ['spending']);
    expect(Object.keys(scoped ?? {})).toEqual(['effectiveDate', 'snapshotStatus', 'spending']);
  });

  it('never carries a key outside the chosen sections after masking', () => {
    const scoped = scopeSnapshotFacts(demoFacts(), ['emergency', 'fire']);
    const masked = new MaskingSession().maskFacts(scoped ?? {});
    const allowed = new Set(['effectiveDate', 'snapshotStatus', ...SNAPSHOT_SECTION_KEYS.emergency, ...SNAPSHOT_SECTION_KEYS.fire]);
    for (const key of Object.keys(masked)) expect(allowed.has(key)).toBe(true);
    expect(masked).not.toHaveProperty('netWorth');
    expect(masked).not.toHaveProperty('spending');
  });
});

describe('findMissingRecords', () => {
  const empty = { expenses: false, transactions: false, wealth: false, firePlan: false, budgets: false };
  const full = { expenses: true, transactions: true, wealth: true, firePlan: true, budgets: true };

  it('names nothing when every needed record exists', () => {
    expect(findMissingRecords(['spending', 'fire'], 'how much did i spend vs my budget', full)).toEqual([]);
  });

  it('reports transactions instead of expenses on an empty ledger', () => {
    expect(findMissingRecords(['spending', 'cashflow'], 'how much did i spend and save', empty)).toEqual(['transactions']);
  });

  it('reports missing budgets only when the question is about budgets', () => {
    const presence = { ...full, budgets: false };
    expect(findMissingRecords(['spending'], 'am i over my budget this month', presence)).toEqual(['budgets']);
    expect(findMissingRecords(['spending'], 'how much did i spend this month', presence)).toEqual([]);
  });

  it('reports wealth once for net worth and emergency together', () => {
    expect(findMissingRecords(['netWorth', 'emergency', 'fire'], 'my net worth and emergency fund', { ...full, wealth: false })).toEqual(['wealth']);
  });

  it('keeps only sections with records behind them', () => {
    expect(sectionsWithRecords(['spending', 'fire'], { ...full, firePlan: false })).toEqual(['spending']);
    expect(sectionsWithRecords(['spending'], empty)).toEqual([]);
  });

  it('writes a plain reply naming what is missing', () => {
    expect(describeMissingRecords(['transactions'])).toMatch(/don't have any recorded transactions/);
    expect(describeMissingRecords(['firePlan'], true)).not.toMatch(/Ask me again/);
  });
});
