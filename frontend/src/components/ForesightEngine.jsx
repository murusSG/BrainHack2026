import { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';

const baseline = {
  overflowProbability: 64,
  responseTime: 18,
  livesAtRisk: 847,
};

const fallbackPredictions = [
  {
    id: 'demo:flood-orchard',
    source: 'PUB',
    title: 'Flood risk escalating - Orchard Road',
    confidence: 73,
    horizonLabel: '40 min',
    severity: 'critical',
    recommendedAction: 'Stage QRT and prepare traffic diversion before pedestrian routes degrade.',
    publicAction: 'Avoid Orchard Road underpasses and do not enter flood water.',
    scenarioSource: 'demo_fallback',
    evidence: ['Demo PUB flood alert', '900m shopping-belt impact radius', 'High commuter density corridor'],
    narrative: {
      status: 'not_configured',
      commanderBrief:
        'Flood risk escalating - Orchard Road. Stage QRT and prepare traffic diversion before pedestrian routes degrade.',
      responderBrief:
        'Prepare for tasking: Stage QRT and prepare traffic diversion before pedestrian routes degrade.',
      residentBrief: 'Avoid Orchard Road underpasses and do not enter flood water.',
    },
  },
  {
    id: 'demo:health-woodlands',
    source: 'MOH',
    title: 'ED load pressure watch - North region',
    confidence: 68,
    horizonLabel: '2 hrs',
    severity: 'high',
    recommendedAction: 'Prepare ambulance diversion playbook and open surge-bed standby.',
    publicAction: 'Use non-emergency care channels unless symptoms are severe.',
    scenarioSource: 'demo_fallback',
    evidence: ['Demo ED surge signal', 'Medium medical event in north region', 'KTPH catchment pressure scenario'],
    narrative: {
      status: 'not_configured',
      commanderBrief:
        'ED load pressure watch - North region. Prepare ambulance diversion playbook and open surge-bed standby.',
      responderBrief:
        'Prepare for tasking: Prepare ambulance diversion playbook and open surge-bed standby.',
      residentBrief: 'Use non-emergency care channels unless symptoms are severe.',
    },
  },
  {
    id: 'demo:dengue-tampines',
    source: 'NEA',
    title: 'Dengue expansion watch - Tampines St 21',
    confidence: 81,
    horizonLabel: '3 days',
    severity: 'medium',
    recommendedAction: 'Schedule vector control sweep and push block-level source reduction advisories.',
    publicAction: 'Remove stagnant water, use repellent, and check pails, trays, and drains.',
    scenarioSource: 'demo_fallback',
    evidence: ['Demo dengue cluster', 'Street-level 320m radius', 'Vector operations scenario'],
    narrative: {
      status: 'not_configured',
      commanderBrief:
        'Dengue expansion watch - Tampines St 21. Schedule vector control sweep and push block-level source reduction advisories.',
      responderBrief:
        'Prepare for tasking: Schedule vector control sweep and push block-level source reduction advisories.',
      residentBrief: 'Remove stagnant water, use repellent, and check pails, trays, and drains.',
    },
  },
];

const fallbackLeaderBrief = {
  status: 'not_configured',
  headline: 'Command priority: maintain watch',
  summary:
    'Deterministic predictions are available, but the leader briefing layer has not produced a summary yet.',
  posture: 'routine_watch',
  priorityActions: [
    {
      label: 'Review the highest-confidence prediction.',
      owner: 'Command',
      urgency: 'monitor',
      rationale: 'Use the deterministic prediction cards as the source of truth.',
      linkedPredictionIds: [],
    },
    {
      label: 'Adjust surge beds and QRT staging to compare projected outcomes.',
      owner: 'Command',
      urgency: 'monitor',
      rationale: 'The what-if simulator shows how resource interventions affect projected outcomes.',
      linkedPredictionIds: [],
    },
  ],
  publicComms: 'No public advisory is required until a deterministic prediction crosses the action threshold.',
  uncertainty: 'Fallback brief; no generated leader summary is available yet.',
  tradeoff: 'Intervention tradeoffs will update after the Foresight endpoint responds.',
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function ForesightEngine({ onStageAction }) {
  const [surgeBeds, setSurgeBeds] = useState(0);
  const [qrtCount, setQrtCount] = useState(0);
  const [actionStatus, setActionStatus] = useState('No response action staged yet.');
  const [stagedActions, setStagedActions] = useState([]);
  const [foresight, setForesight] = useState({
    status: 'loading',
    predictions: fallbackPredictions,
    baseline,
    outcomes: baseline,
    llm: { enabled: false, status: 'not_configured' },
    leaderBrief: fallbackLeaderBrief,
    error: null,
  });

  const outcomes = useMemo(() => {
    const currentBaseline = foresight.baseline ?? baseline;
    const overflowProbability = clamp(currentBaseline.overflowProbability - surgeBeds * 0.8 - qrtCount * 3, 0, currentBaseline.overflowProbability);
    const responseTime = clamp(currentBaseline.responseTime - qrtCount * 0.15, 0, currentBaseline.responseTime);
    const livesAtRisk = clamp(currentBaseline.livesAtRisk - surgeBeds * 4 - qrtCount * 35, 0, currentBaseline.livesAtRisk);

    return {
      overflowProbability,
      responseTime,
      livesAtRisk,
    };
  }, [foresight.baseline, qrtCount, surgeBeds]);

  async function loadForesight({ nextSurgeBeds = surgeBeds, nextQrtCount = qrtCount } = {}) {
    setForesight((current) => ({ ...current, status: current.predictions?.length ? 'refreshing' : 'loading' }));
    try {
      const data = await api.foresightPredictions({ surgeBeds: nextSurgeBeds, qrtCount: nextQrtCount });
      setForesight({
        status: 'done',
        predictions: data.predictions?.length ? data.predictions : fallbackPredictions,
        baseline: data.baseline ?? baseline,
        outcomes: data.outcomes ?? baseline,
        llm: data.llm ?? { enabled: false, status: 'not_configured' },
        leaderBrief: data.leaderBrief ?? fallbackLeaderBrief,
        error: null,
      });
    } catch (err) {
      setForesight((current) => ({
        ...current,
        status: 'error',
        predictions: current.predictions?.length ? current.predictions : fallbackPredictions,
        error: err.message,
      }));
    }
  }

  useEffect(() => {
    loadForesight({ nextSurgeBeds: 0, nextQrtCount: 0 });
    // Initial load only; slider changes update deterministic outcomes locally until the user regenerates the brief.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stageAction(prediction) {
    const action = {
      id: `${prediction.id}-${Date.now()}`,
      title: prediction.recommendedAction,
      owner: ownerForPrediction(prediction),
      severity: prediction.severity,
      source: prediction.source,
      linkedPrediction: prediction.title,
      confidence: prediction.confidence,
      evidence: prediction.evidence ?? [],
      recommendedAction: prediction.recommendedAction,
      status: 'Staged for dispatcher review',
    };
    setStagedActions((current) => [action, ...current].slice(0, 5));
    setActionStatus(`${action.title} (${action.owner})`);
    onStageAction?.(action);
  }

  const predictions = foresight.predictions?.length ? foresight.predictions : fallbackPredictions;
  const leaderBrief = foresight.leaderBrief ?? fallbackLeaderBrief;
  const currentBaseline = foresight.baseline ?? baseline;
  const outcomeCards = [
    {
      label: 'ICU overflow probability at KTPH',
      value: `${Math.round(outcomes.overflowProbability)}%`,
      improved: outcomes.overflowProbability < currentBaseline.overflowProbability,
    },
    {
      label: 'Est. response time to West incidents',
      value: `${outcomes.responseTime.toFixed(1)} min`,
      improved: outcomes.responseTime < currentBaseline.responseTime,
    },
    {
      label: 'Lives-at-risk index',
      value: Math.round(outcomes.livesAtRisk).toLocaleString(),
      improved: outcomes.livesAtRisk < currentBaseline.livesAtRisk,
      trend: outcomes.livesAtRisk < currentBaseline.livesAtRisk ? 'DOWN' : null,
    },
  ];
  const llmLabel =
    foresight.llm?.status === 'generated'
      ? `LLM briefed / ${foresight.llm.model}`
      : foresight.llm?.status === 'fallback'
        ? 'LLM fallback copy'
        : 'Rules only';

  return (
    <section id="foresight-engine" className="foresight-engine panel" aria-labelledby="foresight-title">
      <div className="foresight-header">
        <div>
          <p className="eyebrow">Predictive / Next 7 days</p>
          <h2 id="foresight-title">Foresight Engine</h2>
        </div>
        <span className="foresight-beta">{llmLabel}</span>
      </div>

      <section className="foresight-leader-brief" aria-label="Leader foresight briefing">
        <div className="foresight-leader-copy">
          <div className="foresight-strip-heading">
            <h3>{leaderBrief.headline}</h3>
            <div className="foresight-brief-badges">
              <span className="pill">
                {leaderBrief.status === 'generated' ? 'LLM leader brief' : 'Deterministic fallback'}
              </span>
              <span className={`pill posture-${leaderBrief.posture ?? 'routine_watch'}`}>
                {postureLabel(leaderBrief.posture)}
              </span>
            </div>
          </div>
          <p>{leaderBrief.summary}</p>
          <p className="foresight-tradeoff">{leaderBrief.tradeoff}</p>
          <div className="foresight-brief-notes">
            <p><strong>Public comms:</strong> {leaderBrief.publicComms}</p>
            <p><strong>Uncertainty:</strong> {leaderBrief.uncertainty}</p>
          </div>
        </div>
        <div className="foresight-priority-list">
          {(leaderBrief.priorityActions ?? []).slice(0, 3).map((action, index) => (
            <article key={`${action.label ?? action}-${index}`} className="foresight-priority-item">
              <span>{index + 1}</span>
              <div>
                <p>{action.label ?? action}</p>
                {typeof action === 'object' && (
                  <small>
                    {action.owner} / {urgencyLabel(action.urgency)} / {action.rationale}
                  </small>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      <div className="foresight-block">
        <div className="foresight-strip-heading">
          <h3>Active Forecasts</h3>
          <span className="pill">
            {foresight.status === 'loading'
              ? 'Syncing predictions'
              : foresight.status === 'refreshing'
                ? 'Generating leader brief'
              : foresight.status === 'error'
                ? 'Demo fallback'
                : 'Rules first / LLM narrated'}
          </span>
        </div>
        <div className="foresight-alert-grid">
          {predictions.map((prediction) => (
            <article
              key={prediction.id}
              className={`foresight-alert foresight-${severityTone(prediction.severity)}`}
            >
              <div className="foresight-alert-top">
                <span className="foresight-alert-icon" aria-hidden="true">
                  {prediction.source}
                </span>
                <div>
                  <p className="foresight-alert-title">{prediction.title}</p>
                  <p className="foresight-alert-meta">
                    Source: {prediction.source} / {prediction.horizonLabel}
                    {prediction.scenarioSource === 'demo_fallback' ? ' / demo' : ''}
                  </p>
                </div>
              </div>
              <div className="foresight-confidence-row">
                <span>{prediction.confidence}% confidence</span>
                <span className="foresight-severity">{prediction.severity}</span>
              </div>
              <div className="foresight-progress" aria-hidden="true">
                <span style={{ width: `${prediction.confidence}%` }} />
              </div>
              <button
                type="button"
                className={`foresight-action foresight-${severityTone(prediction.severity)}`}
                onClick={() => stageAction(prediction)}
              >
                {actionLabel(prediction.recommendedAction)}
              </button>
              <p className="foresight-action-status">
                {prediction.narrative?.commanderBrief ?? prediction.recommendedAction}
              </p>
              <div className="foresight-evidence-list">
                {(prediction.evidence ?? []).slice(0, 3).map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
            </article>
          ))}
        </div>
        <p className="foresight-action-status">{actionStatus}</p>
        {stagedActions.length > 0 && (
          <section className="foresight-staged-actions" aria-label="Staged Foresight actions">
            <div className="foresight-strip-heading">
              <h3>Staged Actions</h3>
              <span className="pill">{stagedActions.length} pending</span>
            </div>
            <div className="foresight-staged-list">
              {stagedActions.map((action) => (
                <article key={action.id} className="foresight-staged-item">
                  <div>
                    <p>{action.title}</p>
                    <span>{action.owner} / {action.source} / {action.linkedPrediction}</span>
                  </div>
                  <strong>{action.status}</strong>
                </article>
              ))}
            </div>
          </section>
        )}
        {foresight.status === 'error' && (
          <p className="foresight-action-status">Backend foresight unavailable: {foresight.error}</p>
        )}
      </div>

      <div className="foresight-simulator">
        <div className="foresight-controls">
          <div className="foresight-strip-heading">
            <h3>What-if Simulator</h3>
            <button
              type="button"
              className="foresight-refresh-button"
              disabled={foresight.status === 'refreshing' || foresight.status === 'loading'}
              onClick={() => loadForesight()}
            >
              {foresight.status === 'refreshing' ? 'Generating...' : 'Generate Brief'}
            </button>
          </div>

          <label className="foresight-slider">
            <span>
              Surge beds opened at SGH
              <strong>{surgeBeds}</strong>
            </span>
            <input
              type="range"
              min="0"
              max="50"
              value={surgeBeds}
              onChange={(event) => setSurgeBeds(Number(event.target.value))}
            />
          </label>

          <label className="foresight-slider">
            <span>
              QRTs pre-positioned in West
              <strong>{qrtCount}</strong>
            </span>
            <input
              type="range"
              min="0"
              max="5"
              value={qrtCount}
              onChange={(event) => setQrtCount(Number(event.target.value))}
            />
          </label>
        </div>

        <div className="foresight-outcomes">
          {outcomeCards.map((outcome) => (
            <article
              key={outcome.label}
              className={`foresight-outcome ${outcome.improved ? 'is-improved' : 'is-baseline'}`}
            >
              <p className="foresight-outcome-value">
                {outcome.value}
                {outcome.trend && <span className="foresight-trend">{outcome.trend}</span>}
              </p>
              <p className="foresight-outcome-label">{outcome.label}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function severityTone(severity) {
  if (severity === 'critical' || severity === 'danger') return 'critical';
  if (severity === 'high' || severity === 'warning') return 'high';
  if (severity === 'medium' || severity === 'advisory') return 'medium';
  return 'low';
}

function actionLabel(action = '') {
  const text = action.split(' and ')[0].replace(/\.$/, '');
  return text.length > 22 ? `${text.slice(0, 21)}...` : text || 'Review';
}

function ownerForPrediction(prediction) {
  const riskType = prediction.riskType;
  if (riskType === 'flood_escalation') return 'PUB';
  if (riskType === 'dengue_expansion' || riskType === 'air_quality_deterioration') return 'NEA';
  if (riskType === 'traffic_disruption') return 'LTA';
  if (riskType === 'health_system_pressure') return 'MOH';
  return 'Command';
}

function postureLabel(posture = 'routine_watch') {
  const labels = {
    routine_watch: 'Routine watch',
    heightened_watch: 'Heightened watch',
    stage_resources: 'Stage resources',
    escalate_command: 'Escalate command',
  };
  return labels[posture] ?? labels.routine_watch;
}

function urgencyLabel(urgency = 'monitor') {
  const labels = {
    now: 'Act now',
    next_60_min: 'Next 60 min',
    today: 'Today',
    monitor: 'Monitor',
  };
  return labels[urgency] ?? labels.monitor;
}
