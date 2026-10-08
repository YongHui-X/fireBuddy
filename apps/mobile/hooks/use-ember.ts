import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  buildPersonalSnapshot,
  describeMissingRecords,
  findMissingRecords,
  getDeviceDateKey,
  createConversation,
  MaskingSession,
  MAX_MASKED_CONTEXT_CHARS,
  parseStoredConversations,
  removeConversation,
  saveConversationMessages,
  scopeSnapshotFacts,
  requestedSpendingMonths,
  sectionsWithRecords,
  selectSnapshotSectionsForTurn,
  type ChatConversation,
  type RagAnswerMode,
  type RagChatMessage,
  type RagChatRequest,
  type RagChatSource,
  type MissingRecord,
  type RagDataEvidence,
  type RecordPresence,
  type SnapshotSection,
} from '@firebuddy/shared';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAiPreference } from '@/lib/ai-preference';
import { useFireBuddy } from '@/lib/fire-buddy-store';
import { useRegion } from '@/lib/user-profile';
import { EmberRequestError, getEmberAvailability, MAX_EMBER_QUESTION_LENGTH, streamEmber } from '@/lib/ember-api';

/** Every saved DouDou chat on this phone. Kept apart from the demo dataset keys: a data reset keeps chats. */
export const EMBER_CONVERSATIONS_KEY = 'firebuddy_mobile_ember_conversations_v1';
/** The single transcript earlier builds kept; read once and turned into the first saved chat. */
export const EMBER_TRANSCRIPT_KEY = 'firebuddy_mobile_ember_transcript_v1';

export interface EmberMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  /** `pending` until the first words arrive, `streaming` while they arrive, then `done` or `error`. */
  status: 'pending' | 'streaming' | 'done' | 'error';
  /** What DouDou is doing before the first words, e.g. "Searching sources". */
  statusText?: string;
  error?: string;
  retryable?: boolean;
  sources?: RagChatSource[];
  mode?: RagAnswerMode;
  evidence?: RagDataEvidence;
  /** Which masked snapshot sections went with the question; empty when no figures were sent. */
  usedSections?: SnapshotSection[];
  createdAt: string;
}

export type EmberConversation = ChatConversation<EmberMessage>;


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

/** A turn cut off by an app restart cannot resume; mark it so Retry is offered. */
function settleInterrupted(messages: readonly EmberMessage[]): EmberMessage[] {
  return messages.map((message) => (message.status === 'pending' || message.status === 'streaming'
    ? { ...message, status: 'error', statusText: undefined, error: 'The app closed before DouDou finished.', retryable: true }
    : message));
}

/**
 * DouDou chats on the phone: the open chat's messages, every saved chat for the history list, and
 * one question at a time streamed in as DouDou writes. Starter questions never submit themselves;
 * the screen only sends when the person taps Send. Chats are saved when no answer is in flight.
 */
export function useEmber() {
  /** Chats as last written to the phone; the open chat is merged in by `conversations` below. */
  const [saved, setSaved] = useState<EmberConversation[]>([]);
  const [active, setActive] = useState<EmberConversation>(() => createConversation<EmberMessage>(newId(), new Date().toISOString()));
  const [messages, setMessages] = useState<EmberMessage[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [draft, setDraft] = useState('');
  const abortRef = useRef<AbortController | null>(null);
  const { enabled: aiEnabled } = useAiPreference();
  const store = useFireBuddy();
  const region = useRegion();
  const availability = useMemo(() => getEmberAvailability(), []);
  const aiOff = !aiEnabled;

  /** What the phone has on record, so a question about missing records is answered here, not guessed from zeros. */
  const presence = useMemo<RecordPresence>(() => ({
    expenses: store.transactions.some((item) => item.transactionType === 'expense'),
    transactions: store.transactions.length > 0,
    wealth: store.positions.length > 0,
    firePlan: store.retirementPlan !== null,
    budgets: store.categories.some((category) => category.categoryType === 'expense' && Number(category.monthlyBudget) > 0),
  }), [store.transactions, store.positions, store.retirementPlan, store.categories]);

  /**
   * Everything that leaves the phone is prepared here. The question and history are scrubbed of
   * amounts and the user's own names. Figures go only when the question needs them: the phone
   * picks the snapshot sections from the scrubbed question, keeps only those, and masks them into
   * placeholders plus bands. A general question sends no figures. The session keeps the map, so
   * only this phone can turn the answer's tokens back into figures.
   */
  const prepareRequest = useCallback((question: string, history: RagChatMessage[]): { request: RagChatRequest; session: MaskingSession; usedSections: SnapshotSection[]; missing: MissingRecord[]; nothingOnRecord: boolean } => {
    const session = new MaskingSession({
      accounts: store.accounts.map((account) => account.name),
      positions: store.positions.map((position) => position.name),
      customCategories: store.categories.filter((category) => !category.isDefault).map((category) => category.name),
    }, { wholeDollars: true, currency: region.currency }); // Whole units in the user's currency, matching Home, Categories and Insights.
    const request: RagChatRequest = {
      question: session.scrubQuestion(question),
      history: session.scrubHistory(history),
      appContext: { currentPage: 'DouDou', currentPath: '/ember', recentActions: [], country: region.country },
      clientMasked: true,
    };
    const wanted = selectSnapshotSectionsForTurn(request.question, request.history);
    const missing = findMissingRecords(wanted, request.question, presence);
    // Sections with no records behind them are never sent; when none are left, DouDou answers on the phone.
    let usedSections = sectionsWithRecords(wanted, presence);
    const nothingOnRecord = wanted.length > 0 && usedSections.length === 0;
    if (usedSections.length > 0) {
      const snapshot = buildPersonalSnapshot({
        transactions: store.transactions,
        categories: store.categories,
        positions: store.positions,
        snapshots: store.snapshots,
        contributions: store.contributions,
        // Outside Singapore a stored CPF payout never counts, matching the FIRE Planner.
        retirementPlan: store.retirementPlan && !region.isSingapore ? { ...store.retirementPlan, cpfPlan: 'unknown', cpfMonthlyPayout: 0 } : store.retirementPlan,
        essentialCategoryIds: store.essentialCategoryIds,
        // "…and in July": that month's spending goes too, when spending is being sent at all.
        extraSpendingMonths: usedSections.includes('spending') ? requestedSpendingMonths(request.question, getDeviceDateKey()) : [],
      });
      const scoped = scopeSnapshotFacts(snapshot.facts, usedSections);
      const facts = scoped ? session.maskFacts(scoped) : null;
      // An oversized block is dropped rather than truncated, so the answer stays a general answer.
      if (facts && JSON.stringify(facts).length <= MAX_MASKED_CONTEXT_CHARS) {
        request.clientSnapshot = { effectiveDate: snapshot.effectiveDate, facts };
      } else {
        usedSections = [];
      }
    }
    return { request, session, usedSections, missing, nothingOnRecord };
  }, [presence, store.accounts, store.positions, store.categories, store.transactions, store.snapshots, store.contributions, store.retirementPlan, store.essentialCategoryIds, region.country, region.currency, region.isSingapore]);
  const busy = messages.some((message) => message.status === 'pending' || message.status === 'streaming');

  // Load saved chats, turning an earlier build's single transcript into the first one. The newest
  // chat opens, so returning to DouDou continues where the person left off.
  useEffect(() => {
    let cancelled = false;
    Promise.all([AsyncStorage.getItem(EMBER_CONVERSATIONS_KEY), AsyncStorage.getItem(EMBER_TRANSCRIPT_KEY)])
      .then(([stored, legacy]) => {
        if (cancelled) return;
        let list = parseStoredConversations<EmberMessage>(stored).map((chat) => ({ ...chat, messages: settleInterrupted(chat.messages) }));
        if (list.length === 0 && legacy) {
          // An unreadable old transcript is dropped rather than hiding the saved conversations.
          let old: unknown = null;
          try {
            old = JSON.parse(legacy);
          } catch {
            old = null;
          }
          if (Array.isArray(old) && old.length > 0) {
            const now = new Date().toISOString();
            list = saveConversationMessages([], createConversation<EmberMessage>(newId(), now), settleInterrupted(old as EmberMessage[]), now);
          }
        }
        AsyncStorage.removeItem(EMBER_TRANSCRIPT_KEY).catch(() => undefined);
        setSaved(list);
        if (list[0]) {
          setActive(list[0]);
          setMessages(list[0].messages);
        }
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

  // The history as it stands: saved chats with the open one merged in. Derived rather than stored,
  // and dated by its last message, so merely opening a saved chat never moves or re-dates it.
  const conversations = useMemo(() => {
    const stored = saved.find((chat) => chat.id === active.id);
    if (stored && JSON.stringify(stored.messages) === JSON.stringify(messages)) return saved;
    const lastAt = messages[messages.length - 1]?.createdAt ?? active.updatedAt;
    return saveConversationMessages(saved, active, messages, lastAt);
  }, [saved, active, messages]);

  // Write to the phone whenever the open chat settles; streaming deltas are not written one by one.
  useEffect(() => {
    if (!hydrated || busy) return;
    AsyncStorage.setItem(EMBER_CONVERSATIONS_KEY, JSON.stringify(conversations)).catch(() => undefined);
  }, [conversations, hydrated, busy]);

  // Turning DouDou off withdraws consent, so an answer still streaming in is stopped at once.
  useEffect(() => {
    if (aiOff) abortRef.current?.abort();
  }, [aiOff]);

  /** Turns to send as context: completed messages, optionally excluding the ones being retried. */
  const historyFrom = (items: EmberMessage[], excludeIds: readonly string[] = []): RagChatMessage[] => items
    .filter((message) => message.status === 'done' && !excludeIds.includes(message.id))
    .map((message) => ({ role: message.role, content: message.content }));

  const patch = (id: string, change: Partial<EmberMessage>) => {
    setMessages((current) => current.map((message) => (message.id === id ? { ...message, ...change } : message)));
  };

  const send = useCallback(async (rawQuestion: string, history: RagChatMessage[] = historyFrom(messages)) => {
    const question = rawQuestion.replace(/\s+/g, ' ').trim().slice(0, MAX_EMBER_QUESTION_LENGTH);
    // Consent gate: while AI is off nothing leaves the phone.
    if (aiOff || !question || busy) return;
    const now = new Date().toISOString();
    const answerId = newId();

    setMessages((current) => [
      ...current,
      { id: newId(), role: 'user', content: question, status: 'done', createdAt: now },
      { id: answerId, role: 'assistant', content: '', status: 'pending', statusText: 'Reading your question', createdAt: now },
    ]);
    setDraft('');

    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const { request, session, usedSections, missing, nothingOnRecord } = prepareRequest(question, history);
      if (nothingOnRecord) {
        // Nothing to work from: say so plainly instead of sending the question.
        patch(answerId, { status: 'done', statusText: undefined, content: describeMissingRecords(missing), mode: 'knowledge', usedSections: [] });
        return;
      }
      let raw = '';
      let sources: RagChatSource[] = [];
      let mode: RagAnswerMode | undefined;
      let evidence: RagDataEvidence | undefined;
      await streamEmber(request, {
        onStatus: (text) => patch(answerId, { statusText: text }),
        // Placeholders can be split across chunks; unmaskPartial holds an unfinished one back.
        onDelta: (text) => {
          raw += text;
          patch(answerId, { status: 'streaming', statusText: undefined, content: session.unmaskPartial(raw) });
        },
        onSources: (list) => { sources = list; },
        onEvidence: (answerMode, data) => { mode = answerMode; evidence = data; },
      }, controller.signal);
      const answer = session.unmaskFinal(raw).trim();
      if (!answer) throw new EmberRequestError('DouDou did not send an answer. Try again.', 503, true);
      // Part of the question had no records behind it; add DouDou's note on what is missing.
      const content = missing.length > 0 ? `${answer}

${describeMissingRecords(missing, true)}` : answer;
      patch(answerId, { status: 'done', statusText: undefined, content, sources, mode: mode ?? (usedSections.length ? 'hybrid' : 'knowledge'), evidence, usedSections });
    } catch (error) {
      // Stopped on purpose (new chat, another chat opened, or DouDou turned off). Mark it so the
      // turn never spins forever; if another chat is open now, the id is not there and nothing changes.
      if (error instanceof Error && error.name === 'AbortError') {
        patch(answerId, { status: 'error', statusText: undefined, error: 'DouDou stopped before finishing.', retryable: true });
        return;
      }
      const detail = error instanceof EmberRequestError ? error : new EmberRequestError('DouDou could not answer. Try again in a moment.', 0, true);
      patch(answerId, { status: 'error', statusText: undefined, error: detail.message, retryable: detail.retryable });
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

  /** Stop any answer in flight and start an empty chat; the current one stays in the history. */
  const newChat = useCallback(() => {
    abortRef.current?.abort();
    setSaved(conversations);
    setActive(createConversation<EmberMessage>(newId(), new Date().toISOString()));
    setMessages([]);
    setDraft('');
  }, [conversations]);

  /** Open a saved chat from the history list. */
  const openChat = useCallback((id: string) => {
    const chat = conversations.find((item) => item.id === id);
    if (!chat || chat.id === active.id) return;
    abortRef.current?.abort();
    setSaved(conversations);
    setActive(chat);
    setMessages(settleInterrupted(chat.messages));
    setDraft('');
  }, [conversations, active.id]);

  /** Delete a saved chat from this phone; deleting the open one starts a new chat. */
  const deleteChat = useCallback((id: string) => {
    const next = removeConversation(conversations, id);
    setSaved(next);
    AsyncStorage.setItem(EMBER_CONVERSATIONS_KEY, JSON.stringify(next)).catch(() => undefined);
    if (id === active.id) {
      abortRef.current?.abort();
      setActive(createConversation<EmberMessage>(newId(), new Date().toISOString()));
      setMessages([]);
    }
  }, [conversations, active.id]);

  const asked = useMemo(() => new Set(messages.filter((message) => message.role === 'user').map((message) => message.content.toLowerCase())), [messages]);
  const followUps = useMemo(() => EMBER_STARTERS.filter((starter) => !asked.has(starter.question.toLowerCase())).slice(0, 3), [asked]);

  return {
    messages, hydrated, busy, draft, setDraft, send, retry, availability, followUps, starters: EMBER_STARTERS, aiOff,
    conversations, activeId: active.id, newChat, openChat, deleteChat,
  };
}
