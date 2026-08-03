import { useState, type FormEvent } from 'react';
import { Wallet } from 'lucide-react';
import { useFireBuddy } from '../app/FireBuddyProvider';
function AuthScreen() {
  const { authError, signIn, signUp } = useFireBuddy();
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const isSignUp = mode === 'sign-up';

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setNotice(null);

    try {
      if (isSignUp) {
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

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div className="auth-brand">
          <Wallet size={28} />
          <div>
            <h1>FireBuddy</h1>
            <p>Singapore FIRE tracker</p>
          </div>
        </div>

        <form className="auth-form" onSubmit={submit}>
          <div>
            <h2>{isSignUp ? 'Create your account' : 'Welcome back'}</h2>
            <p>{isSignUp ? 'Start tracking expenses against your FIRE plan.' : 'Sign in to sync expenses through Supabase.'}</p>
          </div>

          <label className="form-field">
            <span>Email</span>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
            />
          </label>

          <label className="form-field">
            <span>Password</span>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              minLength={6}
              required
            />
          </label>

          {authError ? <p className="form-error">{authError}</p> : null}
          {notice ? <p className="form-notice">{notice}</p> : null}

          <button className="primary-button full-width" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Please wait...' : isSignUp ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <button
          className="auth-mode-button"
          type="button"
          onClick={() => {
            setMode(isSignUp ? 'sign-in' : 'sign-up');
            setNotice(null);
          }}
        >
          {isSignUp ? 'Already have an account? Sign in' : 'New to FireBuddy? Create an account'}
        </button>
      </section>
    </main>
  );
}


export default AuthScreen;
