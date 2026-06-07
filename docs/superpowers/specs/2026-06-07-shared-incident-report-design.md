# Shared Incident Report — Design Spec

**Date:** 2026-06-07  
**Status:** Approved  
**Scope:** Node API + Frontend (Responder View)

---

## Overview

Replace the existing in-memory shared incident log with a structured, Supabase-persisted **Shared Incident Report** system. Agencies such as SCDF and SPF each file one formal report per dispatched incident. Reports have defined fields, a status lifecycle, and are visible to all authenticated users.

---

## Decision Log

| Decision | Choice | Reason |
|---|---|---|
| Storage | Supabase (Option A) | In-memory store was always a prototype; Supabase is already wired |
| Old `/logs` endpoints | Retired | Clean replacement; no dual-tracking |
| Agency field | Auto-filled from `req.user.agency` | Users are authenticated; manual selection is unnecessary |
| Status lifecycle | `draft → submitted → acknowledged` | Supports progressive filing and inter-agency read confirmation |
| UI layout | Incident list (340px) + agency tabs + detail pane | Full-viewport two-column; left panel selects incident, right panel tabs per agency |

---

## Data Model

**Table:** `incident_reports` (Supabase / PostgreSQL)

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` | |
| `incident_id` | `text` | not null | References in-memory cluster ID (e.g. `INC-001`) |
| `agency` | `text` | not null | Auto-filled from `req.user.agency` |
| `author_id` | `uuid` | not null | Supabase user ID (`auth.uid()`) |
| `author_name` | `text` | nullable | Optional display name / unit identifier |
| `situation_summary` | `text` | not null | Required — minimum viable report content |
| `casualties` | `jsonb` | nullable | `{ injured: int, deceased: int, missing: int }` |
| `location` | `text` | nullable | On-ground location (may differ from incident coords) |
| `resources_deployed` | `text` | nullable | Personnel, vehicles, equipment (free text) |
| `actions_taken` | `text` | nullable | What the agency has done so far |
| `hazards` | `text[]` | nullable, default `'{}'` | Active dangers on scene |
| `next_steps` | `text` | nullable | Intended action plan |
| `status` | `text` | not null, default `'draft'` | `draft`, `submitted`, or `acknowledged` |
| `created_at` | `timestamptz` | not null, default `now()` | |
| `updated_at` | `timestamptz` | not null, default `now()` | Updated via trigger |

**Indexes:** `incident_id`, `agency`, `author_id`

**Unique constraint:** `(incident_id, author_id)` — one report per user per incident.

**RLS policies:**
- `SELECT`: any authenticated user
- `INSERT`: authenticated user only; enforced agency match (`agency = auth.jwt()->>'agency'`)
- `UPDATE`: any authenticated user — field-level and status-transition rules are enforced server-side in the service layer, not in RLS (RLS permitting the row-level access; the service rejects invalid transitions)

**Status transitions (server-enforced):**
- `draft → submitted`: author only
- `submitted → acknowledged`: any other authenticated user (not the author)

---

## API Layer

All endpoints require `requireAuth` middleware. Agency is taken from `req.user.agency`; the request body must not include an agency field.

### Endpoints

```
GET  /api/v1/incidents/:incidentId/reports
POST /api/v1/incidents/:incidentId/reports
PATCH /api/v1/incidents/:incidentId/reports/:reportId
```

### GET — List reports for an incident

**Response:**
```json
{
  "data": {
    "incident_id": "INC-001",
    "reports": [ /* IncidentReport[] */ ]
  }
}
```

### POST — Create a report

**Request body:**
```json
{
  "author_name": "Alpha 21",
  "situation_summary": "Fire contained to 3rd floor.",
  "location": "Block 93, Toa Payoh Central",
  "casualties": { "injured": 2, "deceased": 0, "missing": 1 },
  "resources_deployed": "3 fire engines, 12 personnel",
  "actions_taken": "Hoselines deployed. Search team on 3F.",
  "hazards": ["smoke inhalation", "structural risk"],
  "next_steps": "Await structural assessment.",
  "status": "draft"
}
```

- `situation_summary` is the only required field.
- `status` defaults to `draft` if omitted.
- A user may only have one report per incident (enforced by unique constraint on `incident_id + author_id`). Returns `409 Conflict` if a report already exists for that user on that incident.

**Response:** `201 Created` with the created `IncidentReport` object.

### PATCH — Update a report

Updates own report fields and/or advances status. Partial updates accepted (only changed fields required).

Status transition rules enforced server-side:
- Author can transition `draft → submitted`.
- Any other authenticated user can transition `submitted → acknowledged`.
- No other transitions permitted.

**Response:** `200 OK` with the updated `IncidentReport` object.

---

## Node API File Changes

Following existing module conventions:

| File | Change |
|---|---|
| `src/modules/incidents/incident.types.ts` | Add `IncidentReport`, `IncidentReportStatus`, `CasualtyCount` types |
| `src/repositories/incidentReport.repo.ts` | New — Supabase CRUD for `incident_reports` |
| `src/modules/incidents/incidentReport.service.ts` | New — validation, status transition logic |
| `src/modules/incidents/incident.controller.ts` | Add handlers: `getReports`, `postReport`, `patchReport` |
| `src/modules/incidents/incident.routes.ts` | Add `GET/POST /:id/reports`, `PATCH /:id/reports/:reportId`; remove old `/logs` routes |

---

## Frontend Changes

### Page layout

Full-viewport two-column grid matching the Alerts and Incident Map pages:

```
grid-template-columns: 340px 1fr
height: 100vh (minus nav)
```

Left column — incident list panel (`.responder-feed-panel`, styled like `.alerts-feed-panel`):
- Panel header: page title + `● LIVE` dot + auto-refresh interval label
- Scrollable list of `.responder-incident-card` buttons, one per dispatched incident
- Active card: `inset 4px 0 0 0 var(--blue)` left-border shadow + dark background
- Hover: border tints to `--border-strong`
- Each card layout:
  - Top row: incident ID pill (left) + severity pill (right)
  - Middle: incident title `h3`, agencies as small muted text below
  - Bottom row: dispatch timestamp, muted and small
- Empty state: centered muted message in panel body

Right column — `grid-template-rows: auto 1fr`:
- **Tab strip** (auto height): `.responder-agency-tab` elements, styled like `.resource-ledger-tabs` / `.resource-tab`
  - First tab always "All Agencies" — shows all agency reports stacked, each as a read-only detail box
  - One tab per agency on the selected incident
  - Active tab: `border-bottom: 2px solid var(--blue)`, text `var(--text)`; inactive: `var(--text-muted)`
- **Content area** (fills remaining height, `overflow-y: auto`): switches based on selected tab

### Detail view (read-only)

Report rendered as `.hospital-info-box` container with `.hospital-info-row` field rows:
- Label left (`var(--text-muted)`), value right (`var(--text)`)
- Status value: colored pill — muted `draft`, amber `submitted`, green `acknowledged`
- Footer row: reporter display name + formatted timestamp, muted and small
- "Edit" button top-right of box (visible only to report author) — switches to form view inline
- Empty state (tab selected, no report yet): centered muted message + "Submit Report" CTA if user has write access

### Form (create / edit)

Sections grouped in `.hospital-info-box`-style containers with muted section labels:
- **Situation** section: Author/unit name (text), Situation summary (textarea, required, 4 rows), On-ground location (text)
- **Casualties** section: Injured / Deceased / Missing (number inputs)
- **Operations** section: Resources deployed (textarea, 3 rows), Actions taken (textarea, 3 rows), Hazards (text, comma-separated)
- **Next Steps** section: Next steps (textarea, 3 rows)
- **Status** section: Status select — `draft` / `submitted` only (author cannot self-acknowledge; `acknowledged` is set by a peer via the Acknowledge button)
- Action row: "Save draft" secondary button | "Submit" `.btn-primary` button; Cancel clears back to detail view
- Pre-fills all fields when editing an existing report

### Acknowledge button

Visible on a `submitted` report whose author is not the current user. Sends `PATCH { status: "acknowledged" }`.

### `api.js` — already implemented

Methods `incidentReports`, `createIncidentReport`, `updateIncidentReport` already exist on the `api` object (added in the previous sprint). No changes needed.

State hooks `reports`, `reportStatus` already match (renamed from `logs`/`logStatus`). Polling interval (5 s) retained.

---

## Out of Scope

- File/media attachments on reports
- Push notifications when a report is submitted
- Report history / edit audit trail
- Per-incident agency access control (all authenticated users see all reports)
