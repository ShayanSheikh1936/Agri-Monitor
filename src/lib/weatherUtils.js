// =============================================================================
// Weather utilities — pure, UI-free logic for the Weather Forecast page.
//
// All functions here derive CONTEXTUAL indicators from real Open-Meteo values
// using transparent thresholds. Nothing ever invents data, and all crop-facing
// wording stays hedged ("may", "consider", "review", "monitor") — weather is
// decision support, never a guaranteed agronomic diagnosis.
// =============================================================================

import {
  Sun,
  Moon,
  CloudSun,
  Cloud,
  CloudDrizzle,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudFog,
} from "lucide-react";
import { getPlantAgeDays, getHealthStatus } from "./cropUtils.js";
import { RAIN_MM_SIGNIFICANT } from "../services/weatherService.js";

// -----------------------------------------------------------------------------
// Transparent thresholds (documented so indicators are auditable)
// -----------------------------------------------------------------------------

export const WEATHER_THRESHOLDS = {
  rainProbLikely: 70, // % — rain "likely"
  rainProbPossible: 40, // % — rain "possible"
  heatExtremeC: 38, // daily max temp
  heatHotC: 33,
  heatWarmC: 28,
  coldRiskC: 3, // daily min temp — possible cold stress
  windStrongKmh: 30, // affects spraying / field work
  windBreezyKmh: 18,
  humidityHigh: 80, // %
  humidityModerate: 60, // %
};

export const INDICATOR_LEVELS = { LOW: "low", MODERATE: "moderate", HIGH: "high" };

function maxOf(values) {
  let best = null;
  for (const v of values) {
    if (v === null || v === undefined || Number.isNaN(v)) continue;
    if (best === null || v > best) best = v;
  }
  return best;
}

function avgOf(values) {
  const valid = values.filter((v) => v !== null && v !== undefined && Number.isFinite(v));
  if (valid.length === 0) return null;
  return valid.reduce((s, v) => s + v, 0) / valid.length;
}

// -----------------------------------------------------------------------------
// Weather status indicators (spec §13) — each carries the basis it came from
// -----------------------------------------------------------------------------

export function computeWeatherIndicators(weather) {
  const daily = weather?.daily ?? [];
  const hourly = weather?.hourly ?? [];
  const next2 = daily.slice(0, 2);
  const next3 = daily.slice(0, 3);
  const t = WEATHER_THRESHOLDS;

  // Rain likelihood — prefer the next 24 hourly probabilities, fall back to
  // the daily maximums of the next two days.
  const hourlyProb = maxOf(hourly.slice(0, 24).map((h) => h.precipitationProbabilityPercent));
  const dailyProb = maxOf(next2.map((d) => d.precipitationProbabilityMaxPercent));
  const rainProb = hourlyProb ?? dailyProb;
  const rainLikelihood =
    rainProb === null
      ? { level: INDICATOR_LEVELS.LOW, label: "Unknown", basis: "No probability data available" }
      : rainProb >= t.rainProbLikely
        ? { level: INDICATOR_LEVELS.HIGH, label: "Likely", basis: `Up to ${Math.round(rainProb)}% chance in the coming period` }
        : rainProb >= t.rainProbPossible
          ? { level: INDICATOR_LEVELS.MODERATE, label: "Possible", basis: `Up to ${Math.round(rainProb)}% chance in the coming period` }
          : { level: INDICATOR_LEVELS.LOW, label: "Low", basis: `At most ${Math.round(rainProb)}% chance in the coming period` };

  // Heat level — hottest of the next three days.
  const hotMax = maxOf(next3.map((d) => d.tempMaxC));
  const heat =
    hotMax === null
      ? { level: INDICATOR_LEVELS.LOW, label: "Unknown", basis: "No temperature data" }
      : hotMax >= t.heatExtremeC
        ? { level: INDICATOR_LEVELS.HIGH, label: "Extreme heat", basis: `Up to ${Math.round(hotMax)}°C expected` }
        : hotMax >= t.heatHotC
          ? { level: INDICATOR_LEVELS.MODERATE, label: "Hot", basis: `Up to ${Math.round(hotMax)}°C expected` }
          : hotMax >= t.heatWarmC
            ? { level: INDICATOR_LEVELS.LOW, label: "Warm", basis: `Up to ${Math.round(hotMax)}°C expected` }
            : { level: INDICATOR_LEVELS.LOW, label: "Mild", basis: `Up to ${Math.round(hotMax)}°C expected` };

  // Wind level — strongest of the next three days (falls back to current).
  const windMax =
    maxOf(next3.map((d) => d.windSpeedMaxKmh)) ?? weather?.current?.windSpeedKmh ?? null;
  const wind =
    windMax === null
      ? { level: INDICATOR_LEVELS.LOW, label: "Unknown", basis: "No wind data" }
      : windMax >= t.windStrongKmh
        ? { level: INDICATOR_LEVELS.HIGH, label: "Strong", basis: `Gusts up to ${Math.round(windMax)} km/h expected` }
        : windMax >= t.windBreezyKmh
          ? { level: INDICATOR_LEVELS.MODERATE, label: "Breezy", basis: `Up to ${Math.round(windMax)} km/h expected` }
          : { level: INDICATOR_LEVELS.LOW, label: "Calm", basis: `Up to ${Math.round(windMax)} km/h expected` };

  // Humidity — average of the next 24 hours, falling back to current.
  const humidityAvg =
    avgOf(hourly.slice(0, 24).map((h) => h.humidityPercent)) ??
    weather?.current?.humidityPercent ??
    null;
  const humidity =
    humidityAvg === null
      ? { level: INDICATOR_LEVELS.LOW, label: "Unknown", basis: "No humidity data" }
      : humidityAvg >= t.humidityHigh
        ? { level: INDICATOR_LEVELS.HIGH, label: "Very humid", basis: `Around ${Math.round(humidityAvg)}% average` }
        : humidityAvg >= t.humidityModerate
          ? { level: INDICATOR_LEVELS.MODERATE, label: "Humid", basis: `Around ${Math.round(humidityAvg)}% average` }
          : { level: INDICATOR_LEVELS.LOW, label: "Comfortable", basis: `Around ${Math.round(humidityAvg)}% average` };

  // Irrigation attention — rainfall outlook may offset irrigation needs; a
  // hot dry outlook raises water demand. Context only, never a directive.
  const ctx = weather?.context ?? {};
  const irrigationAttention = ctx.significantRainfallExpected
    ? { level: INDICATOR_LEVELS.LOW, label: "Rainfall may offset", basis: `${ctx.next48hExpectedRainfallMm ?? 0}mm expected in 48h — review before irrigating` }
    : heat.level === INDICATOR_LEVELS.HIGH && rainProb !== null && rainProb < t.rainProbPossible
      ? { level: INDICATOR_LEVELS.HIGH, label: "High water demand", basis: "Hot, mostly dry outlook may increase water demand" }
      : heat.level === INDICATOR_LEVELS.MODERATE && (rainProb === null || rainProb < t.rainProbPossible)
        ? { level: INDICATOR_LEVELS.MODERATE, label: "Review schedule", basis: "Warm outlook with little rain expected" }
        : { level: INDICATOR_LEVELS.LOW, label: "Normal", basis: "No strong signals in the current outlook" };

  // Stability — no notable rain, wind, or temperature swings in view.
  const tempSpread = (() => {
    const highs = next3.map((d) => d.tempMaxC).filter((v) => v !== null && Number.isFinite(v));
    return highs.length ? Math.max(...highs) - Math.min(...highs) : null;
  })();
  const unstable =
    (rainProb ?? 0) >= t.rainProbLikely ||
    (windMax ?? 0) >= t.windStrongKmh ||
    (tempSpread ?? 0) >= 8;
  const stability = {
    level: unstable ? INDICATOR_LEVELS.MODERATE : INDICATOR_LEVELS.LOW,
    label: unstable ? "Changeable" : "Stable",
    basis: unstable
      ? "Rain, strong wind, or temperature swings appear in the outlook"
      : "No major changes visible in the next few days",
  };

  return { rainLikelihood, heat, wind, humidity, irrigationAttention, stability };
}

// -----------------------------------------------------------------------------
// Agricultural weather summary notes (spec §3) — hedged wording only
// -----------------------------------------------------------------------------

export function buildAgriNotes(weather) {
  const notes = [];
  const hourly = weather?.hourly ?? [];
  const daily = weather?.daily ?? [];
  const t = WEATHER_THRESHOLDS;

  const soon = hourly.slice(0, 12);
  const soonProb = maxOf(soon.map((h) => h.precipitationProbabilityPercent));
  const soonRainMm = soon.reduce((s, h) => s + (h.precipitationMm ?? 0), 0);
  if ((soonProb ?? 0) >= t.rainProbPossible || soonRainMm >= 0.5) {
    notes.push({
      kind: "rain",
      text: "Rain may arrive within the next several hours — worth reviewing any planned irrigation.",
    });
  } else if (weather?.context?.significantRainfallExpected) {
    notes.push({
      kind: "rain",
      text: `Around ${weather.context.next48hExpectedRainfallMm ?? 0}mm of rain is possible over the next 48 hours — consider checking field drainage and irrigation plans.`,
    });
  }

  const hotMax = maxOf(daily.slice(0, 3).map((d) => d.tempMaxC));
  if (hotMax !== null && hotMax >= t.heatHotC) {
    notes.push({
      kind: "heat",
      text: `Temperatures may reach ${Math.round(hotMax)}°C, which can increase crop water demand.`,
    });
  }

  const coldMin = (() => {
    const mins = daily.slice(0, 3).map((d) => d.tempMinC).filter((v) => v !== null && Number.isFinite(v));
    return mins.length ? Math.min(...mins) : null;
  })();
  if (coldMin !== null && coldMin <= t.coldRiskC) {
    notes.push({
      kind: "cold",
      text: `Overnight lows near ${Math.round(coldMin)}°C are possible — cold stress may be a concern for sensitive crops.`,
    });
  }

  const windMax = maxOf(daily.slice(0, 3).map((d) => d.windSpeedMaxKmh));
  if (windMax !== null && windMax >= t.windBreezyKmh) {
    notes.push({
      kind: "wind",
      text: `Winds up to ${Math.round(windMax)} km/h may affect spraying and other field activities.`,
    });
  }

  const humidityAvg = avgOf(hourly.slice(0, 24).map((h) => h.humidityPercent));
  if (humidityAvg !== null && humidityAvg >= t.humidityHigh) {
    notes.push({
      kind: "humidity",
      text: "High humidity may justify closer crop monitoring over the next day.",
    });
  }

  if (notes.length === 0) {
    notes.push({
      kind: "ok",
      text: "No notable weather signals in the current outlook — conditions look unremarkable for field work.",
    });
  }
  return notes;
}

// -----------------------------------------------------------------------------
// Weather-based crop guidance (spec §12) — grouped, hedged, crop-aware
// -----------------------------------------------------------------------------

export function buildCropGuidance(weather, crop, indicators) {
  const ind = indicators ?? computeWeatherIndicators(weather);
  const daily = weather?.daily ?? [];
  const irrigation = [];
  const fieldWork = [];
  const monitoring = [];

  if (ind.irrigationAttention.level === INDICATOR_LEVELS.HIGH) {
    irrigation.push("Hot, mostly dry outlook — consider reviewing the irrigation schedule.");
  } else if (ind.irrigationAttention.level === INDICATOR_LEVELS.MODERATE) {
    irrigation.push("Warm with little rain expected — monitor soil moisture before the next irrigation.");
  } else if (weather?.context?.significantRainfallExpected) {
    irrigation.push(
      `Rainfall of ~${weather.context.next48hExpectedRainfallMm ?? 0}mm may arrive within 48h — worth reviewing planned irrigation against field conditions.`
    );
  } else {
    irrigation.push("No strong irrigation signal in the current outlook.");
  }

  if (ind.wind.level === INDICATOR_LEVELS.HIGH) {
    fieldWork.push("Strong winds may make spraying and delicate field work difficult — consider postponing.");
  }
  const wetDays = daily.slice(0, 3).filter((d) => (d.precipitationSumMm ?? 0) >= RAIN_MM_SIGNIFICANT);
  if (wetDays.length > 0) {
    fieldWork.push(`Rain may wet fields on ${wetDays.length === 1 ? formatDateShort(wetDays[0].date) : "several upcoming days"} — field access could be limited.`);
  }
  if (ind.heat.level === INDICATOR_LEVELS.HIGH) {
    fieldWork.push("Extreme heat may make midday field work uncomfortable — early morning or late afternoon may suit better.");
  }
  if (fieldWork.length === 0) {
    fieldWork.push("No major weather obstacles visible for field activities in the next days.");
  }

  if (ind.humidity.level === INDICATOR_LEVELS.HIGH) {
    monitoring.push("High humidity may justify closer crop monitoring — humid canopies deserve a visual check.");
  }
  if (ind.heat.level !== INDICATOR_LEVELS.LOW && ind.heat.label !== "Unknown") {
    monitoring.push("Warm conditions can add heat stress — consider watching for wilting during peak hours.");
  }
  const ageDays = getPlantAgeDays(crop);
  if (ageDays !== null) {
    monitoring.push(`This crop is about ${ageDays} day${ageDays === 1 ? "" : "s"} old — interpret weather context against its current growth stage.`);
  }
  const health = getHealthStatus(crop);
  if (health && health !== "Healthy") {
    monitoring.push("A health concern was recorded for this crop — unusual weather may add stress; consider inspecting it soon.");
  }
  if (monitoring.length === 0) {
    monitoring.push("Nothing unusual in the weather outlook that requires extra monitoring.");
  }

  return { irrigation, fieldWork, monitoring };
}

// -----------------------------------------------------------------------------
// UV index (WHO bands) + forecast highlights
// -----------------------------------------------------------------------------

export function uvLevel(uv) {
  if (uv === null || uv === undefined || Number.isNaN(uv)) return null;
  if (uv < 3) return { level: INDICATOR_LEVELS.LOW, label: "Low" };
  if (uv < 6) return { level: INDICATOR_LEVELS.MODERATE, label: "Moderate" };
  if (uv < 8) return { level: INDICATOR_LEVELS.HIGH, label: "High" };
  if (uv < 11) return { level: INDICATOR_LEVELS.HIGH, label: "Very high" };
  return { level: INDICATOR_LEVELS.HIGH, label: "Extreme" };
}

// Scans the forecast for its notable days — all derived from real values.
export function computeForecastHighlights(weather) {
  const daily = weather?.daily ?? [];
  const pick = (get) => {
    let best = null;
    for (const day of daily) {
      const v = get(day);
      if (v === null || v === undefined) continue;
      if (!best || v > best.value) best = { day, value: v };
    }
    return best;
  };

  const hottest = pick((d) => d.tempMaxC);
  const wettest = pick((d) => d.precipitationSumMm);
  const windiest = pick((d) => d.windSpeedMaxKmh);
  const sunniest = pick((d) => d.uvIndexMax);

  return {
    hottest: hottest
      ? { date: hottest.day.date, label: `${Math.round(hottest.value)}°C` }
      : null,
    wettest:
      wettest && wettest.value > 0
        ? { date: wettest.day.date, label: `${wettest.value}mm` }
        : null,
    windiest: windiest
      ? { date: windiest.day.date, label: `${Math.round(windiest.value)} km/h` }
      : null,
    highestUv: sunniest
      ? { date: sunniest.day.date, label: `${Math.round(sunniest.value)} UV` }
      : null,
  };
}

// Average of an hourly field over the next 24 hours (null when no data).
export function next24hAverage(weather, field) {
  const vals = (weather?.hourly ?? [])
    .slice(0, 24)
    .map((h) => h[field])
    .filter((v) => v !== null && v !== undefined && Number.isFinite(v));
  if (vals.length === 0) return null;
  return vals.reduce((s, v) => s + v, 0) / vals.length;
}

// -----------------------------------------------------------------------------
// Formatting + icons
// -----------------------------------------------------------------------------

const COMPASS_8 = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

export function windDirectionLabel(deg) {
  if (deg === null || deg === undefined || Number.isNaN(deg)) return null;
  const idx = Math.round(((deg % 360) + 360) % 360 / 45) % 8;
  return COMPASS_8[idx];
}

// "2026-08-29T14:00" -> "14:00" (times are location-local from Open-Meteo)
export function formatHourLabel(timeIso) {
  if (typeof timeIso !== "string") return "";
  const m = timeIso.match(/T(\d{2}):/);
  return m ? `${m[1]}:00` : timeIso;
}

// "2026-08-29" -> "Fri 29"
export function formatDateShort(dateStr) {
  const d = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr ?? "";
  return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric" });
}

// "2026-08-29" -> "Friday, Aug 29"
export function formatDateLong(dateStr) {
  const d = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr ?? "";
  return d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
}

// Local today as yyyy-mm-dd — used to label the first forecast day "Today".
export function localTodayISO() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

// Sunrise/sunset are location-local ISO strings; the duration between them is
// timezone-independent as long as both are parsed the same way.
export function dayLengthLabel(sunriseIso, sunsetIso) {
  if (!sunriseIso || !sunsetIso) return null;
  const a = new Date(sunriseIso).getTime();
  const b = new Date(sunsetIso).getTime();
  if (Number.isNaN(a) || Number.isNaN(b) || b <= a) return null;
  const mins = Math.round((b - a) / 60000);
  return `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, "0")}m`;
}

export function formatClock(isoLocal) {
  if (typeof isoLocal !== "string") return "";
  const m = isoLocal.match(/T(\d{2}:\d{2})/);
  return m ? m[1] : isoLocal;
}

// Lucide icon for a WMO weather code. Returns a component (not JSX) so it can
// be rendered at any size.
export function getWeatherIcon(code, isDay = true) {
  const c = Number(code);
  if (c === 0 || c === 1) return isDay ? Sun : Moon;
  if (c === 2) return isDay ? CloudSun : Cloud;
  if (c === 3) return Cloud;
  if (c === 45 || c === 48) return CloudFog;
  if (c >= 51 && c <= 57) return CloudDrizzle;
  if ((c >= 61 && c <= 67) || (c >= 80 && c <= 82)) return CloudRain;
  if ((c >= 71 && c <= 77) || c === 85 || c === 86) return CloudSnow;
  if (c >= 95) return CloudLightning;
  return Cloud;
}
