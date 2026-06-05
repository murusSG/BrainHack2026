import { useState } from 'react';
import { signIn } from '../services/auth';

export function LoginPage({ onAuthenticate, onOpenPublicDashboard }) {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!loginId.trim() || !password.trim()) {
      setError('Please enter your login ID and password.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const session = await signIn(loginId.trim(), password.trim());
      onAuthenticate?.(session);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-shell">
      <div className="login-backdrop-grid" aria-hidden="true" />

      <main className="login-panel-wrap">
        <section className="login-hero">
          <div className="login-brand-row">
            <div className="login-brand-mark">M</div>
            <div>
              <p className="login-brand-name">MURUS SG</p>
              <p className="login-brand-subtitle">Integrated Emergency Command</p>
            </div>
          </div>

          <p className="login-kicker">
            Unified crisis awareness for commanders, responders, hospitals, and residents.
          </p>
          <div className="login-access-split">
            <div className="login-access-card">
              <span className="login-access-tag">Operations Access</span>
              <p>Secured command workspace for foresight, allocations, hospital pressure, and agency review.</p>
            </div>
            <div className="login-access-card">
              <span className="login-access-tag public">Public Access</span>
              <p>Public-safe advisories, shelters, support resources, and trusted local instructions.</p>
            </div>
          </div>
        </section>

        <section className="login-card">
          <div className="login-card-head">
            <div>
              <p className="login-card-eyebrow">System Authentication</p>
              <h1 className="login-card-title">Login to continue</h1>
            </div>
            <p className="login-card-copy">
              Authenticated via Supabase. Role is assigned per your operator profile.
            </p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="login-form-grid">
              <label className="login-field">
                <span className="login-label">Email</span>
                <div className="login-input-shell">
                  <span className="login-input-icon" aria-hidden="true">ID</span>
                  <input
                    type="email"
                    value={loginId}
                    onChange={(event) => setLoginId(event.target.value)}
                    placeholder="leader.ops@murus.sg"
                    autoComplete="username"
                    disabled={loading}
                  />
                </div>
              </label>

              <label className="login-field">
                <span className="login-label">Password</span>
                <div className="login-input-shell">
                  <span className="login-input-icon" aria-hidden="true">*</span>
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter password"
                    autoComplete="current-password"
                    disabled={loading}
                  />
                </div>
              </label>
            </div>

            {error ? <p className="login-error">{error}</p> : null}

            <div className="login-actions">
              <button type="submit" className="login-submit-button" disabled={loading}>
                {loading ? 'Signing in…' : 'Login'}
              </button>
              <button
                type="button"
                className="login-public-button"
                onClick={() => onOpenPublicDashboard?.()}
                disabled={loading}
              >
                Open Public Dashboard
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
