import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CrisisMap } from '../components/CrisisMap';
import { LoadingSkeleton, MapLoadingSkeleton } from '../components/LoadingSkeleton';
import { MapErrorBoundary } from '../components/MapErrorBoundary';
import { api } from '../services/api';
import {
  agenciesForCluster,
  incidentTitle,
  normaliseIncidentClusters,
} from '../services/incidentClusterAdapter';

const MANUAL_AGENCIES = ['SPF', 'SCDF', 'MOH', 'PUB', 'LTA'];

function formatReportedAt(value) {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return 'Time unavailable';
  return new Intl.DateTimeFormat('en-SG', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Singapore',
  }).format(timestamp);
}

function severityTone(value = '') {
  const severity = value.toLowerCase();
  if (severity === 'critical') return 'critical';
  if (severity === 'high') return 'high';
  if (severity === 'moderate' || severity === 'medium') return 'medium';
  return 'support';
}

export function DispatcherPage({ session }) {
  const location = useLocation();
  const [queue, setQueue] = useState([]);
  const [mapEvents, setMapEvents] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedAgencies, setSelectedAgencies] = useState([]);
  const [dispatcherNote, setDispatcherNote] = useState('');
  const [status, setStatus] = useState('loading');
  const [decisionStatus, setDecisionStatus] = useState('idle');
  const [notice, setNotice] = useState(location.state?.quickActionNotice ?? '');
  const [feedError, setFeedError] = useState('');
  const mapEventsRef = useRef([]);
  const refreshPromiseRef = useRef(null);

  const selectedIncident = queue.find((incident) => incident.incident_id === selectedId) ?? queue[0];
  const recommendedAgencies = useMemo(
    () => agenciesForCluster(selectedIncident),
    [selectedIncident]
  );
  const agencyOptions =
    recommendedAgencies.length > 0
      ? recommendedAgencies
      : MANUAL_AGENCIES.map((agency) => ({
          agency,
          reason: 'Available for manual dispatcher assignment.',
        }));

  async function refresh({ afterCurrent = false } = {}) {
    if (refreshPromiseRef.current) {
      await refreshPromiseRef.current;
      return afterCurrent ? refresh() : undefined;
    }

    const refreshPromise = (async () => {
      try {
        const [nextQueue, clusters] = await Promise.all([
          api.incidentPriorityQueue(),
          api.incidentClusters(),
        ]);
        const operationalClusters = (clusters ?? []).filter(
          (cluster) => cluster.status === 'pending_approval' || cluster.status === 'dispatched'
        );
        const events = await normaliseIncidentClusters(
          operationalClusters,
          api,
          mapEventsRef.current
        );
        mapEventsRef.current = events;
        setQueue(nextQueue ?? []);
        setMapEvents(events);
        setSelectedId((current) => {
          if ((nextQueue ?? []).some((incident) => incident.incident_id === current)) return current;
          return nextQueue?.[0]?.incident_id ?? null;
        });
        setStatus('done');
        setFeedError('');
      } catch (error) {
        setStatus('error');
        setFeedError(error instanceof Error ? error.message : 'Incident feed unavailable.');
      } finally {
        refreshPromiseRef.current = null;
      }
    })();

    refreshPromiseRef.current = refreshPromise;
    return refreshPromise;
  }

  useEffect(() => {
    refresh();
    const intervalId = window.setInterval(refresh, 5000);
    window.addEventListener('focus', refresh);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  useEffect(() => {
    setSelectedAgencies(recommendedAgencies.map((agency) => agency.agency));
    setDispatcherNote('');
    setNotice('');
  }, [selectedIncident?.incident_id]);

  function toggleAgency(agency) {
    setSelectedAgencies((current) =>
      current.includes(agency)
        ? current.filter((item) => item !== agency)
        : [...current, agency]
    );
  }

  async function submitDecision(decision) {
    if (!selectedIncident) return;
    setDecisionStatus('saving');
    setNotice('');
    try {
      const result = await api.decideResourceAllocation({
        incident_id: selectedIncident.incident_id,
        dispatcher_id: session?.identity ?? 'DISPATCHER-DEMO',
        decision,
        approved_agencies: decision === 'approved' ? selectedAgencies : [],
        dispatcher_note: dispatcherNote || undefined,
      });
      setNotice(result.message);
      await refresh({ afterCurrent: true });
      setDecisionStatus('idle');
    } catch (error) {
      setDecisionStatus('error');
      setNotice(
        error instanceof Error
          ? error.message
          : 'Decision could not be saved. Check the Node API connection and try again.'
      );
    }
  }

  const selectedMapEvent = mapEvents.find(
    (event) => event.raw?.incident_id === selectedIncident?.incident_id
  );

  return (
    <div className="dispatcher-page">
      <header className="dispatcher-header">
        <div>
          <p className="eyebrow">Human-approved response coordination</p>
          <h1>Ops Dispatcher View</h1>
          <p>
            Review backend-ranked incidents, validate recommended agencies, and record the dispatch
            decision.
          </p>
        </div>
        <Link to="/responder" className="responder-command-link">
          Responder View
        </Link>
      </header>

      {notice && <p className="allocation-command-note">{notice}</p>}

      {status === 'error' && (
        <p className="responder-feed-warning">
          Dispatcher incident feed unavailable. {feedError || 'Check the Node API connection.'}
        </p>
      )}

      <section className="dispatcher-grid">
        <aside className="panel dispatcher-queue-panel">
          <div className="responder-section-heading">
            <div>
              <p className="eyebrow">Priority Queue</p>
              <h2>Awaiting dispatch approval</h2>
            </div>
            <span className="pill">{queue.length} pending</span>
          </div>

          {status === 'loading' ? (
            <LoadingSkeleton rows={4} compact />
          ) : queue.length === 0 ? (
            <div className="responder-empty-state">
              <p>No incidents awaiting dispatch approval.</p>
            </div>
          ) : (
            <div className="dispatcher-queue-list">
              {queue.map((incident) => {
                const agencies = agenciesForCluster(incident);
                const isActive = incident.incident_id === selectedIncident?.incident_id;
                return (
                  <button
                    type="button"
                    key={incident.incident_id}
                    className={`dispatcher-queue-item${isActive ? ' is-active' : ''}`}
                    onClick={() => setSelectedId(incident.incident_id)}
                  >
                    <span className="responder-rank">{incident.queue_position}</span>
                    <span className="responder-incident-copy">
                      <span className="dispatcher-queue-topline">
                        <strong>{incidentTitle(incident)}</strong>
                        <span className={`severity-chip chip-${severityTone(incident.extracted_incident?.severity)}`}>
                          {incident.priority_score}
                        </span>
                      </span>
                      <span className="responder-incident-meta">
                        {formatReportedAt(incident.created_at)} | {incident.reports?.length ?? 0}{' '}
                        grouped report{incident.reports?.length === 1 ? '' : 's'}
                      </span>
                      <span className="responder-incident-meta">
                        {agencies.map((agency) => agency.agency).join(', ') || 'Manual agency review'}
                        {' | '}Pending Approval
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </aside>

        <section className="panel dispatcher-detail-panel">
          <div className="responder-section-heading">
            <div>
              <p className="eyebrow">Selected incident</p>
              <h2>{selectedIncident ? incidentTitle(selectedIncident) : 'No incident selected'}</h2>
            </div>
            {selectedIncident && (
              <span className={`severity-chip chip-${severityTone(selectedIncident.extracted_incident?.severity)}`}>
                {selectedIncident.extracted_incident?.severity ?? 'Unknown'}
              </span>
            )}
          </div>

          {!selectedIncident ? (
            <div className="responder-empty-state">
              <p>Select an incident when the Priority Queue receives a report.</p>
            </div>
          ) : (
            <>
              <dl className="dispatcher-facts">
                <div>
                  <dt>Priority</dt>
                  <dd>{selectedIncident.priority_score}/100</dd>
                </div>
                <div>
                  <dt>Location</dt>
                  <dd>{selectedIncident.extracted_incident?.location_text || 'Location pending'}</dd>
                </div>
                <div>
                  <dt>Reason</dt>
                  <dd>{selectedIncident.priority_reason}</dd>
                </div>
                <div>
                  <dt>Reports</dt>
                  <dd>{selectedIncident.reports?.length ?? 0} grouped</dd>
                </div>
              </dl>

              <div className="dispatcher-description">
                <h3>Incident assessment</h3>
                <p>{selectedIncident.extracted_incident?.description}</p>
                {(selectedIncident.extracted_incident?.hazards ?? []).length > 0 && (
                  <p>
                    <strong>Hazards:</strong>{' '}
                    {selectedIncident.extracted_incident.hazards.join(', ')}
                  </p>
                )}
              </div>

              <div className="dispatcher-recommendations">
                <h3>Recommended agencies and resources</h3>
                {recommendedAgencies.length === 0 && (
                  <p>AI allocation unavailable. Select the required agencies manually.</p>
                )}
                {agencyOptions.map((agency) => (
                    <label key={agency.agency} className="dispatcher-agency-option">
                      <input
                        type="checkbox"
                        checked={selectedAgencies.includes(agency.agency)}
                        onChange={() => toggleAgency(agency.agency)}
                      />
                      <span>
                        <strong>{agency.agency}</strong>
                        <small>{agency.reason}</small>
                      </span>
                    </label>
                  ))}
              </div>

              <label className="allocation-message">
                <span>Dispatcher note</span>
                <textarea
                  rows="3"
                  value={dispatcherNote}
                  onChange={(event) => setDispatcherNote(event.target.value)}
                  placeholder="Add operational context for responding agencies"
                />
              </label>

              <div className="dispatcher-decision-actions">
                <button
                  type="button"
                  className="primary-button compact-button"
                  disabled={decisionStatus === 'saving' || selectedAgencies.length === 0}
                  onClick={() => submitDecision('approved')}
                >
                  Approve Dispatch
                </button>
                <button
                  type="button"
                  className="ghost-button compact-button"
                  disabled={decisionStatus === 'saving'}
                  onClick={() => submitDecision('declined')}
                >
                  Decline / Reject
                </button>
              </div>
            </>
          )}
        </section>
      </section>

      <section className="panel dispatcher-map-panel">
        <div className="responder-section-heading">
          <div>
            <p className="eyebrow">Incident map</p>
            <h2>Red pending | Green dispatched</h2>
          </div>
          <span className="pill">{mapEvents.length} operational incidents</span>
        </div>
        <div className="responder-map-shell">
          {status === 'loading' ? (
            <MapLoadingSkeleton />
          ) : (
            <MapErrorBoundary resetKey={mapEvents.length}>
              <CrisisMap
                events={mapEvents}
                selectedId={selectedMapEvent?.id}
                onSelect={(event) => {
                  if (event.raw?.status === 'pending_approval') {
                    setSelectedId(event.raw.incident_id);
                  }
                }}
              />
            </MapErrorBoundary>
          )}
        </div>
      </section>
    </div>
  );
}
