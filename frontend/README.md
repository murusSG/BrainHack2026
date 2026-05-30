# Frontend Workspace (React + JavaScript)

This folder is reserved for the React client application.

Current state: directory scaffold only (no generated boilerplate code yet).

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
