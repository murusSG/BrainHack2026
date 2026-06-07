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
  quickActions,
  recommendations,
  roleViews,
  topStats
} from '../data/dashboardData';
import { useEvents } from '../hooks/useEvents';
import { api } from '../services/api';

export function OverviewPage({ session }) {
  const navigate = useNavigate();
  const { events, status } = useEvents();
  const [foresightRecommendation, setForesightRecommendation] = useState(null);
  const [commandTimeline, setCommandTimeline] = useState([]);
  const [commandStateStatus, setCommandStateStatus] = useState('loading');
  const [quickActionNotice, setQuickActionNotice] = useState('Command shortcuts ready.');
  const [activeQuickAction, setActiveQuickAction] = useState(null);
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

  async function handleStageAction(action) {
    const recommendation = buildForesightRecommendation(action);
    setForesightRecommendation(recommendation);
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
    if (action.label !== 'Broadcast Emergency Alert') {
      setQuickActionNotice(`${action.label} staged in the command workspace.`);
      return;
    }

    setQuickActionNotice('Opening resident alert composer for command review.');
    navigate('/alerts', {
      state: {
        openResidentAlertComposer: true,
        residentAlertDraft: {
          title: 'Emergency advisory for Toa Payoh residents',
          body: 'Localised flood risk is elevated. Avoid low-lying walkways, basement access, and flooded road edges.',
          publicAction: 'Avoid flood-prone paths and use alternate routes until agencies issue all-clear.',
          severity: 'danger',
          locationLabel: 'Toa Payoh',
          lat: '1.3343',
          lng: '103.8563',
          radiusMeters: '1800',
        },
      },
    });
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

      <section className="stats-grid">
        {overviewStats.map((stat) => (
          <MetricCard key={stat.label} {...stat} />
        ))}
      </section>

      <ForesightEngine onStageAction={handleStageAction} />

      <section className="status-banner panel">
        <div className="status-mark" />
        <div className="status-content">
          <p className="status-title">Current Status: Code Orange</p>
          <p className="status-text">
            Moderate risk of widespread transmission. Public health measures remain at Stage 2.
            Frontline units are on standby while Jurong West and Toa Payoh run elevated watch.
          </p>
          <p className="quick-action-status">{quickActionNotice}</p>
        </div>
        <div className="status-meta">
          <span className="pill">Updated 2m ago</span>
          <button
            type="button"
            className="inline-link"
            onClick={() => setQuickActionNotice('Response guideline snapshot loaded.')}
          >
            View guidelines
          </button>
        </div>
      </section>

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
