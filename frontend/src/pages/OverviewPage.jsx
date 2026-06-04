import { useEffect, useState } from 'react';
import { AgencyFeedPanel } from '../components/AgencyFeedPanel';
import { MetricCard } from '../components/MetricCard';
import { QuickActionsPanel } from '../components/QuickActionsPanel';
import { RecommendationPanel } from '../components/RecommendationPanel';
import { TimelinePanel } from '../components/TimelinePanel';
import { fetchJson } from '../services/api';
import {
  dataSources,
  predictiveSignals,
  quickActions,
  recommendations,
  roleViews,
  topStats
} from '../data/dashboardData';

const DORSCON_LEVELS = [
  {
    level: 'Green',
    tone: 'normal',
    disease: 'Disease is mild, or severe but does not spread easily from person to person.',
    impact: 'Minimal disruption. Border screening and travel advice may be applied.',
    advice: 'Maintain good personal hygiene and continue to monitor health advisories.'
  },
  {
    level: 'Yellow',
    tone: 'caution',
    disease: 'Disease is severe and spreads easily outside Singapore, or is spreading locally but remains contained.',
    impact: 'Minimal disruption, with added border or healthcare precautions possible.',
    advice: 'Stay home if unwell, maintain good personal hygiene, and watch for health updates.'
  },
  {
    level: 'Orange',
    tone: 'warning',
    disease: 'Disease is severe and spreads easily, but is still being contained inside Singapore.',
    impact: 'Moderate disruption such as temperature screening or visitor restrictions.',
    advice: 'Stay home if sick, maintain hygiene, and comply with control measures.'
  },
  {
    level: 'Red',
    tone: 'danger',
    disease: 'Disease is severe and spreading widely.',
    impact: 'Major disruption such as closures, work-from-home orders, or significant fatalities.',
    advice: 'Avoid crowded areas, comply with control measures, and follow urgent advisories.'
  }
];

function getLatestMetrics(metrics) {
  const latestByFacility = new Map();

  metrics.forEach((metric) => {
    if (!metric.facility_name) return;
    latestByFacility.set(metric.facility_name, metric);
  });

  return Array.from(latestByFacility.values());
}

function toNumber(value) {
  const parsed = Number.parseFloat(value ?? '');
  return Number.isFinite(parsed) ? parsed : null;
}

function formatTimestamp(value) {
  if (!value) return 'Updated recently';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('en-SG', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Singapore'
  }).format(date);
}

function buildLiveStats(psiResponse, pm25Response, occupancyResponse, waitingResponse, floodResponse) {
  const psiReadings = psiResponse?.data ?? [];
  const pm25Readings = pm25Response?.data ?? [];
  const floodAlerts = floodResponse?.data ?? [];
  const latestOccupancy = getLatestMetrics(occupancyResponse?.data ?? []);
  const latestWaiting = getLatestMetrics(waitingResponse?.data ?? []);

  const peakPsi = psiReadings.reduce((highest, item) => (!highest || item.psi > highest.psi ? item : highest), null);
  const peakPm25 = pm25Readings.reduce((highest, item) => (!highest || item.pm25 > highest.pm25 ? item : highest), null);
  const occupancyValues = latestOccupancy.map((item) => toNumber(item.value)).filter((value) => value !== null);
  const waitingValues = latestWaiting.map((item) => toNumber(item.value)).filter((value) => value !== null);
  const averageOccupancy =
    occupancyValues.length > 0
      ? (occupancyValues.reduce((sum, value) => sum + value, 0) / occupancyValues.length).toFixed(1)
      : null;
  const longestWait = waitingValues.length > 0 ? Math.max(...waitingValues) : null;

  return [
    {
      label: 'Peak PSI',
      value: peakPsi ? String(peakPsi.psi) : topStats[0].value,
      delta: peakPsi ? `${peakPsi.region} region` : topStats[0].delta,
      tone: peakPsi && peakPsi.psi >= 100 ? 'danger' : 'neutral'
    },
    {
      label: 'Peak PM2.5',
      value: peakPm25 ? `${peakPm25.pm25}` : topStats[1].value,
      delta: peakPm25 ? `${peakPm25.region} region` : topStats[1].delta,
      tone: peakPm25 && peakPm25.pm25 >= 55 ? 'warning' : 'neutral'
    },
    {
      label: 'Avg Hospital Occupancy',
      value: averageOccupancy ? `${averageOccupancy}%` : topStats[2].value,
      delta: averageOccupancy ? `${latestOccupancy.length} hospitals tracked` : topStats[2].delta,
      tone: averageOccupancy && Number(averageOccupancy) >= 85 ? 'warning' : 'neutral'
    },
    {
      label: 'Longest Ward Wait',
      value: longestWait !== null ? `${longestWait.toFixed(1)}h` : topStats[3].value,
      delta: longestWait !== null ? 'Published MOH median wait' : topStats[3].delta,
      tone: longestWait !== null && longestWait >= 6 ? 'warning' : 'neutral'
    },
    {
      label: 'Active Flood Alerts',
      value: String(floodAlerts.length),
      delta: floodAlerts.length > 0 ? 'PUB live alerts detected' : 'No active PUB alerts',
      tone: floodAlerts.length > 0 ? 'danger' : 'success'
    }
  ];
}

function buildTimelineItems(psiResponse, pm25Response, weatherResponse, occupancyResponse, waitingResponse, floodResponse) {
  const psiReadings = psiResponse?.data ?? [];
  const pm25Readings = pm25Response?.data ?? [];
  const latestOccupancy = getLatestMetrics(occupancyResponse?.data ?? []);
  const latestWaiting = getLatestMetrics(waitingResponse?.data ?? []);
  const floodAlerts = floodResponse?.data ?? [];
  const peakPsi = psiReadings.reduce((highest, item) => (!highest || item.psi > highest.psi ? item : highest), null);
  const peakPm25 = pm25Readings.reduce((highest, item) => (!highest || item.pm25 > highest.pm25 ? item : highest), null);
  const occupancyLeader = latestOccupancy.reduce((highest, item) => {
    const current = toNumber(item.value);
    const best = highest ? toNumber(highest.value) : null;
    return current !== null && (best === null || current > best) ? item : highest;
  }, null);
  const waitLeader = latestWaiting.reduce((highest, item) => {
    const current = toNumber(item.value);
    const best = highest ? toNumber(highest.value) : null;
    return current !== null && (best === null || current > best) ? item : highest;
  }, null);
  const outlook = weatherResponse?.data?.forecasts?.[0];
  const weatherWindow = weatherResponse?.data?.validPeriod?.end;

  const items = [];

  if (floodAlerts.length > 0) {
    const firstAlert = floodAlerts[0];
    items.push({
      time: formatTimestamp(firstAlert.timestamp),
      title: `Flood alert: ${firstAlert.location}`,
      detail: `PUB reports severity ${firstAlert.severity}. Monitor diversion and local response needs.`,
      location: firstAlert.location,
      severity: 'critical'
    });
  }

  if (peakPsi) {
    items.push({
      time: formatTimestamp(peakPsi.timestamp),
      title: `Peak PSI reading at ${peakPsi.region}`,
      detail: `24-hour PSI reached ${peakPsi.psi}. Maintain air quality monitoring for the affected sector.`,
      location: `${peakPsi.region} region`,
      severity: peakPsi.psi >= 100 ? 'critical' : 'warning'
    });
  }

  if (peakPm25) {
    items.push({
      time: formatTimestamp(peakPm25.timestamp),
      title: `PM2.5 elevated in ${peakPm25.region}`,
      detail: `One-hour PM2.5 is ${peakPm25.pm25}. This is the current highest regional reading.`,
      location: `${peakPm25.region} region`,
      severity: peakPm25.pm25 >= 55 ? 'critical' : 'warning'
    });
  }

  if (occupancyLeader) {
    items.push({
      time: occupancyLeader.last_updated ?? 'Latest',
      title: `${occupancyLeader.facility_name} has the highest occupancy`,
      detail: `Latest published occupancy is ${occupancyLeader.value}${occupancyLeader.unit ?? ''}.`,
      location: 'MOH hospitals',
      severity: (toNumber(occupancyLeader.value) ?? 0) >= 90 ? 'critical' : 'normal'
    });
  }

  if (waitLeader) {
    items.push({
      time: waitLeader.last_updated ?? 'Latest',
      title: `${waitLeader.facility_name} has the longest ward wait`,
      detail: `Median waiting time is ${waitLeader.value} ${waitLeader.unit ?? ''} based on the latest MOH publish.`,
      location: 'MOH hospitals',
      severity: (toNumber(waitLeader.value) ?? 0) >= 6 ? 'warning' : 'normal'
    });
  }

  if (outlook) {
    items.push({
      time: weatherWindow ? formatTimestamp(weatherWindow) : 'Forecast',
      title: `2-hour outlook: ${outlook.forecast}`,
      detail: `Representative forecast window remains valid until ${weatherWindow ?? 'the next update'}.`,
      location: outlook.area,
      severity: 'normal'
    });
  }

  return items.slice(0, 5);
}

function buildDataSources(psiResponse, pm25Response, weatherResponse, occupancyResponse, waitingResponse, floodResponse) {
  return [
    {
      agency: 'NEA',
      status: psiResponse && pm25Response && weatherResponse ? 'Live' : dataSources[0].status,
      feeds: 'PSI, PM2.5, 2-hour weather forecast',
      latency: psiResponse?.fetchedAt ? `Updated ${formatTimestamp(psiResponse.fetchedAt)}` : dataSources[0].latency
    },
    {
      agency: 'MOH',
      status: occupancyResponse && waitingResponse ? 'Advisory' : dataSources[2].status,
      feeds: 'Beds occupancy and ward admission waiting time',
      latency: occupancyResponse?.sources?.[0]?.last_checked
        ? `Updated ${formatTimestamp(occupancyResponse.sources[0].last_checked)}`
        : dataSources[2].latency
    },
    {
      agency: 'PUB',
      status: floodResponse ? 'Live' : dataSources[1].status,
      feeds: 'Flood alerts',
      latency: floodResponse?.fetchedAt ? `Updated ${formatTimestamp(floodResponse.fetchedAt)}` : dataSources[1].latency
    },
    dataSources[3],
    dataSources[4]
  ];
}

export function OverviewPage({ onOpenPublicDashboard }) {
  const [liveResponses, setLiveResponses] = useState({});
  const [overviewError, setOverviewError] = useState('');
  const [showDorsconGuide, setShowDorsconGuide] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    async function loadOverviewData() {
      try {
        const [psi, pm25, weather, occupancy, waiting, flood] = await Promise.all([
          fetchJson('/api/v1/environmental/psi'),
          fetchJson('/api/v1/environmental/pm25'),
          fetchJson('/api/v1/environmental/weather'),
          fetchJson('/api/hospitals/occupancy'),
          fetchJson('/api/hospitals/waiting-times'),
          fetchJson('/api/v1/flood/alerts')
        ]);

        if (isCancelled) return;

        setLiveResponses({ psi, pm25, weather, occupancy, waiting, flood });
      } catch (error) {
        if (isCancelled) return;
        setOverviewError(error instanceof Error ? error.message : 'Unable to load live overview data.');
      }
    }

    loadOverviewData();

    return () => {
      isCancelled = true;
    };
  }, []);

  const liveTopStats = Object.keys(liveResponses).length
    ? buildLiveStats(
        liveResponses.psi,
        liveResponses.pm25,
        liveResponses.occupancy,
        liveResponses.waiting,
        liveResponses.flood
      )
    : topStats;
  const liveTimelineItems = Object.keys(liveResponses).length
    ? buildTimelineItems(
        liveResponses.psi,
        liveResponses.pm25,
        liveResponses.weather,
        liveResponses.occupancy,
        liveResponses.waiting,
        liveResponses.flood
      )
    : undefined;
  const liveDataSources = Object.keys(liveResponses).length
    ? buildDataSources(
        liveResponses.psi,
        liveResponses.pm25,
        liveResponses.weather,
        liveResponses.occupancy,
        liveResponses.waiting,
        liveResponses.flood
      )
    : dataSources;
  const currentDorscon = DORSCON_LEVELS[2];

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
          <button
            type="button"
            className="ghost-button"
            onClick={() => onOpenPublicDashboard?.()}
          >
            Public Dashboard
          </button>
          <button type="button" className="ghost-button">
            Filter
          </button>
          <button type="button" className="primary-button">
            Incident Type
          </button>
        </div>
      </section>

      <section className={`status-banner panel dorscon-banner tone-${currentDorscon.tone}`}>
        <div className="status-mark" />
        <div className="status-content">
          <p className="status-title">Current Status: DORSCON {currentDorscon.level}</p>
          <p className="status-text">
            {currentDorscon.disease} {currentDorscon.impact} Frontline units remain on standby
            while Jurong West and Toa Payoh run elevated watch.
          </p>
        </div>
        <div className="status-meta">
          <span className="pill">
            {liveResponses.psi?.fetchedAt ? `Updated ${formatTimestamp(liveResponses.psi.fetchedAt)}` : 'Updated 2m ago'}
          </span>
          <button
            type="button"
            className="inline-link"
            onClick={() => setShowDorsconGuide((current) => !current)}
          >
            {showDorsconGuide ? 'Hide DORSCON guide' : 'View DORSCON guide'}
          </button>
        </div>
      </section>

      {showDorsconGuide ? (
        <section className="panel dorscon-panel">
          <div className="section-heading">
            <h2>DORSCON Alert Levels</h2>
            <span className="pill">Disease Outbreak Response System Condition</span>
          </div>
          <div className="dorscon-grid">
            {DORSCON_LEVELS.map((item) => (
              <article key={item.level} className={`dorscon-card tone-${item.tone}`}>
                <div className="dorscon-card-head">
                  <p className="dorscon-level">{item.level}</p>
                </div>
                <p className="dorscon-copy">
                  <strong>Nature of disease:</strong> {item.disease}
                </p>
                <p className="dorscon-copy">
                  <strong>Impact on daily life:</strong> {item.impact}
                </p>
                <p className="dorscon-copy">
                  <strong>Advice to public:</strong> {item.advice}
                </p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {overviewError ? (
        <section className="panel">
          <p className="muted-copy">Live overview data could not be loaded, so the page is showing fallback dashboard content.</p>
        </section>
      ) : null}

      <section className="stats-grid">
        {liveTopStats.map((stat) => (
          <MetricCard key={stat.label} {...stat} />
        ))}
      </section>

      <section className="content-grid">
        <div className="left-column">
          <TimelinePanel items={liveTimelineItems} />
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
          {liveDataSources.map((source) => (
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
