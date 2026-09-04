import { beforeEach, describe, expect, it } from 'vitest';

import {
  ACCOUNTS_STORAGE_KEY,
  CATEGORIES_STORAGE_KEY,
  ESSENTIAL_CATEGORIES_STORAGE_KEY,
  FIRE_PROFILE_STORAGE_KEY,
  TRANSACTIONS_STORAGE_KEY,
  WEALTH_CONTRIBUTIONS_STORAGE_KEY,
  WEALTH_POSITIONS_STORAGE_KEY,
  WEALTH_SNAPSHOTS_STORAGE_KEY,
  clearDemoStorage,
} from './demoStorage';

describe('clearDemoStorage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('removes demo records without clearing session or preference storage', () => {
    window.localStorage.setItem(TRANSACTIONS_STORAGE_KEY, 'transactions');
    window.localStorage.setItem(CATEGORIES_STORAGE_KEY, 'categories');
    window.localStorage.setItem(ACCOUNTS_STORAGE_KEY, 'accounts');
    window.localStorage.setItem(WEALTH_POSITIONS_STORAGE_KEY, 'positions');
    window.localStorage.setItem(WEALTH_SNAPSHOTS_STORAGE_KEY, 'snapshots');
    window.localStorage.setItem(WEALTH_CONTRIBUTIONS_STORAGE_KEY, 'contributions');
    window.localStorage.setItem(FIRE_PROFILE_STORAGE_KEY, 'profile');
    window.localStorage.setItem(ESSENTIAL_CATEGORIES_STORAGE_KEY, 'categories');
    window.localStorage.setItem('firebuddy_web_theme', 'dark');
    window.localStorage.setItem('sb-project-auth-token', 'session');

    clearDemoStorage();

    expect(window.localStorage.getItem(TRANSACTIONS_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem(CATEGORIES_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem(ACCOUNTS_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem(WEALTH_POSITIONS_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem(WEALTH_SNAPSHOTS_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem(WEALTH_CONTRIBUTIONS_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem(FIRE_PROFILE_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem(ESSENTIAL_CATEGORIES_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem('firebuddy_web_theme')).toBe('dark');
    expect(window.localStorage.getItem('sb-project-auth-token')).toBe('session');
  });
});
