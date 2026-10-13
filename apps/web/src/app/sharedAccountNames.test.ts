import { describe, expect, it } from 'vitest';
import { findAccountNamed } from '@firebuddy/shared';

const accounts = [
  { id: 'dbs', name: 'DBS Savings' },
  { id: 'ocbc', name: 'OCBC Account' },
];

describe('findAccountNamed', () => {
  it('finds names case-insensitively and with collapsed whitespace', () => {
    expect(findAccountNamed(accounts, 'dbs savings')).toBe(accounts[0]);
    expect(findAccountNamed(accounts, '  DBS   Savings ')).toBe(accounts[0]);
    expect(findAccountNamed(accounts, 'DBS SAVINGS')).toBe(accounts[0]);
  });

  it('returns undefined for blank names', () => {
    expect(findAccountNamed(accounts, '')).toBeUndefined();
    expect(findAccountNamed(accounts, '   ')).toBeUndefined();
  });

  it('skips exceptId while finding a different duplicate', () => {
    const duplicates = [
      { id: 'first', name: 'DBS Savings' },
      { id: 'second', name: 'DBS Savings' },
    ];
    expect(findAccountNamed(duplicates, 'dbs savings', 'first')).toBe(duplicates[1]);
  });

  it('does not match partial names', () => {
    expect(findAccountNamed(accounts, 'DBS')).toBeUndefined();
  });

  it('returns the first matching account', () => {
    const duplicates = [
      { id: 'first', name: 'DBS Savings' },
      { id: 'second', name: 'DBS Savings' },
    ];
    expect(findAccountNamed(duplicates, 'DBS Savings')).toBe(duplicates[0]);
  });
});
