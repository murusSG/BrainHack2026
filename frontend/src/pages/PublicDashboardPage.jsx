import {
  publicAdvisories,
  publicAffectedAreas,
  publicDashboardMeta,
  publicLanguages,
  publicLocationIntelligence,
  publicProfessionalNotice,
  publicResources,
  publicShelters,
  publicSubscriptions,
} from '../data/dashboardData';
import { OneMapPreviewMap } from '../components/OneMapPreviewMap';
import { useState } from 'react';
import { api } from '../services/api';

const PUBLIC_MAP_POINTS = [
  {
    query: 'Kallang Basin, Singapore',
    title: 'Active Hazard Zone',
    description: 'Flood impact area under active advisory.',
    tone: 'hazard',
    radiusMeters: 900,
    fallbackLatitude: 1.3072,
    fallbackLongitude: 103.8691,
  },
  {
    query: 'Central Sports Complex, Singapore',
    title: 'Central Sports Complex',
    description: 'Nearby shelter / safe zone.',
    tone: 'safe',
    fallbackLatitude: 1.3028,
    fallbackLongitude: 103.8835,
  },
  {
    query: 'Grand Civic Plaza, Singapore',
    title: 'Grand Civic Plaza',
    description: 'Nearby shelter / safe zone.',
    tone: 'safe',
    fallbackLatitude: 1.2951,
    fallbackLongitude: 103.8553,
  },
];

function AdvisoryCard({ advisory }) {
  return (
    <article className={`public-advisory-card tone-${advisory.tone} ${advisory.expanded ? 'expanded' : ''}`}>
      <div className="public-advisory-head">
        <div>
          <p className="public-advisory-type">{advisory.type}</p>
          <h3>{advisory.title}</h3>
        </div>
      </div>

      {advisory.expanded ? (
        <div className="public-advisory-body">
          <p>{advisory.body}</p>
          <div className="public-advisory-actions">
            {advisory.actions.map((action) => (
              <button key={action} type="button" className="public-inline-button">
                {action}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </article>
  );
}

function PublicMapPreview() {
  return (
    <div className="public-map-preview">
      <OneMapPreviewMap className="public-onemap-preview" points={PUBLIC_MAP_POINTS} />
    </div>
  );
}

export function PublicDashboardPage({ onReturnToOps }) {
  const [reportFormOpen, setReportFormOpen] = useState(false);

  return (
    <div className="public-shell">
      <aside className="public-sidebar">
        <div className="public-brand">
          <div className="public-brand-mark">C</div>
          <div>
            <p className="public-brand-name">{publicDashboardMeta.brand}</p>
            <p className="public-brand-subtitle">{publicDashboardMeta.subtitle}</p>
          </div>
        </div>

        <section className="public-sidebar-section">
          <p className="public-sidebar-title">Language</p>
          <div className="public-language-list">
            {publicLanguages.map((language, index) => (
              <button key={language} type="button" className={`public-language-button ${index === 0 ? 'active' : ''}`}>
                {language}
              </button>
            ))}
          </div>
        </section>

        <section className="public-sidebar-section">
          <p className="public-sidebar-title">Relay Subscriptions</p>
          <div className="public-subscriptions">
            {publicSubscriptions.map((subscription) => (
              <label key={subscription.label} className="public-checkbox-row">
                <input type="checkbox" defaultChecked={subscription.checked} />
                <span>{subscription.label}</span>
              </label>
            ))}
          </div>
          <input className="public-contact-input" type="text" placeholder="Phone number / email" />
          <button type="button" className="public-outline-button full">
            Update Preferences
          </button>
        </section>

        <div className="public-sidebar-actions">
          <button
            type="button"
            className="public-primary-button full"
            onClick={() => setReportFormOpen((current) => !current)}
          >
            {publicDashboardMeta.reportLabel}
            <span>{publicDashboardMeta.reportCopy}</span>
          </button>
          {reportFormOpen && <PublicIncidentReportForm />}
          <button type="button" className="public-outline-button full">
            {publicDashboardMeta.tipsLabel}
            <span>{publicDashboardMeta.tipsCopy}</span>
          </button>
        </div>

        <button type="button" className="public-return-link" onClick={() => onReturnToOps?.()}>
          Return to Operations Relay
        </button>
      </aside>

      <div className="public-main-shell">
        <header className="public-topbar">
          <div className="public-breadcrumbs">
            <button type="button" className="public-topbar-back" onClick={() => onReturnToOps?.()}>
              Back to Overview
            </button>
            <span>{publicDashboardMeta.breadcrumb}</span>
            <span>{publicDashboardMeta.breadcrumbCurrent}</span>
          </div>
          <div className="public-signal-pill">{publicDashboardMeta.signal}</div>
        </header>

        <main className="public-main-content">
          <section className="public-incident-banner">
            <div className="public-banner-icon">!</div>
            <div className="public-banner-copy">
              <p>{publicDashboardMeta.incidentLevel}</p>
              <h1>{publicDashboardMeta.incidentBannerTitle}</h1>
            </div>
            <div className="public-banner-meta">
              <span>{publicDashboardMeta.lastUpdated}</span>
              <span>{publicDashboardMeta.incidentBannerNote}</span>
            </div>
          </section>

          <section className="public-overview-grid">
            <div className="public-left-column">
              <div className="public-section-heading">
                <h2>{publicDashboardMeta.advisoriesTitle}</h2>
                <span className="public-counter-pill">{publicDashboardMeta.advisoryCount}</span>
              </div>
              <div className="public-advisories-list">
                {publicAdvisories.map((advisory) => (
                  <AdvisoryCard key={advisory.title} advisory={advisory} />
                ))}
              </div>
            </div>

            <aside className="public-right-column">
              <section className="public-card public-map-card">
                <div className="public-card-head">
                  <div>
                    <h3>{publicAffectedAreas.title}</h3>
                    <p>{publicAffectedAreas.subtitle}</p>
                  </div>
                  <span className="public-mini-pill">OneMap</span>
                </div>
                <PublicMapPreview />
                <div className="public-map-legend">
                  {publicAffectedAreas.legend.map((item) => (
                    <div key={item.label} className="public-legend-item">
                      <span className={`public-legend-dot ${item.tone}`} />
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
              </section>
            </aside>
          </section>

          <section className="public-lower-grid">
            <div className="public-lower-left">
              <section className="public-card public-location-card">
                <div className="public-card-head">
                  <div>
                    <h3>{publicLocationIntelligence.title}</h3>
                    <p>
                      Showing data for: <strong>{publicLocationIntelligence.location}</strong>
                    </p>
                  </div>
                </div>
                <p className="public-chip-label">Affected neighborhoods in your vicinity:</p>
                <div className="public-chip-list">
                  {publicLocationIntelligence.chips.map((chip) => (
                    <span key={chip} className="public-location-chip">
                      {chip}
                    </span>
                  ))}
                </div>
                <div className="public-privacy-note">{publicLocationIntelligence.privacy}</div>
              </section>

              <section className="public-shelters-section">
                <div className="public-section-heading">
                  <h2>Nearby Shelters & Safe Zones</h2>
                </div>
                <div className="public-shelters-grid">
                  {publicShelters.map((shelter) => (
                    <article key={shelter.name} className="public-card public-shelter-card">
                      <div className="public-shelter-head">
                        <h3>{shelter.name}</h3>
                        <span className="public-shelter-status">{shelter.status}</span>
                      </div>
                      <div className="public-shelter-meta">
                        <span>{shelter.distance}</span>
                        <span>{shelter.capacity}</span>
                      </div>
                      <button type="button" className="public-outline-button full">
                        Get Directions
                      </button>
                    </article>
                  ))}
                </div>
              </section>
            </div>

            <aside className="public-lower-right">
              <section className="public-card public-resources-card">
                <div className="public-section-heading compact">
                  <h2>Real-time Resources</h2>
                </div>
                <div className="public-resources-list">
                  {publicResources.map((resource) => (
                    <article key={resource.title} className="public-resource-row">
                      <div>
                        <h3>{resource.title}</h3>
                        <p>{resource.detail}</p>
                      </div>
                      <span className={`public-resource-status ${resource.tone}`}>{resource.status}</span>
                    </article>
                  ))}
                </div>
              </section>

              <section className="public-card public-professional-notice">
                <h3>{publicProfessionalNotice.title}</h3>
                <p>{publicProfessionalNotice.copy}</p>
                <button type="button" className="public-outline-button full" onClick={() => onReturnToOps?.()}>
                  {publicProfessionalNotice.cta}
                </button>
              </section>
            </aside>
          </section>
        </main>
      </div>
    </div>
  );
}

function PublicIncidentReportForm() {
  const [reportText, setReportText] = useState('');
  const [status, setStatus] = useState('idle');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    const trimmed = reportText.trim();
    if (!trimmed) {
      setError('Describe what you saw before submitting.');
      return;
    }

    setStatus('submitting');
    setError('');
    try {
      const response = await api.reportIncident({
        report_text: trimmed,
        source: 'public',
        media_urls: [],
      });
      setResult(response);
      setStatus('done');
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  }

  return (
    <form className="public-report-form" onSubmit={handleSubmit}>
      <label>
        <span>Incident details</span>
        <textarea
          rows="5"
          value={reportText}
          onChange={(event) => setReportText(event.target.value)}
          placeholder="Describe the incident, visible hazards, and nearby landmarks"
        />
      </label>
      <button type="submit" className="public-primary-button full" disabled={status === 'submitting'}>
        {status === 'submitting' ? 'Submitting report' : 'Submit to command'}
      </button>
      {error && <p className="public-report-error">{error}</p>}
      {result && <PublicIncidentReportResult result={result} />}
    </form>
  );
}

function PublicIncidentReportResult({ result }) {
  if (result.status === 'grouped_with_existing_incident') {
    return (
      <div className="public-report-result">
        <strong>Grouped with {result.incident_id}</strong>
        <p>{result.message}</p>
        <span>Similarity: {Math.round((result.similarity?.confidence ?? 0) * 100)}%</span>
      </div>
    );
  }

  if (result.status === 'needs_manual_review') {
    return (
      <div className="public-report-result warning">
        <strong>Manual review required</strong>
        <p>{result.reason}</p>
      </div>
    );
  }

  const extracted = result.extracted_incident ?? {};
  const recommendations = result.recommendations ?? {};
  return (
    <div className="public-report-result">
      <strong>Created {result.incident_id}</strong>
      <p>{extracted.incident_type ?? 'Incident'} / {extracted.severity ?? 'severity pending'}</p>
      {extracted.location_text && <span>{extracted.location_text}</span>}
      <span>{result.resource_allocation_status?.replaceAll('_', ' ')}</span>
      <div className="public-report-agencies">
        {[...(recommendations.mandatory_agencies ?? []), ...(recommendations.suggested_agencies ?? [])].map(
          (agency) => (
            <span key={`${agency.agency}-${agency.reason}`}>{agency.agency}</span>
          )
        )}
      </div>
    </div>
  );
}
