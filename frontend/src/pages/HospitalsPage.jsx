import {
  hospitalFacilityCards,
  hospitalSummaryCards,
  hospitalTrackerMeta,
  specializedFacilitiesRegistry
} from '../data/dashboardData';

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

function traumaLevelClass(level) {
  if (level === 'Level 1') {
    return 'level-1';
  }

  if (level === 'Level 2') {
    return 'level-2';
  }

  if (level === 'Level 3') {
    return 'level-3';
  }

  return 'level-na';
}

function FacilityMetric({ label, data }) {
  return (
    <div className="facility-metric">
      <div className="facility-metric-head">
        <span>{label}</span>
        <span className={data.tone ? `metric-${data.tone}` : ''}>
          {data.used} / {data.total} ({data.percent}%)
        </span>
      </div>
      <div className="facility-progress">
        <span
          className={`facility-progress-bar ${data.tone ?? 'normal'}`}
          style={{ width: `${data.percent}%` }}
        />
      </div>
    </div>
  );
}

export function HospitalsPage() {
  return (
    <div className="hospitals-page">
      <section className="hero-panel hospital-hero">
        <div>
          <h1>{hospitalTrackerMeta.title}</h1>
          <p className="hero-copy">{hospitalTrackerMeta.subtitle}</p>
        </div>
        <div className="hero-actions">
          <button type="button" className="ghost-button">
            {hospitalTrackerMeta.filterLabel}
          </button>
          <button type="button" className="primary-button">
            {hospitalTrackerMeta.broadcastLabel}
          </button>
        </div>
      </section>

      <section className="hospital-summary-grid">
        {hospitalSummaryCards.map((card) => (
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
            <span className="transfer-count">3</span>
            {hospitalTrackerMeta.pendingTransfers}
          </button>
          <button type="button" className="ghost-button">
            {hospitalTrackerMeta.exportLabel}
          </button>
        </div>
      </section>

      <section className="hospital-cards-grid">
        {hospitalFacilityCards.map((facility) => (
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

          {specializedFacilitiesRegistry.map((facility) => (
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
