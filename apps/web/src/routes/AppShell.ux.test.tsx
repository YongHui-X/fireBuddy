import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AppShell from './AppShell';


const mocks = vi.hoisted(() => ({
  accounts: [] as Array<Record<string, unknown>>,
  categories: [] as Array<Record<string, unknown>>,
  essentialCategoryIds: [] as string[],
  notify: vi.fn(),
  signOut: vi.fn(),
  toggleTheme: vi.fn(),
  transactions: [] as Array<Record<string, unknown>>,
}));

vi.mock('../app/FinancialFoundationProvider', () => ({
  useFinancialFoundation: () => ({
    positions: [], snapshots: [], contributions: [], profile: null, essentialCategoryIds: mocks.essentialCategoryIds,
    status: 'ready', error: null, demoMode: true,
    summary: {
      effectiveDate: '2026-08-23', dataMode: 'demo', netWorth: null, assetTotal: null,
      liabilityTotal: null, priorMonthNetWorth: null, monthlyNetWorthChange: null,
      investableAssets: null, emergencyEligibleAssets: null, averageMonthlyEssentialSpending: null,
      emergencyRunwayMonths: null, latestSnapshotDate: null, snapshotStatus: 'missing',
      pulse: { month: '2026-08', income: '5200.00', spending: '120.50', savingsAmount: '5079.50',
        savingsRate: '0.976827', savingsRateStatus: 'available', investedAmount: '0.00', completeness: 'complete' },
      fire: { status: 'insufficient_data', effectiveDate: '2026-08-23', currentInvestableAssets: null,
        fiTarget: null, progressRate: null, progressRateCapped: null, estimatedMonths: null,
        estimatedFiYear: null, requiredMonthlyInvestment: null, assumptions: null,
        spendingBaseline: { status: 'insufficient_data', source: 'none', startDate: null, endDate: null,
          completedMonths: 0, expenseTotal: null, annualisedSpending: null }, actualPath: [], projectedPath: [], warnings: [] },
      recommendedAction: { actionType: 'add_position', title: 'Add your first wealth position', rationale: 'Net worth needs a dated value.', evidence: 'No positions', destination: '/wealth', limitations: null, ruleId: 'foundation.v1.add_position' },
      transactionAnomalies: [], warnings: [],
    },
    refresh: vi.fn(), addPosition: vi.fn(), editPosition: vi.fn(), removePosition: vi.fn(), addSnapshot: vi.fn(),
    removeSnapshot: vi.fn(), addContribution: vi.fn(), removeContribution: vi.fn(), updateProfile: vi.fn(),
    updateEssentialCategories: vi.fn(), runScenario: vi.fn(),
  }),
}));

vi.mock('../app/FireBuddyProvider', async () => {
  const actual = await vi.importActual<typeof import('../app/FireBuddyProvider')>('../app/FireBuddyProvider');
  return {
    ...actual,
    useFireBuddy: () => ({
      accounts: mocks.accounts,
      categories: mocks.categories,
      deleteTransaction: vi.fn(),
      dismissNotification: vi.fn(),
      getAccountById: vi.fn(),
      getCategoryById: (id: string) => mocks.categories.find((category) => category.id === id),
      notification: null,
      notify: mocks.notify,
      session: {
        access_token: 'access-token',
        user: { email: 'ben@firebuddy.test', user_metadata: { name: 'Ben' } },
      },
      signOut: mocks.signOut,
      syncStatus: 'ready',
      themeMode: 'light',
      toggleTheme: mocks.toggleTheme,
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
    mocks.toggleTheme.mockReset();
    mocks.transactions.length = 0;
    mocks.accounts.length = 0;
    mocks.categories.length = 0;
    mocks.essentialCategoryIds.length = 0;
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

  it('keeps Ask Ember separate from Home and outside the four mobile tabs', async () => {
    render(<MemoryRouter initialEntries={['/']}><AppShell /></MemoryRouter>);

    const assistantNavigation = screen.getByRole('navigation', { name: 'Assistant' });
    const desktopEmberLink = within(assistantNavigation).getByRole('link', { name: 'Ask Ember' });
    expect(desktopEmberLink).toBeTruthy();
    expect(within(desktopEmberLink).getByText('AI')).toBeTruthy();
    expect(desktopEmberLink.querySelector('.ember-nav-mark')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Ask Ember about Home dashboard' })).toBeTruthy();
    expect(screen.queryByText('Guide')).toBeNull();
    expect(screen.getByRole('heading', { name: 'FireBuddy' })).toBeTruthy();
    expect(document.querySelector('.sidebar-brand-mark')).not.toBeNull();
    const mobileNavigation = screen.getByRole('navigation', { name: 'Primary mobile' });
    expect(within(mobileNavigation).getAllByRole('link')).toHaveLength(4);
    expect(within(mobileNavigation).getByRole('button', { name: 'Add transaction' })).toBeTruthy();
    const mobileMoreNavigation = screen.getByRole('navigation', { name: 'More FireBuddy pages' });
    const mobileEmberLink = within(mobileMoreNavigation).getByRole('link', { name: 'Ask Ember' });
    expect(within(mobileEmberLink).getByText('AI')).toBeTruthy();
    expect(mobileEmberLink.querySelector('.ember-nav-mark')).not.toBeNull();
    expect(within(mobileMoreNavigation).getByRole('link', { name: 'Plan' })).toBeTruthy();
    expect(within(mobileMoreNavigation).getByRole('link', { name: 'Goals' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Open FireBuddy chat' })).toBeNull();

    expect(screen.queryByRole('button', { name: 'Open Ember' })).toBeNull();
    fireEvent.click(desktopEmberLink);
    expect(await screen.findByRole('heading', { name: 'Meet Ember' })).toBeTruthy();

    const mainSidebar = document.getElementById('main-sidebar') as HTMLElement;
    fireEvent.click(screen.getByRole('button', { name: 'Hide main navigation' }));
    expect(mainSidebar.hidden).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Show main navigation' }));
    expect(mainSidebar.hidden).toBe(false);
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
    expect(screen.queryByText('Illustrative snapshot')).toBeNull();
    expect(screen.getByRole('heading', { name: 'FIRE Progress' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'View projection' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'View breakdown' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Profile' })).toBeNull();
  });

  it('keeps theme and notification controls consistent across pages and the mobile shell', async () => {
    render(<MemoryRouter initialEntries={['/transactions']}><AppShell /></MemoryRouter>);

    const transactionsToolbar = screen.getByRole('heading', { name: 'Transactions' }).closest('header');
    expect(transactionsToolbar).not.toBeNull();
    const transactionActions = within(transactionsToolbar!);
    const transactionTheme = transactionActions.getByRole('button', { name: 'Switch to dark mode' });
    const transactionNotifications = transactionActions.getByRole('button', { name: 'Notifications' });
    expect(transactionTheme.compareDocumentPosition(transactionNotifications) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    fireEvent.click(transactionTheme);
    fireEvent.click(transactionNotifications);
    expect(mocks.toggleTheme).toHaveBeenCalledOnce();
    expect(mocks.notify).toHaveBeenCalledWith('No new notifications.');

    const mobileTopbar = document.querySelector('.mobile-topbar');
    expect(mobileTopbar).not.toBeNull();
    const mobileActions = within(mobileTopbar! as HTMLElement);
    fireEvent.click(mobileActions.getByRole('button', { name: 'Switch to dark mode' }));
    fireEvent.click(mobileActions.getByRole('button', { name: 'Notifications' }));
    expect(mocks.toggleTheme).toHaveBeenCalledTimes(2);
    expect(mocks.notify).toHaveBeenCalledTimes(2);

    const primaryNavigation = screen.getByRole('navigation', { name: 'Primary' });
    fireEvent.click(within(primaryNavigation).getByRole('link', { name: 'Categories' }));
    const categoriesToolbar = (await screen.findByRole('heading', { name: 'Categories' })).closest('header');
    expect(categoriesToolbar).not.toBeNull();
    expect(within(categoriesToolbar!).getByRole('button', { name: 'Switch to dark mode' })).toBeTruthy();
    expect(within(categoriesToolbar!).getByRole('button', { name: 'Notifications' })).toBeTruthy();
  });

  it('labels every monthly spending slice without a visible legend', () => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    mocks.categories.push(
      { id: 'food', name: 'Food & Drink', color: '#3C8A61', categoryType: 'expense' },
      { id: 'transport', name: 'Transport', color: '#67B47C', categoryType: 'expense' },
    );
    mocks.essentialCategoryIds.push('food');
    mocks.transactions.push(
      { id: 'food-row', description: 'Lunch', amount: -75, category: 'food', account: 'cash', date: `${currentMonth}-02`, transactionType: 'expense' },
      { id: 'transport-row', description: 'Train', amount: -25, category: 'transport', account: 'cash', date: `${currentMonth}-01`, transactionType: 'expense' },
    );

    render(<MemoryRouter initialEntries={['/']}><AppShell /></MemoryRouter>);

    const categoryKey = screen.getByRole('list', { name: 'Spending categories' });
    expect(within(categoryKey).getByText(/Food & Drink: 75\.0%, S\$75, essential/i)).toBeTruthy();
    expect(within(categoryKey).getByText(/Transport: 25\.0%, S\$25, discretionary/i)).toBeTruthy();
    expect(document.querySelector('.spending-category-key')).toBeNull();
  });

  it('shows three horizontal Money Pulse bars while retaining the recorded values', () => {
    render(<MemoryRouter initialEntries={['/']}><AppShell /></MemoryRouter>);

    const pulseCard = screen.getByRole('heading', { name: /Money Pulse$/ }).closest('article');
    expect(pulseCard).not.toBeNull();
    const pulse = within(pulseCard!);
    expect(pulse.getAllByRole('meter')).toHaveLength(3);
    expect(pulse.getByText('Recorded income')).toBeTruthy();
    expect(pulse.getByText('S$5,200')).toBeTruthy();
    expect(pulse.getByRole('meter', { name: 'Spent' }).getAttribute('aria-valuetext')).toBe('S$121');
    expect(pulse.getByRole('meter', { name: 'Saved' }).getAttribute('aria-valuetext')).toBe('S$5,080, 97.7% savings rate');
    expect(pulse.getByRole('meter', { name: 'Invested' }).getAttribute('aria-valuetext')).toBe('S$0');
  });

  it('opens Transactions with a dashboard search applied across all dates', async () => {
    mocks.transactions.push({
      id: 'older-lunch', description: 'Team lunch', amount: -42, category: 'food', account: 'cash',
      date: '2025-01-10', transactionType: 'expense',
    });

    render(<MemoryRouter initialEntries={['/']}><AppShell /></MemoryRouter>);

    const dashboardSearch = screen.getByRole('searchbox', { name: 'Search transactions' });
    fireEvent.change(dashboardSearch, { target: { value: 'Team lunch' } });
    fireEvent.submit(dashboardSearch.closest('form')!);

    expect(await screen.findByRole('heading', { name: 'Transactions' })).toBeTruthy();
    expect((screen.getByPlaceholderText('Search transactions...') as HTMLInputElement).value).toBe('Team lunch');
    expect(screen.getByText('Team lunch')).toBeTruthy();
  });

  it('opens Transactions with the complete history and keeps date filters optional', () => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    mocks.transactions.push(
      {
        id: 'current-row', description: 'Current groceries', amount: -30, category: 'food', account: 'cash',
        date: `${currentMonth}-01`, transactionType: 'expense',
      },
      {
        id: 'historical-row', description: 'Historical groceries', amount: -42, category: 'food', account: 'cash',
        date: '2025-01-10', transactionType: 'expense',
      },
    );

    render(<MemoryRouter initialEntries={['/transactions']}><AppShell /></MemoryRouter>);

    expect(screen.getByText('Current groceries')).toBeTruthy();
    expect(screen.getByText('Historical groceries')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'all' }).classList.contains('filter-chip-active')).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'month' }));
    expect(screen.getByText('Current groceries')).toBeTruthy();
    expect(screen.queryByText('Historical groceries')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'week' }));
    expect(screen.queryByText('Historical groceries')).toBeNull();
  });

  it('offers to clear filters when transaction results are empty', () => {
    mocks.transactions.push({
      id: 'visible-row', description: 'Lunch', amount: -12, category: 'food', account: 'cash',
      date: '2025-01-10', transactionType: 'expense',
    });

    render(<MemoryRouter initialEntries={['/transactions']}><AppShell /></MemoryRouter>);

    fireEvent.change(screen.getByPlaceholderText('Search transactions...'), { target: { value: 'not present' } });
    const emptyState = screen.getByRole('status');
    expect(emptyState.classList.contains('transactions-empty')).toBe(true);
    expect(within(emptyState).getByText('No transactions match these filters')).toBeTruthy();

    fireEvent.click(within(emptyState).getByRole('button', { name: 'Clear filters' }));
    expect(screen.getByText('Lunch')).toBeTruthy();
  });

  it('keeps payment accounts off Home and links recent transactions to their complete history', async () => {
    mocks.accounts.push({
      id: 'cash-account',
      name: 'Cash',
      type: 'cash',
      color: '#E5B24A',
      isDefault: true,
    });
    mocks.transactions.push({
      id: 'dashboard-history-row', description: 'Archive grocery', amount: -52, category: 'food', account: 'cash-account',
      date: '2025-02-11', transactionType: 'expense',
    });

    render(<MemoryRouter initialEntries={['/']}><AppShell /></MemoryRouter>);

    expect(screen.queryByText('Your payment accounts')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Recent transactions' })).toBeTruthy();
    const transactionButton = screen.getByText('Archive grocery').closest('button');
    expect(transactionButton).not.toBeNull();
    fireEvent.click(transactionButton!);
    expect(await screen.findByRole('heading', { name: 'Transactions' })).toBeTruthy();
    expect(screen.getByText('Archive grocery')).toBeTruthy();
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
