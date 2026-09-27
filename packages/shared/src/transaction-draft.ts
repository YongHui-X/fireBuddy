import { getDeviceDateKey } from './format';
import type { Account, Category, CreateTransactionInput, Transaction, TransactionType } from './types';

export interface TransactionDraft {
  transactionType: TransactionType;
  amount: string;
  description: string;
  date: string;
  accountId: string;
  categoryId: string;
  tagIds: string[];
}

export type TransactionDraftField = keyof TransactionDraft;
export type TransactionDraftErrors = Partial<Record<'amount' | 'date' | 'accountId' | 'categoryId', string>>;

interface CreateTransactionDraftOptions {
  accounts: readonly Account[];
  categories: readonly Category[];
  transactionType?: TransactionType;
  /** Pre-fill from an existing record (edit or duplicate). */
  from?: Transaction | null;
}

/** First category of the requested type, so switching type never leaves a stale category selected. */
export function firstCategoryIdForType(categories: readonly Category[], transactionType: TransactionType) {
  return categories.find((category) => category.categoryType === transactionType)?.id ?? '';
}

export function createTransactionDraft({ accounts, categories, transactionType = 'expense', from }: CreateTransactionDraftOptions): TransactionDraft {
  if (from) {
    return {
      transactionType: from.transactionType,
      amount: Math.abs(Number(from.amount)).toFixed(2),
      description: from.description,
      date: from.date,
      accountId: from.accountId,
      categoryId: from.categoryId ?? firstCategoryIdForType(categories, from.transactionType),
      tagIds: [...from.tagIds],
    };
  }

  const defaultAccount = accounts.find((account) => account.isDefault) ?? accounts[0];
  return {
    transactionType,
    amount: '',
    description: '',
    date: getDeviceDateKey(),
    accountId: defaultAccount?.id ?? '',
    categoryId: firstCategoryIdForType(categories, transactionType),
    tagIds: [],
  };
}

/** Keep only digits and a single decimal point, with at most two decimals. */
export function sanitizeAmountInput(text: string) {
  const cleaned = text.replace(/[^\d.]/g, '');
  const [whole, ...rest] = cleaned.split('.');
  if (rest.length === 0) return whole;
  return `${whole}.${rest.join('').slice(0, 2)}`;
}

export function validateTransactionDraft(draft: TransactionDraft): TransactionDraftErrors {
  const errors: TransactionDraftErrors = {};
  const amount = Number(draft.amount);

  if (!draft.amount.trim()) {
    errors.amount = 'Enter an amount.';
  } else if (Number.isNaN(amount) || amount <= 0) {
    errors.amount = 'Enter a valid amount above 0.';
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.date)) {
    errors.date = 'Choose a date.';
  }

  if (!draft.accountId) {
    errors.accountId = 'Select an account.';
  }

  if (!draft.categoryId) {
    errors.categoryId = 'Pick a category.';
  }

  return errors;
}

export function draftToCreateInput(draft: TransactionDraft, fallbackDescription?: string): CreateTransactionInput {
  const description = draft.description.trim();
  return {
    categoryId: draft.categoryId || null,
    accountId: draft.accountId,
    description: description || fallbackDescription || (draft.transactionType === 'income' ? 'Unnamed income' : 'Unnamed expense'),
    amount: Number(draft.amount).toFixed(2),
    date: draft.date,
    transactionType: draft.transactionType,
    tagIds: [...draft.tagIds],
  };
}

/** Build a client-side record for the local demo store. */
export function createLocalTransaction(input: CreateTransactionInput, userId: string, now = new Date()): Transaction {
  const timestamp = now.toISOString();
  return {
    id: `local-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    userId,
    ...input,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}
