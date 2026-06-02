import { useState } from 'react';
import { useAuth } from '../store/AuthContext';

const shell = {
  minHeight: '100vh',
  display: 'grid',
  placeItems: 'center',
  padding: '24px',
};

const card = { width: 'min(420px, 100%)' };

/**
 * Gates the dashboard behind Supabase auth. The Leader Command View requires
 * the `leader` role. When Supabase isn't configured, falls through to a local
 * demo mode so the app still runs without credentials.
 */
export function LoginGate({ children }) {
  const { isAuthConfigured, loading, session, role, signIn, signUp, signOut, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('signin');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  if (!isAuthConfigured) {
    return (
      <>
        <div style={{ background: '#3a2d00', color: '#ffe08a', padding: '8px 16px', fontSize: 14 }}>
          Demo mode — Supabase auth is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable role gating.
        </div>
        {children}
      </>
    );
  }

  if (loading) {
    return <div style={shell}><p className="muted-copy">Loading…</p></div>;
  }

  if (!session) {
    const submit = async (event) => {
      event.preventDefault();
      setBusy(true);
      setError(null);
      const action = mode === 'signin' ? signIn : signUp;
      const { error: authError } = await action(email, password);
      if (authError) setError(authError.message);
      else if (mode === 'signup') setError('Check your inbox to confirm, then sign in.');
      setBusy(false);
    };

    return (
      <div style={shell}>
        <section className="panel" style={card}>
          <p className="eyebrow">murusSG Command</p>
          <h2>{mode === 'signin' ? 'Sign in' : 'Create account'}</h2>
          <form onSubmit={submit} style={{ display: 'grid', gap: 12, marginTop: 16 }}>
            <input type="email" required placeholder="Email" value={email}
              onChange={(e) => setEmail(e.target.value)} aria-label="Email" />
            <input type="password" required placeholder="Password" value={password}
              onChange={(e) => setPassword(e.target.value)} aria-label="Password" />
            {error && <p className="muted-copy" style={{ color: '#ff9d9d' }}>{error}</p>}
            <button type="submit" className="primary-button" disabled={busy}>
              {busy ? 'Working…' : mode === 'signin' ? 'Sign in' : 'Sign up'}
            </button>
          </form>
          <button type="button" className="ghost-button" style={{ marginTop: 12 }}
            onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); }}>
            {mode === 'signin' ? 'Need an account? Sign up' : 'Have an account? Sign in'}
          </button>
        </section>
      </div>
    );
  }

  if (role !== 'leader') {
    return (
      <div style={shell}>
        <section className="panel" style={card}>
          <p className="eyebrow">Awaiting access</p>
          <h2>Leader role required</h2>
          <p className="muted-copy">
            You are signed in as <strong>{user?.email}</strong> with the <strong>{role}</strong> role.
            The Command View is restricted to leaders. Ask an administrator to grant the leader role.
          </p>
          <button type="button" className="ghost-button" style={{ marginTop: 16 }} onClick={signOut}>
            Sign out
          </button>
        </section>
      </div>
    );
  }

  return children;
}
