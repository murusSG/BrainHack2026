import { useDeferredValue, useMemo, useRef, useState } from 'react';
import { CrisisMap } from '../components/CrisisMap';
import { LoadingSkeleton, MapLoadingSkeleton } from '../components/LoadingSkeleton';
import { MapErrorBoundary } from '../components/MapErrorBoundary';
import { useEvents } from '../hooks/useEvents';
import { usePageAwarePolling } from '../hooks/usePageAwarePolling';
import { api } from '../services/api';
import { normaliseIncidentClusters } from '../services/incidentClusterAdapter';

const HAZARD_LABEL = {
  flood: 'Flood',
  haze: 'Haze',
  dengue: 'Dengue',
  fire: 'Fire',
  medical: 'Medical',
  traffic: 'Traffic',
  mrt: 'MRT',
  weather: 'Weather',
  lightning: 'Lightning',
  incident: 'Incident',
};

export function IncidentMapPage() {
  const { events, status, error } = useEvents({ includeDemo: false });
  const [clusterEvents, setClusterEvents] = useState([]);
  const [clusterStatus, setClusterStatus] = useState('loading');
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState('');
  const [hazardFilter, setHazardFilter] = useState('all');
  const [clusterError, setClusterError] = useState('');
  const clusterEventsRef = useRef([]);
  const clusterRefreshPromiseRef = useRef(null);
  const deferredQuery = useDeferredValue(query);
  const isLoading = status === 'loading' || clusterStatus === 'loading';
  const mapEvents = useMemo(() => {
    const byId = new Map(events.map((event) => [event.id, event]));
    clusterEvents.forEach((event) => byId.set(event.id, event));
    return Array.from(byId.values());
  }, [events, clusterEvents]);
  const filteredEvents = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();
    return mapEvents.filter((event) => {
      const matchesHazard = hazardFilter === 'all' || event.hazardType === hazardFilter;
      const searchable = [
        event.title,
        event.location,
        event.source,
        event.hazardType,
        event.severity,
      ]
        .join(' ')
        .toLowerCase();

      return matchesHazard && (!normalizedQuery || searchable.includes(normalizedQuery));
    });
  }, [deferredQuery, hazardFilter, mapEvents]);
  const activeHazardCount =
    hazardFilter === 'all'
      ? new Set(mapEvents.map((event) => event.hazardType).filter(Boolean)).size
      : filteredEvents.length;
  const liveEventCount = mapEvents.length;
  const feedLabel =
    isLoading
      ? 'Syncing'
      : status === 'error' || clusterStatus === 'error'
        ? 'Feed issue'
        : `${liveEventCount} live`;

  async function refreshIncidentClusters() {
    if (clusterRefreshPromiseRef.current) return clusterRefreshPromiseRef.current;

    const refreshPromise = (async () => {
      try {
        const clusters = await api.incidentClusters();
        const nextEvents = await normaliseIncidentClusters(
          clusters ?? [],
          api,
          clusterEventsRef.current
        );
        clusterEventsRef.current = nextEvents;
        setClusterEvents(nextEvents);
        setClusterStatus('done');
        setClusterError('');
      } catch (error) {
        setClusterStatus('error');
        setClusterError(error instanceof Error ? error.message : 'Cluster feed unavailable.');
      } finally {
        clusterRefreshPromiseRef.current = null;
      }
    })();

    clusterRefreshPromiseRef.current = refreshPromise;
    return refreshPromise;
  }

  usePageAwarePolling(refreshIncidentClusters, 5000);

  return (
    <div className="incident-map-page">
      <section className="incident-map-layout">
        <div className="incident-map-main">
          <section className="panel map-panel">
            <div className="incident-map-shell">
              <div className="map-floating-toolbar">
                <label className="map-toolbar-search">
                  <span className="searchbar-icon" aria-hidden="true">+</span>
                  <input
                    type="text"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search coordinates, zone names, or incidents"
                    aria-label="Search map incidents"
                  />
                </label>
                <button
                  type="button"
                  className="map-filter-button"
                  onClick={() => setHazardFilter((current) => nextHazardFilter(current, mapEvents))}
                >
                  {hazardFilter === 'all'
                    ? `${activeHazardCount} hazard filters`
                    : HAZARD_LABEL[hazardFilter] ?? hazardFilter}
                </button>
              </div>
              {isLoading ? (
                <MapLoadingSkeleton />
              ) : (
                <MapErrorBoundary resetKey={filteredEvents.length}>
                  <CrisisMap events={filteredEvents} onSelect={setSelected} selectedId={selected?.id} />
                </MapErrorBoundary>
              )}
            </div>
          </section>

          {(status === 'error' || clusterStatus === 'error') && (
            <p className="feed-warning">
              Live feed unavailable
              {error ? ` (${error})` : clusterError ? ` (${clusterError})` : ''}.
            </p>
          )}
        </div>

        <aside className="incident-map-sidebar">
          <section className="panel incident-list-panel">
            <div className="section-heading incident-list-heading">
              <div>
                <p className="eyebrow">Active incidents</p>
                <h2>{isLoading ? 'Syncing map events' : `${filteredEvents.length} unified events`}</h2>
              </div>
              <span className="pill">{feedLabel}</span>
            </div>

            {isLoading ? (
              <LoadingSkeleton rows={5} compact />
            ) : filteredEvents.length === 0 ? (
              <div className="incident-empty-state">
                <p>No active incidents are available from the current feeds.</p>
              </div>
            ) : (
              <div className="incident-list">
                {filteredEvents.map((incident) => (
                  <article
                    key={incident.id}
                    className={`incident-list-card${selected?.id === incident.id ? ' incident-list-card--active' : ''}`}
                    onClick={() => setSelected(incident)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setSelected(incident);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="incident-list-top">
                      <p className="incident-code">{incident.source}</p>
                      {incident.isDemo && <span className="demo-chip">Demo</span>}
                      <span className={`severity-chip chip-${severityTone(incident.severity)}`}>
                        {incident.severity}
                      </span>
                    </div>
                    <h3>{incident.title}</h3>
                    <p className="incident-location">{incident.location}</p>
                    <p className="incident-meta-inline">
                      {HAZARD_LABEL[incident.hazardType] ?? 'Hazard'}
                      {incident.vicinityRadiusMeters
                        ? ` | ${incident.vicinityRadiusMeters}m radius`
                        : ''}
                      {incident.dispatchLog ? ` | ${incident.dispatchLog}` : ''}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </section>
        </aside>
      </section>
    </div>
  );
}

function nextHazardFilter(current, events) {
  const hazards = ['all', ...Array.from(new Set(events.map((event) => event.hazardType).filter(Boolean)))];
  const nextIndex = (hazards.indexOf(current) + 1) % hazards.length;
  return hazards[nextIndex] ?? 'all';
}

function severityTone(severity) {
  if (severity === 'critical') return 'critical';
  if (severity === 'high' || severity === 'medium') return 'high';
  return 'support';
}
