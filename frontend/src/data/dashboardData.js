export const navigationItems = [
  { id: 'overview', label: 'Overview' },
  { id: 'incident-map', label: 'Incident Map' },
  { id: 'resources', label: 'Resources' },
  { id: 'hospitals', label: 'Hospitals' },
  { id: 'volunteers', label: 'Volunteers' },
  { id: 'alerts', label: 'Alerts' },
  { id: 'system-flow', label: 'System Flow' },
  { id: 'incident-detail', label: 'Incident Detail' }
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

export const allocationRecommendations = [
  {
    id: 'ALLOC-1024',
    incidentId: 'INC-1024',
    incidentTitle: 'Flash Flood Warning: Orchard Rd',
    severity: 'critical',
    confidence: 91,
    generatedAt: '2 mins ago',
    modelVersion: 'MURUS-ALLOC-0.3',
    triggerSignals: [
      'PUB sensor #42 above 90%',
      'Road submersion risk in 15 min',
      '~15,000 commuters affected'
    ],
    draftMessage:
      'Request coordinated response for Orchard Rd flash flood risk. Please confirm team availability and estimated response window.',
    agencies: [
      {
        id: 'pub',
        agency: 'PUB',
        channel: 'Drainage Ops',
        confidence: 94,
        reason: 'Verified canal threshold breach near Stamford Diversion Canal.',
        suggestedAction: 'Deploy drainage response crew and inspect chokepoints along Orchard Rd.',
        status: 'pending_approval'
      },
      {
        id: 'lta',
        agency: 'LTA',
        channel: 'Traffic Ops',
        confidence: 88,
        reason: 'High probability of road closure and traffic diversion requirement.',
        suggestedAction: 'Prepare lane closure support and push diversion routes to transport operators.',
        status: 'pending_approval'
      },
      {
        id: 'scdf',
        agency: 'SCDF',
        channel: 'Ops Centre',
        confidence: 82,
        reason: 'Flooding may affect stranded pedestrians and basement evacuation routes.',
        suggestedAction: 'Stage one rescue unit and standby ambulance near Central sector.',
        status: 'pending_approval'
      },
      {
        id: 'spf',
        agency: 'SPF',
        channel: 'Ground Command',
        confidence: 69,
        reason: 'Crowd control may be required if evacuation routes cross shopping belt exits.',
        suggestedAction: 'Place patrol support on standby for cordon and access control.',
        status: 'pending_approval'
      }
    ]
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

export const incidentMapSummary = {
  searchPlaceholder: 'Search coordinates, zone names, or incident tags...',
  activeFiltersLabel: '2 active filters',
  personaFilter: 'Communities in radius',
  lastSynced: 'Synced 45 sec ago'
};

export const geospatialIncidents = [
  {
    id: 'INC-1024',
    title: 'Flash Flooding',
    hazardType: 'Flood',
    severity: 'Critical',
    location: 'Orchard Road',
    coordinates: { x: 68, y: 41 },
    vicinityRadius: '900m hyperlocal',
    radiusSize: 10,
    colorTone: 'critical',
    icon: 'flood',
    advisory:
      'Drainage overflow likely within 20 minutes. Broadcast diversion routes and avoid basement access.',
    personaImpact: 'Communities within 900m receive evacuation and route alerts.'
  },
  {
    id: 'INC-1025',
    title: 'Industrial Fire',
    hazardType: 'Fire',
    severity: 'High',
    location: 'Jurong East Industrial',
    coordinates: { x: 27, y: 58 },
    vicinityRadius: '1.4km localised plume',
    radiusSize: 12,
    colorTone: 'high',
    icon: 'fire',
    advisory:
      'SCDF units are containing smoke spread. Nearby residents should shelter indoors and avoid service roads.',
    personaImpact: 'Responders and nearby businesses flagged for access control.'
  },
  {
    id: 'INC-1026',
    title: 'Dengue Cluster',
    hazardType: 'Outbreak',
    severity: 'Medium',
    location: 'Tampines Hub',
    coordinates: { x: 77, y: 60 },
    vicinityRadius: '320m street-level',
    radiusSize: 7,
    colorTone: 'medium',
    icon: 'outbreak',
    advisory:
      'Vector surveillance cluster detected. Residents receive street-by-street cleanup and inspection guidance.',
    personaImpact: 'Households inside the block cluster get hyperlocal source reduction instructions.'
  },
  {
    id: 'INC-1027',
    title: 'Medical Surge',
    hazardType: 'Medical',
    severity: 'Low',
    location: 'Woodlands Checkpoint',
    coordinates: { x: 46, y: 22 },
    vicinityRadius: '2.2km operational catchment',
    radiusSize: 11,
    colorTone: 'support',
    icon: 'medical',
    advisory:
      'Checkpoint screening volumes exceeded baseline. Redirect standby medics and prep overflow triage.',
    personaImpact: 'Healthcare operators see bed and medic reallocation prompts.'
  },
  {
    id: 'INC-1028',
    title: 'Canal Water Rise',
    hazardType: 'Flood',
    severity: 'High',
    location: 'Bedok Canal',
    coordinates: { x: 82, y: 47 },
    vicinityRadius: '700m hyperlocal',
    radiusSize: 9,
    colorTone: 'high',
    icon: 'flood',
    advisory:
      'PUB sensors show rapid water rise. Push visual alert overlays for nearby underpasses and bus stops.',
    personaImpact: 'Pedestrians and drivers inside the radius receive route guidance.'
  }
];

export const incidentMapLegend = [
  { label: 'Critical incident', tone: 'critical' },
  { label: 'High severity', tone: 'high' },
  { label: 'Flood / water hazard', tone: 'flood' },
  { label: 'Medical / support', tone: 'support' },
  { label: 'Vicinity radius overlay', tone: 'radius' }
];

export const quickActionLogs = [
  'OneMap broadcast tiles prepared for Orchard diversion advisory.',
  'Jurong industrial perimeter updated with a 1.4km exclusion radius.',
  'Community-safe visual instructions sent to Bedok residents in affected blocks.'
];

export const resourceSummaryCards = [
  {
    label: 'Hospital Beds',
    value: '1,242',
    detail: '84% occupancy (avg)',
    icon: 'beds',
    change: '-2.4%',
    tone: 'down'
  },
  {
    label: 'Available Fleet',
    value: '42 / 65',
    detail: 'Ambulances across sectors',
    icon: 'fleet',
    change: '+12%',
    tone: 'up'
  },
  {
    label: 'Water Reserves',
    value: '845k L',
    detail: '92% of target capacity',
    icon: 'water',
    change: '+0.5%',
    tone: 'up'
  },
  {
    label: 'Shelter Vacancy',
    value: '3,210',
    detail: 'Available slots islandwide',
    icon: 'shelter',
    change: '-15.2%',
    tone: 'down'
  }
];

export const resourceTrend = {
  title: 'Supply Consumption Trend',
  subtitle: 'Aggregate PPE and medication stock level vs. projected demand (Last 24h)',
  timeframe: '24 Hours',
  labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '23:59'],
  currentStock: [4500, 4300, 4100, 5200, 5000, 4800, 4700],
  projectedDemand: [3200, 3400, 3900, 4100, 4250, 4600, 4200],
  yMax: 6000
};

export const interAgencyRequestForm = {
  title: 'Inter-Agency Request',
  subtitle: 'Allocate resources across departments',
  resourceTypes: [
    'Personal Protective Equipment',
    'Portable Ventilators',
    'O-negative Blood Packs',
    'Mobile Water Pumps'
  ],
  priorities: ['Medium', 'High', 'Critical']
};

export const resourceLedgerTabs = [
  { id: 'fleet', label: 'Fleet Availability' },
  { id: 'supplies', label: 'Critical Supplies' },
  { id: 'shelters', label: 'Shelter Network' }
];

export const resourceLedgerEntries = [
  {
    unitId: 'AMB-201',
    type: 'ALS (Advanced)',
    baseStation: 'Central Fire Stn',
    crew: 'Lee/Siva',
    capacity: 92,
    status: 'Available',
    statusTone: 'available'
  },
  {
    unitId: 'AMB-154',
    type: 'BLS (Basic)',
    baseStation: 'Jurong West Hub',
    crew: 'Wong/Tan',
    capacity: 45,
    status: 'Dispatched',
    statusTone: 'dispatched'
  },
  {
    unitId: 'AMB-098',
    type: 'Critical Care',
    baseStation: 'Changi Depot',
    crew: 'Kumar/Aziz',
    capacity: 88,
    status: 'Available',
    statusTone: 'available'
  },
  {
    unitId: 'AMB-312',
    type: 'ALS (Advanced)',
    baseStation: 'Sengkang Stn',
    crew: 'N.A.',
    capacity: 12,
    status: 'Maintenance',
    statusTone: 'maintenance'
  },
  {
    unitId: 'AMB-112',
    type: 'BLS (Basic)',
    baseStation: 'Woodlands Depot',
    crew: 'Singh/Lim',
    capacity: 98,
    status: 'Available',
    statusTone: 'available'
  }
];

export const resourceLedgerMeta = {
  title: 'Inventory & Capacity Ledger',
  subtitle: 'Detailed tracking across primary response pillars.',
  searchPlaceholder: 'Search ledger...',
  syncStatus: 'Last full system sync: 2 mins ago',
  auditLabel: 'View audit logs'
};

export const resourceShortageAlert = {
  title: 'Critical Resource Shortage Alert',
  message:
    'Blood Type O- and surgical grade oxygen levels are below 25% at Changi General Hospital. Immediate reallocation from Sengkang General is recommended.'
};

export const hospitalSummaryCards = [
  {
    label: 'Total Beds Occupied',
    value: '84.2%',
    icon: 'beds',
    tone: 'neutral'
  },
  {
    label: 'ICU Load Alert',
    value: '92.1%',
    icon: 'alert',
    tone: 'critical'
  },
  {
    label: 'Ventilator Surplus',
    value: '142 Units',
    icon: 'ventilator',
    tone: 'neutral'
  },
  {
    label: 'Critical Facilities',
    value: '02 / 14',
    icon: 'facility',
    tone: 'neutral'
  }
];

export const hospitalTrackerMeta = {
  title: 'Hospital Capacity Tracker',
  subtitle: 'Real-time occupancy and specialized resource monitoring across Singapore.',
  filterLabel: 'Filter Region',
  broadcastLabel: 'Capacity Broadcast',
  searchPlaceholder: 'Search by facility name, region, or status...',
  pendingTransfers: '3 Pending Transfers',
  exportLabel: 'Export Data',
  registryTitle: 'Specialized Facilities Registry',
  registryAction: 'View Full Registry'
};

export const hospitalFacilityCards = [
  {
    name: 'Singapore General Hospital',
    region: 'Central (Outram)',
    status: 'Critical',
    tone: 'critical',
    generalBeds: { used: 1690, total: 1785, percent: 95, tone: 'critical' },
    icuUnits: { used: 89, total: 94, percent: 95, tone: 'critical' },
    ventilators: '105 / 120',
    directLine: '+65 6222 3322'
  },
  {
    name: 'Tan Tock Seng Hospital',
    region: 'Central (Novena)',
    status: 'Normal',
    tone: 'normal',
    generalBeds: { used: 1250, total: 1540, percent: 81, tone: 'normal' },
    icuUnits: { used: 42, total: 60, percent: 70, tone: 'normal' },
    ventilators: '38 / 80',
    directLine: '+65 6256 6011'
  },
  {
    name: 'National University Hospital',
    region: 'West (Kent Ridge)',
    status: 'Warning',
    tone: 'warning',
    generalBeds: { used: 1080, total: 1160, percent: 93, tone: 'critical' },
    icuUnits: { used: 41, total: 45, percent: 91, tone: 'critical' },
    ventilators: '44 / 60',
    directLine: '+65 6779 5555'
  },
  {
    name: 'Changi General Hospital',
    region: 'East (Simei)',
    status: 'Normal',
    tone: 'normal',
    generalBeds: { used: 820, total: 1000, percent: 82, tone: 'normal' },
    icuUnits: { used: 22, total: 36, percent: 61, tone: 'normal' },
    ventilators: '18 / 45',
    directLine: '+65 6788 8833'
  },
  {
    name: 'Khoo Teck Puat Hospital',
    region: 'North (Yishun)',
    status: 'Critical',
    tone: 'critical',
    generalBeds: { used: 760, total: 795, percent: 96, tone: 'critical' },
    icuUnits: { used: 27, total: 28, percent: 96, tone: 'critical' },
    ventilators: '29 / 35',
    directLine: '+65 6555 8000'
  },
  {
    name: 'Ng Teng Fong General',
    region: 'West (Jurong)',
    status: 'Normal',
    tone: 'normal',
    generalBeds: { used: 510, total: 700, percent: 73, tone: 'normal' },
    icuUnits: { used: 14, total: 24, percent: 58, tone: 'normal' },
    ventilators: '10 / 30',
    directLine: '+65 6716 2000'
  }
];

export const specializedFacilitiesRegistry = [
  {
    name: "KK Women's and Children's",
    type: 'Pediatric/Maternity',
    isolationUnits: '12/15',
    dialysisStations: '8/10',
    traumaCenter: 'Level 1'
  },
  {
    name: 'Bright Vision Hospital',
    type: 'Community',
    isolationUnits: '0/40',
    dialysisStations: 'N/A',
    traumaCenter: 'N/A'
  },
  {
    name: 'Mount Elizabeth Orchard',
    type: 'Private',
    isolationUnits: '5/20',
    dialysisStations: '12/20',
    traumaCenter: 'Level 2'
  },
  {
    name: 'Raffles Hospital',
    type: 'Private',
    isolationUnits: '3/10',
    dialysisStations: '5/8',
    traumaCenter: 'Level 2'
  },
  {
    name: 'Alexandra Hospital',
    type: 'Acute',
    isolationUnits: '8/15',
    dialysisStations: '10/10',
    traumaCenter: 'Level 3'
  }
];

export const alertsPageMeta = {
  title: 'Alerts & Notifications',
  criticalActive: '2 critical active',
  filterPlaceholder: 'Filter alert feed...',
  filterLabel: 'Filters',
  advisoryLabel: 'New Advisory',
  tabs: ['All Alerts', 'Critical Only', 'By Region', 'Unacknowledged'],
  caseLabel: 'CASE ID: AL-9021',
  registryTitle: 'Broadcast Center',
  smartTemplate: 'Apply Smart Template'
};

export const alertsFeed = [
  {
    id: 'AL-9021',
    title: 'Flash Flood Warning: Orchard Rd',
    region: 'Central, Singapore',
    timeAgo: '2 mins ago',
    source: 'PUB Water Sensor #42',
    severity: 'critical',
    status: 'unacknowledged',
    active: true
  },
  {
    id: 'AL-8955',
    title: 'Smoke Haze Detected: Jurong East',
    region: 'West, Singapore',
    timeAgo: '14 mins ago',
    source: 'NEA Air Quality Station',
    severity: 'warning',
    status: 'acknowledged'
  },
  {
    id: 'AL-8942',
    title: 'Mass Transit Delay: North-South Line',
    region: 'Toa Payoh - Novena',
    timeAgo: '45 mins ago',
    source: 'SMRT Operations Control',
    severity: 'info',
    status: 'broadcasted'
  },
  {
    id: 'AL-8930',
    title: 'Unidentified Drone Activity: Tuas Port',
    region: 'West, Singapore',
    timeAgo: '1 hour ago',
    source: 'MPA Surveillance AI',
    severity: 'warning',
    status: 'acknowledged'
  },
  {
    id: 'AL-8912',
    title: 'Hospital Capacity Alert: NUH',
    region: 'West, Singapore',
    timeAgo: '2 hours ago',
    source: 'Integrated Health Portal',
    severity: 'critical',
    status: 'unacknowledged'
  }
];

export const alertDetail = {
  severity: 'critical',
  caseId: 'AL-9021',
  title: 'Flash Flood Warning: Orchard Rd',
  summary:
    'Water levels have exceeded 90% capacity at the Stamford Diversion Canal. High risk of road submersion in the next 15 minutes.',
  facts: [
    { label: 'Incident location', value: 'Central, Singapore' },
    { label: 'Time detected', value: '2 mins ago' },
    { label: 'At-risk pop.', value: '~15,000 commuters' },
    { label: 'Data source', value: 'Verified Sensor' }
  ],
  mapLabel: "Live coordinates: 1.3521° N, 103.8198° E"
};

export const alertResponders = [
  { team: 'SCDF Alpha 4', role: 'Fire/Rescue', eta: 'ETA 3 mins' },
  { team: 'Police Patrol 92', role: 'Security', eta: 'ETA 5 mins' },
  { team: 'PUB Maintenance', role: 'Technical', eta: 'ETA 12 mins' }
];

export const broadcastSteps = [
  '1. Select Channels',
  '2. Broadcast Instructions & Map Data',
  '3. Confirm Audience Radius'
];
