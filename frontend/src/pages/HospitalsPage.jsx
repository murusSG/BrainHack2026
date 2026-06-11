import {
  hospitalTrackerMeta,
} from '../data/dashboardData';
import { useHospitalData } from '../hooks/useHospitalData';
import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';

function hospitalSymbol(icon) {
  if (icon === 'alert') {
    return 'alert';
  }

  if (icon === 'ventilator') {
    return 'ventilator';
  }

  if (icon === 'facility') {
    return 'facility';
  }

  return 'beds';
}

function FacilityMetric({ label, data }) {
  return (
    <div className="facility-metric">
      <div className="facility-metric-head">
        <span>{label}</span>
        <span className={data.tone === 'critical' ? 'metric-critical' : ''}>
          {data.used} / {data.total} ({data.percent}%)
        </span>
      </div>
      <div className="facility-progress">
        <span
          className={`facility-progress-bar ${data.tone === 'critical' ? 'critical' : 'normal'}`}
          style={{ width: `${data.percent}%` }}
        />
      </div>
    </div>
  );
}

export function HospitalsPage() {
  const location = useLocation();
  const {
    status,
    error,
    summaryCards,
    facilityCards,
    registryRows,
    liveOccupancyCount,
    liveReferenceCount,
  } = useHospitalData();
  const [query, setQuery] = useState(() => new URLSearchParams(location.search).get('q') ?? '');
  const [activeFilter, setActiveFilter] = useState('all');
  const [transferFacility, setTransferFacility] = useState(null);
  const [hospitalNotice, setHospitalNotice] = useState('Hospital desk ready for capacity review.');
  const filterOptions = ['all', 'critical', 'warning', 'central', 'west', 'north', 'east'];
  const hasLiveData = liveOccupancyCount > 0 || liveReferenceCount > 0;
  const syncLabel =
    status === 'loading'
      ? 'Syncing public data'
      : hasLiveData
        ? `${liveOccupancyCount + liveReferenceCount} live records`
        : 'Planning fallback';
  const filteredFacilityCards = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return facilityCards.filter((facility) => {
      const matchesFilter =
        activeFilter === 'all' ||
        facility.tone === activeFilter ||
        facility.region.toLowerCase().includes(activeFilter);
      const searchable = [
        facility.name,
        facility.region,
        facility.status,
        facility.directLine,
        facility.ventilators,
      ]
        .join(' ')
        .toLowerCase();

      return matchesFilter && (!normalizedQuery || searchable.includes(normalizedQuery));
    });
  }, [activeFilter, facilityCards, query]);

  const selectedFacilityName = transferFacility?.name ?? filteredFacilityCards[0]?.name;

  return (
    <div className="hospitals-page">
      <section className="hero-panel hospital-hero">
        <div>
          <h1>{hospitalTrackerMeta.title}</h1>
          <p className="hero-copy">{hospitalTrackerMeta.subtitle}</p>
        </div>
        <div className="hero-actions">
          <span className="pill">{syncLabel}</span>
          <label className="hospital-filter-select">
            <span className="sr-only">{hospitalTrackerMeta.filterLabel}</span>
            <select
              aria-label={hospitalTrackerMeta.filterLabel}
              value={activeFilter}
              onChange={(event) => {
                const nextFilter = event.target.value;
                setActiveFilter(nextFilter);
                setHospitalNotice(`Hospital filter set to ${filterLabel(nextFilter)}.`);
              }}
            >
              {filterOptions.map((option) => (
                <option key={option} value={option}>
                  {filterLabel(option)}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="primary-button"
            onClick={() =>
              setHospitalNotice(`Capacity broadcast staged for ${selectedFacilityName ?? 'current view'}.`)
            }
          >
            {hospitalTrackerMeta.broadcastLabel}
          </button>
        </div>
        {hospitalNotice !== 'Hospital desk ready for capacity review.' && (
          <p className="hospital-notice">{hospitalNotice}</p>
        )}
      </section>

      {status === 'error' && (
        <p className="feed-warning">
          Hospital public datasets unavailable ({error}). Showing planning defaults.
        </p>
      )}

      <section className="hospital-summary-grid">
        {summaryCards.map((card) => (
          <article key={card.label} className="hospital-summary-card">
            <div className="hospital-summary-inner">
              <span className={`hospital-icon icon-${hospitalSymbol(card.icon)} tone-${card.tone}`} aria-hidden="true" />
              <div>
                <p className="hospital-summary-label">{card.label}</p>
                <p className={`hospital-summary-value ${card.tone === 'critical' ? 'critical' : ''}`}>
                  {card.value}
                </p>
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="hospital-toolbar">
        <label className="hospital-search">
          <span className="searchbar-icon" aria-hidden="true">
            +
          </span>
          <input
            type="text"
            placeholder={hospitalTrackerMeta.searchPlaceholder}
            aria-label="Search hospitals"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>

        <div className="hospital-toolbar-actions">
          <button
            type="button"
            className="hospital-pill-button"
            onClick={() => {
              setActiveFilter('all');
              setHospitalNotice('Reference and transfer view reset to all facilities.');
            }}
          >
            <span className="transfer-count">{liveReferenceCount || 3}</span>
            {liveReferenceCount ? 'Reference Records' : hospitalTrackerMeta.pendingTransfers}
          </button>
          <button
            type="button"
            className="ghost-button"
            onClick={() => setHospitalNotice('Hospital capacity export staged for current filters.')}
          >
            {hospitalTrackerMeta.exportLabel}
          </button>
        </div>
      </section>

      <section className="hospital-cards-grid">
        {filteredFacilityCards.map((facility) => (
          <article key={facility.name} className="hospital-card">
            <div className="hospital-card-header">
              <div>
                <h2>{facility.name}</h2>
                <p className="hospital-region">{facility.region}</p>
              </div>
              <span className={`hospital-status status-${facility.tone}`}>{facility.status}</span>
            </div>

            <FacilityMetric label="General Beds" data={facility.generalBeds} />
            <FacilityMetric label="ICU Units" data={facility.icuUnits} />

            <div className="hospital-info-row">
              <div className="hospital-info-box">
                <p>Ventilators</p>
                <strong>{facility.ventilators}</strong>
              </div>
              <div className="hospital-info-box">
                <p>Direct Line</p>
                <strong>{facility.directLine}</strong>
              </div>
            </div>

            <div className="hospital-card-actions hospital-card-actions--centered">
              <button
                type="button"
                className="primary-button hospital-card-button"
                onClick={() => {
                  setTransferFacility(facility);
                  setHospitalNotice(`Transfer request staged for ${facility.name}.`);
                }}
              >
                Transfer
              </button>
            </div>
          </article>
        ))}
        {filteredFacilityCards.length === 0 && (
          <p className="hospital-empty-state">No facilities match this view.</p>
        )}
      </section>

      <section className="panel facility-registry-panel">
        <div className="facility-registry-head">
          <h2>{hospitalTrackerMeta.registryTitle}</h2>
          <button
            type="button"
            className="inline-link"
            onClick={() => setHospitalNotice('Full specialized registry staged for review.')}
          >
            {hospitalTrackerMeta.registryAction}
          </button>
        </div>

        <div className="facility-registry-table">
          <div className="facility-registry-row facility-registry-header">
            <span>Facility Name</span>
            <span>Type</span>
            <span>Isolation Units</span>
            <span>Dialysis Stations</span>
            <span>Trauma Center</span>
            <span>Actions</span>
          </div>

          {registryRows.map((facility) => (
            <div key={facility.name} className="facility-registry-row">
              <span className="ledger-strong">{facility.name}</span>
              <span>
                <span className="registry-type-pill">{facility.type}</span>
              </span>
              <span>{facility.isolationUnits}</span>
              <span>{facility.dialysisStations}</span>
              <span>
                <span className={`registry-level-pill ${traumaLevelClass(facility.traumaCenter)}`}>
                  {facility.traumaCenter}
                </span>
              </span>
              <button
                type="button"
                className="inline-link registry-manage-link"
                onClick={() => setHospitalNotice(`${facility.name} registry row selected.`)}
              >
                Manage
              </button>
            </div>
          ))}
        </div>
      </section>

      {transferFacility && (
        <div className="hospital-panel-overlay" role="dialog" aria-modal="true" aria-label={`Transfer from ${transferFacility.name}`}>
          <section className="hospital-detail-panel panel">
            <div className="hospital-panel-header">
              <div>
                <h2>Transfer from {transferFacility.name}</h2>
                <p className="hospital-region">{transferFacility.region}</p>
              </div>
              <button type="button" className="ghost-button" onClick={() => setTransferFacility(null)}>Close</button>
            </div>
            <div className="hospital-panel-body">
              <p className="hospital-panel-notice">General Beds: {transferFacility.generalBeds.used} / {transferFacility.generalBeds.total} occupied</p>
              <form className="hospital-transfer-form" onSubmit={(e) => {
                e.preventDefault();
                setHospitalNotice(`Transfer from ${transferFacility.name} staged for dispatcher review.`);
                setTransferFacility(null);
              }}>
                <label className="resource-field full">
                  <span>Patient Count</span>
                  <input type="number" min="1" defaultValue="1" />
                </label>
                <label className="resource-field full">
                  <span>Priority</span>
                  <select defaultValue="High">
                    <option>Critical</option>
                    <option>High</option>
                    <option>Medium</option>
                  </select>
                </label>
                <label className="resource-field full">
                  <span>Reason</span>
                  <textarea rows="3" placeholder="Describe the transfer reason..." />
                </label>
                <button type="submit" className="primary-button">Stage Transfer</button>
              </form>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function filterLabel(filter) {
  if (filter === 'all') return 'all facilities';
  if (filter === 'west') return 'west region';
  if (filter === 'central') return 'central region';
  return filter;
}

function traumaLevelClass(level) {
  if (!level || level === 'N/A') return 'level-na';
  return `level-${level.replace(/\s+/g, '-').toLowerCase()}`;
}
