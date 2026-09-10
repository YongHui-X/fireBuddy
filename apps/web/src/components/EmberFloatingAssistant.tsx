import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { ArrowUp, ExternalLink, Sparkles, X } from 'lucide-react';
import type { RagChatSource } from '@firebuddy/shared';

import { streamFinancialAdvisor } from '../api';
import {
  buildEmberAppContext,
  getEmberPageSuggestion,
  subscribeToEmberAppActions,
} from '../app/emberAppContext';
import { EmberMark } from '../app/BrandMarks';
import { useFireBuddy } from '../app/FireBuddyProvider';
import {
  EMBER_ACTIVE_TOPIC_STORAGE_KEY,
  createEmberMessage,
  getEmberAccountStorageKey,
  getEmberTopicTitle,
  getSafeExternalUrl,
  loadEmberState,
  saveEmberTopics,
  toRagChatHistory,
  type EmberMessage,
  type EmberSource,
  type EmberTopic,
} from '../app/emberState';

const MAX_QUESTION_LENGTH = 2000;

function normalizeSources(sources: RagChatSource[]): EmberSource[] {
  return sources.flatMap((source) => {
    const title = source.title ?? source.headline ?? source.path ?? source.url;
    return title ? [{
      title,
      ...(source.headline ? { headline: source.headline } : {}),
      ...(source.url ? { url: source.url } : {}),
      ...(source.path ? { path: source.path } : {}),
    }] : [];
  });
}

function FloatingMessage({ message }: { message: EmberMessage }) {
  if (message.error) {
    return <p className="ember-float-error">{message.error.message}</p>;
  }

  return (
    <article className={`ember-float-message ember-float-message-${message.role}`}>
      <strong>{message.role === 'user' ? 'You' : 'Ember'}</strong>
      <p>{message.content || (message.streamStatus === 'preparing' ? 'Preparing an answer...' : 'Understanding your question...')}</p>
      {message.dataEvidence ? (
        <a className="ember-float-evidence" href={message.dataEvidence.destination}>
          {message.dataEvidence.label} | {message.dataEvidence.period}
        </a>
      ) : null}
      {message.sources.length > 0 ? (
        <ul aria-label="Sources for this answer">
          {message.sources.slice(0, 2).map((source, index) => {
            const safeUrl = getSafeExternalUrl(source.url);
            return <li key={`${source.title}-${index}`}>{safeUrl
              ? <a href={safeUrl} target="_blank" rel="noreferrer">{source.title}<ExternalLink size={11} /></a>
              : source.title}</li>;
          })}
        </ul>
      ) : null}
    </article>
  );
}

type EmberFloatingAssistantProps = {
  pathname: string;
  onOpenFullEmber: () => void;
};

/** Render Ember as a persistent, page-aware quick-chat drawer alongside the full route. */
export function EmberFloatingAssistant({ pathname, onOpenFullEmber }: EmberFloatingAssistantProps) {
  const { session } = useFireBuddy();
  const storageUserId = session?.user?.id;
  const initialStateRef = useRef(loadEmberState(window.localStorage, storageUserId));
  const loadedStorageUserIdRef = useRef(storageUserId);
  const persistedStorageUserIdRef = useRef(storageUserId);
  const persistedActiveUserIdRef = useRef(storageUserId);
  const [topics, setTopics] = useState<EmberTopic[]>(initialStateRef.current.topics);
  const [activeTopicId, setActiveTopicId] = useState(initialStateRef.current.activeTopicId);
  const [isOpen, setIsOpen] = useState(false);
  const [isAsking, setIsAsking] = useState(false);
  const [question, setQuestion] = useState('');
  const [actionRevision, setActionRevision] = useState(0);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const responseStartRef = useRef<HTMLElement | null>(null);
  const lastScrolledMessageIdRef = useRef<string | null>(null);
  const activeTopic = topics.find((topic) => topic.id === activeTopicId) ?? topics[0];
  const appContext = useMemo(() => buildEmberAppContext(pathname), [actionRevision, pathname]);
  const pageSuggestion = getEmberPageSuggestion(pathname);
  const canSend = Boolean(session?.access_token) && question.trim().length > 0
    && question.length <= MAX_QUESTION_LENGTH && !isAsking;

  useEffect(() => subscribeToEmberAppActions(() => setActionRevision((current) => current + 1)), []);

  useEffect(() => {
    if (loadedStorageUserIdRef.current === storageUserId) return;
    loadedStorageUserIdRef.current = storageUserId;
    const loaded = loadEmberState(window.localStorage, storageUserId);
    setTopics(loaded.topics);
    setActiveTopicId(loaded.activeTopicId);
  }, [storageUserId]);

  useEffect(() => {
    if (persistedStorageUserIdRef.current !== storageUserId) {
      persistedStorageUserIdRef.current = storageUserId;
      return;
    }
    saveEmberTopics(window.localStorage, topics, storageUserId);
  }, [storageUserId, topics]);

  useEffect(() => {
    if (persistedActiveUserIdRef.current !== storageUserId) {
      persistedActiveUserIdRef.current = storageUserId;
      return;
    }
    window.localStorage.setItem(getEmberAccountStorageKey(EMBER_ACTIVE_TOPIC_STORAGE_KEY, storageUserId), activeTopicId);
  }, [activeTopicId, storageUserId]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const latest = loadEmberState(window.localStorage, storageUserId);
    setTopics(latest.topics);
    setActiveTopicId(latest.activeTopicId);
    window.setTimeout(() => composerRef.current?.focus(), 0);
  }, [isOpen]);

  useEffect(() => {
    function closeOnEscape(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
        window.setTimeout(() => launcherRef.current?.focus(), 0);
      }
    }
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [isOpen]);

  function updateTopic(topicId: string, updater: (topic: EmberTopic) => EmberTopic) {
    setTopics((current) => current.map((topic) => topic.id === topicId ? updater(topic) : topic));
  }

  function openAssistant() {
    if (pathname === '/ember') {
      document.getElementById('ember-question')?.focus();
      return;
    }
    setIsOpen(true);
  }

  function closeAssistant() {
    setIsOpen(false);
    window.setTimeout(() => launcherRef.current?.focus(), 0);
  }

  /** Stream one quick-chat answer into the currently selected local Ember topic. */
  async function submitQuestion(rawQuestion: string) {
    const trimmedQuestion = rawQuestion.trim();
    const topicSnapshot = topics.find((topic) => topic.id === activeTopicId);
    if (!trimmedQuestion || !topicSnapshot || !session?.access_token || isAsking) {
      return;
    }

    const userMessage = createEmberMessage('user', trimmedQuestion);
    const assistantMessage = createEmberMessage('assistant', '', { status: 'streaming', streamStatus: 'searching' });
    updateTopic(topicSnapshot.id, (topic) => ({
      ...topic,
      title: topic.title === 'New chat' ? getEmberTopicTitle(trimmedQuestion) : topic.title,
      messages: [...topic.messages, userMessage, assistantMessage],
      updatedAt: assistantMessage.createdAt,
    }));
    setQuestion('');
    setIsAsking(true);
    let answer = '';
    let sources: EmberSource[] = [];
    window.setTimeout(() => {
      if (lastScrolledMessageIdRef.current !== assistantMessage.id) {
        responseStartRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
        lastScrolledMessageIdRef.current = assistantMessage.id;
      }
    }, 0);

    try {
      await streamFinancialAdvisor(session.access_token, {
        question: trimmedQuestion,
        history: toRagChatHistory(topicSnapshot.messages),
        appContext: buildEmberAppContext(pathname),
      }, {
        onStatus: (status) => updateTopic(topicSnapshot.id, (topic) => ({
          ...topic,
          messages: topic.messages.map((message) => message.id === assistantMessage.id
            ? { ...message, streamStatus: status }
            : message),
        })),
        onDelta: (text) => {
          answer += text;
          updateTopic(topicSnapshot.id, (topic) => ({
            ...topic,
            messages: topic.messages.map((message) => message.id === assistantMessage.id
              ? { ...message, content: `${message.content}${text}` }
              : message),
          }));
        },
        onSources: (nextSources) => {
          sources = normalizeSources(nextSources);
          updateTopic(topicSnapshot.id, (topic) => ({
            ...topic,
            messages: topic.messages.map((message) => message.id === assistantMessage.id
              ? { ...message, sources }
              : message),
          }));
        },
        onEvidence: (mode, dataEvidence) => updateTopic(topicSnapshot.id, (topic) => ({
          ...topic,
          messages: topic.messages.map((message) => message.id === assistantMessage.id
            ? { ...message, answerMode: mode, dataEvidence }
            : message),
        })),
      });
      if (!answer.trim()) {
        throw new Error('Ember returned an empty answer.');
      }
      updateTopic(topicSnapshot.id, (topic) => ({
        ...topic,
        messages: topic.messages.map((message) => message.id === assistantMessage.id
          ? { ...message, status: 'complete', streamStatus: undefined, sources }
          : message),
        updatedAt: new Date().toISOString(),
      }));
    } catch {
      updateTopic(topicSnapshot.id, (topic) => ({
        ...topic,
        messages: topic.messages.map((message) => message.id === assistantMessage.id
          ? {
              ...message,
              content: '',
              sources: [],
              status: 'complete',
              streamStatus: undefined,
              error: {
                kind: 'unavailable',
                message: 'Ember could not answer right now. Your question is saved in the full conversation.',
                retryable: true,
                retryOfMessageId: userMessage.id,
              },
            }
          : message),
      }));
    } finally {
      setIsAsking(false);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void submitQuestion(question);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (canSend) void submitQuestion(question);
    }
  }

  if (pathname === '/ember') {
    return null;
  }

  return (
    <div className="ember-floating-root">
      {isOpen && pathname !== '/ember' ? (
        <aside
          id="ember-quick-chat"
          className="ember-floating-panel"
          role="dialog"
          aria-modal="false"
          aria-labelledby="ember-floating-title"
        >
          <header>
            <div><EmberMark size={24} /><span><strong id="ember-floating-title">Ask Ember</strong><small>Singapore finance guide</small></span></div>
            <button type="button" onClick={closeAssistant} aria-label="Close Ember"><X size={18} /></button>
          </header>
          <details className="ember-floating-context">
            <summary><Sparkles size={14} />Using context from {appContext.currentPage}</summary>
            <p>The page and generic action labels help interpret the question. If you ask about your finances, the backend may also calculate read only aggregates for your signed in account.</p>
            {appContext.recentActions.length > 0 ? (
              <ul>{appContext.recentActions.map((action) => <li key={`${action.occurredAt}-${action.label}`}>{action.label}</li>)}</ul>
            ) : <p>No recent actions recorded in this session.</p>}
          </details>
          <div className="ember-floating-messages" aria-live="polite">
            {activeTopic.messages.length === 0 ? (
              <section className="ember-floating-empty">
                <p>Ask about what you are viewing or request a read only summary of your FireBuddy data.</p>
                <button type="button" onClick={() => { setQuestion(pageSuggestion); composerRef.current?.focus(); }}>{pageSuggestion}</button>
              </section>
            ) : activeTopic.messages.slice(-6).map((message) => (
              <FloatingMessage key={message.id} message={message} />
            ))}
            <span ref={(node) => { responseStartRef.current = node; }} />
          </div>
          <form className="ember-floating-composer" onSubmit={handleSubmit}>
            <label htmlFor="ember-floating-question">Ask about this page</label>
            <div>
              <textarea
                id="ember-floating-question"
                ref={composerRef}
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={handleKeyDown}
                maxLength={MAX_QUESTION_LENGTH}
                rows={2}
                disabled={isAsking}
                placeholder="Ask Ember a question"
              />
              <button type="submit" disabled={!canSend} aria-label="Send question to Ember"><ArrowUp size={17} /></button>
            </div>
          </form>
          <footer>
            <span>Educational information only</span>
            <button type="button" onClick={() => { closeAssistant(); onOpenFullEmber(); }}>Open full Ember</button>
          </footer>
        </aside>
      ) : null}
      <button
        ref={launcherRef}
        className="ember-floating-launcher"
        type="button"
        onClick={isOpen ? closeAssistant : openAssistant}
        aria-controls={pathname === '/ember' ? 'ember-question' : 'ember-quick-chat'}
        aria-expanded={pathname === '/ember' ? undefined : isOpen}
        aria-label={pathname === '/ember' ? 'Focus Ember conversation' : isOpen ? 'Close Ember' : `Ask Ember about ${appContext.currentPage}`}
        title={pathname === '/ember' ? 'Focus Ember conversation' : 'Ask Ember'}
      >
        {isOpen ? <X size={22} /> : <>
          <span className="ember-floating-launcher-icon" aria-hidden="true"><EmberMark size={30} /></span>
          <span className="ember-floating-launcher-label">Ask Ember</span>
        </>}
      </button>
    </div>
  );
}
