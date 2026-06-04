# MURUS SG

MURUS SG is a Singapore crisis-response dashboard for BrainHack 2026. It gives command teams one operating picture across live/demo incident feeds, Foresight predictions, dispatcher allocation review, responders, residents, hospitals, and resource views.

## Current Build

- React command dashboard in `frontend`.
- TypeScript/Express API in `backend/node-api`.
- Shared crisis-event contracts in `backend/shared`.
- Flask scaffold remains in `server/flask-api`, but the active application path is React + Node API.

The strongest current demo path is:

1. Crisis aggregator normalises PUB, NEA, LTA, MOH, SCDF-style signals.
2. Foresight Engine generates deterministic predictions from the unified crisis events.
3. Optional VectorEngine/OpenAI-compatible LLM call writes a structured leader brief from those deterministic predictions.
4. Commander stages a Foresight action.
5. Dispatcher Review Queue receives a command allocation recommendation.
6. Dispatcher approves/contact agencies.
7. Command timeline records staged, approved, and contacted events.

## What Is Real vs Simulated

Working now:

- Unified crisis event endpoint: `/api/v1/crisis/events`
- Foresight endpoint: `/api/v1/foresight/predictions`
- Command allocation state: `/api/v1/command/allocations`
- Command timeline: `/api/v1/command/timeline`
- Optional LLM leader brief layer
- Supabase-backed command persistence when the command-state migration is applied
- In-memory fallback when Supabase is not configured
- Frontend smoke test for Foresight -> Dispatcher -> Timeline
- Backend unit and integration tests

Still simulated or partial:

- Foresight is deterministic rules plus optional LLM narration, not a trained ML model.
- Agency contact is a status update, not a real external notification.
- Some dashboard controls remain visual-only.
- Command persistence requires running `backend/node-api/scripts/migrations/002_command_state.sql` in Supabase.

## Repository Structure

```text
frontend/                  React/Vite dashboard
backend/node-api/           Express + TypeScript API
backend/shared/             Shared crisis/event types
server/flask-api/           Python scaffold, not the active app path
docs/                       Pitch docs, diagrams, and supporting materials
PROGRESS.md                 Session handoff history
```

## Prerequisites

- Node.js 20 or newer
- npm
- Optional: Supabase project for durable command state
- Optional: VectorEngine/OpenAI-compatible API key for LLM leader briefs

## Environment

Copy and edit:

```powershell
cd backend/node-api
copy .env.example .env.local
```

Put real secrets in ignored `backend/node-api/.env.secrets`, not in tracked files:

```env
LLM_API_BASE_URL=https://api.vectorengine.ai/v1
LLM_MODEL=gpt-5.5:stable
LLM_API_KEY=...
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

The backend loads `.env.secrets`, then `.env.local`, then `.env`.

## Supabase Setup

Run the SQL migrations in Supabase SQL editor:

1. `backend/node-api/scripts/migrations/001_create_tables.sql`
2. `backend/node-api/scripts/migrations/002_command_state.sql`

Without Supabase, command allocations and timeline still work in memory for local demos, but reset when the backend restarts.

## Run Locally

Backend:

```powershell
cd backend/node-api
npm install
npm run dev
```

Frontend:

```powershell
cd frontend
npm install
npm run dev
```

Default URLs:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000`
- Health: `http://localhost:3000/api/v1/health`

If `5173` is busy, Vite will choose the next available port.

## Useful API Checks

```powershell
Invoke-RestMethod "http://localhost:3000/api/v1/foresight/predictions?surgeBeds=10&qrtCount=2"
Invoke-RestMethod "http://localhost:3000/api/v1/command/allocations"
Invoke-RestMethod "http://localhost:3000/api/v1/command/timeline"
```

## Tests

Frontend:

```powershell
cd frontend
npm test
npm run build
```

Backend:

```powershell
cd backend/node-api
npm run typecheck
npm test -- --runInBand
```

Current coverage includes:

- Command service unit tests
- Command Supabase repository mapping tests
- Command HTTP route integration tests
- Foresight HTTP route integration test
- Existing SCDF, MOH, hospital, population, OneMap, and data.gov.sg unit tests
- Frontend Foresight-to-dispatcher flow test

## LLM Role

The LLM is only a briefing layer. It receives deterministic predictions, evidence, interventions, and outcome deltas, then returns a structured leader brief. It must not invent incidents, agencies, scores, severity, locations, or actions. The deterministic rules engine remains the source of truth.

## Next Work

1. Run the command-state Supabase migration in the deployment database.
2. Decide whether the Foresight `Staged Actions` queue should reflect backend agency status after approval/contact.
3. Extend Foresight rules with hospital pressure and multi-hazard correlation.
4. Implement or clearly label remaining visual-only controls before final judging.
