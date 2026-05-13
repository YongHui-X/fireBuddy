export type WebViewId = 'home' | 'transactions' | 'categories' | 'profile';

export interface WebNavItem {
  id: WebViewId;
  label: string;
  eyebrow: string;
  blurb: string;
}

export interface CategorySummary {
  categoryId: string;
  name: string;
  color: string;
  emoji: string;
  transactionCount: number;
  totalAmount: number;
  lastTransactionDate: string | null;
}
