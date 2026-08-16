import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AddExpense from './AddExpense';


const mocks = vi.hoisted(() => ({
  addAccount: vi.fn(),
  addCategory: vi.fn(),
  addTransaction: vi.fn(),
  suggestExpenseCategory: vi.fn(),
  categories: [] as Array<Record<string, unknown>>,
  accounts: [] as Array<Record<string, unknown>>,
}));

const categories = [
  { id: 'food', name: 'Food & Drink', color: '#3C8A61', icon: 'food', monthlyBudget: 600, categoryType: 'expense' as const, isDefault: true },
  { id: 'transport', name: 'Transport', color: '#67B47C', icon: 'transport', monthlyBudget: 250, categoryType: 'expense' as const, isDefault: true },
  { id: 'salary', name: 'Salary', color: '#3C8A61', icon: 'salary', monthlyBudget: 0, categoryType: 'income' as const, isDefault: true },
];
const accounts = [
  { id: 'cash-account', name: 'Cash', type: 'cash' as const, color: '#E5B24A', isDefault: true },
];

vi.mock('../app/FireBuddyProvider', async () => {
  const actual = await vi.importActual<typeof import('../app/FireBuddyProvider')>('../app/FireBuddyProvider');
  return {
    ...actual,
    accountTypeLabel: () => 'Cash',
    getDeviceDateKey: () => '2026-08-14',
    useFireBuddy: () => ({
      addAccount: mocks.addAccount,
      addCategory: mocks.addCategory,
      addTransaction: mocks.addTransaction,
      categories: mocks.categories,
      accounts: mocks.accounts,
      session: { access_token: 'access-token' },
      syncStatus: 'ready',
    }),
  };
});

vi.mock('../api', () => ({
  suggestExpenseCategory: mocks.suggestExpenseCategory,
}));

describe('AddExpense', () => {
  beforeEach(() => {
    mocks.addTransaction.mockReset().mockResolvedValue(undefined);
    mocks.addAccount.mockReset();
    mocks.addCategory.mockReset();
    mocks.suggestExpenseCategory.mockReset();
    mocks.categories = [...categories];
    mocks.accounts = [...accounts];
  });

  it('applies an AI suggestion but saves the user override as a negative expense', async () => {
    mocks.suggestExpenseCategory.mockResolvedValue({
      categoryId: 'transport',
      categoryName: 'Transport',
      confidence: 'high',
      reason: 'Public transport description.',
    });
    render(<MemoryRouter initialEntries={['/add']}><AddExpense /></MemoryRouter>);

    fireEvent.change(screen.getByPlaceholderText('Netflix'), { target: { value: 'MRT ride' } });
    fireEvent.click(screen.getByRole('button', { name: 'Autodetect category' }));

    const categorySelect = screen.getByLabelText('Category') as HTMLSelectElement;
    await waitFor(() => expect(categorySelect.value).toBe('transport'));
    expect(screen.queryByText(/confidence/i)).toBeNull();
    expect(screen.queryByText(/Public transport description/i)).toBeNull();

    fireEvent.change(categorySelect, { target: { value: 'food' } });
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '10.50' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save transaction' }));

    await waitFor(() => expect(mocks.addTransaction).toHaveBeenCalled());
    expect(mocks.addTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ amount: -10.5, category: 'food', account: 'cash-account', transactionType: 'expense' }),
    );
  });

  it('shows a short message when a category cannot be determined', async () => {
    mocks.suggestExpenseCategory.mockRejectedValue(new Error('Unable to get an AI category suggestion'));
    render(<MemoryRouter initialEntries={['/add']}><AddExpense /></MemoryRouter>);

    fireEvent.change(screen.getByPlaceholderText('Netflix'), { target: { value: 'Lunch' } });
    fireEvent.click(screen.getByRole('button', { name: 'Autodetect category' }));

    expect(await screen.findByText('Unable to determine category. Choose one manually.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Save transaction' })).toBeTruthy();
  });

  it('shows the same short message when the suggestion has no usable category', async () => {
    mocks.suggestExpenseCategory.mockResolvedValue({
      categoryId: null,
      categoryName: null,
      confidence: 'low',
      reason: 'Not enough information.',
    });
    render(<MemoryRouter initialEntries={['/add']}><AddExpense /></MemoryRouter>);

    fireEvent.change(screen.getByPlaceholderText('Netflix'), { target: { value: 'Something' } });
    fireEvent.click(screen.getByRole('button', { name: 'Autodetect category' }));

    expect(await screen.findByText('Unable to determine category. Choose one manually.')).toBeTruthy();
    expect(screen.queryByText(/Not enough information/i)).toBeNull();
  });

  it('shows a clear validation error instead of silently ignoring an invalid save', async () => {
    render(<MemoryRouter initialEntries={['/add']}><AddExpense /></MemoryRouter>);

    fireEvent.click(screen.getByRole('button', { name: 'Save transaction' }));

    expect(await screen.findByText('Enter an amount greater than zero.')).toBeTruthy();
    expect(mocks.addTransaction).not.toHaveBeenCalled();
  });

  it('keeps the category suggestion action with the category control', () => {
    render(<MemoryRouter initialEntries={['/add']}><AddExpense /></MemoryRouter>);

    const categoryField = screen.getByLabelText('Category').closest('.add-category-field');
    const suggestionButton = screen.getByRole('button', { name: 'Autodetect category' });

    expect(categoryField?.contains(suggestionButton)).toBe(true);
  });

  it('switches to income categories and saves a positive income without autodetection', async () => {
    render(<MemoryRouter initialEntries={['/add']}><AddExpense /></MemoryRouter>);

    fireEvent.click(screen.getByRole('button', { name: 'Income' }));
    expect(screen.queryByRole('button', { name: 'Autodetect category' })).toBeNull();
    expect((screen.getByLabelText('Category') as HTMLSelectElement).value).toBe('salary');

    fireEvent.change(screen.getByPlaceholderText('Netflix'), { target: { value: 'August salary' } });
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '5200' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save transaction' }));

    await waitFor(() => expect(mocks.addTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 5200, category: 'salary', transactionType: 'income' }),
    ));
  });

  it('keeps the transaction draft mounted while a nested account form is open', () => {
    render(<MemoryRouter initialEntries={['/add']}><AddExpense /></MemoryRouter>);

    fireEvent.change(screen.getByPlaceholderText('Netflix'), { target: { value: 'Preserved draft' } });
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '42' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add account' }));

    expect(screen.getByRole('heading', { name: 'New account' })).toBeTruthy();
    expect((screen.getByPlaceholderText('Netflix') as HTMLInputElement).value).toBe('Preserved draft');
    expect((screen.getByPlaceholderText('0.00') as HTMLInputElement).value).toBe('42');
  });

  it('selects a newly created category and account from nested forms', async () => {
    mocks.addCategory.mockImplementation(async (values) => {
      const created = { ...values, id: 'freelance-id', isDefault: false };
      mocks.categories = [...mocks.categories, created];
      return created;
    });
    mocks.addAccount.mockImplementation(async (values) => {
      const created = { ...values, id: 'bank-id', isDefault: false };
      mocks.accounts = [...mocks.accounts, created];
      return created;
    });
    render(<MemoryRouter initialEntries={['/add']}><AddExpense /></MemoryRouter>);

    fireEvent.click(screen.getByRole('button', { name: 'Add category' }));
    fireEvent.change(screen.getByPlaceholderText('Dining out'), { target: { value: 'Freelance' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect((screen.getByLabelText('Category') as HTMLSelectElement).value).toBe('freelance-id'));

    fireEvent.click(screen.getByRole('button', { name: 'Add account' }));
    fireEvent.change(screen.getByPlaceholderText('DBS Savings'), { target: { value: 'OCBC 360' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect((screen.getByLabelText('Account') as HTMLSelectElement).value).toBe('bank-id'));
  });
});
