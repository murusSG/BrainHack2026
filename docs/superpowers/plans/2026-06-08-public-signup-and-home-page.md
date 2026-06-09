# Public Sign Up & Home Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a public-facing home page at `/`, a public sign-up flow (`/signup`), Google OAuth, and gate the Public Dashboard behind login — using Mantine themed to the existing Singapore-red/Inter/cream palette.

**Architecture:** Frontend gains `HomePage` and `SignUpPage`, an updated `LoginPage`, and restructured routing (`/` = home, ops overview moves to `/overview`, `/public-dashboard` becomes protected, role-based post-login redirect). Auth grows `signUp` + `signInWithGoogle` in `services/auth.js`. A new Supabase migration adds `full_name`/`phone` to `profiles` and updates the existing `handle_new_user` trigger to copy signup metadata. The Node API surfaces the two new profile fields.

**Tech Stack:** React 18 + Vite, react-router-dom 7, Mantine 7, Supabase JS v2, Vitest + Testing Library (frontend), Jest (Node API), PostgreSQL (Supabase).

---

## File Structure

**Frontend (create):**
- `frontend/src/theme.js` — Mantine theme mapping (brand red, Inter, light).
- `frontend/src/pages/HomePage.jsx` — public landing page.
- `frontend/src/pages/SignUpPage.jsx` — public registration form.
- `frontend/src/lib/authRouting.js` — `resolvePostLoginPath(role, from)` pure helper.
- `frontend/tests/renderWithProviders.jsx` — test helper wrapping Mantine + Router.
- `frontend/tests/unit/HomePage.test.jsx`
- `frontend/tests/unit/SignUpPage.test.jsx`
- `frontend/tests/unit/LoginPage.test.jsx`
- `frontend/tests/unit/auth.test.js`
- `frontend/tests/unit/authRouting.test.js`
- `frontend/tests/unit/AppRoutes.test.jsx`

**Frontend (modify):**
- `frontend/package.json` — add `@mantine/core`, `@mantine/hooks`.
- `frontend/src/main.jsx` — wrap `<App/>` in `MantineProvider`.
- `frontend/src/services/auth.js` — add `signUp`, `signInWithGoogle`.
- `frontend/src/pages/LoginPage.jsx` — add Google + "Create an account", remove Public Dashboard button.
- `frontend/src/App.jsx` — extract `AppRoutes`; `/`→HomePage, `/signup`, `/overview`, gate `/public-dashboard`, role redirect.

**Backend (create):**
- `backend/node-api/scripts/migrations/006_profiles_signup_fields.sql`

**Backend (modify):**
- `backend/node-api/src/repositories/auth.repo.ts` — add `full_name`, `phone`.
- `backend/node-api/src/middlewares/auth.ts` — add `fullName`, `phone` to `AuthUser`.

---

## Task 1: Install and configure Mantine

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/src/theme.js`
- Modify: `frontend/src/main.jsx`

- [ ] **Step 1: Install Mantine**

Run (from `frontend/`):
```bash
npm install @mantine/core@^7 @mantine/hooks@^7
```
Expected: `package.json` dependencies now include both packages; no errors.

- [ ] **Step 2: Create the theme**

Create `frontend/src/theme.js`:
```js
import { createTheme } from '@mantine/core';

// Singapore-red brand scale (light → dark). Index 6 is the primary shade,
// matching the existing #ef3344 / #c5162b accent used across the public pages.
const brandRed = [
  '#ffe9ec',
  '#ffccd2',
  '#f89aa4',
  '#f26674',
  '#ef3344',
  '#e51b30',
  '#c5162b',
  '#a61124',
  '#85091a',
  '#5e0411',
];

export const theme = createTheme({
  fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
  primaryColor: 'brandRed',
  primaryShade: 6,
  colors: { brandRed },
  defaultRadius: 'md',
  headings: { fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif', fontWeight: '800' },
});
```

- [ ] **Step 3: Wrap the app with MantineProvider**

Replace `frontend/src/main.jsx` contents:
```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';
import App from './App';
import { theme } from './theme';
import './styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="light">
      <App />
    </MantineProvider>
  </React.StrictMode>
);
```
Note: `@mantine/core/styles.css` is imported BEFORE `globals.css` so existing custom styles win on conflicts.

- [ ] **Step 4: Verify the app still boots**

Run (from `frontend/`): `npm run dev`
Expected: Vite starts on port 5173 with no console errors. Stop the server after confirming.

- [ ] **Step 5: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/src/theme.js frontend/src/main.jsx
git commit -m "feat(frontend): add Mantine themed to brand palette"
```

---

## Task 2: Add the test provider helper

**Files:**
- Create: `frontend/tests/renderWithProviders.jsx`

- [ ] **Step 1: Create the helper**

Create `frontend/tests/renderWithProviders.jsx`:
```jsx
import { render } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { MemoryRouter } from 'react-router-dom';
import { theme } from '../src/theme';

// Wraps a component in the same providers main.jsx uses, plus a routing
// context, so Mantine components and react-router hooks work in tests.
export function renderWithProviders(ui, { route = '/' } = {}) {
  return render(
    <MantineProvider theme={theme} defaultColorScheme="light">
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </MantineProvider>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/tests/renderWithProviders.jsx
git commit -m "test(frontend): add Mantine+Router render helper"
```

---

## Task 3: Database migration — profiles fields + trigger

**Files:**
- Create: `backend/node-api/scripts/migrations/006_profiles_signup_fields.sql`

- [ ] **Step 1: Write the migration**

Create `backend/node-api/scripts/migrations/006_profiles_signup_fields.sql`:
```sql
-- Run this in your Supabase SQL editor after 003_profiles_roles.sql.
-- Adds public-signup fields and copies them from auth signup metadata.

alter table profiles add column if not exists full_name text;
alter table profiles add column if not exists phone text;

-- Replace the existing handle_new_user() so it also copies full_name / phone
-- from the signup metadata (works for both email/password and Google signups;
-- phone will be null for Google unless collected later).
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name, phone)
  values (
    new.id,
    'public',
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'phone'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Trigger on_auth_user_created already exists from 003; recreating the function
-- above is sufficient. No trigger change required.
```

- [ ] **Step 2: Apply it (manual)**

Open the Supabase project SQL editor and run the contents of `006_profiles_signup_fields.sql`.
Expected: "Success. No rows returned." Verify with:
```sql
select column_name from information_schema.columns
where table_name = 'profiles' order by column_name;
```
Expected columns include `full_name` and `phone`.

- [ ] **Step 3: Commit**

```bash
git add backend/node-api/scripts/migrations/006_profiles_signup_fields.sql
git commit -m "feat(db): add full_name/phone to profiles and signup trigger"
```

---

## Task 4: Auth service — signUp and signInWithGoogle

**Files:**
- Modify: `frontend/src/services/auth.js`
- Test: `frontend/tests/unit/auth.test.js`

- [ ] **Step 1: Write the failing test**

Create `frontend/tests/unit/auth.test.js`:
```js
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Fake Supabase client whose methods we assert against.
const mockAuth = {
  signUp: vi.fn(),
  signInWithOAuth: vi.fn(),
};
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ auth: mockAuth }),
}));
// /auth/me lookup — default to a public profile.
vi.mock('../../src/services/api', () => ({
  api: { authedGet: vi.fn().mockResolvedValue({ role: 'public' }) },
}));

async function loadAuth() {
  vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key');
  vi.resetModules();
  return import('../../src/services/auth');
}

beforeEach(() => {
  mockAuth.signUp.mockReset();
  mockAuth.signInWithOAuth.mockReset();
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe('signUp', () => {
  it('passes full_name and phone as metadata and returns the session shape', async () => {
    mockAuth.signUp.mockResolvedValue({
      data: { user: { email: 'a@b.com' }, session: { access_token: 'tok' } },
      error: null,
    });
    const { signUp } = await loadAuth();

    const session = await signUp('Tan Wei Ming', '91234567', 'a@b.com', 'secret123');

    expect(mockAuth.signUp).toHaveBeenCalledWith({
      email: 'a@b.com',
      password: 'secret123',
      options: { data: { full_name: 'Tan Wei Ming', phone: '91234567' } },
    });
    expect(session).toEqual({ identity: 'a@b.com', role: 'public', token: 'tok' });
  });

  it('throws when Supabase returns an error', async () => {
    mockAuth.signUp.mockResolvedValue({ data: {}, error: { message: 'User already registered' } });
    const { signUp } = await loadAuth();
    await expect(signUp('A', '91234567', 'a@b.com', 'secret123')).rejects.toThrow(
      'User already registered'
    );
  });
});

describe('signInWithGoogle', () => {
  it('calls signInWithOAuth with the google provider and a redirect', async () => {
    mockAuth.signInWithOAuth.mockResolvedValue({ data: {}, error: null });
    const { signInWithGoogle } = await loadAuth();

    await signInWithGoogle();

    expect(mockAuth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: expect.any(String) },
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run (from `frontend/`): `npm test -- auth.test`
Expected: FAIL — `signUp`/`signInWithGoogle` are not exported.

- [ ] **Step 3: Implement the functions**

In `frontend/src/services/auth.js`, add after the existing `signIn` function:
```js
export async function signUp(fullName, phone, email, password) {
  if (!supabase) throw new Error('Authentication is unavailable: Supabase is not configured.');

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName, phone } },
  });
  if (error) throw new Error(error.message);
  if (!data.session) {
    throw new Error('Account created. Please confirm your email, then log in.');
  }

  const token = data.session.access_token;
  const profile = await api
    .authedGet('/auth/me', token)
    .catch((err) => {
      console.error('[auth] /auth/me failed after signup, defaulting to public role:', err.message);
      return null;
    });

  return {
    identity: data.user.email,
    role: profile?.role ?? 'public',
    token,
  };
}

export async function signInWithGoogle() {
  if (!supabase) throw new Error('Authentication is unavailable: Supabase is not configured.');

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  });
  if (error) throw new Error(error.message);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run (from `frontend/`): `npm test -- auth.test`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/services/auth.js frontend/tests/unit/auth.test.js
git commit -m "feat(frontend): add signUp and signInWithGoogle to auth service"
```

---

## Task 5: Post-login routing helper

**Files:**
- Create: `frontend/src/lib/authRouting.js`
- Test: `frontend/tests/unit/authRouting.test.js`

- [ ] **Step 1: Write the failing test**

Create `frontend/tests/unit/authRouting.test.js`:
```js
import { describe, expect, it } from 'vitest';
import { resolvePostLoginPath } from '../../src/lib/authRouting';

describe('resolvePostLoginPath', () => {
  it('sends public users to the public dashboard', () => {
    expect(resolvePostLoginPath('public')).toBe('/public-dashboard');
  });

  it('sends leaders and responders to the ops overview', () => {
    expect(resolvePostLoginPath('leader')).toBe('/overview');
    expect(resolvePostLoginPath('responder')).toBe('/overview');
  });

  it('honors an explicit "from" path when provided', () => {
    expect(resolvePostLoginPath('leader', '/resources')).toBe('/resources');
  });

  it('ignores "from" when it points at an auth page', () => {
    expect(resolvePostLoginPath('public', '/login')).toBe('/public-dashboard');
    expect(resolvePostLoginPath('public', '/signup')).toBe('/public-dashboard');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run (from `frontend/`): `npm test -- authRouting`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the helper**

Create `frontend/src/lib/authRouting.js`:
```js
// Decides where to send a user after authentication.
// - An explicit `from` (a page they were bounced off) wins, unless it is an auth page.
// - Otherwise: public users land on the public dashboard, staff on the ops overview.
const AUTH_PATHS = new Set(['/login', '/signup']);

export function resolvePostLoginPath(role, from) {
  if (from && !AUTH_PATHS.has(from)) return from;
  return role === 'public' ? '/public-dashboard' : '/overview';
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run (from `frontend/`): `npm test -- authRouting`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/authRouting.js frontend/tests/unit/authRouting.test.js
git commit -m "feat(frontend): add resolvePostLoginPath helper"
```

---

## Task 6: HomePage component

**Files:**
- Create: `frontend/src/pages/HomePage.jsx`
- Test: `frontend/tests/unit/HomePage.test.jsx`

- [ ] **Step 1: Write the failing test**

Create `frontend/tests/unit/HomePage.test.jsx`:
```jsx
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '../renderWithProviders';
import { HomePage } from '../../src/pages/HomePage';

describe('HomePage', () => {
  it('renders the headline and the three feature cards', () => {
    renderWithProviders(<HomePage />);
    expect(screen.getByText(/One picture of the crisis/i)).toBeInTheDocument();
    expect(screen.getByText('Live Incident Map')).toBeInTheDocument();
    expect(screen.getByText('Foresight Engine')).toBeInTheDocument();
    expect(screen.getByText('Public Advisories')).toBeInTheDocument();
  });

  it('links Log In to /login and Sign Up to /signup', () => {
    renderWithProviders(<HomePage />);
    expect(screen.getByRole('link', { name: 'Log In' })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: 'Sign Up' })).toHaveAttribute('href', '/signup');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run (from `frontend/`): `npm test -- HomePage`
Expected: FAIL — `HomePage` not found.

- [ ] **Step 3: Implement HomePage**

Create `frontend/src/pages/HomePage.jsx`:
```jsx
import { Link } from 'react-router-dom';
import { Badge, Box, Button, Card, Container, Group, SimpleGrid, Text, Title } from '@mantine/core';

const FEATURES = [
  { title: 'Live Incident Map', body: 'Active hazards & shelters near you.' },
  { title: 'Foresight Engine', body: 'Predicts escalation before it spreads.' },
  { title: 'Public Advisories', body: 'Trusted, official safety instructions.' },
];

export function HomePage() {
  return (
    <Box mih="100vh" bg="linear-gradient(180deg, #fff9f7 0%, #fff1ed 100%)">
      <Group justify="space-between" px="lg" py="md" style={{ borderBottom: '1px solid rgba(166,17,34,0.12)' }}>
        <Group gap="sm">
          <Box
            w={28}
            h={28}
            style={{
              borderRadius: 8,
              display: 'grid',
              placeItems: 'center',
              color: '#fff8f8',
              fontWeight: 900,
              background: 'linear-gradient(180deg, #ea3948, #c5162b)',
            }}
          >
            M
          </Box>
          <Text fw={900}>MURUS SG</Text>
        </Group>
        <Group gap="sm">
          <Button component={Link} to="/login" variant="default">
            Log In
          </Button>
          <Button component={Link} to="/signup">
            Sign Up
          </Button>
        </Group>
      </Group>

      <Container size="md" py={56} ta="center">
        <Badge color="brandRed" variant="light" radius="xl" mb="md">
          Unified Crisis Management
        </Badge>
        <Title order={1} fz={{ base: 32, sm: 44 }} fw={900} lh={1.1}>
          One picture of the crisis.
          <br />
          <Text span c="brandRed.6" inherit>
            Every responder aligned.
          </Text>
        </Title>
        <Text c="dimmed" mt="md" maw={520} mx="auto">
          Real-time incident awareness, resource allocation & public advisories — for commanders,
          responders, hospitals and residents.
        </Text>

        <SimpleGrid cols={{ base: 1, sm: 3 }} mt={48} spacing="md">
          {FEATURES.map((f) => (
            <Card key={f.title} withBorder radius="md" padding="lg" ta="left">
              <Text fw={700}>{f.title}</Text>
              <Text c="dimmed" fz="sm" mt={4}>
                {f.body}
              </Text>
            </Card>
          ))}
        </SimpleGrid>
      </Container>

      <Box ta="center" py="md" c="dimmed" fz="xs" style={{ borderTop: '1px solid rgba(166,17,34,0.1)' }}>
        A Singapore command network service
      </Box>
    </Box>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run (from `frontend/`): `npm test -- HomePage`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/HomePage.jsx frontend/tests/unit/HomePage.test.jsx
git commit -m "feat(frontend): add public HomePage"
```

---

## Task 7: SignUpPage component

**Files:**
- Create: `frontend/src/pages/SignUpPage.jsx`
- Test: `frontend/tests/unit/SignUpPage.test.jsx`

- [ ] **Step 1: Write the failing test**

Create `frontend/tests/unit/SignUpPage.test.jsx`:
```jsx
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../renderWithProviders';
import { SignUpPage } from '../../src/pages/SignUpPage';
import { signUp, signInWithGoogle } from '../../src/services/auth';

vi.mock('../../src/services/auth', () => ({
  signUp: vi.fn(),
  signInWithGoogle: vi.fn(),
}));

afterEach(() => vi.clearAllMocks());

function fill(user, { name = 'Tan Wei Ming', email = 'a@b.com', phone = '91234567', pw = 'secret123', confirm = 'secret123' } = {}) {
  return (async () => {
    await user.type(screen.getByLabelText('Full name'), name);
    await user.type(screen.getByLabelText('Email'), email);
    await user.type(screen.getByLabelText('Phone number'), phone);
    await user.type(screen.getByLabelText('Password'), pw);
    await user.type(screen.getByLabelText('Confirm password'), confirm);
  })();
}

describe('SignUpPage', () => {
  it('blocks submit when passwords do not match', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SignUpPage onAuthenticate={vi.fn()} />);
    await fill(user, { confirm: 'different' });
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText('Passwords do not match.')).toBeInTheDocument();
    expect(signUp).not.toHaveBeenCalled();
  });

  it('submits valid input and calls onAuthenticate', async () => {
    signUp.mockResolvedValue({ identity: 'a@b.com', role: 'public', token: 'tok' });
    const onAuthenticate = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<SignUpPage onAuthenticate={onAuthenticate} />);
    await fill(user);
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    await waitFor(() => {
      expect(signUp).toHaveBeenCalledWith('Tan Wei Ming', '91234567', 'a@b.com', 'secret123');
      expect(onAuthenticate).toHaveBeenCalledWith({ identity: 'a@b.com', role: 'public', token: 'tok' });
    });
  });

  it('shows the Supabase error when signup fails', async () => {
    signUp.mockRejectedValue(new Error('User already registered'));
    const user = userEvent.setup();
    renderWithProviders(<SignUpPage onAuthenticate={vi.fn()} />);
    await fill(user);
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText('User already registered')).toBeInTheDocument();
  });

  it('triggers Google signup', async () => {
    signInWithGoogle.mockResolvedValue();
    const user = userEvent.setup();
    renderWithProviders(<SignUpPage onAuthenticate={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /Continue with Google/i }));
    expect(signInWithGoogle).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run (from `frontend/`): `npm test -- SignUpPage`
Expected: FAIL — `SignUpPage` not found.

- [ ] **Step 3: Implement SignUpPage**

Create `frontend/src/pages/SignUpPage.jsx`:
```jsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Anchor, Box, Button, Card, Container, Divider, Group, PasswordInput, Stack, Text, TextInput, Title,
} from '@mantine/core';
import { signUp, signInWithGoogle } from '../services/auth';

const PHONE_RE = /^(\+65)?[689]\d{7}$/;

export function SignUpPage({ onAuthenticate }) {
  const [values, setValues] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function update(field) {
    return (event) => setValues((v) => ({ ...v, [field]: event.target.value }));
  }

  function validate() {
    if (!values.name.trim()) return 'Please enter your full name.';
    if (!/^\S+@\S+\.\S+$/.test(values.email.trim())) return 'Please enter a valid email.';
    if (!PHONE_RE.test(values.phone.replace(/\s/g, ''))) return 'Please enter a valid Singapore phone number.';
    if (values.password.length < 6) return 'Password must be at least 6 characters.';
    if (values.password !== values.confirm) return 'Passwords do not match.';
    return '';
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const message = validate();
    if (message) {
      setError(message);
      return;
    }
    setError('');
    setLoading(true);
    try {
      const session = await signUp(
        values.name.trim(),
        values.phone.replace(/\s/g, ''),
        values.email.trim(),
        values.password
      );
      onAuthenticate?.(session);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError('');
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <Box mih="100vh" bg="linear-gradient(180deg, #fff9f7 0%, #fff1ed 100%)">
      <Container size={460} py={56}>
        <Card withBorder radius="md" padding="xl" bg="rgba(255,255,255,0.94)">
          <Text c="brandRed.6" fz="xs" fw={700} tt="uppercase" lts="0.12em">
            Public Registration
          </Text>
          <Title order={2} fw={900} mt={4}>
            Create your account
          </Title>
          <Text c="dimmed" fz="sm" mt={4} mb="lg">
            Sign up to access live advisories, shelters, and report incidents.
          </Text>

          <form onSubmit={handleSubmit}>
            <Stack gap="sm">
              <TextInput label="Full name" value={values.name} onChange={update('name')} disabled={loading} />
              <TextInput label="Email" type="email" value={values.email} onChange={update('email')} disabled={loading} />
              <TextInput label="Phone number" value={values.phone} onChange={update('phone')} placeholder="91234567" disabled={loading} />
              <PasswordInput label="Password" value={values.password} onChange={update('password')} disabled={loading} />
              <PasswordInput label="Confirm password" value={values.confirm} onChange={update('confirm')} disabled={loading} />
              {error ? <Text c="brandRed.6" fz="sm">{error}</Text> : null}
              <Button type="submit" loading={loading} fullWidth>
                Create account
              </Button>
            </Stack>
          </form>

          <Divider label="or" labelPosition="center" my="md" />
          <Button variant="default" fullWidth onClick={handleGoogle} disabled={loading}>
            Continue with Google
          </Button>

          <Group justify="center" mt="md">
            <Text fz="sm" c="dimmed">
              Already have an account?{' '}
              <Anchor component={Link} to="/login" c="brandRed.6" fw={700}>
                Log in
              </Anchor>
            </Text>
          </Group>
        </Card>
      </Container>
    </Box>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run (from `frontend/`): `npm test -- SignUpPage`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/SignUpPage.jsx frontend/tests/unit/SignUpPage.test.jsx
git commit -m "feat(frontend): add public SignUpPage"
```

---

## Task 8: Update LoginPage (Google + signup link, remove Public Dashboard)

**Files:**
- Modify: `frontend/src/pages/LoginPage.jsx`
- Test: `frontend/tests/unit/LoginPage.test.jsx`

- [ ] **Step 1: Write the failing test**

Create `frontend/tests/unit/LoginPage.test.jsx`:
```jsx
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../renderWithProviders';
import { LoginPage } from '../../src/pages/LoginPage';
import { signIn, signInWithGoogle } from '../../src/services/auth';

vi.mock('../../src/services/auth', () => ({
  signIn: vi.fn(),
  signInWithGoogle: vi.fn(),
}));

afterEach(() => vi.clearAllMocks());

describe('LoginPage', () => {
  it('no longer shows the Open Public Dashboard button', () => {
    renderWithProviders(<LoginPage onAuthenticate={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /Open Public Dashboard/i })).toBeNull();
  });

  it('shows a Create an account link to /signup', () => {
    renderWithProviders(<LoginPage onAuthenticate={vi.fn()} />);
    expect(screen.getByRole('link', { name: /Create an account/i })).toHaveAttribute('href', '/signup');
  });

  it('triggers Google login', async () => {
    signInWithGoogle.mockResolvedValue();
    const user = userEvent.setup();
    renderWithProviders(<LoginPage onAuthenticate={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /Continue with Google/i }));
    expect(signInWithGoogle).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run (from `frontend/`): `npm test -- LoginPage`
Expected: FAIL — current `LoginPage` has the Public Dashboard button and no signup link/Google button.

- [ ] **Step 3: Rewrite LoginPage**

Replace `frontend/src/pages/LoginPage.jsx` contents:
```jsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Anchor, Box, Button, Card, Container, Divider, Group, PasswordInput, Stack, Text, TextInput, Title,
} from '@mantine/core';
import { signIn, signInWithGoogle } from '../services/auth';

export function LoginPage({ onAuthenticate }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const session = await signIn(email.trim(), password.trim());
      onAuthenticate?.(session);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError('');
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <Box mih="100vh" bg="linear-gradient(180deg, #fff9f7 0%, #fff1ed 100%)">
      <Container size={460} py={56}>
        <Card withBorder radius="md" padding="xl" bg="rgba(255,255,255,0.94)">
          <Text c="brandRed.6" fz="xs" fw={700} tt="uppercase" lts="0.12em">
            System Authentication
          </Text>
          <Title order={2} fw={900} mt={4}>
            Log in to continue
          </Title>
          <Text c="dimmed" fz="sm" mt={4} mb="lg">
            For commanders, responders, hospitals and registered residents.
          </Text>

          <form onSubmit={handleSubmit}>
            <Stack gap="sm">
              <TextInput
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="leader.ops@murus.sg"
                autoComplete="username"
                disabled={loading}
              />
              <PasswordInput
                label="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                disabled={loading}
              />
              {error ? <Text c="brandRed.6" fz="sm">{error}</Text> : null}
              <Button type="submit" loading={loading} fullWidth>
                Log in
              </Button>
            </Stack>
          </form>

          <Divider label="or" labelPosition="center" my="md" />
          <Button variant="default" fullWidth onClick={handleGoogle} disabled={loading}>
            Continue with Google
          </Button>

          <Group justify="center" mt="md">
            <Text fz="sm" c="dimmed">
              New here?{' '}
              <Anchor component={Link} to="/signup" c="brandRed.6" fw={700}>
                Create an account
              </Anchor>
            </Text>
          </Group>
        </Card>
      </Container>
    </Box>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run (from `frontend/`): `npm test -- LoginPage`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/LoginPage.jsx frontend/tests/unit/LoginPage.test.jsx
git commit -m "feat(frontend): rebuild LoginPage with Google + signup link"
```

---

## Task 9: Routing — AppRoutes, home at /, /signup, /overview, gated dashboard

**Files:**
- Modify: `frontend/src/App.jsx`
- Test: `frontend/tests/unit/AppRoutes.test.jsx`

- [ ] **Step 1: Write the failing test**

Create `frontend/tests/unit/AppRoutes.test.jsx`:
```jsx
import { screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { MemoryRouter } from 'react-router-dom';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AppRoutes } from '../../src/App';
import { theme } from '../../src/theme';

// Stub heavy page bodies so routing is what we assert, not their internals.
vi.mock('../../src/pages/PublicDashboardPage', () => ({
  PublicDashboardPage: () => <div>public dashboard body</div>,
}));
vi.mock('../../src/layouts/DashboardLayout', () => ({
  DashboardLayout: ({ children }) => <div>ops shell{children}</div>,
}));
vi.mock('../../src/pages/OverviewPage', () => ({ OverviewPage: () => <div>overview body</div> }));

function renderAt(route, props = {}) {
  const base = { session: null, restoring: false, onAuthenticate: vi.fn(), onSignOut: vi.fn() };
  return render(
    <MantineProvider theme={theme} defaultColorScheme="light">
      <MemoryRouter initialEntries={[route]}>
        <AppRoutes {...base} {...props} />
      </MemoryRouter>
    </MantineProvider>
  );
}

describe('AppRoutes', () => {
  it('renders the HomePage at / without redirecting', () => {
    renderAt('/');
    expect(screen.getByText(/One picture of the crisis/i)).toBeInTheDocument();
  });

  it('renders the SignUpPage at /signup', () => {
    renderAt('/signup');
    expect(screen.getByText('Create your account')).toBeInTheDocument();
  });

  it('redirects /public-dashboard to /login when unauthenticated', () => {
    renderAt('/public-dashboard');
    expect(screen.getByText('Log in to continue')).toBeInTheDocument();
  });

  it('shows the public dashboard when a session exists', () => {
    renderAt('/public-dashboard', { session: { identity: 'a@b.com', role: 'public', token: 't' } });
    expect(screen.getByText('public dashboard body')).toBeInTheDocument();
  });

  it('renders the ops overview at /overview for a leader', () => {
    renderAt('/overview', { session: { identity: 'l@b.com', role: 'leader', token: 't' } });
    expect(screen.getByText('overview body')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run (from `frontend/`): `npm test -- AppRoutes`
Expected: FAIL — `AppRoutes` is not exported and `/` still renders the protected shell.

- [ ] **Step 3: Rewrite App.jsx**

Replace `frontend/src/App.jsx` contents:
```jsx
import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { getSession, signOut } from './services/auth';
import { resolvePostLoginPath } from './lib/authRouting';
import { AlertsPage } from './pages/AlertsPage';
import { DashboardLayout } from './layouts/DashboardLayout';
import { HomePage } from './pages/HomePage';
import { HospitalsPage } from './pages/HospitalsPage';
import { IncidentMapPage } from './pages/IncidentMapPage';
import { LoginPage } from './pages/LoginPage';
import { SignUpPage } from './pages/SignUpPage';
import { OverviewPage } from './pages/OverviewPage';
import { PublicDashboardPage } from './pages/PublicDashboardPage';
import { DispatcherPage } from './pages/DispatcherPage';
import { ResourcesPage } from './pages/ResourcesPage';
import { ResidentPage } from './pages/ResidentPage';
import { ResponderPage } from './pages/ResponderPage';
import { SystemFlowPage } from './pages/SystemFlowPage';

function CommandShell({ page, session, onSignOut }) {
  const pages = {
    overview: <OverviewPage session={session} />,
    'incident-map': <IncidentMapPage />,
    resources: <ResourcesPage />,
    hospitals: <HospitalsPage />,
    alerts: <AlertsPage session={session} />,
    'system-flow': <SystemFlowPage />,
  };

  return (
    <DashboardLayout activePage={page} session={session} onSignOut={onSignOut}>
      {pages[page]}
    </DashboardLayout>
  );
}

function ProtectedCommandShell({ page, session, onSignOut, restoring }) {
  const location = useLocation();
  if (restoring) return null;
  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <CommandShell page={page} session={session} onSignOut={onSignOut} />;
}

function LoginRoute({ onAuthenticate }) {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from;

  return (
    <LoginPage
      onAuthenticate={(session) => {
        onAuthenticate(session);
        navigate(resolvePostLoginPath(session.role, from), { replace: true });
      }}
    />
  );
}

function SignUpRoute({ onAuthenticate }) {
  const navigate = useNavigate();

  return (
    <SignUpPage
      onAuthenticate={(session) => {
        onAuthenticate(session);
        navigate(resolvePostLoginPath(session.role), { replace: true });
      }}
    />
  );
}

function ProtectedPublicDashboard({ session, restoring }) {
  const location = useLocation();
  const navigate = useNavigate();
  if (restoring) return null;
  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <PublicDashboardPage onReturnToOps={() => navigate(session.role === 'public' ? '/' : '/overview')} />;
}

function ProtectedDispatcherRoute({ session, restoring }) {
  const location = useLocation();
  if (restoring) return null;
  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <DispatcherPage session={session} />;
}

export function AppRoutes({ session, restoring, onAuthenticate, onSignOut }) {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginRoute onAuthenticate={onAuthenticate} />} />
      <Route path="/signup" element={<SignUpRoute onAuthenticate={onAuthenticate} />} />
      <Route path="/public-dashboard" element={<ProtectedPublicDashboard session={session} restoring={restoring} />} />
      <Route path="/resident" element={<ResidentPage />} />
      <Route path="/responder" element={<ResponderPage />} />
      <Route path="/dispatcher" element={<ProtectedDispatcherRoute session={session} restoring={restoring} />} />

      <Route path="/overview" element={<ProtectedCommandShell page="overview" session={session} onSignOut={onSignOut} restoring={restoring} />} />
      <Route path="/incident-map" element={<ProtectedCommandShell page="incident-map" session={session} onSignOut={onSignOut} restoring={restoring} />} />
      <Route path="/resources" element={<ProtectedCommandShell page="resources" session={session} onSignOut={onSignOut} restoring={restoring} />} />
      <Route path="/hospitals" element={<ProtectedCommandShell page="hospitals" session={session} onSignOut={onSignOut} restoring={restoring} />} />
      <Route path="/alerts" element={<ProtectedCommandShell page="alerts" session={session} onSignOut={onSignOut} restoring={restoring} />} />
      <Route path="/system-flow" element={<ProtectedCommandShell page="system-flow" session={session} onSignOut={onSignOut} restoring={restoring} />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [restoring, setRestoring] = useState(true);

  useEffect(() => {
    getSession()
      .then((restored) => {
        if (restored) setSession(restored);
      })
      .finally(() => setRestoring(false));
  }, []);

  async function handleSignOut() {
    await signOut();
    setSession(null);
  }

  return (
    <BrowserRouter>
      <AppRoutes
        session={session}
        restoring={restoring}
        onAuthenticate={setSession}
        onSignOut={handleSignOut}
      />
    </BrowserRouter>
  );
}
```

Note: the `DashboardLayout` nav links that pointed at `/` for overview must now point at `/overview`. Check `frontend/src/layouts/DashboardLayout.jsx` and `frontend/src/components/SidebarNav.jsx` for a link/`to="/"` used for the overview tab and update it to `/overview` (Step 4 verifies).

- [ ] **Step 4: Update the overview nav link**

In `frontend/src/components/SidebarNav.jsx` line 4, the Overview nav item is:
```js
  { id: 'overview', label: 'Overview', path: '/', icon: 'overview' },
```
Change its `path` from `'/'` to `'/overview'`:
```js
  { id: 'overview', label: 'Overview', path: '/overview', icon: 'overview' },
```
Leave all other nav items unchanged. (No other file links to `/` for the overview tab — verified.)

- [ ] **Step 5: Run the routing tests**

Run (from `frontend/`): `npm test -- AppRoutes`
Expected: PASS (5 tests).

- [ ] **Step 6: Run the full frontend suite**

Run (from `frontend/`): `npm test`
Expected: all tests pass (new + pre-existing). If a pre-existing test rendered `App` and depended on `/` being the shell, update it to use `/overview`.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/App.jsx frontend/tests/unit/AppRoutes.test.jsx frontend/src/layouts frontend/src/components/SidebarNav.jsx
git commit -m "feat(frontend): home at /, signup route, ops overview at /overview, gated dashboard"
```

---

## Task 10: Backend — surface full_name and phone

**Files:**
- Modify: `backend/node-api/src/repositories/auth.repo.ts`
- Modify: `backend/node-api/src/middlewares/auth.ts`

- [ ] **Step 1: Extend the repository**

In `backend/node-api/src/repositories/auth.repo.ts`:

Update the `AuthProfile` interface:
```ts
export interface AuthProfile {
  id: string;
  role: UserRole;
  agency?: string;
  fullName?: string;
  phone?: string;
}
```

Update the `ProfileRow` type:
```ts
type ProfileRow = {
  id: string;
  role: string | null;
  agency: string | null;
  full_name: string | null;
  phone: string | null;
};
```

Update the select string:
```ts
      .select("id, role, agency, full_name, phone")
```

Update `mapProfile`:
```ts
function mapProfile(row: ProfileRow): AuthProfile {
  const role = validRoles.includes(row.role as UserRole) ? (row.role as UserRole) : "public";

  return {
    id: row.id,
    role,
    agency: row.agency ?? undefined,
    fullName: row.full_name ?? undefined,
    phone: row.phone ?? undefined,
  };
}
```

- [ ] **Step 2: Extend the AuthUser shape**

In `backend/node-api/src/middlewares/auth.ts`, update the `AuthUser` interface:
```ts
export interface AuthUser {
  id: string;
  email?: string;
  role: UserRole;
  agency?: string;
  fullName?: string;
  phone?: string;
}
```

And in `requireAuth`, populate the new fields from the profile:
```ts
    req.user = {
      id: data.user.id,
      email: data.user.email ?? undefined,
      role,
      agency: profile?.agency,
      fullName: profile?.fullName,
      phone: profile?.phone,
    };
```

- [ ] **Step 3: Typecheck the Node API**

Run (from `backend/node-api/`): `npm run typecheck`
Expected: no type errors.

- [ ] **Step 4: Run the Node API tests**

Run (from `backend/node-api/`): `npm test`
Expected: existing tests pass (no behavior change to incident tests).

- [ ] **Step 5: Commit**

```bash
git add backend/node-api/src/repositories/auth.repo.ts backend/node-api/src/middlewares/auth.ts
git commit -m "feat(node-api): surface full_name and phone on auth profile"
```

---

## Task 11: Manual dashboard configuration & end-to-end smoke

**Files:** none (configuration + verification)

- [ ] **Step 1: Disable email confirmation**

In Supabase dashboard → Authentication → Providers → Email: turn OFF "Confirm email". Save.

- [ ] **Step 2: Configure Google OAuth**

1. Google Cloud Console → create OAuth 2.0 Client (Web application).
2. Authorized redirect URI: `https://<your-project-ref>.supabase.co/auth/v1/callback`.
3. Supabase → Authentication → Providers → Google: enable, paste Client ID + Secret, save.
4. Supabase → Authentication → URL Configuration → add `http://localhost:5173` and your Vercel site URL to "Redirect URLs".

- [ ] **Step 3: Smoke test email signup**

Run (from `frontend/`): `npm run dev`. In the browser:
1. Visit `/` → home page renders, no redirect.
2. Click **Sign Up** → fill the form → **Create account**.
3. Expected: lands on `/public-dashboard` (account-gated) as a public user.
4. Sign out, visit `/public-dashboard` directly → redirected to `/login`.
5. Log in with the same credentials → back on `/public-dashboard`.

- [ ] **Step 4: Smoke test Google (if configured)**

Click **Continue with Google** on `/signup` → complete Google consent → returns authenticated and lands on `/public-dashboard`. If Google is not yet configured, confirm the button shows an inline error and the page stays usable.

- [ ] **Step 5: Smoke test staff login**

Log in as an existing leader/responder account → lands on `/overview` (ops shell), not the public dashboard.

---

## Self-Review Notes

- **Spec coverage:** Home page (T6), top-right Log In/Sign Up (T6), no autoroute + routing (T9), email/password + Google signup (T4, T7, T8), account-gated dashboard + role redirect (T5, T9), Mantine themed to palette (T1), signup fields incl. phone (T7), profile trigger + fields (T3, T10), email-confirmation disabled + Google setup (T11). All covered.
- **Type/name consistency:** `signUp(fullName, phone, email, password)` signature is identical across T4, T7. `resolvePostLoginPath(role, from)` identical across T5, T9. `AuthProfile`/`AuthUser` field names `fullName`/`phone` consistent across T10. Migration uses `full_name`/`phone` columns matching the repo select.
- **Pre-existing tests:** T9 Step 6 explicitly re-runs the whole suite and flags updating any test that assumed `/` was the ops shell.
