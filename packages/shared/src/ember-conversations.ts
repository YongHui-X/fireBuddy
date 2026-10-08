/**
 * DouDou conversation history kept on the phone: a list of chats, each with its own messages,
 * newest first. Pure functions so the mobile hook stays thin and the rules are testable. The
 * message type is the caller's own; only `role` and `content` are read here.
 */

export interface ChatConversation<M> {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: M[];
}

export const DEFAULT_CONVERSATION_TITLE = 'New chat';
/** Oldest chats beyond this are dropped so the phone's storage stays small. */
export const MAX_CONVERSATIONS = 30;
/** Messages kept per chat; older turns fall off the front. */
export const MAX_MESSAGES_PER_CONVERSATION = 40;
const MAX_TITLE_LENGTH = 48;

/** A chat's title from its first question: one line, trimmed, cut at a word near 48 characters. */
export function conversationTitle(question: string): string {
  const line = question.replace(/\s+/g, ' ').trim();
  if (!line) return DEFAULT_CONVERSATION_TITLE;
  if (line.length <= MAX_TITLE_LENGTH) return line;
  const cut = line.slice(0, MAX_TITLE_LENGTH);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 20 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

export function createConversation<M>(id: string, now: string): ChatConversation<M> {
  return { id, title: DEFAULT_CONVERSATION_TITLE, createdAt: now, updatedAt: now, messages: [] };
}

/**
 * Replace one chat's messages, titling it from its first question, and move it to the top.
 * A chat with no messages is never stored. Lists are trimmed to the limits above.
 */
export function saveConversationMessages<M extends { role: string; content: string }>(
  conversations: readonly ChatConversation<M>[],
  conversation: ChatConversation<M>,
  messages: readonly M[],
  now: string,
): ChatConversation<M>[] {
  const others = conversations.filter((item) => item.id !== conversation.id);
  if (messages.length === 0) return others;
  const firstQuestion = messages.find((message) => message.role === 'user')?.content ?? '';
  const updated: ChatConversation<M> = {
    ...conversation,
    title: conversation.title === DEFAULT_CONVERSATION_TITLE ? conversationTitle(firstQuestion) : conversation.title,
    updatedAt: now,
    messages: messages.slice(-MAX_MESSAGES_PER_CONVERSATION),
  };
  return [updated, ...others].slice(0, MAX_CONVERSATIONS);
}

export function removeConversation<M>(conversations: readonly ChatConversation<M>[], id: string): ChatConversation<M>[] {
  return conversations.filter((item) => item.id !== id);
}

/** "Today", "Yesterday", "3 Oct" or "3 Oct 2025" for a chat's last update, in the phone's time zone. */
export function conversationDateLabel(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const startOf = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
  const days = Math.round((startOf(now) - startOf(date)) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  const sameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString('en-SG', sameYear ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Read stored chats defensively: anything malformed is dropped rather than crashing the screen. */
export function parseStoredConversations<M>(raw: string | null): ChatConversation<M>[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is ChatConversation<M> =>
      Boolean(item) && typeof item === 'object'
      && typeof (item as ChatConversation<M>).id === 'string'
      && typeof (item as ChatConversation<M>).title === 'string'
      && Array.isArray((item as ChatConversation<M>).messages));
  } catch {
    return [];
  }
}
