import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CONVERSATION_TITLE,
  MAX_CONVERSATIONS,
  MAX_MESSAGES_PER_CONVERSATION,
  conversationDateLabel,
  conversationTitle,
  createConversation,
  parseStoredConversations,
  removeConversation,
  saveConversationMessages,
} from '@firebuddy/shared';

type Message = { role: 'user' | 'assistant'; content: string };

const message = (role: Message['role'], content: string): Message => ({ role, content });
const chat = (id: string, title = DEFAULT_CONVERSATION_TITLE, updatedAt = '2026-10-03T12:00:00Z') => ({
  ...createConversation<Message>(id, '2026-10-01T12:00:00Z'),
  title,
  updatedAt,
});

describe('shared Ember conversations', () => {
  it('creates titles from short and whitespace-normalized questions', () => {
    expect(conversationTitle('How much   did I spend?')).toBe('How much did I spend?');
    expect(conversationTitle('   ')).toBe('New chat');
    expect(conversationTitle('Short question')).toBe('Short question');
  });

  it('cuts a long title at a word boundary', () => {
    const title = conversationTitle('This is a very long question about my monthly spending and savings rate today');
    expect(title.endsWith('…')).toBe(true);
    expect(title.length).toBeLessThanOrEqual(49);
    expect(title).toBe('This is a very long question about my monthly…');
  });

  it('titles and moves a new chat to the top', () => {
    const existing = chat('old', 'Old title');
    const result = saveConversationMessages([existing], chat('new'), [message('user', 'What is my FIRE target?')], '2026-10-04T12:00:00Z');
    expect(result[0]).toMatchObject({ id: 'new', title: 'What is my FIRE target?' });
    expect(result[1].id).toBe('old');
  });

  it('keeps an existing title and removes an empty conversation', () => {
    const titled = chat('keep', 'Pinned chat');
    expect(saveConversationMessages([], titled, [message('user', 'A new question')], '2026-10-04T12:00:00Z')[0].title).toBe('Pinned chat');
    expect(saveConversationMessages([titled], titled, [], '2026-10-04T12:00:00Z')).toEqual([]);
  });

  it('caps conversations and retains only the newest messages per chat', () => {
    const conversations = Array.from({ length: MAX_CONVERSATIONS }, (_, index) => chat(`old-${index}`, `Chat ${index}`));
    const messages = Array.from({ length: MAX_MESSAGES_PER_CONVERSATION + 2 }, (_, index) => message('user', `Q${index}`));
    const result = saveConversationMessages(conversations, chat('new'), messages, '2026-10-04T12:00:00Z');
    expect(result).toHaveLength(MAX_CONVERSATIONS);
    expect(result[0].id).toBe('new');
    expect(result.at(-1)?.id).toBe('old-28');
    expect(result[0].messages).toHaveLength(MAX_MESSAGES_PER_CONVERSATION);
    expect(result[0].messages[0].content).toBe('Q2');
  });

  it('removes only the requested conversation', () => {
    const conversations = [chat('one'), chat('two'), chat('one-other')];
    expect(removeConversation(conversations, 'one').map((item) => item.id)).toEqual(['two', 'one-other']);
  });

  it('formats conversation dates relative to a fixed now', () => {
    const now = new Date('2026-10-04T12:00:00');
    expect(conversationDateLabel('2026-10-04T08:00:00', now)).toBe('Today');
    expect(conversationDateLabel('2026-10-03T08:00:00', now)).toBe('Yesterday');
    expect(conversationDateLabel('2026-10-03T08:00:00Z', new Date('2026-12-20T12:00:00Z'))).toBe('3 Oct');
    expect(conversationDateLabel('2025-10-03T08:00:00Z', new Date('2026-12-20T12:00:00Z'))).toContain('2025');
    expect(conversationDateLabel('not-a-date', now)).toBe('');
  });

  it('parses only valid stored conversation arrays', () => {
    const valid = JSON.stringify([chat('valid')]);
    expect(parseStoredConversations<Message>(null)).toEqual([]);
    expect(parseStoredConversations<Message>('not json')).toEqual([]);
    expect(parseStoredConversations<Message>(JSON.stringify({ id: 'nope' }))).toEqual([]);
    expect(parseStoredConversations<Message>(JSON.stringify([{ id: 'missing-title', messages: [] }, { id: 'missing-messages', title: 'x' }]))).toEqual([]);
    expect(parseStoredConversations<Message>(valid)).toHaveLength(1);
  });
});
