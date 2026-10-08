import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { ApiError } from '@/lib/api-client';
import { connectDoudou, forgetDoudou } from '@/lib/ember-session';

/**
 * DouDou consent on the phone: one Off/On choice, off by default. Off means no account and no
 * network calls. On means the person read the consent text, an anonymous session exists, and the
 * backend profile holds `personalised`. The stored shape `{ preference, consentedAt }` predates
 * this; a `guide` value from an earlier build reads as off so the person consents again.
 * Kept outside the demo dataset keys so a data reset never silently re-enables AI.
 */
export const AI_PREFERENCE_STORAGE_KEY = 'firebuddy_mobile_ai_preference_v1';

/**
 * Plain-language consent text shown before DouDou turns on, one page per step, read in order with
 * Next. The decision buttons sit on the last page. Mirrors docs/PRIVACY.md.
 */
export const DOUDOU_CONSENT = {
  steps: [
    {
      key: "meet",
      title: "Hi, I'm DouDou!",
      body: "Ask DouDou questions about personal finance and get tips that fit your situation.",
    },
    {
      key: "stays",
      eyebrow: "Your privacy, in plain words",
      title: "Your money stays with you",
      body: "Your transactions and balances stay on your phone. We never keep a copy.",
    },
    {
      key: "ranges",
      title: "Only rough ranges",
      body: 'For personalised tips, DouDou only uses rough ranges, like "25k–50k", never your exact figures.',
    },
    {
      key: "answers",
      title: "How answers are made",
      body: "Your questions are sent to an AI service to give you an answer, and are never used to train AI.",
    },
    {
      key: "control",
      eyebrow: "You're in control",
      title: "Ready to turn on DouDou?",
      body: "You can turn DouDou off anytime.",
    },
  ],
  next: "Next",
  back: "Back",
  skip: "Skip",
  accept: "Agree",
  decline: "Decline",
  footnote: "You can always come back later.",
} as const;

export type DoudouConsentStepKey = (typeof DOUDOU_CONSENT.steps)[number]["key"];

type Stored = { preference: 'off' | 'personalised'; consentedAt: string | null; pendingDelete?: boolean };

interface AiPreferenceContextValue {
  enabled: boolean;
  /** When DouDou was turned on; null while off. */
  consentedAt: string | null;
  hydrated: boolean;
  status: 'idle' | 'working' | 'error';
  error: string | null;
  /** Creates the anonymous session and records consent. Resolves true when DouDou is on. */
  turnOn: () => Promise<boolean>;
  /** Stops AI at once, then deletes the anonymous user; retried on next launch if offline. */
  turnOff: () => Promise<void>;
}

const AiPreferenceContext = createContext<AiPreferenceContextValue | null>(null);

function persist(value: Stored) {
  return AsyncStorage.setItem(AI_PREFERENCE_STORAGE_KEY, JSON.stringify(value)).catch(() => undefined);
}

export function AiPreferenceProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  const [consentedAt, setConsentedAt] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [status, setStatus] = useState<'idle' | 'working' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const working = useRef(false);
  // The turn-off still in flight, so a quick turn-on waits for the old pass to be deleted rather than reusing it.
  const forgetting = useRef<Promise<void>>(Promise.resolve());

  /**
   * Delete the pass and clear the retry flag once it is gone; on failure the flag stays for next launch.
   * `markPending` first records the flag, for a fresh turn-off. Never rejects.
   */
  const finishForget = useCallback((markPending = false) => {
    const run = (async () => {
      if (markPending) await persist({ preference: 'off', consentedAt: null, pendingDelete: true });
      try {
        await forgetDoudou();
        await persist({ preference: 'off', consentedAt: null });
      } catch {
        // Keep pendingDelete; the next launch tries again.
      }
    })();
    forgetting.current = run;
    return run;
  }, []);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(AI_PREFERENCE_STORAGE_KEY)
      .then((raw) => {
        if (cancelled || !raw) return;
        const parsed = JSON.parse(raw) as { preference?: unknown; consentedAt?: unknown; pendingDelete?: unknown };
        if (parsed.preference === 'personalised') {
          setEnabled(true);
          setConsentedAt(typeof parsed.consentedAt === 'string' ? parsed.consentedAt : null);
        } else if (parsed.pendingDelete === true) {
          void finishForget();
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, [finishForget]);

  const turnOn = useCallback(async () => {
    if (working.current) return false;
    working.current = true;
    setStatus('working');
    setError(null);
    try {
      await forgetting.current;
      await connectDoudou();
      const stamp = new Date().toISOString();
      await persist({ preference: 'personalised', consentedAt: stamp });
      setEnabled(true);
      setConsentedAt(stamp);
      setStatus('idle');
      return true;
    } catch (caught) {
      // Fail closed: DouDou stays off on the phone, and the backend defaults to off as well.
      setError(caught instanceof ApiError ? caught.message : 'Could not turn on DouDou. Try again in a moment.');
      setStatus('error');
      return false;
    } finally {
      working.current = false;
    }
  }, []);

  const turnOff = useCallback(async () => {
    setEnabled(false);
    setConsentedAt(null);
    setError(null);
    setStatus('idle');
    await finishForget(true);
  }, [finishForget]);

  const value = useMemo<AiPreferenceContextValue>(
    () => ({ enabled, consentedAt, hydrated, status, error, turnOn, turnOff }),
    [enabled, consentedAt, hydrated, status, error, turnOn, turnOff],
  );
  return <AiPreferenceContext.Provider value={value}>{children}</AiPreferenceContext.Provider>;
}

export function useAiPreference() {
  const context = useContext(AiPreferenceContext);
  if (!context) {
    throw new Error('useAiPreference must be used within AiPreferenceProvider');
  }
  return context;
}
