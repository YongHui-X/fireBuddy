import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router';

import type { RagStreamHandlers } from '../api';
import { clearEmberAppActions, recordEmberAppAction } from '../app/emberAppContext';
import { EmberFloatingAssistant } from './EmberFloatingAssistant';

const mocks = vi.hoisted(() => ({
  streamFinancialAdvisor: vi.fn(),
  aiPreference: 'personalised' as 'off' | 'guide' | 'personalised',
  setAiPreference: vi.fn(),
}));

vi.mock('../api', async () => {
  const actual = await vi.importActual<typeof import('../api')>('../api');
  return { ...actual, streamFinancialAdvisor: mocks.streamFinancialAdvisor };
});

vi.mock('../app/fireBuddyContext', async () => {
  const actual = await vi.importActual<typeof import('../app/fireBuddyContext')>('../app/fireBuddyContext');
  return { ...actual, useFireBuddy: () => ({ session: { access_token: 'access-token' }, aiPreference: mocks.aiPreference, aiPreferenceStatus: 'ready', setAiPreference: mocks.setAiPreference }) };
});

describe('floating Ember assistant', () => {
  beforeEach(() => {
    window.localStorage.clear();
    clearEmberAppActions();
    mocks.streamFinancialAdvisor.mockReset();
    mocks.aiPreference = 'personalised';
    mocks.setAiPreference.mockReset().mockResolvedValue(undefined);
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() });
  });

  it('replaces the quick chat with the consent panel when AI is off', () => {
    mocks.aiPreference = 'off';
    render(<MemoryRouter><EmberFloatingAssistant pathname="/" onOpenFullEmber={vi.fn()} /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Ask Ember about Home dashboard' }));

    expect(screen.getByRole('heading', { name: 'Turn on Ember' })).toBeTruthy();
    expect(screen.queryByRole('textbox', { name: 'Ask about this page' })).toBeNull();
    expect(mocks.streamFinancialAdvisor).not.toHaveBeenCalled();
  });

  it('opens from the page-labelled launcher and discloses shared context', async () => {
    recordEmberAppAction('create', 'Added a transaction', new Date('2026-09-03T08:00:00.000Z'));
    render(<EmberFloatingAssistant pathname="/transactions" onOpenFullEmber={vi.fn()} />);

    const launcher = screen.getByRole('button', { name: 'Ask Ember about Transactions' });
    expect(launcher.querySelector('svg')).toBeTruthy();
    expect(launcher.querySelector('.lucide-sparkles')).toBeNull();
    fireEvent.click(launcher);

    const drawer = screen.getByRole('dialog', { name: 'Ask Ember' });
    expect(within(drawer).getByText(/Using context from Transactions/i)).toBeTruthy();
    fireEvent.click(within(drawer).getByText(/Using context from Transactions/i));
    expect(within(drawer).getByText(/backend may also use a masked summary of your signed in account/i)).toBeTruthy();
    expect(within(drawer).getByText('Added a transaction')).toBeTruthy();
    await waitFor(() => expect(document.activeElement).toBe(within(drawer).getByRole('textbox', { name: 'Ask about this page' })));
  });

  it('fills the page-aware prompt without submitting', () => {
    render(<EmberFloatingAssistant pathname="/wealth" onOpenFullEmber={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ask Ember about Wealth' }));

    fireEvent.click(screen.getByRole('button', { name: /How should liquidity and CPF restrictions/i }));
    expect((screen.getByRole('textbox', { name: 'Ask about this page' }) as HTMLTextAreaElement).value)
      .toContain('liquidity and CPF restrictions');
    expect(mocks.streamFinancialAdvisor).not.toHaveBeenCalled();
  });

  it('sends bounded page and action context and saves the answer in Ember history', async () => {
    recordEmberAppAction('update', 'Updated FIRE assumptions', new Date('2026-09-03T08:00:00.000Z'));
    mocks.streamFinancialAdvisor.mockImplementationOnce(async (_token, _input, handlers: RagStreamHandlers) => {
      handlers.onStatus('searching', 'Searching');
      handlers.onDelta('Review assumptions against official guidance.');
      handlers.onSources([{ title: 'MoneySense', headline: null, url: 'https://moneysense.gov.sg', path: null }]);
      handlers.onDone?.();
    });
    render(<EmberFloatingAssistant pathname="/fire" onOpenFullEmber={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ask Ember about FIRE Planner' }));
    const composer = screen.getByRole('textbox', { name: 'Ask about this page' });
    fireEvent.change(composer, { target: { value: 'What should I review here?' } });

    await act(async () => fireEvent.submit(composer.closest('form') as HTMLFormElement));

    expect(mocks.streamFinancialAdvisor).toHaveBeenCalledWith(
      'access-token',
      expect.objectContaining({
        question: 'What should I review here?',
        appContext: expect.objectContaining({
          currentPage: 'FIRE Planner',
          currentPath: '/fire',
          recentActions: [expect.objectContaining({ label: 'Updated FIRE assumptions' })],
        }),
      }),
      expect.any(Object),
    );
    expect(await screen.findByText('Review assumptions against official guidance.')).toBeTruthy();
    await waitFor(() => expect(window.localStorage.getItem('firebuddy_ember_topics_v3')).toContain('What should I review here?'));
  });

  it('closes with Escape, restores focus, and links to the full route', async () => {
    const onOpenFullEmber = vi.fn();
    render(<EmberFloatingAssistant pathname="/" onOpenFullEmber={onOpenFullEmber} />);
    const launcher = screen.getByRole('button', { name: 'Ask Ember about Home dashboard' });
    fireEvent.click(launcher);
    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => expect(document.activeElement).toBe(launcher));

    fireEvent.click(launcher);
    fireEvent.click(screen.getByRole('button', { name: 'Open full Ember' }));
    expect(onOpenFullEmber).toHaveBeenCalledOnce();
  });

  it('stays hidden on the full Ember page', () => {
    render(<EmberFloatingAssistant pathname="/ember" onOpenFullEmber={vi.fn()} />);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByRole('dialog', { name: 'Ask Ember' })).toBeNull();
  });
});
