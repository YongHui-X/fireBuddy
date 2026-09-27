/** AsyncStorage keys for the local demo dataset. Versioned separately from the web keys because the record shapes differ. */
export const STORAGE_KEYS = {
  transactions: 'firebuddy_mobile_transactions_v1',
  categories: 'firebuddy_mobile_categories_v1',
  accounts: 'firebuddy_mobile_accounts_v1',
  tags: 'firebuddy_mobile_tags_v1',
} as const;

export const DEMO_STORAGE_KEYS = Object.values(STORAGE_KEYS);
