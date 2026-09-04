import { act, render, screen, waitFor } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AppProvider, useFireBuddy } from './FireBuddyProvider';
import {
  ACCOUNTS_STORAGE_KEY,
  CATEGORIES_STORAGE_KEY,
  TRANSACTIONS_STORAGE_KEY,
} from './demoStorage';

const mocks = vi.hoisted(() => ({
  getCategories: vi.fn(),
  getAccounts: vi.fn(),
  getTransactions: vi.fn(),
  getSession: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  updateUser: vi.fn(),
  authStateChangeHandler: null as ((event: string, session: unknown) => void) | null,
}));

vi.mock('../api', () => ({
  createAccount: vi.fn(),
  createCategory: vi.fn(),
  createTransaction: vi.fn(),
  deleteAccount: vi.fn(),
  deleteCategory: vi.fn(),
  deleteTransaction: vi.fn(),
  getAccounts: mocks.getAccounts,
  getCategories: mocks.getCategories,
  getTransactions: mocks.getTransactions,
  updateAccount: vi.fn(),
  updateCategory: vi.fn(),
  updateTransaction: vi.fn(),
}));

vi.mock('../supabase', () => ({
  hasSupabaseConfig: true,
  supabase: {
    auth: {
      getSession: mocks.getSession,
      onAuthStateChange: (handler: (event: string, session: unknown) => void) => {
        mocks.authStateChangeHandler = handler;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
      resetPasswordForEmail: mocks.resetPasswordForEmail,
      signInWithPassword: mocks.signInWithPassword,
      signOut: mocks.signOut,
      signUp: vi.fn(),
      updateUser: mocks.updateUser,
    },
  },
}));

function SyncedState() {
  const { accounts, categories, transactions, syncError, syncStatus } = useFireBuddy();
  return (
    <div>
      <span>{syncStatus}</span>
      <span>{syncError}</span>
      <span>{accounts.map((account) => account.name).join(',')}</span>
      <span>{categories.map((category) => category.name).join(',')}</span>
      <span>{transactions.map((transaction) => transaction.description).join(',')}</span>
      <span>{transactions.map((transaction) => transaction.account).join(',')}</span>
    </div>
  );
}

function AuthActions() {
  const { authError, notification, requestPasswordReset, session, signIn, themeMode, toggleTheme, updatePassword } = useFireBuddy();
  return (
    <div>
      <span>{themeMode}</span>
      <span>{session ? 'authenticated' : 'anonymous'}</span>
      <span>{authError}</span>
      <span>{notification?.message}</span>
      <button type="button" onClick={toggleTheme}>Toggle theme</button>
      <button type="button" onClick={() => signIn('alex@example.com', 'wrong-password').catch(() => undefined)}>Sign in</button>
      <button type="button" onClick={() => requestPasswordReset('alex@example.com').catch(() => undefined)}>Reset password</button>
      <button type="button" onClick={() => requestPasswordReset('demo@example.com').catch(() => undefined)}>Reset demo</button>
      <button type="button" onClick={() => updatePassword('new-password').catch(() => undefined)}>Update password</button>
    </div>
  );
}

describe('authenticated FireBuddy synchronisation', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem(
      ACCOUNTS_STORAGE_KEY,
      JSON.stringify([{ id: 'stale', name: 'Stale local account', type: 'cash', color: '#000000' }]),
    );
    window.localStorage.setItem(
      CATEGORIES_STORAGE_KEY,
      JSON.stringify([{ id: 'stale-category', name: 'Stale local category' }]),
    );
    window.localStorage.setItem(
      TRANSACTIONS_STORAGE_KEY,
      JSON.stringify([{ id: 'stale-transaction', description: 'Stale local transaction' }]),
    );
    mocks.getSession.mockResolvedValue({
      data: { session: { access_token: 'access-token', user: { id: 'user-id', email: 'sam@example.com' } } },
      error: null,
    });
    mocks.authStateChangeHandler = null;
    mocks.getCategories.mockResolvedValue([
      {
        id: 'category-id',
        userId: null,
        name: 'Food & Drink',
        icon: 'food',
        color: '#3C8A61',
        monthlyBudget: '600.00',
        categoryType: 'expense',
        isDefault: true,
        createdAt: '2026-08-14T00:00:00Z',
      },
    ]);
    mocks.getAccounts.mockResolvedValue([
      {
        id: 'account-id',
        userId: 'user-id',
        name: 'Cash',
        type: 'cash',
        color: '#E5B24A',
        lastFour: null,
        isDefault: true,
        createdAt: '2026-08-14T00:00:00Z',
        updatedAt: '2026-08-14T00:00:00Z',
      },
    ]);
    mocks.getTransactions.mockResolvedValue([
      {
        id: 'expense-id',
        userId: 'user-id',
        categoryId: 'category-id',
        accountId: 'account-id',
        description: 'Lunch',
        amount: '8.50',
        date: '2026-08-14',
        transactionType: 'expense',
        createdAt: '2026-08-14T00:00:00Z',
        updatedAt: '2026-08-14T00:00:00Z',
      },
    ]);
    mocks.resetPasswordForEmail.mockReset().mockResolvedValue({ error: null });
    mocks.signInWithPassword.mockReset().mockResolvedValue({ error: null });
    mocks.signOut.mockReset().mockResolvedValue({ error: null });
    mocks.updateUser.mockReset().mockResolvedValue({ error: null });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('loads persisted accounts and expense account selection after authentication', async () => {
    render(<AppProvider><SyncedState /></AppProvider>);

    await waitFor(() => expect(screen.getByText('ready')).toBeTruthy());
    expect(screen.getByText('Cash')).toBeTruthy();
    expect(screen.queryByText('Stale local account')).toBeNull();
    expect(screen.getByText('account-id')).toBeTruthy();
    expect(mocks.getAccounts).toHaveBeenCalledWith('access-token');
  });

  it('does not expose or retain local app data when authenticated sync fails', async () => {
    mocks.getTransactions.mockRejectedValueOnce(new Error('Backend unavailable'));

    render(<AppProvider><SyncedState /></AppProvider>);

    await waitFor(() => expect(screen.getByText('error')).toBeTruthy());
    expect(screen.getByText('Backend unavailable')).toBeTruthy();
    expect(screen.queryByText('Stale local account')).toBeNull();
    expect(screen.queryByText('Stale local category')).toBeNull();
    expect(screen.queryByText('Stale local transaction')).toBeNull();
    expect(window.localStorage.getItem(ACCOUNTS_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem(CATEGORIES_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem(TRANSACTIONS_STORAGE_KEY)).toBeNull();
  });

  it('clears the previous user data before a replacement session finishes syncing', async () => {
    render(<AppProvider><SyncedState /></AppProvider>);

    await waitFor(() => expect(screen.getByText('ready')).toBeTruthy());
    expect(screen.getByText('Cash')).toBeTruthy();
    expect(screen.getByText('Lunch')).toBeTruthy();

    mocks.getTransactions.mockRejectedValueOnce(new Error('Replacement sync failed'));
    act(() => {
      mocks.authStateChangeHandler?.('SIGNED_IN', {
        access_token: 'replacement-token',
        user: { id: 'replacement-user-id', email: 'lee@example.com' },
      });
    });

    await waitFor(() => expect(screen.getByText('Replacement sync failed')).toBeTruthy());
    expect(screen.queryByText('Cash')).toBeNull();
    expect(screen.queryByText('Lunch')).toBeNull();
    expect(screen.queryByText('Food & Drink')).toBeNull();
  });

  it('uses the system theme on first visit and persists an explicit toggle', async () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }));

    render(<AppProvider><AuthActions /></AppProvider>);

    expect(screen.getByText('dark')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Toggle theme' }));
    expect(screen.getByText('light')).toBeTruthy();
    expect(window.localStorage.getItem('firebuddy_theme_v1')).toBe('light');
  });

  it('prefers a saved theme over the device preference', () => {
    window.localStorage.setItem('firebuddy_theme_v1', 'light');
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }));

    render(<AppProvider><AuthActions /></AppProvider>);

    expect(screen.getByText('light')).toBeTruthy();
  });

  it('requests a recovery link for the public reset route', async () => {
    render(<AppProvider><AuthActions /></AppProvider>);

    fireEvent.click(screen.getByRole('button', { name: 'Reset password' }));

    await waitFor(() => expect(mocks.resetPasswordForEmail).toHaveBeenCalledWith(
      'alex@example.com',
      { redirectTo: `${window.location.origin}/reset-password` },
    ));
  });

  it('shows a safe generic message for invalid credentials', async () => {
    mocks.signInWithPassword.mockResolvedValueOnce({
      error: { code: 'invalid_credentials', message: 'Invalid login credentials' },
    });
    render(<AppProvider><AuthActions /></AppProvider>);

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(screen.getByText('Incorrect email or password.')).toBeTruthy());
  });

  it('queues the exact success toast after password sign-in succeeds', async () => {
    render(<AppProvider><AuthActions /></AppProvider>);

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(screen.getByText('You have successfully signed in.')).toBeTruthy());
  });

  it('separates authentication connection failures from invalid credentials', async () => {
    mocks.signInWithPassword.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    render(<AppProvider><AuthActions /></AppProvider>);

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(screen.getByText('Unable to reach FireBuddy right now. Check your connection and try again.')).toBeTruthy());
  });

  it('blocks recovery for the configured demo account before calling Supabase', async () => {
    vi.stubEnv('VITE_DEMO_ACCOUNT_EMAIL', 'DEMO@example.com');
    render(<AppProvider><AuthActions /></AppProvider>);

    fireEvent.click(screen.getByRole('button', { name: 'Reset demo' }));

    await waitFor(() => expect(screen.getByText('Password resets are disabled for the FireBuddy demo account.')).toBeTruthy());
    expect(mocks.resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it('updates the password for an authenticated recovery session', async () => {
    render(<AppProvider><AuthActions /></AppProvider>);

    await waitFor(() => expect(screen.getByText('authenticated')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Update password' }));

    await waitFor(() => expect(mocks.updateUser).toHaveBeenCalledWith({ password: 'new-password' }));
  });

  it('blocks a password update for an authenticated demo account', async () => {
    vi.stubEnv('VITE_DEMO_ACCOUNT_EMAIL', 'demo@example.com');
    mocks.getSession.mockResolvedValueOnce({
      data: { session: { access_token: 'access-token', user: { id: 'demo-user-id', email: 'demo@example.com' } } },
      error: null,
    });
    render(<AppProvider><AuthActions /></AppProvider>);

    await waitFor(() => expect(screen.getByText('authenticated')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Update password' }));

    await waitFor(() => expect(screen.getByText('Password resets are disabled for the FireBuddy demo account.')).toBeTruthy());
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });
});
