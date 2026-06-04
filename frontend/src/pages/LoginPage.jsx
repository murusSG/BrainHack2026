import { useState } from 'react';

export function LoginPage({ onAuthenticate }) {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(event) {
    event.preventDefault();

    if (!loginId.trim() || !password.trim()) {
      setError('Please enter your login ID and password.');
      return;
    }

    onAuthenticate?.({
      identity: loginId.trim()
    });
  }

  return (
    <div className="login-shell">
      <div className="login-backdrop-grid" aria-hidden="true" />
      <div className="login-backdrop-wave top" aria-hidden="true" />
      <div className="login-backdrop-wave bottom" aria-hidden="true" />

      <main className="login-panel-wrap">
        <section className="login-hero">
          <div className="login-brand-row">
            <div className="login-brand-mark">M</div>
            <div>
              <p className="login-brand-name">MURUS SG</p>
              <p className="login-brand-subtitle">Integrated Emergency Command</p>
            </div>
          </div>

          <p className="login-kicker">Unified platform for situational awareness and disaster response coordination.</p>
          <div className="login-access-split">
            <div className="login-access-card">
              <span className="login-access-tag">Leader Access</span>
              <p>Secured view for commanders, responders, hospitals, and volunteer coordinators.</p>
            </div>
            <div className="login-access-card">
              <span className="login-access-tag public">Public Access</span>
              <p>Open public-safe dashboard for nearby advisories, shelters, and trusted instructions.</p>
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
              Sign in with your login ID and password. Access level for public users, leaders, and responders is
              handled by backend authentication.
            </p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="login-form-grid">
              <label className="login-field">
                <span className="login-label">Login ID</span>
                <div className="login-input-shell">
                  <span className="login-input-icon" aria-hidden="true">
                    ID
                  </span>
                  <input
                    type="text"
                    value={loginId}
                    onChange={(event) => setLoginId(event.target.value)}
                    placeholder="e.g. your.login.id"
                  />
                </div>
              </label>

              <label className="login-field">
                <span className="login-label">Password</span>
                <div className="login-input-shell">
                  <span className="login-input-icon" aria-hidden="true">
                    *
                  </span>
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="e.g. securepassword123"
                  />
                </div>
              </label>
            </div>

            {error ? <p className="login-error">{error}</p> : null}

            <div className="login-actions">
              <button type="submit" className="login-submit-button">
                Login
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
