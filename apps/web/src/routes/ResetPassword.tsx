import { useState, type FormEvent } from 'react';
import { Eye, EyeOff, LockKeyhole } from 'lucide-react';
import { Link, useNavigate } from 'react-router';

import { useFireBuddy } from '../app/FireBuddyProvider';
import AuthShell from './AuthShell';

function ResetPassword() {
  const { authError, clearAuthError, session, signOut, updatePassword } = useFireBuddy();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Validates both password entries before updating the authenticated recovery session.
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setLocalError(null);
    clearAuthError();

    if (password !== confirmation) {
      setLocalError('The passwords do not match.');
      return;
    }

    setIsSubmitting(true);

    try {
      await updatePassword(password);
      await signOut();
      navigate('/', {
        replace: true,
        state: { authNotice: 'Password updated. Sign in with your new password.' },
      });
    } catch {
      // Provider errors are rendered below the form.
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!session) {
    return (
      <AuthShell>
        <header className="auth-heading">
          <h1>Reset link unavailable</h1>
          <p>This password reset link is invalid or has expired. Request a new link to continue.</p>
        </header>
        <Link className="primary-button auth-submit-button auth-link-button" to="/">
          Return to sign in
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <header className="auth-heading">
        <h1>Choose a new password</h1>
        <p>Use at least six characters and keep your FireBuddy account secure.</p>
      </header>

      <form className="auth-form" onSubmit={submit}>
        <div className="auth-field">
          <label htmlFor="new-password">New password</label>
          <div className="auth-input-shell">
            <LockKeyhole size={18} aria-hidden="true" />
            <input
              id="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Enter a new password"
              minLength={6}
              required
              autoFocus
            />
            <button
              className="auth-password-toggle"
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? 'Hide passwords' : 'Show passwords'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div className="auth-field">
          <label htmlFor="confirm-password">Confirm new password</label>
          <div className="auth-input-shell">
            <LockKeyhole size={18} aria-hidden="true" />
            <input
              id="confirm-password"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Repeat your new password"
              minLength={6}
              required
            />
          </div>
        </div>

        {localError ? <p className="form-error" role="alert">{localError}</p> : null}
        {authError ? <p className="form-error" role="alert">{authError}</p> : null}

        <button className="primary-button auth-submit-button" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Updating password...' : 'Update password'}
        </button>
      </form>
    </AuthShell>
  );
}

export default ResetPassword;
