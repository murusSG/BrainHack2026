# Frontend Workspace (React + JavaScript)

This folder is reserved for the React client application.

Current state: implemented Vite/React application with Mantine, Supabase auth,
Leaflet maps, role-specific dashboards, and Vitest coverage. Use Node.js 20.19
or newer for the current Vite/Vitest/jsdom toolchain.

## Folder guide

### `public/`
Purpose:
- Static assets served directly by the frontend runtime.

Expected files:
- `index.html` (app shell HTML).
- Favicons, static logos, and static media files.
- PWA/manifest files if needed.

### `src/`
Purpose:
- Main React application source code.

Expected files:
- `main.jsx` (entry point).
- `App.jsx` (root component).
- Feature and shared modules listed below.

### `src/assets/`
Purpose:
- Bundled assets imported by code.

Expected files:
- Images/icons (`.png`, `.jpg`, `.svg`, `.webp`).
- Fonts and design resources.

### `src/components/`
Purpose:
- Reusable presentational components shared across features.

Expected files:
- Component files such as `Button.jsx`, `Loader.jsx`.
- Optional co-located style/test files such as `Button.module.css`, `Button.test.jsx`.

### `src/features/`
Purpose:
- Domain-oriented feature modules (recommended ownership boundary).

Expected files:
- Feature folders such as `incidents/`, `alerts/`.
- Feature-specific components, hooks, services, and tests.

### `src/hooks/`
Purpose:
- Shared custom React hooks.

Expected files:
- Files such as `useAuth.js`, `useDebounce.js`.

### `src/layouts/`
Purpose:
- App layout wrappers (page shells).

Expected files:
- Files such as `DashboardLayout.jsx`, `AuthLayout.jsx`.

### `src/pages/`
Purpose:
- Route-level page components.

Expected files:
- Files such as `HomePage.jsx`, `IncidentDetailsPage.jsx`.

### `src/routes/`
Purpose:
- Route definitions and navigation guards.

Expected files:
- Files such as `index.jsx`, `ProtectedRoute.jsx`.

### `src/services/`
Purpose:
- Frontend-side adapter layer for API calls and integrations.

Expected files:
- HTTP client setup (`apiClient.js`).
- Endpoint modules such as `incidentService.js`.

### `src/store/`
Purpose:
- Client state management setup.

Expected files:
- Store configuration (`store.js`).
- Slices/reducers/selectors depending on chosen state library.

### `src/styles/`
Purpose:
- Global styles, tokens, and theme definitions.

Expected files:
- `globals.css`, `reset.css`, theme or token files.

### `src/utils/`
Purpose:
- Shared utility functions.

Expected files:
- Files such as `dateUtils.js`, `geoUtils.js`, `validation.js`.

### `tests/`
Purpose:
- Frontend test suites that are not co-located with feature files.

Expected files:
- `tests/unit/`: unit tests for components/hooks/utils.
- `tests/integration/`: integration tests across page/feature flows.

### `scripts/`
Purpose:
- Developer scripts for frontend workflows.

Expected files:
- Utility scripts for codegen/checks/migration tasks.
- Usage documentation when scripts are added.

## Performance Safeguards

The June 10, 2026 audit found a single 820.61 kB minified JavaScript bundle,
hidden-tab polling every five seconds, and a production WebSocket fallback that
could retry `ws://localhost:3000/ws` indefinitely.

The frontend now:

- lazy-loads route, Supabase, and map code;
- shares duplicate in-flight public GET requests;
- times out stalled API requests after `VITE_API_TIMEOUT_MS`;
- pauses dispatcher, responder, and incident polling while the tab is hidden;
- retains unchanged incident and log arrays to avoid avoidable rerenders;
- requires an explicit non-local `VITE_WS_URL` in production;
- sends long-lived immutable cache headers for hashed Vite assets on Vercel.

For Vercel, `VITE_API_BASE_URL` must point to the deployed Node API. The Python
function in this repository is the Flask AI service and does not replace the
Node `/api/v1` gateway. Set `VITE_WS_URL` only when that Node host supports
`/ws`; leaving it unset keeps the REST snapshot available without retrying a
nonexistent local socket.

After deployment, confirm route chunking, hidden-tab network silence, configured
API/WebSocket reachability, and stable Leaflet viewports in Chrome Performance
and Network panels.
