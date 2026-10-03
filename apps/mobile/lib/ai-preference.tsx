import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AiPreference } from '@firebuddy/shared';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

/**
 * Kept outside the demo dataset keys so a data reset never silently re-enables AI. Until the
 * phone signs in, this device setting is the only gate; once it sends a JWT the backend
 * enforces the same level from the profile row.
 */
export const AI_PREFERENCE_STORAGE_KEY = 'firebuddy_mobile_ai_preference_v1';

const AI_PREFERENCES: readonly AiPreference[] = ['off', 'guide', 'personalised'];

/** What each level sends, in plain words; mirrors the web consent panel. */
export const AI_LEVEL_COPY: Record<AiPreference, { title: string; summary: string }> = {
  off: {
    title: 'Off',
    summary: 'Ember is switched off. Nothing is sent to the AI provider.',
  },
  guide: {
    title: 'Guide',
    summary: 'Your question goes to the AI provider with amounts and your account and position names removed, with curated Singapore finance sources. Your records are never included.',
  },
  personalised: {
    title: 'Personalised',
    summary: 'As Guide, plus a masked summary of your figures: every exact amount is replaced by a placeholder and a rough range before it leaves FireBuddy, and the real figures are restored in the answer. Transaction descriptions are never sent.',
  },
};

interface AiPreferenceContextValue {
  preference: AiPreference;
  /** When the level was last chosen; null while off. */
  consentedAt: string | null;
  hydrated: boolean;
  setPreference: (next: AiPreference) => void;
}

const AiPreferenceContext = createContext<AiPreferenceContextValue | null>(null);

function isPreference(value: unknown): value is AiPreference {
  return typeof value === 'string' && (AI_PREFERENCES as readonly string[]).includes(value);
}

/** Device-local AI consent: off until chosen, persisted with the time of the choice. */
export function AiPreferenceProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<AiPreference>('off');
  const [consentedAt, setConsentedAt] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(AI_PREFERENCE_STORAGE_KEY)
      .then((raw) => {
        if (cancelled || !raw) return;
        const parsed = JSON.parse(raw) as { preference?: unknown; consentedAt?: unknown };
        if (isPreference(parsed.preference)) {
          setPreferenceState(parsed.preference);
          setConsentedAt(typeof parsed.consentedAt === 'string' ? parsed.consentedAt : null);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setPreference = useCallback((next: AiPreference) => {
    const stamp = next === 'off' ? null : new Date().toISOString();
    setPreferenceState(next);
    setConsentedAt(stamp);
    AsyncStorage.setItem(AI_PREFERENCE_STORAGE_KEY, JSON.stringify({ preference: next, consentedAt: stamp })).catch(() => undefined);
  }, []);

  const value = useMemo<AiPreferenceContextValue>(() => ({ preference, consentedAt, hydrated, setPreference }), [preference, consentedAt, hydrated, setPreference]);
  return <AiPreferenceContext.Provider value={value}>{children}</AiPreferenceContext.Provider>;
}

export function useAiPreference() {
  const context = useContext(AiPreferenceContext);
  if (!context) {
    throw new Error('useAiPreference must be used within AiPreferenceProvider');
  }
  return context;
}
