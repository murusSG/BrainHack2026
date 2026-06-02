import { useMemo, useState } from 'react';

const predictions = [
  {
    id: 'flood-dunearn',
    icon: '\u{1F30A}',
    title: 'Flood risk - Dunearn Rd',
    confidence: 73,
    horizon: '40 min',
    source: 'PUB',
    severity: 'critical',
    action: 'Stage QRT',
  },
  {
    id: 'call-surge-west',
    icon: '\u{1F637}',
    title: '995 call surge - West region',
    confidence: 68,
    horizon: '2 hrs',
    source: 'NEA/SCDF',
    severity: 'high',
    action: 'Advisory',
  },
  {
    id: 'dengue-tampines',
    icon: '\u{1F99F}',
    title: 'Dengue expansion - Tampines',
    confidence: 81,
    horizon: '3 days',
    source: 'NEA',
    severity: 'medium',
    action: 'Vector ops',
  },
];

const baseline = {
  overflowProbability: 64,
  responseTime: 18,
  livesAtRisk: 847,
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function ForesightEngine() {
  const [surgeBeds, setSurgeBeds] = useState(0);
  const [qrtCount, setQrtCount] = useState(0);

  const outcomes = useMemo(() => {
    const overflowProbability = clamp(
      baseline.overflowProbability - surgeBeds * 0.8 - qrtCount * 3,
      0,
      baseline.overflowProbability
    );
    const responseTime = clamp(
      baseline.responseTime - qrtCount * 0.15,
      0,
      baseline.responseTime
    );
    const livesAtRisk = clamp(
      baseline.livesAtRisk - surgeBeds * 4 - qrtCount * 35,
      0,
      baseline.livesAtRisk
    );

    return {
      overflowProbability,
      responseTime,
      livesAtRisk,
    };
  }, [surgeBeds, qrtCount]);

  const outcomeCards = [
    {
      label: 'ICU overflow probability at KTPH',
      value: `${Math.round(outcomes.overflowProbability)}%`,
      improved: outcomes.overflowProbability < baseline.overflowProbability,
    },
    {
      label: 'Est. response time to West incidents',
      value: `${outcomes.responseTime.toFixed(1)} min`,
      improved: outcomes.responseTime < baseline.responseTime,
    },
    {
      label: 'Lives-at-risk index',
      value: `${Math.round(outcomes.livesAtRisk).toLocaleString()}${
        outcomes.livesAtRisk < baseline.livesAtRisk ? ' ↓' : ''
      }`,
      improved: outcomes.livesAtRisk < baseline.livesAtRisk,
    },
  ];

  return (
    <section className="foresight-engine panel" aria-labelledby="foresight-title">
      <div className="foresight-header">
        <div>
          <p className="eyebrow">Predictive · Next 7 days</p>
          <h2 id="foresight-title">Foresight Engine</h2>
        </div>
        <span className="foresight-beta">BETA</span>
      </div>

      <div className="foresight-block">
        <div className="foresight-strip-heading">
          <h3>Next 60 min</h3>
          <span className="pill">Deterministic scenarios</span>
        </div>
        <div className="foresight-alert-grid">
          {predictions.map((prediction) => (
            <article
              key={prediction.id}
              className={`foresight-alert foresight-${prediction.severity}`}
            >
              <div className="foresight-alert-top">
                <span className="foresight-alert-icon" aria-hidden="true">
                  {prediction.icon}
                </span>
                <div>
                  <p className="foresight-alert-title">{prediction.title}</p>
                  <p className="foresight-alert-meta">
                    Source: {prediction.source} · {prediction.horizon}
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
                className={`foresight-action foresight-${prediction.severity}`}
              >
                {prediction.action}
              </button>
            </article>
          ))}
        </div>
      </div>

      <div className="foresight-simulator">
        <div className="foresight-controls">
          <div className="foresight-strip-heading">
            <h3>What-if Simulator</h3>
            <span className="pill">Resource intervention</span>
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
              <p className="foresight-outcome-value">{outcome.value}</p>
              <p className="foresight-outcome-label">{outcome.label}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
