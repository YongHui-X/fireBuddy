import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildPersonalSnapshot, MaskingSession, MAX_MASKED_CONTEXT_CHARS, type RagAnswerMode, type RagChatMessage, type RagChatRequest, type RagChatSource, type RagDataEvidence } from '@firebuddy/shared';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAiPreference } from '@/lib/ai-preference';
import { useFireBuddy } from '@/lib/fire-buddy-store';
import { askEmber, EmberRequestError, getEmberAvailability, MAX_EMBER_QUESTION_LENGTH } from '@/lib/ember-api';

/** Kept apart from the demo dataset keys: resetting demo data should not wipe a conversation. */
export const EMBER_TRANSCRIPT_KEY = 'firebuddy_mobile_ember_transcript_v1';

export interface EmberMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  status: 'pending' | 'done' | 'error';
  error?: string;
  retryable?: boolean;
  sources?: RagChatSource[];
  mode?: RagAnswerMode;
  evidence?: RagDataEvidence;
  createdAt: string;
}

/** Guided openers, the same questions the web Ember route offers on an empty transcript. */
export const EMBER_STARTERS = [
  { title: 'Review my spending', description: 'Summarise this month and identify the largest categories.', question: 'How much have I spent this month, and which categories are highest?' },
  { title: 'Check my FIRE timeline', description: 'Explain the projection from your saved FireBuddy assumptions.', question: 'How long more to FIRE based on my current FireBuddy data?' },
  { title: 'Understand CPF rates', description: 'How contribution rates work and what changes by age.', question: 'What are the CPF contribution rates for 2026, and how do they vary by age?' },
  { title: 'Compare retirement sums', description: 'The role of the Basic, Full and Enhanced Retirement Sums.', question: 'How do the Basic, Full, and Enhanced Retirement Sums differ?' },
  { title: 'Review Savings Bonds', description: 'How Singapore Savings Bonds work and what to compare.', question: 'How do Singapore Savings Bonds work, and what should I understand before applying?' },
  { title: 'Size my emergency fund', description: 'Compare your reserves with MoneySense guidance.', question: 'Is my emergency fund large enough compared with MoneySense guidance?' },
] as const;

function newId() {
  return `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

/**
 * Transcript state for Ember: sends one question at a time, keeps the last answers on the device,
 * and exposes retry for a failed turn. Starter questions never submit themselves; the screen only
 * sends when the person taps Send.
 */
export function useEmber() {
  const [messages, setMessages] = useState<EmberMessage[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [draft, setDraft] = useState('');
  const abortRef = useRef<AbortController | null>(null);
  const { preference: aiPreference, setPreference: setAiPreference } = useAiPreference();
  const store = useFireBuddy();
  const availability = useMemo(() => getEmberAvailability(), []);
  const aiOff = aiPreference === 'off';

  /**
   * Everything that leaves the phone is prepared here. The question and history are scrubbed of
   * amounts and the user's own names; at Personalised the snapshot is computed from the records
   * on the device and masked into placeholders plus bands. The session keeps the map, so only
   * this phone can turn the answer's tokens back into figures.
   */
  const prepareRequest = useCallback((question: string, history: RagChatMessage[]): { request: RagChatRequest; session: MaskingSession } => {
    const session = new MaskingSession({
      accounts: store.accounts.map((account) => account.name),
      positions: store.positions.map((position) => position.name),
      customCategories: store.categories.filter((category) => !category.isDefault).map((category) => category.name),
    });
    const request: RagChatRequest = {
      question: session.scrubQuestion(question),
      history: session.scrubHistory(history),
      appContext: { currentPage: 'Ember', currentPath: '/ember', recentActions: [] },
      clientMasked: true,
    };
    if (aiPreference === 'personalised') {
      const snapshot = buildPersonalSnapshot({
        transactions: store.transactions,
        categories: store.categories,
        positions: store.positions,
        snapshots: store.snapshots,
        contributions: store.contributions,
        retirementPlan: store.retirementPlan,
        essentialCategoryIds: store.essentialCategoryIds,
      });
      const facts = session.maskFacts(snapshot.facts);
      // An oversized block is dropped rather than truncated, so the answer stays a plain guide answer.
      if (JSON.stringify(facts).length <= MAX_MASKED_CONTEXT_CHARS) {
        request.clientSnapshot = { effectiveDate: snapshot.effectiveDate, facts };
      }
    }
    return { request, session };
  }, [aiPreference, store.accounts, store.positions, store.categories, store.transactions, store.snapshots, store.contributions, store.retirementPlan, store.essentialCategoryIds]);
  const busy = messages.some((message) => message.status === 'pending');

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(EMBER_TRANSCRIPT_KEY)
      .then((raw) => {
        if (cancelled || !raw) return;
        const parsed = JSON.parse(raw) as EmberMessage[];
        // A turn interrupted by an app restart cannot resume; mark it so Retry is offered.
        if (Array.isArray(parsed)) setMessages(parsed.map((message) => (message.status === 'pending' ? { ...message, status: 'error', error: 'The app closed before Ember answered.', retryable: true } : message)));
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setHydrated(true);
      });
    return () => {
      cancelled = true;
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(EMBER_TRANSCRIPT_KEY, JSON.stringify(messages.slice(-40))).catch(() => undefined);
  }, [messages, hydrated]);

  /** Turns to send as context: completed messages, optionally excluding the ones being retried. */
  const historyFrom = (items: EmberMessage[], excludeIds: readonly string[] = []): RagChatMessage[] => items
    .filter((message) => message.status === 'done' && !excludeIds.includes(message.id))
    .map((message) => ({ role: message.role, content: message.content }));

  const send = useCallback(async (rawQuestion: string, history: RagChatMessage[] = historyFrom(messages)) => {
    const question = rawQuestion.replace(/\s+/g, ' ').trim().slice(0, MAX_EMBER_QUESTION_LENGTH);
    // Consent gate: while AI is off nothing leaves the phone.
    if (aiOff || !question || busy) return;
    const now = new Date().toISOString();
    const answerId = newId();

    setMessages((current) => [
      ...current,
      { id: newId(), role: 'user', content: question, status: 'done', createdAt: now },
      { id: answerId, role: 'assistant', content: '', status: 'pending', createdAt: now },
    ]);
    setDraft('');

    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const { request, session } = prepareRequest(question, history);
      const response = await askEmber(request, controller.signal);
      const sources = response.sourceDetails ?? response.source_details ?? response.sources.map((title) => ({ title, url: null, path: null, headline: null }));
      setMessages((current) => current.map((message) => (message.id === answerId
        ? { ...message, status: 'done', content: session.unmask(response.answer), sources, mode: response.mode, evidence: response.dataEvidence ?? response.data_evidence }
        : message)));
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      const detail = error instanceof EmberRequestError ? error : new EmberRequestError('Ember could not answer. Try again in a moment.', 0, true);
      setMessages((current) => current.map((message) => (message.id === answerId ? { ...message, status: 'error', error: detail.message, retryable: detail.retryable } : message)));
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  }, [aiOff, busy, messages, prepareRequest]);

  /** Re-ask the question that produced a failed answer, dropping the failed turn from both the transcript and the context. */
  const retry = useCallback((assistantId: string) => {
    const index = messages.findIndex((message) => message.id === assistantId);
    const question = index > 0 ? messages[index - 1] : null;
    if (!question || question.role !== 'user') return;
    const history = historyFrom(messages, [assistantId, question.id]);
    setMessages((current) => current.filter((message) => message.id !== assistantId && message.id !== question.id));
    // Defer so the removal above is applied before the new turn is appended.
    setTimeout(() => void send(question.content, history), 0);
  }, [messages, send]);

  const clear = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    AsyncStorage.removeItem(EMBER_TRANSCRIPT_KEY).catch(() => undefined);
  }, []);

  const asked = useMemo(() => new Set(messages.filter((message) => message.role === 'user').map((message) => message.content.toLowerCase())), [messages]);
  const followUps = useMemo(() => EMBER_STARTERS.filter((starter) => !asked.has(starter.question.toLowerCase())).slice(0, 3), [asked]);

  return { messages, hydrated, busy, draft, setDraft, send, retry, clear, availability, followUps, starters: EMBER_STARTERS, aiPreference, aiOff, setAiPreference };
}
