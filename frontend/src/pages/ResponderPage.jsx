import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { api } from '../services/api';
import { getAccessToken } from '../services/auth';
import { incidentTitle } from '../services/incidentClusterAdapter';

function formatTimestamp(value) {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return 'Time unavailable';
  return new Intl.DateTimeFormat('en-SG', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Singapore',
  }).format(timestamp);
}

const STATUS_BADGE = {
  draft: { label: 'Draft', cls: 'status-draft' },
  submitted: { label: 'Submitted', cls: 'status-submitted' },
  acknowledged: { label: 'Acknowledged', cls: 'status-acknowledged' },
};

function CasualtyDisplay({ casualties }) {
  if (!casualties) return null;
  const { injured, deceased, missing } = casualties;
  return <span>{injured} injured · {deceased} deceased · {missing} missing</span>;
}

function ReportDetail({ report, currentUserId, onAcknowledge, onEdit }) {
  const isAuthor = report.author_id === currentUserId;
  const badge = STATUS_BADGE[report.status] ?? { label: report.status, cls: '' };

  return (
    <div className="report-detail">
      <div className="report-detail-header">
        <div>
          <span className="agency-token">{report.agency}</span>
          <strong className="report-author">{report.author_name || 'Agency unit'}</strong>
        </div>
        <div className="report-detail-meta">
          <span className={`report-status-badge ${badge.cls}`}>{badge.label}</span>
          <time>{formatTimestamp(report.created_at)}</time>
        </div>
      </div>

      <dl className="report-fields">
        <dt>Situation</dt>
        <dd>{report.situation_summary}</dd>

        {report.location && (<><dt>Location</dt><dd>{report.location}</dd></>)}

        {report.casualties && (
          <><dt>Casualties</dt><dd><CasualtyDisplay casualties={report.casualties} /></dd></>
        )}

        {report.resources_deployed && (
          <><dt>Resources deployed</dt><dd>{report.resources_deployed}</dd></>
        )}

        {report.actions_taken && (
          <><dt>Actions taken</dt><dd>{report.actions_taken}</dd></>
        )}

        {report.hazards?.length > 0 && (
          <><dt>Hazards</dt><dd>{report.hazards.join(', ')}</dd></>
        )}

        {report.next_steps && (
          <><dt>Next steps</dt><dd>{report.next_steps}</dd></>
        )}
      </dl>

      <div className="report-detail-actions">
        {isAuthor && report.status === 'draft' && (
          <button type="button" className="secondary-button compact-button" onClick={onEdit}>
            Edit draft
          </button>
        )}
        {!isAuthor && report.status === 'submitted' && (
          <button type="button" className="primary-button compact-button" onClick={onAcknowledge}>
            Acknowledge
          </button>
        )}
      </div>
    </div>
  );
}

function ReportForm({ incidentId, token, existing, onSaved, onCancel }) {
  const [fields, setFields] = useState({
    author_name: existing?.author_name ?? '',
    situation_summary: existing?.situation_summary ?? '',
    location: existing?.location ?? '',
    injured: existing?.casualties?.injured ?? 0,
    deceased: existing?.casualties?.deceased ?? 0,
    missing: existing?.casualties?.missing ?? 0,
    resources_deployed: existing?.resources_deployed ?? '',
    actions_taken: existing?.actions_taken ?? '',
    hazards: existing?.hazards?.join(', ') ?? '',
    next_steps: existing?.next_steps ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  function set(key) {
    return (e) => setFields((f) => ({ ...f, [key]: e.target.value }));
  }

  function buildPayload(status) {
    return {
      author_name: fields.author_name.trim() || undefined,
      situation_summary: fields.situation_summary.trim(),
      location: fields.location.trim() || undefined,
      casualties: {
        injured: Number(fields.injured) || 0,
        deceased: Number(fields.deceased) || 0,
        missing: Number(fields.missing) || 0,
      },
      resources_deployed: fields.resources_deployed.trim() || undefined,
      actions_taken: fields.actions_taken.trim() || undefined,
      hazards: fields.hazards.split(',').map((h) => h.trim()).filter(Boolean),
      next_steps: fields.next_steps.trim() || undefined,
      status,
    };
  }

  async function save(status) {
    if (!fields.situation_summary.trim()) return;
    setSaving(true);
    setError(null);
    try {
      let saved;
      if (existing) {
        saved = await api.updateIncidentReport(incidentId, existing.id, token, buildPayload(status));
      } else {
        saved = await api.createIncidentReport(incidentId, token, buildPayload(status));
      }
      // Unwrap envelope { data: IncidentReport }
      onSaved(saved?.data ?? saved);
    } catch {
      setError('Could not save report. Check the Node API connection.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="report-form" onSubmit={(e) => e.preventDefault()}>
      <label>
        <span>Author / unit</span>
        <input value={fields.author_name} onChange={set('author_name')} placeholder="e.g. Alpha 21" />
      </label>

      <label>
        <span>Situation summary <span aria-hidden="true">*</span></span>
        <textarea
          rows={3}
          required
          value={fields.situation_summary}
          onChange={set('situation_summary')}
          placeholder="Current status and what happened"
        />
      </label>

      <label>
        <span>On-ground location</span>
        <input value={fields.location} onChange={set('location')} placeholder="e.g. Block 93, Toa Payoh Central" />
      </label>

      <fieldset className="report-casualties">
        <legend>Casualties</legend>
        <label><span>Injured</span><input type="number" min={0} value={fields.injured} onChange={set('injured')} /></label>
        <label><span>Deceased</span><input type="number" min={0} value={fields.deceased} onChange={set('deceased')} /></label>
        <label><span>Missing</span><input type="number" min={0} value={fields.missing} onChange={set('missing')} /></label>
      </fieldset>

      <label>
        <span>Resources deployed</span>
        <textarea rows={2} value={fields.resources_deployed} onChange={set('resources_deployed')} placeholder="Personnel, vehicles, equipment" />
      </label>

      <label>
        <span>Actions taken</span>
        <textarea rows={2} value={fields.actions_taken} onChange={set('actions_taken')} placeholder="What your agency has done so far" />
      </label>

      <label>
        <span>Hazards (comma-separated)</span>
        <input value={fields.hazards} onChange={set('hazards')} placeholder="e.g. smoke inhalation, structural risk" />
      </label>

      <label>
        <span>Next steps</span>
        <textarea rows={2} value={fields.next_steps} onChange={set('next_steps')} placeholder="Intended action plan" />
      </label>

      {error && <p className="allocation-command-note">{error}</p>}

      <div className="report-form-actions">
        {onCancel && (
          <button type="button" className="secondary-button compact-button" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button
          type="button"
          className="secondary-button compact-button"
          disabled={!fields.situation_summary.trim() || saving}
          onClick={() => save('draft')}
        >
          Save draft
        </button>
        <button
          type="button"
          className="primary-button compact-button"
          disabled={!fields.situation_summary.trim() || saving}
          onClick={() => save('submitted')}
        >
          Submit
        </button>
      </div>
    </form>
  );
}

export function ResponderPage() {
  const [token, setToken] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [reports, setReports] = useState([]);
  const [selectedAgency, setSelectedAgency] = useState(null);
  const [editing, setEditing] = useState(false);
  const [incidentStatus, setIncidentStatus] = useState('loading');
  const [reportStatus, setReportStatus] = useState('idle');

  const selectedIncident =
    incidents.find((i) => i.incident_id === selectedId) ?? incidents[0];

  // De-duplicate: one entry per agency (latest report wins)
  const agencyMap = new Map(reports.map((r) => [r.agency, r]));
  const agencyList = [...agencyMap.values()];

  const myReport = reports.find((r) => r.author_id === currentUserId) ?? null;
  const selectedReport = selectedAgency ? (agencyMap.get(selectedAgency) ?? null) : null;

  // Load Supabase session once on mount
  useEffect(() => {
    getAccessToken().then((t) => {
      setToken(t);
      if (t) {
        // Decode sub (user id) from JWT payload without a library
        try {
          const payload = JSON.parse(atob(t.split('.')[1]));
          setCurrentUserId(payload.sub ?? null);
        } catch {
          setCurrentUserId(null);
        }
      }
    });
  }, []);

  const refreshIncidents = useCallback(async () => {
    try {
      const next = await api.responderIncidents();
      setIncidents(next ?? []);
      setSelectedId((cur) => {
        if ((next ?? []).some((i) => i.incident_id === cur)) return cur;
        return next?.[0]?.incident_id ?? null;
      });
      setIncidentStatus('done');
    } catch {
      setIncidentStatus('error');
    }
  }, []);

  const refreshReports = useCallback(async (incidentId) => {
    if (!incidentId || !token) { setReports([]); return; }
    try {
      const next = await api.incidentReports(incidentId, token);
      setReports(next ?? []);
      setReportStatus('idle');
    } catch {
      setReportStatus('error');
    }
  }, [token]);

  useEffect(() => {
    refreshIncidents();
    const id = window.setInterval(refreshIncidents, 5000);
    return () => window.clearInterval(id);
  }, [refreshIncidents]);

  useEffect(() => {
    const incidentId = selectedIncident?.incident_id;
    refreshReports(incidentId);
    if (!incidentId) return undefined;
    const id = window.setInterval(() => refreshReports(incidentId), 5000);
    return () => window.clearInterval(id);
  }, [selectedIncident?.incident_id, refreshReports]);

  async function acknowledge(report) {
    if (!token) return;
    try {
      await api.updateIncidentReport(
        selectedIncident.incident_id,
        report.id,
        token,
        { status: 'acknowledged' }
      );
      await refreshReports(selectedIncident.incident_id);
    } catch {
      setReportStatus('error');
    }
  }

  function handleReportSaved(saved) {
    setEditing(false);
    setSelectedAgency(saved.agency);
    refreshReports(selectedIncident.incident_id);
  }

  function selectIncident(incidentId) {
    setSelectedId(incidentId);
    setSelectedAgency(null);
    setEditing(false);
  }

  return (
    <div className="responder-page responder-operations-page">
      <header className="responder-header">
        <div>
          <p className="eyebrow">Shared inter-agency operations</p>
          <h1>Responder View</h1>
          <p className="responder-header-copy">
            Dispatched incidents and structured reports from all assigned agencies.
          </p>
        </div>
        <Link to="/dispatcher" className="responder-command-link">
          Dispatcher View
        </Link>
      </header>

      {incidentStatus === 'error' && (
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
            <p className="eyebrow">Shared incident reports</p>
            <h2>{selectedIncident ? incidentTitle(selectedIncident) : 'No incident selected'}</h2>
          </div>
          {selectedIncident && (
            <span className="pill">{selectedIncident.approved_agencies?.join(' / ')}</span>
          )}
        </div>

        {!selectedIncident ? (
          <div className="responder-empty-state"><p>No approved incidents assigned yet.</p></div>
        ) : !token ? (
          <div className="responder-empty-state">
            <p>Sign in to view and file incident reports.</p>
          </div>
        ) : (
          <div className="report-layout">
            <nav className="report-sidebar">
              {agencyList.map((r) => {
                const badge = STATUS_BADGE[r.status] ?? { label: r.status, cls: '' };
                return (
                  <button
                    type="button"
                    key={r.agency}
                    className={`report-sidebar-item${selectedAgency === r.agency ? ' is-active' : ''}`}
                    onClick={() => { setSelectedAgency(r.agency); setEditing(false); }}
                  >
                    <span className="agency-token">{r.agency}</span>
                    <span className={`report-status-dot ${badge.cls}`} title={badge.label} />
                  </button>
                );
              })}

              {!myReport && (
                <button
                  type="button"
                  className="report-sidebar-item report-sidebar-add"
                  onClick={() => { setSelectedAgency(null); setEditing(true); }}
                >
                  <span>+ File your report</span>
                </button>
              )}
            </nav>

            <div className="report-pane">
              {editing ? (
                <ReportForm
                  incidentId={selectedIncident.incident_id}
                  token={token}
                  existing={myReport}
                  onSaved={handleReportSaved}
                  onCancel={() => setEditing(false)}
                />
              ) : selectedReport ? (
                <ReportDetail
                  report={selectedReport}
                  currentUserId={currentUserId}
                  onAcknowledge={() => acknowledge(selectedReport)}
                  onEdit={() => setEditing(true)}
                />
              ) : (
                <div className="responder-empty-state">
                  <p>Select an agency from the sidebar, or file your report.</p>
                </div>
              )}

              {reportStatus === 'error' && (
                <p className="allocation-command-note">
                  Reports could not be loaded. Check the Node API connection.
                </p>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
