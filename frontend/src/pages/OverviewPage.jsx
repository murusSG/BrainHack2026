import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { AgencyFeedPanel } from '../components/AgencyFeedPanel';
import { AllocationApprovalPanel } from '../components/AllocationApprovalPanel';
import { ForesightEngine } from '../components/ForesightEngine';
import { MetricCard } from '../components/MetricCard';
import { QuickActionsPanel } from '../components/QuickActionsPanel';
import { RecommendationPanel } from '../components/RecommendationPanel';
import { TimelinePanel } from '../components/TimelinePanel';
import {
  dataSources,
  dorsconStatus,
  quickActions,
  recommendations,
  roleViews,
  topStats
} from '../data/dashboardData';
import { useEvents } from '../hooks/useEvents';
import { api } from '../services/api';
import {
  CHECK_IN_OPTIONS,
  readResidentCheckins,
  summarizeResidentCheckins,
} from '../utils/residentCheckins';

export function OverviewPage() {
  const navigate = useNavigate();
  const { events, status } = useEvents();
  const [foresightRecommendation, setForesightRecommendation] = useState(null);
  const [commandTimeline, setCommandTimeline] = useState([]);
  const [commandStateStatus, setCommandStateStatus] = useState('loading');
  const [activeQuickAction, setActiveQuickAction] = useState(null);
  const [guidelinesVisible, setGuidelinesVisible] = useState(false);
  const [residentCheckins, setResidentCheckins] = useState(() => readResidentCheckins());
  const demoEventCount = events.filter((event) => event.isDemo).length;
  const liveEventCount = events.length - demoEventCount;
  const activeIncidentDelta =
    status === 'loading'
      ? 'Syncing live feeds'
      : status === 'error'
        ? 'Demo fallback active'
        : `${liveEventCount} live + ${demoEventCount} demo`;
  const overviewStats = topStats.map((stat) =>
    stat.label === 'Active incidents'
      ? {
          ...stat,
          value: String(events.length),
          delta: activeIncidentDelta,
          loading: status === 'loading',
        }
      : stat
  );

  async function refreshCommandState() {
    try {
      const [allocations, timeline] = await Promise.all([
        api.commandAllocations(),
        api.commandTimeline(),
      ]);
      setForesightRecommendation(allocations[0] ?? null);
      setCommandTimeline(timeline ?? []);
      setCommandStateStatus('done');
    } catch {
      setCommandStateStatus('error');
    }
  }

  useEffect(() => {
    refreshCommandState();
  }, []);

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

  const residentCheckinSummary = summarizeResidentCheckins(residentCheckins);

  async function handleStageAction(action) {
    const recommendation = buildForesightRecommendation(action);
    setForesightRecommendation(recommendation);
    requestAnimationFrame(() => {
      document.getElementById('dispatcher-review-queue')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
    try {
      const saved = await api.createCommandAllocation(recommendation);
      setForesightRecommendation(saved);
      const timeline = await api.commandTimeline();
      setCommandTimeline(timeline ?? []);
      setCommandStateStatus('done');
    } catch {
      setCommandStateStatus('error');
    }
  }

  async function handleAgencyStatusChange(recommendationId, agencyIds, status) {
    try {
      const saved = await api.updateCommandAllocationAgencies(recommendationId, {
        agencyIds,
        status,
      });
      setForesightRecommendation(saved);
      const timeline = await api.commandTimeline();
      setCommandTimeline(timeline ?? []);
      setCommandStateStatus('done');
      return saved;
    } catch {
      setCommandStateStatus('error');
      return null;
    }
  }

  function handleQuickAction(action) {
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
  }

  return (
    <div className="overview-page">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">One Single Source of Truth</p>
          <h1>Emergency Overview</h1>
          <p className="hero-copy">
            A command surface for one crisis picture: predict what escalates, allocate resources
            early, and keep responders and residents aligned from the same verified feed.
          </p>
        </div>
        <div className="hero-actions">
          <a href="#foresight-engine" className="primary-button hero-action-link">
            Review Foresight
          </a>
          <Link to="/incident-map" className="ghost-button hero-action-link">
            Incident Map
          </Link>
        </div>
      </section>

      <section className={`status-banner panel status-banner-${dorsconStatus.level}`}>
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
      </section>

      <section className="stats-grid">
        {overviewStats.map((stat) => (
          <MetricCard key={stat.label} {...stat} />
        ))}
      </section>

      <section className="resident-response-panel panel" aria-label="Resident response summary">
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
      </section>

      <ForesightEngine onStageAction={handleStageAction} />

      <section className="content-grid">
        <div className="left-column">
          <TimelinePanel commandItems={commandTimeline} />
          <AgencyFeedPanel />
        </div>
        <div className="right-column">
          <RecommendationPanel recommendations={recommendations} />
          <AllocationApprovalPanel
            recommendation={foresightRecommendation ?? undefined}
            commandStateStatus={commandStateStatus}
            onAgencyStatusChange={handleAgencyStatusChange}
          />
        </div>
      </section>

      <section className="overview-support-grid">
        <QuickActionsPanel
          actions={quickActions}
          activeAction={activeQuickAction}
          onAction={handleQuickAction}
        />

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

function buildForesightRecommendation(action) {
  const owner = action.owner ?? 'Command';
  const supportAgencies = agenciesForOwner(owner);
  return {
    id: `FORESIGHT-${Date.now()}`,
    incidentId: 'FORESIGHT',
    incidentTitle: action.linkedPrediction,
    severity: severityForAllocation(action.severity),
    confidence: action.confidence ?? 72,
    generatedAt: 'just now',
    generatedFrom: 'Generated from Foresight staged action',
    linkedPrediction: action.linkedPrediction,
    modelVersion: 'MURUS-FORESIGHT-ALLOC-1.0',
    triggerSignals: [
      `Forecast source: ${action.source}`,
      `Recommended owner: ${owner}`,
      action.evidence?.[0] ?? 'Deterministic Foresight signal selected by command',
    ],
    draftMessage:
      `Foresight has staged the following action for dispatcher review: ${sentence(action.title)} ` +
      `Please confirm agency availability and response window for ${action.linkedPrediction}.`,
    agencies: supportAgencies.map((agency, index) => ({
      id: agency.id,
      agency: agency.agency,
      channel: agency.channel,
      confidence: Math.max(62, (action.confidence ?? 74) - index * 6),
      reason: agency.reason(action),
      suggestedAction: agency.suggestedAction(action),
      status: 'pending_approval',
    })),
  };
}

function agenciesForOwner(owner) {
  const common = {
    command: {
      id: 'command',
      agency: 'CMD',
      channel: 'Ops Command',
      reason: () => 'Command review is required before operational tasking is issued.',
      suggestedAction: (action) => `Approve staged action: ${action.title}`,
    },
  };

  const catalog = {
    NEA: [
      {
        id: 'nea',
        agency: 'NEA',
        channel: 'Public Health / Environmental Ops',
        reason: (action) => `${action.linkedPrediction} is owned by NEA signal context.`,
        suggestedAction: (action) => action.title,
      },
      common.command,
    ],
    PUB: [
      {
        id: 'pub',
        agency: 'PUB',
        channel: 'Drainage Ops',
        reason: (action) => `${action.linkedPrediction} indicates flood or water-risk escalation.`,
        suggestedAction: (action) => action.title,
      },
      {
        id: 'lta',
        agency: 'LTA',
        channel: 'Traffic Ops',
        reason: () => 'Traffic diversion may be required if access routes degrade.',
        suggestedAction: () => 'Prepare diversion messaging and route control support.',
      },
      common.command,
    ],
    LTA: [
      {
        id: 'lta',
        agency: 'LTA',
        channel: 'Traffic Ops',
        reason: (action) => `${action.linkedPrediction} may affect responder routing.`,
        suggestedAction: (action) => action.title,
      },
      common.command,
    ],
    MOH: [
      {
        id: 'moh',
        agency: 'MOH',
        channel: 'Healthcare Ops',
        reason: (action) => `${action.linkedPrediction} may affect hospital or care capacity.`,
        suggestedAction: (action) => action.title,
      },
      {
        id: 'scdf',
        agency: 'SCDF',
        channel: 'Emergency Medical Dispatch',
        reason: () => 'Ambulance or field response posture may need adjustment.',
        suggestedAction: () => 'Confirm ambulance routing and standby status.',
      },
      common.command,
    ],
  };

  return catalog[owner] ?? [common.command];
}

function severityForAllocation(severity) {
  if (severity === 'critical' || severity === 'danger') return 'critical';
  if (severity === 'warning' || severity === 'high') return 'high';
  return 'medium';
}

function sentence(value = '') {
  const text = value.trim();
  if (!text) return '';
  return /[.!?]$/.test(text) ? text : `${text}.`;
}
