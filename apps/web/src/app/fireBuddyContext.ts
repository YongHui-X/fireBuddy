import { createContext, useContext } from 'react';

import type { AppContextValue } from './fireBuddyModel';

export const AppContext = createContext<AppContextValue | null>(null);

export function useFireBuddy() {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error('useFireBuddy must be used within AppProvider');
  }

  return context;
}
