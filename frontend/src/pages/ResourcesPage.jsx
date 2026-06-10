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
  const [ledgerQuery, setLedgerQuery] = useState('');
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
  const syncLabel =
    status === 'loading'
      ? 'Syncing SCDF'
      : status === 'error'
        ? 'Planning fallback'
        : ledgerMeta.syncStatus;
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

  function handleSubmitRequest(event) {
    event.preventDefault();
    const quantity = Number(requestForm.quantity);
    if (!Number.isFinite(quantity) || quantity < 1) {
      setResourceNotice('Request needs a quantity above zero before dispatch review.');
      return;
    }

    const request = {
      id: `REQ-${Date.now().toString().slice(-5)}`,
      resourceType: requestForm.resourceType,
      quantity,
      priority: requestForm.priority,
      priorityTone: getPriorityTone(requestForm.priority),
      reason: requestForm.reason.trim() || 'No additional reason supplied.',
    };
    setStagedRequests((current) => [request, ...current].slice(0, 3));
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
        <div className="hero-actions">
          <span className="pill">{syncLabel}</span>
          <button
            type="button"
            className="ghost-button"
            onClick={() => setResourceNotice('Resource export staged for this planning snapshot.')}
          >
            Export Report
          </button>
          <button
            type="button"
            className="ghost-button"
            onClick={() => setResourceNotice(`Filter lens set to ${activeTabLabel}.`)}
          >
            Filters
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={() => setResourceNotice('Operational log view queued for the current desk.')}
          >
            Log View
          </button>
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
                <span>Actions</span>
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
                  <button
                    type="button"
                    className="ledger-menu-button"
                    aria-label={`Actions for ${entry.unitId}`}
                    onClick={() =>
                      setResourceNotice(`${entry.unitId} selected for transfer review.`)
                    }
                  >
                    ...
                  </button>
                </div>
              ))}
              {filteredLedgerEntries.length === 0 && (
                <p className="resource-empty-state">No ledger records match this view.</p>
              )}
            </div>

            <div className="resource-ledger-footer">
              <span>{ledgerMeta.syncStatus}</span>
              <button
                type="button"
                className="inline-link"
                onClick={() => setResourceNotice('Audit log snapshot loaded for review.')}
              >
                {ledgerMeta.auditLabel}
              </button>
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
              <div className="staged-request-list">
                {stagedRequests.map((request) => (
                  <article key={request.id} className="staged-request-card">
                    <div>
                      <strong>{request.id}</strong>
                      <p>
                        {request.quantity} x {request.resourceType}
                      </p>
                    </div>
                    <span className={`request-priority-pill priority-${request.priorityTone}`}>
                      {request.priority}
                    </span>
                  </article>
                ))}
              </div>
            )}
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
