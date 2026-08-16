import { useState, type FormEvent } from 'react';
import { Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react';
import { useLocation } from 'react-router';

import { useFireBuddy } from '../app/FireBuddyProvider';
import AuthShell from './AuthShell';

type AuthMode = 'sign-in' | 'sign-up' | 'forgot-password';

interface AuthLocationState {
  authNotice?: string;
}

function AuthScreen() {
  const { authError, clearAuthError, requestPasswordReset, signIn, signUp } = useFireBuddy();
  const location = useLocation();
  const routeNotice = (location.state as AuthLocationState | null)?.authNotice ?? null;
  const [mode, setMode] = useState<AuthMode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(routeNotice);
  const isSignUp = mode === 'sign-up';
  const isForgotPassword = mode === 'forgot-password';

  // Sends the selected auth action while keeping all errors in the shared provider.
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setNotice(null);

    try {
      if (isForgotPassword) {
        await requestPasswordReset(email.trim());
        setNotice('If an account exists for that email, a password reset link is on its way.');
      } else if (isSignUp) {
        await signUp(email.trim(), password);
        setNotice('Account created. Check your email if Supabase asks for confirmation.');
      } else {
        await signIn(email.trim(), password);
      }
    } catch {
      // The provider stores the user-facing error message.
    } finally {
      setIsSubmitting(false);
    }
  }

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setPassword('');
    setShowPassword(false);
    setNotice(null);
    clearAuthError();
  }

  const title = isForgotPassword ? 'Reset your password' : isSignUp ? 'Create your account' : 'Welcome back';
  const description = isForgotPassword
    ? 'Enter your email and we will send you a secure reset link.'
    : isSignUp
      ? 'Start building a clearer path towards financial independence.'
      : 'Sign in to continue your FIRE journey.';

  return (
    <AuthShell>
      <header className="auth-heading">
        <h1>{title}</h1>
        <p>{description}</p>
      </header>

      <form className="auth-form" onSubmit={submit}>
        <div className="auth-field">
          <label htmlFor="auth-email">Email</label>
          <div className="auth-input-shell">
            <Mail size={18} aria-hidden="true" />
            <input
              id="auth-email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
              autoFocus
            />
          </div>
        </div>

        {!isForgotPassword ? (
          <div className="auth-field">
            <div className="auth-label-row">
              <label htmlFor="auth-password">Password</label>
              {!isSignUp ? (
                <button className="auth-text-button" type="button" onClick={() => switchMode('forgot-password')}>
                  Forgot password?
                </button>
              ) : null}
            </div>
            <div className="auth-input-shell">
              <LockKeyhole size={18} aria-hidden="true" />
              <input
                id="auth-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type={showPassword ? 'text' : 'password'}
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                placeholder="Enter your password"
                minLength={6}
                required
              />
              <button
                className="auth-password-toggle"
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
        ) : null}

        {authError ? <p className="form-error" role="alert">{authError}</p> : null}
        {notice ? <p className="form-notice" role="status">{notice}</p> : null}

        <button className="primary-button auth-submit-button" type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? 'Please wait...'
            : isForgotPassword
              ? 'Send reset link'
              : isSignUp
                ? 'Create account'
                : 'Sign in'}
        </button>
      </form>

      <div className="auth-mode-row">
        {isForgotPassword ? (
          <button className="auth-mode-button" type="button" onClick={() => switchMode('sign-in')}>
            Back to sign in
          </button>
        ) : (
          <>
            <span>{isSignUp ? 'Already have an account?' : "Don't have an account?"}</span>
            <button
              className="auth-mode-button"
              type="button"
              onClick={() => switchMode(isSignUp ? 'sign-in' : 'sign-up')}
            >
              {isSignUp ? 'Sign in' : 'Create one'}
            </button>
          </>
        )}
      </div>
    </AuthShell>
  );
}

export default AuthScreen;
