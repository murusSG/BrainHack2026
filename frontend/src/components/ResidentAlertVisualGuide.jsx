import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Timeline } from '@mantine/core';
import { Circle, CircleMarker, MapContainer, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { ResidentSourceBadge } from './ResidentSourceBadge';
import { api } from '../services/api';

const SG_CENTER = [1.3521, 103.8198];
const MAX_SHELTER_CANDIDATES = 12;
const ROUTE_CONFIDENCE_REASON_LIMIT = 6;
const WAYPOINT_EXTRA_METERS = 450;

function distanceMeters(a, b) {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function FitRouteBounds({ points }) {
  const map = useMap();
  const lastKey = useRef('');
  const boundsKey = points.map((point) => point.join(',')).join('|');

  useEffect(() => {
    if (!points.length || boundsKey === lastKey.current) return;
    lastKey.current = boundsKey;
    if (points.length === 1) {
      map.setView(points[0], 14, { animate: false });
      return;
    }
    map.fitBounds(points, { padding: [32, 32], maxZoom: 16, animate: false });
  }, [boundsKey, map, points]);

  return null;
}

export function ResidentAlertVisualGuide({
  alert,
  point,
  homePoint,
  transportMode,
  mobilityNeed,
  profileLabel,
}) {
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [guide, setGuide] = useResidentVisualGuide({
    alert,
    point,
    homePoint,
    transportMode,
    mobilityNeed,
    profileLabel,
  });

  const mapPoints = useMemo(
    () =>
      [
        [point.lat, point.lng],
        alert.lat != null && alert.lng != null ? [Number(alert.lat), Number(alert.lng)] : null,
        guide.target ? [guide.target.lat, guide.target.lng] : null,
        ...(guide.routePoints ?? []),
      ].filter(isValidMapPoint),
    [alert.lat, alert.lng, guide.routePoints, guide.target, point.lat, point.lng]
  );

  return (
    <section className="resident-visual-guide-card" aria-label={`Visual guidance for ${alert.title}`}>
      <div className="resident-visual-guide-head">
        <div>
          <p className="resident-guidance-label">Visual next steps</p>
          <h3>{guide.heading}</h3>
        </div>
        <span className={`resident-route-badge is-${guide.routeTone}`}>{guide.routeLabel}</span>
      </div>
      <div className="resident-source-row" aria-label="Evacuation guide source labels">
        <ResidentSourceBadge tone="generated">Generated route preview</ResidentSourceBadge>
        <ResidentSourceBadge tone="current">From current location</ResidentSourceBadge>
        <ResidentSourceBadge tone="visual">Visual aid, not clearance</ResidentSourceBadge>
      </div>

      <RouteMapPreview
        alert={alert}
        point={point}
        homePoint={homePoint}
        guide={guide}
        mapPoints={mapPoints}
        className="resident-route-map"
        ariaLabel="Emergency route map preview"
      />

      <div className="resident-route-summary">
        <strong>{guide.summary}</strong>
        <span>{guide.detail}</span>
        <small>{guide.routeBasis}</small>
      </div>

      <div className={`resident-route-confidence is-${guide.routeConfidence.tone}`}>
        <span>Route confidence</span>
        <strong>{guide.routeConfidence.label}</strong>
        <small>{guide.destination.confidenceLabel}</small>
        <ul className="resident-route-confidence-list">
          {guide.routeConfidence.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      </div>

      <div className="resident-guide-actions">
        <button type="button" className="resident-guide-open-button" onClick={() => setIsGuideOpen(true)}>
          Open full evacuation guide
        </button>
        <span>Expanded generated route, turn-by-turn steps, and Street View visual aids where available.</span>
      </div>

      <section className="resident-evacuation-plan" aria-label="Step-by-step evacuation route">
        <div className="resident-evacuation-plan-head">
          <div>
            <p className="resident-guidance-label">Evacuation route steps</p>
            <h4>{guide.riskLabel}</h4>
          </div>
          <span>{guide.visualLabel}</span>
        </div>
        <div className="resident-evacuation-step-grid">
          {guide.evacuationSteps.map((step, index) => (
            <article key={step.id} className={`resident-evacuation-step is-${step.tone}`}>
              <RouteStepSchematic step={step} />
              <div className="resident-evacuation-step-copy">
                <span>Step {index + 1}</span>
                <h5>{step.title}</h5>
                <p>{step.body}</p>
                <strong>{step.instruction}</strong>
                {step.distanceLabel && <small>{step.distanceLabel}</small>}
              </div>
            </article>
          ))}
        </div>
        <p className="resident-evacuation-note">
          These are generated schematic visuals from your selected current location to the next suitable destination.
          They are not live route clearance. Follow staff, agency, and MURUS updates if they differ.
        </p>
      </section>

      <Timeline
        active={guide.steps.length - 1}
        bulletSize={30}
        lineWidth={2}
        className="resident-route-timeline"
        color="brandRed.6"
      >
        {guide.steps.map((step) => (
          <Timeline.Item
            key={step.title}
            bullet={<span aria-hidden="true">{step.icon}</span>}
            title={step.title}
          >
            <p>{step.body}</p>
          </Timeline.Item>
        ))}
      </Timeline>
      {isGuideOpen && (
        <EvacuationGuideModal
          alert={alert}
          point={point}
          homePoint={homePoint}
          guide={guide}
          mapPoints={mapPoints}
          onClose={() => setIsGuideOpen(false)}
        />
      )}
    </section>
  );
}

function RouteMapPreview({ alert, point, homePoint, guide, mapPoints, className, ariaLabel }) {
  return (
    <div className={className} aria-label={ariaLabel}>
      <MapContainer
        center={mapPoints[0] ?? SG_CENTER}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
        dragging
      >
        <TileLayer
          url="https://www.onemap.gov.sg/maps/tiles/Default/{z}/{x}/{y}.png"
          attribution='OneMap | Map data &copy; <a href="https://www.sla.gov.sg">Singapore Land Authority</a>'
          minZoom={11}
          maxZoom={18}
        />
        <FitRouteBounds points={mapPoints} />
        {alert.lat != null && alert.lng != null && (
          <>
            <Circle
              center={[Number(alert.lat), Number(alert.lng)]}
              radius={alert.radiusMeters ?? 500}
              pathOptions={{
                color: '#d62f43',
                fillColor: '#d62f43',
                fillOpacity: 0.12,
                weight: 1.5,
              }}
            />
            <CircleMarker
              center={[Number(alert.lat), Number(alert.lng)]}
              radius={7}
              pathOptions={{ color: '#ffffff', fillColor: '#d62f43', fillOpacity: 0.95, weight: 2 }}
            >
              <Popup>{alert.locationLabel ?? 'Affected area'}</Popup>
            </CircleMarker>
          </>
        )}
        <CircleMarker
          center={[point.lat, point.lng]}
          radius={8}
          pathOptions={{ color: '#ffffff', fillColor: '#2f6f9f', fillOpacity: 0.95, weight: 2 }}
        >
          <Popup>{point.label}</Popup>
        </CircleMarker>
        {guide.target && (
          <CircleMarker
            center={[guide.target.lat, guide.target.lng]}
            radius={8}
            pathOptions={{ color: '#ffffff', fillColor: '#287a58', fillOpacity: 0.95, weight: 2 }}
          >
            <Popup>{guide.target.label}</Popup>
          </CircleMarker>
        )}
        {homePoint && guide.target?.id !== homePoint.id && (
          <CircleMarker
            center={[homePoint.lat, homePoint.lng]}
            radius={6}
            pathOptions={{ color: '#ffffff', fillColor: '#b87516', fillOpacity: 0.9, weight: 2 }}
          >
            <Popup>{homePoint.label}</Popup>
          </CircleMarker>
        )}
        {guide.routePoints?.length >= 2 && (
          <Polyline
            positions={guide.routePoints}
            pathOptions={{
              color: guide.routeTone === 'warning' ? '#b87516' : '#0c6b67',
              weight: 4,
              opacity: 0.86,
            }}
          />
        )}
      </MapContainer>
    </div>
  );
}

function EvacuationGuideModal({ alert, point, homePoint, guide, mapPoints, onClose }) {
  const titleId = useId();
  const streetView = useStreetViewPreviews(guide.evacuationSteps);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const destination = guide.target?.label ?? 'Staffed assembly point';
  const destinationDetail = guide.target?.sublabel ?? 'Use staff or MURUS updates to confirm where to wait.';

  return (
    <div
      className="resident-guide-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="resident-guide-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="resident-guide-modal-header">
          <div>
            <p className="resident-guidance-label">Full evacuation guide</p>
            <h2 id={titleId}>{guide.heading}</h2>
            <p>
              Generated from your current location to the next suitable destination outside the alert buffer.
              Treat this as a visual aid, not an official safety clearance.
            </p>
            <div className="resident-source-row">
              <ResidentSourceBadge tone="generated">Generated route preview</ResidentSourceBadge>
              <ResidentSourceBadge tone="visual">Street View is visual aid only</ResidentSourceBadge>
              <ResidentSourceBadge tone="fallback">Schematics appear when imagery is unavailable</ResidentSourceBadge>
            </div>
          </div>
          <button type="button" className="resident-guide-close-button" onClick={onClose} aria-label="Close evacuation guide">
            Close
          </button>
        </header>

        <div className="resident-guide-modal-body">
          <div className="resident-guide-modal-main">
            <RouteMapPreview
              alert={alert}
              point={point}
              homePoint={homePoint}
              guide={guide}
              mapPoints={mapPoints}
              className="resident-guide-modal-map"
              ariaLabel="Expanded evacuation route map"
            />

            <div className="resident-guide-step-list" aria-label="Full step-by-step evacuation instructions">
              {guide.evacuationSteps.map((step, index) => (
                <article key={step.id} className={`resident-guide-step-card is-${step.tone}`}>
                  <StreetViewStepVisual step={step} preview={streetView.previews[step.id]} />
                  <div className="resident-guide-step-copy">
                    <span>Step {index + 1}</span>
                    <h3>{step.title}</h3>
                    <p>{step.body}</p>
                    <strong>{step.instruction}</strong>
                    {step.distanceLabel && <small>{step.distanceLabel}</small>}
                  </div>
                </article>
              ))}
            </div>
          </div>

          <aside className="resident-guide-modal-side" aria-label="Route status and destination">
            <div className="resident-guide-status-card is-risk">
              <span>Current risk</span>
              <strong>{guide.riskLabel}</strong>
              <p>{guide.summary}</p>
            </div>
            <div className="resident-guide-status-card">
              <span>From</span>
              <strong>{point.label}</strong>
              {point.sublabel && <p>{point.sublabel}</p>}
            </div>
            <div className="resident-guide-status-card">
              <span>Nearest suitable destination</span>
              <strong>{destination}</strong>
              <p>{destinationDetail}</p>
            </div>
            <div className={`resident-guide-status-card is-${guide.routeConfidence.tone}`}>
              <span>Route confidence</span>
              <strong>{guide.routeConfidence.label}</strong>
              <ul className="resident-guide-reason-list">
                {guide.routeConfidence.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </div>
            {guide.routeConfidence.rejectedDestinations.length > 0 && (
              <div className="resident-guide-status-card">
                <span>Skipped candidates</span>
                <ul className="resident-guide-reason-list">
                  {guide.routeConfidence.rejectedDestinations.map((candidate, index) => (
                    <li key={`${candidate.target?.id ?? candidate.target?.label ?? 'candidate'}-${index}`}>
                      {candidate.target?.label ?? 'Candidate'} skipped: {candidate.reasons.join(', ')}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="resident-guide-status-card">
              <span>Street View visual aids</span>
              <strong>{streetViewStatusTitle(streetView.status)}</strong>
              <p>{streetViewStatusCopy(streetView)}</p>
            </div>
            <div className="resident-guide-warning-card">
              <strong>Before moving</strong>
              <p>
                If the route points toward smoke, flooding, blocked corridors, basement links, or crowd crush,
                stop and follow staff, emergency services, or the latest MURUS update.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}

function StreetViewStepVisual({ step, preview }) {
  if (preview?.available && preview.imageUrl) {
    return (
      <figure className="resident-guide-step-image">
        <img src={preview.imageUrl} alt={`Street-view visual aid for ${step.title}`} />
        <figcaption>
          Google Street View visual aid only, not live clearance{preview.metadata?.date ? `; captured ${preview.metadata.date}` : ''}.
        </figcaption>
      </figure>
    );
  }

  return (
    <div className="resident-guide-step-schematic">
      <RouteStepSchematic step={step} />
      <span>{streetViewFallbackLabel(preview)}</span>
    </div>
  );
}

function useStreetViewPreviews(steps) {
  const requestKey = useMemo(
    () =>
      steps
        .map((step) =>
          step.viewpoint
            ? `${step.id}:${step.viewpoint.lat},${step.viewpoint.lng},${step.viewpoint.heading ?? ''}`
            : step.id
        )
        .join('|'),
    [steps]
  );
  const [state, setState] = useState({ status: 'idle', previews: {} });

  useEffect(() => {
    const requests = steps.filter((step) => step.viewpoint).slice(0, 4);
    if (!requests.length) {
      setState({ status: 'fallback', previews: {} });
      return undefined;
    }

    let cancelled = false;
    setState({ status: 'loading', previews: {} });

    Promise.all(
      requests.map(async (step) => {
        try {
          const preview = await api.streetViewPreview(step.viewpoint);
          return [step.id, preview];
        } catch (error) {
          return [
            step.id,
            {
              available: false,
              status: streetViewErrorStatus(error),
            },
          ];
        }
      })
    ).then((entries) => {
      if (cancelled) return;
      const previews = Object.fromEntries(entries);
      const values = Object.values(previews);
      const hasImage = values.some((preview) => preview?.available && preview?.imageUrl);
      setState({
        status: hasImage ? 'ready' : 'fallback',
        previews,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [requestKey, steps]);

  return state;
}

function streetViewErrorStatus(error) {
  const message = error instanceof Error ? error.message : String(error);
  if (/not configured|configuration/i.test(message)) return 'NOT_CONFIGURED';
  return 'UNAVAILABLE';
}

function streetViewStatusTitle(status) {
  if (status === 'ready') return 'Images available';
  if (status === 'loading') return 'Checking imagery';
  return 'Using schematics';
}

function streetViewStatusCopy(streetView) {
  if (streetView.status === 'ready') {
    return 'Where available, steps show Google Street View imagery facing the next move. Imagery is historical and does not confirm the route is clear.';
  }
  if (streetView.status === 'loading') {
    return 'Checking whether a provider has outdoor street imagery near each waypoint.';
  }
  const statuses = Object.values(streetView.previews ?? {}).map((preview) => preview?.status);
  if (statuses.includes('NOT_CONFIGURED')) {
    return 'Street View can be enabled by adding a server-side Google Street View key; schematic guidance remains available now.';
  }
  return 'No street-level provider image is available for this step, so the guide uses generated schematic visuals instead.';
}

function streetViewFallbackLabel(preview) {
  if (!preview) return 'Generated schematic visual';
  if (preview.status === 'NOT_CONFIGURED') return 'Street View not configured; using schematic';
  if (preview.status === 'ZERO_RESULTS') return 'No nearby Street View; using schematic';
  return 'Street image unavailable; using schematic';
}

function RouteStepSchematic({ step }) {
  const path = schematicPathFor(step.visual);
  const arrow = arrowFor(step.visual);
  const markerId = `route-arrow-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const hazardVisible = step.tone === 'danger' || step.tone === 'warning';
  const showShelter = step.visual === 'arrive';
  const showLift = step.visual === 'accessible' || step.accessible;

  return (
    <svg
      className="resident-step-schematic"
      viewBox="0 0 160 120"
      role="img"
      aria-label={step.visualLabel}
    >
      <title>{step.visualLabel}</title>
      <rect x="0" y="0" width="160" height="120" rx="14" className="schematic-bg" />
      <path d="M12 92 H148" className="schematic-street" />
      <path d="M24 28 H70 V92 H24 Z" className="schematic-building" />
      <path d="M82 22 H138 V92 H82 Z" className="schematic-building is-light" />
      {hazardVisible && (
        <>
          <circle cx="42" cy="76" r="26" className="schematic-hazard-zone" />
          <text x="42" y="80" textAnchor="middle" className="schematic-hazard-text">
            ALERT
          </text>
        </>
      )}
      {showShelter && (
        <>
          <rect x="104" y="34" width="28" height="24" rx="4" className="schematic-shelter" />
          <text x="118" y="50" textAnchor="middle" className="schematic-shelter-text">
            DEST
          </text>
        </>
      )}
      {showLift && (
        <>
          <rect x="34" y="36" width="22" height="28" rx="3" className="schematic-lift" />
          <text x="45" y="54" textAnchor="middle" className="schematic-lift-text">
            LIFT
          </text>
        </>
      )}
      <path d={path} className="schematic-route" markerEnd={`url(#${markerId})`} />
      <defs>
        <marker
          id={markerId}
          markerWidth="8"
          markerHeight="8"
          refX="5"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d={arrow} className="schematic-arrow" />
        </marker>
      </defs>
      <circle cx="28" cy="92" r="5" className="schematic-start" />
      <circle cx="130" cy="28" r="5" className="schematic-end" />
    </svg>
  );
}

function useResidentVisualGuide({ alert, point, homePoint, transportMode, mobilityNeed, profileLabel }) {
  const [guide, setGuide] = useStateForGuide(alert, point, homePoint, transportMode, mobilityNeed, profileLabel);

  useEffect(() => {
    let cancelled = false;

    async function loadRoute() {
      setGuide((current) => ({ ...current, routeStatus: 'loading' }));
      const destination = await selectRouteDestination({ alert, point, homePoint });
      const target = destination.target;
      const route = target
        ? await findRoute({
            start: point,
            target,
            transportMode,
          })
        : null;
      if (cancelled) return;
      setGuide(buildGuide({ alert, point, homePoint, transportMode, mobilityNeed, profileLabel, destination, route }));
    }

    loadRoute();

    return () => {
      cancelled = true;
    };
  }, [alert, homePoint, mobilityNeed, point, profileLabel, setGuide, transportMode]);

  return [guide, setGuide];
}

function useStateForGuide(alert, point, homePoint, transportMode, mobilityNeed, profileLabel) {
  const [guide, setGuide] = useState(() =>
    buildGuide({
      alert,
      point,
      homePoint,
      transportMode,
      mobilityNeed,
      profileLabel,
      destination: buildFallbackDestination({ alert, point, homePoint, shelters: [] }),
      route: null,
    })
  );
  return [guide, setGuide];
}

export async function buildResidentEvacuationGuideContext({
  alert,
  point,
  homePoint,
  transportMode,
  mobilityNeed,
  profileLabel,
}) {
  const destination = await selectRouteDestination({ alert, point, homePoint });
  const route = destination.target
    ? await findRoute({
        start: point,
        target: destination.target,
        transportMode,
      })
    : null;
  const guide = buildGuide({ alert, point, homePoint, transportMode, mobilityNeed, profileLabel, destination, route });
  return serializeEvacuationGuideContext(guide, route);
}

function serializeEvacuationGuideContext(guide, route) {
  return {
    heading: guide.heading,
    summary: guide.summary,
    detail: guide.detail,
    routeBasis: guide.routeBasis,
    riskLabel: guide.riskLabel,
    routeLabel: guide.routeLabel,
    routeTone: guide.routeTone,
    destination: guide.target
      ? {
          label: guide.target.label,
          address: guide.target.sublabel,
          type: guide.destination.type,
          confidenceLabel: guide.destination.confidenceLabel,
          kind: guide.target.kind,
          distanceMeters: numberOrNull(guide.target.distanceMeters),
        }
      : null,
    route: {
      source: route?.source ?? 'preview',
      distanceMeters: numberOrNull(route?.distanceMeters),
      durationSeconds: numberOrNull(route?.durationSeconds),
      pointCount: guide.routePoints?.length ?? 0,
    },
    routeConfidence: {
      label: guide.routeConfidence.label,
      tone: guide.routeConfidence.tone,
      reasons: guide.routeConfidence.reasons,
    },
    skippedCandidates: (guide.routeConfidence.rejectedDestinations ?? []).slice(0, 3).map((candidate) => ({
      label: candidate.target?.label ?? 'Candidate',
      reasons: candidate.reasons ?? [],
    })),
    steps: guide.evacuationSteps.slice(0, 5).map((step) => ({
      title: step.title,
      instruction: step.instruction,
      distanceLabel: step.distanceLabel,
      tone: step.tone,
    })),
  };
}

function numberOrNull(value) {
  return Number.isFinite(value) ? value : null;
}

async function selectRouteDestination({ alert, point, homePoint }) {
  const shelters = await findNearestShelters(point);
  return chooseDestination({ alert, point, homePoint, shelters });
}

async function findNearestShelters(point) {
  try {
    const nearest = await api.scdfNearest(point.lat, point.lng, 'SHELTER');
    if (!Array.isArray(nearest)) return [];
    return nearest
      .filter((item) => item.latitude != null && item.longitude != null)
      .slice(0, MAX_SHELTER_CANDIDATES)
      .map((shelter) => ({
        id: shelter.id ?? shelter.name ?? 'nearest-shelter',
        label: shelter.name ?? 'Nearest shelter',
        sublabel: shelter.address ?? 'SCDF shelter lookup',
        lat: Number(shelter.latitude),
        lng: Number(shelter.longitude),
        distanceMeters: Number(shelter.distance_meters),
        kind: 'shelter',
      }))
      .filter((shelter) => Number.isFinite(shelter.lat) && Number.isFinite(shelter.lng));
  } catch {
    return [];
  }
}

async function findRoute({ start, target, transportMode }) {
  try {
    const route = await api.oneMapRoute({
      startLat: start.lat,
      startLng: start.lng,
      endLat: target.lat,
      endLng: target.lng,
      mode: routeModeForTransport(transportMode),
    });
    const routePoints = parseRouteGeometry(route?.geometry);
    return {
      distanceMeters: route?.distance_meters,
      durationSeconds: route?.duration_seconds,
      routePoints: routePoints.length >= 2 ? routePoints : [[start.lat, start.lng], [target.lat, target.lng]],
      source: route?.source ?? 'ONEMAP',
    };
  } catch {
    return {
      routePoints: [[start.lat, start.lng], [target.lat, target.lng]],
      source: 'direct-preview',
    };
  }
}

function chooseDestination({ alert, point, homePoint, shelters }) {
  const evaluatedShelters = shelters.map((shelter) => evaluateDestination(shelter, alert, point));
  const shelter = evaluatedShelters
    .filter((candidate) => candidate.accepted)
    .sort((left, right) => left.score - right.score)[0];

  if (shelter) {
    return {
      target: {
        ...shelter.target,
        sublabel: [
          shelter.target.sublabel,
          formatDistance(shelter.distanceFromAlert)
            ? `${formatDistance(shelter.distanceFromAlert)} from alert centre`
            : null,
        ]
          .filter(Boolean)
          .join(' / '),
      },
      type: 'shelter',
      label: 'Shelter candidate found',
      tone: 'ready',
      confidenceLabel: 'Shelter candidate found',
      reasons: [
        `Closest suitable SCDF shelter candidate from ${point.label}.`,
        `Outside the active alert buffer by ${formatDistance(shelter.bufferMeters) ?? 'a margin'}.`,
        'Confirm activation with staff or MURUS before entering.',
      ],
      rejectedDestinations: evaluatedShelters.filter((candidate) => !candidate.accepted).slice(0, 3),
    };
  }

  return buildFallbackDestination({ alert, point, homePoint, shelters: evaluatedShelters });
}

function buildFallbackDestination({ alert, point, homePoint, shelters }) {
  const homeCandidate = homePoint && !sameRoutePoint(point, homePoint)
    ? evaluateDestination({ ...homePoint, kind: 'home' }, alert, point)
    : null;

  if (homeCandidate?.accepted) {
    return {
      target: {
        ...homeCandidate.target,
        label: homePoint.label ?? 'Saved home location',
        sublabel: [
          homePoint.sublabel,
          formatDistance(homeCandidate.distanceFromAlert)
            ? `${formatDistance(homeCandidate.distanceFromAlert)} from alert centre`
            : null,
        ]
          .filter(Boolean)
          .join(' / '),
        kind: 'home',
      },
      type: 'saved-place',
      label: 'Saved place outside alert buffer',
      tone: 'caution',
      confidenceLabel: 'Saved-place fallback',
      reasons: [
        'No suitable SCDF shelter candidate is available from the current lookup.',
        `${homePoint.label ?? 'Your saved place'} appears outside the active alert buffer.`,
        'Use this only if staff directions and the alert do not conflict with the route preview.',
      ],
      rejectedDestinations: shelters.filter((candidate) => !candidate.accepted).slice(0, 3),
    };
  }

  const waypoint = generatedAwayWaypoint({ alert, point });
  return {
    target: waypoint,
    type: 'away-waypoint',
    label: 'Move-away waypoint generated',
    tone: 'caution',
    confidenceLabel: 'Generated waypoint fallback',
    reasons: [
      'No suitable shelter candidate is available from the current lookup.',
      'The destination is a generated waypoint outside the alert radius, not an official shelter.',
      'Move only if the path is not visibly blocked and staff or MURUS instructions do not conflict.',
    ],
    rejectedDestinations: [
      ...(shelters.filter((candidate) => !candidate.accepted).slice(0, 3) ?? []),
      homeCandidate && !homeCandidate.accepted ? homeCandidate : null,
    ].filter(Boolean),
  };
}

function evaluateDestination(target, alert, point) {
  const distanceFromAlert = distanceFromAlertMeters(target, alert);
  const radius = alertRadius(alert);
  const buffer = destinationBufferMeters(alert);
  const bufferMeters = distanceFromAlert == null ? Number.POSITIVE_INFINITY : distanceFromAlert - (radius + buffer);
  const insideAlert = distanceFromAlert != null && distanceFromAlert <= radius;
  const insideBuffer = distanceFromAlert != null && distanceFromAlert <= radius + buffer;
  const sameAsStart = sameRoutePoint(point, target);
  const reasons = [];

  if (sameAsStart) reasons.push('same as current location');
  if (insideAlert) reasons.push('inside alert radius');
  else if (insideBuffer) reasons.push('too close to alert boundary');

  return {
    target,
    accepted: !sameAsStart && !insideAlert && !insideBuffer,
    reasons,
    distanceFromAlert,
    bufferMeters,
    score:
      (Number.isFinite(target.distanceMeters) ? target.distanceMeters : distanceMeters(point, target)) -
      Math.max(bufferMeters, 0) * 0.15,
  };
}

function generatedAwayWaypoint({ alert, point }) {
  const radius = alertRadius(alert);
  const buffer = destinationBufferMeters(alert);
  const alertPoint = alert.lat != null && alert.lng != null
    ? { lat: Number(alert.lat), lng: Number(alert.lng) }
    : null;
  const heading = alertPoint ? bearingDegrees([alertPoint.lat, alertPoint.lng], [point.lat, point.lng]) : 0;
  const currentDistance = alertPoint ? distanceMeters(alertPoint, point) : 0;
  const moveMeters = Math.max(radius + buffer + WAYPOINT_EXTRA_METERS - currentDistance, WAYPOINT_EXTRA_METERS);
  const projected = destinationPoint(point, heading, moveMeters);
  return {
    id: 'generated-away-waypoint',
    label: `Move ${compassDirection(heading)} away from ${alert.locationLabel ?? 'the alert area'}`,
    sublabel: `${formatDistance(moveMeters)} from your current location, generated from the alert radius`,
    lat: projected.lat,
    lng: projected.lng,
    distanceMeters: moveMeters,
    kind: 'away-waypoint',
  };
}

function routeRiskIssues({ routeCrossesAlert, pointInsideAlert, targetInsideAlert, route, destination }) {
  return [
    pointInsideAlert ? 'Your current location is inside the alert radius.' : null,
    targetInsideAlert ? 'The selected destination is inside the alert radius.' : null,
    routeCrossesAlert ? 'The route preview may cross the active alert radius.' : null,
    route?.source === 'direct-preview' ? 'OneMap routing was unavailable, so this is a direct preview line.' : null,
    destination?.type === 'away-waypoint'
      ? 'No suitable shelter candidate was found; the destination is a generated move-away waypoint.'
      : null,
  ].filter(Boolean);
}

function routeSummary({ routeIssues, destination }) {
  if (routeIssues.length) return routeIssues[0];
  if (destination?.type === 'shelter') return 'SCDF shelter lookup found the nearest suitable candidate outside the alert buffer.';
  if (destination?.type === 'saved-place') return 'Saved-place fallback appears outside the alert buffer.';
  if (destination?.type === 'away-waypoint') return 'Generated waypoint moves away from the alert radius.';
  return 'No confirmed shelter route is available yet.';
}

function routeBasisCopy({ startLabel, target, destinationType }) {
  if (!target) {
    return `Based on ${startLabel}; no suitable destination is confirmed yet.`;
  }
  if (destinationType === 'shelter') {
    return `Based on ${startLabel} to ${target.label}; MURUS chose the nearest suitable SCDF shelter candidate outside the active alert buffer.`;
  }
  if (destinationType === 'saved-place') {
    return `Based on ${startLabel} to ${target.label}; no suitable shelter candidate was found, so this uses your saved place outside the alert buffer.`;
  }
  if (destinationType === 'away-waypoint') {
    return `Based on ${startLabel}; no suitable shelter candidate was found, so this generated a move-away waypoint outside the alert radius.`;
  }
  return `Based on ${startLabel} to ${target.label}; confirm the destination and route before moving.`;
}

function buildGuide({ alert, point, homePoint, transportMode, mobilityNeed, profileLabel, destination, route }) {
  const resolvedDestination = destination ?? buildFallbackDestination({ alert, point, homePoint, shelters: [] });
  const target = resolvedDestination.target;
  const routePoints = route?.routePoints ?? (target ? [[point.lat, point.lng], [target.lat, target.lng]] : []);
  const routeCrossesAlert = routeTouchesAlert(routePoints, alert);
  const pointInsideAlert = pointTouchesAlert(point, alert);
  const targetInsideAlert = target ? pointTouchesAlert(target, alert) : false;
  const highRiskZone = pointInsideAlert && severityRank(alert.severity) >= 3;
  const targetLabel = target?.label ?? 'a staffed area away from the alert';
  const distance = route?.distanceMeters ? `${Math.round(route.distanceMeters)}m` : null;
  const duration = route?.durationSeconds ? `${Math.round(route.durationSeconds / 60)} min` : null;
  const travelMeta = [distance, duration].filter(Boolean).join(' / ');
  const routeIssues = routeRiskIssues({ routeCrossesAlert, pointInsideAlert, targetInsideAlert, route, destination: resolvedDestination });
  const routeTone = routeIssues.length ? 'warning' : resolvedDestination.tone ?? 'caution';
  const startLabel = `${point.label}${point.sublabel ? ` (${point.sublabel})` : ''}`;
  const routeBasis = routeBasisCopy({
    startLabel,
    target,
    destinationType: resolvedDestination.type,
  });

  return {
    heading: target ? `Route preview to ${target.label}` : `Move away from ${alert.locationLabel ?? 'the alert area'}`,
    routeTone,
    routeLabel: routeIssues.length ? 'Check route' : resolvedDestination.label,
    riskLabel: highRiskZone
      ? 'High-risk zone: leave by the clearest staffed route'
      : pointInsideAlert
        ? 'Inside alert radius: move away carefully'
        : 'Outside alert radius: keep away from the alert',
    visualLabel: route?.routePoints?.length >= 2 ? 'Generated route schematic' : 'Blueprint-style fallback',
    target,
    destination: resolvedDestination,
    routeConfidence: {
      label: routeIssues.length ? 'Needs staff confirmation' : resolvedDestination.confidenceLabel,
      tone: routeTone,
      reasons: [...routeIssues, ...(resolvedDestination.reasons ?? [])].slice(0, ROUTE_CONFIDENCE_REASON_LIMIT),
      rejectedDestinations: resolvedDestination.rejectedDestinations ?? [],
    },
    routePoints,
    summary: routeSummary({ routeIssues, destination: resolvedDestination }),
    routeBasis,
    detail: travelMeta
      ? `${travelMeta}. Confirm with MURUS or staff before moving.`
      : 'Confirm with MURUS, staff, or emergency services before moving.',
    evacuationSteps: buildEvacuationSteps({
      alert,
      point,
      target,
      route,
      routePoints,
      routeCrossesAlert,
      pointInsideAlert,
      highRiskZone,
      transportMode,
      mobilityNeed,
      profileLabel,
      hasShelter: resolvedDestination.type === 'shelter',
    }),
    steps: buildVisualSteps({
      alert,
      targetLabel,
      transportMode,
      mobilityNeed,
      profileLabel,
      routeCrossesAlert,
      hasShelter: resolvedDestination.type === 'shelter',
    }),
  };
}

function sameRoutePoint(a, b) {
  if (!a || !b) return false;
  if (a.id && b.id && a.id === b.id) return true;
  if (![a.lat, a.lng, b.lat, b.lng].every(Number.isFinite)) return false;
  return distanceMeters(a, b) < 25;
}

function buildEvacuationSteps({
  alert,
  point,
  target,
  route,
  routePoints,
  routeCrossesAlert,
  pointInsideAlert,
  highRiskZone,
  transportMode,
  mobilityNeed,
  profileLabel,
  hasShelter,
}) {
  const location = alert.locationLabel ?? 'the affected area';
  const targetLabel = target?.label ?? 'a staffed area away from the alert';
  const accessible = needsAccessibleMovement(mobilityNeed, profileLabel, transportMode);
  const steps = [
    {
      id: 'leave-risk-zone',
      title: highRiskZone
        ? 'Leave the high-risk zone'
        : pointInsideAlert
          ? 'Move out of the alert radius'
          : 'Start from your current side',
      body: highRiskZone
        ? `${point.label} is inside the higher-risk part of this alert. Do not wait near ${location}.`
        : pointInsideAlert
          ? `${point.label} is inside the alert radius. Move away from ${location} before choosing a route.`
          : `${point.label} is not currently inside the alert radius, so keep your route away from ${location}.`,
      instruction: 'Face away from the alert area and choose street-level exits where possible.',
      distanceLabel: point.sublabel,
      tone: highRiskZone ? 'danger' : pointInsideAlert ? 'warning' : 'ready',
      visual: 'start',
      visualLabel: `Step 1 schematic: move away from ${location}`,
      viewpoint: startViewpoint({ point, alert, routePoints }),
      accessible,
    },
  ];

  steps.push(
    ...buildRouteManeuverSteps({
      alert,
      targetLabel,
      routePoints,
      routeDistanceMeters: route?.distanceMeters,
      routeCrossesAlert,
    })
  );

  if (accessible) {
    steps.push({
      id: 'accessible-route',
      title: 'Prefer accessible movement',
      body: 'Use lifts, ramps, sheltered street-level paths, and staffed crossings before stairs or crowded shortcuts.',
      instruction: 'Ask nearby staff or family for help before entering a queue, underpass, or basement link.',
      distanceLabel: labelForTransport(transportMode),
      tone: 'accessible',
      visual: 'accessible',
      visualLabel: 'Accessible movement schematic with lift-first route',
      accessible: true,
    });
  }

  steps.push({
    id: 'arrive-confirm',
    title: hasShelter ? `Reach ${targetLabel}, then confirm entry` : `Head toward ${targetLabel}`,
    body: hasShelter
      ? 'The shelter lookup gives a possible destination, but it is not an official activation notice.'
      : 'No shelter activation is confirmed in this route preview, so use the nearest staffed area away from the alert and wait for updates.',
    instruction: hasShelter
      ? 'Confirm with staff or MURUS that the shelter is activated or open for this incident.'
      : 'If you cannot move safely, check in with command as needing help.',
    distanceLabel: target?.sublabel,
    tone: hasShelter ? 'ready' : 'warning',
    visual: 'arrive',
    visualLabel: `Arrival schematic for ${targetLabel}`,
    viewpoint: arrivalViewpoint(routePoints),
    accessible,
  });

  return steps.slice(0, 6);
}

function buildRouteManeuverSteps({ alert, targetLabel, routePoints, routeDistanceMeters, routeCrossesAlert }) {
  const points = routePoints.filter(isValidMapPoint);
  if (points.length < 2) {
    return [
      {
        id: 'building-blueprint',
        title: 'Use the exit blueprint fallback',
        body: 'A street route is not available yet. Treat the map as a building-to-street schematic.',
        instruction: 'Move to the nearest staffed street-level exit, then continue away from the affected area.',
        tone: 'warning',
        visual: 'blueprint',
        visualLabel: 'Blueprint-style fallback route to the nearest street-level exit',
      },
    ];
  }

  const maneuvers = findManeuverPoints(points).slice(0, 3);
  if (maneuvers.length === 0) {
    const bearing = bearingDegrees(points[0], points[points.length - 1]);
    const direction = compassDirection(bearing);
    return [
      {
        id: 'route-direct',
        title: `Head ${direction} toward ${targetLabel}`,
        body: routeCrossesAlert
          ? `The route preview may cross ${alert.locationLabel ?? 'the alert area'}, so stop if staff directions conflict.`
          : `Follow the preview line toward ${targetLabel} while staying on street-level paths.`,
        instruction: routeCrossesAlert
          ? 'Do not treat this as cleared; wait for staff or MURUS confirmation before crossing the alert radius.'
          : `Continue ${direction} until the next route waypoint or staffed entrance.`,
        distanceLabel: formatDistance(routeDistanceMeters ?? routeLengthMeters(points)),
        tone: routeCrossesAlert ? 'warning' : 'ready',
        visual: 'continue',
        visualLabel: `Route schematic: continue ${direction} toward ${targetLabel}`,
        viewpoint: viewpointFromPair(points[0], bearing),
      },
    ];
  }

  return maneuvers.map((maneuver, index) => {
    const turn = turnLabel(maneuver.delta);
    const direction = compassDirection(maneuver.nextBearing);
    const distanceLabel = formatDistance(maneuver.distanceFromStart) ?? 'near the next route bend';
    return {
      id: `route-maneuver-${index + 1}`,
      title: `${turn} toward ${direction}`,
      body: `At ${distanceLabel} from your start point, adjust direction and keep heading toward ${targetLabel}.`,
      instruction: routeCrossesAlert
        ? 'Pause before this move if it points back toward the alert radius.'
        : `Take the ${turn.toLowerCase()} and continue ${direction}.`,
      distanceLabel: `Route segment ${index + 1}`,
      tone: routeCrossesAlert ? 'warning' : 'ready',
      visual: visualForTurn(maneuver.delta),
      visualLabel: `Route schematic: ${turn.toLowerCase()} toward ${direction}`,
      viewpoint: viewpointFromPair(points[maneuver.index], maneuver.nextBearing),
    };
  });
}

function buildVisualSteps({ alert, targetLabel, transportMode, mobilityNeed, profileLabel, routeCrossesAlert, hasShelter }) {
  const location = alert.locationLabel ?? 'the affected area';
  const action = alert.publicAction ?? 'Follow official MURUS instructions.';
  const mobility = mobilityNeed !== 'none' || profileLabel === 'Elderly' || profileLabel === 'Mobility support';

  return [
    {
      icon: '1',
      title: 'Leave the hazard edge',
      body: `Move away from ${location}; ${action}`,
    },
    {
      icon: '2',
      title: routeCrossesAlert ? 'Do not trust the preview blindly' : 'Use the shown direction',
      body: routeCrossesAlert
        ? 'The route preview may pass through the alert radius. Wait for staff or MURUS confirmation before moving.'
        : `Head toward ${targetLabel} only if staff directions and the alert do not conflict with the route preview.`,
    },
    {
      icon: '3',
      title: mobility ? 'Choose accessible movement' : `Travel mode: ${labelForTransport(transportMode)}`,
      body: mobility
        ? 'Use lifts, street-level sheltered paths, and ask staff or family for assistance before entering crowds.'
        : 'Stay on street-level routes and avoid basement links, underpasses, or blocked corridors.',
    },
    {
      icon: '4',
      title: hasShelter ? 'Confirm shelter before entering' : 'Check in if stuck',
      body: hasShelter
        ? 'A nearest shelter lookup is not an official activation notice. Confirm it is activated or open for this incident.'
        : 'If you cannot move safely, use the check-in buttons so command sees that you need help.',
    },
  ];
}

function startViewpoint({ point, alert, routePoints }) {
  if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng)) return undefined;
  const points = routePoints.filter(isValidMapPoint);
  if (points.length >= 2) {
    return viewpointFromPair(points[0], bearingDegrees(points[0], points[1]));
  }
  if (alert.lat != null && alert.lng != null) {
    const awayFromAlert = bearingDegrees([Number(alert.lat), Number(alert.lng)], [point.lat, point.lng]);
    return viewpointFromPair([point.lat, point.lng], awayFromAlert);
  }
  return viewpointFromPair([point.lat, point.lng], 0);
}

function arrivalViewpoint(routePoints) {
  const points = routePoints.filter(isValidMapPoint);
  if (points.length < 2) return undefined;
  const lastIndex = points.length - 1;
  return viewpointFromPair(points[lastIndex], bearingDegrees(points[lastIndex - 1], points[lastIndex]));
}

function viewpointFromPair(pair, heading) {
  if (!isValidMapPoint(pair)) return undefined;
  return {
    lat: Number(pair[0]),
    lng: Number(pair[1]),
    heading: Math.round((((heading % 360) + 360) % 360)),
    pitch: 0,
    fov: 80,
    radius: 50,
  };
}

function routeTouchesAlert(routePoints, alert) {
  if (alert.lat == null || alert.lng == null || !routePoints.length) return false;
  const alertPoint = { lat: Number(alert.lat), lng: Number(alert.lng) };
  const radius = alertRadius(alert);
  return routePoints.some(([lat, lng]) => distanceMeters({ lat, lng }, alertPoint) <= radius);
}

function pointTouchesAlert(point, alert) {
  if (alert.lat == null || alert.lng == null || point.lat == null || point.lng == null) return false;
  const alertPoint = { lat: Number(alert.lat), lng: Number(alert.lng) };
  return distanceMeters(point, alertPoint) <= alertRadius(alert);
}

function distanceFromAlertMeters(point, alert) {
  if (alert.lat == null || alert.lng == null || point.lat == null || point.lng == null) return null;
  return distanceMeters(point, { lat: Number(alert.lat), lng: Number(alert.lng) });
}

function alertRadius(alert) {
  const radius = Number(alert.radiusMeters);
  return Number.isFinite(radius) ? radius : 500;
}

function destinationBufferMeters(alert) {
  return Math.min(650, Math.max(180, alertRadius(alert) * 0.25));
}

function destinationPoint(start, bearing, distance) {
  const radius = 6371000;
  const angularDistance = distance / radius;
  const bearingRad = (bearing * Math.PI) / 180;
  const lat1 = (start.lat * Math.PI) / 180;
  const lng1 = (start.lng * Math.PI) / 180;
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angularDistance) +
      Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearingRad)
  );
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(bearingRad) * Math.sin(angularDistance) * Math.cos(lat1),
      Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2)
    );

  return {
    lat: (lat2 * 180) / Math.PI,
    lng: ((((lng2 * 180) / Math.PI + 540) % 360) - 180),
  };
}

function parseRouteGeometry(geometry) {
  if (!geometry || typeof geometry !== 'string') return [];
  const trimmed = geometry.trim();
  if (!trimmed) return [];

  const jsonPoints = parseJsonGeometry(trimmed);
  if (jsonPoints.length >= 2) return jsonPoints;

  const textPoints = parseTextCoordinatePairs(trimmed);
  if (textPoints.length >= 2) return textPoints;

  return decodePolyline(trimmed);
}

function parseJsonGeometry(value) {
  try {
    const parsed = JSON.parse(value);
    const coordinates = parsed?.type === 'LineString' ? parsed.coordinates : parsed?.coordinates ?? parsed;
    if (!Array.isArray(coordinates)) return [];
    return coordinates.flatMap((coordinate) => normalizeCoordinatePair(coordinate));
  } catch {
    return [];
  }
}

function parseTextCoordinatePairs(value) {
  return value
    .split(/[;|]/)
    .map((part) => part.trim().split(/,\s*/).map(Number))
    .flatMap((pair) => normalizeCoordinatePair(pair));
}

function normalizeCoordinatePair(pair) {
  if (!Array.isArray(pair) || pair.length < 2) return [];
  const first = Number(pair[0]);
  const second = Number(pair[1]);
  if (!Number.isFinite(first) || !Number.isFinite(second)) return [];
  if (first > 90 && second <= 90) return [[second, first]];
  return [[first, second]];
}

function decodePolyline(value) {
  const points = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < value.length) {
    const latitude = decodePolylineNumber(value, index);
    if (!latitude) break;
    index = latitude.index;
    const longitude = decodePolylineNumber(value, index);
    if (!longitude) break;
    index = longitude.index;
    lat += latitude.value;
    lng += longitude.value;
    points.push([lat / 100000, lng / 100000]);
  }

  return points;
}

function decodePolylineNumber(value, startIndex) {
  let result = 0;
  let shift = 0;
  let index = startIndex;
  let byte;

  do {
    if (index >= value.length) return null;
    byte = value.charCodeAt(index) - 63;
    index += 1;
    result |= (byte & 0x1f) << shift;
    shift += 5;
  } while (byte >= 0x20);

  return {
    value: result & 1 ? ~(result >> 1) : result >> 1,
    index,
  };
}

function isValidMapPoint(point) {
  return (
    Array.isArray(point) &&
    point.length === 2 &&
    Number.isFinite(point[0]) &&
    Number.isFinite(point[1])
  );
}

function findManeuverPoints(points) {
  const maneuvers = [];
  let distanceFromStart = 0;

  for (let index = 1; index < points.length - 1; index += 1) {
    distanceFromStart += distanceMeters(pairToPoint(points[index - 1]), pairToPoint(points[index]));
    const previousBearing = bearingDegrees(points[index - 1], points[index]);
    const nextBearing = bearingDegrees(points[index], points[index + 1]);
    const delta = angleDelta(previousBearing, nextBearing);
    if (Math.abs(delta) < 28) continue;
    maneuvers.push({
      index,
      delta,
      nextBearing,
      distanceFromStart,
    });
  }

  return maneuvers;
}

function routeLengthMeters(points) {
  return points.reduce((total, point, index) => {
    if (index === 0) return 0;
    return total + distanceMeters(pairToPoint(points[index - 1]), pairToPoint(point));
  }, 0);
}

function bearingDegrees(fromPair, toPair) {
  const from = pairToPoint(fromPair);
  const to = pairToPoint(toPair);
  const lat1 = (from.lat * Math.PI) / 180;
  const lat2 = (to.lat * Math.PI) / 180;
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (((Math.atan2(y, x) * 180) / Math.PI) + 360) % 360;
}

function angleDelta(fromBearing, toBearing) {
  return ((toBearing - fromBearing + 540) % 360) - 180;
}

function pairToPoint(pair) {
  return { lat: Number(pair[0]), lng: Number(pair[1]) };
}

function compassDirection(bearing) {
  const directions = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];
  return directions[Math.round((((bearing % 360) + 360) % 360) / 45) % directions.length];
}

function turnLabel(delta) {
  if (delta > 115) return 'Make a sharp right';
  if (delta > 28) return 'Turn right';
  if (delta < -115) return 'Make a sharp left';
  if (delta < -28) return 'Turn left';
  return 'Continue straight';
}

function visualForTurn(delta) {
  if (delta > 28) return 'right';
  if (delta < -28) return 'left';
  return 'continue';
}

function formatDistance(distance) {
  if (!Number.isFinite(distance) || distance <= 0) return undefined;
  if (distance < 1000) return `About ${Math.round(distance)}m`;
  return `About ${(distance / 1000).toFixed(1)}km`;
}

function needsAccessibleMovement(mobilityNeed, profileLabel, transportMode) {
  return (
    mobilityNeed !== 'none' ||
    transportMode === 'caregiver' ||
    profileLabel === 'Elderly' ||
    profileLabel === 'Mobility support'
  );
}

function severityRank(severity) {
  const ranks = {
    info: 0,
    low: 1,
    advisory: 2,
    medium: 2,
    warning: 3,
    high: 3,
    danger: 4,
    critical: 4,
  };
  return ranks[severity] ?? 0;
}

function schematicPathFor(visual) {
  if (visual === 'left') return 'M132 92 H82 C68 92 62 84 62 72 V36';
  if (visual === 'right') return 'M28 92 H82 C96 92 102 84 102 72 V36';
  if (visual === 'arrive') return 'M26 92 C58 82 86 62 122 46';
  if (visual === 'accessible') return 'M30 92 H46 V66 H78 V46 H122';
  if (visual === 'blueprint') return 'M38 92 V70 H72 V48 H126';
  if (visual === 'start') return 'M42 82 C62 66 84 52 126 34';
  return 'M28 92 H132';
}

function arrowFor() {
  return 'M 0 0 L 6 3 L 0 6 z';
}

function routeModeForTransport(mode) {
  if (mode === 'driving') return 'drive';
  if (mode === 'mrt') return 'pt';
  return 'walk';
}

function labelForTransport(mode) {
  if (mode === 'driving') return 'driving';
  if (mode === 'mrt') return 'MRT / bus';
  if (mode === 'caregiver') return 'with dependants';
  return 'walking';
}
