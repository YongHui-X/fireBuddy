import { createContext, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { LocalExpenseRecord } from '@firebuddy/shared';

interface AddExpenseDemoContextValue {
  recentExpenses: LocalExpenseRecord[];
  addExpense: (expense: LocalExpenseRecord) => void;
}

const AddExpenseDemoContext = createContext<AddExpenseDemoContextValue | undefined>(undefined);

export function AddExpenseDemoProvider({ children }: { children: ReactNode }) {
  const [recentExpenses, setRecentExpenses] = useState<LocalExpenseRecord[]>([]);

  const value = useMemo(
    () => ({
      recentExpenses,
      addExpense: (expense: LocalExpenseRecord) => {
        setRecentExpenses((currentExpenses) => [expense, ...currentExpenses].slice(0, 6));
      },
    }),
    [recentExpenses],
  );

  return (
    <AddExpenseDemoContext.Provider value={value}>{children}</AddExpenseDemoContext.Provider>
  );
}

export function useAddExpenseDemo() {
  const context = useContext(AddExpenseDemoContext);

  if (!context) {
    throw new Error('useAddExpenseDemo must be used within AddExpenseDemoProvider');
  }

  return context;
}
