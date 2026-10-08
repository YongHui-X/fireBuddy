import { getDeviceDateKey, pickDailyTip, type DailyTip } from '@firebuddy/shared';
import { useMemo } from 'react';

import { useTour } from '@/components/tour/TourProvider';
import { useFireBuddy } from '@/lib/fire-buddy-store';
import { useUserProfile } from '@/lib/user-profile';

/**
 * Today's DouDou tip for Home, or null when it should stay hidden: before the welcome and tour
 * are finished, while the tour runs, and after the user dismisses it for the day.
 */
export function useDailyTip(): { tip: DailyTip | null; dismiss: () => void } {
  const { transactions } = useFireBuddy();
  const { welcomedAt, tourDoneAt, tipDismissedOn, dismissTipToday } = useUserProfile();
  const { active } = useTour();
  const dateKey = getDeviceDateKey();
  const loggedToday = useMemo(() => transactions.some((transaction) => transaction.date === dateKey), [transactions, dateKey]);

  const hidden = !welcomedAt || !tourDoneAt || active || tipDismissedOn === dateKey;
  return {
    tip: hidden ? null : pickDailyTip({ dateKey, loggedToday }),
    dismiss: () => dismissTipToday(dateKey),
  };
}
