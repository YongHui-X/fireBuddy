import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import AppShell from './AppShell';


const categories = [
  { id: 'default-id', name: 'Food & Drink', color: '#3C8A61', icon: 'food', monthlyBudget: 600, categoryType: 'expense' as const, isDefault: true },
  { id: 'custom-id', name: 'Dining out', color: '#67B47C', icon: 'food', monthlyBudget: 200, categoryType: 'expense' as const, isDefault: false },
  { id: 'salary-id', name: 'Salary', color: '#3C8A61', icon: 'salary', monthlyBudget: 0, categoryType: 'income' as const, isDefault: true },
];

vi.mock('../app/FireBuddyProvider', async () => {
  const actual = await vi.importActual<typeof import('../app/FireBuddyProvider')>('../app/FireBuddyProvider');
  return {
    ...actual,
    useFireBuddy: () => ({
      accounts: [],
      addCategory: vi.fn(),
      categories,
      deleteCategory: vi.fn(),
      dismissNotification: vi.fn(),
      getMonthlySpend: () => 0,
      notification: null,
      session: null,
      signOut: vi.fn(),
      themeMode: 'light',
      toggleTheme: vi.fn(),
      transactions: [],
      updateCategory: vi.fn(),
      demoMode: true,
    }),
  };
});

describe('Categories screen', () => {
  it('keeps defaults read only without a System badge and filters income separately', () => {
    render(<MemoryRouter initialEntries={['/categories']}><AppShell /></MemoryRouter>);

    expect(screen.queryByText('System')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Edit Food & Drink' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Edit Dining out' })).toBeTruthy();
    expect(screen.queryByText('Salary')).toBeNull();

    fireEvent.click(screen.getByRole('tab', { name: 'Income' }));
    expect(screen.getByText('Salary')).toBeTruthy();
    expect(screen.queryByText(/this month/i)).toBeNull();
    expect(screen.queryByText('Monthly budget')).toBeNull();
  });
});
