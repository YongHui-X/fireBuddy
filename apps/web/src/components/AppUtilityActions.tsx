import { Bell, Moon, Sun } from 'lucide-react';

import { useFireBuddy } from '../app/FireBuddyProvider';

export interface AppUtilityActionsProps {
  className?: string;
}

/** Keep global theme and notification actions identical wherever the app shell presents them. */
export function AppUtilityActions({ className = '' }: AppUtilityActionsProps) {
  const { notify, themeMode, toggleTheme } = useFireBuddy();
  const nextTheme = themeMode === 'dark' ? 'light' : 'dark';

  return (
    <div className={`app-utility-actions ${className}`.trim()}>
      <button
        className="icon-button quiet app-utility-button"
        type="button"
        onClick={toggleTheme}
        aria-label={`Switch to ${nextTheme} mode`}
        title={`Switch to ${nextTheme} mode`}
      >
        {themeMode === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </button>
      <button
        className="icon-button quiet app-utility-button"
        type="button"
        onClick={() => notify('No new notifications.')}
        aria-label="Notifications"
        title="Notifications"
      >
        <Bell size={18} />
      </button>
    </div>
  );
}
