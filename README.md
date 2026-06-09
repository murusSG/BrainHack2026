# MURUS SG

MURUS SG is a Singapore crisis-response dashboard for BrainHack 2026. It gives command teams one operating picture across live/demo incident feeds, Foresight predictions, dispatcher allocation review, responders, residents, hospitals, and resource views.

## Current Build

- React command dashboard in `frontend`.
- TypeScript/Express API in `backend/node-api`.
- Shared crisis-event contracts in `backend/shared`.
- Flask AI microservice in `server/flask-api` for report extraction and resource allocation support.

The strongest current demo path is:

1. Crisis aggregator normalises PUB, NEA, LTA, MOH, SCDF-style signals.
2. Foresight Engine generates deterministic predictions from the unified crisis events.
3. Optional VectorEngine/OpenAI-compatible LLM call writes a structured leader brief from those deterministic predictions.
4. Commander stages a Foresight action.
5. Dispatcher Review Queue receives a command allocation recommendation.
6. Dispatcher approves/contact agencies.
7. Command timeline records staged, approved, and contacted events.

New AI-assisted incident grouping path:

1. Public user submits a natural-language incident report from the public dashboard.
2. React calls only the Node API: `POST /api/v1/incidents/report`.
3. Node calls Flask internally at `/agent/extract-report`.
4. Node saves the raw public report, compares the extracted incident against recent persisted incident clusters, and links duplicate reports back to the same operational incident.
5. Similar reports are grouped with the existing cluster and do not trigger duplicate allocation.
6. New clusters call Flask `/agent/resource-allocation`, then persist the incident, queue state, and map marker data in Supabase when configured.
7. The Responder View shows approved incidents from the same persisted incident store and saves shared log updates through the Node API.
8. No real agency notification is sent in this implementation.

## What Is Real vs Simulated

Working now:

- Unified crisis event endpoint: `/api/v1/crisis/events`
- Foresight endpoint: `/api/v1/foresight/predictions`
- Command allocation state: `/api/v1/command/allocations`
- Command timeline: `/api/v1/command/timeline`
- Public report ingestion and grouping: `/api/v1/incidents/report`
- Public report inspection: `/api/v1/incidents/public-reports`
- Incident clusters: `/api/v1/incidents/clusters`
- Persistent incident listing/status routes: `/api/v1/incidents`, `/api/v1/incidents/:incidentId`, `/api/v1/incidents/:incidentId/status`
- Shared responder logs: `GET/POST /api/v1/incidents/:incidentId/logs`
- Dispatcher approval for AI recommendations: `/api/v1/resource-allocation/approve`
- Optional LLM leader brief layer
- Flask AI extraction/allocation with OpenAI/OpenRouter support and deterministic local fallbacks
- Supabase-backed public incident report persistence when the incident-state migration is applied
- Supabase-backed incident queue/map/responder persistence when the incident-state migration is applied
- Supabase-backed command persistence when the command-state migration is applied
- Supabase-backed responder shared-log persistence when the responder-log migration is applied
- In-memory fallback when Supabase is not configured
- Frontend smoke test for Foresight -> Dispatcher -> Timeline
- Backend unit and integration tests

Still simulated or partial:

- Foresight is deterministic rules plus optional LLM narration, not a trained ML model.
- Agency contact is a status update, not a real external notification.
- AI resource allocation remains decision support; dispatcher approval is mandatory.
- Some dashboard controls remain visual-only.
- Command persistence requires running `backend/node-api/scripts/migrations/002_command_state.sql` in Supabase.

## Repository Structure

```text
frontend/                  React/Vite dashboard
backend/node-api/           Express + TypeScript API
backend/shared/             Shared crisis/event types
server/flask-api/           Flask AI microservice
docs/                       Pitch docs, diagrams, and supporting materials
PROGRESS.md                 Session handoff history
```

## Prerequisites

- Node.js 20 or newer
- npm
- Optional: Supabase project for durable command state
- Optional: VectorEngine/OpenAI-compatible API key for LLM leader briefs
- Optional: OpenAI or OpenRouter API key for Flask AI extraction/allocation

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

Node also uses these AI-service settings:

```env
FLASK_AI_URL=http://localhost:5001
INCIDENT_SIMILARITY_TIME_WINDOW_MINUTES=60
INCIDENT_SIMILARITY_THRESHOLD=0.75
AI_SERVICE_TIMEOUT_MS=30000
```

Flask AI service:

```powershell
cd server/flask-api
copy .env.example .env.local
```

```env
PORT=5001
AI_PROVIDER=openai
AI_MODEL=gpt-4.1-mini
OPENAI_API_KEY=
OPENROUTER_API_KEY=
EXTRACTION_CONFIDENCE_THRESHOLD=0.65
```

When no AI key is configured, Flask uses deterministic local fallbacks for demo safety. Real keys belong in ignored `.env.local`, not in tracked files.

## Supabase Setup

Run the SQL migrations in Supabase SQL editor:

1. `backend/node-api/scripts/migrations/001_create_tables.sql`
2. `backend/node-api/scripts/migrations/002_command_state.sql`
3. `backend/node-api/supabase/migration_incident_state.sql`
4. `backend/node-api/supabase/migration_responder_incident_logs.sql`

Without Supabase, command allocations and timeline still work in memory for local demos, but reset when the backend restarts.
Public incident reports, incident queue/map state, and responder shared logs also fall back to in-memory storage when Supabase is not configured, so apply the new migrations if you need those records to survive backend restarts.

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

Flask AI service:

```powershell
cd server/flask-api
python -m flask --app app.main run --host 0.0.0.0 --port 5001
```

Default URLs:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000`
- Health: `http://localhost:3000/api/v1/health`
- Flask AI health: `http://localhost:5001/health`

If `5173` is busy, Vite will choose the next available port.

## Useful API Checks

```powershell
Invoke-RestMethod "http://localhost:3000/api/v1/foresight/predictions?surgeBeds=10&qrtCount=2"
Invoke-RestMethod "http://localhost:3000/api/v1/command/allocations"
Invoke-RestMethod "http://localhost:3000/api/v1/command/timeline"
```

Incident grouping and approval:

```powershell
$report = @{
  report_text = "I saw thick black smoke coming from Block 123 Tampines Street 11. People are gathering downstairs and someone said there may be elderly residents trapped."
  source = "public"
  reporter_location = @{ lat = 1.3521; lng = 103.8198 }
} | ConvertTo-Json -Depth 5

Invoke-RestMethod "http://localhost:3000/api/v1/incidents/report" -Method Post -ContentType "application/json" -Body $report
Invoke-RestMethod "http://localhost:3000/api/v1/incidents/clusters"
Invoke-RestMethod "http://localhost:3000/api/v1/incidents/public-reports"

$approval = @{
  incident_id = "INC-001"
  dispatcher_id = "DISP-001"
  approved_agencies = @("SCDF", "SPF", "MOH")
} | ConvertTo-Json

Invoke-RestMethod "http://localhost:3000/api/v1/resource-allocation/approve" -Method Post -ContentType "application/json" -Body $approval
Invoke-RestMethod "http://localhost:3000/api/v1/incidents/INC-001/logs"
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

Flask:

```powershell
cd server/flask-api
python -m pytest
```

Current coverage includes:

- Command service unit tests
- Command Supabase repository mapping tests
- Command HTTP route integration tests
- Incident grouping and resource approval route integration tests
- Foresight HTTP route integration test
- Flask AI service fallback and rules tests
- Existing SCDF, MOH, hospital, population, OneMap, and data.gov.sg unit tests
- Frontend Foresight-to-dispatcher flow test

## LLM Role

The LLM is only a briefing layer. It receives deterministic predictions, evidence, interventions, and outcome deltas, then returns a structured leader brief. It must not invent incidents, agencies, scores, severity, locations, or actions. The deterministic rules engine remains the source of truth.

## Next Work

1. Run the command-state Supabase migration in the deployment database.
2. Decide whether the Foresight `Staged Actions` queue should reflect backend agency status after approval/contact.
3. Extend Foresight rules with hospital pressure and multi-hazard correlation.
4. Implement or clearly label remaining visual-only controls before final judging.
