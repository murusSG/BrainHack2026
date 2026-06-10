const sourceNodes = [
  { label: 'MSS / MET Weather', detail: 'Weather and forecast feeds', state: 'partial' },
  { label: 'OneMap API', detail: 'Tiles, search, routing', state: 'active' },
  { label: 'SG-Alert / Gov Feeds', detail: 'Advisory channel target', state: 'planned' },
  { label: 'NEA APIs', detail: 'PSI, PM2.5, dengue, rainfall', state: 'active' },
  { label: 'MOH Data', detail: 'Health signals and hospital datasets', state: 'active' },
  { label: 'PUB Sensors', detail: 'Flood alerts and water levels', state: 'active' },
  { label: 'SCDF Resources', detail: 'Stations, shelters, AEDs', state: 'active' },
  { label: 'HDB / Population', detail: 'Impact and nearby context', state: 'active' },
];

const serviceNodes = [
  { label: 'API Gateway', detail: 'Express /api/v1 routing', state: 'active', tone: 'gateway' },
  { label: 'Crisis Aggregator', detail: 'Normalize agency feeds into one event schema', state: 'planned', tone: 'service' },
  { label: 'Alert Engine', detail: 'Risk scoring and trigger rules', state: 'planned', tone: 'service' },
  { label: 'Foresight Engine', detail: 'Forecast UI exists, model is demo logic', state: 'demo', tone: 'service' },
  { label: 'Incident Service', detail: 'CRUD, dispatch, status history', state: 'planned', tone: 'service' },
  { label: 'Notification Service', detail: 'SMS, email, push, PA sync', state: 'planned', tone: 'service' },
  { label: 'Resource Context', detail: 'SCDF and hospital public datasets', state: 'partial', tone: 'service' },
];

const dataNodes = [
  { label: 'Supabase / Postgres', detail: 'Optional persistence for feed snapshots', state: 'partial' },
  { label: 'TTL Cache', detail: 'Backend in-memory source cache', state: 'active' },
  { label: 'TimescaleDB', detail: 'Sensor time series store', state: 'planned' },
  { label: 'Blob Storage', detail: 'Reports and media archive', state: 'planned' },
  { label: 'Message Queue', detail: 'RabbitMQ or bus for async delivery', state: 'planned' },
];

const clientNodes = [
  { label: 'Gov Command Dashboard', detail: 'Overview, map, resources, hospitals, alerts', state: 'active' },
  { label: 'Responder Portal', detail: 'Responder tasking UI with demo routing state', state: 'partial' },
  { label: 'Public Browser', detail: 'Resident safety brief and nearest shelter lookup', state: 'active' },
  { label: 'Auth / Roles', detail: 'Cognito, SSO, MFA target', state: 'planned' },
];

const integrationNodes = [
  { label: 'data.gov.sg', detail: 'Public datasets and poll-download API', state: 'active' },
  { label: 'OneMap Routing', detail: 'Backend route endpoint available', state: 'partial' },
  { label: 'SMS / Push Alerts', detail: 'Broadcast target, no sender yet', state: 'planned' },
  { label: 'Volunteer Registry', detail: 'NVPC target integration', state: 'planned' },
  { label: 'CorpPass SSO', detail: 'Agency identity target', state: 'planned' },
];

const cloudNodes = [
  { label: 'Local Dev Runtime', detail: 'Vite frontend and Node API', state: 'active' },
  { label: 'AWS / ECS / Fargate', detail: 'Deployment target', state: 'planned' },
  { label: 'WAF / Shield', detail: 'Edge protection target', state: 'planned' },
  { label: 'CloudWatch', detail: 'Ops telemetry target', state: 'planned' },
  { label: 'Secrets Manager', detail: 'Credential storage target', state: 'planned' },
];

export function SystemFlowPage() {
  return (
    <div className="system-flow-page">
      <section className="hero-panel system-flow-hero">
        <div>
          <p className="eyebrow">Architecture / System Flow</p>
          <h1>MURUS SG Operating Model</h1>
          <p className="hero-copy">
            Target architecture mapped against the current prototype so judges can see the
            source feeds, backend services, data layer, integrations, and client surfaces.
          </p>
        </div>
        <div className="system-flow-legend" aria-label="Implementation state legend">
          <StateBadge state="active" />
          <StateBadge state="partial" />
          <StateBadge state="demo" />
          <StateBadge state="planned" />
        </div>
      </section>

      <section className="system-flow-board" aria-label="System architecture flow">
        <FlowColumn title="Sources" tone="source" nodes={sourceNodes} />

        <div className="flow-spine" aria-hidden="true">
          <span />
          <strong>/api/v1</strong>
          <span />
        </div>

        <FlowColumn title="Gateway & Services" tone="service" nodes={serviceNodes} featured />

        <div className="flow-spine" aria-hidden="true">
          <span />
          <strong>normalize</strong>
          <span />
        </div>

        <FlowColumn title="Clients" tone="client" nodes={clientNodes} />
      </section>

      <section className="system-flow-support-grid">
        <FlowPanel title="Data Layer" nodes={dataNodes} />
        <FlowPanel title="External Integrations" nodes={integrationNodes} />
        <FlowPanel title="Cloud Target" nodes={cloudNodes} />
      </section>
    </div>
  );
}

function FlowColumn({ title, tone, nodes, featured = false }) {
  return (
    <section className={`flow-column flow-${tone}${featured ? ' flow-column-featured' : ''}`}>
      <div className="flow-column-head">
        <h2>{title}</h2>
      </div>
      <div className="flow-node-list">
        {nodes.map((node) => (
          <FlowNode key={node.label} node={node} tone={node.tone ?? tone} />
        ))}
      </div>
    </section>
  );
}

function FlowPanel({ title, nodes }) {
  return (
    <section className="panel flow-support-panel">
      <h2>{title}</h2>
      <div className="flow-support-list">
        {nodes.map((node) => (
          <FlowNode key={node.label} node={node} tone="support" compact />
        ))}
      </div>
    </section>
  );
}

function FlowNode({ node, tone, compact = false }) {
  return (
    <article className={`flow-node flow-node-${tone}${compact ? ' flow-node-compact' : ''}`}>
      <div>
        <h3>{node.label}</h3>
        <p>{node.detail}</p>
      </div>
      <StateBadge state={node.state} />
    </article>
  );
}

function StateBadge({ state }) {
  const labels = {
    active: 'Active',
    partial: 'Partial',
    demo: 'Demo',
    planned: 'Planned',
  };

  return <span className={`state-badge state-${state}`}>{labels[state]}</span>;
}
