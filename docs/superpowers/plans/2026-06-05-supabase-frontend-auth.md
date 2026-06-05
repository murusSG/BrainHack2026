# Supabase Frontend Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the fake client-side login with real Supabase authentication while keeping the existing `{ identity, role }` session shape intact.

**Architecture:** A new `auth.js` service owns the Supabase client and exposes `signIn`, `signOut`, and `getSession`. `LoginPage.jsx` calls `signIn` and passes the result to `onAuthenticate`. `App.jsx` calls `getSession` on mount to restore sessions across page refreshes. Role is fetched from `GET /auth/me` on the Node API after Supabase login succeeds.

**Tech Stack:** `@supabase/supabase-js`, Vitest + React Testing Library (already installed)

---

### Task 1: Install Supabase client library

**Files:**
- Modify: `frontend/package.json`

- [ ] **Step 1: Install the package**

Run from `frontend/`:
```bash
npm install @supabase/supabase-js
```

Expected output: `added N packages` with `@supabase/supabase-js` listed.

- [ ] **Step 2: Verify it appears in dependencies**

Check `frontend/package.json` — you should see:
```json
"@supabase/supabase-js": "^2.x.x"
```

- [ ] **Step 3: Commit**

```bash
git add frontend/package.json frontend/package-lock.json
git commit -m "chore(frontend): add @supabase/supabase-js"
```

---

### Task 2: Add `authedGet` to the API service

**Files:**
- Modify: `frontend/src/services/api.js`

- [ ] **Step 1: Add the `authedGet` function**

Open `frontend/src/services/api.js`. After the existing `getRaw` function (line 33), add:

```js
async function authedGet(path, token) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`API ${path} failed: ${res.status} ${res.statusText}`);
  }
  const json = await res.json();
  return json.data ?? json;
}
```

Then export it by adding `authedGet` to the `api` object at the bottom:

```js
export const api = {
  // ... existing exports unchanged ...
  authedGet,
};
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/services/api.js
git commit -m "feat(frontend): add authedGet for bearer-token API calls"
```

---

### Task 3: Create the auth service

**Files:**
- Create: `frontend/src/services/auth.js`

- [ ] **Step 1: Create the file**

```js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[auth] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing from .env');
}

const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

async function fetchProfile(token) {
  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000/api/v1';
  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`/auth/me failed: ${res.status}`);
    const json = await res.json();
    return json.data ?? json;
  } catch (err) {
    console.error('[auth] /auth/me failed, defaulting to public role:', err.message);
    return null;
  }
}

export async function signIn(email, password) {
  if (!supabase) throw new Error('Authentication is unavailable: Supabase is not configured.');

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);

  const token = data.session.access_token;
  const profile = await fetchProfile(token);

  return {
    identity: data.user.email,
    role: profile?.role ?? 'public',
  };
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function getSession() {
  if (!supabase) return null;

  const { data } = await supabase.auth.getSession();
  if (!data.session) return null;

  const token = data.session.access_token;
  const profile = await fetchProfile(token);

  return {
    identity: data.session.user.email,
    role: profile?.role ?? 'public',
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/services/auth.js
git commit -m "feat(frontend): add Supabase auth service"
```

---

### Task 4: Update LoginPage to use real auth

**Files:**
- Modify: `frontend/src/pages/LoginPage.jsx`

- [ ] **Step 1: Replace the file contents**

```jsx
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
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/LoginPage.jsx
git commit -m "feat(frontend): wire LoginPage to Supabase signIn"
```

---

### Task 5: Restore session on page refresh in App.jsx

**Files:**
- Modify: `frontend/src/App.jsx`

- [ ] **Step 1: Add session restore and real sign-out**

Replace the top of `App.jsx` (imports + `App` component) with:

```jsx
import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AlertsPage } from './pages/AlertsPage';
import { DashboardLayout } from './layouts/DashboardLayout';
import { HospitalsPage } from './pages/HospitalsPage';
import { IncidentMapPage } from './pages/IncidentMapPage';
import { LoginPage } from './pages/LoginPage';
import { OverviewPage } from './pages/OverviewPage';
import { PublicDashboardPage } from './pages/PublicDashboardPage';
import { ResourcesPage } from './pages/ResourcesPage';
import { ResidentPage } from './pages/ResidentPage';
import { ResponderPage } from './pages/ResponderPage';
import { SystemFlowPage } from './pages/SystemFlowPage';
import { getSession, signOut } from './services/auth';
```

Then replace the `App` function:

```jsx
export default function App() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    getSession().then((restored) => {
      if (restored) setSession(restored);
    });
  }, []);

  async function handleSignOut() {
    await signOut();
    setSession(null);
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginRoute onAuthenticate={setSession} />} />
        <Route path="/public-dashboard" element={<PublicDashboardRoute session={session} />} />
        <Route path="/resident" element={<ResidentPage />} />
        <Route path="/responder" element={<ResponderPage />} />

        <Route path="/" element={<ProtectedCommandShell page="overview" session={session} onSignOut={handleSignOut} />} />
        <Route path="/incident-map" element={<ProtectedCommandShell page="incident-map" session={session} onSignOut={handleSignOut} />} />
        <Route path="/resources" element={<ProtectedCommandShell page="resources" session={session} onSignOut={handleSignOut} />} />
        <Route path="/hospitals" element={<ProtectedCommandShell page="hospitals" session={session} onSignOut={handleSignOut} />} />
        <Route path="/alerts" element={<ProtectedCommandShell page="alerts" session={session} onSignOut={handleSignOut} />} />
        <Route path="/system-flow" element={<ProtectedCommandShell page="system-flow" session={session} onSignOut={handleSignOut} />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
```

Keep `CommandShell`, `ProtectedCommandShell`, `LoginRoute`, and `PublicDashboardRoute` exactly as they are — no changes needed.

- [ ] **Step 2: Commit**

```bash
git add frontend/src/App.jsx
git commit -m "feat(frontend): restore Supabase session on page refresh"
```

---

### Task 6: Manual smoke test

- [ ] **Step 1: Start the Node API**

```bash
cd backend/node-api && npm run dev
```

Confirm it starts on port 3000.

- [ ] **Step 2: Start the frontend**

```bash
cd frontend && npm run dev
```

Open `http://localhost:5173`.

- [ ] **Step 3: Test bad credentials**

Enter a wrong email/password. Expected: error message appears below the form (e.g. `Invalid login credentials`). The button re-enables after failure.

- [ ] **Step 4: Test good credentials**

Enter a valid Supabase user email + password. Expected: redirected to `/`, topbar shows user initials derived from email.

- [ ] **Step 5: Test session restore**

After logging in, hard-refresh the page (`Ctrl+R`). Expected: stay on the dashboard — not redirected to `/login`.

- [ ] **Step 6: Test sign out**

Click Sign out. Expected: redirected to `/login`, session cleared.

- [ ] **Step 7: Test public dashboard**

Without logging in, click "Open Public Dashboard". Expected: public dashboard loads without auth.
