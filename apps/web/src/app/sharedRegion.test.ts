import { describe, expect, it } from 'vitest';
import {
  CURRENCIES,
  COUNTRIES,
  MaskingSession,
  currencyForCountry,
  findCountry,
  formatMoney,
  initialDataset,
  isSingapore,
  searchCountries,
} from '@firebuddy/shared';

describe('shared region helpers', () => {
  it('selects the initial dataset for stored and new installations', () => {
    expect(initialDataset({ hasStoredRecords: true, isDev: true })).toBe('stored');
    expect(initialDataset({ hasStoredRecords: true, isDev: false })).toBe('stored');
    expect(initialDataset({ hasStoredRecords: false, isDev: true })).toBe('demo');
    expect(initialDataset({ hasStoredRecords: false, isDev: false })).toBe('fresh');
  });

  it.each([
    [null, true],
    [undefined, true],
    ['', true],
    ['SG', true],
    ['sg', true],
    ['MY', false],
    ['US', false],
  ] as const)('isSingapore(%s) is %s', (country, expected) => {
    expect(isSingapore(country)).toBe(expected);
  });

  it.each([
    ['SG', 'SGD'],
    ['MY', 'MYR'],
    ['de', 'EUR'],
    ['JP', 'JPY'],
    ['ZZ', 'SGD'],
    [null, 'SGD'],
  ] as const)('currencyForCountry(%s) is %s', (country, expected) => {
    expect(currencyForCountry(country)).toBe(expected);
  });

  it('finds countries case-insensitively and returns undefined for an unknown code', () => {
    expect(findCountry('zz')).toBeUndefined();
  });

  it('searches country names, codes and accents with Singapore first for an empty query', () => {
    expect(searchCountries('')[0].name).toBe('Singapore');
    expect(searchCountries('').length).toBe(COUNTRIES.length);
    expect(searchCountries('united').map((country) => country.name)).toEqual([
      'United Arab Emirates',
      'United Kingdom',
      'United States',
    ]);
    expect(searchCountries('us')[0].name).toBe('United States');
    expect(searchCountries('viet').map((country) => country.name)).toEqual(['Vietnam']);
  });

  it.each([
    [5200, 'SGD', undefined, 'S$5,200.00'],
    [5200, 'USD', 0, 'US$5,200'],
    [1234.5, 'EUR', undefined, '€1,234.50'],
    [1234.5, 'JPY', 2, '¥1,235'],
    [-80, 'MYR', undefined, 'RM80.00'],
    [1200, 'KHR', undefined, 'KHR 1,200'],
    [Number.NaN, 'SGD', undefined, 'S$0.00'],
    [Number.POSITIVE_INFINITY, 'SGD', undefined, 'S$0.00'],
  ] as const)('formats %s in %s', (value, currency, digits, expected) => {
    expect(digits === undefined ? formatMoney(value, currency) : formatMoney(value, currency, digits)).toBe(expected);
  });

  it('keeps CURRENCIES unique and puts SGD first', () => {
    expect(CURRENCIES[0]).toBe('SGD');
    expect(new Set(CURRENCIES).size).toBe(CURRENCIES.length);
  });

  it('restores masked money in the requested currency', () => {
    const euro = new MaskingSession({}, { wholeDollars: true, currency: 'EUR' });
    expect(euro.maskFacts({ netWorth: '75000' }).netWorth).toMatch(/^\{\{M1\}\}/);
    expect(euro.unmaskFinal('Your net worth is {{M1}}.')).toBe('Your net worth is €75,000.');

    const yen = new MaskingSession({}, { wholeDollars: true, currency: 'JPY' });
    yen.maskFacts({ netWorth: '1234.56' });
    expect(yen.unmaskFinal('Your net worth is {{M1}}.')).toBe('Your net worth is ¥1,235.');

    const singapore = new MaskingSession({}, { wholeDollars: true });
    singapore.maskFacts({ netWorth: '75000' });
    expect(singapore.unmaskFinal('Your net worth is {{M1}}.')).toBe('Your net worth is S$75,000.');
  });

  it('scrubs amounts written in other currencies from questions', () => {
    const session = new MaskingSession();
    const cases = [
      ['I have €12,500 saved', '12,500'],
      ['I earn RM 4,200 a month', '4,200'],
      ['rent is £1,450', '1,450'],
      ['about ¥300000 in cash', '300000'],
      ['US$2,000 bonus', '2,000'],
      ['Rp 5000000', '5000000'],
    ] as const;

    for (const [question, digits] of cases) {
      expect(session.scrubQuestion(question)).not.toContain(digits);
    }
  });
});
