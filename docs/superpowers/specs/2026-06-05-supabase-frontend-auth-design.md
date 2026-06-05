# Supabase Frontend Auth — Design Spec

**Date:** 2026-06-05
**Status:** Approved

## Goal

Replace the fake client-side login in `LoginPage.jsx` with real Supabase authentication. The existing session shape `{ identity, role }` and all downstream consumers remain unchanged.

## Decisions

- Session shape stays as `{ identity, role }` (Option A — minimal downstream change).
- Role is fetched from the Node API `GET /auth/me` after login (Option A — single source of truth, pulls from `profiles` table).
- Auth logic lives in a dedicated `frontend/src/services/auth.js` (Option 1 — clean separation, no duplication).

## New Files

### `frontend/src/services/auth.js`

Creates the Supabase client once using `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

Exports:

- `signIn(email, password)` — calls `supabase.auth.signInWithPassword()`, then calls `GET /auth/me` with the returned token, returns `{ identity, role }`.
- `signOut()` — calls `supabase.auth.signOut()`.
- `getSession()` — calls `supabase.auth.getSession()`, if a valid session exists calls `GET /auth/me` and returns `{ identity, role }`, otherwise returns `null`.

## Modified Files

### `frontend/src/pages/LoginPage.jsx`

- Remove `inferRole()` and the fake `handleSubmit` logic.
- Replace with a call to `auth.signIn(email, password)`.
- Add a `loading` state — disable the submit button while in flight.
- On error, set the existing `error` state with the Supabase error message.
- On success, call `onAuthenticate({ identity, role })` as before.

### `frontend/src/App.jsx`

- Add a `useEffect` on mount: call `auth.getSession()`. If it returns a session, call `setSession(session)` to restore without re-login.
- Update `handleSignOut` to call `auth.signOut()` before `setSession(null)`.

### `frontend/src/services/api.js`

- Add `authedGet(path, token)` — like `get()` but attaches `Authorization: Bearer <token>` header.
- Used only for `/auth/me`; all other API calls remain unchanged.

## New Dependency

- `@supabase/supabase-js` — added to `frontend/package.json`.

## Data Flow

```
LoginPage (submit)
  → auth.signIn(email, password)
      → supabase.auth.signInWithPassword()
      → api.authedGet('/auth/me', token)
  → onAuthenticate({ identity, role })
  → App session state set, navigate to /

App.jsx (mount)
  → auth.getSession()
      → supabase.auth.getSession()
      → if session: api.authedGet('/auth/me', token)
  → setSession({ identity, role })

App.jsx (sign out)
  → auth.signOut()
  → setSession(null) → /login
```

## Error Handling

| Scenario | Behaviour |
|---|---|
| Wrong password / user not found | Show Supabase error message in existing `error` state |
| Email not confirmed | Show Supabase error message |
| `/auth/me` fails after successful login | Fall back to `{ identity: email, role: "public" }` |
| Token expired on refresh | `getSession()` returns null → redirect to `/login` |
| `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` missing | `signIn` throws, show "Authentication is unavailable" |

## Out of Scope

- Sign-up / registration flow
- Password reset
- Role management in Supabase dashboard
- Protecting individual API routes beyond `/auth/me`
