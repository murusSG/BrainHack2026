# Brainstorming brainhack 

**Brainhack prompts/ideas**

**let’s breakdown problem statement first:**

1. what kind of disasters/health emergencies are we addressing? what are relevant to Singapore? which emergencies/disasters should we prioritise first (order by importance based on sg stats etc prevalent crises etc pandemic/epidemic, haze, flash floods)  
2. what kind of sources should we pull info from?  
3. what kind of info should we provide? \-\> depends on the specific diseases/emergencies we want to tackle but let’s get a general idea of it  
4. what are the parties involved who can benefit from our web app? \-\> 1\. Leaders/Ministers/Gov 2\. Public healthcare officials/SPF/SCDF etc, essentially responder agencies 3\. General public \-\> can come up with login functionality for responders/gov officials (this is applicable if we have info we want to display only to gov officials not to the public \-\> think or ask AI what this type of info could be)

**Claude Problem Statement breakdown:**

**Quick Aid — Full Problem Breakdown**

#### **Context First: What the Problem Statement Actually Demands**

The core ask is a web app that aggregates information from multiple sources to help Singapore respond faster and smarter during disasters or health emergencies. Three distinct user groups must be served: government leaders, frontline responders, and the general public. The evaluation judges on relevance, originality, and feasibility — so our angle needs to be specific, not just a generic dashboard.

---

### 1\. What Disasters/Health Emergencies Are Relevant to Singapore?

Reasoning: Singapore's geography, density, and climate constrain which crises are realistic. A tropical city-state with no earthquakes but high urban density, a massive port, and aging population creates a specific risk profile.

Priority Order (highest to lowest):

Tier 1 — High Frequency & High Impact

* Pandemic/Epidemic (e.g. COVID-19, Dengue, H1N1, Mpox) — Singapore has faced this repeatedly and it remains the most operationally complex emergency. Dengue is *endemic and seasonal*, making it the most persistently active health emergency right now.  
* Haze (transboundary smoke from Indonesian peat fires) — Occurs almost every year during dry season (Jun–Oct). PSI readings, health advisories, school closures, and mask distribution are recurring response actions. Very Singapore-specific.  
* Flash Floods — Increasingly frequent due to climate change and intense rainfall. Orchard Road, Bukit Timah, and Jurong have all seen significant flooding. Urban drainage systems are stressed.

Tier 2 — Lower Frequency, High Consequence

* Mass Casualty Incidents (MCI) — Terrorist attack, building collapse, major transport accident. SCDF has dedicated MCI protocols. Rare but the response coordination is extremely time-critical.  
* Food Safety Outbreak — Gastroenteritis clusters, contaminated supply chains (e.g. Punggol hawker centre clusters). SFA manages these but they can scale.  
* Extreme Heat Events — Singapore's wet-bulb temperatures are rising. Heat stroke risk during outdoor events or for outdoor workers.

Tier 3 — Low Probability but Existential

* Chemical/HAZMAT incidents (industrial, port spillage)  
* Cyberattack on critical infrastructure (water, power) causing secondary crises

Recommended Focus for Quick Aid: Prioritise Pandemic/Epidemic \+ Dengue, Haze, and Flash Floods as the three primary emergency types. These cover the most realistic, data-rich, and recurring Singapore scenarios — and each has existing government data sources we can tap.

---

### 2\. What Information Sources Should We Pull From?

Reasoning: The problem statement explicitly says "gathers information from different sources" — this data aggregation angle is central to what makes the app novel. We need to identify real, accessible APIs and data streams.

Government / Official Open Data Sources:

* data.gov.sg — Singapore's open data portal. Has historical and live datasets for weather, dengue clusters, dengue cases by town, hospital bed occupancy (during COVID era), and more.  
* NEA APIs — Real-time PSI (Pollutant Standards Index) readings for haze, PM2.5 data, weather station data (rainfall, temperature).  
* PUB flood sensor data / water level monitors — Some are available via data.gov.sg; useful for flash flood early warning.  
* MOH disease surveillance reports — Weekly Infectious Disease Bulletin. Dengue case counts, cluster locations, alert zones.  
* MSS (Meteorological Service Singapore) — Rainfall forecasts, thunderstorm alerts, wind direction (relevant for haze spread).

Responder Agency Feeds:

* SCDF incident feed / myResponder API — SCDF has a public app (myResponder) for community first aiders. An API integration here could show incident hotspots.  
* SG Alert / Gov.sg WhatsApp broadcasts — Text-based emergency alerts that could be parsed and surfaced in structured form.  
* HPB / MOH press releases — Scraped or RSS-fed health advisories.

Crowdsourced / Community Sources:

* Volunteer sign-up systems — E.g. NVPC (National Volunteer & Philanthropy Centre), SGSecure volunteer networks. Tracking volunteer deployment availability.  
* Social media signals (Twitter/X, Telegram channels) — Flood photos, haze complaints, outbreak reports geotagged in Singapore. Useful for early detection before official confirmation.  
* OneMap API (SLA) — Singapore's official mapping API. Essential for geospatial display of incidents, shelters, hospitals, volunteer locations.

Hospital / Healthcare Capacity:

* MOH hospital bed data — During COVID this was publicly reported; in normal times it's less accessible but could be a simulated/mock feed for the hackathon.  
* Polyclinic waiting times — Currently shown on the HealthHub app; could be aggregated.

---

### 3\. What Information Should We Display?

Reasoning: The information provided should match the emergency type and the user's role. Here's a general framework, then per-emergency specifics.

General Information Layer (all emergencies):

* Live map of the affected area with severity zones (red/amber/green)  
* Timeline of the crisis (when it started, escalation events, current status)  
* Resource availability: hospital beds, shelters, volunteers, ambulances  
* Official advisories and action recommendations  
* Predictive projections (e.g. flood spread, dengue cluster expansion based on Aedes mosquito breeding patterns)

Per-Emergency Specifics:

*Pandemic/Dengue:*

* Case counts by region, cluster locations on map  
* Hospital/ICU occupancy rates  
* Vaccination or fogging deployment status  
* Quarantine/isolation facility capacity  
* Contact tracing hotspot zones

*Haze:*

* Live PSI and PM2.5 readings by region (NEA zones: North, South, East, West, Central)  
* 24-hour PSI forecast  
* Mask distribution point locations  
* School/event closure recommendations based on PSI thresholds  
* Health risk categorisation (Good / Moderate / Unhealthy / Very Unhealthy / Hazardous)

*Flash Floods:*

* Real-time rainfall intensity map  
* Water level at flood-prone canals and drains  
* Flood-affected road/MRT disruptions  
* Evacuation shelter locations and capacity  
* Predicted flood spread in next 30–60 minutes

---

### 4\. Parties Involved & Role-Based Access

Reasoning: This is where the login/role differentiation becomes architecturally meaningful. Different users need different data — not just for privacy, but because information overload is dangerous in a crisis.

Three User Tiers:

Tier 1 — Government Leaders / Ministers / Policy Makers

* *What they need:* Big-picture strategic overview. Resource allocation across agencies. Cross-agency coordination status. Predicted economic/social impact. Decision support (e.g. "should we raise DORSCON level?").  
* *Exclusive info (not public):* Classified inter-agency resource gaps, internal capacity strain indicators, unconfirmed incident reports awaiting verification, military/civil defence deployment status, escalation trigger thresholds being monitored.  
* *Access:* Highest-privilege login. MFA-protected. Audit-logged.

Tier 2 — Frontline Responders (SCDF, SPF, MOH, SFA, PUB, volunteers)

* *What they need:* Operational detail. Exact incident locations, team deployment maps, task assignment, real-time communication with field units, resource requests.  
* *Exclusive info (not public):* Unconfirmed reports being triaged, exact resource shortage by station/hospital, internal team deployment maps, victim triage status, inter-agency task allocation.  
* *Access:* Agency-specific login. Role permissions vary by agency (SCDF sees different data than SFA).

Tier 3 — General Public

* *What they need:* Simple, clear, actionable guidance. "Is my area affected?" "Where is the nearest shelter?" "What should I do right now?" "How can I help as a volunteer?"  
* *What they see:* Sanitised, verified data only. No unconfirmed reports. PSI/flood/case maps. Shelter and hospital locator. Volunteer sign-up. Emergency contact numbers.  
* *Access:* No login required for read access. Optional login to register as a volunteer or receive personalised alerts based on residential zone.

The key design insight here: The public-facing view should *reduce panic* through clarity and verified data, while the responder/government view should *accelerate action* through operational depth. The same underlying data platform powers both, but the presentation layer is completely different.

---

### Tying It Together: What Makes Quick Aid Original

To score well on *Originality*, the app should go beyond being a dashboard. Consider these differentiating angles:

"Predictive \+ Reactive" dual mode — Most crisis apps are reactive (showing what's happening). Quick Aid could layer in predictive models (e.g. dengue cluster expansion based on weather and past patterns, or flood spread based on rainfall intensity) to give responders a 30–60 minute head start.

Cross-emergency correlation — Haze \+ heat \+ flood can happen simultaneously. Quick Aid could detect compounding crises and flag resource contention (e.g. "ambulance demand will spike because haze \+ heat are both at danger levels simultaneously").

Volunteer matching engine — Not just showing that volunteers exist, but matching them to needs in real time based on skill (first aid certified, Mandarin-speaking for elderly assistance, etc.) and proximity.

Community early warning — A verified crowdsourcing mechanism where residents can report flooding/smoke/suspicious symptoms, which are then weighted and surfaced to responders as "unverified signals" rather than confirmed data.

# Useful websites/tech we can use 

# Tech Stack

Frontend: Rea	ct \+ MUI  
Backend: Python \+ NodeJs  
Database:   
Cloud:

# FINAL IDEA

**Submissions:**  
Slides: [\[FINAL\] murusSG - Unified Crisis Decision Layer](https://docs.google.com/presentation/d/1lW-1bGZxnT8DiUYkqkVDJjS_L_Jgov2VRiJoE74XlZ8/edit?slide=id.g3e9a5707fe8_0_0#slide=id.g3e9a5707fe8_0_0)  
Architecture design: ![][image1]  
Wireframe: [https://app.visily.ai/projects/fbdae153-3785-43de-8b72-7a7ca0ccac70/boards/2617319/presenter?play-mode=All+screens](https://app.visily.ai/projects/fbdae153-3785-43de-8b72-7a7ca0ccac70/boards/2617319/presenter?play-mode=All+screens) 

**Ideas:**  
Unified dashboard web application system for retrieving info from various sources like NEA, PUB, MOH, SCDF, and LTA, **transforming raw agency data into role-specific decisions** for crisis leaders, frontline responders, and everyday residents. 

**Value Proposition**

ONE SINGLE SOURCE OF TRUTH

In crisis response, fragmented data costs lives. MURUS SG establishes a single source of truth by fusing real-time agency telemetry, crowd-sourced field intelligence, and resource capacities into one dynamic map. This unified ecosystem eliminates the chaos of switching between disjointed systems, empowering commanders and residents to make synchronised, lifesaving decisions with absolute clarity.

Unified dashboard web application system for responders to coordinate operations, so as to reduce time lag when relaying information and dispatching resources, **transforming raw agency data into role-specific decisions**. This also serves as a platform for responders and leaders to easily relay information from top-to-bottom for ALL incidents regarding public safety, and likewise for communities to receive the most updated information and advisories about public safety incidents.

Data prediction based on historical trends for leaders to put forth more insightful measures 

BACK END KEY FEATURES:

**1\. Multi-source data ingestion layer** Pulls in real-time feeds from NEA (PSI, PM2.5, dengue, weather, lightning), PUB (flood alerts, water level sensors), MOH (DORSCON, infectious disease bulletins, ED load), SCDF (myResponder incidents), and LTA (road incidents, traffic cams, MRT disruptions). Normalises all of them into a single internal event schema. 

**2\. Geospatial event engine** Every incoming data point gets tagged with location, severity, hazard type, and a "vicinity radius" appropriate to that hazard (street-level for dengue, regional for haze, hyperlocal for flood). This is what powers the "is this for me?" filter across all three personas. 

**3\. Visualised Alerts** Aiding communities in converting information from plain raw text instructions into actionable steps with visualisations as to allow the general community to understand what to do. We will be integrating SG Map using OneMap API in our broadcast alerts to better guide the public during distress situations.

**4\. Shared incident management system:** Instead of having separate systems for each agency, there will be a shared system among all responder agencies like SPF, SCDF etc so that agencies can relay information clearly to ensure clear and transparent communication between agencies.

5\. AI-Assisted Resource Allocation: (pain point: dispatchers have to manually call other government agencies if they are needed \- now with this feature, system will automatically suggest to the dispatcher on the relevant agencies to be informed. Dispatcher will still have to approve before the relevant agencies are contacted. Model is trained based on the incidents reported in the webapp.

3\. **Data prediction:** 

Foresight Engine — a predictive layer on the leader's command view that converts current data \+ historical patterns \+ forecasts into forward projections that drive decisions made *now*.

The core insight: every other tool in Singapore's crisis stack shows the *present*. PUB shows current water levels. MOH shows current ICU load. NEA shows current PSI. By the time any of these crosses a threshold, the decision to act was needed hours ago. The Foresight Engine closes that gap.

### **Core platform functionalities (shared backbone)**

**1\. Multi-source data ingestion layer Pulls real-time feeds from NEA (PSI, PM2.5, dengue, weather, lightning), PUB (flood alerts, water level sensors), MOH (DORSCON, infectious disease bulletins, ED load), SCDF (myResponder incidents), and LTA (road incidents, traffic cams, MRT disruptions). Normalises everything into a single internal event schema. Unified Dashboard compiling data sources into useful information**

**2\. Geospatial event engine Every incoming data point is tagged with location, severity, hazard type, and a hazard-appropriate vicinity radius (street-level for dengue, regional for haze, hyperlocal for flood). Powers the "is this for me?" filter across all three personas.**

**3\. Authentication & role gating Public view is open. Responder and leader views require verified login (NRIC-tied in production, agency SSO at scale). Hackathon demo can use mock logins.**

**4\. Cross-platform delivery Responsive web app for desktop/tablet (leaders work on desktop), PWA or React Native wrapper for mobile (responders and residents are mobile-first). One data layer, three role-aware UIs.**

**5\. Visualised Alerts \-  aiding communities in converting information from plain raw text instructions into actionable steps with visualisations as to allow the general community to understand what to do.** 

---

### **Leader features — "Command View"**

**Multi-agency incident map (flagship) Single canvas showing all live events across agencies — colour-coded by source, sized by severity, filterable by time window, hazard type, and region. The unifying view that no current SG tool provides.**

**Foresight Engine — predictive layer Forward projections across three horizons:**

* **0–60 min imminent surge alerts (with pre-staged response recommendations)**  
* **1–24 hr compound load projections (ED capacity, cluster expansion)**  
* **1–7 day trend trajectories (for policy-level decisions) Powered by statistical baselines on historical data.gov.sg data \+ Bayesian updating from live signals. Output is structured: confidence bands, projected zones on the map, time-to-event.**

**What-if simulator Sidebar with sliders for testing interventions ("open 30 surge beds at SGH", "pre-position 2 QRTs in West"). Re-runs the Foresight Engine and shows the delta visually on the map. The signature demo moment.**

**Compound risk alerts Automatic flagging of correlated events: *"PSI rising in West \+ asthma-related 995 calls up 22% \+ heat advisory in effect."* No current SG tool surfaces cross-agency correlations.**

**Resource heatmap Live view of hospital ED load by region, ambulance availability, shelter capacity, volunteer CFR coverage. Surfaces tradeoffs visually.**

**Manual comms broadcast Leaders can compose and push messages directly to (a) the responder feed, (b) the public alert channel, or (c) inter-agency channels. Structured templates, not AI-drafted — leader writes, system distributes. Every message timestamped and logged.**

**Comms audit log Auto-recorded timeline of every message sent, by whom, to which channel, when. Post-incident review ready.**

---

### **Responder features — "Field View"**

**Convergence routing (flagship) Mobile-first map view that simultaneously:**

* **Routes around live hazards (flood points, road closures)**  
* **Shows other responders heading to nearby incidents so the team self-coordinates**  
* **Dynamically suggests the best destination hospital based on real-time ED wait time \+ incident type**

**Live incident feed Geographically sorted list of nearby active incidents (cardiac, fire, flood rescue, etc.). Full multi-hazard scope, not just fire/medical.**

**One-tap status updates Responder broadcasts status (en route, on scene, transporting, clear) with one tap. Feeds back into the leader's resource heatmap.**

**Scene context cards On arrival, an auto-generated card with relevant context: nearest AED, hydrant locations, building info, recent incidents at the same address, hazmat flags. *This is where the LLM generation layer earns its keep* — turning structured data into a quick-read brief.**

**Offline-first design Last-known data cached locally for tunnels, basements, flooded zones. Syncs when connection returns.**

---

### **Community features — "Resident View"**

**Personal Crisis Card (flagship) Single screen showing crisis status at all saved locations — home, parents', kids' school, workplace. Each location: one icon \+ one colour \+ one plain-language sentence \+ 2–3 action buttons. Nothing else.**

**~~Watch points setup Onboarding to add up to 5 locations, each tagged (home / family / work / school). All future alerts personalised to whether they affect *those* points specifically.~~**

**Hazard-aware vicinity logic Radius adapts to haz	ard type — tight for floods, regional for haze, street-level for dengue. No more national alerts for things that don't actually affect the user.**

**Action-first alerts Every notification leads with a verb: *"Bring laundry in"*, *"Stay indoors next 2 hours"*, *"Avoid Yishun Ave 5 — flooded"* — never *"Heavy rain expected"*. Generated by the LLM layer from raw data.**

**Multilingual \+ accessibility Auto-translation to EN/中文/Malay/Tamil, large-text mode, icon-first display for low-literacy users.**

**All-clear mode When nothing is wrong, the app shows *"All clear at all 4 of your locations."* Maintains daily engagement so the app is open *before* it's needed.**

**Volunteer pathway CPR-trained or registered CFRs can opt in to receive nearby-incident calls (like myResponder). Bridges the "I want to help but don't know how" gap.**

---

### **Cross-cutting features**

**Natural language query (community \+ responder only) Search bar: *"Is it safe to jog in Bishan now?"* / *"How loaded is KTPH right now?"*. LLM synthesises across live feeds. Excluded from leader view — leaders use structured filters and the foresight engine instead.**

**Predictive overlays Forward-looking visualisations (rainfall forecast, ED load projection, cluster spread) painted onto existing maps. Available across all three views.**

**Misinformation flagging User-submitted or auto-detected viral messages contradicting official data are flagged with the official version shown side-by-side.**

**Post-incident review pack Auto-generated timeline of data points received, comms sent, actions taken. For agency post-mortems.**

---

### **Suggested hackathon MVP scope**

**Build & demo:**

* **Multi-source ingestion from 3–4 APIs (NEA PSI \+ dengue, PUB flood, LTA incidents)**  
* **Leader view: multi-agency map \+ Foresight Engine with pre-computed scenarios \+ what-if simulator**  
* **Responder view: map with live incidents \+ routing demo \+ one scene context card**  
* **Resident view: Personal Crisis Card \+ watch points \+ action-first alerts \+ NL query**

**Roadmap (mention but don't build): Full predictive model calibration, real agency SSO, misinformation flagging, post-incident review pack, offline-first responder mode.**

# Speaker script

**\[0:00 \- 0:15\] The Hook & Scenario**

"Imagine a flash flood on Orchard Road paired with a commuter's cardiac arrest. Currently, responders must juggle apps like OneService and myResponder, while PUB manually alerts LTA for road closures. This fragmentation costs lives."

**\[0:15 \- 0:30\] The Core Pain Point**

"Public safety is siloed. Responders face multi-app overload, and citizens get confusing text alerts lacking spatial context. We have the data but lack a centralized display."

**\[0:30 \- 0:50\] The Solution & User Flow**

"Meet **murusSG**. We normalize real-time feeds from NEA, PUB, MOH, and LTA into one geospatial engine. Responders get a shared AI-powered dashboard for seamless coordination, while residents receive visual, hyperlocal evacuation routes via OneMap."

**\[0:50 \- 1:00\] The Close**

"By moving from reactive to predictive management, murusSG replaces disjointed chaos with absolute clarity when every second counts."

\[0:00 \- 0:15\] The Hook & Scenario

**\[slide 2\]** "Imagine a sudden flash flood hits Orchard Road. At the exact same moment, a nearby commuter suffers a cardiac arrest from the panic. Right now, managing this requires a responder to frantically switch between the OneService PUB app to report flooding and SCDF's myResponder for the medical emergency. PUB would have to contact LTA to inform them of this for road closure. **\[Slide 3\]** In crisis response, this data fragmentation costs damage and impact and potentially even lives."

\[0:15 \- 0:30\] The Core Pain Point

"Our current public safety ecosystem is trapped in silos. Responders are bogged down by a multi-app cognitive overload, while citizens receive confusing, raw text alerts without any spatial context. We don’t lack information—we lack a centralised platform to display this information."

\[0:30 \- 0:50\] The Solution & User Flow

**\[slide 4,5,6\]** "Enter murusSG. Our platform ingests and normalizes real-time feeds from several agencies like NEA, PUB, MOH, and LTA into a single geospatial event engine. For responders, the flow is seamless: a shared AI-powered dashboard instantly maps resource capacities and coordinates cross-agency dispatch without information lag. **\[slide 7,8\]** For residents, our OneMap integration turns raw alerts into visual, hyperlocal evacuation routes straight to their phones."

\[0:50 \- 1:00\] The Close

"By shifting our crisis management from reactive to predictive , murusSG eliminates the chaos of disjointed systems to deliver absolute clarity when every second counts." 

# DATA

   
NEA, MOH, PUB: weather, environmental  
SCDF, SPF: terrorist attacks (MAPS, scenarios, etc)  
LTA, SCDF: road condition

# Data source APIs

#### 

#### **1\. NEA — Environmental Data (data.gov.sg)**

Base URL: `https://api.data.gov.sg/v1/environment/`

| Endpoint | What it returns | Update frequency | Notes |
| ----- | ----- | ----- | ----- |
| `/psi` | PSI readings across 5 regions (north/south/east/west/central) \+ national | Hourly | 5 areas with 12 pollutant sub-indices including CO, NO2, O3, SO2 [Ministry of Home Affairs](https://www.mha.gov.sg/what-we-do/managing-security-threats/sgsecure/) |
| `/pm25` | PM2.5 readings by region | Hourly | Matches PSI regions |
| `/air-temperature` | Temperature per weather station \+ station coordinates | \~30 sec | Multiple stations across SG |
| `/rainfall` | Rainfall per station | 5 min | Critical for flood prediction |
| `/relative-humidity` | Humidity readings | \~1 min |  |
| `/wind-direction` | Wind direction per station | \~30 sec | For haze trajectory modelling |
| `/wind-speed` | Wind speed per station | \~30 sec |  |
| `/uv-index` | UV index | Hourly (7am-7pm) |  |
| `/2-hour-weather-forecast` | Forecast for 47 areas in Singapore | 30 min | Granular forecasts |
| `/24-hour-weather-forecast` | Today's 24hr forecast | Multiple/day |  |
| `/4-day-weather-forecast` | 4-day outlook | 2x/day |  |

**Lightning, WBGT (Wet Bulb Globe Temperature) & Heat Stress** — also available via the same `/v1/environment/` namespace (newer 2025/26 additions).

---

#### **2\. NEA — Dengue Clusters (Geospatial)**

`GET https://data.gov.sg/api/action/datastore_search?resource_id=d_dbfabf16158d1b0e1c420627c0819168`

Returns **GeoJSON** polygons of active dengue clusters with:

* `LOCALITY` — neighbourhood name  
* `CASE_SIZE` — number of cases  
* `geometry` — polygon coordinates of the affected zone

This is the *exact* dataset NEA uses on its own dengue cluster map.

---

#### **3\. PUB — Flood & Water Data**

| Endpoint | Returns |
| ----- | ----- |
| `https://data.gov.sg/api/action/datastore_search?resource_id=d_f1404e08587ce555b9ea3f565e2eb9a3` | Real-time flood alert events across Singapore with location, severity, and source [National Centre for Infectious Diseases](https://www.ncid.sg/News-Events/News/Pages/Sharp-rise-in-dengue-infections-over-5,500-cases-so-far-this-year.aspx) |
| `https://data.gov.sg/api/action/datastore_search?resource_id=d_31333fa5cf0834f012d840365b336610` | PUB Water Level Sensor locations (GeoJSON) — 300+ sensors in drains and canals monitoring water levels [HealthHub](https://www.healthhub.sg/health-conditions/topic_dengue_fever_moh) |

**Note:** Live sensor readings (water-level percentages) are not in the public API. You can simulate or display the alert API \+ sensor locations \+ sensor IDs.

---

#### **4\. LTA DataMall — Transport, Traffic & Cross-Agency**

Base URL: `https://datamall2.mytransport.sg/ltaodataservice/`

**Requires free API key** from [https://datamall.lta.gov.sg](https://datamall.lta.gov.sg) — register with your email. Pass it as header `AccountKey: <your_key>`.

| Endpoint | Returns | Update freq |
| ----- | ----- | ----- |
| `/TrafficIncidents` | Accidents, breakdowns, road blocks, diversions — with lat/long | 2 min |
| `/EstTravelTimes` | Expressway segment travel times | 5 min |
| `/TrafficSpeedBands` | Road speed bands (congestion) | 5 min |
| `/Traffic-Imagesv2` | Live traffic camera images islandwide | 1-5 min |
| `/FaultyTrafficLights` | Faulty / under-maintenance traffic lights | live |
| `/TrainServiceAlerts` | Real-time train service alerts including disruptions and shuttle services [saashub](https://www.saashub.com/compare-alertus-unified-mass-notification-system-vs-mass-notification) | live |
| `/PCDRealTime` | Crowd density at MRT stations | 10 min |
| `/PCDForecast` | Forecast crowd at MRT stations | 30 min intervals |
| `/BusArrivalv2` | Bus arrivals at any stop | live |
| `/RoadWorks` | Active and planned roadworks | live |
| `/RoadOpenings` | Approved road openings | live |
| `/CarParkAvailabilityv2` | HDB/LTA/URA carpark lots | 1 min |
| `/Flood-Alerts` | Flood alert information across Singapore, provided by PUB [globenewswire](https://www.globenewswire.com/news-release/2014/06/10/642862/23193/en/X-Factor-s-New-Communications-Platform-Sends-Immediate-Mass-Notifications-and-Alerts-to-Multiple-Devices-for-Schools-and-Public-Venues-During-Emergency-Lockdowns.html) — second source same as PUB direct |  |

The LTA Flood-Alerts endpoint is your easiest backup if direct PUB access is slow.

---

#### **5\. SCDF — Civil Defence Assets**

All via `https://data.gov.sg/api/action/datastore_search?resource_id=<id>`:

| Asset | Dataset ID | Returns |
| ----- | ----- | ----- |
| Public Access AEDs | `d_4e6b82c58a8a832f6f1fee5dfa6d47ea` | GeoJSON of all public AEDs with AED\_ID, OPERATING\_HOURS, address, coordinates [PUB](https://www.pub.gov.sg/Public/KeyInitiatives/Flood-Resilience/Flood-Forecasting-and-Monitoring) |
| Fire Stations | `d_5d3d2c4f3556edb5d8c995f42e603b24` | GeoJSON: name, postal code, address, phone numbers, coordinates [PUB](https://www.pub.gov.sg/Public/KeyInitiatives/Flood-Resilience/Flood-Response) |
| Civil Defence Public Shelters | `d_291795a678b8cf82f108780a6235ce18` | Shelter locations & capacity (for SG Alert / civil emergency redirection) |
| Bomb Shelters | available | Location of designated bomb shelters |

These are exactly what your **Public Dashboard "Find Nearest Shelter / AED"** features need.

---

#### **6\. MOH — Health & Disease Data**

| Endpoint | Returns |
| ----- | ----- |
| `https://data.gov.sg/api/action/datastore_search?resource_id=d_ca168b2cb763640d72c4600a68f9909e` | Weekly Infectious Disease Bulletin Cases — dengue, HFMD, influenza, etc |
| MOH COVID-19 Weekly Stats collection (id `522`) | 7-day MA estimated COVID infections, hospital admissions, ICU |

Plus the MOH publishes weekly **DORSCON status** and **infectious diseases bulletins** as PDFs on `moh.gov.sg`. For the prototype, you can hardcode DORSCON state as a configurable variable in your backend (since it changes rarely).

---

#### **7\. OneMap — Singapore's Official Geospatial API**

Base URL: `https://www.onemap.gov.sg/api/` Docs: [https://www.onemap.gov.sg/docs/](https://www.onemap.gov.sg/docs/)

**Authentication:** Register a free account, then POST email+password to `/auth/post/getToken` to get a JWT valid for 3 days.

| Endpoint | What it does |
| ----- | ----- |
| `/common/elastic/search` | Geocoding — address → coordinates |
| `/public/revgeocode` | Reverse geocoding — coords → address |
| `/public/routingsvc/route` | Routing between two points — supports driving, walking, cycling, public transport modes [International Fire & Safety Journal](https://internationalfireandsafetyjournal.com/myresponder-scdf-network/) |
| `/public/popapi/getEconomicStatus` | Population/demographics by planning area |
| `/public/themesvc/getThemes` | 100+ thematic layers for amenities, boundaries, locations [Ministry of Health](https://www.moh.gov.sg/newsroom/new-dengue-alert-map-on-moh-and-nea-websites/) |
| `/public/themesvc/retrieveTheme` | Pull specific layer data |
| `/staticmap/getStaticImage` | Static map images with overlays |

This replaces Google Maps entirely — it's free, government-grade, and includes Singapore-specific data layers like planning areas, MRT stations, schools, hospitals.

---

#### **8\. Singapore Police Force (SPF) — Crime & Incidents**

SPF does not expose a real-time incident API publicly. However:

* **NPC Boundaries** \+ **Police Centre locations** are on data.gov.sg (search "SPF" or "Police")  
* **Crime statistics** are available as quarterly/annual datasets  
* **Public Sentiment Reports** via the Police@SG mobile app are not publicly API'd

For your responder portal, you'll likely **mock the SPF live unit data** in your prototype — it's authentic to scope this as "would require government partnership for production access."

---

#### **9\. HDB & Population Data (for planning context)**

| Dataset | Use case |
| ----- | ----- |
| `https://data.gov.sg/api/action/datastore_search?resource_id=<hdb-resale-id>` | HDB blocks & locations — for ground-level crisis response |
| Singapore Department of Statistics population grids | Population density per planning area for crisis impact estimation |
| Open-Government's `Geographic boundary` layers via OneMap | Planning area polygons (55 areas) |

---

#### **10\. NVPC — Volunteer Network**

NVPC's **Giving.sg** does not expose a developer API publicly. For your **Volunteer Sign-Up** screen, your backend stores volunteer profiles in your own DB. You can mention in your pitch that you'd partner with NVPC for production cross-verification.

[image1]: <data:image/png;base64,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>