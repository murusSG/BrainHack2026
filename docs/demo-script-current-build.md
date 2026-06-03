# MURUS SG Current-Build Demo Script

## 0:00-0:25 - Opening

Singapore's crisis data already exists, but it is scattered across agency feeds, public alerts, hospital capacity assumptions, and field reports. MURUS SG turns those signals into one operational picture.

Core line: one crisis, one platform, three confident decisions.

## 0:25-1:20 - Leader View

Route: `/`

Show the Overview page. Point out the active incident count, then go straight to the Foresight Engine.

Demo action:
- Move "Surge beds opened at SGH" from 0 to around 30.
- Move "QRTs pre-positioned in West" from 0 to 2 or 3.
- Call out that ICU overflow probability, response time, and lives-at-risk index update immediately.
- Click "Stage QRT" to show an auditable deterministic action status.

Say clearly: this is a deterministic prototype for the finals demo. The ML model layer is roadmap, not claimed as live production ML.

## 1:20-1:55 - Incident Map

Route: `/incident-map`

Show the unified map and the event list. Call out the live/demo feed label so judges see the app is honest about seeded scenarios.

Demo action:
- Select the Orchard flood or Tampines dengue card.
- Show the selected marker and radius behavior on the map.

Key line: no single public-facing dashboard currently gives commanders this multi-hazard view in one place.

## 1:55-2:35 - Responder View

Route: `/responder`

Show the responder queue sorted by severity first, then proximity from a fixed responder location.

Demo action:
- Select a high-priority incident from the queue.
- Use the route card: "Cardiac case at Bishan, TTSH at capacity, reroute to NUH."
- Click Accept to show the route decision state.

Key line: the responder does not just know where the incident is; they know the fastest survivable path.

## 2:35-3:15 - Resident View

Route: `/resident`

Show the saved locations: Home, Mum's place, Work.

Demo action:
- Select Work to show the Orchard flood alert.
- Select Home to show the Tampines dengue alert.
- Click Nearest shelter to show the demo shelter recommendation.
- Click View on map if you want to tie the resident view back to the shared incident map.

Key line: the same crisis data is translated into plain action for a person, not an expert.

## 3:15-3:40 - Close

MURUS SG is not another dashboard. It is a shared crisis data layer with three lenses:

- Leaders decide what to escalate.
- Responders decide where to route.
- Residents decide what to do next.

Close with: one crisis, one platform, three confident decisions.
