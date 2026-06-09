# Architecture

## Architecture Goal

MURUS SG must unify fragmented crisis-response data into one canonical operational picture. The architecture should make it easy to add new data providers without changing the frontend or decision-support logic.

## High-Level Flow

```text
External APIs / Simulated Providers / User Reports
        ↓
Provider Clients
        ↓
Ingestion + Validation
        ↓
Canonical Event Normalisation
        ↓
Geospatial Event Engine
        ↓
Database + Realtime Event Bus
        ↓
Node API Gateway
        ↓
React + MUI Dashboards
        ↓
Responder / Leader / Resident Decisions
```

## Recommended Components

### 1. Provider Clients

Each external source gets a provider client:

- `NeaProvider`
- `PubProvider`
- `LtaProvider`
- `MohCdaProvider`
- `ScdfPublicProvider`
- `OneMapProvider`
- `SimulatedSpfProvider`
- `SimulatedResponderUnitProvider`

Provider clients should return provider-specific DTOs. They should not write directly to the database.

Current Node API provider clients:

- `backend/node-api/src/services/dataGovSg.client.ts` wraps legacy and open data.gov.sg calls, datastore pagination, retries, and timeouts.
- The data.gov.sg client supports both `datastore_search` for tabular datasets and `poll-download` for GeoJSON/static datasets.
- `backend/node-api/src/services/oneMap.client.ts` manages OneMap JWT creation, caching, and authenticated geospatial calls.
- Domain services under `backend/node-api/src/modules/*` normalise provider records before controllers return data to the frontend.
- `backend/node-api/src/modules/hospitals` exposes public MOH/data.gov.sg hospital statistics with source metadata and no mock capacity fallback.

### 2. Ingestion Layer

The ingestion layer handles:

- Polling schedules.
- API authentication.
- Retries and backoff.
- Rate limiting.
- Response validation.
- Source metadata.
- Deduplication.

### 3. Normalisation Layer

The normalisation layer converts all provider-specific records into `CanonicalEvent` objects.

This is the most important backend boundary. It prevents the UI and AI layers from depending on inconsistent agency-specific formats.

### 4. Geospatial Event Engine

The geospatial engine enriches canonical events with:

- Point, line, or polygon geometry.
- Planning area or region.
- Vicinity radius.
- Affected population estimate where available.
- Nearby infrastructure such as AEDs, shelters, roads, MRT stations, and hospitals where relevant.
- Persona-specific relevance filtering.

### 5. Incident Management Service

Some raw events become incidents. An incident may contain multiple related events.

Example:

- Rainfall spikes + flood alert + traffic disruption + resident reports may be grouped into one flood incident.

Incident management handles:

- Incident creation.
- Event grouping.
- Status transitions.
- Assignment.
- Updates.
- Comments.
- Audit trail.
- Public advisory state.

Current prototype dispatcher/responder flow:

```text
Public report
    â†“
Extraction + recent-incident similarity check
    â†“
Canonical incident cluster
    â†“
Backend priority score and sorted dispatcher Priority Queue
    â†“
Human dispatch decision
    â†“
Approved: responder incident + shared agency log
Declined: removed from operational queues
```

The Node prototype now persists raw public incident reports, operational incident clusters, and
shared responder logs in Supabase when the incident-state and responder-log migrations are applied.
The API boundary remains structured for fuller PostgreSQL/PostGIS persistence and immutable audit
events without changing the role-specific frontend workflow, and still falls back to in-memory
state when Supabase is not configured.

### 6. Realtime Event Bus

Use Redis Pub/Sub, Redis Streams, Kafka, or another queue/event bus depending on project scale.

Minimum prototype approach:

- Python ingestion writes event/incident updates to database.
- Python publishes update notifications to Redis.
- Node gateway pushes updates to frontend through WebSocket or SSE.

### 7. Foresight Engine

The Foresight Engine consumes current events, historical data, and forecasts to project risk over future time windows.

Outputs should be explainable:

- Prediction target.
- Time horizon.
- Confidence.
- Data sources used.
- Main contributing factors.
- Recommended preventive actions.

### 8. AI-Assisted Resource Allocation

This service recommends agencies or resources to notify based on incident features.

It must not directly dispatch or notify agencies without human approval.

Recommended flow:

```text
Incident updated
    ↓
Feature extraction
    ↓
Rule-based safety checks
    ↓
AI/ranking model recommendation
    ↓
Explanation generated
    ↓
Dispatcher approval required
    ↓
Notification action executed and audited
```

## Deployment Model

Recommended services:

- `frontend` — React app served through static hosting or Node.
- `api-gateway` — Node.js backend.
- `python-worker` — ingestion and background jobs.
- `python-ai-service` — prediction/allocation endpoints.
- `postgres` — relational + geospatial database.
- `redis` — cache, queue, realtime event channel.

## Failure Handling

The system must degrade gracefully:

- If an external API fails, show last successful data with timestamp.
- If prediction fails, keep current incident management usable.
- If realtime push fails, allow polling fallback.
- If geocoding fails, keep raw location text and mark geospatial confidence as low.
- If an AI recommendation is low-confidence, require manual review and do not auto-escalate.

HTTP errors use the shared envelope:

```json
{
  "error": {
    "code": "UPSTREAM_API_ERROR",
    "message": "External provider request failed.",
    "details": {}
  }
}
```

Slow or unavailable public datasets return explicit provider errors rather than mock API responses.
