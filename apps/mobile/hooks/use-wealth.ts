import {
  debtRepaidShare,
  describeDebtGoal,
  describeDebtPayoff,
  getDeviceDateKey,
  recentWealthHistory,
  summariseWealth,
  wealthPositionTags,
  type WealthPosition,
} from '@firebuddy/shared';
import { useMemo } from 'react';

import { useFireBuddy } from '@/lib/fire-buddy-store';
import { usePrivacy } from '@/lib/privacy';

/** Everything a position row needs, derived once per store change. */
export interface PositionView {
  position: WealthPosition;
  isLiability: boolean;
  /** Name of the account this balance follows, or null when it is entered by hand. */
  linkedAccountName: string | null;
  /** Latest recorded value, or null when none is dated yet. */
  balance: number | null;
  valueDate: string | null;
  tags: string[];
  payoff: ReturnType<typeof describeDebtPayoff> | null;
  repaid: number | null;
  /** The "pay it off by" line when the debt has a goal month. */
  goal: ReturnType<typeof describeDebtGoal>;
}

/** Memoised balance sheet over the store's positions and snapshots so screens stay presentational. */
export function useWealth() {
  // Balances read the linked values; the history list shows only balances the user entered.
  const { positions, balancePositions, snapshots, balanceSnapshots, contributions, accounts } = useFireBuddy();
  // The payoff line's interest figure follows the user's currency and the hide-amounts switch.
  const { money } = usePrivacy();
  const today = useMemo(() => getDeviceDateKey(), []);

  return useMemo(() => {
    // CPF switched off from "Counts toward FI" stays in total assets but leaves net worth.
    const cpfLeftOutOf = (sheet: ReturnType<typeof summariseWealth>) => sheet.assets
      .filter((item) => item.positionType === 'cpf' && !item.includeInFi)
      .reduce((sum, item) => sum + Number(sheet.latest.get(item.id)?.amount ?? 0), 0);
    const summary = summariseWealth(balancePositions, balanceSnapshots);
    const cpfLeftOut = cpfLeftOutOf(summary);
    const netWorth = summary.netWorth - cpfLeftOut;
    const [year, month] = today.split('-').map(Number);
    const priorMonthEnd = getDeviceDateKey(new Date(year, month - 1, 0));
    const prior = summariseWealth(balancePositions, balanceSnapshots, priorMonthEnd);
    // Only compare like with like: a change needs every active position valued at both dates.
    const monthlyChange = summary.active.length && !summary.missingValues && !prior.missingValues && prior.active.length === summary.active.length
      ? netWorth - (prior.netWorth - cpfLeftOutOf(prior))
      : null;

    const view = (position: WealthPosition): PositionView => {
      const latest = summary.latest.get(position.id);
      const balance = latest ? Number(latest.amount) : null;
      const isLiability = position.positionKind === 'liability';
      return {
        position,
        isLiability,
        linkedAccountName: position.linkedAccountId ? accounts.find((account) => account.id === position.linkedAccountId)?.name ?? null : null,
        balance,
        valueDate: latest?.valueDate ?? null,
        // On the phone a cash row tied to an account reads as an Account (PRD 6.4.1, 5b).
        tags: position.linkedAccountId ? ['Account', ...wealthPositionTags(position).slice(1)] : wealthPositionTags(position),
        payoff: isLiability ? describeDebtPayoff(position, balance, today, (value) => money(value, 0)) : null,
        repaid: isLiability ? debtRepaidShare(position, balance) : null,
        goal: isLiability ? describeDebtGoal(position, balance, today, (value) => money(value, 0)) : null,
      };
    };

    return {
      ...summary,
      netWorth,
      /** CPF value left out of net worth because it does not count toward FI. */
      cpfLeftOut,
      today,
      monthlyChange,
      assetRows: summary.assets.map(view),
      liabilityRows: summary.liabilities.map(view),
      fiAssets: summary.assets.filter((item) => item.includeInFi),
      history: recentWealthHistory(snapshots, contributions, 10),
      positionName: (id: string) => positions.find((item) => item.id === id)?.name ?? 'Archived position',
    };
  }, [positions, balancePositions, snapshots, balanceSnapshots, contributions, accounts, today, money]);
}
