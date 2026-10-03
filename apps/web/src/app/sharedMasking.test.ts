import { describe, expect, it } from 'vitest';
import { MaskingSession, moneyBand, monthsBand, percentBand } from '@firebuddy/shared';

describe('shared masking', () => {
  it.each([
    [0, 'zero'], [999.99, 'under 1k'], [1000, '1k-5k'],
    [999999.99, '500k-1M'], [1000000, 'over 1M'],
    [-999.99, 'negative, under 1k'], [-1000000, 'negative, over 1M'],
  ] as const)('moneyBand(%s) is %s', (value, band) => {
    expect(moneyBand(value)).toBe(band);
  });

  it.each([
    [0, '0-10%'], [9.99, '0-10%'], [10, '10-20%'],
    [99.99, '90-100%'], [100, '90-100%'], [100.01, 'over 100%'],
    [-0.01, '-10 to 0%'], [-10, '-10 to 0%'],
  ] as const)('percentBand(%s) is %s', (value, band) => {
    expect(percentBand(value)).toBe(band);
  });

  it.each([
    [-1, '0-1 months'], [0, '0-1 months'], [0.99, '0-1 months'],
    [1, '1-3 months'], [2.99, '1-3 months'], [3, '3-6 months'],
    [5.99, '3-6 months'], [6, '6-12 months'], [11.99, '6-12 months'], [12, 'over 12 months'],
  ] as const)('monthsBand(%s) is %s', (value, band) => {
    expect(monthsBand(value)).toBe(band);
  });

  it('masks typed facts, reuses repeated money and keeps passthrough keys', () => {
    const session = new MaskingSession();
    const facts = session.maskFacts({
      netWorth: '6800.00', amount: '6800.00', savingsRate: '0.065',
      emergencyRunwayMonths: '5.2', unknownAmount: '15000',
      effectiveDate: '2026-10-03', month: '2026-10', estimatedFiYear: 2045,
      warningCodes: ['missing_snapshot'], completeness: 'limited',
    });
    expect(facts.netWorth).toBe('{{M1}} (range: 5k-10k)');
    expect(facts.amount).toBe(facts.netWorth);
    expect(facts.savingsRate).toMatch(/^\{\{R\d+\}\} \(range: 0-10%\)$/);
    expect(facts.emergencyRunwayMonths).toMatch(/^\{\{N\d+\}\} \(range: 3-6 months\)$/);
    expect(facts.unknownAmount).toBe('{{M2}} (range: 10k-25k)');
    expect(facts.effectiveDate).toBe('2026-10-03');
    expect(facts.month).toBe('2026-10');
    expect(facts.estimatedFiYear).toBe(2045);
    expect(facts.warningCodes).toEqual(['missing_snapshot']);
    expect(facts.completeness).toBe('limited');
  });

  it('masks text figures and names, then restores values without echoed ranges', () => {
    const session = new MaskingSession({ positions: ['Car loan'] });
    const facts = session.maskFacts({ evidence: '6.50% on S$6800.00', title: 'Pay down Car loan first' });
    expect(facts.evidence).toMatch(/^\{\{R\d+\}\} \(range: 0-10%\) on \{\{M\d+\}\} \(range: 5k-10k\)$/);
    expect(facts.title).toBe('Pay down {{P1}} first');
    expect(session.unmask(facts.evidence)).toContain('S$6,800.00');
    expect(session.unmask(facts.evidence)).not.toContain('(range:');
    expect(session.unmask('{{M1}} (range: 5k-10k)')).toBe('S$6,800.00');
    expect(session.unmask('{{M999}}')).toBe('[figure unavailable]');
  });

  it.each(['S$6,000', 'SGD 2500', '$1.2k', '12,500', '15000'])('scrubs and restores %s', (amount) => {
    const session = new MaskingSession();
    const question = `What about ${amount}?`;
    expect(session.scrubQuestion(question)).toMatch(/^What about \{\{Q\d+\}\}\?$/);
    expect(session.unmask(session.scrubQuestion(question))).toBe(question);
  });

  it('keeps years, dates, percentages, and small numbers', () => {
    const question = 'In 2026 on 2026-03-01, is 4.5% on 500 enough?';
    expect(new MaskingSession().scrubQuestion(question)).toBe(question);
  });

  it('masks registered names regardless of case while keeping stoplisted and short names', () => {
    const session = new MaskingSession({ accounts: ['DBS Savings', 'Cash', 'UOB'], positions: ['Car loan'] });
    expect(session.scrubQuestion('dbs savings and CAR LOAN then Car loan')).toBe('{{P1}} and {{P2}} then {{P2}}');
    expect(session.scrubQuestion('Cash and UOB')).toBe('Cash and UOB');
  });

  it('shares a custom category token between a question and facts', () => {
    const session = new MaskingSession({ customCategories: ['Cat care'] });
    expect(session.scrubQuestion('Spend on cat care')).toContain('{{C1}}');
    expect(session.maskFacts({ category: 'Cat care' }).category).toBe('{{C1}}');
  });

  it('scrubs both user and assistant history', () => {
    const session = new MaskingSession({ accounts: ['DBS Savings'] });
    const history = [
      { role: 'user' as const, content: 'S$6,000 in DBS Savings' },
      { role: 'assistant' as const, content: 'Add SGD 2500 to DBS Savings' },
    ];
    const scrubbed = session.scrubHistory(history);
    expect(scrubbed.map((item) => item.role)).toEqual(['user', 'assistant']);
    for (const message of scrubbed) {
      expect(message.content).toMatch(/\{\{Q\d+\}\}/);
      expect(message.content).toContain('{{P1}}');
      expect(message.content).not.toContain('DBS Savings');
    }
    expect(scrubbed.map((item) => session.unmask(item.content))).toEqual(history.map((item) => item.content));
  });
});
