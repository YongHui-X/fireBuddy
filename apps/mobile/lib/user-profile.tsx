import AsyncStorage from '@react-native-async-storage/async-storage';
import { currencyForCountry, findCountry, isSingapore, LEGAL_VERSION, normaliseNickname } from '@firebuddy/shared';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

/**
 * Kept outside the demo dataset keys so Reset data keeps the name and does not replay the welcome.
 * The nickname never leaves the phone: nothing in the Ember snapshot or backup reads this key.
 */
export const USER_PROFILE_STORAGE_KEY = 'firebuddy_mobile_profile_v1';

export interface StoredUserProfile {
  /** What DouDou calls the user on Home; null when they skipped the question. */
  nickname: string | null;
  /** ISO time the welcome screen was finished (named or skipped); null shows the welcome. */
  welcomedAt: string | null;
  /** ISO time the spotlight tour was finished or skipped. */
  tourDoneAt: string | null;
  /** Local YYYY-MM-DD the daily tip was dismissed on, so it stays hidden for the rest of that day. */
  tipDismissedOn: string | null;
  /** True once the user turns DouDou's daily tips off; Profile turns them back on. */
  tipsOff: boolean;
  /** ISO country code from the welcome; null (older installs) counts as Singapore. */
  country: string | null;
  /** ISO currency every amount is shown in; null means the country's usual currency. */
  currency: string | null;
  /** The 9pm logging reminder: true on, false declined or turned off, null never asked. */
  reminderOn: boolean | null;
  /** `LEGAL_VERSION` of the terms and privacy policy the user last agreed to; null before the terms existed. */
  legalAcceptedVersion: string | null;
  /** ISO time of that agreement, kept on the phone as the record of acceptance. */
  legalAcceptedAt: string | null;
  /** ISO time the one-time Wealth tip ("Assets include all your accounts") was dismissed. */
  wealthTipSeenAt: string | null;
}

const EMPTY_PROFILE: StoredUserProfile = { nickname: null, welcomedAt: null, tourDoneAt: null, tipDismissedOn: null, tipsOff: false, country: null, currency: null, reminderOn: null, legalAcceptedVersion: null, legalAcceptedAt: null, wealthTipSeenAt: null };

interface UserProfileContextValue extends StoredUserProfile {
  /** True once the stored profile has been read; the launch screen waits for it so the welcome never flashes for a returning user. */
  hydrated: boolean;
  setNickname: (raw: string | null) => void;
  completeWelcome: (raw: string | null) => void;
  completeTour: () => void;
  resetTour: () => void;
  dismissTipToday: (dateKey: string) => void;
  /** Country and currency from the welcome or Profile. */
  setRegion: (country: string, currency: string) => void;
  setReminderOn: (on: boolean) => void;
  /** Turn DouDou's daily tips on Home on or off for good. */
  setTipsOn: (on: boolean) => void;
  /** Dismiss the one-time Wealth tip for good. */
  markWealthTipSeen: () => void;
  /** Agree to the current terms and privacy policy (the updated-terms notice). */
  acceptLegal: () => void;
  /** Forget the name and first-run flags, so the welcome and tour play again ("Start fresh"). */
  resetProfile: () => void;
}

const UserProfileContext = createContext<UserProfileContextValue | null>(null);

/** Reads a stored profile defensively, so a corrupt or older value falls back to a fresh one. */
function parseStored(raw: string | null): StoredUserProfile {
  if (!raw) return EMPTY_PROFILE;
  try {
    const parsed = JSON.parse(raw) as Partial<StoredUserProfile>;
    const text = (value: unknown) => (typeof value === 'string' && value ? value : null);
    return {
      nickname: normaliseNickname(text(parsed.nickname)),
      welcomedAt: text(parsed.welcomedAt),
      tourDoneAt: text(parsed.tourDoneAt),
      tipDismissedOn: text(parsed.tipDismissedOn),
      tipsOff: parsed.tipsOff === true,
      // Only known codes survive, so a corrupt value falls back to Singapore rather than a blank mode.
      country: findCountry(text(parsed.country)) ? text(parsed.country) : null,
      currency: text(parsed.currency)?.toUpperCase() ?? null,
      reminderOn: typeof parsed.reminderOn === 'boolean' ? parsed.reminderOn : null,
      legalAcceptedVersion: text(parsed.legalAcceptedVersion),
      legalAcceptedAt: text(parsed.legalAcceptedAt),
      wealthTipSeenAt: text(parsed.wealthTipSeenAt),
    };
  } catch {
    return EMPTY_PROFILE;
  }
}

/**
 * The user's on-device profile: the nickname from "How should we address you?" plus first-run
 * flags for the welcome, the tour and the daily tip. One AsyncStorage key, written on every change.
 */
export function UserProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<StoredUserProfile>(EMPTY_PROFILE);
  const [hydrated, setHydrated] = useState(false);
  // Latest value for the updaters, so each write builds on the newest state without a stale closure.
  const latest = useRef(profile);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(USER_PROFILE_STORAGE_KEY)
      .then((stored) => {
        if (cancelled) return;
        const next = parseStored(stored);
        latest.current = next;
        setProfile(next);
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
  const update = useCallback((patch: Partial<StoredUserProfile>) => {
    const next = { ...latest.current, ...patch };
    latest.current = next;
    setProfile(next);
    AsyncStorage.setItem(USER_PROFILE_STORAGE_KEY, JSON.stringify(next)).catch(() => undefined);
  }, []);

  const setNickname = useCallback((raw: string | null) => update({ nickname: normaliseNickname(raw) }), [update]);
  const completeWelcome = useCallback(
    // Finishing the welcome is the agreement its "By continuing" line describes.
    (raw: string | null) => {
      const now = new Date().toISOString();
      update({ nickname: normaliseNickname(raw), welcomedAt: now, legalAcceptedVersion: LEGAL_VERSION, legalAcceptedAt: now });
    },
    [update],
  );
  const completeTour = useCallback(() => update({ tourDoneAt: new Date().toISOString() }), [update]);
  const resetTour = useCallback(() => update({ tourDoneAt: null }), [update]);
  const dismissTipToday = useCallback((dateKey: string) => update({ tipDismissedOn: dateKey }), [update]);
  const setRegion = useCallback((country: string, currency: string) => update({ country: country.toUpperCase(), currency: currency.toUpperCase() }), [update]);
  const setReminderOn = useCallback((on: boolean) => update({ reminderOn: on }), [update]);
  const setTipsOn = useCallback((on: boolean) => update({ tipsOff: !on }), [update]);
  const acceptLegal = useCallback(() => update({ legalAcceptedVersion: LEGAL_VERSION, legalAcceptedAt: new Date().toISOString() }), [update]);
  const markWealthTipSeen = useCallback(() => update({ wealthTipSeenAt: new Date().toISOString() }), [update]);
  const resetProfile = useCallback(() => update(EMPTY_PROFILE), [update]);

  const value = useMemo<UserProfileContextValue>(
    () => ({ ...profile, hydrated, setNickname, completeWelcome, completeTour, resetTour, dismissTipToday, setRegion, setReminderOn, setTipsOn, markWealthTipSeen, acceptLegal, resetProfile }),
    [profile, hydrated, setNickname, completeWelcome, completeTour, resetTour, dismissTipToday, setRegion, setReminderOn, setTipsOn, markWealthTipSeen, acceptLegal, resetProfile],
  );
  return <UserProfileContext.Provider value={value}>{children}</UserProfileContext.Provider>;
}

export function useUserProfile() {
  const context = useContext(UserProfileContext);
  if (!context) {
    throw new Error('useUserProfile must be used within UserProfileProvider');
  }
  return context;
}

export interface Region {
  /** ISO country code; Singapore when the user never chose one. */
  country: string;
  /** ISO currency every amount is shown and typed in. */
  currency: string;
  /** Singapore gets CPF, SRS, HDB, CPF LIFE and Singapore DouDou; everyone else the general mode. */
  isSingapore: boolean;
}

/** The user's country, currency and which mode of the app fits them. */
export function useRegion(): Region {
  const { country, currency } = useUserProfile();
  return useMemo(() => ({
    country: (country ?? 'SG').toUpperCase(),
    currency: currency ?? currencyForCountry(country),
    isSingapore: isSingapore(country),
  }), [country, currency]);
}
