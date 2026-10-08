/** AsyncStorage keys for the local demo dataset. Versioned separately from the web keys because the record shapes differ. */
export const STORAGE_KEYS = {
  // v3 identifies the twelve-month demo ledger; seededOn now handles calendar refreshes.
  transactions: 'firebuddy_mobile_transactions_v3',
  seededOn: 'firebuddy_mobile_demo_seeded_on_v1',
  categories: 'firebuddy_mobile_categories_v1',
  accounts: 'firebuddy_mobile_accounts_v1',
  tags: 'firebuddy_mobile_tags_v1',
  // v2: demo balance sheet reseeded at about S$80,000 net worth on 2026-09-30.
  positions: 'firebuddy_mobile_wealth_positions_v2',
  snapshots: 'firebuddy_mobile_wealth_snapshots_v2',
  contributions: 'firebuddy_mobile_wealth_contributions_v2',
  // v3: demo plan reseeded for the S$80,000 saver (retire at 60, S$2,000 a month) on 2026-09-30.
  retirementPlan: 'firebuddy_mobile_retirement_plan_v3',
  essentialCategories: 'firebuddy_mobile_essential_categories_v1',
  recurringRules: 'firebuddy_mobile_recurring_rules_v1',
} as const;

export const DEMO_STORAGE_KEYS = Object.values(STORAGE_KEYS);
