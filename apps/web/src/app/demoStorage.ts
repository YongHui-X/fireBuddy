export const TRANSACTIONS_STORAGE_KEY = 'firebuddy_web_transactions_v3';
export const CATEGORIES_STORAGE_KEY = 'firebuddy_web_categories_v3';
export const ACCOUNTS_STORAGE_KEY = 'firebuddy_web_accounts_v2';
export const WEALTH_POSITIONS_STORAGE_KEY = 'firebuddy_web_wealth_positions_v1';
export const WEALTH_SNAPSHOTS_STORAGE_KEY = 'firebuddy_web_wealth_snapshots_v1';
export const WEALTH_CONTRIBUTIONS_STORAGE_KEY = 'firebuddy_web_wealth_contributions_v1';
export const FIRE_PROFILE_STORAGE_KEY = 'firebuddy_web_fire_profile_v1';
export const ESSENTIAL_CATEGORIES_STORAGE_KEY = 'firebuddy_web_essential_categories_v1';

/** Remove FireBuddy demo records without touching Supabase session storage or theme choice. */
export function clearDemoStorage(storage: Pick<Storage, 'removeItem'> = window.localStorage) {
  storage.removeItem(TRANSACTIONS_STORAGE_KEY);
  storage.removeItem(CATEGORIES_STORAGE_KEY);
  storage.removeItem(ACCOUNTS_STORAGE_KEY);
  storage.removeItem(WEALTH_POSITIONS_STORAGE_KEY);
  storage.removeItem(WEALTH_SNAPSHOTS_STORAGE_KEY);
  storage.removeItem(WEALTH_CONTRIBUTIONS_STORAGE_KEY);
  storage.removeItem(FIRE_PROFILE_STORAGE_KEY);
  storage.removeItem(ESSENTIAL_CATEGORIES_STORAGE_KEY);
}
