import AsyncStorage from '@react-native-async-storage/async-storage';
import { currencyPrefix, formatMoney } from '@firebuddy/shared';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { useRegion } from './user-profile';

/** Kept outside the demo dataset keys so resetting the data does not reveal amounts again. */
export const PRIVACY_STORAGE_KEY = 'firebuddy_mobile_hide_amounts_v1';

/** What a masked figure renders as, so hidden amounts stay the same width everywhere. */
export function maskedAmount(currency = 'SGD') {
  return `${currencyPrefix(currency).trim()} ••••`;
}
export const MASKED_AMOUNT = maskedAmount();
/** Ratios derived from amounts (savings rate, funded share) are masked too, or they leak the trend. */
export const MASKED_PERCENT = '••%';

interface PrivacyContextValue {
  /** True while amounts are hidden across the whole app. */
  hidden: boolean;
  /** True once the stored choice has been read; the splash stays up until then so real figures never flash. */
  hydrated: boolean;
  toggle: () => void;
  /** The user's currency (from the welcome or Profile), for labels such as "Amount (SGD)". */
  currency: string;
  /** Drop-in for `formatSGD` in the user's currency that renders the mask while amounts are hidden. */
  money: (value: number | string, digits?: number) => string;
  /** A 0-1 ratio as a percentage string, masked while amounts are hidden. */
  percent: (ratio: number, digits?: number) => string;
}

const PrivacyContext = createContext<PrivacyContextValue | null>(null);

/**
 * One switch, toggled from the eye on the Home net-worth hero, that hides every money figure in
 * the app. Screens format amounts through `money` from `usePrivacy` instead of calling
 * `formatSGD` directly so the mask applies to all of them at once. The choice persists across
 * restarts.
 */
export function PrivacyProvider({ children }: { children: ReactNode }) {
  const [hidden, setHidden] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(PRIVACY_STORAGE_KEY)
      .then((stored) => {
        if (!cancelled && stored === 'true') setHidden(true);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist outside the state updater, which React expects to be pure.
  const toggle = useCallback(() => {
    const next = !hidden;
    setHidden(next);
    AsyncStorage.setItem(PRIVACY_STORAGE_KEY, String(next)).catch(() => undefined);
  }, [hidden]);

  const { currency } = useRegion();
  const money = useCallback((value: number | string, digits = 2) => (hidden ? maskedAmount(currency) : formatMoney(value, currency, digits)), [hidden, currency]);
  const percent = useCallback((ratio: number, digits = 0) => (hidden ? MASKED_PERCENT : `${(ratio * 100).toFixed(digits)}%`), [hidden]);

  const value = useMemo<PrivacyContextValue>(() => ({ hidden, hydrated, toggle, currency, money, percent }), [hidden, hydrated, toggle, currency, money, percent]);
  return <PrivacyContext.Provider value={value}>{children}</PrivacyContext.Provider>;
}

export function usePrivacy() {
  const context = useContext(PrivacyContext);
  if (!context) {
    throw new Error('usePrivacy must be used within PrivacyProvider');
  }
  return context;
}
