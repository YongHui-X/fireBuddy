import { checkAccountDeletion, type Account } from '@firebuddy/shared';
import { useCallback, useMemo } from 'react';

import { useFireBuddy } from '@/lib/fire-buddy-store';

/** Transaction counts per account and whether an account may be deleted. */
export function useAccountUsage() {
  const { accounts, transactions, recurringRules } = useFireBuddy();
  const usage = useMemo(() => {
    const counts = new Map<string, number>();
    for (const transaction of transactions) counts.set(transaction.accountId, (counts.get(transaction.accountId) ?? 0) + 1);
    return counts;
  }, [transactions]);

  /** Why an account cannot be deleted, or null when it can. Uses the same shared rule as the store, so the sheet never offers a delete the store refuses. */
  const deleteBlockedReason = useCallback((account: Account | null | undefined) => {
    if (!account) return null;
    const check = checkAccountDeletion(accounts, transactions, account.id, recurringRules.map((rule) => rule.template.accountId));
    return check.ok ? null : check.reason;
  }, [accounts, transactions, recurringRules]);

  return { usage, deleteBlockedReason };
}
