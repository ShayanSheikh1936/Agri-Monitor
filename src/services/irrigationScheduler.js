// =============================================================================
// Smart Irrigation Scheduler — pure FAO-56 style planning engine.
//
//  - No UI, no network, no Firestore: takes the crop entry plus normalized
//    weather (from weatherService.js) and returns a deterministic 7-day
//    watering plan. Same input -> same plan, so it is trivially testable.
//  - Stage based: the crop coefficient (Kc) follows the FAO growth stages
//    derived LIVE from SowingDate (establishment -> vegetative -> flowering
//    -> ripening), so water demand rises and falls with the crop itself.
//  - Weather based: daily FAO ET0 (Open-Meteo, Hargreaves fallback when the
//    field is missing) drives evapotranspiration demand; a root-zone soil
//    water bucket absorbs effective rainfall and triggers a watering day
//    only when the readily available water drains below the trigger point.
//  - System based: net need is grossed up by the recorded irrigation
//    system's field efficiency (drip / sprinkler / flood) and paired with a
//    system-appropriate watering window.
//  - Never invents: missing weather degrades to a clearly flagged
//    stage-baseline plan (`baseline: true`) instead of fake rainfall.
// =============================================================================

import { getGpsLocation, getPlantAgeInfo, localDateISO } from "../lib/cropUtils.js";

// -----------------------------------------------------------------------------
// Recorded irrigation systems (values stored by addnewcrop.jsx)
// -----------------------------------------------------------------------------

export const IRRIGATION_SYSTEMS = {
  Drip: {
    label: "Drip Irrigation",
    efficiency: 0.9,
    window: "06:00 – 08:00",
    windowNote: "dawn, minimal evaporation loss",
  },
  Sprinkler: {
    label: "Sprinkler System",
    efficiency: 0.75,
    window: "06:00 – 09:00",
    windowNote: "morning, before wind picks up",
  },
  Flood: {
    label: "Flood Water System",
    efficiency: 0.6,
    window: "17:00 – 19:00",
    windowNote: "evening, lower evaporation loss",
  },
};

const DEFAULT_SYSTEM = {
  label: "Unrecorded system",
  efficiency: 0.7,
  window: "06:00 – 09:00",
  windowNote: "morning window",
};

// -----------------------------------------------------------------------------
// Soil water holding capacity (mm of available water per metre of root zone)
// -----------------------------------------------------------------------------

const SOILS = {
  Loamy: { awc: 150 },
  Clay: { awc: 180 },
  Sandy: { awc: 90 },
  PottingMix: { awc: 120 },
};
const DEFAULT_SOIL = { awc: 140 };

// Fraction of the root-zone reserve the crop may deplete before stress
// (management allowed depletion), and the bucket level irrigation refills
// to. The trigger sits at 1 - MAD of field capacity equivalent.
const MAD = 0.5;
const REFILL_FRACTION = 0.9;
const TRIGGER_FRACTION = 0.35;

// Weather adjustment thresholds.
const RAIN_SKIP_MM = 5; // a rain day that refills the root zone on its own
const RAIN_CREDIT = 0.8; // share of forecast rain that reaches the root zone
const HEAT_MAX_C = 35; // heatwave: dawn window + 10% volume
const FROST_MIN_C = 2; // frost night: hold irrigation entirely
const WIND_MAX_KMH = 25; // too windy for a uniform sprinkler pass

// Climatological fallback when no live weather exists at all (mm/day).
const BASELINE_ET0 = 4.5;

// -----------------------------------------------------------------------------
// Crop water profiles — FAO-56 Kc triples (initial / mid / end) and cycle
// length in days. Local (Urdu) crop names are matched as well.
// -----------------------------------------------------------------------------

const CROP_PROFILES = [
  { match: ["wheat", "gandum"], cycleDays: 150, kc: [0.4, 1.15, 0.3], rootDepthM: 1.0 },
  { match: ["rice", "chawal", "paddy"], cycleDays: 115, kc: [1.05, 1.2, 0.95], rootDepthM: 0.6 },
  { match: ["maize", "corn", "makai"], cycleDays: 120, kc: [0.3, 1.2, 0.35], rootDepthM: 0.9 },
  { match: ["tomato", "tamatar"], cycleDays: 105, kc: [0.45, 1.15, 0.45], rootDepthM: 0.6 },
  { match: ["potato", "aloo"], cycleDays: 100, kc: [0.5, 1.15, 0.75], rootDepthM: 0.5 },
  { match: ["onion", "pyaz"], cycleDays: 100, kc: [0.7, 1.05, 0.75], rootDepthM: 0.4 },
  { match: ["cotton", "kapas"], cycleDays: 160, kc: [0.35, 1.15, 0.65], rootDepthM: 1.0 },
  { match: ["sugarcane", "ganna"], cycleDays: 320, kc: [0.85, 1.25, 0.75], rootDepthM: 1.2 },
  { match: ["chili", "chilli", "mirch"], cycleDays: 100, kc: [0.45, 1.1, 0.45], rootDepthM: 0.6 },
  { match: ["okra", "bhindi"], cycleDays: 85, kc: [0.45, 1.1, 0.45], rootDepthM: 0.6 },
  { match: ["carrot", "gajar"], cycleDays: 90, kc: [0.5, 1.05, 0.6], rootDepthM: 0.5 },
  { match: ["spinach", "palak", "saag"], cycleDays: 45, kc: [0.7, 1.0, 0.7], rootDepthM: 0.4 },
];

// Category fallbacks (CropCategory values stored by addnewcrop.jsx).
const CATEGORY_PROFILES = {
  Vegetable: { cycleDays: 90, kc: [0.45, 1.1, 0.45], rootDepthM: 0.5 },
  Grain: { cycleDays: 120, kc: [0.4, 1.1, 0.4], rootDepthM: 0.9 },
  Herbs: { cycleDays: 90, kc: [0.5, 1.0, 0.5], rootDepthM: 0.4 },
  Indoor: { cycleDays: 90, kc: [0.6, 0.9, 0.6], rootDepthM: 0.3 },
};

const FALLBACK_PROFILE = { cycleDays: 120, kc: [0.4, 1.1, 0.4], rootDepthM: 0.6 };

// Perennial (Fruit category) model: stages follow the season, not the days
// since planting — a mango tree planted last month is not "day 30" of its
// cycle. Hemisphere is inferred from the field latitude.
const FRUIT_PROFILE = {
  perennial: true,
  cycleDays: 365,
  stageKc: [0.55, 0.85, 0.95, 0.7],
  stageNames: [
    "Dormancy / winter",
    "Blossom / spring",
    "Fruit development",
    "Harvest / autumn",
  ],
  rootDepthM: 1.2,
};

const STAGE_NAMES = [
  "Establishment",
  "Vegetative growth",
  "Flowering / mid-season",
  "Ripening / late season",
];
// FAO growth-stage boundaries as fractions of the full cycle.
const STAGE_BOUNDS = [0, 0.15, 0.4, 0.75, 1];

function round1(value) {
  return Math.round(value * 10) / 10;
}

function pickProfile(crop) {
  const name = String(crop?.CropName ?? "").toLowerCase();
  const hit = CROP_PROFILES.find((p) => p.match.some((m) => name.includes(m)));
  if (hit) return { ...hit, stageNames: STAGE_NAMES };
  if (crop?.CropCategory === "Fruit") return { ...FRUIT_PROFILE, stageNames: FRUIT_PROFILE.stageNames };
  const byCat = CATEGORY_PROFILES[crop?.CropCategory];
  if (byCat) return { ...byCat, stageNames: STAGE_NAMES };
  return { ...FALLBACK_PROFILE, stageNames: STAGE_NAMES };
}

// Kc representative of each of the four FAO stages, derived from the
// initial/mid/end triple (dev & late stages sit midway between neighbours).
function stageKcOf(profile) {
  if (Array.isArray(profile.stageKc)) return profile.stageKc;
  const [ini, mid, end] = profile.kc;
  return [ini, (ini + mid) / 2, mid, (mid + end) / 2];
}

function stageIndexForFraction(fraction) {
  for (let i = STAGE_BOUNDS.length - 2; i >= 0; i--) {
    if (fraction >= STAGE_BOUNDS[i]) return i;
  }
  return 0;
}

// Perennial stage from the season: month mapped onto the northern-hemisphere
// calendar first, so southern fields get mirrored seasons for free.
function fruitStageIndex(now, lat) {
  const month = (lat ?? 25) >= 0 ? now.getMonth() : (now.getMonth() + 6) % 12;
  if (month >= 2 && month <= 4) return 1; // Mar–May blossom
  if (month >= 5 && month <= 7) return 2; // Jun–Aug fruit development
  if (month >= 8 && month <= 9) return 3; // Sep–Oct harvest
  return 0; // Nov–Feb dormancy
}

/**
 * Resolves the crop's current FAO growth stage plus the full stage table.
 * Pure: reads only the crop entry and the clock.
 */
export function resolveCropStage(crop, now = new Date()) {
  const profile = pickProfile(crop);
  const stageKc = stageKcOf(profile);
  const ageInfo = getPlantAgeInfo(crop, now);
  const lat = getGpsLocation(crop)?.lat ?? null;

  const stages = stageKc.map((kc, i) => ({
    index: i,
    name: profile.stageNames[i] ?? STAGE_NAMES[i],
    kc: round1(kc * 100) / 100,
    fromDay: Math.round(STAGE_BOUNDS[i] * profile.cycleDays),
    toDay: Math.round(STAGE_BOUNDS[i + 1] * profile.cycleDays),
  }));

  const base = {
    profile,
    stages,
    cycleDays: profile.cycleDays,
    perennial: Boolean(profile.perennial),
    notStarted: ageInfo.status === "notStarted",
    daysUntil: ageInfo.daysUntil,
    ageUnknown: ageInfo.status === "unknown",
    ageDays: ageInfo.days,
    complete: false,
  };

  if (profile.perennial) {
    const index = fruitStageIndex(now, lat);
    return {
      ...base,
      index,
      name: stages[index].name,
      kc: stages[index].kc,
      fraction: null,
      stages: stages.map((s) => ({ ...s, current: s.index === index })),
    };
  }

  // Annuals: fraction of the cycle elapsed, live from SowingDate.
  const age = ageInfo.status === "active" ? ageInfo.days : 0;
  const complete = ageInfo.status === "active" && age > profile.cycleDays;
  const fraction = Math.min(age / profile.cycleDays, 1);
  const index = complete ? 3 : stageIndexForFraction(fraction);
  return {
    ...base,
    index,
    name: complete ? "Cycle complete" : stages[index].name,
    kc: stages[index].kc,
    fraction,
    complete,
    stages: stages.map((s) => ({ ...s, current: s.index === index && !complete })),
  };
}

// Kc for a crop `offsetDays` days from now — lets the 7-day plan cross a
// stage boundary instead of freezing today's stage for the whole week.
function kcOnDay(stageInfo, offsetDays) {
  if (stageInfo.perennial || stageInfo.complete) return stageInfo.kc;
  const age = (stageInfo.ageDays ?? 0) + offsetDays;
  if (stageInfo.notStarted || stageInfo.ageDays == null) return stageInfo.stages[0].kc;
  const fraction = Math.min(Math.max(age / stageInfo.cycleDays, 0), 1);
  if (age > stageInfo.cycleDays) return stageInfo.stages[3].kc;
  return stageInfo.stages[stageIndexForFraction(fraction)].kc;
}

// -----------------------------------------------------------------------------
// Hargreaves ET0 fallback (used only when Open-Meteo's FAO ET0 is absent).
// -----------------------------------------------------------------------------

function dayOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date - start) / 86400000);
}

function hargreavesET0(tmax, tmin, lat, date) {
  if (tmax == null || tmin == null || lat == null) return null;
  const td = tmax - tmin;
  if (td <= 0) return null;
  const j = dayOfYear(date);
  const dr = 1 + 0.033 * Math.cos((2 * Math.PI * j) / 365);
  const delta = 0.409 * Math.sin((2 * Math.PI * j) / 365 - 1.39);
  const phi = (lat * Math.PI) / 180;
  const ws = Math.acos(Math.max(-1, Math.min(1, -Math.tan(phi) * Math.tan(delta))));
  const ra =
    ((24 * 60) / Math.PI) *
    0.082 *
    dr *
    (ws * Math.sin(phi) * Math.sin(delta) +
      Math.cos(phi) * Math.cos(delta) * Math.sin(ws));
  const tmean = (tmax + tmin) / 2;
  return 0.0023 * (tmean + 17.8) * Math.sqrt(td) * Math.sqrt(ra);
}

function parseDate(iso) {
  const [y, m, d] = String(iso).slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}

// -----------------------------------------------------------------------------
// The schedule itself
// -----------------------------------------------------------------------------

/**
 * Builds the 7-day smart watering plan for one crop.
 *
 * @param {object} args
 *   crop     crop entry from crops/{uid} (CropName, SowingDate, SoilType,
 *            IrrigationType, gpsLocation…)
 *   weather  normalized weatherService payload, or null on weather failure
 *   now      injectable clock (tests / midnight tick)
 * @returns {object} plan — see field comments inline.
 */
export function buildIrrigationSchedule({ crop, weather = null, now = new Date() } = {}) {
  const stageInfo = resolveCropStage(crop, now);
  const systemKey = IRRIGATION_SYSTEMS[crop?.IrrigationType] ? crop.IrrigationType : null;
  const system = systemKey ? IRRIGATION_SYSTEMS[systemKey] : DEFAULT_SYSTEM;
  const soilKey = SOILS[crop?.SoilType] ? crop.SoilType : null;
  const soil = soilKey ? SOILS[soilKey] : DEFAULT_SOIL;
  const lat = getGpsLocation(crop)?.lat ?? null;

  // Seven planning days: live forecast days when available, otherwise plain
  // calendar days driven by the climatological baseline ET0.
  const liveDays = Array.isArray(weather?.daily) ? weather.daily.slice(0, 7) : [];
  const baseline = liveDays.length === 0;
  const days7 = liveDays.length
    ? liveDays
    : Array.from({ length: 7 }, (_, i) => ({ date: localDateISO(i) }));

  // Readily available water in the root zone (mm) at the current stage:
  // roots deepen with the crop, so the bucket grows with it.
  const rootDepth =
    0.25 +
    (stageInfo.profile.rootDepthM - 0.25) *
      (stageInfo.perennial ? 1 : Math.min(stageInfo.fraction ?? 0, 1));
  const capacity = Math.max(soil.awc * rootDepth * MAD, 5);
  let bucket = capacity * 0.55; // mid-range starting reserve

  const days = days7.map((d, i) => {
    const date = d.date ?? localDateISO(i);
    const dateObj = parseDate(date);
    const tmax = d.tempMaxC ?? null;
    const tmin = d.tempMinC ?? null;
    const rain = d.precipitationSumMm ?? 0;
    const wind = d.windSpeedMaxKmh ?? null;

    const et0 =
      d.et0Mm ?? hargreavesET0(tmax, tmin, lat, dateObj) ?? BASELINE_ET0;
    const kc = kcOnDay(stageInfo, i);
    const etc = round1(kc * et0); // crop water demand, mm/day

    // Drain, then let effective rainfall refill what fits.
    bucket = Math.max(bucket - etc, -capacity);
    const pe = Math.min(rain * RAIN_CREDIT, Math.max(capacity - bucket, 0));
    bucket += pe;

    const flags = [];
    if (tmax != null && tmax >= HEAT_MAX_C) flags.push("heat");
    if (tmin != null && tmin <= FROST_MIN_C) flags.push("frost");
    if (wind != null && wind >= WIND_MAX_KMH) flags.push("wind");
    if (rain >= RAIN_SKIP_MM) flags.push("rain");

    let action = "rest";
    let grossMm = 0;
    let window = system.window;
    let reason;

    if (stageInfo.notStarted) {
      reason = `Sowing starts in ${stageInfo.daysUntil} day${stageInfo.daysUntil === 1 ? "" : "s"} — no watering yet.`;
    } else if (stageInfo.complete) {
      reason = "Growth cycle complete — irrigation closed for this season.";
    } else if (flags.includes("frost")) {
      action = "skip";
      reason = `Frost risk (min ≈ ${tmin}°C) — irrigation held to avoid root damage.`;
    } else if (flags.includes("rain") && bucket >= capacity * TRIGGER_FRACTION) {
      action = "skip";
      reason = `Rain ≈ ${round1(rain)} mm refills the root zone — session skipped.`;
    } else if (bucket <= capacity * TRIGGER_FRACTION) {
      action = "water";
      const reservePct = Math.round((bucket / capacity) * 100);
      let net = capacity * REFILL_FRACTION - bucket;
      if (flags.includes("heat")) {
        net *= 1.1; // heatwave compensation
        window = "05:30 – 07:00";
      } else if (flags.includes("wind") && systemKey === "Sprinkler") {
        window = "18:00 – 20:00"; // calm evening pass for sprinklers
      }
      grossMm = round1(net / system.efficiency);
      bucket += net;
      reason =
        `Root-zone reserve down to ~${Math.max(reservePct, 0)}% — ` +
        `apply ≈ ${grossMm} mm (${system.label ?? systemKey}).`;
    } else {
      reason = `Soil reserve still ~${Math.round((bucket / capacity) * 100)}% — no watering needed.`;
    }

    return {
      date,
      weekday: dateObj.toLocaleDateString(undefined, { weekday: "short" }),
      dayNum: dateObj.getDate(),
      isToday: i === 0,
      et0: round1(et0),
      kc,
      etc,
      rainMm: round1(rain),
      rainProbability: d.precipitationProbabilityMaxPercent ?? null,
      tmax,
      tmin,
      windMax: wind,
      flags,
      action,
      grossMm,
      window: action === "water" ? window : null,
      reason,
      moisturePct: Math.round(Math.min(Math.max((bucket / capacity) / 1, 0), 1) * 100),
    };
  });

  const nextSession = days.find((d) => d.action === "water") ?? null;
  const notes = [];
  if (baseline)
    notes.push({
      kind: "baseline",
      text: "Live weather unavailable — showing stage-based baseline demand. Add a field location / check connection for rain-aware planning.",
    });
  if (days.some((d) => d.action === "skip" && d.flags.includes("rain")))
    notes.push({
      kind: "rain",
      text: "Rain day(s) auto-skipped — the schedule resumes once the soil reserve drains again.",
    });
  if (days.some((d) => d.flags.includes("heat") && d.action === "water"))
    notes.push({
      kind: "heat",
      text: "Heatwave ahead — dawn watering with +10% volume on hot days.",
    });
  if (days.some((d) => d.flags.includes("frost")))
    notes.push({
      kind: "frost",
      text: "Frost night detected — irrigation held on that day.",
    });
  if (days.some((d) => d.flags.includes("wind")) && systemKey === "Sprinkler")
    notes.push({
      kind: "wind",
      text: "Windy day(s) — sprinkler passes moved to the calm evening window.",
    });

  return {
    baseline,
    system: { key: systemKey, label: system.label, efficiency: system.efficiency, window: system.window, windowNote: system.windowNote },
    soil: { key: soilKey, awc: soil.awc, rootDepthM: round1(rootDepth * 100) / 100 },
    stage: stageInfo,
    days,
    nextSession: nextSession
      ? {
          ...nextSession,
          inDays: days.indexOf(nextSession),
        }
      : null,
    totals: {
      waterDays: days.filter((d) => d.action === "water").length,
      weeklyMm: round1(days.reduce((s, d) => s + d.grossMm, 0)),
      rainMm: round1(days.reduce((s, d) => s + d.rainMm, 0)),
      demandMm: round1(days.reduce((s, d) => s + d.etc, 0)),
    },
    notes,
    moistureNowPct: days[0]?.moisturePct ?? 0,
    capacityMm: round1(capacity),
  };
}
