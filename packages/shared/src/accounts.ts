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

/** An account name as people mean it: trimmed, inner spaces collapsed, case ignored. */
function nameKey(name: string) {
  return name.replace(/\s+/g, ' ').trim().toLowerCase();
}

/**
 * The account already called `name`, if any, so adding or renaming can warn "An account called
 * DBS already exists". Matching ignores case and extra spaces; `exceptId` skips the account being
 * renamed. A blank name matches nothing.
 */
export function findAccountNamed<T extends Pick<Account, 'id' | 'name'>>(accounts: readonly T[], name: string, exceptId?: string | null): T | undefined {
  const key = nameKey(name);
  if (!key) return undefined;
  return accounts.find((account) => account.id !== exceptId && nameKey(account.name) === key);
}

/**
 * Accounts to suggest while a name is typed in Wealth's Account form: names starting with what was
 * typed come first, then names containing it, ignoring case and extra spaces. A blank query
 * suggests nothing.
 */
export function suggestAccounts<T extends Pick<Account, 'id' | 'name'>>(accounts: readonly T[], query: string, limit = 4): T[] {
  const key = nameKey(query);
  if (!key) return [];
  const starts = accounts.filter((account) => nameKey(account.name).startsWith(key));
  const contains = accounts.filter((account) => !nameKey(account.name).startsWith(key) && nameKey(account.name).includes(key));
  return [...starts, ...contains].slice(0, limit);
}

export type AccountNameResolution<T> =
  | { kind: 'blank' }
  /** An existing account with this name, free to link. */
  | { kind: 'link'; account: T }
  /** An existing account with this name that another Wealth balance already follows. */
  | { kind: 'taken'; account: T }
  /** No account has this name yet: saving creates it. */
  | { kind: 'create'; name: string };

/**
 * What a name typed for a Wealth "Account" does (PRD 6.4.1, 5b): link to the account with that name
 * (ignoring case and extra spaces), report that a Wealth balance already follows it, or create a new
 * account with the cleaned-up name. `followedAccountIds` lists accounts other balances follow.
 */
export function resolveAccountName<T extends Pick<Account, 'id' | 'name'>>(
  accounts: readonly T[],
  name: string,
  followedAccountIds: readonly string[] = [],
): AccountNameResolution<T> {
  const cleaned = name.replace(/\s+/g, ' ').trim();
  if (!cleaned) return { kind: 'blank' };
  const account = findAccountNamed(accounts, cleaned);
  if (!account) return { kind: 'create', name: cleaned };
  return followedAccountIds.includes(account.id) ? { kind: 'taken', account } : { kind: 'link', account };
}
