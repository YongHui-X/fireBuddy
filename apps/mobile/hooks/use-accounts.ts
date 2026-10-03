import type { Account } from '@firebuddy/shared';
import { useCallback, useMemo } from 'react';

import { useFireBuddy } from '@/lib/fire-buddy-store';

/** Transaction counts per account and the one rule that decides whether an account may be deleted. */
export function useAccountUsage() {
  const { transactions } = useFireBuddy();
  const usage = useMemo(() => {
    const counts = new Map<string, number>();
    for (const transaction of transactions) counts.set(transaction.accountId, (counts.get(transaction.accountId) ?? 0) + 1);
    return counts;
  }, [transactions]);

  /** Why an account cannot be deleted, or null when it can. Mirrors the store guard so the sheet never offers a delete the store refuses. */
  const deleteBlockedReason = useCallback((account: Account | null | undefined) => {
    if (!account) return null;
    if (account.isDefault) return 'The default account can be edited but not deleted.';
    const count = usage.get(account.id) ?? 0;
    if (count > 0) return `Used by ${count} transaction${count === 1 ? '' : 's'}, so it cannot be deleted. Move or delete those first.`;
    return null;
  }, [usage]);

  return { usage, deleteBlockedReason };
}
