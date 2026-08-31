// =============================================================================
// Weather alert rules engine — detects meaningful agricultural weather
// conditions from the normalized Open-Meteo payload produced by
// weatherService.js (fetchWeatherForCrop).
//
// DESIGN DECISIONS:
//  - Pure logic, no UI / no Firestore — thresholds live HERE (configurable
//    via ALERT_THRESHOLDS overrides), never inside JSX.
//  - Every alert is grounded in a real threshold; no dramatic alerts without
//    data support.
//  - Wording stays decision-support ("may", "review", "monitor") — alerts
//    never tell the farmer to skip irrigation, apply chemicals or use a
//    dosage.
//  - Each detection carries a STABLE id:
//        {cropScope}:{alertType}:{windowBucket}
//    same user + crop + type + forecast window => same id, so the store can
//    dedupe and never create duplicate alerts/notifications for one event.
// =============================================================================

import { WEATHER_THRESHOLDS } from "../lib/weatherUtils.js";

export const ALERT_SEVERITY = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  CRITICAL: "critical",
};

export const ALERT_TYPES = {
  HEAVY_RAIN: "heavy_rain",
  HIGH_RAIN_PROBABILITY: "high_rain_probability",
  EXTREME_HEAT: "extreme_heat",
  COLD_FROST: "cold_frost",
  STRONG_WIND: "strong_wind",
  HIGH_HUMIDITY: "high_humidity",
  DRY_WATER_STRESS: "dry_water_stress",
  RAPID_CHANGE: "rapid_change",
  UV_RISK: "uv_risk",
  SEVERE_WEATHER: "severe_weather",
};

// Alert-specific thresholds. Rain probability / heat / wind baselines reuse
// the documented WEATHER_THRESHOLDS from weatherUtils so both pages agree.
export const ALERT_THRESHOLDS = {
  rainHeavyMm: 25, // daily sum — heavy rain
  rainSignificantMm: 12, // daily sum — notable rain
  rainProbNotify: 85, // % — precipitation probability worth notifying
  rainProbWatch: 70, // % — aligns with WEATHER_THRESHOLDS.rainProbLikely
  heatCriticalC: 40, // daily max — agriculture-critical heat
  heatHighC: 35, // daily max — high water-demand signal
  frostC: 0, // daily min — frost risk
  coldStressC: WEATHER_THRESHOLDS.coldRiskC, // daily min — cold stress
  windHighKmh: 50, // daily max wind
  windStrongKmh: WEATHER_THRESHOLDS.windStrongKmh, // affects field work
  humiditySustained: 85, // % 24h average — monitoring indicator only
  dryEt0Mm: 5, // daily ET₀ — strong evaporative demand
  dryRainProbBelow: 25, // % — dry outlook companion to high ET₀
  uvHigh: 8, // WHO "very high"
  rapidTempSwingC: 8, // °C swing between current and next-12h extremes
};

// WMO codes that represent genuinely severe weather (never invented).
const SEVERE_CODES = new Set([95, 96, 99, 82, 65, 67]);

function maxOf(values) {
  let best = null;
  for (const v of values) {
    if (v === null || v === undefined || Number.isNaN(v)) continue;
    if (best === null || v > best) best = v;
  }
  return best;
}

function minOf(values) {
  let best = null;
  for (const v of values) {
    if (v === null || v === undefined || Number.isNaN(v)) continue;
    if (best === null || v < best) best = v;
  }
  return best;
}

function avgOf(values) {
  const valid = values.filter(
    (v) => v !== null && v !== undefined && Number.isFinite(v)
  );
  if (valid.length === 0) return null;
  return valid.reduce((s, v) => s + v, 0) / valid.length;
}

// Hourly times from Open-Meteo are LOCATION-LOCAL, timezone-less strings.
// Parse them as local time so windows never drift by the UTC offset.
function parseLocal(iso) {
  if (typeof iso !== "string") return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.getTime();
}

function dayLabel(dateStr, todayIso) {
  if (!dateStr) return "the forecast period";
  if (dateStr === todayIso) return "today";
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const m = String(tomorrow.getMonth() + 1).padStart(2, "0");
  const dd = String(tomorrow.getDate()).padStart(2, "0");
  if (dateStr === `${tomorrow.getFullYear()}-${m}-${dd}`) return "tomorrow";
  const d = new Date(`${dateStr}T12:00:00`);
  return Number.isNaN(d.getTime())
    ? dateStr
    : d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function dayWindowMs(dateStr) {
  const start = new Date(`${dateStr}T00:00:00`);
  return {
    startTime: start.getTime(),
    endTime: start.getTime() + 24 * 60 * 60 * 1000 - 1,
  };
}

function localDateIso(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

// -----------------------------------------------------------------------------
// Crop-aware contextual sentence. Decision support only — never a directive.
// -----------------------------------------------------------------------------

function cropNote(alertType, crop) {
  const cropName = crop?.CropName ? `${crop.CropName}` : "the crop";
  switch (alertType) {
    case ALERT_TYPES.HEAVY_RAIN:
    case ALERT_TYPES.HIGH_RAIN_PROBABILITY:
      return `Rain is expected during the planned period — review irrigation and field-drainage plans for ${cropName}.`;
    case ALERT_TYPES.EXTREME_HEAT:
      return `High temperatures may increase ${cropName} water demand — consider checking soil moisture more closely.`;
    case ALERT_TYPES.COLD_FROST:
      return `Low temperatures may stress ${cropName} — a visual check during the cold window may be worthwhile.`;
    case ALERT_TYPES.STRONG_WIND:
      return `Strong winds may make outdoor field activities for ${cropName} less suitable.`;
    case ALERT_TYPES.HIGH_HUMIDITY:
      return `High humidity may justify closer monitoring of ${cropName} canopies.`;
    case ALERT_TYPES.DRY_WATER_STRESS:
      return `High evaporative demand with little rain expected — water stress context for ${cropName} is worth reviewing.`;
    case ALERT_TYPES.RAPID_CHANGE:
      return `Conditions are shifting — keep an eye on ${cropName} during the change.`;
    case ALERT_TYPES.UV_RISK:
      return `Very high UV — midday exposure may stress young ${cropName} plants.`;
    case ALERT_TYPES.SEVERE_WEATHER:
      return `Severe weather is indicated — field work around ${cropName} may need to be reviewed.`;
    default:
      return "";
  }
}

// -----------------------------------------------------------------------------
// Main entry: weather (normalized open-meteo payload) -> alert detections
// -----------------------------------------------------------------------------

/**
 * Detects weather alerts for one crop.
 * @param {object} weather   normalized payload from fetchWeatherForCrop
 * @param {string} cropScope stable crop key (cropKey()) — part of the dedupe id
 * @param {object|null} crop crop entry for contextual messaging (optional)
 * @param {object} overrides threshold overrides (merged over ALERT_THRESHOLDS)
 * @returns {Array} alert detections (may be empty)
 */
export function detectWeatherAlerts(weather, cropScope, crop = null, overrides = {}) {
  if (!weather || !cropScope) return [];
  const t = { ...ALERT_THRESHOLDS, ...overrides };
  const daily = weather.daily ?? [];
  const hourly = weather.hourly ?? [];
  const current = weather.current ?? {};
  const todayIso = localDateIso();
  const detections = [];

  const push = (det) => {
    const id = `${cropScope}:${det.alertType}:${det.windowBucket}`;
    const note = cropNote(det.alertType, crop);
    detections.push({
      id,
      cropScope,
      alertType: det.alertType,
      severity: det.severity,
      title: det.title,
      message: note ? `${det.message} ${note}` : det.message,
      weatherContext: det.weatherContext,
      startTime: det.startTime ?? Date.now(),
      endTime: det.endTime ?? Date.now() + 6 * 60 * 60 * 1000,
      windowBucket: det.windowBucket,
      source: weather.source ?? "open-meteo",
    });
  };

  // --- Severe weather codes (actual WMO codes, today only) -----------------
  const today = daily[0];
  if (today && SEVERE_CODES.has(Number(today.weatherCode))) {
    const { startTime, endTime } = dayWindowMs(today.date);
    push({
      alertType: ALERT_TYPES.SEVERE_WEATHER,
      severity: ALERT_SEVERITY.CRITICAL,
      title: "Severe weather expected",
      message: `${today.condition ?? "Severe conditions"} indicated by the forecast weather code for ${dayLabel(today.date, todayIso)}.`,
      weatherContext: { weatherCode: today.weatherCode },
      startTime,
      endTime,
      windowBucket: today.date,
    });
  }

  // --- Heavy rain (daily precipitation sum) --------------------------------
  for (const day of daily.slice(0, 4)) {
    const mm = day.precipitationSumMm;
    if (mm === null || mm === undefined) continue;
    if (mm >= t.rainHeavyMm) {
      const w = dayWindowMs(day.date);
      push({
        alertType: ALERT_TYPES.HEAVY_RAIN,
        severity: ALERT_SEVERITY.HIGH,
        title: `Heavy rain expected ${dayLabel(day.date, todayIso)}`,
        message: `Around ${Math.round(mm)}mm of precipitation is forecast — field saturation and drainage issues are possible.`,
        weatherContext: { precipitation: mm, precipitationProbability: day.precipitationProbabilityMaxPercent },
        ...w,
        windowBucket: day.date,
      });
    } else if (mm >= t.rainSignificantMm) {
      const w = dayWindowMs(day.date);
      push({
        alertType: ALERT_TYPES.HEAVY_RAIN,
        severity: ALERT_SEVERITY.MEDIUM,
        title: `Notable rain expected ${dayLabel(day.date, todayIso)}`,
        message: `Around ${Math.round(mm)}mm of precipitation is forecast — worth reviewing planned field operations.`,
        weatherContext: { precipitation: mm, precipitationProbability: day.precipitationProbabilityMaxPercent },
        ...w,
        windowBucket: day.date,
      });
    }
  }

  // --- High rain probability (next 24h hourly, fallback daily max) ---------
  const next24 = hourly.slice(0, 24);
  const prob = maxOf(
    next24.length
      ? next24.map((h) => h.precipitationProbabilityPercent)
      : daily.slice(0, 2).map((d) => d.precipitationProbabilityMaxPercent)
  );
  if (prob !== null && prob >= t.rainProbWatch) {
    const probeTime = next24.length ? parseLocal(next24[0].time) : Date.now();
    push({
      alertType: ALERT_TYPES.HIGH_RAIN_PROBABILITY,
      severity: prob >= t.rainProbNotify ? ALERT_SEVERITY.HIGH : ALERT_SEVERITY.MEDIUM,
      title: "High chance of rain ahead",
      message: `Precipitation probability reaches about ${Math.round(prob)}% within the next 24 hours.`,
      weatherContext: { precipitationProbability: prob },
      startTime: probeTime ?? Date.now(),
      endTime: (probeTime ?? Date.now()) + 24 * 60 * 60 * 1000,
      windowBucket: localDateIso(),
    });
  }

  // --- Extreme heat (daily max, next 3 days) -------------------------------
  for (const day of daily.slice(0, 3)) {
    const maxC = day.tempMaxC;
    if (maxC === null || maxC === undefined) continue;
    if (maxC >= t.heatCriticalC) {
      const w = dayWindowMs(day.date);
      push({
        alertType: ALERT_TYPES.EXTREME_HEAT,
        severity: ALERT_SEVERITY.CRITICAL,
        title: `Extreme heat ${dayLabel(day.date, todayIso)}`,
        message: `Temperatures may reach ${Math.round(maxC)}°C — heat stress risk is significant.`,
        weatherContext: { temperature: maxC },
        ...w,
        windowBucket: day.date,
      });
    } else if (maxC >= t.heatHighC) {
      const w = dayWindowMs(day.date);
      push({
        alertType: ALERT_TYPES.EXTREME_HEAT,
        severity: ALERT_SEVERITY.HIGH,
        title: `Very hot ${dayLabel(day.date, todayIso)}`,
        message: `Temperatures may reach ${Math.round(maxC)}°C, which can raise crop water demand.`,
        weatherContext: { temperature: maxC },
        ...w,
        windowBucket: day.date,
      });
    }
  }

  // --- Cold / frost risk (daily min, next 2 days — only where supported) ---
  for (const day of daily.slice(0, 2)) {
    const minC = day.tempMinC;
    if (minC === null || minC === undefined) continue;
    if (minC <= t.frostC) {
      const w = dayWindowMs(day.date);
      push({
        alertType: ALERT_TYPES.COLD_FROST,
        severity: ALERT_SEVERITY.HIGH,
        title: `Frost risk ${dayLabel(day.date, todayIso)}`,
        message: `Overnight lows near ${Math.round(minC)}°C are possible — frost-sensitive crops may be at risk.`,
        weatherContext: { temperature: minC },
        ...w,
        windowBucket: day.date,
      });
    } else if (minC <= t.coldStressC) {
      const w = dayWindowMs(day.date);
      push({
        alertType: ALERT_TYPES.COLD_FROST,
        severity: ALERT_SEVERITY.MEDIUM,
        title: `Cold stress possible ${dayLabel(day.date, todayIso)}`,
        message: `Overnight lows near ${Math.round(minC)}°C are possible — cold stress may affect sensitive crops.`,
        weatherContext: { temperature: minC },
        ...w,
        windowBucket: day.date,
      });
    }
  }

  // --- Strong wind (daily max, next 2 days) --------------------------------
  for (const day of daily.slice(0, 2)) {
    const wind = day.windSpeedMaxKmh;
    if (wind === null || wind === undefined) continue;
    if (wind >= t.windHighKmh) {
      const w = dayWindowMs(day.date);
      push({
        alertType: ALERT_TYPES.STRONG_WIND,
        severity: ALERT_SEVERITY.HIGH,
        title: `Strong winds ${dayLabel(day.date, todayIso)}`,
        message: `Winds up to ${Math.round(wind)} km/h are forecast — spraying and delicate field work may be affected.`,
        weatherContext: { windSpeed: wind },
        ...w,
        windowBucket: day.date,
      });
    } else if (wind >= t.windStrongKmh) {
      const w = dayWindowMs(day.date);
      push({
        alertType: ALERT_TYPES.STRONG_WIND,
        severity: ALERT_SEVERITY.MEDIUM,
        title: `Windy conditions ${dayLabel(day.date, todayIso)}`,
        message: `Winds up to ${Math.round(wind)} km/h are forecast — outdoor field activities may be less suitable.`,
        weatherContext: { windSpeed: wind },
        ...w,
        windowBucket: day.date,
      });
    }
  }

  // --- High humidity (24h average — monitoring indicator, not a diagnosis) -
  const humidityAvg = avgOf(next24.map((h) => h.humidityPercent));
  if (humidityAvg !== null && humidityAvg >= t.humiditySustained) {
    const start = next24.length ? parseLocal(next24[0].time) : Date.now();
    push({
      alertType: ALERT_TYPES.HIGH_HUMIDITY,
      severity: ALERT_SEVERITY.MEDIUM,
      title: "Sustained high humidity",
      message: `Average humidity around ${Math.round(humidityAvg)}% over the next 24 hours — closer crop monitoring may be worthwhile.`,
      weatherContext: { humidity: humidityAvg },
      startTime: start ?? Date.now(),
      endTime: (start ?? Date.now()) + 24 * 60 * 60 * 1000,
      windowBucket: localDateIso(),
    });
  }

  // --- Very dry / water stress context (ET₀ + low rain probability) --------
  const et0Avg = avgOf(daily.slice(0, 2).map((d) => d.et0Mm));
  const dryProb = maxOf(daily.slice(0, 2).map((d) => d.precipitationProbabilityMaxPercent));
  if (
    et0Avg !== null &&
    et0Avg >= t.dryEt0Mm &&
    (dryProb === null || dryProb <= t.dryRainProbBelow)
  ) {
    const w = dayWindowMs(daily[0].date);
    push({
      alertType: ALERT_TYPES.DRY_WATER_STRESS,
      severity: ALERT_SEVERITY.MEDIUM,
      title: "High evaporative demand, dry outlook",
      message: `Reference evapotranspiration near ${et0Avg.toFixed(1)}mm/day with little rain expected — water demand may outpace supply.`,
      weatherContext: { et0: et0Avg, precipitationProbability: dryProb },
      ...w,
      windowBucket: daily[0].date,
    });
  }

  // --- Rapid weather change (current vs next-12h extremes) ------------------
  if (next24.length && current.temperatureC !== null && current.temperatureC !== undefined) {
    const next12 = next24.slice(0, 12);
    const hi = maxOf(next12.map((h) => h.temperatureC));
    const lo = minOf(next12.map((h) => h.temperatureC));
    const swing =
      hi !== null && lo !== null
        ? Math.max(Math.abs(hi - current.temperatureC), Math.abs(lo - current.temperatureC))
        : null;
    if (swing !== null && swing >= t.rapidTempSwingC) {
      const start = parseLocal(next12[0].time) ?? Date.now();
      push({
        alertType: ALERT_TYPES.RAPID_CHANGE,
        severity: ALERT_SEVERITY.MEDIUM,
        title: "Rapid temperature shift ahead",
        message: `Temperatures may swing about ${Math.round(swing)}°C from the current ${Math.round(current.temperatureC)}°C within the next 12 hours.`,
        weatherContext: { temperature: current.temperatureC },
        startTime: start,
        endTime: start + 12 * 60 * 60 * 1000,
        windowBucket: localDateIso(),
      });
    }
  }

  // --- UV risk (daily UV max, today only — where supported) ----------------
  if (today?.uvIndexMax !== null && today?.uvIndexMax !== undefined && today.uvIndexMax >= t.uvHigh) {
    const w = dayWindowMs(today.date);
    push({
      alertType: ALERT_TYPES.UV_RISK,
      severity: ALERT_SEVERITY.MEDIUM,
      title: "Very high UV index today",
      message: `UV index may reach ${Math.round(today.uvIndexMax)} — prolonged midday exposure can stress plants and people.`,
      weatherContext: { uvIndex: today.uvIndexMax },
      ...w,
      windowBucket: today.date,
    });
  }

  return detections;
}
