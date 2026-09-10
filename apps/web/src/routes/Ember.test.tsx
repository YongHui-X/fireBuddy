import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiRequestError, type RagStreamHandlers } from '../api';
import { clearEmberAppActions, recordEmberAppAction } from '../app/emberAppContext';
import { EMBER_ACTIVE_TOPIC_STORAGE_KEY, EMBER_TOPICS_STORAGE_KEY } from '../app/emberState';
import Ember from './Ember';

const mocks = vi.hoisted(() => ({
  clipboardWrite: vi.fn(),
  createObjectUrl: vi.fn(),
  downloadName: '',
  scrollIntoView: vi.fn(),
  streamFinancialAdvisor: vi.fn(),
  session: { access_token: 'access-token' } as { access_token: string } | null,
}));

vi.mock('../api', async () => {
  const actual = await vi.importActual<typeof import('../api')>('../api');
  return { ...actual, streamFinancialAdvisor: mocks.streamFinancialAdvisor };
});

vi.mock('../app/FireBuddyProvider', async () => {
  const actual = await vi.importActual<typeof import('../app/FireBuddyProvider')>('../app/FireBuddyProvider');
  return { ...actual, useFireBuddy: () => ({ session: mocks.session }) };
});

function askQuestion(question: string) {
  const composer = screen.getByRole('textbox', { name: 'Ask Ember' });
  fireEvent.change(composer, { target: { value: question } });
  fireEvent.keyDown(composer, { key: 'Enter', shiftKey: false });
  return composer;
}

describe('Ember page', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1024 });
    window.localStorage.clear();
    clearEmberAppActions();
    mocks.clipboardWrite.mockReset().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: mocks.clipboardWrite },
    });
    mocks.createObjectUrl.mockReset().mockReturnValue('blob:ember-export');
    mocks.downloadName = '';
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: mocks.createObjectUrl });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function captureDownload(this: HTMLAnchorElement) {
      mocks.downloadName = this.download;
    });
    mocks.scrollIntoView.mockReset();
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: mocks.scrollIntoView,
    });
    mocks.streamFinancialAdvisor.mockReset();
    mocks.session = { access_token: 'access-token' };
  });

  it('fills and focuses the composer from a starter without sending', async () => {
    render(<Ember />);

    fireEvent.click(screen.getByRole('button', { name: /Understand CPF rates/i }));
    const composer = screen.getByRole('textbox', { name: 'Ask Ember' }) as HTMLTextAreaElement;

    await waitFor(() => expect(document.activeElement).toBe(composer));
    expect(composer.value).toContain('CPF contribution rates for 2026');
    expect(composer.maxLength).toBe(2000);
    expect(mocks.streamFinancialAdvisor).not.toHaveBeenCalled();
  });

  it('explains Ember capabilities and limitations without adding a greeting message', () => {
    render(<Ember />);

    expect(screen.getByRole('heading', { name: 'Your Singapore finance guide' })).toBeTruthy();
    expect(screen.getByText(/explain your FireBuddy spending and FIRE results/i)).toBeTruthy();
    expect(screen.getByText(/uses read only calculations, cannot change records/i)).toBeTruthy();
    expect(screen.queryByText('Ember', { selector: '.ember-message-author' })).toBeNull();
  });

  it('opens and closes chat history as a compact drawer', async () => {
    render(<Ember />);

    fireEvent.click(screen.getByRole('button', { name: 'Show chat history' }));
    const historyDialog = screen.getByRole('dialog', { name: 'Chat history' });
    expect(historyDialog.classList.contains('ember-history-panel-open')).toBe(true);
    await waitFor(() => expect(document.activeElement).toBe(within(historyDialog).getByRole('searchbox')));

    fireEvent.click(within(historyDialog).getByRole('button', { name: 'Close chat history' }));
    expect(screen.getByRole('button', { name: 'Show chat history' }).getAttribute('aria-expanded')).toBe('false');
  });

  it('filters local history by title without changing the active conversation', () => {
    const timestamp = '2026-09-03T10:00:00.000Z';
    window.localStorage.setItem(EMBER_TOPICS_STORAGE_KEY, JSON.stringify({
      version: 3,
      topics: [
        { id: 'cpf-topic', title: 'CPF contribution guide', messages: [], createdAt: timestamp, updatedAt: timestamp },
        { id: 'fire-topic', title: 'My FIRE plan', messages: [], createdAt: timestamp, updatedAt: timestamp },
      ],
    }));
    window.localStorage.setItem(EMBER_ACTIVE_TOPIC_STORAGE_KEY, 'fire-topic');
    render(<Ember />);

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search conversations' }), { target: { value: 'cpf' } });

    expect(screen.getByRole('button', { name: /^CPF contribution guide/i })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^My FIRE plan/i })).toBeNull();
    expect(screen.getByText('1 of 2 conversations')).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Conversation: My FIRE plan' })).toBeTruthy();

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search conversations' }), { target: { value: 'missing' } });
    expect(screen.getByText('No matching conversations')).toBeTruthy();
  });

  it('delegates the main navigation hamburger to the app shell', () => {
    const onToggleMainSidebar = vi.fn();
    render(<Ember isMainSidebarOpen onToggleMainSidebar={onToggleMainSidebar} />);

    fireEvent.click(screen.getByRole('button', { name: 'Hide main navigation' }));
    expect(onToggleMainSidebar).toHaveBeenCalledOnce();
  });

  it('supports Enter submission, Shift+Enter, loading, and duplicate prevention', async () => {
    let resolveRequest: (() => void) | undefined;
    let handlers: RagStreamHandlers | undefined;
    mocks.streamFinancialAdvisor.mockImplementation((_token, _input, nextHandlers) => {
      handlers = nextHandlers;
      nextHandlers.onStatus('searching', 'Searching curated sources');
      return new Promise<void>((resolve) => { resolveRequest = resolve; });
    });
    render(<Ember />);

    const composer = screen.getByRole('textbox', { name: 'Ask Ember' });
    fireEvent.change(composer, { target: { value: 'How does CPF work?' } });
    fireEvent.keyDown(composer, { key: 'Enter', shiftKey: true });
    expect(mocks.streamFinancialAdvisor).not.toHaveBeenCalled();

    fireEvent.keyDown(composer, { key: 'Enter', shiftKey: false });
    fireEvent.keyDown(composer, { key: 'Enter', shiftKey: false });

    expect(mocks.streamFinancialAdvisor).toHaveBeenCalledOnce();
    expect(screen.getByRole('status').textContent).toContain('Understanding your question');
    expect((composer as HTMLTextAreaElement).disabled).toBe(true);

    await act(async () => {
      handlers?.onStatus('preparing', 'Preparing a grounded answer');
    });
    expect(screen.getByRole('status').textContent).toContain('Preparing your answer');
    await act(async () => {
      handlers?.onDelta('CPF is a social ');
      handlers?.onDelta('security savings system.');
      handlers?.onSources([]);
      handlers?.onDone?.();
      resolveRequest?.();
    });
    expect((await screen.findAllByText('CPF is a social security savings system.')).length).toBeGreaterThan(0);
    expect((composer as HTMLTextAreaElement).disabled).toBe(false);
  });

  it('includes optional page and recent action context from the full Ember route', async () => {
    recordEmberAppAction('update', 'Updated FIRE assumptions', new Date('2026-09-03T08:00:00.000Z'));
    mocks.streamFinancialAdvisor.mockImplementationOnce(async (_token, _input, handlers: RagStreamHandlers) => {
      handlers.onDelta('Contextual answer');
      handlers.onSources([]);
      handlers.onDone?.();
    });
    render(<Ember appContextPathname="/ember" />);

    askQuestion('What should I review next?');
    expect((await screen.findAllByText('Contextual answer')).length).toBeGreaterThan(0);

    expect(mocks.streamFinancialAdvisor).toHaveBeenCalledWith(
      'access-token',
      expect.objectContaining({
        appContext: expect.objectContaining({
          currentPage: 'Ember',
          recentActions: [expect.objectContaining({ label: 'Updated FIRE assumptions' })],
        }),
      }),
      expect.any(Object),
    );
  });

  it('scrolls once to a new answer start and not for streamed updates', async () => {
    let resolveRequest: (() => void) | undefined;
    let handlers: RagStreamHandlers | undefined;
    mocks.streamFinancialAdvisor.mockImplementation((_token, _input, nextHandlers) => {
      handlers = nextHandlers;
      return new Promise<void>((resolve) => { resolveRequest = resolve; });
    });
    render(<Ember />);

    askQuestion('How does CPF LIFE work?');
    await waitFor(() => expect(mocks.scrollIntoView).toHaveBeenCalledTimes(1));

    await act(async () => {
      handlers?.onDelta('First part. ');
      handlers?.onDelta('Second part.');
      handlers?.onSources([{ title: 'CPF LIFE', headline: null, url: 'https://cpf.gov.sg/life', path: null }]);
      handlers?.onDone?.();
      resolveRequest?.();
    });

    expect(mocks.scrollIntoView).toHaveBeenCalledTimes(1);
    expect(mocks.scrollIntoView).toHaveBeenCalledWith({ block: 'start', behavior: 'smooth' });
  });

  it('keeps citations with their answer and safely renders headings and lists', async () => {
    mocks.streamFinancialAdvisor
      .mockImplementationOnce(async (_token, _input, handlers: RagStreamHandlers) => {
        handlers.onStatus('searching', 'Searching curated sources');
        handlers.onDelta('# CPF overview\n\n- First point\n- Second point\n\n<script>unsafe()</script>');
        handlers.onSources([{ title: 'CPF guide', headline: 'Contribution overview', url: 'https://cpf.gov.sg/guide', path: null }]);
        handlers.onDone?.();
      })
      .mockImplementationOnce(async (_token, _input, handlers: RagStreamHandlers) => {
        handlers.onStatus('preparing', 'Preparing a grounded answer');
        handlers.onDelta('## IRAS overview\n\n1. Relief\n2. Eligibility');
        handlers.onSources([{ title: 'IRAS relief guide', headline: 'Reliefs', url: 'https://iras.gov.sg/reliefs', path: null }]);
        handlers.onDone?.();
      });
    render(<Ember />);

    askQuestion('Explain CPF');
    const cpfHeading = await screen.findByRole('heading', { name: 'CPF overview' });
    const firstBubble = cpfHeading.closest('.ember-message-bubble');
    expect(firstBubble).not.toBeNull();
    expect(within(firstBubble as HTMLElement).getByRole('link', { name: /CPF guide/i })).toBeTruthy();
    expect(within(firstBubble as HTMLElement).getByText('<script>unsafe()</script>')).toBeTruthy();
    expect(firstBubble?.querySelector('script')).toBeNull();

    askQuestion('Explain IRAS reliefs');
    const irasHeading = await screen.findByRole('heading', { name: 'IRAS overview' });
    const secondBubble = irasHeading.closest('.ember-message-bubble');
    expect(within(secondBubble as HTMLElement).getByRole('link', { name: /IRAS relief guide/i })).toBeTruthy();
    expect(within(secondBubble as HTMLElement).queryByText('CPF guide')).toBeNull();
    expect(within(firstBubble as HTMLElement).getByText('CPF guide')).toBeTruthy();
  });

  it('reveals citation overflow in place with accessible controls', async () => {
    mocks.streamFinancialAdvisor.mockImplementationOnce(async (_token, _input, handlers: RagStreamHandlers) => {
      handlers.onDelta('Grounded answer');
      handlers.onSources([
        { title: 'Source one', headline: null, url: 'https://example.com/1', path: null },
        { title: 'Source two', headline: null, url: 'https://example.com/2', path: null },
        { title: 'Source three', headline: null, url: 'https://example.com/3', path: null },
        { title: 'Source four', headline: null, url: 'https://example.com/4', path: null },
      ]);
      handlers.onDone?.();
    });
    render(<Ember />);

    askQuestion('Explain these sources');
    expect(await screen.findByText('Source one')).toBeTruthy();
    expect(screen.queryByText('Source three')).toBeNull();

    const expand = screen.getByRole('button', { name: 'Show 2 more' });
    expect(expand.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(expand);
    expect(screen.getByText('Source three')).toBeTruthy();
    expect(screen.getByText('Source four')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Show fewer' }));
    expect(screen.queryByText('Source three')).toBeNull();
  });

  it('shows completed follow ups and fills the composer without submitting', async () => {
    mocks.streamFinancialAdvisor.mockImplementationOnce(async (_token, _input, handlers: RagStreamHandlers) => {
      handlers.onDelta('CPF contribution guidance.');
      handlers.onSources([{ title: 'CPF contribution rates', headline: null, url: 'https://cpf.gov.sg/rates', path: null }]);
      handlers.onDone?.();
    });
    render(<Ember />);

    askQuestion('How do CPF contribution rates work?');
    const suggestion = await screen.findByRole('button', { name: 'How are CPF contributions allocated across my CPF accounts?' });
    fireEvent.click(suggestion);

    const composer = screen.getByRole('textbox', { name: 'Ask Ember' }) as HTMLTextAreaElement;
    await waitFor(() => expect(document.activeElement).toBe(composer));
    expect(composer.value).toBe('How are CPF contributions allocated across my CPF accounts?');
    expect(mocks.streamFinancialAdvisor).toHaveBeenCalledOnce();
  });

  it('collapses and restores the desktop history rail', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1440 });
    render(<Ember />);

    const layout = document.querySelector('.ember-layout') as HTMLElement;
    expect(layout.classList.contains('ember-layout-history-open')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Hide chat history' }));
    expect(layout.classList.contains('ember-layout-history-closed')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Show chat history' }));
    expect(layout.classList.contains('ember-layout-history-open')).toBe(true);
  });

  it('copies user and Ember message text with visible success feedback', async () => {
    mocks.streamFinancialAdvisor.mockImplementationOnce(async (_token, _input, handlers: RagStreamHandlers) => {
      handlers.onDelta('A grounded Ember answer.');
      handlers.onSources([]);
      handlers.onDone?.();
    });
    render(<Ember />);

    askQuestion('Copy this question');
    const emberCopyButton = screen.getByRole('button', { name: 'Copy Ember message' }) as HTMLButtonElement;
    await waitFor(() => expect(emberCopyButton.disabled).toBe(false));

    fireEvent.click(screen.getByRole('button', { name: 'Copy your message' }));
    await waitFor(() => expect(mocks.clipboardWrite).toHaveBeenCalledWith('Copy this question'));
    expect(screen.getByRole('button', { name: 'Copied your message' })).toBeTruthy();

    fireEvent.click(emberCopyButton);
    await waitFor(() => expect(mocks.clipboardWrite).toHaveBeenCalledWith('A grounded Ember answer.'));
    expect(screen.getByRole('button', { name: 'Copied Ember message' })).toBeTruthy();
    expect(screen.getByText('Message copied to clipboard.')).toBeTruthy();
  });

  it('copies and downloads the same complete Markdown conversation', async () => {
    mocks.streamFinancialAdvisor.mockImplementationOnce(async (_token, _input, handlers: RagStreamHandlers) => {
      handlers.onDelta('A cited answer.');
      handlers.onSources([{ title: 'Safe guide', headline: null, url: 'https://example.com/guide', path: null }]);
      handlers.onDone?.();
    });
    render(<Ember />);

    const copyButton = screen.getByRole('button', { name: 'Copy conversation' }) as HTMLButtonElement;
    const downloadButton = screen.getByRole('button', { name: 'Download Markdown' }) as HTMLButtonElement;
    expect(copyButton.disabled).toBe(true);
    expect(downloadButton.disabled).toBe(true);

    askQuestion('Export this topic');
    await waitFor(() => expect(copyButton.disabled).toBe(false));
    fireEvent.click(copyButton);
    await waitFor(() => expect(mocks.clipboardWrite).toHaveBeenCalledOnce());
    const copiedMarkdown = mocks.clipboardWrite.mock.calls[0][0] as string;
    expect(copiedMarkdown).toContain('## You\n\nExport this topic');
    expect(copiedMarkdown).toContain('[Safe guide](https://example.com/guide)');

    fireEvent.click(downloadButton);
    const exportedBlob = mocks.createObjectUrl.mock.calls[0][0] as Blob;
    expect(await exportedBlob.text()).toBe(copiedMarkdown);
    expect(mocks.downloadName).toMatch(/^firebuddy-ember-export-this-topic-\d{4}-\d{2}-\d{2}\.md$/);
  });

  it.each([
    [429, 'reached the request limit'],
    [503, 'temporarily unavailable'],
  ])('shows a retryable inline failure for status %s', async (status, expectedCopy) => {
    mocks.streamFinancialAdvisor
      .mockRejectedValueOnce(new ApiRequestError('Backend failure', status))
      .mockImplementationOnce(async (_token, _input, handlers: RagStreamHandlers) => {
        handlers.onDelta('Recovered answer');
        handlers.onSources([]);
        handlers.onDone?.();
      });
    render(<Ember />);

    askQuestion('What is CPF?');
    expect(await screen.findByText(new RegExp(expectedCopy, 'i'))).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    expect((await screen.findAllByText('Recovered answer')).length).toBeGreaterThan(0);
    expect(mocks.streamFinancialAdvisor).toHaveBeenCalledTimes(2);
  });

  it('explains when the curated knowledge base is unavailable', async () => {
    mocks.streamFinancialAdvisor.mockRejectedValueOnce(
      new ApiRequestError(
        "Ember's curated sources are temporarily unavailable.",
        503,
        'knowledge_base_unavailable',
      ),
    );
    render(<Ember />);

    askQuestion('What is CPF?');

    expect(await screen.findByText(/curated sources are temporarily unavailable/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy();
  });

  it('shows authentication and empty-answer failures inline', async () => {
    mocks.session = null;
    render(<Ember />);

    askQuestion('What is SRS?');
    expect(await screen.findByText(/session is no longer available/i)).toBeTruthy();
    expect(mocks.streamFinancialAdvisor).not.toHaveBeenCalled();
  });

  it('handles an empty service answer and creates switchable persisted topics', async () => {
    mocks.streamFinancialAdvisor.mockImplementation(async (_token, _input, handlers: RagStreamHandlers) => {
      handlers.onDone?.();
    });
    render(<Ember />);

    askQuestion('Explain SSBs');
    expect(await screen.findByText(/returned an empty answer/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'New chat' }));
    expect(screen.getAllByText('New chat').length).toBeGreaterThan(0);
    expect(window.localStorage.getItem(EMBER_TOPICS_STORAGE_KEY)).toContain('Explain SSBs');
    const topicButton = screen.getByRole('button', { name: /^Explain SSBs/i });
    fireEvent.click(topicButton);
    expect(screen.getByRole('region', { name: 'Conversation: Explain SSBs' })).toBeTruthy();
  });

  it('confirms deletion of a past conversation and persists the remaining history', async () => {
    const timestamp = '2026-08-23T10:00:00.000Z';
    window.localStorage.setItem(EMBER_TOPICS_STORAGE_KEY, JSON.stringify({
      version: 3,
      topics: [
        { id: 'past-topic', title: 'Past CPF chat', messages: [], createdAt: timestamp, updatedAt: timestamp },
        { id: 'current-topic', title: 'Current FIRE chat', messages: [], createdAt: timestamp, updatedAt: timestamp },
      ],
    }));
    window.localStorage.setItem(EMBER_ACTIVE_TOPIC_STORAGE_KEY, 'current-topic');
    render(<Ember />);

    fireEvent.click(screen.getByRole('button', { name: 'Delete conversation Past CPF chat' }));
    const firstDialog = screen.getByRole('dialog', { name: 'Delete conversation?' });
    expect(within(firstDialog).getByText(/cannot be undone/i)).toBeTruthy();
    fireEvent.click(within(firstDialog).getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('button', { name: /^Past CPF chat/ })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Delete conversation Past CPF chat' }));
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Delete conversation?' }))
      .getByRole('button', { name: 'Delete conversation' }));

    await waitFor(() => expect(screen.queryByRole('button', { name: /^Past CPF chat/ })).toBeNull());
    expect(screen.getByRole('region', { name: 'Conversation: Current FIRE chat' })).toBeTruthy();
    await waitFor(() => expect(window.localStorage.getItem(EMBER_TOPICS_STORAGE_KEY)).not.toContain('Past CPF chat'));
  });

  it('renders a supported-scope refusal as a normal answer', async () => {
    mocks.streamFinancialAdvisor.mockImplementationOnce(async (_token, _input, handlers: RagStreamHandlers) => {
      handlers.onDelta('Ember can only help with supported Singapore finance topics.');
      handlers.onSources([]);
      handlers.onDone?.();
    });
    render(<Ember />);

    askQuestion('Give me a recipe');
    expect((await screen.findAllByText(/only help with supported Singapore finance topics/i)).length).toBeGreaterThan(0);
    expect(screen.queryByText('Answer interrupted')).toBeNull();
  });

  it('opens new topics with suggestions and no unsolicited assistant message', () => {
    render(<Ember />);

    expect(screen.queryByText(/Hello, I am Ember/i)).toBeNull();
    expect(screen.queryByText('Ember', { selector: '.ember-message-author' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'New chat' }));
    expect(screen.queryByText(/Hello, I am Ember/i)).toBeNull();
    expect(screen.getAllByRole('button', { name: /Understand CPF rates/i }).length).toBeGreaterThan(0);
  });
});
