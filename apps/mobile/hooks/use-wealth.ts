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
  const { positions, snapshots, contributions } = useFireBuddy();
  // The payoff line's interest figure follows the user's currency and the hide-amounts switch.
  const { money } = usePrivacy();
  const today = useMemo(() => getDeviceDateKey(), []);

  return useMemo(() => {
    const summary = summariseWealth(positions, snapshots);
    const [year, month] = today.split('-').map(Number);
    const priorMonthEnd = getDeviceDateKey(new Date(year, month - 1, 0));
    const prior = summariseWealth(positions, snapshots, priorMonthEnd);
    // Only compare like with like: a change needs every active position valued at both dates.
    const monthlyChange = summary.active.length && !summary.missingValues && !prior.missingValues && prior.active.length === summary.active.length
      ? summary.netWorth - prior.netWorth
      : null;

    const view = (position: WealthPosition): PositionView => {
      const latest = summary.latest.get(position.id);
      const balance = latest ? Number(latest.amount) : null;
      const isLiability = position.positionKind === 'liability';
      return {
        position,
        isLiability,
        balance,
        valueDate: latest?.valueDate ?? null,
        tags: wealthPositionTags(position),
        payoff: isLiability ? describeDebtPayoff(position, balance, today, (value) => money(value, 0)) : null,
        repaid: isLiability ? debtRepaidShare(position, balance) : null,
        goal: isLiability ? describeDebtGoal(position, balance, today, (value) => money(value, 0)) : null,
      };
    };

    return {
      ...summary,
      today,
      monthlyChange,
      assetRows: summary.assets.map(view),
      liabilityRows: summary.liabilities.map(view),
      fiAssets: summary.assets.filter((item) => item.includeInFi),
      history: recentWealthHistory(snapshots, contributions, 10),
      positionName: (id: string) => positions.find((item) => item.id === id)?.name ?? 'Archived position',
    };
  }, [positions, snapshots, contributions, today, money]);
}
