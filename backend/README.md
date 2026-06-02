# Backend Workspace (Node.js + TypeScript)

This folder hosts backend-facing application services.

- `node-api/`: main Node.js TypeScript API service.
- `shared/`: shared contracts and types.

Current state: directory scaffold only (no generated boilerplate code yet).

## Folder guide

### `node-api/`
Purpose:
- Primary API service for frontend-facing endpoints, auth boundaries, and orchestration.

Expected files at service root:
- `package.json`
- `tsconfig.json`
- `eslint`/formatter config files as adopted
- `.env.example`

### `node-api/src/config/`
Purpose:
- Runtime configuration loading and environment validation.

Expected files:
- Files such as `env.ts`, `logger.ts`, `constants.ts`.

### `node-api/src/controllers/`
Purpose:
- Request handlers (HTTP transport layer).

Expected files:
- Controller files such as `incidentController.ts`.

### `node-api/src/middlewares/`
Purpose:
- Express/Koa/Fastify middleware components.

Expected files:
- Files such as `authMiddleware.ts`, `errorMiddleware.ts`, `requestIdMiddleware.ts`.

### `node-api/src/modules/`
Purpose:
- Domain modules grouped by business capability.

Expected files:
- Module folders such as `incidents/`, `resources/`, each containing module-local handlers/services/schemas.

### `node-api/src/repositories/`
Purpose:
- Data access layer.

Expected files:
- Files such as `incidentRepository.ts`, `resourceRepository.ts`.

### `node-api/src/routes/`
Purpose:
- Route declarations and API versioning composition.

Expected files:
- `index.ts`, `v1.ts`, and route module files.

### `node-api/src/services/`
Purpose:
- Business logic and integration orchestration.

Expected files:
- Files such as `incidentService.ts`, `notificationService.ts`.
- Provider clients such as `dataGovSg.client.ts` and `oneMap.client.ts`.

Current integration modules:

- `src/modules/scdf/` normalises SCDF public fire station, shelter, and AED resources.
- `src/modules/moh/` normalises MOH/CDA infectious disease and health-capacity signals.
- `src/modules/hospitals/` returns public MOH/data.gov.sg hospital statistics and reference bed-capacity data without mock operational capacity values.
- `src/modules/onemap/` proxies OneMap geocoding, reverse geocoding, and routing without exposing JWTs.
- `src/modules/population/` normalises HDB and population planning context.

### `node-api/src/types/`
Purpose:
- Service-local TypeScript type definitions.

Expected files:
- Shared local types/interfaces such as `api.ts`, `domain.ts`.

### `node-api/src/utils/`
Purpose:
- Shared utility helpers.

Expected files:
- Files such as `errors.ts`, `time.ts`, `pagination.ts`.

### `node-api/tests/`
Purpose:
- Backend Node test suites.

Expected files:
- `tests/unit/`: unit tests for modules/services/utils.
- `tests/integration/`: API/integration tests.

### `node-api/scripts/`
Purpose:
- Developer scripts for backend operations.

Expected files:
- Migration helpers, seed helpers, maintenance scripts, and usage docs.

### `shared/`
Purpose:
- Cross-service contracts consumed by both Node and Python services.

Expected files:
- `shared/schemas/`: canonical payload schemas (JSON Schema/OpenAPI fragments).
- `shared/types/`: shared DTO/type definitions and mapping notes.
