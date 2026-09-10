import { useState } from 'react';
import { Database, Flame, Landmark, LogOut, Moon, Sun, User } from 'lucide-react';
import { useNavigate } from 'react-router';

import { clearDemoStorage } from '../app/demoStorage';
import { useFireBuddy } from '../app/FireBuddyProvider';
import { getDisplayName } from '../app/displayName';
import { PageToolbar } from '../components/PageToolbar';
import { useAccessibleDialog } from '../components/useAccessibleDialog';

type ProfileProps = {
  onRequestLogout: () => void;
};

/** Present the implemented profile controls without advertising disabled settings. */
export default function Profile({ onRequestLogout }: ProfileProps) {
  const { session, themeMode, toggleTheme, demoMode } = useFireBuddy();
  const navigate = useNavigate();
  const [showClearDialog, setShowClearDialog] = useState(false);
  const clearDialogRef = useAccessibleDialog<HTMLElement>({
    isOpen: showClearDialog,
    onClose: () => setShowClearDialog(false),
  });
  const displayName = getDisplayName(session?.user);
  const initials = displayName
    .split(/[._\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'FB';

  function clearAllData() {
    clearDemoStorage();
    window.location.reload();
  }

  return (
    <main className="page">
      <PageToolbar title="Profile" description="Manage your FireBuddy preferences and financial setup." />

      <section className="profile-content">
        <article className="profile-identity">
          <div className="profile-avatar">{initials}</div>
          <div><h3>{displayName}</h3><p>{session?.user.email ?? 'Local demo mode'}</p></div>
        </article>
        <article className="settings-card profile-account-card">
          <div className="setting-row setting-row-static">
            <span className="setting-icon">
              <User size={20} />
            </span>
            <strong>{session?.user.email ?? 'Local demo mode'}</strong>
          </div>
        </article>

        <article className="settings-card">
          <button className="setting-row" type="button" onClick={() => navigate('/wealth')}>
            <span className="setting-icon"><Landmark size={20} /></span>
            <strong>Wealth positions</strong>
            <span className="setting-state">Manage</span>
          </button>
          <button className="setting-row" type="button" onClick={() => navigate('/fire')}>
            <span className="setting-icon"><Flame size={20} /></span>
            <strong>FIRE Planner</strong>
            <span className="setting-state">Review</span>
          </button>
          <button
            className="setting-row setting-row-toggle"
            type="button"
            onClick={toggleTheme}
            aria-pressed={themeMode === 'dark'}
          >
            <span className="setting-icon">{themeMode === 'dark' ? <Sun size={20} /> : <Moon size={20} />}</span>
            <strong>Dark mode</strong>
            <span className="setting-state">{themeMode === 'dark' ? 'On' : 'Off'}</span>
          </button>
          {demoMode ? (
            <button className="setting-row setting-row-danger" type="button" onClick={() => setShowClearDialog(true)}>
              <span className="setting-icon"><Database size={20} /></span>
              <strong>Clear local demo data</strong>
            </button>
          ) : null}
          {session ? (
            <button className="setting-row setting-row-danger" type="button" onClick={onRequestLogout}>
              <span className="setting-icon"><LogOut size={20} /></span>
              <strong>Log out</strong>
            </button>
          ) : null}
        </article>
      </section>

      {showClearDialog ? (
        <div className="sheet-backdrop">
          <aside
            ref={clearDialogRef}
            className="confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="clear-demo-title"
            aria-describedby="clear-demo-description"
            tabIndex={-1}
          >
            <h3 id="clear-demo-title">Clear all local data?</h3>
            <p id="clear-demo-description">This resets demo transactions, categories, accounts, wealth positions, contributions, and FIRE assumptions.</p>
            <div className="sheet-actions">
              <button data-dialog-initial-focus className="secondary-button" type="button" onClick={() => setShowClearDialog(false)}>
                Cancel
              </button>
              <button className="danger-button" type="button" onClick={clearAllData}>
                Clear
              </button>
            </div>
          </aside>
        </div>
      ) : null}
    </main>
  );
}
