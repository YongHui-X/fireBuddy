import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiRequestError, type RagStreamHandlers } from '../api';
import { EMBER_TOPICS_STORAGE_KEY } from '../app/emberState';
import Ember from './Ember';

const mocks = vi.hoisted(() => ({
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
    window.localStorage.clear();
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
    expect(screen.getByRole('status').textContent).toContain('Searching curated sources');
    expect((composer as HTMLTextAreaElement).disabled).toBe(true);

    await act(async () => {
      handlers?.onStatus('preparing', 'Preparing a grounded answer');
    });
    expect(screen.getByRole('status').textContent).toContain('Preparing a grounded answer');
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

    fireEvent.click(screen.getAllByRole('button', { name: 'Start new chat' })[0]);
    expect(screen.getAllByText('New chat').length).toBeGreaterThan(0);
    expect(window.localStorage.getItem(EMBER_TOPICS_STORAGE_KEY)).toContain('Explain SSBs');
    const topicButton = screen.getByRole('button', { name: /Explain SSBs/i });
    fireEvent.click(topicButton);
    expect(screen.getByRole('heading', { name: 'Explain SSBs' })).toBeTruthy();
  });

  it('renders refusal and no-match responses as normal answers', async () => {
    mocks.streamFinancialAdvisor
      .mockImplementationOnce(async (_token, _input, handlers: RagStreamHandlers) => {
        handlers.onDelta('Ember can only help with supported Singapore finance topics.');
        handlers.onSources([]);
        handlers.onDone?.();
      })
      .mockImplementationOnce(async (_token, _input, handlers: RagStreamHandlers) => {
        handlers.onDelta('Ember could not find relevant information in the FireBuddy knowledge base.');
        handlers.onSources([]);
        handlers.onDone?.();
      });
    render(<Ember />);

    askQuestion('Give me a recipe');
    expect((await screen.findAllByText(/only help with supported Singapore finance topics/i)).length).toBeGreaterThan(0);
    askQuestion('Explain an unsupported scheme');
    expect((await screen.findAllByText(/could not find relevant information/i)).length).toBeGreaterThan(0);
    expect(screen.queryByText('Answer interrupted')).toBeNull();
  });

  it('opens new topics with suggestions and no unsolicited assistant message', () => {
    render(<Ember />);

    expect(screen.queryByText(/Hello, I am Ember/i)).toBeNull();
    expect(screen.queryByText('Ember', { selector: '.ember-message-author' })).toBeNull();
    fireEvent.click(screen.getAllByRole('button', { name: 'Start new chat' })[0]);
    expect(screen.queryByText(/Hello, I am Ember/i)).toBeNull();
    expect(screen.getAllByRole('button', { name: /Understand CPF rates/i }).length).toBeGreaterThan(0);
  });
});
