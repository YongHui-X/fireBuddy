import { describe, expect, it } from 'vitest';
import { resolveAccountName, suggestAccounts } from '@firebuddy/shared';

const accounts = [
  { id: 'a', name: 'DBS Savings' },
  { id: 'b', name: 'OCBC 360' },
  { id: 'c', name: 'Cash' },
  { id: 'd', name: 'My DBS card' },
];

describe('suggestAccounts', () => {
  it('puts prefix matches before containing matches', () => {
    expect(suggestAccounts(accounts, 'dbs').map((account) => account.id)).toEqual(['a', 'd']);
  });

  it('matches trimmed names', () => {
    expect(suggestAccounts(accounts, '  Cash ').map((account) => account.id)).toEqual(['c']);
  });

  it.each(['', '   '])('returns no suggestions for a blank query %j', (query) => {
    expect(suggestAccounts(accounts, query)).toEqual([]);
  });

  it('respects the result limit', () => {
    expect(suggestAccounts(accounts, 'dbs', 1).map((account) => account.id)).toEqual(['a']);
  });

  it('returns no suggestions when nothing matches', () => {
    expect(suggestAccounts(accounts, 'Maybank')).toEqual([]);
  });

  it('matches case-insensitively', () => {
    expect(suggestAccounts(accounts, 'dBs').map((account) => account.id)).toEqual(['a', 'd']);
  });
});

describe('resolveAccountName', () => {
  it.each(['', '   '])('returns blank for %j', (name) => {
    expect(resolveAccountName(accounts, name)).toEqual({ kind: 'blank' });
  });

  it('links an exact existing name ignoring case', () => {
    expect(resolveAccountName(accounts, 'dbs savings')).toEqual({ kind: 'link', account: accounts[0] });
  });

  it('links an exact existing name ignoring repeated spaces', () => {
    expect(resolveAccountName(accounts, 'DBS  SAVINGS')).toEqual({ kind: 'link', account: accounts[0] });
  });

  it('reports an already followed account as taken', () => {
    expect(resolveAccountName(accounts, 'dbs savings', ['a'])).toEqual({ kind: 'taken', account: accounts[0] });
  });

  it('creates a new account for an unknown name', () => {
    expect(resolveAccountName(accounts, 'Maybank')).toEqual({ kind: 'create', name: 'Maybank' });
  });

  it('normalises whitespace when creating an account', () => {
    expect(resolveAccountName(accounts, '  New   Bank ')).toEqual({ kind: 'create', name: 'New Bank' });
  });

  it('does not partially link an existing account', () => {
    expect(resolveAccountName(accounts, 'DBS')).toEqual({ kind: 'create', name: 'DBS' });
  });
});
