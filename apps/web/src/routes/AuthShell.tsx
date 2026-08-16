import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Moon, Sun } from 'lucide-react';

import { FireBuddyMark } from '../app/BrandMarks';
import { useFireBuddy } from '../app/FireBuddyProvider';

interface AuthShellProps {
  children: ReactNode;
  panelClassName?: string;
}

// Provides one responsive, theme-aware frame for every public authentication page.
function AuthShell({ children, panelClassName = '' }: AuthShellProps) {
  const { themeMode, toggleTheme } = useFireBuddy();
  const nextTheme = themeMode === 'dark' ? 'light' : 'dark';

  return (
    <main className="auth-page">
      <button
        className="auth-theme-toggle"
        type="button"
        onClick={toggleTheme}
        aria-label={`Switch to ${nextTheme} mode`}
        title={`Switch to ${nextTheme} mode`}
      >
        {themeMode === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
      </button>

      <div className="auth-content">
        <Link className="auth-brand" to="/" aria-label="FireBuddy sign in">
          <FireBuddyMark className="auth-brand-mark" size={38} />
          <span>FireBuddy</span>
        </Link>

        <section className={`auth-panel ${panelClassName}`.trim()}>{children}</section>
      </div>

      <footer className="auth-footer">
        <p>© 2026 FireBuddy. All rights reserved.</p>
        <nav aria-label="Legal">
          <Link to="/terms">Terms</Link>
          <Link to="/privacy">Privacy</Link>
        </nav>
      </footer>
    </main>
  );
}

export default AuthShell;
