# Flask Service Workspace (Python)

This folder is reserved for Python Flask service logic.

Current state: directory scaffold only (no generated boilerplate code yet).

## Folder guide

### `flask-api/`
Purpose:
- Python service workspace for Flask APIs, data processing, and Python-native logic.

Expected files at service root:
- `app/main.py` (Flask entrypoint).
- `requirements.txt` or `pyproject.toml` (if split per service later).
- `.env.example`

### `flask-api/app/`
Purpose:
- Core Flask application package.

Expected files:
- `__init__.py` and app factory wiring.
- Blueprint registrations and app startup config.

### `flask-api/app/api/`
Purpose:
- API routes/blueprints and request handling layer.

Expected files:
- Files such as `health.py`, `incidents.py`, `predictions.py`.

### `flask-api/app/core/`
Purpose:
- Core runtime concerns.

Expected files:
- Config loaders, logging setup, dependency wiring, and constants.

### `flask-api/app/models/`
Purpose:
- Internal domain/data models.

Expected files:
- SQLAlchemy models or domain model classes.

### `flask-api/app/schemas/`
Purpose:
- Validation and serialization schemas.

Expected files:
- Pydantic/Marshmallow schemas for request and response contracts.

### `flask-api/app/services/`
Purpose:
- Business logic and orchestration layer.

Expected files:
- Files such as `forecast_service.py`, `ingestion_service.py`.

### `flask-api/app/utils/`
Purpose:
- Shared utility helpers.

Expected files:
- Utility modules such as `time_utils.py`, `geo_utils.py`, `error_utils.py`.

### `flask-api/tests/`
Purpose:
- Flask service test suites.

Expected files:
- `tests/unit/`: unit tests for services/utils/schemas.
- `tests/integration/`: endpoint and integration tests.

### `flask-api/scripts/`
Purpose:
- Developer and operational scripts.

Expected files:
- Local maintenance scripts, one-off data tooling, and usage docs.
