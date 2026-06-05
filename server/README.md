# Flask Service Workspace (Python)

This folder is reserved for Python Flask service logic.

Current state: `flask-api/` contains the Flask AI microservice used by the Node API for public incident extraction and resource-allocation recommendations.

## Flask AI endpoints

- `GET /health`
- `POST /agent/extract-report`
- `POST /agent/resource-allocation`

The frontend must not call these endpoints directly. React calls the Node API, and Node calls Flask internally with server-side AI provider keys.

Run locally:

```powershell
cd server/flask-api
python -m flask --app app.main run --host 0.0.0.0 --port 5001
```

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
