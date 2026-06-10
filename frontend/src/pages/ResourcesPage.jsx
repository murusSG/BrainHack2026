import {
  interAgencyRequestForm,
  resourceLedgerTabs,
  resourceShortageAlert
} from '../data/dashboardData';
import { useScdfResources } from '../hooks/useScdfResources';
import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ScreenHeader, ScreenPage, ScreenPanel } from '../components/ui';

function resourceSymbol(icon) {
  if (icon === 'fleet') {
    return 'fleet';
  }

  if (icon === 'water') {
    return 'water';
  }

  if (icon === 'shelter') {
    return 'home';
  }

  return 'beds';
}

export function ResourcesPage() {
  const location = useLocation();
  const routedRequestForm = location.state?.requestForm;
  const { status, error, summaryCards, ledgerEntries, ledgerMeta } = useScdfResources();
  const [ledgerQuery, setLedgerQuery] = useState(() => new URLSearchParams(location.search).get('q') ?? '');
  const [activeLedgerTab, setActiveLedgerTab] = useState(resourceLedgerTabs[0].id);
  const [resourceNotice, setResourceNotice] = useState(
    location.state?.quickActionNotice ?? 'Resource desk ready for allocation review.'
  );
  const [shortageStatus, setShortageStatus] = useState('recommended');
  const [requestForm, setRequestForm] = useState({
    resourceType: routedRequestForm?.resourceType ?? interAgencyRequestForm.resourceTypes[0],
    quantity: routedRequestForm?.quantity ?? '0',
    priority: routedRequestForm?.priority ?? interAgencyRequestForm.priorities[0],
    reason: routedRequestForm?.reason ?? '',
  });
  const [stagedRequests, setStagedRequests] = useState([]);
  const activeTabLabel =
    resourceLedgerTabs.find((tab) => tab.id === activeLedgerTab)?.label ?? resourceLedgerTabs[0].label;
  const filteredLedgerEntries = useMemo(() => {
    const normalizedQuery = ledgerQuery.trim().toLowerCase();
    return ledgerEntries.filter((entry) => {
      const matchesActiveTab = resourceEntryMatchesTab(entry, activeLedgerTab);
      const searchable = [
        entry.unitId,
        entry.type,
        entry.baseStation,
        entry.crew,
        entry.status,
        activeTabLabel,
      ]
        .join(' ')
        .toLowerCase();

      return matchesActiveTab && (!normalizedQuery || searchable.includes(normalizedQuery));
    });
  }, [activeLedgerTab, activeTabLabel, ledgerEntries, ledgerQuery]);

  function updateRequestField(field, value) {
    setRequestForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function appendRequestLog(entry) {
    setStagedRequests((current) => [entry, ...current].slice(0, 12));
  }

  function handleSubmitRequest(event) {
    event.preventDefault();
    const quantity = Number(requestForm.quantity);
    if (!Number.isFinite(quantity) || quantity < 1) {
      setResourceNotice('Request needs a quantity above zero before dispatch review.');
      return;
    }

    const request = {
      id: `REQ-${Date.now().toString().slice(-5)}`,
      source: 'Manual request',
      resourceType: requestForm.resourceType,
      quantity,
      priority: requestForm.priority,
      priorityTone: getPriorityTone(requestForm.priority),
      reason: requestForm.reason.trim() || 'No additional reason supplied.',
      status: 'Submitted for review',
      timestamp: formatLogTimestamp(),
    };
    appendRequestLog(request);
    setRequestForm((current) => ({
      ...current,
      quantity: '0',
      reason: '',
    }));
    setResourceNotice(`${request.id} staged for dispatcher review.`);
  }

  return (
    <ScreenPage className="resources-page">
      <ScreenHeader
        as="section"
        className="hero-panel resource-hero"
        visual="flyer"
        visualVariant="subtleBackground"
        visualPosition="center"
        visualIntensity="subtle"
      >
        <div>
          <h1>Resource Availability</h1>
          <p className="hero-copy">
            Real-time inventory and capacity monitoring across Singapore agencies.
          </p>
        </div>
      </ScreenHeader>

      {status === 'error' && (
        <p className="feed-warning">
          SCDF public resource feed unavailable ({error}). Showing planning defaults.
        </p>
      )}

      <ScreenPanel
        className="resource-alert-banner resource-alert-banner-full"
        tone="danger"
      >
        <div className="resource-alert-icon" aria-hidden="true">
          !
        </div>
        <div className="resource-alert-copy">
          <h2>{resourceShortageAlert.title}</h2>
          <p>{resourceShortageAlert.message}</p>
          <span className="resource-shortage-state">Status: {shortageStatus}</span>
          <div className="resource-alert-actions">
            <button
              type="button"
              className="alert-primary"
              onClick={() => {
                setShortageStatus('transfer staged');
                appendRequestLog({
                  id: `AI-${Date.now().toString().slice(-5)}`,
                  source: 'Critical shortage transfer',
                  resourceType: resourceShortageAlert.items
                    .map((item) => `${item.quantity} x ${item.label}`)
                    .join(', '),
                  quantity: resourceShortageAlert.items.reduce((total, item) => total + item.quantity, 0),
                  priority: 'Critical',
                  priorityTone: 'critical',
                  transferFrom: resourceShortageAlert.transferFrom,
                  transferTo: resourceShortageAlert.transferTo,
                  items: resourceShortageAlert.items,
                  reason: resourceShortageAlert.message,
                  status: 'Transfer initiated',
                  timestamp: formatLogTimestamp(),
                });
                setResourceNotice('Shortage transfer staged for approval.');
              }}
            >
              Initiate Transfer
            </button>
            <button
              type="button"
              className="alert-secondary"
              onClick={() => {
                setShortageStatus('monitoring');
                setResourceNotice('Shortage recommendation moved to monitoring.');
              }}
            >
              Ignore
            </button>
          </div>
        </div>
      </ScreenPanel>

      <section className="resource-summary-grid">
        {summaryCards.map((card) => (
          <ScreenPanel as="article" key={card.label} className="resource-summary-card">
            <div className="resource-card-top">
              <span className={`resource-icon icon-${resourceSymbol(card.icon)}`} aria-hidden="true" />
              <span className={`resource-change tone-${card.tone}`}>{card.change}</span>
            </div>
            <h3>{card.label}</h3>
            <p className="resource-card-value">{card.value}</p>
            <p className="resource-card-detail">{card.detail}</p>
          </ScreenPanel>
        ))}
      </section>

      <section className="resource-main-grid">
        <div className="resource-left-column">
          <ScreenPanel className="panel resource-ledger-panel">
            <div className="resource-ledger-head">
              <div>
                <h2>{ledgerMeta.title}</h2>
                <p>{ledgerMeta.subtitle}</p>
              </div>
              <label className="resource-ledger-search">
                <span className="searchbar-icon" aria-hidden="true">
                  +
                </span>
                <input
                  type="text"
                  placeholder={ledgerMeta.searchPlaceholder}
                  aria-label="Search resource ledger"
                  value={ledgerQuery}
                  onChange={(event) => setLedgerQuery(event.target.value)}
                />
              </label>
            </div>

            <div className="resource-ledger-tabs">
              {resourceLedgerTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`resource-tab ${tab.id === activeLedgerTab ? 'active' : ''}`}
                  onClick={() => {
                    setActiveLedgerTab(tab.id);
                    setResourceNotice(`${tab.label} selected for allocation review.`);
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="resource-ledger-table">
              <div className="resource-ledger-row resource-ledger-header">
                <span>Unit ID</span>
                <span>Type</span>
                <span>Base Station</span>
                <span>Crew</span>
                <span>Battery / Fuel</span>
                <span>Status</span>
              </div>

              {filteredLedgerEntries.map((entry) => (
                <div key={entry.unitId} className="resource-ledger-row">
                  <span className="ledger-strong">{entry.unitId}</span>
                  <span>{entry.type}</span>
                  <span>{entry.baseStation}</span>
                  <span>{entry.crew}</span>
                  <span className="battery-cell">
                    <span className="battery-bar">
                      <span style={{ width: `${entry.capacity}%` }} />
                    </span>
                    <span>{entry.capacity}%</span>
                  </span>
                  <span>
                    <span className={`ledger-status status-${entry.statusTone}`}>{entry.status}</span>
                  </span>
                </div>
              ))}
              {filteredLedgerEntries.length === 0 && (
                <p className="resource-empty-state">No ledger records match this view.</p>
              )}
            </div>

            <div className="resource-ledger-footer">
              <span>{ledgerMeta.syncStatus}</span>
            </div>
          </ScreenPanel>

        </div>

        <aside className="resource-right-column">
          <ScreenPanel className="resource-request-panel">
            <div className="section-heading light">
              <div>
                <h2>{interAgencyRequestForm.title}</h2>
                <p>{interAgencyRequestForm.subtitle}</p>
              </div>
            </div>
            <p className="allocation-command-note">{resourceNotice}</p>

            <form onSubmit={handleSubmitRequest}>
              <div className="resource-form-grid">
                <label className="resource-field full">
                  <span>Resource Type</span>
                  <select
                    value={requestForm.resourceType}
                    onChange={(event) => updateRequestField('resourceType', event.target.value)}
                  >
                    {interAgencyRequestForm.resourceTypes.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="resource-field">
                  <span>Quantity</span>
                  <input
                    type="number"
                    min="0"
                    value={requestForm.quantity}
                    onChange={(event) => updateRequestField('quantity', event.target.value)}
                  />
                </label>

                <label className="resource-field">
                  <span>Priority Level</span>
                  <select
                    value={requestForm.priority}
                    onChange={(event) => updateRequestField('priority', event.target.value)}
                  >
                    {interAgencyRequestForm.priorities.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="resource-field full">
                  <span>Reason for Request</span>
                  <textarea
                    rows="4"
                    placeholder="Describe the incident requirements..."
                    value={requestForm.reason}
                    onChange={(event) => updateRequestField('reason', event.target.value)}
                  />
                </label>
              </div>

              <button type="submit" className="resource-submit-button">
                + Submit Request
              </button>
            </form>

            {stagedRequests.length > 0 && (
              <div className="staged-request-list staged-request-list-inline">
                {stagedRequests.map((request) => (
                  <article key={request.id} className="staged-request-card">
                    <div className="staged-request-copy">
                      <div className="staged-request-top">
                        <strong>{request.id}</strong>
                        <span className={`request-priority-pill priority-${request.priorityTone}`}>
                          {request.priority}
                        </span>
                      </div>
                      <p>{request.quantity} x {request.resourceType}</p>
                      <p>{request.status}</p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </ScreenPanel>

          <ScreenPanel className="resource-log-panel">
            <div className="resource-log-head">
              <div>
                <h2>Request Log</h2>
                <p>Manual requests and shortage-triggered transfers appear here for shared reference.</p>
              </div>
              <span className="pill">{stagedRequests.length} logged</span>
            </div>

            <div className="resource-log-scroll" role="log" aria-live="polite">
              {stagedRequests.length > 0 ? (
                <div className="staged-request-list">
                  {stagedRequests.map((request) => (
                    <article key={request.id} className="staged-request-card">
                      <div className="staged-request-copy">
                        <div className="staged-request-top">
                          <strong>{request.id}</strong>
                          <span className={`request-priority-pill priority-${request.priorityTone}`}>
                            {request.priority}
                          </span>
                        </div>
                        <p>{request.source}</p>
                        {request.transferFrom && request.transferTo ? (
                          <>
                            <p>
                              {request.transferFrom} to {request.transferTo}
                            </p>
                            {request.items?.map((item) => (
                              <p key={`${request.id}-${item.label}`}>
                                {item.quantity} x {item.label}
                              </p>
                            ))}
                          </>
                        ) : (
                          <>
                            <p>{request.quantity} x {request.resourceType}</p>
                            <p>{request.reason}</p>
                          </>
                        )}
                        <p>{request.status} / {request.timestamp}</p>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="resource-empty-state">No transfer or request logs yet.</p>
              )}
            </div>
          </ScreenPanel>
        </aside>
      </section>
    </ScreenPage>
  );
}

function resourceEntryMatchesTab(entry, activeTab) {
  const type = entry.type.toLowerCase();
  if (activeTab === 'shelters') {
    return type.includes('shelter');
  }

  if (activeTab === 'supplies') {
    return (
      type.includes('blood') ||
      type.includes('ppe') ||
      type.includes('ventilator') ||
      type.includes('water') ||
      type.includes('aed')
    );
  }

  return !type.includes('shelter');
}

function getPriorityTone(priority) {
  const normalized = String(priority ?? '').toLowerCase();
  if (normalized.includes('critical')) return 'critical';
  if (normalized.includes('high')) return 'high';
  return 'medium';
}

function formatLogTimestamp() {
  return new Intl.DateTimeFormat('en-SG', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date());
}
