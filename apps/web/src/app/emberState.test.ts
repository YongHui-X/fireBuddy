import { describe, expect, it } from 'vitest';

import {
  EMBER_ACTIVE_TOPIC_STORAGE_KEY,
  EMBER_GREETING,
  EMBER_TOPICS_STORAGE_KEY,
  LEGACY_EMBER_ACTIVE_TOPIC_STORAGE_KEY,
  LEGACY_EMBER_TOPICS_STORAGE_KEY,
  LEGACY_CHAT_ACTIVE_TOPIC_STORAGE_KEY,
  LEGACY_CHAT_TOPICS_STORAGE_KEY,
  getSafeExternalUrl,
  loadEmberState,
  saveEmberTopics,
  toRagChatHistory,
} from './emberState';

function createMemoryStorage(entries: Record<string, string> = {}) {
  const values = new Map(Object.entries(entries));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    values,
  };
}

describe('Ember local history', () => {
  it('copies legacy topics without changing their old keys and attaches citations to the latest assistant answer', () => {
    const legacyTopics = [{
      id: 'legacy-topic',
      title: 'CPF rates',
      messages: [
        { role: 'assistant', content: 'Welcome' },
        { role: 'user', content: 'What are the rates?' },
        { role: 'assistant', content: 'Here are the rates.' },
      ],
      sources: ['Fallback source'],
      sourceDetails: [{ title: 'CPF contribution rates', headline: 'Rates for 2026', url: 'https://cpf.gov.sg/rates' }],
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-02T00:00:00.000Z',
    }];
    const storage = createMemoryStorage({
      [LEGACY_CHAT_TOPICS_STORAGE_KEY]: JSON.stringify(legacyTopics),
      [LEGACY_CHAT_ACTIVE_TOPIC_STORAGE_KEY]: 'legacy-topic',
    });

    const loaded = loadEmberState(storage);
    const latestAssistant = loaded.topics[0].messages[2];

    expect(loaded.migratedLegacyHistory).toBe(true);
    expect(loaded.activeTopicId).toBe('legacy-topic');
    expect(latestAssistant.sources).toEqual([{
      title: 'CPF contribution rates',
      headline: 'Rates for 2026',
      url: 'https://cpf.gov.sg/rates',
    }]);
    expect(storage.getItem(LEGACY_CHAT_TOPICS_STORAGE_KEY)).toBe(JSON.stringify(legacyTopics));

    saveEmberTopics(storage, loaded.topics);
    expect(JSON.parse(storage.getItem(EMBER_TOPICS_STORAGE_KEY) ?? '{}').version).toBe(2);
  });

  it('prefers Ember history and validates the active topic', () => {
    const storage = createMemoryStorage();
    const initial = loadEmberState(storage);
    saveEmberTopics(storage, initial.topics);
    storage.setItem(EMBER_ACTIVE_TOPIC_STORAGE_KEY, 'missing-topic');

    const reloaded = loadEmberState(storage);

    expect(reloaded.migratedLegacyHistory).toBe(false);
    expect(reloaded.activeTopicId).toBe(initial.topics[0].id);
  });

  it('excludes error placeholders from normalized API history', () => {
    const messages = [
      { id: 'one', role: 'user' as const, content: 'Question', createdAt: '', sources: [], status: 'complete' as const },
      {
        id: 'two',
        role: 'assistant' as const,
        content: '',
        createdAt: '',
        sources: [],
        status: 'complete' as const,
        error: { kind: 'unavailable' as const, message: 'Try again', retryable: true, retryOfMessageId: 'one' },
      },
    ];

    expect(toRagChatHistory(messages)).toEqual([{ role: 'user', content: 'Question' }]);
  });

  it('allows only safe external citation protocols', () => {
    expect(getSafeExternalUrl('https://example.com/source')).toBe('https://example.com/source');
    expect(getSafeExternalUrl('javascript:alert(1)')).toBeUndefined();
    expect(getSafeExternalUrl('/relative')).toBeUndefined();
  });

  it('allows empty topics and removes only the exact seeded v1 greeting', () => {
    const v1Payload = {
      version: 1,
      topics: [{
        id: 'empty-topic',
        title: 'New chat',
        messages: [{
          id: 'seeded-greeting',
          role: 'assistant',
          content: EMBER_GREETING,
          createdAt: '2026-08-01T00:00:00.000Z',
          sources: [],
        }],
        createdAt: '2026-08-01T00:00:00.000Z',
        updatedAt: '2026-08-01T00:00:00.000Z',
      }],
    };
    const original = JSON.stringify(v1Payload);
    const storage = createMemoryStorage({
      [LEGACY_EMBER_TOPICS_STORAGE_KEY]: original,
      [LEGACY_EMBER_ACTIVE_TOPIC_STORAGE_KEY]: 'empty-topic',
    });

    const loaded = loadEmberState(storage);

    expect(loaded.migratedLegacyHistory).toBe(true);
    expect(loaded.activeTopicId).toBe('empty-topic');
    expect(loaded.topics[0].messages).toEqual([]);
    expect(storage.getItem(LEGACY_EMBER_TOPICS_STORAGE_KEY)).toBe(original);
  });

  it('turns a persisted interrupted stream into a retryable saved error', () => {
    const storage = createMemoryStorage({
      [EMBER_TOPICS_STORAGE_KEY]: JSON.stringify({
        version: 2,
        topics: [{
          id: 'stream-topic',
          title: 'CPF question',
          messages: [
            { id: 'user-message', role: 'user', content: 'What is CPF?', createdAt: '', sources: [], status: 'complete' },
            { id: 'assistant-message', role: 'assistant', content: 'Partial', createdAt: '', sources: [], status: 'streaming', streamStatus: 'preparing' },
          ],
          createdAt: '',
          updatedAt: '',
        }],
      }),
    });

    const loaded = loadEmberState(storage);
    const interrupted = loaded.topics[0].messages[1];

    expect(interrupted.status).toBe('complete');
    expect(interrupted.content).toBe('');
    expect(interrupted.error?.retryable).toBe(true);
    expect(interrupted.error?.retryOfMessageId).toBe('user-message');
  });
});
