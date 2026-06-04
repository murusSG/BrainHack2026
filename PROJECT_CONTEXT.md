# MURUS SG Project Context

## Project Rundown

MURUS SG is a Singapore crisis-response dashboard for BrainHack 2026. The active app is the React frontend plus the Node/Express API in `frontend/` and `backend/node-api/`.

The core idea is a single operational picture that combines crisis signals, foresight, dispatcher review, responders, residents, hospitals, and resources.

### Current architecture

- `frontend/` - operational dashboard UI
- `backend/node-api/` - TypeScript/Express API
- `backend/shared/` - shared crisis/event types
- `server/flask-api/` - legacy scaffold, not the active path

## The 3 Personas

### 1. Leaders / Commanders

They use Foresight, leader briefs, command allocation review, and the timeline to decide what gets staged and who gets contacted next.

### 2. Responders

They use the responder view to see priority incidents, access risk, and route guidance based on the current incident picture.

### 3. Residents / Public

They use the resident-facing view for public-safe advisories, crisis status, and local support information.

## What Is Implemented Now

### Foresight

- Deterministic predictions are generated from unified crisis events first.
- Optional LLM narration runs as a briefing layer only.
- Structured leader brief output exists with:
  - headline
  - summary
  - posture
  - priority actions
  - public comms
  - uncertainty
  - tradeoff
- Hospital pressure rules are included.
- Multi-hazard watch rules are included.
- Frontend sliders update the what-if math locally and can refresh the brief intentionally.
- Commander actions can stage visible actions for dispatcher review.

### Command workflow

- Allocation recommendations can be created.
- Dispatcher approval / rejection / contact updates exist.
- Command timeline entries are created for staging and agency status changes.
- Supabase persistence has been added for command state when configured and migrated.

### Frontend demo honesty cleanup

- Alerts controls are interactive instead of dead UI.
- Resources controls now stage visible actions.
- Hospitals controls now filter and stage review notices.
- Incident map search and hazard filtering affect the visible set.
- Topbar search routes to relevant views.
- Responder route recommendation is now incident-driven rather than a fixed hardcoded example.

### Auth / Supabase work in progress

- Backend auth routes are being ported from teammate work.
- `GET /api/v1/auth/me` exists.
- `requireAuth` / `requireRole` middleware exists.
- A profile/roles migration has been added as `003_profiles_roles.sql`.
- `.env.local` currently has a corrected Supabase project URL but still needs careful secret handling.

## Current App State

### Working and demo-ready

- Crisis event aggregation and unified map feeds
- Foresight predictions endpoint
- LLM-backed leader brief when credentials are present
- Allocation staging and dispatcher review flow
- Command timeline rendering
- Frontend test and backend test coverage around the major demo path
- Supabase-backed command persistence when migrations are installed

### Still mock, partial, or hardcoded

- Foresight is rule-based, not a trained ML model
- Agency contact is still simulated as status changes
- Some controls remain visual-only or local-only
- The command/auth port is not fully finished yet
- Authenticated frontend flows are not fully wired
- Some persistence still depends on the user running the SQL migrations in Supabase

## Important Implementation Details

- The deterministic engine is the source of truth.
- The LLM should rewrite and brief the deterministic output, not invent new predictions.
- VectorEngine is being used as the OpenAI-compatible LLM endpoint.
- The backend reads secrets from ignored env files first.
- Do not commit or print live API keys or service-role credentials.
- The repo already has a standing rule: every completed task must update `PROGRESS.md`.

## What We Have Discussed

- The foresight flow should be deterministic first, then optionally narrated by the LLM.
- The leader brief should have a structured response contract.
- The app should be honest about what is real and what is simulated.
- The most useful next step after command persistence was backend auth / profile-role integration.
- Cross-branch audit showed teammate backend auth work worth porting, while some frontend branches were better left unmerged for now.

## What To Do Next

1. Finish the backend auth port and make sure it is testable.
2. Decide whether frontend login/gating should be added now or deferred.
3. Keep moving fake controls toward backend-backed state where it matters.
4. Replace any remaining simulated agency contact with a real integration or a clearly labelled simulation.
5. Keep tightening the command and foresight flows so the demo reads as one coherent system.

## Files Currently Most Relevant

- `C:\Projects\murus-sg\README.md`
- `C:\Projects\murus-sg\PROGRESS.md`
- `C:\Projects\murus-sg\backend\node-api\src\modules\foresight\foresight.service.ts`
- `C:\Projects\murus-sg\backend\node-api\src\modules\command\command.service.ts`
- `C:\Projects\murus-sg\backend\node-api\src\middlewares\auth.ts`
- `C:\Projects\murus-sg\backend\node-api\src\modules\auth\auth.routes.ts`
- `C:\Projects\murus-sg\backend\node-api\src\routes\v1.ts`
- `C:\Projects\murus-sg\frontend\src\components\ForesightEngine.jsx`
- `C:\Projects\murus-sg\frontend\src\components\AllocationApprovalPanel.jsx`

