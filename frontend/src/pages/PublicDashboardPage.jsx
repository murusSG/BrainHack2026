import { useState } from 'react';
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
import { AppLogo } from '../components/AppLogo';
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

export function PublicDashboardPage({
  onReturnToOps,
  embedded = false,
  mobileView = false,
  showBackButton = true,
}) {
  const [isReportFormOpen, setIsReportFormOpen] = useState(false);
  const [reportText, setReportText] = useState('');
  const [reportStatus, setReportStatus] = useState('idle');
  const [reportError, setReportError] = useState('');
  const [reportResult, setReportResult] = useState(null);

  async function handleReportSubmit(event) {
    event.preventDefault();

    const trimmedReport = reportText.trim();
    if (!trimmedReport) {
      setReportStatus('error');
      setReportError('Please describe what you are seeing before submitting.');
      return;
    }

    setReportStatus('submitting');
    setReportError('');

    try {
      const result = await api.reportIncident({
        report_text: trimmedReport,
        reported_at: new Date().toISOString(),
        source: 'public',
      });
      setReportResult(result);
      setReportStatus('success');
      setReportText('');
    } catch (error) {
      setReportStatus('error');
      setReportError(error instanceof Error ? error.message : 'Could not submit your report.');
    }
  }

  const reportResultTone =
    reportResult?.status === 'needs_manual_review' ? 'warning' : 'success';

  return (
    <div
      className={[
        'public-shell',
        embedded ? 'public-shell--embedded' : '',
        mobileView ? 'public-shell--mobile' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <aside className="public-sidebar">
        <div className="public-brand">
          <AppLogo variant="public" />
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

      </aside>

      <div className="public-main-shell">
        <header className="public-topbar">
          {showBackButton && onReturnToOps ? (
            <button type="button" className="public-topbar-back" onClick={() => onReturnToOps?.()}>
              Back to Overview
            </button>
          ) : null}
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

          <div className="public-report-cta-row">
            <button
              type="button"
              className="public-primary-button public-report-cta"
              aria-expanded={isReportFormOpen}
              onClick={() => {
                setIsReportFormOpen((current) => !current);
                setReportError('');
              }}
            >
              {publicDashboardMeta.reportLabel}
              <span>{publicDashboardMeta.reportCopy}</span>
            </button>
          </div>

          {isReportFormOpen ? (
            <form className="public-report-form" onSubmit={handleReportSubmit}>
              <label>
                What is happening?
                <textarea
                  name="public-incident-report"
                  value={reportText}
                  onChange={(event) => {
                    setReportText(event.target.value);
                    if (reportStatus === 'error') setReportError('');
                  }}
                  placeholder="Describe what you are seeing, where it is happening, and whether anyone needs urgent help."
                />
              </label>
              <div className="public-advisory-actions">
                <button type="submit" className="public-primary-button" disabled={reportStatus === 'submitting'}>
                  {reportStatus === 'submitting' ? 'Submitting...' : 'Submit to Command'}
                </button>
                <button
                  type="button"
                  className="public-outline-button"
                  onClick={() => {
                    setIsReportFormOpen(false);
                    setReportError('');
                  }}
                >
                  Cancel
                </button>
              </div>
              <p className="public-privacy-note">
                MURUS will assess this report with the command-side AI workflow and route it for
                dispatcher approval before any operational action is taken.
              </p>
              {reportError ? <p className="public-report-error">{reportError}</p> : null}
              {reportResult ? (
                <div className={`public-report-result ${reportResultTone === 'warning' ? 'warning' : ''}`}>
                  <strong>
                    {reportResult.status === 'needs_manual_review'
                      ? 'Report queued for dispatcher review'
                      : 'Report sent to command'}
                  </strong>
                  <p>{reportResult.message || 'Your report has been added to the command review flow.'}</p>
                  <span>Incident ID: {reportResult.incident_id}</span>
                </div>
              ) : null}
            </form>
          ) : null}

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
