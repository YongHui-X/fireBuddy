import type { Account, Transaction } from './types';

export type AccountDeletionCheck =
  | { ok: true; usedBy: number; usedByRepeats: number; needsTarget: boolean; candidates: Account[] }
  | { ok: false; reason: string };

/**
 * Whether an account may be deleted and what must happen first. An account that transactions or
 * repeating rules use (`ruleAccountIds`, one entry per rule), or the default account, needs another
 * account to take over (`needsTarget`); the last account left can never go, because every
 * transaction needs somewhere to live.
 */
export function checkAccountDeletion(
  accounts: readonly Account[],
  transactions: readonly Pick<Transaction, 'accountId'>[],
  id: string,
  ruleAccountIds: readonly string[] = [],
): AccountDeletionCheck {
  const account = accounts.find((item) => item.id === id);
  if (!account) return { ok: false, reason: 'This account no longer exists.' };
  const candidates = accounts.filter((item) => item.id !== id);
  if (candidates.length === 0) return { ok: false, reason: 'Keep at least one account. Add another one first, then delete this.' };
  const usedBy = transactions.filter((transaction) => transaction.accountId === id).length;
  const usedByRepeats = ruleAccountIds.filter((accountId) => accountId === id).length;
  return { ok: true, usedBy, usedByRepeats, needsTarget: usedBy > 0 || usedByRepeats > 0 || account.isDefault, candidates };
}

export interface AccountDeletionResult<T extends Pick<Transaction, 'accountId'>> {
  accounts: Account[];
  transactions: T[];
}

/**
 * Delete an account, moving its transactions (and the default flag, if it had it) to `moveTo`.
 * Returns null when the deletion is not allowed or `moveTo` is missing or invalid while needed,
 * so callers never half-apply it. `now` stamps the rows that change.
 */
export function deleteAccountMoving<T extends Pick<Transaction, 'accountId'> & { updatedAt?: string }>(
  accounts: readonly Account[],
  transactions: readonly T[],
  id: string,
  moveTo: string | null | undefined,
  now: string,
  ruleAccountIds: readonly string[] = [],
): AccountDeletionResult<T> | null {
  const check = checkAccountDeletion(accounts, transactions, id, ruleAccountIds);
  if (!check.ok) return null;
  const target = moveTo ? check.candidates.find((item) => item.id === moveTo) : undefined;
  if (check.needsTarget && !target) return null;
  const wasDefault = accounts.find((item) => item.id === id)?.isDefault ?? false;
  const nextAccounts = accounts
    .filter((item) => item.id !== id)
    .map((item) => (wasDefault && target && item.id === target.id ? { ...item, isDefault: true, updatedAt: now } : item));
  const nextTransactions = target
    ? transactions.map((transaction) => (transaction.accountId === id ? { ...transaction, accountId: target.id, updatedAt: now } : transaction))
    : [...transactions];
  return { accounts: nextAccounts, transactions: nextTransactions };
}
