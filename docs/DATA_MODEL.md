# Data Model

## Design Goal

All operational data should flow into a small set of canonical models. This prevents the frontend, incident management, AI allocation, and prediction layers from depending on inconsistent external API formats.

## Canonical Event

A `CanonicalEvent` represents a normalized signal from any source.

```ts
export type CanonicalEvent = {
  id: string;
  source: EventSource;
  sourceRecordId?: string;
  sourceUrl?: string;
  retrievedAt: string;
  observedAt: string;
  updatedAt?: string;

  hazardType: HazardType;
  title: string;
  description?: string;
  severity: SeverityLevel;
  confidence: ConfidenceLevel;

  location: GeoLocation;
  vicinityRadiusMeters: number;
  affectedArea?: GeoJsonGeometry;
  planningArea?: string;
  region?: SingaporeRegion;

  status: EventStatus;
  recommendedActions?: RecommendedAction[];
  publicAdvisory?: PublicAdvisory;

  rawSourcePayloadRef?: string;
  tags: string[];
};
```

## Event Sources

```ts
export type EventSource =
  | 'NEA'
  | 'PUB'
  | 'LTA'
  | 'MOH_CDA'
  | 'SCDF_PUBLIC'
  | 'SPF_SIMULATED'
  | 'RESPONDER_REPORT'
  | 'RESIDENT_REPORT'
  | 'ONEMAP'
  | 'SYSTEM_PREDICTION'
  | 'ADMIN_CREATED';
```

## Hazard Types

```ts
export type HazardType =
  | 'HAZE'
  | 'AIR_QUALITY'
  | 'HEAVY_RAIN'
  | 'FLOOD'
  | 'LIGHTNING'
  | 'HEAT_STRESS'
  | 'DENGUE_CLUSTER'
  | 'INFECTIOUS_DISEASE'
  | 'ROAD_INCIDENT'
  | 'TRAIN_DISRUPTION'
  | 'TRAFFIC_CONGESTION'
  | 'FIRE'
  | 'MEDICAL_EMERGENCY'
  | 'PUBLIC_ORDER'
  | 'INFRASTRUCTURE_FAILURE'
  | 'SHELTER_ADVISORY'
  | 'GENERAL_ALERT';
```

## Severity

```ts
export type SeverityLevel = 'INFO' | 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
```

Severity should be computed from source-specific rules. Example:

- Flood alert severity from PUB source severity where available.
- Haze severity from PSI/PM2.5 thresholds.
- Dengue severity from case count and cluster growth.
- Transport severity from disruption duration, affected routes, and area impact.

## Confidence

```ts
export type ConfidenceLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'VERIFIED';
```

Suggested mapping:

- Official agency API: `HIGH` or `VERIFIED` depending on use case.
- Responder report: `HIGH` after authenticated submission.
- Resident report: `LOW` until corroborated.
- Prediction: confidence determined by model score and validation history.

## Location

```ts
export type GeoLocation = {
  type: 'POINT' | 'POLYGON' | 'LINE' | 'UNKNOWN';
  latitude?: number;
  longitude?: number;
  addressText?: string;
  postalCode?: string;
  geometry?: GeoJsonGeometry;
  geocodingConfidence?: ConfidenceLevel;
};
```

## Vicinity Radius Rules

Vicinity radius should depend on hazard type.

Suggested defaults:

| Hazard | Radius |
| --- | --- |
| AED / shelter | point of interest; radius depends on user query |
| Dengue cluster | polygon from source; fallback 500m |
| Flood alert | 300m–1km depending on drain/road context |
| Traffic incident | 200m–1km depending on road class |
| Train disruption | affected station/line corridor |
| Haze / PSI | regional or islandwide |
| Lightning | 5km–10km depending on alert granularity |
| Infectious disease | planning area / national depending on data |

## Incident

An `Incident` groups one or more canonical events into an operational case.

Public reports are deduplicated into an incident cluster before dispatcher review. The cluster is
the shared operational record used by both dispatcher and responder views. It includes:

- `priorityScore` and `priorityReason`, calculated by the backend and recalculated when grouped
  reports change incident priority.
- `status`: `pending_approval`, `dispatched`, `declined`, or `closed`.
- `duplicateOf` or `clusterId` semantics through the cluster's grouped report collection.
- AI-recommended agencies/resources, with human dispatcher approval required.
- An optional dispatch decision and a shared responder log after approval.

Priority queue responses include a backend-computed `queuePosition`. Frontends must preserve the
returned ordering rather than independently re-ranking incidents.

```ts
export type Incident = {
  id: string;
  title: string;
  summary: string;
  primaryHazardType: HazardType;
  severity: SeverityLevel;
  status: IncidentStatus;

  eventIds: string[];
  location: GeoLocation;
  affectedArea?: GeoJsonGeometry;
  vicinityRadiusMeters: number;

  assignedAgencyIds: string[];
  assignedResourceIds: string[];
  commanderNotes?: string;
  publicAdvisoryId?: string;

  createdAt: string;
  updatedAt: string;
  closedAt?: string;
  auditTrail: AuditEvent[];
};
```

```ts
export type IncidentStatus =
  | 'NEW'
  | 'TRIAGING'
  | 'ACTIVE'
  | 'MONITORING'
  | 'RESOLVED'
  | 'CLOSED'
  | 'FALSE_ALARM';
```

The existing uppercase status set remains the canonical event/long-term incident lifecycle. The
dispatcher prototype additionally exposes the approval lifecycle above on incident clusters until
the persistent incident repository replaces the in-memory cluster store.

## Dispatch Decision

```ts
export type DispatchDecision = {
  incidentId: string;
  decision: 'approved' | 'declined';
  approvedResources: string[];
  dispatcherNote?: string;
  dispatcherId: string;
  timestamp: string;
};
```

Approval changes the cluster to `dispatched`, removes it from the Priority Queue, exposes it to
responders, and creates an initial `resource_update` log entry. Decline removes it from both active
operational queues.

## Responder Incident Log

```ts
export type ResponderIncidentLog = {
  id: string;
  incidentId: string;
  agency: string;
  author?: string;
  message: string;
  category: 'hazard' | 'medical' | 'evacuation' | 'security' | 'resource_update' | 'general';
  timestamp: string;
};
```

All approved agencies read and append to the same incident log. Pending or declined incidents do
not expose responder logs.

## Resource

```ts
export type Resource = {
  id: string;
  type: ResourceType;
  agencyId: string;
  label: string;
  status: ResourceStatus;
  location?: GeoLocation;
  capacity?: number;
  capabilities: string[];
  lastUpdatedAt: string;
};
```

## Resource Location

SCDF public infrastructure is normalised before it reaches the frontend:

```ts
export type ResourceLocation = {
  id: string;
  source: 'SCDF';
  resource_type: 'FIRE_STATION' | 'SHELTER' | 'AED';
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  operating_hours?: string;
  capacity?: number;
  contact?: string;
  raw_source_id?: string;
  updated_at?: string;
};
```

## Health Signal

MOH/CDA public-health data is normalised as health signals:

```ts
export type HealthSignal = {
  id: string;
  source: 'MOH' | 'CDA';
  health_signal_type: 'INFECTIOUS_DISEASE' | 'COVID' | 'HEALTH_CAPACITY';
  disease?: string;
  epi_week?: string;
  year?: number;
  value: number;
  unit: string;
  trend_direction?: 'UP' | 'DOWN' | 'STABLE' | 'UNKNOWN';
  severity?: SeverityLevel;
  updated_at?: string;
};
```

## Population Context

HDB, DOS, and data.gov.sg planning records are normalised for impact estimation:

```ts
export type PopulationContext = {
  id: string;
  source: 'HDB' | 'DOS' | 'DATA_GOV_SG';
  area_name: string;
  subzone?: string;
  dwelling_type?: string;
  population?: number;
  household_count?: number;
  block?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  updated_at?: string;
};
```

```ts
export type ResourceType =
  | 'AMBULANCE'
  | 'FIRE_ENGINE'
  | 'POLICE_UNIT'
  | 'SHELTER'
  | 'AED'
  | 'MEDICAL_FACILITY'
  | 'FLOOD_RESPONSE_TEAM'
  | 'TRAFFIC_CONTROL_TEAM'
  | 'VOLUNTEER_GROUP'
  | 'OTHER';
```

## Audit Event

All operational changes must be auditable.

```ts
export type AuditEvent = {
  id: string;
  actorId: string;
  actorRole: string;
  action: string;
  targetType: 'EVENT' | 'INCIDENT' | 'RESOURCE' | 'ADVISORY' | 'RECOMMENDATION';
  targetId: string;
  timestamp: string;
  before?: unknown;
  after?: unknown;
  reason?: string;
};
```
