import { AgencyFeedPanel } from '../components/AgencyFeedPanel';
import { MetricCard } from '../components/MetricCard';
import { QuickActionsPanel } from '../components/QuickActionsPanel';
import { RecommendationPanel } from '../components/RecommendationPanel';
import { TimelinePanel } from '../components/TimelinePanel';
import {
  dataSources,
  predictiveSignals,
  quickActions,
  recommendations,
  roleViews,
  topStats
} from '../data/dashboardData';
import { useCrisisEvents } from '../hooks/useCrisisEvents';
import { toTimelineItem } from '../utils/crisisView';

export function OverviewPage() {
  const { events } = useCrisisEvents();

  // Newest first; cap the timeline so it stays scannable.
  const liveTimeline = [...events]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 8)
    .map(toTimelineItem);

  return (
    <div className="overview-page">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">One Single Source of Truth</p>
          <h1>Emergency Overview</h1>
          <p className="hero-copy">
            MURUS SG fuses agency telemetry, crowd intelligence, and operational capacity into one
            live command surface, reducing relay delays and helping every unit act on the same
            verified picture.
          </p>
        </div>
        <div className="hero-actions">
          <button type="button" className="ghost-button">
            Filter
          </button>
          <button type="button" className="primary-button">
            Incident Type
          </button>
        </div>
      </section>

      <section className="status-banner panel">
        <div className="status-mark" />
        <div className="status-content">
          <p className="status-title">Current Status: Code Orange</p>
          <p className="status-text">
            Moderate risk of widespread transmission. Public health measures remain at Stage 2.
            Frontline units are on standby while Jurong West and Toa Payoh run elevated watch.
          </p>
        </div>
        <div className="status-meta">
          <span className="pill">Updated 2m ago</span>
          <button type="button" className="inline-link">
            View guidelines
          </button>
        </div>
      </section>

      <section className="stats-grid">
        {topStats.map((stat) => (
          <MetricCard key={stat.label} {...stat} />
        ))}
      </section>

      <section className="content-grid">
        <div className="left-column">
          <TimelinePanel items={liveTimeline} live={liveTimeline.length > 0} />
          <AgencyFeedPanel />
        </div>
        <div className="right-column">
          <RecommendationPanel recommendations={recommendations} />
          <QuickActionsPanel actions={quickActions} />

          <div className="panel">
            <div className="section-heading">
              <h2>Predictive Signals</h2>
              <span className="pill">Historical trend model</span>
            </div>
            <div className="forecast-list">
              {predictiveSignals.map((signal) => (
                <article key={signal.title} className="forecast-card">
                  <p className="forecast-title">{signal.title}</p>
                  <p className="forecast-value">{signal.value}</p>
                  <p className="muted-copy">{signal.note}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="section-heading">
              <h2>Role-Specific Decisions</h2>
              <span className="pill">Unified outputs</span>
            </div>
            <div className="roles-list">
              {roleViews.map((view) => (
                <article key={view.role} className="role-card">
                  <p className="role-title">{view.role}</p>
                  <p className="muted-copy">{view.summary}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="section-heading">
              <h2>Unified Data Ingestion Layer</h2>
              <span className="pill">Normalised event schema</span>
            </div>
            <p className="muted-copy">
              Every incoming signal is transformed into a shared internal incident schema so
              command, field teams, hospitals, and public channels operate from the same event
              record.
            </p>
          </div>
        </div>
      </section>

      <section className="sources-section">
        <div className="section-heading">
          <h2>Agency Feed Synchronisation</h2>
          <span className="pill">Live ingest status</span>
        </div>
        <div className="sources-grid">
          {dataSources.map((source) => (
            <article key={source.agency} className="source-card">
              <div className="source-row">
                <h3>{source.agency}</h3>
                <span className={`status-chip status-${source.status.toLowerCase()}`}>
                  {source.status}
                </span>
              </div>
              <p className="muted-copy">{source.feeds}</p>
              <p className="source-latency">Latency: {source.latency}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
