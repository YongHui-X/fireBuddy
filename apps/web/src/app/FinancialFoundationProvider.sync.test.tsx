import { StrictMode } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FinancialSummary, WealthPosition } from '@firebuddy/shared';
import { FinancialFoundationProvider, useFinancialFoundation } from './FinancialFoundationProvider';
import type { useFireBuddy } from './FireBuddyProvider';

const mocks = vi.hoisted(() => ({
  useFireBuddy: vi.fn(),
  getWealthPositions: vi.fn(),
  getWealthContributions: vi.fn(),
  getFireProfile: vi.fn(),
  getEssentialCategories: vi.fn(),
  getFinancialSummary: vi.fn(),
  getWealthSnapshotHistory: vi.fn(),
}));
vi.mock('./FireBuddyProvider', () => ({ useFireBuddy: mocks.useFireBuddy }));
vi.mock('../api', () => ({
  ...mocks,
  calculateFireScenario: vi.fn(), createWealthContribution: vi.fn(), createWealthPosition: vi.fn(),
  createWealthSnapshot: vi.fn(), deleteWealthContribution: vi.fn(), deleteWealthPosition: vi.fn(),
  deleteWealthSnapshot: vi.fn(), saveEssentialCategories: vi.fn(), saveFireProfile: vi.fn(), updateWealthPosition: vi.fn(),
}));

type AppState = Pick<ReturnType<typeof useFireBuddy>, 'session' | 'demoMode' | 'transactions' | 'categories'>;
let appState: AppState;
const summary = (spending: string) => ({ pulse: { spending } }) as FinancialSummary;
const position = (name: string) => ({ id: name, name, latestSnapshot: null }) as WealthPosition;

/** Let tests deliver responses out of order, even after their signal was aborted. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function Probe() {
  const { summary, positions, snapshots, status, error, refresh, loadSnapshotHistory } = useFinancialFoundation();
  return <>
    <output data-testid="spending">{summary?.pulse.spending ?? 'unavailable'}</output>
    <output data-testid="positions">{positions.map(item => item.name).join(',')}</output>
    <output data-testid="snapshots">{snapshots.length}</output>
    <output data-testid="status">{status}</output>
    <output data-testid="error">{error}</output>
    <button onClick={() => void refresh()}>Refresh</button>
    <button onClick={loadSnapshotHistory}>History</button>
  </>;
}

const tree = () => <FinancialFoundationProvider><Probe /></FinancialFoundationProvider>;

describe('authenticated financial state', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    appState = {
      session: { access_token: 'token-a', user: { id: 'owner-a' } } as AppState['session'],
      demoMode: false, transactions: [], categories: [],
    };
    mocks.useFireBuddy.mockImplementation(() => appState);
    mocks.getWealthPositions.mockResolvedValue([position('A wealth')]);
    mocks.getWealthContributions.mockResolvedValue([]);
    mocks.getFireProfile.mockResolvedValue({ configured: false, profile: null });
    mocks.getEssentialCategories.mockResolvedValue({ categoryIds: [] });
    mocks.getFinancialSummary.mockResolvedValue(summary('10'));
    mocks.getWealthSnapshotHistory.mockResolvedValue([]);
  });

  it('discards late responses across logout and account switching', async () => {
    const old = deferred<WealthPosition[]>();
    mocks.getWealthPositions.mockReturnValueOnce(old.promise);
    const view = render(tree());
    await waitFor(() => expect(mocks.getWealthPositions).toHaveBeenCalledTimes(1));
    const oldSignal = mocks.getWealthPositions.mock.calls[0][1] as AbortSignal;
    appState = { ...appState, session: null };
    view.rerender(tree());
    expect(oldSignal.aborted).toBe(true);
    mocks.getWealthPositions.mockResolvedValue([position('B wealth')]);
    appState = { ...appState, session: { access_token: 'token-b', user: { id: 'owner-b' } } as AppState['session'] };
    view.rerender(tree());
    await waitFor(() => expect(screen.getByTestId('positions').textContent).toBe('B wealth'));
    await act(async () => old.resolve([position('Private A wealth')]));
    expect(screen.getByTestId('positions').textContent).toBe('B wealth');
    expect(screen.getByTestId('error').textContent).toBe('');
  });

  it('ignores a superseded refresh even if the transport resolves it last', async () => {
    const old = deferred<WealthPosition[]>();
    mocks.getWealthPositions.mockReturnValueOnce(old.promise);
    render(tree());
    fireEvent.click(screen.getByText('Refresh'));
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('ready'));
    await act(async () => old.resolve([position('Obsolete wealth')]));
    expect(screen.getByTestId('positions').textContent).toBe('A wealth');
  });

  it('refreshes summaries for additions, edits, and deletes without refetching wealth', async () => {
    const view = render(tree());
    await waitFor(() => expect(screen.getByTestId('spending').textContent).toBe('10'));
    const transaction = { id: 'transaction', amount: -20 } as AppState['transactions'][number];
    for (const [transactions, spending] of [
      [[transaction], '30'], [[{ ...transaction, amount: -40 }], '50'], [[], '10'],
    ] as [AppState['transactions'], string][]) {
      mocks.getFinancialSummary.mockResolvedValueOnce(summary(spending));
      appState = { ...appState, transactions };
      view.rerender(tree());
      await waitFor(() => expect(screen.getByTestId('spending').textContent).toBe(spending));
    }
    expect(mocks.getWealthPositions).toHaveBeenCalledTimes(1);
    expect(mocks.getWealthSnapshotHistory).not.toHaveBeenCalled();
  });

  it('keeps the latest summary when an earlier calculation finishes late', async () => {
    const old = deferred<FinancialSummary>();
    mocks.getFinancialSummary.mockReturnValueOnce(old.promise);
    const view = render(tree());
    await waitFor(() => expect(mocks.getFinancialSummary).toHaveBeenCalledTimes(1));
    const oldSignal = mocks.getFinancialSummary.mock.calls[0][2] as AbortSignal;
    mocks.getFinancialSummary.mockResolvedValueOnce(summary('40'));
    appState = { ...appState, transactions: [{ id: 'new' }] as AppState['transactions'] };
    view.rerender(tree());
    await waitFor(() => expect(screen.getByTestId('spending').textContent).toBe('40'));
    expect(oldSignal.aborted).toBe(true);
    await act(async () => old.resolve(summary('10')));
    expect(screen.getByTestId('spending').textContent).toBe('40');
  });

  it('loads history on demand and cancels it when the owner changes', async () => {
    const history = deferred<[]>();
    mocks.getWealthSnapshotHistory.mockReturnValueOnce(history.promise);
    const view = render(tree());
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('ready'));
    expect(mocks.getWealthSnapshotHistory).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('History'));
    await waitFor(() => expect(mocks.getWealthSnapshotHistory).toHaveBeenCalledTimes(1));
    const signal = mocks.getWealthSnapshotHistory.mock.calls[0][1] as AbortSignal;
    appState = { ...appState, session: null };
    view.rerender(tree());
    expect(signal.aborted).toBe(true);
    await act(async () => history.reject(new Error('Old owner history failed')));
    expect(screen.getByTestId('error').textContent).toBe('');
    expect(screen.getByTestId('snapshots').textContent).toBe('0');
  });

  it('can recover from a summary failure and survives StrictMode effect cleanup', async () => {
    mocks.getFinancialSummary.mockRejectedValueOnce(new Error('Summary unavailable'));
    render(<StrictMode>{tree()}</StrictMode>);
    await waitFor(() => expect(screen.getByTestId('error').textContent).toBe('Summary unavailable'));
    fireEvent.click(screen.getByText('Refresh'));
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('ready'));
    expect(screen.getByTestId('spending').textContent).toBe('10');
    expect(screen.getByTestId('error').textContent).toBe('');
  });
});
