import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { api } from '../services/api';
import { incidentTitle } from '../services/incidentClusterAdapter';

const LOG_CATEGORY_OPTIONS = [
  { value: 'general', label: 'General' },
  { value: 'hazard', label: 'Hazard' },
  { value: 'medical', label: 'Medical' },
  { value: 'evacuation', label: 'Evacuation' },
  { value: 'security', label: 'Security' },
  { value: 'resource_update', label: 'Resource update' },
];

function formatTimestamp(value) {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return 'Time unavailable';
  return new Intl.DateTimeFormat('en-SG', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Singapore',
  }).format(timestamp);
}

function categoryLabel(value) {
  return LOG_CATEGORY_OPTIONS.find((option) => option.value === value)?.label ?? 'General';
}

export function ResponderPage() {
  const [incidents, setIncidents] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [logs, setLogs] = useState([]);
  const [incidentStatus, setIncidentStatus] = useState('loading');
  const [logStatus, setLogStatus] = useState('idle');
  const [saveStatus, setSaveStatus] = useState('idle');
  const [incidentError, setIncidentError] = useState('');
  const [logError, setLogError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [form, setForm] = useState({
    agency: '',
    author: '',
    category: 'general',
    message: '',
  });
  const incidentRequestIdRef = useRef(0);
  const logRequestIdRef = useRef(0);
  const logsRef = useRef([]);

  const selectedIncident =
    incidents.find((incident) => incident.incident_id === selectedId) ?? incidents[0] ?? null;

  const refreshIncidents = useCallback(async () => {
    const requestId = incidentRequestIdRef.current + 1;
    incidentRequestIdRef.current = requestId;

    try {
      const next = await api.responderIncidents();
      if (incidentRequestIdRef.current !== requestId) return;
      setIncidents(next ?? []);
      setSelectedId((current) => {
        if ((next ?? []).some((incident) => incident.incident_id === current)) return current;
        return next?.[0]?.incident_id ?? null;
      });
      setIncidentStatus('done');
      setIncidentError('');
    } catch (error) {
      setIncidentStatus('error');
      setIncidentError(error instanceof Error ? error.message : 'Responder incident feed unavailable.');
    }
  }, []);

  const refreshLogs = useCallback(async (incidentId) => {
    if (!incidentId) {
      logRequestIdRef.current += 1;
      setLogs([]);
      logsRef.current = [];
      setLogStatus('idle');
      return;
    }

    const requestId = logRequestIdRef.current + 1;
    logRequestIdRef.current = requestId;
    setLogStatus(logsRef.current.length === 0 ? 'loading' : 'refreshing');

    try {
      const next = await api.responderLogs(incidentId);
      if (logRequestIdRef.current !== requestId) return;
      setLogs(next ?? []);
      logsRef.current = next ?? [];
      setLogStatus('idle');
      setLogError('');
    } catch (error) {
      if (logRequestIdRef.current !== requestId) return;
      setLogStatus('error');
      setLogError(error instanceof Error ? error.message : 'Shared log feed unavailable.');
    }
  }, []);

  useEffect(() => {
    logsRef.current = logs;
  }, [logs]);

  useEffect(() => {
    refreshIncidents();
    const id = window.setInterval(refreshIncidents, 5000);
    return () => window.clearInterval(id);
  }, [refreshIncidents]);

  useEffect(() => {
    const incidentId = selectedIncident?.incident_id;
    refreshLogs(incidentId);
    if (!incidentId) return undefined;
    const id = window.setInterval(() => refreshLogs(incidentId), 5000);
    return () => window.clearInterval(id);
  }, [selectedIncident?.incident_id, refreshLogs]);

  useEffect(() => {
    const nextAgency = selectedIncident?.approved_agencies?.includes(form.agency)
      ? form.agency
      : (selectedIncident?.approved_agencies?.[0] ?? '');
    setForm((current) => ({
      ...current,
      agency: nextAgency,
      message: '',
    }));
    setSaveError('');
    setSaveStatus('idle');
  }, [selectedIncident?.incident_id]);

  function updateForm(key) {
    return (event) => {
      const value = event.target.value;
      setForm((current) => ({ ...current, [key]: value }));
    };
  }

  async function submitLog(event) {
    event.preventDefault();
    if (!selectedIncident || !form.agency.trim() || !form.message.trim()) return;

    setSaveStatus('saving');
    setSaveError('');

    try {
      await api.createResponderLog(selectedIncident.incident_id, {
        agency: form.agency.trim(),
        author: form.author.trim() || undefined,
        category: form.category,
        message: form.message.trim(),
      });
      setForm((current) => ({
        ...current,
        author: '',
        message: '',
      }));
      await refreshLogs(selectedIncident.incident_id);
      setSaveStatus('idle');
    } catch (error) {
      setSaveStatus('error');
      setSaveError(
        error instanceof Error
          ? error.message
          : 'Could not save shared update. Check the Node API connection.'
      );
    }
  }

  function selectIncident(incidentId) {
    setSelectedId(incidentId);
  }

  return (
    <div className="responder-page responder-operations-page">
      <header className="responder-header">
        <div>
          <p className="eyebrow">Shared inter-agency operations</p>
          <h1>Responder View</h1>
          <p className="responder-header-copy">
            Dispatched incidents and one shared operational timeline for every assigned agency.
          </p>
        </div>
        <Link to="/dispatcher" className="responder-command-link">
          Dispatcher View
        </Link>
      </header>

      {incidentStatus === 'error' && (
        <p className="responder-feed-warning">
          Responder incident feed unavailable. {incidentError || 'Check the Node API connection.'}
        </p>
      )}

      <section className="responder-incident-panel panel">
        <div className="responder-section-heading">
          <div>
            <p className="eyebrow">Active assignments</p>
            <h2>Approved and dispatched incidents</h2>
          </div>
          <span className="pill">{incidents.length} active</span>
        </div>

        {incidentStatus === 'loading' ? (
          <LoadingSkeleton rows={4} compact />
        ) : incidents.length === 0 ? (
          <div className="responder-empty-state"><p>No approved incidents assigned yet.</p></div>
        ) : (
          <div className="responder-incident-list">
            {incidents.map((incident) => (
              <button
                type="button"
                key={incident.incident_id}
                className={`responder-incident-card${
                  selectedIncident?.incident_id === incident.incident_id ? ' is-active' : ''
                }`}
                onClick={() => selectIncident(incident.incident_id)}
              >
                <span className="responder-incident-code">{incident.incident_id}</span>
                <span className="responder-incident-copy">
                  <span className="responder-incident-title">{incidentTitle(incident)}</span>
                  <span className="responder-incident-meta">
                    {incident.approved_agencies?.join(', ')} | Dispatched{' '}
                    {formatTimestamp(incident.approved_at)}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="panel responder-shared-log">
        <div className="responder-section-heading">
          <div>
            <p className="eyebrow">Shared incident log</p>
            <h2>{selectedIncident ? incidentTitle(selectedIncident) : 'No incident selected'}</h2>
          </div>
          {selectedIncident && (
            <span className="pill">{selectedIncident.approved_agencies?.join(' / ')}</span>
          )}
        </div>

        {!selectedIncident ? (
          <div className="responder-empty-state"><p>No approved incidents assigned yet.</p></div>
        ) : (
          <div className="report-pane">
            <form className="report-form" onSubmit={submitLog}>
              <div className="report-form-grid">
                <label className="report-field">
                  <span>Agency</span>
                  <select value={form.agency} onChange={updateForm('agency')} required>
                    <option value="" disabled>Select an agency</option>
                    {(selectedIncident.approved_agencies ?? []).map((agency) => (
                      <option key={agency} value={agency}>
                        {agency}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="report-field">
                  <span>Author / unit</span>
                  <input
                    value={form.author}
                    onChange={updateForm('author')}
                    placeholder="e.g. Alpha 21"
                  />
                </label>

                <label className="report-field">
                  <span>Category</span>
                  <select value={form.category} onChange={updateForm('category')}>
                    {LOG_CATEGORY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="report-field report-field-full">
                  <span>Operational update</span>
                  <textarea
                    rows={4}
                    required
                    value={form.message}
                    onChange={updateForm('message')}
                    placeholder="What changed on the ground?"
                  />
                </label>
              </div>

              {saveError && <p className="allocation-command-note">{saveError}</p>}

              <div className="report-form-actions">
                <button
                  type="submit"
                  className="primary-button compact-button"
                  disabled={saveStatus === 'saving' || !form.agency.trim() || !form.message.trim()}
                >
                  Add shared update
                </button>
              </div>
            </form>

            {logStatus === 'loading' ? (
              <LoadingSkeleton rows={3} compact />
            ) : logs.length === 0 ? (
              <div className="responder-empty-state">
                <p>No shared updates recorded yet for this incident.</p>
              </div>
            ) : (
              <div className="quick-log-list">
                {logs.map((log) => (
                  <article key={log.id} className="quick-log-entry">
                    <span className="quick-log-dot" aria-hidden="true" />
                    <div>
                      <p>{log.message}</p>
                      <p className="incident-meta-inline">
                        {log.agency}
                        {log.author ? ` | ${log.author}` : ''}
                        {` | ${categoryLabel(log.category)} | `}
                        {formatTimestamp(log.timestamp)}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {logStatus === 'error' && (
              <p className="allocation-command-note">
                Shared logs could not be loaded. {logError || 'Check the Node API connection.'}
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
