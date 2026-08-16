import { afterEach, describe, expect, it, vi } from 'vitest';

import { askFinancialAdvisor, getAccounts, streamFinancialAdvisor } from './api';


afterEach(() => {
  vi.unstubAllGlobals();
});

describe('web API errors', () => {
  it('returns account payloads for authenticated synchronisation', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([{ id: 'account-id', name: 'Cash' }]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(getAccounts('access-token')).resolves.toEqual([{ id: 'account-id', name: 'Cash' }]);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8000/accounts',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer access-token' }) }),
    );
  });

  it('presents the backend detail for conflicts and service failures', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ detail: 'The default account cannot be deleted' }), {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    await expect(getAccounts('access-token')).rejects.toThrow('The default account cannot be deleted');
  });

  it('sends only the latest six chat messages without changing the stored transcript', async () => {
    const transcript = Array.from({ length: 10 }, (_, index) => ({
      role: index % 2 === 0 ? 'user' as const : 'assistant' as const,
      content: `  message ${index + 1}\nwith   spacing  `,
    }));
    window.localStorage.setItem('test-chat-transcript', JSON.stringify(transcript));
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ answer: 'Answer', sources: [], source_details: [] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    await askFinancialAdvisor('access-token', {
      question: 'What is CPF?',
      history: transcript,
    });

    const request = fetchMock.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(request.body as string) as {
      history: Array<{ role: string; content: string }>;
    };
    expect(body.history).toEqual(
      transcript.slice(-6).map((message) => ({
        ...message,
        content: message.content.replace(/\s+/g, ' ').trim(),
      })),
    );
    expect(transcript).toHaveLength(10);
    expect(JSON.parse(window.localStorage.getItem('test-chat-transcript') ?? '[]')).toHaveLength(10);
  });

  it('reads ordered SSE status, deltas, sources, and completion events', async () => {
    const eventBody = [
      'event: status\ndata: {"status":"searching","message":"Searching curated sources"}',
      'event: status\ndata: {"status":"preparing","message":"Preparing a grounded answer"}',
      'event: delta\ndata: {"text":"CPF "}',
      'event: delta\ndata: {"text":"answer"}',
      'event: sources\ndata: {"sources":[{"title":"CPF","url":"https://cpf.gov.sg","path":null,"headline":null}]}',
      'event: done\ndata: {}',
      '',
    ].join('\n\n');
    const fetchMock = vi.fn().mockResolvedValue(new Response(eventBody, {
      status: 200,
      headers: { 'Content-Type': 'text/event-stream; charset=utf-8' },
    }));
    vi.stubGlobal('fetch', fetchMock);
    const events: string[] = [];

    await streamFinancialAdvisor('access-token', { question: 'What is CPF?', history: [] }, {
      onStatus: (status) => events.push(status),
      onDelta: (text) => events.push(text),
      onSources: (sources) => events.push(sources[0].title ?? ''),
      onDone: () => events.push('done'),
    });

    expect(events).toEqual(['searching', 'preparing', 'CPF ', 'answer', 'CPF', 'done']);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8000/api/chat/financial-advisor/stream',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer access-token', Accept: 'text/event-stream' }),
      }),
    );
  });

  it('preserves an SSE error status for retry classification', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
      'event: error\ndata: {"code":"rate_limit","message":"Try again shortly.","retryable":true,"status":429}\n\n',
      { status: 429, headers: { 'Content-Type': 'text/event-stream' } },
    )));

    await expect(streamFinancialAdvisor('access-token', { question: 'What is CPF?', history: [] }, {
      onStatus: vi.fn(),
      onDelta: vi.fn(),
      onSources: vi.fn(),
    })).rejects.toMatchObject({ status: 429, name: 'ApiRequestError' });
  });
});
