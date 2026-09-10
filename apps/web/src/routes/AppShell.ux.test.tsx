import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AppShell from './AppShell';


const mocks = vi.hoisted(() => ({
  addTransaction: vi.fn(),
  accounts: [] as Array<Record<string, unknown>>,
  categories: [] as Array<Record<string, unknown>>,
  tags: [] as Array<Record<string, unknown>>,
  essentialCategoryIds: [] as string[],
  foundationError: null as string | null,
  foundationStatus: 'ready' as 'loading' | 'ready' | 'error',
  hideFoundationSummary: false,
  monthlyNetWorthChange: null as number | null,
  netWorth: null as number | null,
  notify: vi.fn(),
  refreshFoundation: vi.fn(),
  signOut: vi.fn(),
  toggleTheme: vi.fn(),
  transactions: [] as Array<Record<string, unknown>>,
}));

vi.mock('../app/FinancialFoundationProvider', () => ({
  useFinancialFoundation: () => ({
    positions: [], snapshots: [], contributions: [], profile: null, essentialCategoryIds: mocks.essentialCategoryIds,
    status: mocks.foundationStatus, error: mocks.foundationError, demoMode: true,
    summary: mocks.hideFoundationSummary ? null : {
      effectiveDate: '2026-08-23', dataMode: 'demo', netWorth: mocks.netWorth, assetTotal: null,
      liabilityTotal: null, priorMonthNetWorth: null, monthlyNetWorthChange: mocks.monthlyNetWorthChange,
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
    refresh: mocks.refreshFoundation, addPosition: vi.fn(), editPosition: vi.fn(), removePosition: vi.fn(), addSnapshot: vi.fn(),
    removeSnapshot: vi.fn(), addContribution: vi.fn(), removeContribution: vi.fn(), updateProfile: vi.fn(),
    updateEssentialCategories: vi.fn(), runScenario: vi.fn(),
  }),
}));

vi.mock('../app/FireBuddyProvider', async () => {
  const actual = await vi.importActual<typeof import('../app/FireBuddyProvider')>('../app/FireBuddyProvider');
  return {
    ...actual,
    useFireBuddy: () => ({
      addTransaction: mocks.addTransaction,
      accounts: mocks.accounts,
      categories: mocks.categories,
      tags: mocks.tags,
      addTag: vi.fn(),
      updateTag: vi.fn(),
      deleteTag: vi.fn(),
      deleteTransaction: vi.fn(),
      dismissNotification: vi.fn(),
      getAccountById: (id: string) => mocks.accounts.find((account) => account.id === id),
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
    mocks.addTransaction.mockReset().mockResolvedValue({ id: 'duplicated-transaction' });
    mocks.foundationError = null;
    mocks.foundationStatus = 'ready';
    mocks.hideFoundationSummary = false;
    mocks.monthlyNetWorthChange = null;
    mocks.netWorth = null;
    mocks.notify.mockReset();
    mocks.refreshFoundation.mockReset().mockResolvedValue(undefined);
    mocks.signOut.mockReset().mockResolvedValue(undefined);
    mocks.toggleTheme.mockReset();
    mocks.transactions.length = 0;
    mocks.accounts.length = 0;
    mocks.categories.length = 0;
    mocks.tags.length = 0;
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
    expect(await screen.findByRole('heading', { name: 'Ember' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Focus Ember conversation' })).toBeNull();

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
    expect(document.querySelector('.foundation-summary-grid')).not.toBeNull();
    expect(screen.getByText('Net worth')).toBeTruthy();
    expect(screen.queryByText('Savings rate')).toBeNull();
    expect(screen.queryByText('Emergency runway')).toBeNull();
    expect(screen.queryByRole('heading', { name: 'FIRE Progress' })).toBeNull();
    expect(within(screen.getByRole('navigation', { name: 'Primary' })).getByRole('link', { name: 'FIRE Planner' }).getAttribute('href')).toBe('/fire');
    expect(within(screen.getByRole('navigation', { name: 'Primary mobile' })).queryByRole('link', { name: 'FIRE Planner' })).toBeNull();
    expect(screen.getByRole('button', { name: /View More, .* spending details/ })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Profile' })).toBeNull();
  });

  it('shows the monthly net worth direction with the correct status colour', () => {
    mocks.netWorth = 125000;
    mocks.monthlyNetWorthChange = 2400;
    const { unmount } = render(<MemoryRouter initialEntries={['/']}><AppShell /></MemoryRouter>);

    expect(document.querySelector('.foundation-summary-change-positive')?.textContent).toContain('+S$2,400');
    unmount();

    mocks.monthlyNetWorthChange = -900;
    render(<MemoryRouter initialEntries={['/']}><AppShell /></MemoryRouter>);
    expect(document.querySelector('.foundation-summary-change-negative')?.textContent).toContain('-S$900');
  });

  it('separates dashboard loading and recoverable error states', () => {
    mocks.foundationStatus = 'loading';
    mocks.hideFoundationSummary = true;
    const { unmount } = render(<MemoryRouter initialEntries={['/']}><AppShell /></MemoryRouter>);

    expect(screen.getByRole('status', { name: 'Loading your financial position' })).toBeTruthy();
    expect(screen.queryByText('Set up your FIRE projection')).toBeNull();
    unmount();

    mocks.foundationStatus = 'error';
    mocks.foundationError = 'Unable to load your financial position.';
    render(<MemoryRouter initialEntries={['/']}><AppShell /></MemoryRouter>);
    expect(screen.getByRole('alert').textContent).toContain('Unable to load your financial position.');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(mocks.refreshFoundation).toHaveBeenCalledOnce();
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

  it('keeps the largest spending labels contained and exposes the complete breakdown', () => {
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

    expect(screen.getByRole('img', { name: /spending by category/i })).toBeTruthy();
    expect(document.querySelector('.spending-top-categories')).toBeNull();
    expect(screen.queryByText('Total expenses')).toBeNull();
    expect(screen.queryByText('S$100')).toBeNull();
    expect(screen.queryByText(/view more shows the detailed breakdown/i)).toBeNull();
  });

  it('opens Insights with the spending month selected on the dashboard', async () => {
    const current = new Date();
    const currentMonth = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
    const previous = new Date(current.getFullYear(), current.getMonth() - 1, 1);
    const previousMonth = `${previous.getFullYear()}-${String(previous.getMonth() + 1).padStart(2, '0')}`;
    mocks.categories.push({ id: 'food', name: 'Food & Drink', color: '#3C8A61', categoryType: 'expense' });
    mocks.transactions.push(
      { id: 'current-food', description: 'Current food', amount: -75, category: 'food', account: 'cash', date: `${currentMonth}-02`, transactionType: 'expense' },
      { id: 'previous-food', description: 'Previous food', amount: -25, category: 'food', account: 'cash', date: `${previousMonth}-02`, transactionType: 'expense' },
    );

    render(<MemoryRouter initialEntries={['/']}><AppShell /></MemoryRouter>);

    expect(screen.queryByRole('button', { name: 'Show previous spending month' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /View More, .* spending details/ }));

    expect(await screen.findByRole('heading', { name: 'Insights' })).toBeTruthy();
    expect((screen.getByRole('combobox', { name: 'Spending month' }) as HTMLSelectElement).value).toBe(currentMonth);
    expect(screen.getByText('S$75.00')).toBeTruthy();
    expect(screen.queryByText('S$25.00')).toBeNull();
  });

  it('shows income, expenses, and savings with three separate Money Pulse bars', () => {
    render(<MemoryRouter initialEntries={['/']}><AppShell /></MemoryRouter>);

    const pulseCard = screen.getByRole('heading', { name: /Money Pulse$/ }).closest('article');
    expect(pulseCard).not.toBeNull();
    const pulse = within(pulseCard!);
    expect(pulse.getByText('Income')).toBeTruthy();
    expect(pulse.getByText('Expenses')).toBeTruthy();
    expect(pulse.getByText('Savings')).toBeTruthy();
    expect(pulse.getByText('S$5,200')).toBeTruthy();
    expect(pulse.getByText('S$121')).toBeTruthy();
    expect(pulse.getByText('S$5,080')).toBeTruthy();
    expect(pulse.getByText('97.7%')).toBeTruthy();
    expect(pulse.getAllByRole('img')).toHaveLength(3);
    expect(pulse.queryByText('Recorded month')).toBeNull();
    expect(pulse.getByText('How savings is calculated')).toBeTruthy();
    expect(pulse.queryByText('Invested')).toBeNull();
  });

  it('opens Transactions with a dashboard search applied to the selected month', async () => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    mocks.transactions.push({
      id: 'older-lunch', description: 'Team lunch', amount: -42, category: 'food', account: 'cash',
      date: '2025-01-10', transactionType: 'expense',
    }, {
      id: 'current-lunch', description: 'Team lunch today', amount: -24, category: 'food', account: 'cash',
      date: `${currentMonth}-10`, transactionType: 'expense',
    });

    render(<MemoryRouter initialEntries={['/']}><AppShell /></MemoryRouter>);

    const dashboardSearch = screen.getByRole('searchbox', { name: 'Search transactions' });
    fireEvent.change(dashboardSearch, { target: { value: 'Team lunch' } });
    fireEvent.submit(dashboardSearch.closest('form')!);

    expect(await screen.findByRole('heading', { name: 'Transactions' })).toBeTruthy();
    expect((screen.getByPlaceholderText('Search transactions...') as HTMLInputElement).value).toBe('Team lunch');
    expect(screen.getByText('Team lunch today')).toBeTruthy();
    expect(screen.queryByText('Team lunch')).toBeNull();
  });

  it('defaults Transactions to the selected month and moves between available months', () => {
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
    expect(screen.queryByText('Historical groceries')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Show previous month' }));
    expect(screen.queryByText('Current groceries')).toBeNull();
    expect(screen.getByText('Historical groceries')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Show next month' }));
    expect(screen.getByText('Current groceries')).toBeTruthy();
    expect(screen.queryByText('Historical groceries')).toBeNull();
  });

  it('shows records inside an inclusive custom date range', () => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    mocks.transactions.push(
      { id: 'before-range', description: 'December groceries', amount: -18, category: 'food', account: 'cash', date: '2024-12-31', transactionType: 'expense' },
      { id: 'range-start', description: 'January coffee', amount: -5, category: 'food', account: 'cash', date: '2025-01-01', transactionType: 'expense' },
      { id: 'range-end', description: 'January salary', amount: 4000, category: 'salary', account: 'cash', date: '2025-01-31', transactionType: 'income' },
      { id: 'current-row', description: 'Current groceries', amount: -30, category: 'food', account: 'cash', date: `${currentMonth}-01`, transactionType: 'expense' },
    );

    render(<MemoryRouter initialEntries={['/transactions']}><AppShell /></MemoryRouter>);

    expect(screen.getByText('Current groceries')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Start date'), { target: { value: '2025-01-01' } });
    fireEvent.change(screen.getByLabelText('End date'), { target: { value: '2025-01-31' } });

    expect(screen.queryByText('Current groceries')).toBeNull();
    expect(screen.queryByText('December groceries')).toBeNull();
    expect(screen.getByText('January coffee')).toBeTruthy();
    expect(screen.getByText('January salary')).toBeTruthy();
  });

  it('filters the transaction table by type and reusable tag', () => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    mocks.tags.push(
      { id: 'tax-tag', userId: 'user', name: 'Tax', usageCount: 1, createdAt: '', updatedAt: '' },
      { id: 'work-tag', userId: 'user', name: 'Work', usageCount: 1, createdAt: '', updatedAt: '' },
    );
    mocks.transactions.push(
      { id: 'tagged-expense', description: 'Client meal', amount: -50, category: 'food', account: 'cash', date: `${currentMonth}-02`, transactionType: 'expense', tagIds: ['tax-tag'] },
      { id: 'tagged-income', description: 'Project payment', amount: 500, category: 'salary', account: 'cash', date: `${currentMonth}-03`, transactionType: 'income', tagIds: ['work-tag'] },
    );

    render(<MemoryRouter initialEntries={['/transactions']}><AppShell /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'expense' } });
    expect(screen.getByText('Client meal')).toBeTruthy();
    expect(screen.queryByText('Project payment')).toBeNull();
    fireEvent.change(screen.getByLabelText('Type'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Tag'), { target: { value: 'work-tag' } });
    expect(screen.queryByText('Client meal')).toBeNull();
    expect(screen.getByText('Project payment')).toBeTruthy();
  });

  it('clears search, category, account, date range, and custom range mode', () => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    mocks.categories.push(
      { id: 'food', name: 'Food & Drink', color: '#3C8A61', categoryType: 'expense' },
      { id: 'travel', name: 'Travel', color: '#E5B24A', categoryType: 'expense' },
    );
    mocks.accounts.push(
      { id: 'cash', name: 'Cash', type: 'cash', color: '#E5B24A' },
      { id: 'card', name: 'Card', type: 'credit', color: '#3C8A61' },
    );
    mocks.transactions.push(
      { id: 'visible-row', description: 'Current lunch', amount: -12, category: 'food', account: 'cash', date: `${currentMonth}-10`, transactionType: 'expense' },
      { id: 'archive-row', description: 'Archive flight', amount: -120, category: 'travel', account: 'card', date: '2025-01-10', transactionType: 'expense' },
    );

    render(<MemoryRouter initialEntries={['/transactions']}><AppShell /></MemoryRouter>);

    fireEvent.change(screen.getByPlaceholderText('Search transactions...'), { target: { value: 'Archive' } });
    fireEvent.change(screen.getByLabelText('Start date'), { target: { value: '2025-01-01' } });
    fireEvent.change(screen.getByLabelText('End date'), { target: { value: '2025-01-31' } });
    fireEvent.change(screen.getByDisplayValue('All categories'), { target: { value: 'travel' } });
    fireEvent.change(screen.getByDisplayValue('All accounts'), { target: { value: 'card' } });

    expect(screen.getByText('Archive flight')).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText('Search transactions...'), { target: { value: 'not present' } });
    const emptyState = screen.getByRole('status');
    expect(emptyState.classList.contains('transactions-empty')).toBe(true);
    expect(within(emptyState).getByText('No transactions match these filters')).toBeTruthy();

    fireEvent.click(within(emptyState).getByRole('button', { name: 'Clear filters' }));
    expect((screen.getByPlaceholderText('Search transactions...') as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText('Start date') as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText('End date') as HTMLInputElement).value).toBe('');
    expect(screen.getByText('Current lunch')).toBeTruthy();
    expect(screen.queryByText('Archive flight')).toBeNull();
  });

  it('keeps payment accounts off Home and opens recent transaction details in its recorded month', async () => {
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
    expect(screen.getByRole('dialog', { name: 'Archive grocery' })).toBeTruthy();
    expect(screen.getAllByText('Archive grocery')).toHaveLength(2);
    expect((screen.getByLabelText('Transaction reporting period') as HTMLSelectElement).value).toBe('2025-02');
    fireEvent.click(screen.getByRole('button', { name: 'Close transaction details' }));
    expect(screen.queryByRole('dialog', { name: 'Archive grocery' })).toBeNull();
  });

  it('toggles date, description, and amount table sorting', () => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    mocks.transactions.push(
      { id: 'alpha-row', description: 'Alpha bill', amount: -200, category: 'food', account: 'cash', date: `${currentMonth}-02`, transactionType: 'expense' },
      { id: 'zulu-row', description: 'Zulu salary', amount: 5200, category: 'salary', account: 'cash', date: `${currentMonth}-03`, transactionType: 'income' },
      { id: 'middle-row', description: 'Middle coffee', amount: -5, category: 'food', account: 'cash', date: `${currentMonth}-01`, transactionType: 'expense' },
    );

    render(<MemoryRouter initialEntries={['/transactions']}><AppShell /></MemoryRouter>);

    const getDescriptions = () => Array.from(document.querySelectorAll('.transactions-table tbody tr td[data-label="Description"] strong'))
      .map((element) => element.textContent);

    expect(getDescriptions()).toEqual(['Zulu salary', 'Alpha bill', 'Middle coffee']);
    fireEvent.click(screen.getByRole('button', { name: 'Sort by date ascending' }));
    expect(getDescriptions()).toEqual(['Middle coffee', 'Alpha bill', 'Zulu salary']);
    fireEvent.click(screen.getByRole('button', { name: 'Sort by date descending' }));
    expect(getDescriptions()).toEqual(['Zulu salary', 'Alpha bill', 'Middle coffee']);
    fireEvent.click(screen.getByRole('button', { name: 'Sort by amount ascending' }));
    expect(getDescriptions()).toEqual(['Middle coffee', 'Alpha bill', 'Zulu salary']);
    fireEvent.click(screen.getByRole('button', { name: 'Sort by amount descending' }));
    expect(getDescriptions()).toEqual(['Zulu salary', 'Alpha bill', 'Middle coffee']);
    fireEvent.click(screen.getByRole('button', { name: 'Sort by description ascending' }));
    expect(getDescriptions()).toEqual(['Alpha bill', 'Middle coffee', 'Zulu salary']);
  });

  it('keeps transaction rows neutral while amount signs and text colors stay distinct', () => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    mocks.transactions.push(
      { id: 'income-row', description: 'Salary deposit', amount: 5200, category: 'salary', account: 'cash', date: `${currentMonth}-02`, transactionType: 'income' },
      { id: 'expense-row', description: 'Grocery run', amount: -85.4, category: 'food', account: 'cash', date: `${currentMonth}-01`, transactionType: 'expense' },
    );

    render(<MemoryRouter initialEntries={['/transactions']}><AppShell /></MemoryRouter>);

    const incomeRow = screen.getByText('Salary deposit').closest('tr');
    const expenseRow = screen.getByText('Grocery run').closest('tr');
    expect(incomeRow?.classList.contains('transaction-type-income')).toBe(false);
    expect(expenseRow?.classList.contains('transaction-type-expense')).toBe(false);
    expect(incomeRow?.textContent).toContain('Income');
    expect(expenseRow?.textContent).toContain('Expense');
    expect(within(incomeRow!).getByText('+ S$5,200.00').classList.contains('amount-positive')).toBe(true);
    expect(within(expenseRow!).getByText('- S$85.40').classList.contains('amount-negative')).toBe(true);
  });

  it('keeps transaction cell text inside fixed single-line columns', () => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    mocks.categories.push({ id: 'long-category', name: 'Food and dining with a long category name', color: '#3C8A61', categoryType: 'expense' });
    mocks.transactions.push({
      id: 'long-row',
      description: 'A transaction description that is longer than its column',
      amount: -42,
      category: 'long-category',
      account: 'long-account',
      date: `${currentMonth}-06`,
      transactionType: 'expense',
    });

    render(<MemoryRouter initialEntries={['/transactions']}><AppShell /></MemoryRouter>);

    const transactionRow = document.querySelector<HTMLTableRowElement>('.transactions-table tbody tr');
    const dateCell = transactionRow?.querySelector('td[data-label="Date"]');
    const categoryText = within(transactionRow!).getByText('Food and dining with a long category name');
    const accountText = transactionRow?.querySelector<HTMLElement>('td[data-label="Account"] .transaction-table-cell-text');

    expect(dateCell?.classList.contains('transaction-table-date')).toBe(true);
    expect(categoryText.classList.contains('transaction-table-cell-text')).toBe(true);
    expect(categoryText.closest('.transaction-table-category')?.querySelector('.category-avatar')).not.toBeNull();
    expect(accountText?.classList.contains('transaction-table-cell-text')).toBe(true);
  });

  it('opens transaction details from a row without intercepting row actions', () => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    mocks.categories.push({ id: 'food', name: 'Food & Drink', color: '#3C8A61', categoryType: 'expense' });
    mocks.transactions.push({
      id: 'detail-row',
      description: 'Weekend groceries',
      amount: -85.4,
      category: 'food',
      account: 'cash',
      date: `${currentMonth}-04`,
      transactionType: 'expense',
    });

    render(<MemoryRouter initialEntries={['/transactions']}><AppShell /></MemoryRouter>);

    const row = screen.getByRole('row', { name: 'View details for Weekend groceries' });
    fireEvent.click(row);

    const dialog = screen.getByRole('dialog', { name: 'Weekend groceries' });
    expect(within(dialog).getByText('- S$85.40')).toBeTruthy();
    expect(within(dialog).getByText('Food & Drink')).toBeTruthy();
    expect(within(dialog).getAllByText('Expense')).toHaveLength(2);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Weekend groceries' })).toBeNull();
    expect(document.activeElement).toBe(row);

    fireEvent.click(within(row).getByRole('button', { name: 'Actions for Weekend groceries' }));
    fireEvent.click(within(screen.getByRole('menu', { name: 'Actions for Weekend groceries' }))
      .getByRole('menuitem', { name: 'Edit' }));
    expect(screen.queryByRole('dialog', { name: 'Weekend groceries' })).toBeNull();
    expect(screen.getByRole('dialog', { name: 'Edit transaction' })).toBeTruthy();
  });

  it('duplicates and deletes transactions from the row action menu', async () => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const transaction = {
      id: 'menu-row', description: 'Menu purchase', amount: -64.5, category: 'food', account: 'cash',
      date: `${currentMonth}-02`, transactionType: 'expense',
    };
    mocks.transactions.push(transaction);

    render(<MemoryRouter initialEntries={['/transactions']}><AppShell /></MemoryRouter>);

    const row = screen.getByRole('row', { name: 'View details for Menu purchase' });
    const actionButton = within(row).getByRole('button', { name: 'Actions for Menu purchase' });
    fireEvent.click(actionButton);
    fireEvent.click(within(screen.getByRole('menu', { name: 'Actions for Menu purchase' }))
      .getByRole('menuitem', { name: 'Duplicate' }));

    await waitFor(() => expect(mocks.addTransaction).toHaveBeenCalledWith({
      description: transaction.description,
      amount: transaction.amount,
      category: transaction.category,
      date: transaction.date,
      account: transaction.account,
      transactionType: transaction.transactionType,
      tagIds: [],
    }));
    expect(screen.queryByRole('menu', { name: 'Actions for Menu purchase' })).toBeNull();

    fireEvent.click(actionButton);
    fireEvent.click(within(screen.getByRole('menu', { name: 'Actions for Menu purchase' }))
      .getByRole('menuitem', { name: 'Delete' }));
    expect(screen.getByRole('dialog', { name: 'Delete transaction?' })).toBeTruthy();
    expect(screen.queryByRole('dialog', { name: 'Menu purchase' })).toBeNull();
  });

  it('shows only the account type in the transaction table', () => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    mocks.accounts.push({
      id: 'rewards-card', name: 'Weekend rewards platinum', type: 'credit_card', color: '#25543D', lastFour: '4242',
    });
    mocks.transactions.push({
      id: 'account-type-row', description: 'Card purchase', amount: -32, category: 'food', account: 'rewards-card',
      date: `${currentMonth}-02`, transactionType: 'expense',
    });

    render(<MemoryRouter initialEntries={['/transactions']}><AppShell /></MemoryRouter>);

    const row = screen.getByRole('row', { name: 'View details for Card purchase' });
    const accountCell = within(row).getByText('Credit card').closest('td');
    expect(accountCell?.getAttribute('data-label')).toBe('Account');
    expect(within(row).queryByText('Weekend rewards platinum')).toBeNull();
  });

  it('opens transaction details with Enter and Space', () => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    mocks.transactions.push({
      id: 'keyboard-row', description: 'Keyboard purchase', amount: -25, category: 'food', account: 'cash',
      date: `${currentMonth}-03`, transactionType: 'expense',
    });

    render(<MemoryRouter initialEntries={['/transactions']}><AppShell /></MemoryRouter>);

    const row = screen.getByRole('row', { name: 'View details for Keyboard purchase' });
    fireEvent.keyDown(row, { key: 'Enter' });
    expect(screen.getByRole('dialog', { name: 'Keyboard purchase' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Close transaction details' }));

    fireEvent.keyDown(row, { key: ' ' });
    expect(screen.getByRole('dialog', { name: 'Keyboard purchase' })).toBeTruthy();
  });
});
