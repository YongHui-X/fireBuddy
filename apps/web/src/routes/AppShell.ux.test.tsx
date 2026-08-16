import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AppShell from './AppShell';


const mocks = vi.hoisted(() => ({
  accounts: [] as Array<Record<string, unknown>>,
  notify: vi.fn(),
  signOut: vi.fn(),
  transactions: [] as Array<Record<string, unknown>>,
}));

vi.mock('../app/FireBuddyProvider', async () => {
  const actual = await vi.importActual<typeof import('../app/FireBuddyProvider')>('../app/FireBuddyProvider');
  return {
    ...actual,
    useFireBuddy: () => ({
      accounts: mocks.accounts,
      categories: [],
      deleteTransaction: vi.fn(),
      dismissNotification: vi.fn(),
      getAccountById: vi.fn(),
      getCategoryById: vi.fn(),
      notification: null,
      notify: mocks.notify,
      session: {
        access_token: 'access-token',
        user: { email: 'ben@firebuddy.test', user_metadata: { name: 'Ben' } },
      },
      signOut: mocks.signOut,
      syncStatus: 'ready',
      themeMode: 'light',
      toggleTheme: vi.fn(),
      transactions: mocks.transactions,
      updateTransaction: vi.fn(),
    }),
  };
});

describe('App shell UX', () => {
  beforeEach(() => {
    window.localStorage.clear();
    mocks.notify.mockReset();
    mocks.signOut.mockReset().mockResolvedValue(undefined);
    mocks.transactions.length = 0;
    mocks.accounts.length = 0;
  });

  it('places logout directly above Add Transaction and asks for confirmation', async () => {
    render(<MemoryRouter initialEntries={['/']}><AppShell /></MemoryRouter>);

    const logoutButton = screen.getByRole('button', { name: 'Log out' });
    const addButton = screen.getByRole('button', { name: 'Add Transaction' });
    const position = logoutButton.compareDocumentPosition(addButton);

    expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.click(logoutButton);

    const dialog = screen.getByRole('dialog', { name: 'Log out?' });
    expect(mocks.signOut).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog', { name: 'Log out?' })).toBeNull();

    fireEvent.click(logoutButton);
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Log out?' })).getByRole('button', { name: 'Log out' }));
    await waitFor(() => expect(mocks.signOut).toHaveBeenCalledOnce());
  });

  it('labels the profile action Log out and uses the shared confirmation dialog', async () => {
    render(<MemoryRouter initialEntries={['/profile']}><AppShell /></MemoryRouter>);

    const logoutButtons = screen.getAllByRole('button', { name: 'Log out' });
    expect(logoutButtons).toHaveLength(2);
    fireEvent.click(logoutButtons[1]);

    const dialog = screen.getByRole('dialog', { name: 'Log out?' });
    expect(mocks.signOut).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Log out' }));
    await waitFor(() => expect(mocks.signOut).toHaveBeenCalledOnce());
  });

  it('opens Ember from the Home card and keeps it outside the four mobile tabs', async () => {
    render(<MemoryRouter initialEntries={['/']}><AppShell /></MemoryRouter>);

    expect(screen.getByRole('link', { name: 'Ember' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'FireBuddy' })).toBeTruthy();
    expect(document.querySelector('.sidebar-brand-mark')).not.toBeNull();
    const mobileNavigation = screen.getByRole('navigation', { name: 'Primary mobile' });
    expect(within(mobileNavigation).getAllByRole('link')).toHaveLength(4);
    expect(screen.queryByRole('button', { name: 'Open FireBuddy chat' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Open Ember' }));
    expect(await screen.findByRole('heading', { name: 'Meet Ember' })).toBeTruthy();
  });

  it('shows current month income and expense totals with explicit signs', () => {
    mocks.transactions.push(
      {
        id: 'income-id',
        description: 'Salary',
        amount: 5200,
        category: 'salary',
        account: 'cash',
        date: '2026-08-14',
        transactionType: 'income',
      },
      {
        id: 'expense-id',
        description: 'Groceries',
        amount: -120.5,
        category: 'food',
        account: 'cash',
        date: '2026-08-13',
        transactionType: 'expense',
      },
    );

    render(<MemoryRouter initialEntries={['/']}><AppShell /></MemoryRouter>);

    expect(screen.getAllByText('+ S$5,200.00').length).toBeGreaterThan(0);
    expect(screen.getAllByText('- S$120.50').length).toBeGreaterThan(0);
    expect(screen.getByText('Illustrative snapshot')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'View insights' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Manage' })).toBeTruthy();
  });

  it('summarises existing accounts without inventing balances', () => {
    mocks.accounts.push({
      id: 'cash-account',
      name: 'Cash',
      type: 'cash',
      color: '#E5B24A',
      isDefault: true,
    });

    render(<MemoryRouter initialEntries={['/']}><AppShell /></MemoryRouter>);

    const accountCard = screen.getByText('Your payment accounts').closest('article');
    expect(accountCard?.textContent).toContain('Cash');
    expect(accountCard?.textContent).not.toMatch(/balance/i);
    expect(screen.getByRole('heading', { name: 'Recent transactions' })).toBeTruthy();
  });

  it('marks income and expenses with distinct transaction styles and labels', () => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    mocks.transactions.push(
      {
        id: 'income-row',
        description: 'Salary deposit',
        amount: 5200,
        category: 'salary',
        account: 'cash',
        date: `${currentMonth}-02`,
        transactionType: 'income',
      },
      {
        id: 'expense-row',
        description: 'Grocery run',
        amount: -85.4,
        category: 'food',
        account: 'cash',
        date: `${currentMonth}-01`,
        transactionType: 'expense',
      },
    );

    render(<MemoryRouter initialEntries={['/transactions']}><AppShell /></MemoryRouter>);

    const incomeCard = screen.getByText('Salary deposit').closest('article');
    const expenseCard = screen.getByText('Grocery run').closest('article');
    expect(incomeCard?.classList.contains('transaction-income')).toBe(true);
    expect(expenseCard?.classList.contains('transaction-expense')).toBe(true);
    expect(incomeCard?.textContent).toContain('Income');
    expect(expenseCard?.textContent).toContain('Expense');
  });
});
