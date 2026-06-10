import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CrisisMap } from '../components/CrisisMap';
import { AppLogo } from '../components/AppLogo';
import { LoadingSkeleton, MapLoadingSkeleton } from '../components/LoadingSkeleton';
import { MapLegend } from '../components/MapLegend';
import { MapErrorBoundary } from '../components/MapErrorBoundary';
import { ScreenHeader, ScreenPage, ScreenPanel } from '../components/ui';
import { usePageAwarePolling } from '../hooks/usePageAwarePolling';
import { api } from '../services/api';
import {
  agenciesForCluster,
  incidentTitle,
  normaliseIncidentClusters,
} from '../services/incidentClusterAdapter';

const MANUAL_AGENCIES = ['SPF', 'SCDF', 'MOH', 'PUB', 'LTA'];

function sameIncidentQueue(current, next) {
  return current.length === next.length && JSON.stringify(current) === JSON.stringify(next);
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
        const queueItems = nextQueue ?? [];
        setQueue((current) => (sameIncidentQueue(current, queueItems) ? current : queueItems));
        setMapEvents(events);
        setSelectedId((current) => {
          if (queueItems.some((incident) => incident.incident_id === current)) return current;
          return queueItems[0]?.incident_id ?? null;
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

  usePageAwarePolling(refresh, 5000);

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
  const selectMapEvent = useCallback((event) => {
    if (event.raw?.status === 'pending_approval') {
      setSelectedId(event.raw.incident_id);
    }
  }, []);

  return (
    <ScreenPage className="dispatcher-page">
      <ScreenHeader
        className="dispatcher-header"
        visual="flyer"
        visualVariant="panel"
      >
        <div>
          <AppLogo variant="header" />
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
      </ScreenHeader>

      {notice && <p className="allocation-command-note">{notice}</p>}

      {status === 'error' && (
        <p className="responder-feed-warning">
          Dispatcher incident feed unavailable. {feedError || 'Check the Node API connection.'}
        </p>
      )}

      <section className="dispatcher-grid">
        <ScreenPanel
          className="panel dispatcher-detail-panel"
          visual="none"
          visualIntensity="none"
        >
          <div className="responder-section-heading">
            <div>
              <p className="eyebrow">Selected incident</p>
              <h2>{selectedIncident ? incidentTitle(selectedIncident) : 'No incident selected'}</h2>
            </div>
            {queue.length > 0 && (
              <label className="dispatcher-incident-picker">
                <span>Incident awaiting approval</span>
                <select
                  aria-label="Incident awaiting approval"
                  value={selectedIncident?.incident_id ?? ''}
                  onChange={(event) => setSelectedId(event.target.value)}
                >
                  {queue.map((incident) => (
                    <option key={incident.incident_id} value={incident.incident_id}>
                      {incidentTitle(incident)}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          {status === 'loading' ? (
            <LoadingSkeleton rows={5} compact />
          ) : !selectedIncident ? (
            <div className="responder-empty-state">
              <p>No incidents awaiting dispatch approval.</p>
            </div>
          ) : (
            <>
              <dl className="dispatcher-facts">
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
        </ScreenPanel>
      </section>

      <ScreenPanel className="panel dispatcher-map-panel">
        <div className="responder-section-heading">
          <div>
            <p className="eyebrow">Incident map</p>
            <h2>Red pending | Green dispatched</h2>
          </div>
          <span className="pill">{mapEvents.length} operational incidents</span>
        </div>
        <MapLegend
          compact
          items={[
            { label: 'Pending approval', tone: 'critical' },
            { label: 'Dispatched', tone: 'support' },
            { label: 'Selected vicinity', tone: 'radius' },
          ]}
        />
        <div className="responder-map-shell">
          {status === 'loading' ? (
            <MapLoadingSkeleton />
          ) : (
            <MapErrorBoundary resetKey={mapEvents.length}>
              <CrisisMap
                events={mapEvents}
                selectedId={selectedMapEvent?.id}
                onSelect={selectMapEvent}
              />
            </MapErrorBoundary>
          )}
        </div>
      </ScreenPanel>
    </ScreenPage>
  );
}
