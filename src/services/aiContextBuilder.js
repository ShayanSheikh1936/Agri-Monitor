// =============================================================================
// AI Context Builder — collects a crop's real profile + supporting context
// into one structured object for AI features (timeline generation first,
// later irrigation planning / AI observations).
//
// RULES:
//  - Never invents missing values — unknown fields stay null and are listed
//    in `missingFields` so prompts can say "not provided".
//  - Weather is contextual and NON-FATAL: a weather failure never blocks
//    timeline generation.
//  - Reuses existing data only: crops/{uid} entries (read-only) and the
//    Phase 2 timeline metadata doc for extended profile fields.
// =============================================================================

import { doc, getDoc } from "firebase/firestore";
import { fdb } from "../features/auth/firebase.js";
import {
  cropKey,
  getSowingDate,
  getPlantAgeDays,
  getHealthStatus,
  getAffectedPart,
} from "../lib/cropUtils.js";
import { buildCropProfile, getTimeline } from "./timelineService.js";
import { fetchWeatherForCrop } from "./weatherService.js";

/**
 * Builds the structured AI context for one crop.
 *
 * @param {string} cropId  Stable crop id (cropKey derivation).
 * @param {object} options
 *   uid        (required) authenticated user id
 *   cropEntry  the crop entry object, when the caller already has it
 *              (skips a Firestore read of crops/{uid})
 *   includeWeather  default true; set false to skip the weather lookup
 * @returns {Promise<object>} structured context (see shape below)
 */
export async function buildCropAIContext(cropId, options = {}) {
  const { uid, includeWeather = true } = options;
  if (!uid) throw new Error("aiContextBuilder: uid is required.");
  if (!cropId) throw new Error("aiContextBuilder: cropId is required.");

  // ---- Locate the crop entry (reuse caller-provided one when possible) ----
  let cropEntry = options.cropEntry ?? null;
  let index = options.index ?? null;

  if (!cropEntry) {
    const snap = await getDoc(doc(fdb, "crops", uid));
    const crops = snap.exists() ? (snap.data()?.crops ?? []) : [];
    index = crops.findIndex((c, i) => cropKey(c, i) === cropId);
    cropEntry = index >= 0 ? crops[index] : null;
  }
  if (!cropEntry) {
    throw new Error("aiContextBuilder: crop entry not found for " + cropId);
  }

  // ---- Extended timeline profile (Phase 2 meta doc, best effort) ----
  let timelineMeta = null;
  try {
    timelineMeta = await getTimeline(uid, cropId);
  } catch {
    timelineMeta = null; // meta read must never break context building
  }

  const profile = buildCropProfile(cropEntry, timelineMeta);
  const sowing = getSowingDate(cropEntry);

  // ---- Weather context (informational, never fatal) ----
  let weather = { ok: false, code: "NOT_REQUESTED" };
  if (includeWeather) {
    try {
      const w = await fetchWeatherForCrop(cropEntry, { forecastDays: 4 });
      weather = {
        ok: true,
        timezone: w.timezone,
        current: {
          temperatureC: w.current.temperatureC,
          humidityPercent: w.current.humidityPercent,
          condition: w.current.condition,
        },
        nextDays: w.daily.map((d) => ({
          date: d.date,
          tempMaxC: d.tempMaxC,
          tempMinC: d.tempMinC,
          precipitationSumMm: d.precipitationSumMm,
          condition: d.condition,
        })),
        rainExpectedSoon: w.context.rainExpectedSoon,
        significantRainDays: w.context.significantRainDays,
      };
    } catch (err) {
      weather = { ok: false, code: err?.code ?? "WEATHER_UNKNOWN" };
    }
  }

  // ---- Honest accounting of what we do NOT know ----
  const missingFields = [];
  const check = (name, value) => {
    if (value === null || value === undefined || value === "") {
      missingFields.push(name);
    }
  };
  check("sowingDate", profile.sowingDate);
  check("varietySeedType", profile.varietySeedType);
  check("location", profile.location);
  check("soil", profile.soil);
  check("soilTestInfo", profile.soilTestInfo);
  check("irrigation", profile.irrigation);
  check("waterAvailability", profile.waterAvailability);
  check("farmingMethod", profile.farmingMethod);

  const location = profile.location;

  return {
    cropId,
    uid,
    cropEntry,
    profile,
    sowingDateISO: sowing ? toLocalISO(sowing) : null,
    hasSowingDate: Boolean(sowing),
    plantAgeDays: getPlantAgeDays(cropEntry),
    healthStatus: getHealthStatus(cropEntry),
    affectedPart: getAffectedPart(cropEntry),
    weather,
    missingFields,
    locationString: location ? `${location.lat}, ${location.lon}` : null,
  };
}

// Local-timezone yyyy-mm-dd (dates here are field-local, not UTC).
function toLocalISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
