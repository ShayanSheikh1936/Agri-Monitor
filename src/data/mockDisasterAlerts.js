// =============================================================================
// Mock disaster alert feed — used by disasterAlertService.js whenever no real
// API endpoint (VITE_DISASTER_API_URL) is configured.
//
// The shape mirrors what a real disaster/weather API integration would return
// (see normalizeApiAlert in disasterAlertService.js), so swapping the mock
// for live data only touches the service layer — never the UI.
//
// All timestamps are generated RELATIVE TO NOW so the feed always looks live.
// =============================================================================

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

// -----------------------------------------------------------------------------
// Monitored regions (the location selector)
// -----------------------------------------------------------------------------

export const MOCK_DISASTER_REGIONS = [
  {
    id: "punjab-plains",
    name: "Punjab Plains · Sutlej Basin",
    country: "India",
    bounds: { south: 30.2, north: 31.6, west: 74.6, east: 76.6 },
    center: { lat: 30.9, lon: 75.6 },
  },
  {
    id: "coastal-andhra",
    name: "Coastal Andhra · Krishna Delta",
    country: "India",
    bounds: { south: 15.7, north: 16.9, west: 79.8, east: 81.3 },
    center: { lat: 16.3, lon: 80.55 },
  },
  {
    id: "marathwada",
    name: "Marathwada · Godavari Belt",
    country: "India",
    bounds: { south: 18.8, north: 20.0, west: 75.2, east: 77.2 },
    center: { lat: 19.4, lon: 76.2 },
  },
  {
    id: "teesta-basin",
    name: "North Bengal · Teesta Basin",
    country: "India",
    bounds: { south: 25.9, north: 26.7, west: 88.3, east: 89.7 },
    center: { lat: 26.3, lon: 89.0 },
  },
];

// -----------------------------------------------------------------------------
// Active alerts — built fresh on every call so times stay realistic
// -----------------------------------------------------------------------------

function activeAlerts(now) {
  return [
    // --- Punjab Plains -------------------------------------------------------
    {
      id: "da-flood-001",
      type: "flood",
      name: "Riverine Flooding — Sutlej Rise",
      regionId: "punjab-plains",
      location: "Fazilka & Firozpur lowlands",
      coordinates: { lat: 30.95, lon: 75.35 },
      severity: "critical",
      status: "active",
      riskLevel: "extreme",
      issuedAt: now - 6 * HOUR,
      startsAt: now - 4 * HOUR,
      endsAt: now + 60 * HOUR,
      expectedDuration: "48–72 hours",
      affectedRadiusKm: 42,
      agriculturalRisk:
        "Standing paddy and basmati fields face submergence; topsoil erosion and nutrient wash-off expected in low-lying blocks.",
      description:
        "Upstream releases have pushed the Sutlej above danger level. Low-lying agricultural blocks along the river belt are inundating, with waterlogging expected to persist until flows recede.",
      impact: { crops: 0.92, livestock: 0.72, irrigation: 0.58, soil: 0.82, equipment: 0.76, infrastructure: 0.68 },
      source: "Agri Monitor Mock Feed",
    },
    {
      id: "da-hr-002",
      type: "heavy_rain",
      name: "Persistent Monsoon Bursts",
      regionId: "punjab-plains",
      location: "Ludhiana–Moga belt",
      coordinates: { lat: 31.25, lon: 75.85 },
      severity: "high",
      status: "active",
      riskLevel: "high",
      issuedAt: now - 10 * HOUR,
      startsAt: now - 2 * HOUR,
      endsAt: now + 36 * HOUR,
      expectedDuration: "24–36 hours",
      affectedRadiusKm: 30,
      agriculturalRisk:
        "Delayed field operations, spray wash-off and localized waterlogging in poorly drained plots.",
      description:
        "Repeated rain bursts (60–90 mm cumulative expected) will keep fields saturated and interrupt harvesting and spraying windows.",
      impact: { crops: 0.62, livestock: 0.3, irrigation: 0.25, soil: 0.55, equipment: 0.35, infrastructure: 0.3 },
      source: "Agri Monitor Mock Feed",
    },
    {
      id: "da-hail-003",
      type: "hailstorm",
      name: "Localized Hail Cells",
      regionId: "punjab-plains",
      location: "Ropur foothill farms",
      coordinates: { lat: 31.0, lon: 76.3 },
      severity: "medium",
      status: "watch",
      riskLevel: "moderate",
      issuedAt: now - 3 * HOUR,
      startsAt: now + 5 * HOUR,
      endsAt: now + 14 * HOUR,
      expectedDuration: "2–4 hours (evening window)",
      affectedRadiusKm: 14,
      agriculturalRisk:
        "Bruising and lodging risk for horticulture and late-sown vegetables in the cell path.",
      description:
        "Convective cells capable of pea-sized hail may form over the foothill belt during the evening. Coverage is patchy — impacts will be highly localized.",
      impact: { crops: 0.55, livestock: 0.2, irrigation: 0.1, soil: 0.1, equipment: 0.2, infrastructure: 0.25 },
      source: "Agri Monitor Mock Feed",
    },
    {
      id: "da-fire-004",
      type: "wildfire",
      name: "Field-Border Fire Risk",
      regionId: "punjab-plains",
      location: "Bathinda dry belt",
      coordinates: { lat: 30.4, lon: 74.95 },
      severity: "low",
      status: "advisory",
      riskLevel: "low",
      issuedAt: now - 20 * HOUR,
      startsAt: now,
      endsAt: now + 3 * DAY,
      expectedDuration: "Next 72 hours",
      affectedRadiusKm: 18,
      agriculturalRisk:
        "Dry crop residue and bunds can carry fire into standing crops; check stubble plots and storage yards.",
      description:
        "Dry residue moisture is low and afternoon winds are breezy — any field-border fire can spread quickly. Advisory for residue management.",
      impact: { crops: 0.3, livestock: 0.15, irrigation: 0.05, soil: 0.25, equipment: 0.2, infrastructure: 0.3 },
      source: "Agri Monitor Mock Feed",
    },

    // --- Coastal Andhra ------------------------------------------------------
    {
      id: "da-cyc-005",
      type: "cyclone",
      name: "Cyclonic Storm Watch — Bay of Bengal",
      regionId: "coastal-andhra",
      location: "Machilipatnam–Gudivada coast",
      coordinates: { lat: 16.1, lon: 80.9 },
      severity: "critical",
      status: "active",
      riskLevel: "extreme",
      issuedAt: now - 9 * HOUR,
      startsAt: now + 18 * HOUR,
      endsAt: now + 66 * HOUR,
      expectedDuration: "Landfall expected within 24 hours",
      affectedRadiusKm: 65,
      agriculturalRisk:
        "Wind damage to banana and paddy, salt-water intrusion in delta fields, and storm-surge flooding of coastal aquaculture ponds.",
      description:
        "A deep depression is intensifying over the Bay of Bengal with a likely landfall near the Krishna delta. Gale-force winds, torrential rain and storm surge are expected along the coast.",
      impact: { crops: 0.88, livestock: 0.7, irrigation: 0.6, soil: 0.66, equipment: 0.8, infrastructure: 0.85 },
      source: "Agri Monitor Mock Feed",
    },
    {
      id: "da-flood-006",
      type: "flood",
      name: "Delta Backwater Inundation",
      regionId: "coastal-andhra",
      location: "Kollur–Amalapuram polders",
      coordinates: { lat: 16.0, lon: 81.15 },
      severity: "high",
      status: "active",
      riskLevel: "high",
      issuedAt: now - 14 * HOUR,
      startsAt: now + 12 * HOUR,
      endsAt: now + 4 * DAY,
      expectedDuration: "3–4 days",
      affectedRadiusKm: 28,
      agriculturalRisk:
        "Polder fields below sea level may not drain against high tides — prolonged submergence risk for paddy.",
      description:
        "Combined upstream discharge and spring tides are keeping delta outfalls closed. Pump-dependent polders will accumulate water during the storm window.",
      impact: { crops: 0.78, livestock: 0.4, irrigation: 0.55, soil: 0.6, equipment: 0.45, infrastructure: 0.5 },
      source: "Agri Monitor Mock Feed",
    },

    // --- Marathwada ----------------------------------------------------------
    {
      id: "da-heat-007",
      type: "heatwave",
      name: "Severe Heatwave",
      regionId: "marathwada",
      location: "Latur–Osmanabad plateau",
      coordinates: { lat: 19.35, lon: 76.15 },
      severity: "high",
      status: "active",
      riskLevel: "high",
      issuedAt: now - 26 * HOUR,
      startsAt: now - 24 * HOUR,
      endsAt: now + 2 * DAY,
      expectedDuration: "2–3 more days",
      affectedRadiusKm: 55,
      agriculturalRisk:
        "Heat stress in dairy herds, accelerated soil moisture loss in cotton and soy, and midday wilting in young orchards.",
      description:
        "Maximum temperatures of 41–43°C with dry winds. Evapotranspiration demand is roughly double the normal for this period.",
      impact: { crops: 0.66, livestock: 0.74, irrigation: 0.7, soil: 0.62, equipment: 0.2, infrastructure: 0.15 },
      source: "Agri Monitor Mock Feed",
    },
    {
      id: "da-drt-008",
      type: "drought",
      name: "Soil Moisture Deficit",
      regionId: "marathwada",
      location: "Beed–Jalna rain-shadow",
      coordinates: { lat: 19.05, lon: 75.75 },
      severity: "medium",
      status: "watch",
      riskLevel: "moderate",
      issuedAt: now - 3 * DAY,
      startsAt: now - 3 * DAY,
      endsAt: null,
      expectedDuration: "Season-long monitor",
      affectedRadiusKm: 60,
      agriculturalRisk:
        "Rainfall deficit of 38% over the last 30 days; reservoir levels below the ten-year average for sowing window.",
      description:
        "A slow-onset moisture deficit is building. Contingency planning for contingent crops and fodder is advised before the deficit compounds.",
      impact: { crops: 0.58, livestock: 0.44, irrigation: 0.8, soil: 0.72, equipment: 0.05, infrastructure: 0.1 },
      source: "Agri Monitor Mock Feed",
    },

    // --- North Bengal --------------------------------------------------------
    {
      id: "da-flood-009",
      type: "flood",
      name: "Flash Flood Risk — Teesta",
      regionId: "teesta-basin",
      location: "Jalpaiguri river islands",
      coordinates: { lat: 26.25, lon: 88.75 },
      severity: "high",
      status: "active",
      riskLevel: "high",
      issuedAt: now - 5 * HOUR,
      startsAt: now + 2 * HOUR,
      endsAt: now + 30 * HOUR,
      expectedDuration: "12–30 hours",
      affectedRadiusKm: 22,
      agriculturalRisk:
        "Char (river-island) vegetable plots and fodder banks can be cut off with little warning by sudden upstream releases.",
      description:
        "Catchment rainfall upstream of the Teesta barrage has spiked. Sudden release waves may raise water levels within hours.",
      impact: { crops: 0.7, livestock: 0.6, irrigation: 0.4, soil: 0.64, equipment: 0.5, infrastructure: 0.45 },
      source: "Agri Monitor Mock Feed",
    },
    {
      id: "da-quake-010",
      type: "earthquake",
      name: "Seismic Swarm Advisory",
      regionId: "teesta-basin",
      location: "Darjeeling–Kalimpong hills",
      coordinates: { lat: 26.5, lon: 89.3 },
      severity: "medium",
      status: "advisory",
      riskLevel: "moderate",
      issuedAt: now - 2 * DAY,
      startsAt: now - 2 * DAY,
      endsAt: null,
      expectedDuration: "Monitoring continues",
      affectedRadiusKm: 35,
      agriculturalRisk:
        "Landslide risk on terrace farms after tremors; check irrigation channels and hillside storage structures.",
      description:
        "A low-magnitude seismic swarm has been recorded in the hills. Slope stability on terraced farms is reduced, especially after rain.",
      impact: { crops: 0.3, livestock: 0.25, irrigation: 0.45, soil: 0.5, equipment: 0.3, infrastructure: 0.6 },
      source: "Agri Monitor Mock Feed",
    },
  ];
}

// -----------------------------------------------------------------------------
// Historical (resolved) alerts — feed for the Alert History table
// -----------------------------------------------------------------------------

function historyAlerts(now) {
  return [
    {
      id: "dh-flood-101",
      type: "flood",
      name: "Monsoon Basin Flooding",
      regionId: "punjab-plains",
      location: "Sangrur–Barnala belt",
      severity: "critical",
      startedAt: now - 34 * DAY,
      endedAt: now - 29 * DAY,
      status: "resolved",
      impactSummary: "≈4,800 ha of paddy submerged for 3–5 days; delayed wheat sowing in 120 villages.",
    },
    {
      id: "dh-cyc-102",
      type: "cyclone",
      name: "Depression Landfall",
      regionId: "coastal-andhra",
      location: "Bapatla coast",
      severity: "high",
      startedAt: now - 58 * DAY,
      endedAt: now - 56 * DAY,
      status: "resolved",
      impactSummary: "Wind damage to banana plantations; 18 hours of storm surge in coastal polders.",
    },
    {
      id: "dh-hail-103",
      type: "hailstorm",
      name: "Pre-monsoon Hail Line",
      regionId: "punjab-plains",
      location: "Sangrur–Patiala corridor",
      severity: "medium",
      startedAt: now - 92 * DAY,
      endedAt: now - 92 * DAY,
      status: "resolved",
      impactSummary: "Lodging in 8–10% of wheat plots along the cell path; localized grain shedding.",
    },
    {
      id: "dh-heat-104",
      type: "heatwave",
      name: "Terminal Heat Spell",
      regionId: "marathwada",
      location: "Parbhani–Hingoli",
      severity: "high",
      startedAt: now - 128 * DAY,
      endedAt: now - 121 * DAY,
      status: "resolved",
      impactSummary: "Grain shrivel in late wheat; dairy milk yield down 9% during peak days.",
    },
    {
      id: "dh-frost-105",
      type: "frost",
      name: "Radiation Frost Nights",
      regionId: "teesta-basin",
      location: "Cooch Behar vegetable belt",
      severity: "medium",
      startedAt: now - 180 * DAY,
      endedAt: now - 172 * DAY,
      status: "resolved",
      impactSummary: "Leaf burn in unprotected potato and tomato nurseries on two clear nights.",
    },
    {
      id: "dh-fire-106",
      type: "wildfire",
      name: "Residue Burning Spread",
      regionId: "punjab-plains",
      location: "Mansa block borders",
      severity: "medium",
      startedAt: now - 210 * DAY,
      endedAt: now - 209 * DAY,
      status: "resolved",
      impactSummary: "Field-border fires reached two fodder stacks; no standing crop lost.",
    },
    {
      id: "dh-drt-107",
      type: "drought",
      name: "Rabi Moisture Shortage",
      regionId: "marathwada",
      location: "Beed talukas",
      severity: "high",
      startedAt: now - 260 * DAY,
      endedAt: now - 205 * DAY,
      status: "resolved",
      impactSummary: "Fodder scarcity led to herd migration; tanker irrigation for 600+ orchards.",
    },
  ];
}

// -----------------------------------------------------------------------------
// Public feed builder (region-scoped)
// -----------------------------------------------------------------------------

/**
 * Builds a fresh, time-consistent mock feed for one region.
 * Returns { alerts, history, generatedAt } — same envelope the real API
 * normalizer produces.
 */
export function buildMockDisasterFeed(regionId, now = Date.now()) {
  const all = activeAlerts(now);
  const alerts = regionId ? all.filter((a) => a.regionId === regionId) : all;
  const history = historyAlerts(now).filter((a) => !regionId || a.regionId === regionId);
  return { alerts, history, generatedAt: now };
}
