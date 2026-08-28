// =============================================================================
// Timeline Generator — personalized crop lifecycle timelines via the EXISTING
// Agri Monitor AI backend (Netlify function). No duplicate backend, no API
// keys in frontend code (the Netlify function holds provider credentials).
//
// FLOW:  context → prompt → AI backend → strict validation → Firestore save
//
// SAFETY:
//  - AI output is NEVER trusted raw — every field is validated/normalized.
//  - Dates are re-anchored to the sowing date (the primary timeline anchor).
//  - generateCropTimeline() never throws; it returns { ok, ... } so crop
//    creation can never be broken by AI failures.
// =============================================================================

import { doc, getDoc } from "firebase/firestore";
import { fdb } from "../features/auth/firebase.js";
import { cropKey } from "../lib/cropUtils.js";
import * as timelineService from "./timelineService.js";
import { buildCropAIContext } from "./aiContextBuilder.js";

export const GENERATION_ERROR_CODES = {
  MISSING_API_URL: "MISSING_API_URL",
  MISSING_CONTEXT: "MISSING_CONTEXT",
  AI_REQUEST_FAILED: "AI_REQUEST_FAILED",
  AI_TIMEOUT: "AI_TIMEOUT",
  INVALID_RESPONSE: "INVALID_RESPONSE",
  SAVE_FAILED: "SAVE_FAILED",
};

export class TimelineGenerationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "TimelineGenerationError";
    this.code = code;
  }
}

const DEFAULT_TIMEOUT_MS = 90_000; // milestone generation takes ~25-40s on the existing backend
const MAX_EVENTS = 150;
const MAX_TASKS_PER_EVENT = 10;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// -----------------------------------------------------------------------------
// Date helpers (field-local dates, no UTC drift)
// -----------------------------------------------------------------------------

function parseISO(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDaysISO(iso, days) {
  const d = parseISO(iso);
  d.setDate(d.getDate() + days);
  return toISO(d);
}

// -----------------------------------------------------------------------------
// Prompt builder — only real, provided facts. Missing values stay explicit.
// -----------------------------------------------------------------------------

export function buildTimelinePrompt(context) {
  const p = context.profile;
  const provided = (v) => (v === null || v === undefined || v === "" ? "not provided" : String(v));

  const lines = [
    "You are an expert agronomist for the Agri Monitor farm dashboard.",
    "Generate a PERSONALIZED crop lifecycle timeline for this exact farm and crop.",
    "Respond with STRICT JSON only: no markdown, no code fences, no commentary.",
    "",
    "CROP PROFILE:",
    `- Crop name: ${provided(p.name)}`,
    `- Category: ${provided(p.category)}`,
    `- Variety / seed type: ${provided(p.varietySeedType)}`,
    `- Sowing date (Day 1 anchor): ${context.hasSowingDate ? context.sowingDateISO : "not provided"}`,
    `- Plant age today: ${context.plantAgeDays != null ? `${context.plantAgeDays} days` : "unknown"}`,
    `- Location: ${context.locationString ?? "not provided"}`,
    `- Soil type: ${provided(p.soil)}`,
    `- Soil test information: ${provided(p.soilTestInfo)}`,
    `- Irrigation system: ${provided(p.irrigation)}`,
    `- Water availability: ${provided(p.waterAvailability)}`,
    `- Land size: ${provided(p.landArea)}`,
    `- Field count: ${provided(p.fieldCount)}`,
    `- Farming method: ${provided(p.farmingMethod)}`,
    `- Current condition: ${provided(p.currentCondition)}`,
  ];

  if (context.affectedPart) {
    lines.push(`- Currently affected part: ${context.affectedPart}`);
  }

  if (context.weather?.ok) {
    lines.push("", "WEATHER OUTLOOK (informational only):");
    const c = context.weather.current;
    lines.push(
      `- Now: ${c.condition}, ${c.temperatureC}°C, humidity ${c.humidityPercent}%`
    );
    for (const d of context.weather.nextDays) {
      lines.push(
        `- ${d.date}: ${d.condition}, ${d.tempMinC}–${d.tempMaxC}°C, rain ${d.precipitationSumMm ?? 0}mm`
      );
    }
    if (context.weather.significantRainDays?.length) {
      lines.push(
        `- Significant rainfall expected on: ${context.weather.significantRainDays.join(", ")}`
      );
    }
  }

  lines.push(
    "",
    "RULES:",
    "1. Day 1 is the sowing date. Every event date MUST equal sowing date + (dayNumber - 1) days.",
    "2. Personalize stages and tasks to THIS crop, variety, soil, irrigation and climate. Do NOT return a generic template.",
    "3. Never invent facts that are not provided above. Where information is missing, set isEstimated=true on the affected events.",
    "4. Return 6-8 major milestone events spanning sowing to harvest (e.g. sowing, germination, vegetative growth, flowering, fruiting/grain fill, harvest). Keep every description under 15 words and at most 3 short tasks per event.",
    "5. Fold irrigation, nutrition, pest and disease monitoring into the milestone events where agronomically relevant.",
    '6. priority must be exactly "low", "medium" or "high".',
    "7. Where weather outlook shows upcoming rainfall, reflect it in irrigation-related guidance text (information only, never skip decisions).",
    "",
    "Return exactly this JSON object shape:",
    '{"cropStage":"current growth stage name","estimatedHarvestDate":"YYYY-MM-DD","timeline":[{"dayNumber":1,"date":"YYYY-MM-DD","stage":"stage name","title":"short title","description":"under 15 words","tasks":["task 1","task 2"],"priority":"low|medium|high","isEstimated":false}]}'
  );

  return lines.join("\n");
}

// -----------------------------------------------------------------------------
// AI backend call — reuses the existing Netlify function contract
// -----------------------------------------------------------------------------

function resolveApiUrl(options) {
  if (options.apiUrl) return options.apiUrl;
  const env = typeof import.meta.env === "object" ? import.meta.env : {};
  return env.VITE_API_URL || null;
}

async function callAIBackend(apiUrl, prompt, { location = null, timeoutMs }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetchWithDnsRetry(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Same contract as the existing Chatbot (chatbots.jsx) — no new backend.
      body: JSON.stringify({ prompt, lang: "English", image: null, location }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err?.name === "AbortError") {
      throw new TimelineGenerationError(
        GENERATION_ERROR_CODES.AI_TIMEOUT,
        "AI timeline generation timed out."
      );
    }
    throw new TimelineGenerationError(
      GENERATION_ERROR_CODES.AI_REQUEST_FAILED,
      "Could not reach the AI service."
    );
  } finally {
    clearTimeout(timer);
  }

  const text = await response.text();

  // Backend/gateway errors first — their bodies are often HTML, not JSON.
  if (!response.ok) {
    let message = `AI service returned HTTP ${response.status}.`;
    try {
      const parsed = JSON.parse(text);
      if (parsed?.error) message = parsed.error;
    } catch {
      /* non-JSON error body (e.g. gateway timeout page) — keep default */
    }
    throw new TimelineGenerationError(
      GENERATION_ERROR_CODES.AI_REQUEST_FAILED,
      message
    );
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new TimelineGenerationError(
      GENERATION_ERROR_CODES.INVALID_RESPONSE,
      "AI service returned a non-JSON response."
    );
  }

  if (!data?.reply) {
    throw new TimelineGenerationError(
      GENERATION_ERROR_CODES.INVALID_RESPONSE,
      "AI service returned no reply."
    );
  }
  return data.reply;
}

// One automatic retry for transient network/DNS errors only. HTTP errors
// (e.g. 429 rate limits) are NOT retried so we never hammer the backend.
async function fetchWithDnsRetry(url, init) {
  try {
    return await fetch(url, init);
  } catch (err) {
    if (err?.name === "AbortError" || err?.name === "TimeoutError") throw err;
    await new Promise((r) => setTimeout(r, 1500));
    return fetch(url, init);
  }
}

// -----------------------------------------------------------------------------
// Reply parsing + validation — never trust raw AI output
// -----------------------------------------------------------------------------

export function extractJsonFromReply(reply) {
  if (typeof reply !== "string" || reply.trim() === "") {
    throw new TimelineGenerationError(
      GENERATION_ERROR_CODES.INVALID_RESPONSE,
      "AI reply was empty."
    );
  }
  let text = reply.trim();

  // Strip markdown code fences if the model added them anyway.
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) text = fenced[1].trim();

  // Fallback: slice from first "{" to last "}".
  if (!text.startsWith("{")) {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end <= start) {
      throw new TimelineGenerationError(
        GENERATION_ERROR_CODES.INVALID_RESPONSE,
        "No JSON object found in AI reply."
      );
    }
    text = text.slice(start, end + 1);
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new TimelineGenerationError(
      GENERATION_ERROR_CODES.INVALID_RESPONSE,
      "AI reply contained malformed JSON."
    );
  }
}

const PRIORITY_MAP = { low: "low", medium: "medium", high: "high", critical: "high", urgent: "high" };

function normalizeTasks(tasks) {
  if (!Array.isArray(tasks)) return [];
  return tasks
    .slice(0, MAX_TASKS_PER_EVENT)
    .map((t) => {
      if (typeof t === "string") return t.trim();
      if (t && typeof t.title === "string") return t.title.trim();
      return "";
    })
    .filter(Boolean)
    .map((title) => ({ title, done: false }));
}

/**
 * Validates and normalizes a parsed AI timeline response.
 * Throws TimelineGenerationError(INVALID_RESPONSE) when unusable;
 * otherwise returns cleaned events + warnings about what was fixed.
 */
export function validateTimelineResponse(raw, { sowingDateISO = null } = {}) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new TimelineGenerationError(
      GENERATION_ERROR_CODES.INVALID_RESPONSE,
      "AI response is not a JSON object."
    );
  }
  if (!Array.isArray(raw.timeline) || raw.timeline.length === 0) {
    throw new TimelineGenerationError(
      GENERATION_ERROR_CODES.INVALID_RESPONSE,
      "AI response has no timeline events."
    );
  }

  const warnings = [];
  const sowingKnown = Boolean(sowingDateISO && DATE_RE.test(sowingDateISO));
  const events = [];
  let lastDayNumber = 0;

  for (const item of raw.timeline.slice(0, MAX_EVENTS)) {
    if (!item || typeof item !== "object") {
      warnings.push("Skipped a non-object timeline entry.");
      continue;
    }

    const dayNumber = Math.round(Number(item.dayNumber));
    if (!Number.isInteger(dayNumber) || dayNumber < 1) {
      warnings.push(`Skipped event with invalid dayNumber: ${item.dayNumber}`);
      continue;
    }
    if (dayNumber <= lastDayNumber) {
      warnings.push(`Skipped out-of-order event at day ${dayNumber}.`);
      continue;
    }

    const title = typeof item.title === "string" ? item.title.trim() : "";
    if (!title) {
      warnings.push(`Skipped day ${dayNumber}: missing title.`);
      continue;
    }

    // Date consistency with the sowing anchor — the anchor always wins.
    let date = typeof item.date === "string" && DATE_RE.test(item.date) ? item.date : null;
    if (sowingKnown) {
      const expected = addDaysISO(sowingDateISO, dayNumber - 1);
      if (date && date !== expected) {
        warnings.push(`Day ${dayNumber}: AI date ${date} corrected to ${expected} (sowing anchor).`);
      }
      date = expected;
    } else if (!date) {
      warnings.push(`Day ${dayNumber}: no date and no sowing anchor; date left null.`);
    }

    const priorityRaw = typeof item.priority === "string" ? item.priority.toLowerCase() : "";
    const priority = PRIORITY_MAP[priorityRaw] ?? "medium";

    const status = timelineService.EVENT_STATUSES.includes(item.status)
      ? item.status
      : "upcoming";

    lastDayNumber = dayNumber;
    events.push({
      dayNumber,
      date,
      stage: typeof item.stage === "string" ? item.stage.trim() : "",
      title,
      description: typeof item.description === "string" ? item.description : "",
      tasks: normalizeTasks(item.tasks),
      irrigationGuidance: typeof item.irrigationGuidance === "string" ? item.irrigationGuidance : null,
      soilGuidance: typeof item.soilGuidance === "string" ? item.soilGuidance : null,
      nutritionGuidance: typeof item.nutritionGuidance === "string" ? item.nutritionGuidance : null,
      pestMonitoring: typeof item.pestMonitoring === "string" ? item.pestMonitoring : null,
      diseaseMonitoring: typeof item.diseaseMonitoring === "string" ? item.diseaseMonitoring : null,
      priority,
      status,
      isEstimated: Boolean(item.isEstimated) || !sowingKnown,
      aiGenerated: true,
    });
  }

  if (events.length === 0) {
    throw new TimelineGenerationError(
      GENERATION_ERROR_CODES.INVALID_RESPONSE,
      "AI response contained no usable timeline events."
    );
  }

  // Harvest date: valid format + not before sowing.
  let estimatedHarvestDate =
    typeof raw.estimatedHarvestDate === "string" && DATE_RE.test(raw.estimatedHarvestDate)
      ? raw.estimatedHarvestDate
      : null;
  if (estimatedHarvestDate && sowingKnown && estimatedHarvestDate < sowingDateISO) {
    warnings.push("Estimated harvest date was before sowing date; ignored.");
    estimatedHarvestDate = null;
  }

  const cropStage = typeof raw.cropStage === "string" ? raw.cropStage.trim() || null : null;

  return { events, cropStage, estimatedHarvestDate, warnings };
}

// -----------------------------------------------------------------------------
// Generation orchestration — context → AI → validation → Firestore save
// -----------------------------------------------------------------------------

/**
 * Generates and persists the personalized timeline for one crop.
 * NEVER throws — returns { ok: true, ... } or { ok: false, error }.
 */
export async function generateCropTimeline(context, options = {}) {
  const { timeoutMs = DEFAULT_TIMEOUT_MS } = options;

  if (!context?.uid || !context?.cropId || !context?.cropEntry) {
    return fail(
      context,
      GENERATION_ERROR_CODES.MISSING_CONTEXT,
      "A full crop context (uid, cropId, cropEntry) is required."
    );
  }

  const { uid, cropId } = context;

  // Metadata doc exists before generation so retry/error state can persist.
  try {
    await timelineService.initTimeline(uid, cropId, {
      sowingDate: context.sowingDateISO,
    });
  } catch (err) {
    return fail(context, GENERATION_ERROR_CODES.SAVE_FAILED, err.message);
  }

  // ---- AI call ----
  let validated;
  try {
    const apiUrl = resolveApiUrl(options);
    if (!apiUrl) {
      throw new TimelineGenerationError(
        GENERATION_ERROR_CODES.MISSING_API_URL,
        "VITE_API_URL is missing. Check your .env.local file."
      );
    }
    const prompt = buildTimelinePrompt(context);
    const reply = await callAIBackend(apiUrl, prompt, {
      location: context.locationString,
      timeoutMs,
    });
    const raw = extractJsonFromReply(reply);
    validated = validateTimelineResponse(raw, {
      sowingDateISO: context.sowingDateISO,
    });
  } catch (err) {
    return fail(context, err.code ?? GENERATION_ERROR_CODES.AI_REQUEST_FAILED, err.message);
  }

  // ---- Persist (Phase 2 architecture) ----
  try {
    await timelineService.writeTimelineEvents(uid, cropId, validated.events, {
      replace: true,
    });
    const meta = await timelineService.getTimeline(uid, cropId);
    await timelineService.updateTimelineMeta(uid, cropId, {
      status: timelineService.TIMELINE_STATUS.ACTIVE,
      generatedBy: timelineService.TIMELINE_SOURCE.AI,
      version: (meta?.version ?? 0) + 1,
      lastGeneratedAt: new Date().toISOString(),
      lastGenerationError: null,
      currentStage: validated.cropStage,
      expectedHarvestDate: validated.estimatedHarvestDate,
    });
  } catch (err) {
    return fail(context, GENERATION_ERROR_CODES.SAVE_FAILED, err.message);
  }

  return {
    ok: true,
    cropId,
    eventCount: validated.events.length,
    cropStage: validated.cropStage,
    estimatedHarvestDate: validated.estimatedHarvestDate,
    warnings: validated.warnings,
  };
}

// Records the failure on the metadata doc (best effort) and returns a
// normalized failure object instead of throwing.
async function fail(context, code, message) {
  if (context?.uid && context?.cropId) {
    try {
      await timelineService.updateTimelineMeta(context.uid, context.cropId, {
        lastGenerationError: `${code}: ${message}`,
        lastAttemptAt: new Date().toISOString(),
      });
    } catch {
      /* meta may not exist yet — failure state simply won't persist */
    }
  }
  return { ok: false, error: { code, message } };
}

// -----------------------------------------------------------------------------
// Creation-flow orchestrator — used right after a crop is saved
// -----------------------------------------------------------------------------

/**
 * Finds the just-created crop in crops/{uid}, derives its cropId and runs
 * the full generation flow. Crops have no stored id, so the entry is matched
 * by its unique createdAt timestamp + name.
 */
export async function generateTimelineForNewCrop(uid, cropEntry) {
  let index = -1;
  try {
    const snap = await getDoc(doc(fdb, "crops", uid));
    const crops = snap.exists() ? (snap.data()?.crops ?? []) : [];
    index = crops.findIndex(
      (c) => c.createdAt === cropEntry.createdAt && c.CropName === cropEntry.CropName
    );
    if (index === -1) index = crops.length - 1;
  } catch {
    return {
      ok: false,
      error: {
        code: GENERATION_ERROR_CODES.MISSING_CONTEXT,
        message: "Could not locate the saved crop for timeline generation.",
      },
    };
  }

  const cropId = cropKey(cropEntry, index);
  try {
    const context = await buildCropAIContext(cropId, { uid, cropEntry, index });
    return await generateCropTimeline(context);
  } catch (err) {
    return {
      ok: false,
      error: {
        code: GENERATION_ERROR_CODES.MISSING_CONTEXT,
        message: err.message ?? "Timeline generation could not start.",
      },
    };
  }
}
