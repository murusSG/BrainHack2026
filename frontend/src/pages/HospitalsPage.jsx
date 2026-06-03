import {
  hospitalTrackerMeta,
} from '../data/dashboardData';
import { useHospitalData } from '../hooks/useHospitalData';

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
  const {
    status,
    error,
    summaryCards,
    facilityCards,
    registryRows,
    liveOccupancyCount,
    liveReferenceCount,
  } = useHospitalData();
  const hasLiveData = liveOccupancyCount > 0 || liveReferenceCount > 0;
  const syncLabel =
    status === 'loading'
      ? 'Syncing public data'
      : hasLiveData
        ? `${liveOccupancyCount + liveReferenceCount} live records`
        : 'Planning fallback';

  return (
    <div className="hospitals-page">
      <section className="hero-panel hospital-hero">
        <div>
          <h1>{hospitalTrackerMeta.title}</h1>
          <p className="hero-copy">{hospitalTrackerMeta.subtitle}</p>
        </div>
        <div className="hero-actions">
          <span className="pill">{syncLabel}</span>
          <button type="button" className="ghost-button">
            {hospitalTrackerMeta.filterLabel}
          </button>
          <button type="button" className="primary-button">
            {hospitalTrackerMeta.broadcastLabel}
          </button>
        </div>
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
          />
        </label>

        <div className="hospital-toolbar-actions">
          <button type="button" className="hospital-pill-button">
            <span className="transfer-count">{liveReferenceCount || 3}</span>
            {liveReferenceCount ? 'Reference Records' : hospitalTrackerMeta.pendingTransfers}
          </button>
          <button type="button" className="ghost-button">
            {hospitalTrackerMeta.exportLabel}
          </button>
        </div>
      </section>

      <section className="hospital-cards-grid">
        {facilityCards.map((facility) => (
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

            <div className="hospital-card-actions">
              <button type="button" className="ghost-button hospital-card-button">
                Details
              </button>
              <button type="button" className="primary-button hospital-card-button">
                Transfer
              </button>
            </div>
          </article>
        ))}
      </section>

      <section className="panel facility-registry-panel">
        <div className="facility-registry-head">
          <h2>{hospitalTrackerMeta.registryTitle}</h2>
          <button type="button" className="inline-link">
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
                <span className="registry-level-pill">{facility.traumaCenter}</span>
              </span>
              <button type="button" className="inline-link registry-manage-link">
                Manage
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
