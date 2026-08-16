import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import {
  AlertCircle,
  ArrowUp,
  BookOpen,
  Clock3,
  ExternalLink,
  Flame,
  History,
  LockKeyhole,
  MessageSquareText,
  Plus,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import type { RagChatSource } from '@firebuddy/shared';

import { ApiRequestError, streamFinancialAdvisor } from '../api';
import { EmberMark } from '../app/BrandMarks';
import { useFireBuddy } from '../app/FireBuddyProvider';
import {
  EMBER_ACTIVE_TOPIC_STORAGE_KEY,
  createEmberMessage,
  createEmberTopic,
  getEmberTopicTitle,
  getSafeExternalUrl,
  loadEmberState,
  saveEmberTopics,
  toRagChatHistory,
  type EmberMessage,
  type EmberMessageError,
  type EmberSource,
  type EmberTopic,
} from '../app/emberState';

const MAX_QUESTION_LENGTH = 2000;

const capabilities = [
  'CPF',
  'CPFIS',
  'Singapore Savings Bonds',
  'MoneySense',
  'IRAS reliefs',
  'Singapore investing basics',
  'FIRE planning',
];

const starterPrompts = [
  {
    title: 'Understand CPF rates',
    description: 'Review how contribution rates work and what can change by age.',
    question: 'What are the CPF contribution rates for 2026, and how do they vary by age?',
  },
  {
    title: 'Compare retirement sums',
    description: 'Learn the role of the Basic, Full, and Enhanced Retirement Sums.',
    question: 'How do the Basic, Full, and Enhanced Retirement Sums differ?',
  },
  {
    title: 'Review Savings Bonds',
    description: 'Understand how Singapore Savings Bonds work and what to compare.',
    question: 'How do Singapore Savings Bonds work, and what should I understand before applying?',
  },
  {
    title: 'Plan around FIRE',
    description: 'Review the concepts a Singapore-based plan should consider.',
    question: 'What should a Singapore FIRE plan consider before age 55?',
  },
];

type RichTextBlock =
  | { type: 'heading'; level: number; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'unordered-list'; items: string[] }
  | { type: 'ordered-list'; items: string[] };

/** Parse a small, safe subset of answer formatting without evaluating HTML. */
function parseRichText(content: string): RichTextBlock[] {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const blocks: RichTextBlock[] = [];
  let paragraphLines: string[] = [];

  function flushParagraph() {
    if (paragraphLines.length > 0) {
      blocks.push({ type: 'paragraph', text: paragraphLines.join(' ').trim() });
      paragraphLines = [];
    }
  }

  for (let index = 0; index < lines.length;) {
    const line = lines[index].trim();
    if (!line) {
      flushParagraph();
      index += 1;
      continue;
    }

    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      flushParagraph();
      blocks.push({ type: 'heading', level: heading[1].length, text: heading[2] });
      index += 1;
      continue;
    }

    const unorderedItem = /^[-*]\s+(.+)$/.exec(line);
    if (unorderedItem) {
      flushParagraph();
      const items: string[] = [];
      while (index < lines.length) {
        const match = /^[-*]\s+(.+)$/.exec(lines[index].trim());
        if (!match) {
          break;
        }
        items.push(match[1]);
        index += 1;
      }
      blocks.push({ type: 'unordered-list', items });
      continue;
    }

    const orderedItem = /^\d+[.)]\s+(.+)$/.exec(line);
    if (orderedItem) {
      flushParagraph();
      const items: string[] = [];
      while (index < lines.length) {
        const match = /^\d+[.)]\s+(.+)$/.exec(lines[index].trim());
        if (!match) {
          break;
        }
        items.push(match[1]);
        index += 1;
      }
      blocks.push({ type: 'ordered-list', items });
      continue;
    }

    paragraphLines.push(line);
    index += 1;
  }

  flushParagraph();
  return blocks;
}

/** Render headings, paragraphs, and lists as React text nodes so raw HTML stays inert. */
export function EmberRichText({ content }: { content: string }) {
  return (
    <div className="ember-rich-text">
      {parseRichText(content).map((block, index) => {
        const key = `${block.type}-${index}`;
        if (block.type === 'heading') {
          const Heading = `h${Math.min(block.level + 2, 5)}` as 'h3' | 'h4' | 'h5';
          return <Heading key={key}>{block.text}</Heading>;
        }
        if (block.type === 'unordered-list') {
          return <ul key={key}>{block.items.map((item, itemIndex) => <li key={`${item}-${itemIndex}`}>{item}</li>)}</ul>;
        }
        if (block.type === 'ordered-list') {
          return <ol key={key}>{block.items.map((item, itemIndex) => <li key={`${item}-${itemIndex}`}>{item}</li>)}</ol>;
        }
        return <p key={key}>{block.text}</p>;
      })}
    </div>
  );
}

function normalizeResponseSources(sources: RagChatSource[]): EmberSource[] {
  return sources.flatMap((source) => {
    const title = source.title ?? source.headline ?? source.path ?? source.url;
    if (!title) {
      return [];
    }

    return [{
      title,
      ...(source.headline ? { headline: source.headline } : {}),
      ...(source.url ? { url: source.url } : {}),
      ...(source.path ? { path: source.path } : {}),
    }];
  });
}

/** Turn API and session failures into concise Ember-facing recovery guidance. */
export function classifyEmberFailure(error: unknown): Pick<EmberMessageError, 'kind' | 'message' | 'retryable'> {
  if (error instanceof ApiRequestError && error.status === 401) {
    return { kind: 'authentication', message: 'Your session is no longer available. Sign in again, then retry this question.', retryable: true };
  }
  if (error instanceof ApiRequestError && error.status === 429) {
    return { kind: 'rate_limit', message: 'Ember has reached the request limit. Wait a moment, then try again.', retryable: true };
  }
  if (error instanceof ApiRequestError && error.status === 503) {
    return { kind: 'unavailable', message: 'Ember is temporarily unavailable. Your question is saved here so you can retry.', retryable: true };
  }
  if (error instanceof ApiRequestError && error.status === 204) {
    return { kind: 'empty_response', message: 'Ember returned an empty answer. Please retry this question.', retryable: true };
  }
  if (error instanceof ApiRequestError && error.status === 502) {
    return { kind: 'retrieval', message: 'Ember could not search the curated sources. Please retry this question.', retryable: true };
  }

  return { kind: 'unknown', message: 'Ember could not answer right now. Your question is saved here so you can retry.', retryable: true };
}

function formatTopicDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) {
    return 'Recent';
  }

  return date.toLocaleDateString('en-SG', { day: 'numeric', month: 'short' });
}

function ContextCard({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <article className="ember-context-card">
      <span className="ember-context-icon">{icon}</span>
      <div>
        <h3>{title}</h3>
        {children}
      </div>
    </article>
  );
}

function SourceList({ sources }: { sources: EmberSource[] }) {
  return (
    <section className="ember-message-sources" aria-label="Sources for this answer">
      <strong>Sources</strong>
      <ul>
        {sources.map((source, index) => {
          const safeUrl = getSafeExternalUrl(source.url);
          return (
            <li key={`${source.url ?? source.path ?? source.title}-${index}`}>
              {safeUrl ? (
                <a href={safeUrl} target="_blank" rel="noreferrer">
                  <span>{source.title}</span>
                  <ExternalLink size={13} aria-hidden="true" />
                </a>
              ) : (
                <span className="ember-source-title">{source.title}</span>
              )}
              {source.headline && source.headline !== source.title ? <small>{source.headline}</small> : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function ConversationMessage({
  message,
  isAsking,
  onRetry,
}: {
  message: EmberMessage;
  isAsking: boolean;
  onRetry: (message: EmberMessage) => void;
}) {
  if (message.error) {
    return (
      <article className="ember-inline-error" data-error-kind={message.error.kind}>
        <AlertCircle size={18} aria-hidden="true" />
        <div>
          <strong>Answer interrupted</strong>
          <p>{message.error.message}</p>
          {message.error.retryable ? (
            <button type="button" onClick={() => onRetry(message)} disabled={isAsking}>Retry</button>
          ) : null}
        </div>
      </article>
    );
  }

  return (
    <article className={`ember-message ember-message-${message.role}`}>
      <span className="ember-message-author">
        {message.role === 'user' ? 'You' : <><EmberMark size={18} /> Ember</>}
      </span>
      <div className="ember-message-bubble">
        {message.role === 'assistant' ? (
          message.content ? <EmberRichText content={message.content} /> : (
            <p className="ember-stream-placeholder">
              <Sparkles size={16} aria-hidden="true" />
              {message.streamStatus === 'preparing' ? 'Preparing a grounded answer...' : 'Searching curated sources...'}
            </p>
          )
        ) : <p>{message.content}</p>}
        {message.sources.length > 0 ? <SourceList sources={message.sources} /> : null}
      </div>
    </article>
  );
}

export default function Ember() {
  const initialStateRef = useRef(loadEmberState());
  const [topics, setTopics] = useState<EmberTopic[]>(initialStateRef.current.topics);
  const [activeTopicId, setActiveTopicId] = useState(initialStateRef.current.activeTopicId);
  const [question, setQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [requestStatus, setRequestStatus] = useState<'ready' | 'searching' | 'preparing' | 'error'>('ready');
  const requestInFlightRef = useRef(false);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const conversationEndRef = useRef<HTMLDivElement>(null);
  const { session } = useFireBuddy();

  const activeTopic = topics.find((topic) => topic.id === activeTopicId) ?? topics[0];
  const recentContext = useMemo(
    () => activeTopic.messages.filter((message) => !message.error).slice(-3),
    [activeTopic.messages],
  );
  const canSend = question.trim().length > 0 && question.length <= MAX_QUESTION_LENGTH && !isAsking;

  useEffect(() => {
    saveEmberTopics(window.localStorage, topics);
  }, [topics]);

  useEffect(() => {
    window.localStorage.setItem(EMBER_ACTIVE_TOPIC_STORAGE_KEY, activeTopicId);
  }, [activeTopicId]);

  useEffect(() => {
    if (typeof conversationEndRef.current?.scrollIntoView === 'function') {
      conversationEndRef.current.scrollIntoView({ block: 'end', behavior: 'smooth' });
    }
  }, [activeTopic.messages, isAsking]);

  function updateTopic(topicId: string, updater: (topic: EmberTopic) => EmberTopic) {
    setTopics((current) => current.map((topic) => topic.id === topicId ? updater(topic) : topic));
  }

  /** Start a local conversation without making an advisor request. */
  function startNewChat() {
    const topic = createEmberTopic();
    setTopics((current) => [topic, ...current]);
    setActiveTopicId(topic.id);
    setQuestion('');
    setRequestStatus('ready');
    window.setTimeout(() => composerRef.current?.focus(), 0);
  }

  /** Fill the composer from a starter card while leaving submission under user control. */
  function selectStarterPrompt(prompt: string) {
    setQuestion(prompt);
    window.setTimeout(() => composerRef.current?.focus(), 0);
  }

  /** Submit one question and update its stable assistant message as SSE events arrive. */
  async function submitQuestion(rawQuestion: string, retryError?: EmberMessage) {
    const trimmedQuestion = rawQuestion.trim();
    if (!trimmedQuestion || trimmedQuestion.length > MAX_QUESTION_LENGTH || requestInFlightRef.current) {
      return;
    }

    const topicSnapshot = topics.find((topic) => topic.id === activeTopicId);
    if (!topicSnapshot) {
      return;
    }

    let userMessage: EmberMessage;
    let historyMessages = topicSnapshot.messages;
    if (retryError?.error) {
      const userIndex = topicSnapshot.messages.findIndex((message) => message.id === retryError.error?.retryOfMessageId);
      if (userIndex < 0) {
        return;
      }
      userMessage = topicSnapshot.messages[userIndex];
      historyMessages = topicSnapshot.messages.slice(0, userIndex);
      updateTopic(topicSnapshot.id, (topic) => ({
        ...topic,
        messages: topic.messages.filter((message) => message.id !== retryError.id),
        updatedAt: new Date().toISOString(),
      }));
    } else {
      userMessage = createEmberMessage('user', trimmedQuestion);
      updateTopic(topicSnapshot.id, (topic) => ({
        ...topic,
        title: topic.title === 'New chat' ? getEmberTopicTitle(trimmedQuestion) : topic.title,
        messages: [...topic.messages, userMessage],
        updatedAt: userMessage.createdAt,
      }));
      setQuestion('');
    }

    const assistantMessage = createEmberMessage('assistant', '', {
      status: 'streaming',
      streamStatus: 'searching',
    });
    updateTopic(topicSnapshot.id, (topic) => ({
      ...topic,
      messages: [...topic.messages, assistantMessage],
      updatedAt: assistantMessage.createdAt,
    }));

    requestInFlightRef.current = true;
    setIsAsking(true);
    setRequestStatus('searching');
    let streamedAnswer = '';

    try {
      const token = session?.access_token;
      if (!token) {
        throw new ApiRequestError('Missing authenticated session', 401);
      }

      await streamFinancialAdvisor(token, {
        question: trimmedQuestion,
        history: toRagChatHistory(historyMessages),
      }, {
        onStatus: (status) => {
          setRequestStatus(status);
          updateTopic(topicSnapshot.id, (topic) => ({
            ...topic,
            messages: topic.messages.map((message) => message.id === assistantMessage.id
              ? { ...message, streamStatus: status }
              : message),
          }));
        },
        onDelta: (text) => {
          streamedAnswer += text;
          updateTopic(topicSnapshot.id, (topic) => ({
            ...topic,
            messages: topic.messages.map((message) => message.id === assistantMessage.id
              ? { ...message, content: `${message.content}${text}` }
              : message),
          }));
        },
        onSources: (sources) => {
          const normalizedSources = normalizeResponseSources(sources);
          updateTopic(topicSnapshot.id, (topic) => ({
            ...topic,
            messages: topic.messages.map((message) => message.id === assistantMessage.id
              ? { ...message, sources: normalizedSources }
              : message),
          }));
        },
        onDone: () => {
          updateTopic(topicSnapshot.id, (topic) => ({
            ...topic,
            messages: topic.messages.map((message) => message.id === assistantMessage.id
              ? { ...message, status: 'complete' as const, streamStatus: undefined }
              : message),
          }));
        },
      });
      if (!streamedAnswer.trim()) {
        throw new ApiRequestError('Empty Ember response', 204);
      }
      setRequestStatus('ready');
    } catch (error) {
      const failure = classifyEmberFailure(error);
      updateTopic(topicSnapshot.id, (topic) => ({
        ...topic,
        messages: topic.messages.map((message) => message.id === assistantMessage.id
          ? {
              ...message,
              content: '',
              sources: [],
              status: 'complete' as const,
              streamStatus: undefined,
              error: { ...failure, retryOfMessageId: userMessage.id },
            }
          : message),
        updatedAt: new Date().toISOString(),
      }));
      setRequestStatus('error');
    } finally {
      requestInFlightRef.current = false;
      setIsAsking(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitQuestion(question);
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (canSend) {
        void submitQuestion(question);
      }
    }
  }

  function retryMessage(errorMessage: EmberMessage) {
    if (!errorMessage.error) {
      return;
    }
    const original = activeTopic.messages.find((message) => message.id === errorMessage.error?.retryOfMessageId);
    if (original) {
      void submitQuestion(original.content, errorMessage);
    }
  }

  return (
    <main className="page ember-page">
      <header className="ember-hero">
        <div className="ember-hero-copy">
          <span className="ember-guide-label"><Flame size={16} aria-hidden="true" /> FireBuddy's Singapore finance guide</span>
          <h2><EmberMark size={34} /> Meet Ember</h2>
          <p>Source-backed Singapore finance answers.</p>
        </div>
        <div className="ember-capabilities" aria-label="Ember topics">
          {capabilities.map((capability) => <span key={capability}>{capability}</span>)}
        </div>
      </header>

      <section className="ember-layout">
        <aside className="ember-topics-panel" aria-label="Ember conversations">
          <div className="ember-panel-heading">
            <div>
              <span>Conversations</span>
              <h3>Your topics</h3>
            </div>
            <button type="button" onClick={startNewChat} aria-label="Start new chat"><Plus size={17} /></button>
          </div>
          <div className="ember-topic-list">
            {topics.map((topic) => (
              <button
                className={topic.id === activeTopic.id ? 'ember-topic-active' : ''}
                key={topic.id}
                type="button"
                onClick={() => {
                  setActiveTopicId(topic.id);
                  setRequestStatus('ready');
                }}
              >
                <MessageSquareText size={16} aria-hidden="true" />
                <span><strong>{topic.title}</strong><small>{formatTopicDate(topic.updatedAt)}</small></span>
              </button>
            ))}
          </div>
          <button className="ember-new-chat-button" type="button" onClick={startNewChat}>
            <Plus size={16} /> New chat
          </button>
        </aside>

        <section className="ember-conversation-card" aria-label={`Conversation: ${activeTopic.title}`}>
          <div className="ember-conversation-header">
            <div>
              <span>Current topic</span>
              <h3>{activeTopic.title}</h3>
            </div>
            <div className={`ember-request-status ember-request-status-${requestStatus}`} role="status" aria-live="polite">
              <span aria-hidden="true" />
              {requestStatus === 'searching'
                ? 'Searching curated sources'
                : requestStatus === 'preparing'
                  ? 'Preparing a grounded answer'
                  : requestStatus === 'error'
                    ? 'Needs attention'
                    : 'Ready'}
            </div>
          </div>

          <div className="ember-messages" aria-live="polite">
            {activeTopic.messages.map((message) => (
              <ConversationMessage key={message.id} message={message} isAsking={isAsking} onRetry={retryMessage} />
            ))}
            {activeTopic.messages.length === 0 ? (
              <section className="ember-starters" aria-labelledby="ember-starters-title">
                <div>
                  <span>Not sure where to start?</span>
                  <h3 id="ember-starters-title">Try a guided question</h3>
                </div>
                <div className="ember-starter-grid">
                  {starterPrompts.map((prompt) => (
                    <button key={prompt.title} type="button" onClick={() => selectStarterPrompt(prompt.question)}>
                      <strong>{prompt.title}</strong>
                      <span>{prompt.description}</span>
                    </button>
                  ))}
                </div>
              </section>
            ) : null}
            <div ref={conversationEndRef} />
          </div>

          <form className="ember-composer" onSubmit={handleSubmit}>
            <label htmlFor="ember-question">Ask Ember</label>
            <div className="ember-composer-field">
              <textarea
                id="ember-question"
                ref={composerRef}
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={handleComposerKeyDown}
                placeholder="Ask about CPF, CPFIS, SSBs, IRAS reliefs, or FIRE planning"
                maxLength={MAX_QUESTION_LENGTH}
                rows={3}
                disabled={isAsking}
                aria-describedby="ember-composer-help ember-character-count"
              />
              <button type="submit" disabled={!canSend} aria-label="Send question to Ember"><ArrowUp size={18} /></button>
            </div>
            <div className="ember-composer-meta">
              <span id="ember-composer-help">Enter to send. Shift+Enter for a new line.</span>
              <span id="ember-character-count">{question.length.toLocaleString('en-SG')} / {MAX_QUESTION_LENGTH.toLocaleString('en-SG')}</span>
            </div>
          </form>
        </section>

        <aside className="ember-context-panel" aria-label="How Ember uses context">
          <div className="ember-context-heading">
            <span>Visible context</span>
            <h3>How Ember answers</h3>
          </div>
          <ContextCard icon={<BookOpen size={18} />} title="Grounded guidance">
            <p>Ember uses curated Singapore finance sources and recent conversation context.</p>
          </ContextCard>
          <ContextCard icon={<LockKeyhole size={18} />} title="Current boundaries">
            <p>Ember does not inspect your accounts or transactions, calculate personal FIRE results, retrieve live prices, or provide regulated financial advice.</p>
          </ContextCard>
          <ContextCard icon={<ShieldCheck size={18} />} title="Careful by design">
            <p>Low-confidence and unsupported questions may be refused.</p>
          </ContextCard>
          <ContextCard icon={<History size={18} />} title="Recent context">
            <p>Up to the latest six normalized messages are shared with the existing answer service.</p>
            <ul className="ember-recent-context">
              {recentContext.map((message) => (
                <li key={message.id}><strong>{message.role === 'user' ? 'You' : 'Ember'}</strong><span>{message.content}</span></li>
              ))}
            </ul>
          </ContextCard>
          <div className="ember-education-note"><Clock3 size={16} /><span>Educational information only. Verify important decisions with official sources or a qualified financial professional.</span></div>
        </aside>
      </section>
    </main>
  );
}
