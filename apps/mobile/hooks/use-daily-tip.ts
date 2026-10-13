import { getDeviceDateKey, pickDailyTip, type DailyTip } from '@firebuddy/shared';
import { useMemo } from 'react';

import { useTour } from '@/components/tour/TourProvider';
import { useFireBuddy } from '@/lib/fire-buddy-store';
import { useUserProfile } from '@/lib/user-profile';

/**
 * Today's DouDou tip for Home, or null when it should stay hidden: before the welcome and tour
 * are finished, while the tour runs, after the user dismisses it for the day, and for good once
 * tips are turned off (on the tip itself or in Profile).
 */
export function useDailyTip(): { tip: DailyTip | null; dismiss: () => void; turnOff: () => void } {
  const { transactions } = useFireBuddy();
  const { welcomedAt, tourDoneAt, tipDismissedOn, tipsOff, dismissTipToday, setTipsOn } = useUserProfile();
  const { active } = useTour();
  const dateKey = getDeviceDateKey();
  const loggedToday = useMemo(() => transactions.some((transaction) => transaction.date === dateKey), [transactions, dateKey]);

  const hidden = tipsOff || !welcomedAt || !tourDoneAt || active || tipDismissedOn === dateKey;
  return {
    tip: hidden ? null : pickDailyTip({ dateKey, loggedToday }),
    dismiss: () => dismissTipToday(dateKey),
    turnOff: () => setTipsOn(false),
  };
}
