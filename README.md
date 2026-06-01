# BrainHack2026

Repository scaffold for the BrainHack 2026 platform using a clear multi-service architecture:

- `frontend`: React application (JavaScript).
- `backend/node-api`: Node.js API layer (TypeScript).
- `server/flask-api`: Python Flask service layer.

This setup intentionally creates structure only. Boilerplate implementation code has not been generated yet.

## Architecture at a glance

The project is organized by responsibility boundaries to support scalability, team ownership, and clean interfaces:

- Frontend owns presentation, UX flows, and client-side state.
- Node API owns external-facing API contracts, auth boundaries, and orchestration.
- Flask service owns Python-native workloads such as data processing, analytics, or ML-related flows.
- Shared contracts under backend support consistent schema design across services.

## Repository structure

```text
BrainHack2026/
|-- docs/
|-- frontend/
|   |-- public/
|   |-- src/
|   |   |-- assets/
|   |   |-- components/
|   |   |-- features/
|   |   |-- hooks/
|   |   |-- layouts/
|   |   |-- pages/
|   |   |-- routes/
|   |   |-- services/
|   |   |-- store/
|   |   |-- styles/
|   |   `-- utils/
|   |-- tests/
|   |   |-- unit/
|   |   `-- integration/
|   `-- scripts/
|-- backend/
|   |-- node-api/
|   |   |-- src/
|   |   |   |-- config/
|   |   |   |-- controllers/
|   |   |   |-- middlewares/
|   |   |   |-- modules/
|   |   |   |-- repositories/
|   |   |   |-- routes/
|   |   |   |-- services/
|   |   |   |-- types/
|   |   |   `-- utils/
|   |   |-- tests/
|   |   |   |-- unit/
|   |   |   `-- integration/
|   |   `-- scripts/
|   `-- shared/
|       |-- schemas/
|       `-- types/
|-- server/
|   `-- flask-api/
|       |-- app/
|       |   |-- api/
|       |   |-- core/
|       |   |-- models/
|       |   |-- schemas/
|       |   |-- services/
|       |   `-- utils/
|       |-- tests/
|       |   |-- unit/
|       |   `-- integration/
|       `-- scripts/
|-- .gitignore
`-- requirements.txt
```

## Engineering principles applied in this scaffold

- Separation of concerns by runtime and responsibility.
- Domain-friendly structure (`features`, `modules`, `services`, `repositories`) over flat folders.
- Test directories split by intent (`unit`, `integration`).
- Script folders isolated from runtime source code.
- Shared contracts in dedicated `backend/shared` to reduce drift between services.

## Dependency baselines

- Python dependencies for the Flask service are managed in root [`requirements.txt`](./requirements.txt).
- Node and React dependency manifests are intentionally not generated yet, in line with the no-boilerplate requirement.

## Local setup

### Prerequisites

- Git
- Node.js 20 LTS (includes `npm`)
- Python 3.11 or newer

### 1. Clone and enter the repository

```bash
git clone <your-repo-url>
cd BrainHack2026
```

### 2. Set up Python environment (Flask service dependencies)

```bash
python -m venv .venv
```

Activate virtual environment:

- Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
```

- macOS/Linux:

```bash
source .venv/bin/activate
```

Install Python dependencies:

```bash
pip install -r requirements.txt
```

### 3. Initialize frontend and Node backend package manifests

This repository currently contains folder scaffolding only.

Before running frontend or Node backend locally, initialize those workspaces:

- `frontend` as React (JavaScript).
- `backend/node-api` as Node.js (TypeScript).

No boilerplate was generated yet by design.

## Run locally

### Current repository state

At this stage (scaffold-only), there are no application entrypoints yet, so full services are not runnable until implementation starts.

### Expected run commands after initialization

Use these as the project-standard local run targets once each service is bootstrapped:

Frontend (React JS):

```bash
cd frontend
npm install
npm run dev
```

Node API (TypeScript):

```bash
cd backend/node-api
npm install
npm run dev
```

Flask service (Python):

```bash
cd server/flask-api
flask --app app.main run --debug --port 8000
```

### Recommended local ports

- Frontend: `http://localhost:5173`
- Node API: `http://localhost:3000`
- Flask API: `http://localhost:8000`

Adjust ports as needed in each service configuration.

## Next implementation steps

1. Initialize React (JavaScript) inside `frontend` (recommended: Vite React JS template).
2. Initialize Node TypeScript project inside `backend/node-api`.
3. Create Flask app entrypoint and package initialization inside `server/flask-api`.
4. Add environment templates (`.env.example`) for each runtime.
5. Add CI checks for linting, typing, and tests across all services.
