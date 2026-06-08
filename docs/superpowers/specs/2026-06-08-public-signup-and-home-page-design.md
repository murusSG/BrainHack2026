# Public Sign Up & Home Page — Design Spec

**Date:** 2026-06-08
**Branch:** `pb/muru/feat/signUp`
**Status:** Approved for planning

## Summary

Introduce a public-facing **home page** at `/` (no autoroute to login), add a **public sign-up flow** (`/signup`), and update the **login page** (`/login`). Public users register with email/password or Google, then log in to reach the now account-gated Public Dashboard. New auth-facing pages are built with **Mantine**, themed to the existing light-cream + Singapore-red + Inter palette so the look does not change.

## Goals

- Replace the autoroute (`/` → `/login`) with an attractive, informative public home page at `/`.
- Top bar exposes **Log In** and **Sign Up** (top-right) on the home page.
- First-time public users can self-register; returning users log in. Both support **email/password** and **Google OAuth**.
- Public Dashboard becomes account-gated; role-based redirect after login.
- Adopt a UI component library (Mantine) for the new pages **without** changing the existing colors/fonts.

## Non-Goals

- Rewriting the existing `globals.css` or restyling existing ops/public dashboard pages.
- Building password reset / account management screens (future work).
- SingPass or any government identity integration.
- Email confirmation flow (explicitly disabled — see Decisions).

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Signup auth | Email/password **+** Google OAuth | Covers everyone; Google is additive, pre-verified, low-friction. |
| Google on login | Yes | Returning Google users can re-authenticate. |
| UI library | **Mantine**, plain-JS, theme-mapped to existing tokens | Fast professional components; theme system adopts current palette without a CSS rewrite. |
| Home layout | Centered hero, clean cream background (no grid tiles), 3 feature cards | User-selected (option A); product-clean "official portal" feel. |
| Hero buttons | None | Log In / Sign Up live top-right only. |
| Public Dashboard access | **Account-gated** | Single funnel; everyone signs up. |
| Post-login routing | `public` → `/public-dashboard`; `leader`/`responder` → `/overview` | Role-appropriate landing. |
| Ops "overview" base path | Move `/` → `/overview` | Frees `/` for the home page. |
| Signup fields | Full name, Email, Phone number, Password, Confirm password | Phone supports public alert subscriptions. |
| Profile creation | **Supabase DB trigger** (`handle_new_user`) | Works for email + Google signups with zero backend code; defaults `role='public'`. |
| Email confirmation | **Disabled** in Supabase dashboard | Instant session on signup → smooth demo. |

## Theme (Mantine mapping)

Public-facing palette (from `globals.css`), to be encoded in a Mantine theme:

- Font: `Inter` (headings heavy, up to weight 900).
- Surface: cream gradient `#fff9f7 → #fff1ed`; cards `rgba(255,255,255,0.94)`.
- Accent (`primaryColor`): Singapore red — base `#ef3344`, deep `#c5162b` / `#bf1027`; shadows `rgba(166,17,34,*)`.
- `defaultColorScheme: 'light'`.

Mantine is wrapped at the app root via `MantineProvider` with this theme + `@mantine/core/styles.css`. Existing pages are unaffected (they keep their own class-based CSS). New pages use Mantine components which inherit the theme.

## Routing (`frontend/src/App.jsx`)

| Path | Element | Auth |
|---|---|---|
| `/` | **`HomePage`** (new) | Public |
| `/login` | `LoginPage` (updated) | Public |
| `/signup` | **`SignUpPage`** (new) | Public |
| `/public-dashboard` | `PublicDashboardRoute` | **Protected (any session)** |
| `/overview` | `ProtectedCommandShell page="overview"` | Protected (leader/responder) |
| `/incident-map`, `/resources`, `/hospitals`, `/alerts`, `/system-flow` | unchanged | Protected |
| `/resident`, `/responder`, `/dispatcher` | unchanged | as today |
| `*` | redirect to `/` | — |

- Remove the autoroute behavior: `/` no longer renders the protected shell.
- `ProtectedCommandShell` redirects unauthenticated users to `/login` (unchanged), but the previous `/` overview route is now `/overview`.
- **Post-login redirect**: `LoginRoute`/`SignUpRoute` inspect `session.role` and navigate `public → /public-dashboard`, else `/overview` (honoring `location.state.from` when present).

## Frontend components

### `HomePage` (`src/pages/HomePage.jsx`) — new
- Top bar: brand mark + "MURUS SG"; right side `Log In` (outline) and `Sign Up` (filled red) → `navigate('/login')` / `navigate('/signup')`.
- Hero: kicker pill "Unified Crisis Management", headline "One picture of the crisis. Every responder aligned.", subtitle describing the system for commanders/responders/hospitals/residents.
- Feature row (3 Mantine cards): **Live Incident Map**, **Foresight Engine**, **Public Advisories** (copy: "Trusted, official safety instructions.").
- Footer line: "A Singapore command network service".
- Built with Mantine layout primitives (`AppShell`/`Container`/`Group`/`SimpleGrid`/`Card`/`Button`).

### `SignUpPage` (`src/pages/SignUpPage.jsx`) — new
- Card titled "Create your account" with fields: Full name, Email, Phone number, Password, Confirm password.
- Primary "Create account" button → `signUp(...)`.
- Divider "or" → "Continue with Google" → `signInWithGoogle()`.
- "Already have an account? Log in" → `/login`.
- Client validation: required fields, valid email, password ≥ Supabase minimum (6), password === confirm, basic SG phone format. Surface Supabase errors inline.
- On success: receives session, calls `onAuthenticate`, role-based redirect.

### `LoginPage` (`src/pages/LoginPage.jsx`) — updated
- Keep email/password form.
- **Remove** "Open Public Dashboard" button.
- **Add** "Continue with Google" (`signInWithGoogle()`).
- **Add** "New here? Create an account" → `/signup`.
- Rebuild form controls with Mantine while preserving the existing copy/eyebrow styling intent.

## Auth service (`frontend/src/services/auth.js`)

Add:

```js
export async function signUp(fullName, phone, email, password) {
  // supabase.auth.signUp({ email, password, options: { data: { full_name: fullName, phone } } })
  // confirmation disabled → session returned immediately
  // resolve role via /auth/me (defaults to 'public'), return { identity, role, token }
}

export async function signInWithGoogle() {
  // supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })
  // OAuth redirects away; session is restored by getSession() on return
}
```

- Reuse existing `signIn`, `getSession`, `signOut` shape (`{ identity, role, token }`).
- Google OAuth returns via redirect; existing `getSession()` on app load resolves the session and role — no extra handling needed beyond ensuring `App` already calls `getSession()` on mount (it does).

## Backend / database

### `profiles` table
Add columns: `full_name text`, `phone text` (both nullable). Existing: `id`, `role`, `agency`.

### `handle_new_user` trigger (Supabase SQL migration)
On `auth.users` insert, insert into `public.profiles`:
- `id = NEW.id`
- `role = 'public'`
- `full_name = NEW.raw_user_meta_data->>'full_name'`
- `phone = NEW.raw_user_meta_data->>'phone'`

This covers both email/password and Google signups (Google provides `full_name` via metadata; `phone` will be null for Google unless later collected).

### Node API (`backend/node-api`)
- `repositories/auth.repo.ts`: extend `AuthProfile` and the select to include `full_name`, `phone`; map into the profile.
- `middlewares/auth.ts`: extend `AuthUser` with optional `fullName`, `phone` (carried through from the profile).
- No new endpoints required (trigger handles profile creation; `/auth/me` already returns the profile).

## Manual configuration (dashboards — not code)

Documented as prerequisites; the app degrades gracefully until done:
1. **Supabase → Auth → Providers → Email**: disable "Confirm email".
2. **Google Cloud**: create OAuth 2.0 client (web), set authorized redirect URI to the Supabase callback URL.
3. **Supabase → Auth → Providers → Google**: enable, paste client ID/secret.
4. **Supabase → Auth → URL config**: add the Vercel site URL + `localhost:5173` to allowed redirect URLs.

Until Google is configured, "Continue with Google" surfaces the Supabase error inline (no crash).

## Error handling

- Missing Supabase config: auth functions throw the existing "Authentication is unavailable" error; pages show it inline.
- Signup validation errors shown inline before any network call.
- Supabase signup errors (duplicate email, weak password) surfaced from the thrown message.
- Google OAuth not configured: inline error, page stays usable.
- Protected `/public-dashboard` without session → redirect to `/login` with `from` state.

## Testing

- **`auth.js`**: unit tests (mock Supabase client) for `signUp` (metadata passed, session/role returned) and `signInWithGoogle` (provider + redirect options).
- **`SignUpPage`**: RTL tests — validation (mismatched passwords, invalid email, missing fields), success calls `onAuthenticate` + redirect, Google button calls `signInWithGoogle`.
- **`LoginPage`**: RTL tests — Public Dashboard button removed, Google + "Create an account" present and wired.
- **`App` routing**: `/` renders `HomePage` (no redirect), `/signup` renders `SignUpPage`, post-login role redirect (`public → /public-dashboard`, `leader → /overview`), `/public-dashboard` redirects to `/login` when unauthenticated.
- Follow existing Vitest + Testing Library conventions.

## Rollout / sequence (high level)

1. Install + configure Mantine (provider, theme, CSS import).
2. DB: `profiles` columns + `handle_new_user` trigger migration.
3. `auth.js`: `signUp`, `signInWithGoogle`.
4. New `HomePage`; routing changes (`/` → home, ops overview → `/overview`, gate `/public-dashboard`, role redirect).
5. New `SignUpPage`; update `LoginPage`.
6. Backend `auth.repo` / `auth` middleware field extensions.
7. Tests.
8. Dashboard configuration (manual) + smoke test.
