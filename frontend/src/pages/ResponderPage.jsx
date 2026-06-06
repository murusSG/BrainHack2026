import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { api } from '../services/api';
import { incidentTitle } from '../services/incidentClusterAdapter';

const AGENCIES = ['SPF', 'SCDF', 'MOH', 'PUB', 'LTA'];
const CATEGORIES = [
  ['general', 'General'],
  ['hazard', 'Hazard'],
  ['medical', 'Medical'],
  ['evacuation', 'Evacuation'],
  ['security', 'Security'],
  ['resource_update', 'Resource update'],
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

export function ResponderPage() {
  const [incidents, setIncidents] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState('loading');
  const [logStatus, setLogStatus] = useState('idle');
  const [agency, setAgency] = useState('SCDF');
  const [author, setAuthor] = useState('');
  const [category, setCategory] = useState('general');
  const [message, setMessage] = useState('');

  const selectedIncident =
    incidents.find((incident) => incident.incident_id === selectedId) ?? incidents[0];

  async function refreshIncidents() {
    try {
      const nextIncidents = await api.responderIncidents();
      setIncidents(nextIncidents ?? []);
      setSelectedId((current) => {
        if ((nextIncidents ?? []).some((incident) => incident.incident_id === current)) return current;
        return nextIncidents?.[0]?.incident_id ?? null;
      });
      setStatus('done');
    } catch {
      setStatus('error');
    }
  }

  async function refreshLogs(incidentId) {
    if (!incidentId) {
      setLogs([]);
      return;
    }
    try {
      setLogs(await api.responderLogs(incidentId));
      setLogStatus('idle');
    } catch {
      setLogStatus('error');
    }
  }

  useEffect(() => {
    refreshIncidents();
    const intervalId = window.setInterval(refreshIncidents, 5000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const incidentId = selectedIncident?.incident_id;
    refreshLogs(incidentId);
    if (!incidentId) return undefined;
    const intervalId = window.setInterval(() => refreshLogs(incidentId), 5000);
    return () => window.clearInterval(intervalId);
  }, [selectedIncident?.incident_id]);

  async function submitLog(event) {
    event.preventDefault();
    if (!selectedIncident || !message.trim()) return;
    setLogStatus('saving');
    try {
      await api.createResponderLog(selectedIncident.incident_id, {
        agency,
        author: author.trim() || undefined,
        category,
        message: message.trim(),
      });
      setMessage('');
      await refreshLogs(selectedIncident.incident_id);
    } catch {
      setLogStatus('error');
    }
  }

  return (
    <div className="responder-page responder-operations-page">
      <header className="responder-header">
        <div>
          <p className="eyebrow">Shared inter-agency operations</p>
          <h1>Responder View</h1>
          <p className="responder-header-copy">
            Dispatched incidents and one shared live log for all assigned agencies.
          </p>
        </div>
        <Link to="/dispatcher" className="responder-command-link">
          Dispatcher View
        </Link>
      </header>

      {status === 'error' && (
        <p className="responder-feed-warning">
          Responder incident feed unavailable. Check the Node API connection.
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

        {status === 'loading' ? (
          <LoadingSkeleton rows={4} compact />
        ) : incidents.length === 0 ? (
          <div className="responder-empty-state">
            <p>No approved incidents assigned yet.</p>
          </div>
        ) : (
          <div className="responder-incident-list">
            {incidents.map((incident) => (
              <button
                type="button"
                key={incident.incident_id}
                className={`responder-incident-card${
                  selectedIncident?.incident_id === incident.incident_id ? ' is-active' : ''
                }`}
                onClick={() => setSelectedId(incident.incident_id)}
              >
                <span className="agency-token">{incident.incident_id}</span>
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
          <div className="responder-empty-state">
            <p>No approved incidents assigned yet.</p>
          </div>
        ) : (
          <>
            <div className="responder-log-list" aria-live="polite">
              {logs.length === 0 ? (
                <p className="responder-log-empty">No field updates have been posted yet.</p>
              ) : (
                logs.map((log) => (
                  <article key={log.id} className="responder-log-entry">
                    <div className="responder-log-meta">
                      <span className="agency-token">{log.agency}</span>
                      <strong>{log.author || 'Agency unit'}</strong>
                      <span>{log.category.replaceAll('_', ' ')}</span>
                      <time>{formatTimestamp(log.timestamp)}</time>
                    </div>
                    <p>{log.message}</p>
                  </article>
                ))
              )}
            </div>

            <form className="responder-log-form" onSubmit={submitLog}>
              <div className="responder-log-fields">
                <label>
                  <span>Agency</span>
                  <select value={agency} onChange={(event) => setAgency(event.target.value)}>
                    {AGENCIES.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Author / unit</span>
                  <input
                    value={author}
                    onChange={(event) => setAuthor(event.target.value)}
                    placeholder="e.g. Alpha 21"
                  />
                </label>
                <label>
                  <span>Category</span>
                  <select value={category} onChange={(event) => setCategory(event.target.value)}>
                    {CATEGORIES.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="allocation-message">
                <span>Operational update</span>
                <textarea
                  rows="3"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Share hazards, casualties, evacuation progress, security, or resource updates"
                />
              </label>
              <button
                type="submit"
                className="primary-button compact-button"
                disabled={!message.trim() || logStatus === 'saving'}
              >
                Add shared update
              </button>
              {logStatus === 'error' && (
                <p className="allocation-command-note">
                  Update could not be saved. Check the Node API connection.
                </p>
              )}
            </form>
          </>
        )}
      </section>
    </div>
  );
}
