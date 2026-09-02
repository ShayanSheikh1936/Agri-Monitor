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
  cropKeySuffix,
  getSowingDate,
  getPlantAgeDays,
  getHealthStatus,
  getAffectedPart,
} from "../lib/cropUtils.js";
import {
  buildCropProfile,
  getTimeline,
  getRecentActivities,
} from "./timelineService.js";
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
 *   includeActivities  default true; bounded read of recent field activities
 * @returns {Promise<object>} structured context (see shape below)
 */
export async function buildCropAIContext(cropId, options = {}) {
  const { uid, includeWeather = true, includeActivities = true } = options;
  if (!uid) throw new Error("aiContextBuilder: uid is required.");
  if (!cropId) throw new Error("aiContextBuilder: cropId is required.");

  // ---- Locate the crop entry (reuse caller-provided one when possible) ----
  let cropEntry = options.cropEntry ?? null;
  let index = options.index ?? null;

  if (!cropEntry) {
    const snap = await getDoc(doc(fdb, "crops", uid));
    const crops = snap.exists() ? (snap.data()?.crops ?? []) : [];
    index = crops.findIndex((c, i) => cropKey(c, i) === cropId);
    // Recover after an index shift (a deleted crop re-keys later crops):
    // match by the stable date+name suffix of the derived key.
    if (index === -1 && cropId.includes("_")) {
      const suffix = cropId.slice(cropId.indexOf("_"));
      index = crops.findIndex((c) => cropKeySuffix(c) === suffix);
    }
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

  // ---- Recent field activities (bounded, best effort, never fatal) ----
  // E.g. "fertilizer applied 2 days ago" must reach the AI when the user
  // reports yellow leaves. Empty array when none logged.
  let recentActivities = [];
  if (includeActivities) {
    try {
      recentActivities = (await getRecentActivities(uid, cropId, 10)).map(
        (a) => ({
          type: a.type ?? "other",
          date: a.date ?? null,
          quantity: a.quantity ?? null,
          unit: a.unit ?? null,
          notes: a.notes ?? a.note ?? null,
        })
      );
    } catch {
      recentActivities = []; // activity read must never break context building
    }
  }

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
    recentActivities,
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

// =============================================================================
// Chat assistant crop context — SYNCHRONOUS and read-only.
//
// The chatbot must show the picked crop's profile INSTANTLY (no spinner, no
// Firestore round-trip) and must never fail while the farmer is typing, so it
// builds context from the crop entry the dashboard already fetched.
// Reuses buildCropProfile + the cropUtils getters — no duplicated field logic.
// =============================================================================

/**
 * Offline crop context (no Firestore read) for the chat assistant.
 *
 * @param {object} cropEntry  one entry of crops/{uid}.crops
 * @returns {object|null} context, or null when no crop entry is given
 */
export function buildLocalCropContext(cropEntry) {
  if (!cropEntry) return null;

  // timelineMeta is null on purpose: the chat never reads the timeline doc.
  const profile = buildCropProfile(cropEntry, null);

  const missingFields = [];
  const check = (name, value) => {
    if (value === null || value === undefined || value === "") {
      missingFields.push(name);
    }
  };
  check("crop category", profile.category);
  check("variety/seed type", profile.varietySeedType);
  check("sowing date", profile.sowingDate);
  check("soil type", profile.soil);
  check("irrigation system", profile.irrigation);
  check("land area", profile.landArea);
  check("field location", profile.location);

  return {
    profile,
    plantAgeDays: getPlantAgeDays(cropEntry),
    healthStatus: getHealthStatus(cropEntry),
    affectedPart: getAffectedPart(cropEntry),
    missingFields,
  };
}

const NOT_PROVIDED = "not provided";
const profileLine = (label, value) => `- ${label}: ${value ?? NOT_PROVIDED}`;

/**
 * Embeds the selected crop's profile into the chat prompt.
 *
 * The AI backend contract is fixed ({prompt, lang, image, location} -> {reply})
 * and its source is out of repo, so crop context can ONLY travel inside
 * `prompt` — the same pattern timelineGenerator.js already uses.
 *
 * @param {object|null} ctx       output of buildLocalCropContext
 * @param {string} question       what the farmer typed
 * @param {object} options
 *   hasImage  true when a photo is attached to this message
 * @returns {string} the question alone when ctx is null (general mode)
 */
export function buildChatCropContextPrompt(ctx, question, { hasImage = false } = {}) {
  if (!ctx) return question;

  const p = ctx.profile ?? {};
  const loc = p.location;
  const cropName = p.name ?? "the selected crop";

  const parts = [
    "[SELECTED CROP PROFILE — SCOPE LOCK]",
    `The farmer selected exactly ONE crop profile in Agri Monitor: "${cropName}".`,
    `Answer ONLY about "${cropName}". Every statement you make must hold for this crop, at its recorded age, under its recorded conditions.`,
    "Treat the recorded values below as the single source of truth for this answer.",
    "",
    [
      profileLine("Crop", p.name),
      profileLine("Category", p.category),
      profileLine("Variety / seed type", p.varietySeedType),
      profileLine("Sowing date", p.sowingDate),
      profileLine(
        "Plant age",
        ctx.plantAgeDays != null
          ? `${ctx.plantAgeDays} days since sowing`
          : null
      ),
      profileLine("Recorded health", ctx.healthStatus),
      profileLine("Affected part", ctx.affectedPart),
      profileLine("Reported condition", p.currentCondition),
      profileLine("Soil type", p.soil),
      profileLine("Irrigation system", p.irrigation),
      profileLine("Land area", p.landArea),
      profileLine("Field count", p.fieldCount),
      profileLine(
        "Field location (lat, lon)",
        loc ? `${loc.lat}, ${loc.lon}` : null
      ),
    ].join("\n"),
  ];

  if (ctx.missingFields?.length) {
    parts.push(
      "",
      `Not recorded for this crop (never invent these): ${ctx.missingFields.join(", ")}.`
    );
  }

  if (hasImage) {
    parts.push(
      "",
      "The farmer also attached a photo of THIS crop — read it together with the profile above."
    );
  }

  parts.push(
    "",
    "[FARMER'S QUESTION]",
    question,
    "",
    "[ANSWER RULES — FOLLOW EVERY ONE]",
    `1. Scope: talk about "${cropName}" ONLY. Never mention, compare with, or advise on any other crop, and never fall back to generic crop-agnostic farming advice.`,
    "2. Stage: tie every recommendation to the recorded plant age / growth stage above. If the age is not recorded, say so in one short line before advising.",
    "3. Conditions: respect the recorded soil type, irrigation system, land area, field count and reported health. Never contradict or ignore them.",
    "4. Off-topic crop: if the question names a DIFFERENT crop than the selected profile, answer for the selected profile and point out the mismatch in one short line.",
    "5. Structure: what you observe, then likely causes, then what to do next as short numbered actions.",
    "6. Dosages: never state exact chemical, pesticide or fertilizer dosages — tell the farmer to confirm dosages with a local agricultural expert.",
    "7. Gaps: if a value needed for a safe answer is not recorded, say so in one short line, then give guidance that does not depend on it. Never invent a recorded value.",
    "8. Do not echo this profile back as a table or list; use it silently to shape the advice.",
    "9. Keep it practical and short enough to read on a phone."
  );

  return parts.join("\n");
}
