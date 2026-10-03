import { useState } from 'react';
import { Database, Download, Flame, Landmark, LogOut, Moon, ShieldCheck, Sparkles, Sun, Trash2, User } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import type { AiPreference } from '@firebuddy/shared';

import { deleteAccountPermanently, exportAccount } from '../api';
import { downloadBlob } from '../app/accountExport';
import { clearDemoStorage } from '../app/demoStorage';
import { useFireBuddy } from '../app/fireBuddyContext';
import { getDisplayName } from '../app/displayName';
import { AI_LEVEL_COPY } from '../components/EmberConsentPanel';
import { PageToolbar } from '../components/PageToolbar';
import { useAccessibleDialog } from '../components/useAccessibleDialog';
import { supabase } from '../supabase';

type ProfileProps = {
  onRequestLogout: () => void;
};

const AI_LEVELS: readonly AiPreference[] = ['off', 'guide', 'personalised'];
const DELETE_CONFIRMATION = 'DELETE';

/** Present the implemented profile controls without advertising disabled settings. */
export default function Profile({ onRequestLogout }: ProfileProps) {
  const { session, themeMode, toggleTheme, demoMode, aiPreference, aiPreferenceStatus, setAiPreference, profile, notify } = useFireBuddy();
  const navigate = useNavigate();
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isSavingAi, setIsSavingAi] = useState(false);
  const clearDialogRef = useAccessibleDialog<HTMLElement>({
    isOpen: showClearDialog,
    onClose: () => setShowClearDialog(false),
  });
  const deleteDialogRef = useAccessibleDialog<HTMLElement>({
    isOpen: showDeleteDialog,
    onClose: () => { if (!isDeleting) setShowDeleteDialog(false); },
  });
  const displayName = getDisplayName(session?.user);
  const initials = displayName
    .split(/[._\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'FB';
  const consentedAt = profile?.aiConsentedAt
    ? new Date(profile.aiConsentedAt).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  function clearAllData() {
    clearDemoStorage();
    window.location.reload();
  }

  async function chooseAiLevel(level: AiPreference) {
    if (level === aiPreference || isSavingAi) return;
    setIsSavingAi(true);
    try {
      await setAiPreference(level);
      notify(level === 'off' ? 'AI features switched off.' : `Ember set to ${AI_LEVEL_COPY[level].title}.`);
    } catch {
      // The provider already reverted the choice and showed the error.
    } finally {
      setIsSavingAi(false);
    }
  }

  /** Save the full export the backend builds, so the user holds a copy of everything we keep. */
  async function downloadMyData() {
    if (!session || isExporting) return;
    setIsExporting(true);
    try {
      const result = await exportAccount(session.access_token);
      downloadBlob(result.blob, result.filename);
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Unable to export your data.');
    } finally {
      setIsExporting(false);
    }
  }

  /** Remove the account, then end the session locally so no screen keeps a dead token. */
  async function deleteMyAccount() {
    if (!session || deleteConfirmation !== DELETE_CONFIRMATION || isDeleting) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteAccountPermanently(session.access_token);
      window.localStorage.clear();
      await supabase?.auth.signOut().catch(() => undefined);
      window.location.assign('/');
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Unable to delete your account right now.');
      setIsDeleting(false);
    }
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
        </article>

        <article className="settings-card ai-settings-card" aria-labelledby="ai-settings-title">
          <div className="setting-row setting-row-static">
            <span className="setting-icon"><Sparkles size={20} /></span>
            <div>
              <strong id="ai-settings-title">Ember and AI</strong>
              <p className="setting-description">Choose how much the AI guide may see. Off until you decide.</p>
            </div>
            <span className="setting-state">{aiPreferenceStatus === 'loading' && !demoMode ? 'Loading' : AI_LEVEL_COPY[aiPreference].title}</span>
          </div>
          <div className="ai-level-control">
            <div className="transaction-type-toggle ai-level-toggle" role="radiogroup" aria-label="AI level">
              {AI_LEVELS.map((level) => (
                <button
                  key={level}
                  className={aiPreference === level ? 'active' : ''}
                  type="button"
                  role="radio"
                  aria-checked={aiPreference === level}
                  disabled={isSavingAi || (aiPreferenceStatus === 'loading' && !demoMode)}
                  onClick={() => void chooseAiLevel(level)}
                >
                  {AI_LEVEL_COPY[level].title}
                </button>
              ))}
            </div>
            <p className="ai-level-summary">{AI_LEVEL_COPY[aiPreference].summary}</p>
            <p className="ai-level-meta">
              <ShieldCheck size={14} aria-hidden="true" />
              <span>
                {aiPreference === 'off'
                  ? 'No consent recorded. '
                  : consentedAt
                    ? `Consent recorded ${consentedAt}. `
                    : demoMode ? 'Demo mode: stored in this browser only. ' : ''}
                See the <Link to="/privacy">privacy notice</Link>.
              </span>
            </p>
          </div>
        </article>

        {session && !demoMode ? (
          <article className="settings-card" aria-label="Your data">
            <button className="setting-row" type="button" onClick={() => void downloadMyData()} disabled={isExporting}>
              <span className="setting-icon"><Download size={20} /></span>
              <strong>Download my data</strong>
              <span className="setting-state">{isExporting ? 'Preparing…' : 'JSON'}</span>
            </button>
            <button className="setting-row setting-row-danger" type="button" onClick={() => { setDeleteConfirmation(''); setDeleteError(null); setShowDeleteDialog(true); }}>
              <span className="setting-icon"><Trash2 size={20} /></span>
              <strong>Delete account</strong>
            </button>
          </article>
        ) : null}

        <article className="settings-card">
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

      {showDeleteDialog ? (
        <div className="sheet-backdrop">
          <aside
            ref={deleteDialogRef}
            className="confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-account-title"
            aria-describedby="delete-account-description"
            tabIndex={-1}
          >
            <h3 id="delete-account-title">Delete your account?</h3>
            <p id="delete-account-description">
              This permanently removes your sign in and every record you entered: transactions, categories, accounts, tags, wealth positions and your FIRE plan. Download your data first if you want a copy. Type {DELETE_CONFIRMATION} to confirm.
            </p>
            <label className="form-field">
              <span>Confirmation</span>
              <input
                data-dialog-initial-focus
                value={deleteConfirmation}
                onChange={(event) => setDeleteConfirmation(event.target.value.toUpperCase())}
                placeholder={DELETE_CONFIRMATION}
                autoComplete="off"
                disabled={isDeleting}
              />
            </label>
            {deleteError ? <p className="form-error" role="alert">{deleteError}</p> : null}
            <div className="sheet-actions">
              <button className="secondary-button" type="button" onClick={() => setShowDeleteDialog(false)} disabled={isDeleting}>
                Cancel
              </button>
              <button
                className="danger-button"
                type="button"
                onClick={() => void deleteMyAccount()}
                disabled={isDeleting || deleteConfirmation !== DELETE_CONFIRMATION}
              >
                {isDeleting ? 'Deleting…' : 'Delete account'}
              </button>
            </div>
          </aside>
        </div>
      ) : null}
    </main>
  );
}
