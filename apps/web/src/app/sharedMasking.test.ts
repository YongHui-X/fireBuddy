import { describe, expect, it } from 'vitest';
import { MaskingSession, formatMaskedMoney, moneyBand, monthsBand, percentBand } from '@firebuddy/shared';

describe('shared masking', () => {
  it.each([
    ['is represented by the debtToIncome ratio of 31.7%', 'is 31.7%'],
    ['17.1 months, which is over 12 months.', '17.1 months.'],
    ['This is represented by a pie chart.', 'This is represented by a pie chart.'],
    ['Your spending is S$517 (under 1k).', 'Your spending is S$517.'],
    ['Your net worth is S$75,000, which falls within the range of 50k-100k.', 'Your net worth is S$75,000.'],
    ['The range for your net worth is 50k-100k.', ''],
    ['- This total falls within the range of 1k to 5k.', ''],
    ['17.1 months (over 12 months)', '17.1 months'],
    ['MoneySense suggests 3 to 6 months of expenses', 'MoneySense suggests 3 to 6 months of expenses'],
    ['MoneySense suggests 3-6 months of expenses', 'MoneySense suggests 3-6 months of expenses'],
    ['Consider a range of options.', 'Consider a range of options.'],
    ['Your net worth is S$75,000, which falls within the range of 50k–100k.', 'Your net worth is S$75,000.'],
    ['Your net worth is S$75,000, which is in the 50k-100k bracket.', 'Your net worth is S$75,000.'],
    ['Your net worth is S$75,000, which falls between 50k and 100k.', 'Your net worth is S$75,000.'],
    ['Your spending is S$517 (1k–5k).', 'Your spending is S$517.'],
    ['Aim for between 50k and 100k in savings.', 'Aim for between 50k and 100k in savings.'],
  ])('cleans finished answers without removing guidance: %s', (input, expected) => {
    expect(new MaskingSession().unmaskFinal(input)).toBe(expected);
  });

  it('preserves the real figure when a band sentence also contains a restored token', () => {
    const session = new MaskingSession({}, { wholeDollars: true });
    session.maskFacts({ netWorth: '75000' });
    const answer = session.unmaskFinal('Your net worth is {{M1}} and the range is 50k-100k.');
    expect(answer).toContain('S$75,000');
    expect(answer).not.toContain('50k-100k');
  });

  it('formats money as whole dollars when requested', () => {
    expect(formatMaskedMoney(516.85, 0)).toBe('S$517');
  });

  it('formats money with cents by default', () => {
    expect(formatMaskedMoney(1240.71)).toBe('S$1,240.71');
  });

  it('omits the minus sign when whole dollars round to zero', () => {
    expect(formatMaskedMoney(-0.4, 0)).toBe('S$0');
  });

  it('restores money tokens as whole dollars when the session requests it', () => {
    const session = new MaskingSession({}, { wholeDollars: true });
    const facts = session.maskFacts({ amount: '516.85' });
    expect(facts.amount).toBe('{{M1}} (range: under 1k)');
    expect(session.unmask(facts.amount)).toBe('S$517');
    expect(session.unmask('{{M1}}')).toBe('S$517');
  });

  it('removes a stray range after intervening sentence text', () => {
    const session = new MaskingSession();
    expect(session.maskFacts({ amount: '1240.71' }).amount).toBe('{{M1}} (range: 1k-5k)');
    const restored = session.unmask('You spent {{M1}} this month (range: 1k-5k).');
    expect(restored).not.toContain('(range');
    expect(restored).toBe('You spent S$1,240.71 this month.');
  });

  it('removes a range directly after its money token', () => {
    const session = new MaskingSession();
    expect(session.maskFacts({ amount: '1240.71' }).amount).toBe('{{M1}} (range: 1k-5k)');
    expect(session.unmask('You spent {{M1}} (range: 1k-5k) this month.')).toBe('You spent S$1,240.71 this month.');
  });

  it('holds back unfinished tokens and bands while unmasking partial text', () => {
    const session = new MaskingSession({}, { wholeDollars: true });
    const facts = session.maskFacts({ amount: '1176.00' });
    expect(facts.amount).toBe('{{M1}} (range: 1k-5k)');
    expect(session.unmaskPartial('You spent {{M')).toBe('You spent ');
    expect(session.unmaskPartial('You spent {{M1}} (range: 1k')).toMatch(/^You spent S\$1,176\s*$/);
    expect(session.unmaskPartial('You spent {{M1}} (range: 1k-5k)')).toBe(session.unmask('You spent {{M1}} (range: 1k-5k)'));
  });

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
