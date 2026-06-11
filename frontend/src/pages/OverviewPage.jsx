import { Link, useNavigate } from 'react-router-dom';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ForesightEngine } from '../components/ForesightEngine';
import { MetricCard } from '../components/MetricCard';
import { QuickActionsPanel } from '../components/QuickActionsPanel';
import { TimelinePanel } from '../components/TimelinePanel';
import { ScreenHeader, ScreenPage, ScreenPanel } from '../components/ui';
import {
  dataSources,
  dorsconStatus,
  quickActions,
  topStats
} from '../data/dashboardData';
import { useEvents } from '../hooks/useEvents';
import {
  CHECK_IN_OPTIONS,
  readResidentCheckins,
  summarizeResidentCheckins,
} from '../utils/residentCheckins';

export function OverviewPage() {
  const navigate = useNavigate();
  const { events, status } = useEvents();
  const [activeQuickAction, setActiveQuickAction] = useState(null);
  const [guidelinesVisible, setGuidelinesVisible] = useState(false);
  const [residentCheckins, setResidentCheckins] = useState(() => readResidentCheckins());
  const { demoEventCount, liveEventCount } = useMemo(() => {
    const demoCount = events.filter((event) => event.isDemo).length;
    return {
      demoEventCount: demoCount,
      liveEventCount: events.length - demoCount,
    };
  }, [events]);
  const activeIncidentDelta = useMemo(() => {
    if (status === 'loading') return 'Syncing live feeds';
    if (status === 'error') return 'Demo fallback active';
    return `${liveEventCount} live + ${demoEventCount} demo`;
  }, [demoEventCount, liveEventCount, status]);
  const overviewStats = useMemo(
    () =>
      topStats.map((stat) =>
        stat.label === 'Active incidents'
          ? {
              ...stat,
              value: String(events.length),
              delta: activeIncidentDelta,
              loading: status === 'loading',
            }
          : stat
      ),
    [activeIncidentDelta, events.length, status]
  );

  useEffect(() => {
    function refreshResidentCheckins() {
      setResidentCheckins(readResidentCheckins());
    }

    window.addEventListener('storage', refreshResidentCheckins);
    window.addEventListener('murusResidentCheckinsUpdated', refreshResidentCheckins);

    return () => {
      window.removeEventListener('storage', refreshResidentCheckins);
      window.removeEventListener('murusResidentCheckinsUpdated', refreshResidentCheckins);
    };
  }, []);

  const residentCheckinSummary = useMemo(
    () => summarizeResidentCheckins(residentCheckins),
    [residentCheckins]
  );

  const handleQuickAction = useCallback((action) => {
    setActiveQuickAction(action.label);
    if (action.label === 'Create New Incident') {
      navigate('/dispatcher', {
        state: {
          quickActionNotice:
            'Create new incident selected from Overview. Review the priority queue or capture the incoming responder report.',
        },
      });
      return;
    }

    if (action.label === 'Broadcast Emergency Alert') {
      navigate('/alerts', {
        state: {
          openResidentAlertComposer: true,
          residentAlertDraft: {
            title: 'Emergency advisory for Orchard Road residents',
            body: 'Flash flooding has been reported near Orchard Road.',
            publicAction: 'Use Somerset MRT exits and avoid basement links until further notice.',
            severity: 'danger',
            locationLabel: 'Orchard Road',
            lat: '1.3048',
            lng: '103.8318',
            radiusMeters: '1200',
          },
        },
      });
      return;
    }

    if (action.label === 'Request Resource Transfer') {
      navigate('/resources', {
        state: {
          quickActionNotice:
            'Resource transfer shortcut selected from Overview. Complete the inter-agency request for dispatcher review.',
          requestForm: {
            resourceType: 'Mobile Water Pumps',
            quantity: '2',
            priority: 'High',
            reason: 'Overview quick action: active sector requires additional support.',
          },
        },
      });
    }
  }, [navigate]);

  return (
    <ScreenPage className="overview-page">
      <ScreenHeader
        as="section"
        className="hero-panel"
        visual="mbs"
        visualVariant="subtleBackground"
        visualPosition="centerRight"
        visualIntensity="subtle"
      >
        <div>
          <p className="eyebrow">National crisis picture</p>
          <h1>Emergency Overview</h1>
          <p className="hero-copy">
            A command surface for one crisis picture: predict what escalates, allocate resources
            early, and keep responders and residents aligned from the same verified feed.
          </p>
          <div className="hero-signal-row" aria-label="Operational principles">
            <span><strong>01</strong> Verify signals</span>
            <span><strong>02</strong> Coordinate agencies</span>
            <span><strong>03</strong> Inform residents</span>
          </div>
        </div>
        <div className="hero-actions">
          <a href="#foresight-engine" className="primary-button hero-action-link">
            Review Foresight
          </a>
          <Link to="/incident-map" className="ghost-button hero-action-link">
            Incident Map
          </Link>
        </div>
      </ScreenHeader>

      <ScreenPanel
        className={`status-banner panel status-banner-${dorsconStatus.level}`}
        tone="warning"
        visual="flyer"
        visualVariant="corner"
        visualPosition="bottomRight"
      >
        <div className="status-mark">Advisories</div>
        <div className="status-content">
          <p className="status-title">{dorsconStatus.commandTitle}</p>
          <p className="status-text">{dorsconStatus.summary}</p>
          <div className="status-guidelines">
            <p className="status-guideline-impact">
              <strong>Impact on daily life:</strong> {dorsconStatus.impact}
            </p>
            <div className="status-guideline-list">
              {dorsconStatus.publicAdvice.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          </div>
          {guidelinesVisible ? (
            <div className="dorscon-reference-grid">
              {dorsconStatus.referenceLevels.map((item) => (
                <article
                  key={item.level}
                  className={`dorscon-reference-card dorscon-reference-${item.level} ${
                    item.level === dorsconStatus.level ? 'active' : ''
                  }`}
                >
                  <p className="dorscon-reference-label">{item.label}</p>
                  <p className="dorscon-reference-copy">{item.summary}</p>
                </article>
              ))}
            </div>
          ) : null}
        </div>
        <div className="status-meta">
          <span className="pill">{dorsconStatus.updatedLabel}</span>
          <button
            type="button"
            className="inline-link"
            onClick={() => setGuidelinesVisible((current) => !current)}
          >
            {guidelinesVisible ? 'Hide DORSCON guide' : 'View guidelines'}
          </button>
        </div>
      </ScreenPanel>

      <section className="stats-grid">
        {overviewStats.map((stat) => (
          <MetricCard key={stat.label} {...stat} />
        ))}
      </section>

      <ScreenPanel
        className="resident-response-panel panel"
        aria-label="Resident response summary"
        visual="merlion"
        visualVariant="watermark"
        visualPosition="bottomRight"
      >
        <div className="section-heading">
          <div>
            <p className="eyebrow">Resident response loop</p>
            <h2>Live Citizen Check-Ins</h2>
          </div>
          <span className="pill">{residentCheckinSummary.total} responses</span>
        </div>
        <div className="resident-response-grid">
          {CHECK_IN_OPTIONS.map((option) => (
            <article key={option.id} className={`resident-response-card is-${option.tone}`}>
              <strong>{residentCheckinSummary.counts[option.id] ?? 0}</strong>
              <span>{option.label}</span>
            </article>
          ))}
        </div>
        {residentCheckinSummary.priority.length > 0 ? (
          <div className="resident-response-priority">
            <p>Priority assistance</p>
            {residentCheckinSummary.priority.slice(0, 3).map((checkin) => (
              <article key={checkin.id}>
                <strong>{checkin.statusLabel}</strong>
                <span>
                  {checkin.pointLabel} near {checkin.alertLocation} / {checkin.residentProfile}
                </span>
              </article>
            ))}
          </div>
        ) : (
          <p className="muted-copy">
            No residents have requested help yet. Check-ins from the resident alert page will appear here instantly.
          </p>
        )}
      </ScreenPanel>

      <ForesightEngine />

      <section className="overview-operations-grid">
        <TimelinePanel />
        <QuickActionsPanel
          actions={quickActions}
          activeAction={activeQuickAction}
          onAction={handleQuickAction}
        />
      </section>

      <section className="sources-section">
        <div className="section-heading">
          <h2>Agency Feed Synchronisation</h2>
          <span className="pill">Live ingest status</span>
        </div>
        <div className="sources-grid">
          {dataSources.map((source) => (
            <article key={source.agency} className="source-card ui-surface">
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
    </ScreenPage>
  );
}
