import type { RagChatMessage, RagChatRole, RagChatSource } from '@firebuddy/shared';

export const EMBER_TOPICS_STORAGE_KEY = 'firebuddy_ember_topics_v3';
export const EMBER_ACTIVE_TOPIC_STORAGE_KEY = 'firebuddy_ember_active_topic_v3';
export const LEGACY_V2_EMBER_TOPICS_STORAGE_KEY = 'firebuddy_ember_topics_v2';
export const LEGACY_V2_EMBER_ACTIVE_TOPIC_STORAGE_KEY = 'firebuddy_ember_active_topic_v2';
export const LEGACY_EMBER_TOPICS_STORAGE_KEY = 'firebuddy_ember_topics_v1';
export const LEGACY_EMBER_ACTIVE_TOPIC_STORAGE_KEY = 'firebuddy_ember_active_topic_v1';
export const LEGACY_CHAT_TOPICS_STORAGE_KEY = 'firebuddy_chat_topics_v1';
export const LEGACY_CHAT_ACTIVE_TOPIC_STORAGE_KEY = 'firebuddy_chat_active_topic_v1';
export const EMBER_STORAGE_VERSION = 3;

export const EMBER_GREETING =
  'Hello, I am Ember. Ask me about CPF, SRS, HDB grants, Singapore Savings Bonds, MoneySense guidance, or FIRE concepts in Singapore.';

export type EmberFailureKind = 'authentication' | 'rate_limit' | 'unavailable' | 'empty_response' | 'retrieval' | 'unknown';
export type EmberMessageStatus = 'streaming' | 'complete';
export type EmberRequestStatus = 'searching' | 'preparing';

export interface EmberSource {
  title: string;
  headline?: string;
  url?: string;
  path?: string;
}

export interface EmberMessageError {
  kind: EmberFailureKind;
  message: string;
  retryable: boolean;
  retryOfMessageId: string;
}

export interface EmberMessage {
  id: string;
  role: RagChatRole;
  content: string;
  createdAt: string;
  sources: EmberSource[];
  suggestedQuestions: string[];
  status: EmberMessageStatus;
  streamStatus?: EmberRequestStatus;
  error?: EmberMessageError;
}

export interface EmberTopic {
  id: string;
  title: string;
  messages: EmberMessage[];
  createdAt: string;
  updatedAt: string;
}

interface EmberStoragePayload {
  version: typeof EMBER_STORAGE_VERSION;
  topics: EmberTopic[];
}

interface LegacyChatTopic {
  id?: unknown;
  title?: unknown;
  messages?: unknown;
  sources?: unknown;
  sourceDetails?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface LoadedEmberState {
  topics: EmberTopic[];
  activeTopicId: string;
  migratedLegacyHistory: boolean;
}

/** Create collision-resistant local IDs without requiring a production dependency. */
export function createEmberId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

/** Create one local message with the metadata needed for persistence and retries. */
export function createEmberMessage(
  role: RagChatRole,
  content: string,
  options: Partial<Pick<EmberMessage, 'id' | 'createdAt' | 'sources' | 'suggestedQuestions' | 'status' | 'streamStatus' | 'error'>> = {},
): EmberMessage {
  return {
    id: options.id ?? createEmberId('message'),
    role,
    content,
    createdAt: options.createdAt ?? new Date().toISOString(),
    sources: options.sources ?? [],
    suggestedQuestions: options.suggestedQuestions ?? [],
    status: options.status ?? 'complete',
    ...(options.streamStatus ? { streamStatus: options.streamStatus } : {}),
    ...(options.error ? { error: options.error } : {}),
  };
}

/** Create a blank Ember conversation without sending or seeding a reply. */
export function createEmberTopic(seedTitle = 'New chat'): EmberTopic {
  const now = new Date().toISOString();

  return {
    id: createEmberId('topic'),
    title: seedTitle,
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
}

/** Derive a compact topic name from the first submitted question. */
export function getEmberTopicTitle(question: string): string {
  const compact = question.replace(/\s+/g, ' ').trim();
  return compact.length > 42 ? `${compact.slice(0, 39)}...` : compact;
}

/** Convert local messages to the unchanged shared RAG history contract. */
export function toRagChatHistory(messages: readonly EmberMessage[]): RagChatMessage[] {
  return messages
    .filter((message) => !message.error && message.content.trim().length > 0)
    .map((message) => ({ role: message.role, content: message.content }));
}

/** Accept only http and https citation links before rendering external anchors. */
export function getSafeExternalUrl(url?: string): string | undefined {
  if (!url) {
    return undefined;
  }

  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.href : undefined;
  } catch {
    return undefined;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isRole(value: unknown): value is RagChatRole {
  return value === 'user' || value === 'assistant';
}

function normalizeSource(value: unknown): EmberSource | null {
  if (typeof value === 'string' && value.trim()) {
    return { title: value.trim() };
  }

  if (!isRecord(value)) {
    return null;
  }

  const titleCandidate = value.title ?? value.headline ?? value.path ?? value.url;
  if (typeof titleCandidate !== 'string' || !titleCandidate.trim()) {
    return null;
  }

  return {
    title: titleCandidate.trim(),
    ...(typeof value.headline === 'string' && value.headline.trim() ? { headline: value.headline.trim() } : {}),
    ...(typeof value.url === 'string' && value.url.trim() ? { url: value.url.trim() } : {}),
    ...(typeof value.path === 'string' && value.path.trim() ? { path: value.path.trim() } : {}),
  };
}

function normalizeStoredMessage(value: unknown): EmberMessage | null {
  if (!isRecord(value) || typeof value.id !== 'string' || !isRole(value.role) || typeof value.content !== 'string') {
    return null;
  }

  const sources = Array.isArray(value.sources)
    ? value.sources.map(normalizeSource).filter((source): source is EmberSource => source !== null)
    : [];
  const suggestedQuestions = Array.isArray(value.suggestedQuestions)
    ? value.suggestedQuestions.filter((question): question is string => typeof question === 'string' && question.trim().length > 0)
    : [];

  return {
    id: value.id,
    role: value.role,
    content: value.content,
    createdAt: typeof value.createdAt === 'string' ? value.createdAt : new Date().toISOString(),
    sources,
    suggestedQuestions,
    status: value.status === 'streaming' ? 'streaming' : 'complete',
    ...(value.streamStatus === 'searching' || value.streamStatus === 'preparing'
      ? { streamStatus: value.streamStatus }
      : {}),
    ...(isRecord(value.error) && typeof value.error.message === 'string' && typeof value.error.retryOfMessageId === 'string'
      ? {
          error: {
            kind: typeof value.error.kind === 'string' ? value.error.kind as EmberFailureKind : 'unknown',
            message: value.error.message,
            retryable: value.error.retryable !== false,
            retryOfMessageId: value.error.retryOfMessageId,
          },
        }
      : {}),
  };
}

function normalizeStoredTopic(value: unknown): EmberTopic | null {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.title !== 'string' || !Array.isArray(value.messages)) {
    return null;
  }

  let messages = value.messages
    .map(normalizeStoredMessage)
    .filter((message): message is EmberMessage => message !== null);

  if (messages.length === 1 && messages[0].role === 'assistant' && messages[0].content === EMBER_GREETING) {
    messages = [];
  }

  messages = messages.map((message, messageIndex) => {
    if (message.status !== 'streaming') {
      return message;
    }

    const retryMessage = messages
      .slice(0, messageIndex)
      .reverse()
      .find((candidate) => candidate.role === 'user');
    if (!retryMessage) {
      return { ...message, status: 'complete' as const, streamStatus: undefined };
    }

    return {
      ...message,
      content: '',
      sources: [],
      suggestedQuestions: [],
      status: 'complete' as const,
      streamStatus: undefined,
      error: {
        kind: 'unavailable' as const,
        message: 'This answer was interrupted. Retry the saved question to continue.',
        retryable: true,
        retryOfMessageId: retryMessage.id,
      },
    };
  });

  const createdAt = typeof value.createdAt === 'string' ? value.createdAt : new Date().toISOString();
  return {
    id: value.id,
    title: value.title,
    messages,
    createdAt,
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : createdAt,
  };
}

function parseEmberTopics(rawValue: string | null, version: number): EmberTopic[] {
  if (!rawValue) {
    return [];
  }

  const parsed = JSON.parse(rawValue) as unknown;
  if (!isRecord(parsed) || parsed.version !== version || !Array.isArray(parsed.topics)) {
    return [];
  }

  return parsed.topics
    .map(normalizeStoredTopic)
    .filter((topic): topic is EmberTopic => topic !== null);
}

function migrateLegacyTopic(value: LegacyChatTopic, topicIndex: number): EmberTopic | null {
  if (!Array.isArray(value.messages)) {
    return null;
  }

  const legacyMessages = value.messages;
  const id = typeof value.id === 'string' && value.id ? value.id : `legacy_topic_${topicIndex}`;
  const createdAt = typeof value.createdAt === 'string' ? value.createdAt : new Date().toISOString();
  const updatedAt = typeof value.updatedAt === 'string' ? value.updatedAt : createdAt;
  const messages = legacyMessages.flatMap((message, messageIndex) => {
    if (!isRecord(message) || !isRole(message.role) || typeof message.content !== 'string' || !message.content.trim()) {
      return [];
    }

    return [createEmberMessage(message.role, message.content, {
      id: `legacy_message_${id}_${messageIndex}`,
      createdAt: messageIndex === legacyMessages.length - 1 ? updatedAt : createdAt,
    })];
  });

  if (messages.length === 1 && messages[0].role === 'assistant' && messages[0].content === EMBER_GREETING) {
    messages.splice(0, 1);
  }

  const detailedSources = Array.isArray(value.sourceDetails)
    ? value.sourceDetails.map(normalizeSource).filter((source): source is EmberSource => source !== null)
    : [];
  const fallbackSources = Array.isArray(value.sources)
    ? value.sources.map(normalizeSource).filter((source): source is EmberSource => source !== null)
    : [];
  const sources = detailedSources.length > 0 ? detailedSources : fallbackSources;
  let latestAssistantIndex = -1;
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index].role === 'assistant') {
      latestAssistantIndex = index;
      break;
    }
  }

  if (latestAssistantIndex >= 0 && sources.length > 0) {
    messages[latestAssistantIndex] = { ...messages[latestAssistantIndex], sources };
  }

  return {
    id,
    title: typeof value.title === 'string' && value.title.trim() ? value.title : 'Imported chat',
    messages,
    createdAt,
    updatedAt,
  };
}

function migrateLegacyTopics(rawValue: string | null): EmberTopic[] {
  if (!rawValue) {
    return [];
  }

  const parsed = JSON.parse(rawValue) as unknown;
  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed
    .map((topic, index) => isRecord(topic) ? migrateLegacyTopic(topic as LegacyChatTopic, index) : null)
    .filter((topic): topic is EmberTopic => topic !== null);
}

/** Load v3 history first, then copy v2, v1, and legacy histories without removing their keys. */
export function loadEmberState(storage: Pick<Storage, 'getItem'> = window.localStorage): LoadedEmberState {
  try {
    const storedTopics = parseEmberTopics(storage.getItem(EMBER_TOPICS_STORAGE_KEY), EMBER_STORAGE_VERSION);
    if (storedTopics.length > 0) {
      const storedActiveId = storage.getItem(EMBER_ACTIVE_TOPIC_STORAGE_KEY);
      return {
        topics: storedTopics,
        activeTopicId: storedActiveId && storedTopics.some((topic) => topic.id === storedActiveId)
          ? storedActiveId
          : storedTopics[0].id,
        migratedLegacyHistory: false,
      };
    }

    const migratedV2Topics = parseEmberTopics(storage.getItem(LEGACY_V2_EMBER_TOPICS_STORAGE_KEY), 2);
    if (migratedV2Topics.length > 0) {
      const v2ActiveId = storage.getItem(LEGACY_V2_EMBER_ACTIVE_TOPIC_STORAGE_KEY);
      return {
        topics: migratedV2Topics,
        activeTopicId: v2ActiveId && migratedV2Topics.some((topic) => topic.id === v2ActiveId)
          ? v2ActiveId
          : migratedV2Topics[0].id,
        migratedLegacyHistory: true,
      };
    }

    const migratedEmberTopics = parseEmberTopics(storage.getItem(LEGACY_EMBER_TOPICS_STORAGE_KEY), 1);
    if (migratedEmberTopics.length > 0) {
      const legacyEmberActiveId = storage.getItem(LEGACY_EMBER_ACTIVE_TOPIC_STORAGE_KEY);
      return {
        topics: migratedEmberTopics,
        activeTopicId: legacyEmberActiveId && migratedEmberTopics.some((topic) => topic.id === legacyEmberActiveId)
          ? legacyEmberActiveId
          : migratedEmberTopics[0].id,
        migratedLegacyHistory: true,
      };
    }

    const migratedTopics = migrateLegacyTopics(storage.getItem(LEGACY_CHAT_TOPICS_STORAGE_KEY));
    if (migratedTopics.length > 0) {
      const legacyActiveId = storage.getItem(LEGACY_CHAT_ACTIVE_TOPIC_STORAGE_KEY);
      return {
        topics: migratedTopics,
        activeTopicId: legacyActiveId && migratedTopics.some((topic) => topic.id === legacyActiveId)
          ? legacyActiveId
          : migratedTopics[0].id,
        migratedLegacyHistory: true,
      };
    }
  } catch {
    // Malformed browser data falls back to a new conversation without deleting it.
  }

  const topic = createEmberTopic();
  return { topics: [topic], activeTopicId: topic.id, migratedLegacyHistory: false };
}

/** Persist the current Ember topic shape under its versioned storage key. */
export function saveEmberTopics(storage: Pick<Storage, 'setItem'>, topics: EmberTopic[]): void {
  const payload: EmberStoragePayload = { version: EMBER_STORAGE_VERSION, topics };
  storage.setItem(EMBER_TOPICS_STORAGE_KEY, JSON.stringify(payload));
}
