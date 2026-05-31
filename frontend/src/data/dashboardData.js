export const navigationItems = [
  'Overview',
  'Incident Map',
  'Resources',
  'Hospitals',
  'Volunteers',
  'Alerts',
  'Incident Detail'
];

export const topStats = [
  { label: 'Active incidents', value: '14', delta: '+3 in last hour', tone: 'danger' },
  { label: 'Confirmed cases', value: '2,412', delta: '+12% week-on-week', tone: 'neutral' },
  { label: 'ICU bed availability', value: '18%', delta: '3 critical clusters', tone: 'warning' },
  { label: 'Active ambulances', value: '86', delta: '12 rerouted live', tone: 'neutral' },
  { label: 'Volunteers deployed', value: '458', delta: '+42 mobilised', tone: 'success' }
];

export const dataSources = [
  {
    agency: 'NEA',
    status: 'Live',
    feeds: 'PSI, PM2.5, dengue, weather, lightning',
    latency: '43 sec'
  },
  {
    agency: 'PUB',
    status: 'Live',
    feeds: 'Flood alerts, drainage sensors, water levels',
    latency: '28 sec'
  },
  {
    agency: 'MOH',
    status: 'Advisory',
    feeds: 'DORSCON, disease bulletins, ED load',
    latency: '4 min'
  },
  {
    agency: 'SCDF',
    status: 'Live',
    feeds: 'myResponder incidents, dispatch telemetry',
    latency: '15 sec'
  },
  {
    agency: 'LTA',
    status: 'Live',
    feeds: 'Road incidents, traffic flow, MRT disruptions',
    latency: '52 sec'
  }
];

export const timelineItems = [
  {
    time: '14:22 SGT',
    title: 'Mass casualty incident reported - industrial fire',
    detail: 'SCDF escalated to multi-agency response after sensor-confirmed blast event.',
    location: 'Jurong West St 42',
    severity: 'critical'
  },
  {
    time: '14:15 SGT',
    title: 'Oxygen supply restock completed - Zone C',
    detail: 'Hospital logistics cleared transfer with 8-hour replenishment buffer restored.',
    location: 'KKH Medical Centre',
    severity: 'normal'
  },
  {
    time: '13:58 SGT',
    title: 'Elevated temperature cluster detected (5 persons)',
    detail: 'MOH triage watchlist triggered after syndromic surveillance threshold breach.',
    location: 'Woodlands Checkpoint',
    severity: 'warning'
  },
  {
    time: '13:45 SGT',
    title: 'Flash flood advisory: high risk in Toa Payoh sector',
    detail: 'PUB upstream drain sensors indicate overflow probability above 82%.',
    location: 'Central SG',
    severity: 'warning'
  },
  {
    time: '13:12 SGT',
    title: 'Surge capacity activated - ICU ward 12A',
    detail: 'Hospital command reallocated beds and staffing to support downstream transfers.',
    location: 'SGH Outram',
    severity: 'normal'
  }
];

export const recommendations = [
  {
    category: 'Resource reallocation',
    priority: 'Critical',
    text: 'Dispatch 2 additional ambulances from Clementi station to the Jurong West industrial fire site.'
  },
  {
    category: 'Logistics alert',
    priority: 'High',
    text: 'Restock PPE kits at NUH. Current burn rate exceeds the remaining 24-hour stock threshold.'
  },
  {
    category: 'Public messaging',
    priority: 'Action',
    text: 'Issue a regional SMS advisory for Toa Payoh residents regarding localised flooding and alternate routes.'
  }
];

export const quickActions = [
  {
    label: 'Create New Incident',
    note: 'Open a fresh incident log and start assigning owners.',
    icon: 'plus',
    featured: true
  },
  {
    label: 'Broadcast Emergency Alert',
    note: 'Send a public advisory to affected districts and partner channels.',
    icon: 'alert'
  },
  {
    label: 'Request Resource Transfer',
    note: 'Reroute vehicles, medics, or supplies across active sectors.',
    icon: 'transfer'
  }
];

export const roleViews = [
  {
    role: 'Commanders',
    summary: 'Cross-agency common operating picture with severity ranking, deployment health, and escalation triggers.'
  },
  {
    role: 'Responders',
    summary: 'Ground updates, route changes, supply gaps, and tasking aligned to the same incident record.'
  },
  {
    role: 'Communities',
    summary: 'Public-safe advisories, disruption radius, and updated instructions from the verified command feed.'
  }
];

export const predictiveSignals = [
  {
    title: 'Flood surge probability',
    value: '82%',
    note: 'Toa Payoh and Bishan drainage basin in the next 90 minutes.'
  },
  {
    title: 'ED saturation forecast',
    value: '67%',
    note: 'NUH and TTSH emergency load projected to breach preferred intake threshold by 18:00.'
  },
  {
    title: 'Volunteer mobilisation readiness',
    value: '91%',
    note: 'North-west district has fastest activation response based on the last 12 major incidents.'
  }
];
