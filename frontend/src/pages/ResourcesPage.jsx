import {
  interAgencyRequestForm,
  resourceLedgerTabs,
  resourceShortageAlert,
  resourceTrend
} from '../data/dashboardData';
import { useScdfResources } from '../hooks/useScdfResources';
import { useMemo, useState } from 'react';

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

function buildTrendPath(values, max, height) {
  const width = 100;

  return values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - (value / max) * height;
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');
}

function buildTrendArea(values, max, height) {
  const width = 100;
  const line = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - (value / max) * height;
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  return `${line} L ${width} ${height} L 0 ${height} Z`;
}

export function ResourcesPage() {
  const { status, error, summaryCards, ledgerEntries, ledgerMeta } = useScdfResources();
  const [ledgerQuery, setLedgerQuery] = useState('');
  const [activeLedgerTab, setActiveLedgerTab] = useState(resourceLedgerTabs[0].id);
  const [resourceNotice, setResourceNotice] = useState('Resource desk ready for allocation review.');
  const [shortageStatus, setShortageStatus] = useState('recommended');
  const [requestForm, setRequestForm] = useState({
    resourceType: interAgencyRequestForm.resourceTypes[0],
    quantity: '0',
    priority: interAgencyRequestForm.priorities[0],
    reason: '',
  });
  const [stagedRequests, setStagedRequests] = useState([]);
  const chartHeight = 100;
  const stockPath = buildTrendPath(resourceTrend.currentStock, resourceTrend.yMax, chartHeight);
  const stockArea = buildTrendArea(resourceTrend.currentStock, resourceTrend.yMax, chartHeight);
  const demandPath = buildTrendPath(resourceTrend.projectedDemand, resourceTrend.yMax, chartHeight);
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
    <div className="resources-page">
      <section className="hero-panel resource-hero">
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
      </section>

      {status === 'error' && (
        <p className="feed-warning">
          SCDF public resource feed unavailable ({error}). Showing planning defaults.
        </p>
      )}

      <section className="resource-alert-banner resource-alert-banner-full">
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
      </section>

      <section className="resource-summary-grid">
        {summaryCards.map((card) => (
          <article key={card.label} className="resource-summary-card">
            <div className="resource-card-top">
              <span className={`resource-icon icon-${resourceSymbol(card.icon)}`} aria-hidden="true" />
              <span className={`resource-change tone-${card.tone}`}>{card.change}</span>
            </div>
            <h3>{card.label}</h3>
            <p className="resource-card-value">{card.value}</p>
            <p className="resource-card-detail">{card.detail}</p>
          </article>
        ))}
      </section>

      <section className="resource-main-grid">
        <div className="resource-left-column">
          <section className="panel resource-chart-panel">
            <div className="resource-chart-heading">
              <div>
                <h2>{resourceTrend.title}</h2>
                <p>{resourceTrend.subtitle}</p>
              </div>
              <button
                type="button"
                className="ghost-button compact-button"
                onClick={() => setResourceNotice(`${resourceTrend.timeframe} trend window selected.`)}
              >
                {resourceTrend.timeframe}
              </button>
            </div>

            <div className="resource-chart-shell">
              <div className="resource-axis-column">
                {[6000, 4500, 3000, 1500, 0].map((tick) => (
                  <span key={tick}>{tick}</span>
                ))}
              </div>

              <div className="resource-chart-stage">
                <div className="resource-grid-lines" aria-hidden="true">
                  {[0, 1, 2, 3, 4].map((line) => (
                    <span key={line} />
                  ))}
                </div>

                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="resource-chart-svg">
                  <path d={stockArea} className="resource-area-fill" />
                  <path d={stockPath} className="resource-line stock-line" />
                  <path d={demandPath} className="resource-line demand-line" />
                </svg>

                <div className="resource-x-axis">
                  {resourceTrend.labels.map((label) => (
                    <span key={label}>{label}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="resource-chart-legend">
              <span className="legend-inline">
                <span className="legend-dot stock" aria-hidden="true" />
                Current Stock
              </span>
              <span className="legend-inline">
                <span className="legend-dot demand" aria-hidden="true" />
                Projected Demand
              </span>
            </div>
          </section>

          <section className="panel resource-ledger-panel">
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
          </section>

        </div>

        <aside className="resource-right-column">
          <section className="resource-request-panel">
            <div className="section-heading light">
              <div>
                <h2>{interAgencyRequestForm.title}</h2>
                <p>{interAgencyRequestForm.subtitle}</p>
              </div>
            </div>

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
                    <span className="ledger-status status-dispatched">{request.priority}</span>
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
