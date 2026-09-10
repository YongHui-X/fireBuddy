import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import {
  AlertCircle,
  ArrowUp,
  Check,
  Copy,
  Download,
  ExternalLink,
  Menu,
  PanelRightOpen,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import type { RagChatSource } from '@firebuddy/shared';

import { ApiRequestError, streamFinancialAdvisor } from '../api';
import { EmberMark } from '../app/BrandMarks';
import { formatEmberConversationMarkdown, getEmberExportFilename } from '../app/emberExport';
import { buildEmberAppContext } from '../app/emberAppContext';
import { useFireBuddy } from '../app/FireBuddyProvider';
import { getEmberSuggestedQuestions } from '../app/emberSuggestions';
import { useAccessibleDialog } from '../components/useAccessibleDialog';
import {
  EMBER_ACTIVE_TOPIC_STORAGE_KEY,
  createEmberMessage,
  createEmberTopic,
  getEmberAccountStorageKey,
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

const starterPrompts = [
  {
    title: 'Review my spending',
    description: 'Summarise this month and identify the largest categories.',
    question: 'How much have I spent this month, and which categories are highest?',
  },
  {
    title: 'Check my FIRE timeline',
    description: 'Explain the projection from your saved FireBuddy assumptions.',
    question: 'How long more to FIRE based on my current FireBuddy data?',
  },
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
  if (error instanceof ApiRequestError && error.code === 'knowledge_base_unavailable') {
    return { kind: 'unavailable', message: 'Ember’s curated sources are temporarily unavailable. Please try again later.', retryable: true };
  }
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

/** Copy message text with a DOM fallback for browsers without the async clipboard API. */
async function writeClipboardText(content: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(content);
    return;
  }

  const copyField = document.createElement('textarea');
  copyField.value = content;
  copyField.setAttribute('readonly', '');
  copyField.style.position = 'fixed';
  copyField.style.opacity = '0';
  document.body.appendChild(copyField);
  copyField.select();
  try {
    if (!document.execCommand('copy')) {
      throw new Error('Browser copy command was rejected.');
    }
  } finally {
    copyField.remove();
  }
}

/** Keep history inline on wide workspaces and closed as a drawer elsewhere. */
function isWideHistoryLayout(): boolean {
  if (typeof window === 'undefined') {
    return true;
  }
  return window.innerWidth >= 1180;
}

function SourceList({ sources }: { sources: EmberSource[] }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const visibleSources = isExpanded ? sources : sources.slice(0, 2);
  const hiddenCount = sources.length - 2;

  return (
    <section className="ember-message-sources" aria-label="Sources for this answer">
      <strong>Sources</strong>
      <ul>
        {visibleSources.map((source, index) => {
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
      {hiddenCount > 0 ? (
        <button
          className="ember-source-toggle"
          type="button"
          onClick={() => setIsExpanded((current) => !current)}
          aria-expanded={isExpanded}
        >
          {isExpanded ? 'Show fewer' : `Show ${hiddenCount} more`}
        </button>
      ) : null}
    </section>
  );
}

function DataEvidence({ message }: { message: EmberMessage }) {
  const evidence = message.dataEvidence;
  if (!evidence) return null;
  const recordCopy = evidence.record_count === null
    ? ''
    : ` | ${evidence.record_count} matching ${evidence.record_count === 1 ? 'record' : 'records'}`;
  return (
    <a className="ember-data-evidence" href={evidence.destination}>
      <span>Calculated from your FireBuddy data</span>
      <strong>{evidence.label}</strong>
      <small>{evidence.period}{recordCopy}</small>
    </a>
  );
}

function ConversationMessage({
  message,
  isAsking,
  onRetry,
  copyStatus,
  onCopy,
  onSelectSuggestion,
  responseStartRef,
}: {
  message: EmberMessage;
  isAsking: boolean;
  onRetry: (message: EmberMessage) => void;
  copyStatus?: 'copied' | 'error';
  onCopy: (message: EmberMessage) => void;
  onSelectSuggestion: (question: string) => void;
  responseStartRef?: (node: HTMLElement | null) => void;
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

  const messageOwner = message.role === 'user' ? 'your message' : 'Ember message';
  const copyLabel = copyStatus === 'copied'
    ? `Copied ${messageOwner}`
    : copyStatus === 'error'
      ? `Copy failed for ${messageOwner}. Try again`
      : `Copy ${messageOwner}`;

  return (
    <article ref={responseStartRef} className={`ember-message ember-message-${message.role}`}>
      <div className="ember-message-meta">
        <span className="ember-message-author">
          {message.role === 'user' ? 'You' : <><EmberMark size={18} /> Ember</>}
        </span>
        <button
          className={`ember-copy-button ${copyStatus ? `ember-copy-button-${copyStatus}` : ''}`.trim()}
          type="button"
          onClick={() => onCopy(message)}
          disabled={!message.content || message.status === 'streaming'}
          aria-label={copyLabel}
          title={copyLabel}
        >
          {copyStatus === 'copied' ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
          <span>{copyStatus === 'copied' ? 'Copied' : copyStatus === 'error' ? 'Try again' : 'Copy'}</span>
        </button>
      </div>
      <div className="ember-message-bubble">
        {message.role === 'assistant' ? (
          message.content ? <EmberRichText content={message.content} /> : (
            <p className="ember-stream-placeholder">
              <Sparkles size={16} aria-hidden="true" />
              {message.streamStatus === 'preparing' ? 'Preparing your answer...' : 'Understanding your question...'}
            </p>
          )
        ) : <p>{message.content}</p>}
        {message.role === 'assistant' ? <DataEvidence message={message} /> : null}
        {message.sources.length > 0 ? <SourceList sources={message.sources} /> : null}
      </div>
      {message.role === 'assistant' && message.status === 'complete' && message.suggestedQuestions.length > 0 ? (
        <section className="ember-follow-ups" aria-label="Suggested follow up questions">
          <span>Continue exploring</span>
          <div>
            {message.suggestedQuestions.map((suggestion) => (
              <button key={suggestion} type="button" onClick={() => onSelectSuggestion(suggestion)}>
                {suggestion}
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </article>
  );
}

type EmberProps = {
  isMainSidebarOpen?: boolean;
  onToggleMainSidebar?: () => void;
  appContextPathname?: string;
};

/** Render the Ember workspace while allowing the containing app shell to own its main navigation. */
export default function Ember({
  isMainSidebarOpen = true,
  onToggleMainSidebar = () => undefined,
  appContextPathname,
}: EmberProps) {
  const { session } = useFireBuddy();
  const storageUserId = session?.user?.id;
  const initialStateRef = useRef(loadEmberState(window.localStorage, storageUserId));
  const loadedStorageUserIdRef = useRef(storageUserId);
  const persistedStorageUserIdRef = useRef(storageUserId);
  const persistedActiveUserIdRef = useRef(storageUserId);
  const [topics, setTopics] = useState<EmberTopic[]>(initialStateRef.current.topics);
  const [activeTopicId, setActiveTopicId] = useState(initialStateRef.current.activeTopicId);
  const [question, setQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [historyQuery, setHistoryQuery] = useState('');
  const [isCompactHistory, setIsCompactHistory] = useState(() => !isWideHistoryLayout());
  const [isHistoryOpen, setIsHistoryOpen] = useState(isWideHistoryLayout);
  const [requestStatus, setRequestStatus] = useState<'ready' | 'searching' | 'preparing' | 'error'>('ready');
  const [topicPendingDeletion, setTopicPendingDeletion] = useState<EmberTopic | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<{ messageId: string; status: 'copied' | 'error' } | null>(null);
  const requestInFlightRef = useRef(false);
  const copyFeedbackTimerRef = useRef<number | null>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const responseStartElementRef = useRef<HTMLElement | null>(null);
  const [responseStartMessageId, setResponseStartMessageId] = useState<string | null>(null);
  const lastScrolledResponseIdRef = useRef<string | null>(null);
  const deleteDialogRef = useAccessibleDialog<HTMLElement>({
    isOpen: Boolean(topicPendingDeletion),
    canClose: !isAsking,
    onClose: () => setTopicPendingDeletion(null),
  });
  const historyDialogRef = useAccessibleDialog<HTMLElement>({
    isOpen: isCompactHistory && isHistoryOpen && !topicPendingDeletion,
    onClose: () => setIsHistoryOpen(false),
  });

  const activeTopic = topics.find((topic) => topic.id === activeTopicId) ?? topics[0];
  const filteredTopics = useMemo(() => {
    const normalizedQuery = historyQuery.trim().toLocaleLowerCase('en-SG');
    return normalizedQuery
      ? topics.filter((topic) => topic.title.toLocaleLowerCase('en-SG').includes(normalizedQuery))
      : topics;
  }, [historyQuery, topics]);
  const canSend = question.trim().length > 0 && question.length <= MAX_QUESTION_LENGTH && !isAsking;
  const canExportConversation = activeTopic.messages.some((message) => !message.error && message.content.trim())
    && !isAsking
    && activeTopic.messages.every((message) => message.status === 'complete');

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
    /** Move history between an inline rail and a closed drawer at the layout breakpoint. */
    function syncHistoryLayout() {
      const isWide = isWideHistoryLayout();
      setIsCompactHistory(!isWide);
      setIsHistoryOpen(isWide);
    }

    window.addEventListener('resize', syncHistoryLayout);
    return () => window.removeEventListener('resize', syncHistoryLayout);
  }, []);

  useEffect(() => {
    const composer = composerRef.current;
    if (!composer) {
      return;
    }
    composer.style.height = 'auto';
    composer.style.height = `${Math.min(Math.max(composer.scrollHeight, 52), 160)}px`;
  }, [question]);

  useEffect(() => {
    if (responseStartMessageId
      && lastScrolledResponseIdRef.current !== responseStartMessageId
      && typeof responseStartElementRef.current?.scrollIntoView === 'function') {
      responseStartElementRef.current.scrollIntoView({ block: 'start', behavior: 'smooth' });
      lastScrolledResponseIdRef.current = responseStartMessageId;
    }
  }, [responseStartMessageId]);

  useEffect(() => () => {
    if (copyFeedbackTimerRef.current !== null) {
      window.clearTimeout(copyFeedbackTimerRef.current);
    }
  }, []);

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
    if (isCompactHistory) {
      setIsHistoryOpen(false);
    }
    window.setTimeout(() => composerRef.current?.focus(), 0);
  }

  /** Remove one confirmed local topic and keep a usable conversation selected. */
  function deleteConversation() {
    if (!topicPendingDeletion || isAsking) {
      return;
    }

    const remainingTopics = topics.filter((topic) => topic.id !== topicPendingDeletion.id);
    const nextTopics = remainingTopics.length > 0 ? remainingTopics : [createEmberTopic()];
    setTopics(nextTopics);
    if (topicPendingDeletion.id === activeTopicId) {
      setActiveTopicId(nextTopics[0].id);
      setQuestion('');
      setRequestStatus('ready');
    }
    setTopicPendingDeletion(null);
  }

  /** Copy one complete message and briefly announce the result. */
  async function copyConversationMessage(message: EmberMessage) {
    if (!message.content || message.status === 'streaming') {
      return;
    }

    if (copyFeedbackTimerRef.current !== null) {
      window.clearTimeout(copyFeedbackTimerRef.current);
    }
    try {
      await writeClipboardText(message.content);
      setCopyFeedback({ messageId: message.id, status: 'copied' });
    } catch {
      setCopyFeedback({ messageId: message.id, status: 'error' });
    }
    copyFeedbackTimerRef.current = window.setTimeout(() => setCopyFeedback(null), 2200);
  }

  /** Copy the same Markdown content used by downloads and announce the outcome. */
  async function copyWholeConversation() {
    if (!canExportConversation) {
      return;
    }
    if (copyFeedbackTimerRef.current !== null) {
      window.clearTimeout(copyFeedbackTimerRef.current);
    }
    try {
      await writeClipboardText(formatEmberConversationMarkdown(activeTopic));
      setCopyFeedback({ messageId: 'conversation', status: 'copied' });
    } catch {
      setCopyFeedback({ messageId: 'conversation', status: 'error' });
    }
    copyFeedbackTimerRef.current = window.setTimeout(() => setCopyFeedback(null), 2200);
  }

  /** Download the current complete conversation as a local Markdown file. */
  function downloadConversation() {
    if (!canExportConversation) {
      return;
    }
    const markdown = formatEmberConversationMarkdown(activeTopic);
    const objectUrl = URL.createObjectURL(new Blob([markdown], { type: 'text/markdown;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = getEmberExportFilename(activeTopic.title);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
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
    setResponseStartMessageId(assistantMessage.id);

    requestInFlightRef.current = true;
    setIsAsking(true);
    setRequestStatus('searching');
    let streamedAnswer = '';
    let streamedSources: EmberSource[] = [];

    try {
      const token = session?.access_token;
      if (!token) {
        throw new ApiRequestError('Missing authenticated session', 401);
      }

      await streamFinancialAdvisor(token, {
        question: trimmedQuestion,
        history: toRagChatHistory(historyMessages),
        ...(appContextPathname ? { appContext: buildEmberAppContext(appContextPathname) } : {}),
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
          streamedSources = normalizedSources;
          updateTopic(topicSnapshot.id, (topic) => ({
            ...topic,
            messages: topic.messages.map((message) => message.id === assistantMessage.id
              ? { ...message, sources: normalizedSources }
              : message),
          }));
        },
        onEvidence: (mode, dataEvidence) => {
          updateTopic(topicSnapshot.id, (topic) => ({
            ...topic,
            messages: topic.messages.map((message) => message.id === assistantMessage.id
              ? { ...message, answerMode: mode, dataEvidence }
              : message),
          }));
        },
        onDone: () => undefined,
      });
      if (!streamedAnswer.trim()) {
        throw new ApiRequestError('Empty Ember response', 204);
      }
      const suggestedQuestions = getEmberSuggestedQuestions({
        question: trimmedQuestion,
        history: [...historyMessages, userMessage],
        sources: streamedSources,
      });
      updateTopic(topicSnapshot.id, (topic) => ({
        ...topic,
        messages: topic.messages.map((message) => message.id === assistantMessage.id
          ? { ...message, status: 'complete' as const, streamStatus: undefined, suggestedQuestions }
          : message),
        updatedAt: new Date().toISOString(),
      }));
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
              suggestedQuestions: [],
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
      <section className={`ember-layout ${isHistoryOpen ? 'ember-layout-history-open' : 'ember-layout-history-closed'}`}>
        <section className="ember-conversation-card" aria-label={`Conversation: ${activeTopic.title}`}>
          <header className="ember-conversation-header">
            <div className="ember-conversation-title">
              <button
                className="ember-header-icon-button ember-main-sidebar-toggle"
                type="button"
                onClick={onToggleMainSidebar}
                aria-controls="main-sidebar"
                aria-expanded={isMainSidebarOpen}
                aria-label={isMainSidebarOpen ? 'Hide main navigation' : 'Show main navigation'}
                title={isMainSidebarOpen ? 'Hide main navigation' : 'Show main navigation'}
              >
                <Menu size={19} />
              </button>
              <span className="ember-header-mark"><EmberMark size={26} /></span>
              <div>
                <h2>Ember</h2>
                <p>Singapore finance guide</p>
              </div>
            </div>
            <div className="ember-conversation-header-actions">
              <div className={`ember-request-status ember-request-status-${requestStatus}`} role="status" aria-live="polite">
                <span aria-hidden="true" />
                {requestStatus === 'searching'
                  ? 'Understanding your question'
                  : requestStatus === 'preparing'
                    ? 'Preparing your answer'
                    : requestStatus === 'error'
                      ? 'Needs attention'
                      : 'Ready'}
              </div>
              <button
                className="ember-header-icon-button"
                type="button"
                onClick={() => void copyWholeConversation()}
                disabled={!canExportConversation}
                aria-label={copyFeedback?.messageId === 'conversation' && copyFeedback.status === 'copied'
                  ? 'Copied conversation'
                  : 'Copy conversation'}
                title="Copy conversation"
              >
                {copyFeedback?.messageId === 'conversation' && copyFeedback.status === 'copied'
                  ? <Check size={16} />
                  : <Copy size={16} />}
              </button>
              <button
                className="ember-header-icon-button"
                type="button"
                onClick={downloadConversation}
                disabled={!canExportConversation}
                aria-label="Download Markdown"
                title="Download Markdown"
              >
                <Download size={16} />
              </button>
              <button className="ember-header-new-chat" type="button" onClick={startNewChat}>
                <Plus size={16} /> <span>New chat</span>
              </button>
              <button
                className="ember-header-icon-button ember-history-toggle"
                type="button"
                onClick={() => setIsHistoryOpen((current) => !current)}
                aria-controls="ember-history-panel"
                aria-expanded={isHistoryOpen}
                aria-label={isHistoryOpen ? 'Hide chat history' : 'Show chat history'}
                title={isHistoryOpen ? 'Hide chat history' : 'Show chat history'}
              >
                <PanelRightOpen size={18} />
              </button>
            </div>
          </header>

          <div className="ember-messages" aria-live="polite">
            {activeTopic.messages.map((message) => (
              <ConversationMessage
                key={message.id}
                message={message}
                isAsking={isAsking}
                onRetry={retryMessage}
                copyStatus={copyFeedback?.messageId === message.id ? copyFeedback.status : undefined}
                onCopy={(selectedMessage) => void copyConversationMessage(selectedMessage)}
                onSelectSuggestion={selectStarterPrompt}
                responseStartRef={message.id === responseStartMessageId
                  ? (node) => { responseStartElementRef.current = node; }
                  : undefined}
              />
            ))}
            {activeTopic.messages.length === 0 ? (
              <section className="ember-starters" aria-labelledby="ember-starters-title">
                <div className="ember-empty-introduction">
                  <span className="ember-empty-mark"><EmberMark size={30} /></span>
                  <div>
                    <h3>Your Singapore finance guide</h3>
                    <p>Ember can explain your FireBuddy spending and FIRE results, then connect them to curated Singapore finance guidance.</p>
                    <p>It uses read only calculations, cannot change records or retrieve live prices, and does not provide regulated financial advice.</p>
                  </div>
                </div>
                <div className="ember-starter-heading">
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
            {copyFeedback ? (
              <span className="visually-hidden" role="status">
                {copyFeedback.status === 'copied'
                  ? copyFeedback.messageId === 'conversation' ? 'Conversation copied to clipboard.' : 'Message copied to clipboard.'
                  : 'Unable to copy the message. Try again.'}
              </span>
            ) : null}
          </div>

          <form className="ember-composer" onSubmit={handleSubmit}>
            <p className="ember-education-note">Educational information only. Ember uses read only FireBuddy calculations and curated sources.</p>
            <label className="visually-hidden" htmlFor="ember-question">Ask Ember</label>
            <div className="ember-composer-field">
              <textarea
                id="ember-question"
                ref={composerRef}
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={handleComposerKeyDown}
                placeholder="Ask about your spending, FIRE progress, CPF, SSBs, or IRAS reliefs"
                maxLength={MAX_QUESTION_LENGTH}
                rows={1}
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

        <aside
          id="ember-history-panel"
          ref={historyDialogRef}
          className={`ember-history-panel ${isHistoryOpen ? 'ember-history-panel-open' : ''}`.trim()}
          role={isCompactHistory && isHistoryOpen ? 'dialog' : undefined}
          aria-modal={isCompactHistory && isHistoryOpen ? true : undefined}
          aria-labelledby="ember-history-title"
          tabIndex={-1}
        >
          <header className="ember-history-header">
            <div>
              <h2 id="ember-history-title">Chat history</h2>
              <p>{topics.length.toLocaleString('en-SG')} {topics.length === 1 ? 'conversation' : 'conversations'}</p>
            </div>
            <button
              className="ember-header-icon-button"
              type="button"
              onClick={() => setIsHistoryOpen(false)}
              aria-label="Close chat history"
              title="Close chat history"
            >
              <X size={18} />
            </button>
          </header>
          <label className="ember-history-search" htmlFor="ember-history-query">
            <Search size={17} aria-hidden="true" />
            <span className="visually-hidden">Search conversations</span>
            <input
              id="ember-history-query"
              data-dialog-initial-focus
              type="search"
              value={historyQuery}
              onChange={(event) => setHistoryQuery(event.target.value)}
              placeholder="Search conversations"
            />
          </label>
          <p className="ember-history-results" aria-live="polite">
            {historyQuery.trim()
              ? `${filteredTopics.length.toLocaleString('en-SG')} of ${topics.length.toLocaleString('en-SG')} conversations`
              : `${topics.length.toLocaleString('en-SG')} ${topics.length === 1 ? 'conversation' : 'conversations'}`}
          </p>
          <div className="ember-topic-list">
            {filteredTopics.map((topic) => (
              <div className={`ember-topic-row ${topic.id === activeTopic.id ? 'ember-topic-active' : ''}`.trim()} key={topic.id}>
                <button
                  className="ember-topic-select"
                  type="button"
                  onClick={() => {
                    setActiveTopicId(topic.id);
                    setRequestStatus('ready');
                    if (isCompactHistory) {
                      setIsHistoryOpen(false);
                    }
                  }}
                >
                  <strong>{topic.title}</strong>
                  <small>{formatTopicDate(topic.updatedAt)}</small>
                </button>
                <button
                  className="ember-topic-delete"
                  type="button"
                  onClick={() => setTopicPendingDeletion(topic)}
                  disabled={isAsking}
                  aria-label={`Delete conversation ${topic.title}`}
                  title={isAsking ? 'Wait for Ember to finish before deleting a conversation' : `Delete ${topic.title}`}
                >
                  <Trash2 size={15} aria-hidden="true" />
                </button>
              </div>
            ))}
            {filteredTopics.length === 0 ? (
              <div className="ember-history-empty">
                <strong>No matching conversations</strong>
                <p>Try another title or clear the search.</p>
              </div>
            ) : null}
          </div>
        </aside>
      </section>

      {isCompactHistory && isHistoryOpen ? (
        <button
          className="ember-history-backdrop"
          type="button"
          onClick={() => setIsHistoryOpen(false)}
          aria-label="Close chat history"
        />
      ) : null}

      {topicPendingDeletion ? (
        <div className="sheet-backdrop" onClick={isAsking ? undefined : () => setTopicPendingDeletion(null)}>
          <aside
            ref={deleteDialogRef}
            className="confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-ember-topic-title"
            aria-describedby="delete-ember-topic-description"
            tabIndex={-1}
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id="delete-ember-topic-title">Delete conversation?</h3>
            <p id="delete-ember-topic-description">
              Delete <strong>{topicPendingDeletion.title}</strong> and all of its messages from this browser? This cannot be undone.
            </p>
            <div className="sheet-actions">
              <button
                data-dialog-initial-focus
                className="secondary-button"
                type="button"
                onClick={() => setTopicPendingDeletion(null)}
                disabled={isAsking}
              >
                Cancel
              </button>
              <button className="danger-button" type="button" onClick={deleteConversation} disabled={isAsking}>
                Delete conversation
              </button>
            </div>
          </aside>
        </div>
      ) : null}
    </main>
  );
}
