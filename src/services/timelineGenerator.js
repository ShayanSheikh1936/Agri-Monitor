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

  if (context.recentActivities?.length) {
    lines.push("", "RECENT FIELD ACTIVITIES (user-logged, newest first):");
    for (const a of context.recentActivities) {
      const qty = a.quantity ? ` ${a.quantity}${a.unit ? " " + a.unit : ""}` : "";
      const note = a.notes ? ` — ${a.notes}` : "";
      lines.push(`- ${a.date ?? "undated"}: ${a.type}${qty}${note}`);
    }
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

async function callAIBackend(apiUrl, prompt, { location = null, image = null, timeoutMs }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetchWithDnsRetry(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Same contract as the existing Chatbot (chatbots.jsx) — no new backend.
      // `image` is a base64 data URL (existing chatbot pattern) or null.
      body: JSON.stringify({ prompt, lang: "English", image, location }),
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

  // Stamp attempt start (non-fatal) so dashboards can show "in progress".
  try {
    await timelineService.markGenerationAttempt(uid, cropId);
  } catch {
    /* non-fatal */
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

// =============================================================================
// Crop image analysis — same existing AI backend, image sent as base64 data
// URL exactly like the chatbot does. Flow: image record → context → AI →
// strict validation → saved analysis. Never throws; returns { ok, ... }.
// =============================================================================

export function buildImageAnalysisPrompt(context, userNotes = null) {
  const p = context.profile;
  const provided = (v) => (v === null || v === undefined || v === "" ? "not provided" : String(v));

  const lines = [
    "You are an expert agronomist assistant for the Agri Monitor farm dashboard.",
    "Analyze the ATTACHED CROP PHOTO and return a structured health analysis.",
    "Respond with STRICT JSON only: no markdown, no code fences, no commentary.",
    "",
    "CROP PROFILE (from the farmer's dashboard):",
    `- Crop name: ${provided(p.name)}`,
    `- Category: ${provided(p.category)}`,
    `- Variety / seed type: ${provided(p.varietySeedType)}`,
    `- Sowing date: ${context.hasSowingDate ? context.sowingDateISO : "not provided"}`,
    `- Plant age today: ${context.plantAgeDays != null ? `${context.plantAgeDays} days` : "unknown"}`,
    `- Location: ${context.locationString ?? "not provided"}`,
    `- Soil type: ${provided(p.soil)}`,
    `- Irrigation system: ${provided(p.irrigation)}`,
    `- Reported condition: ${provided(p.currentCondition)}`,
  ];

  if (context.affectedPart) {
    lines.push(`- Reported affected part: ${context.affectedPart}`);
  }

  if (context.recentActivities?.length) {
    lines.push("", "RECENT FIELD ACTIVITIES (user-logged, newest first):");
    for (const a of context.recentActivities) {
      const qty = a.quantity ? ` ${a.quantity}${a.unit ? " " + a.unit : ""}` : "";
      const note = a.notes ? ` — ${a.notes}` : "";
      lines.push(`- ${a.date ?? "undated"}: ${a.type}${qty}${note}`);
    }
  }

  if (userNotes && String(userNotes).trim()) {
    lines.push("", `FARMER NOTE ABOUT THIS PHOTO: ${String(userNotes).trim()}`);
  }

  lines.push(
    "",
    "RULES:",
    '1. You are looking at ONE photo — NEVER claim certainty. Use uncertainty language such as "likely", "possible", "appears consistent with", "cannot determine confidently".',
    "2. Never invent information that is not visible in the image or not provided above. Unknown values stay null.",
    "3. SAFETY: never prescribe exact pesticide/chemical product names or dosages. Keep actions general and evidence-aware, and set needsExpertReview=true whenever evidence is insufficient.",
    "4. If the image is blurry, not a plant, or unreadable, say so honestly in observations and set needsExpertReview=true.",
    "5. Consider the recent field activities when reasoning about possible causes (e.g. recent fertilizer + yellowing leaves).",
    '6. urgency must be exactly "low", "medium" or "high".',
    "",
    "Return exactly this JSON object shape:",
    '{"identifiedCrop":"best guess crop or null","possibleIssue":"one sentence, uncertainty-aware, or null","confidence":0.55,"observations":["what is visible in the photo"],"possibleCauses":["likely causes"],"recommendedActions":["safe general actions"],"prevention":["preventive tips"],"urgency":"low|medium|high","needsExpertReview":false}'
  );

  return lines.join("\n");
}

const URGENCY_MAP = { low: "low", medium: "medium", high: "high", severe: "high", urgent: "high", none: "low" };
// Crude chemical-dosage detector — flags exact quantitative prescriptions.
const DOSAGE_RE = /\b\d+(?:\.\d+)?\s?(?:g|kg|ml|l|grams?|lit(?:er|re)s?)\s?(?:\/|per)\s?(?:l|lit(?:er|re)|ha|acre|m2|m²)/i;

/**
 * Validates and normalizes a parsed AI image-analysis response into the
 * structured analysis contract. Throws TimelineGenerationError when unusable.
 */
export function validateAnalysisResponse(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new TimelineGenerationError(
      GENERATION_ERROR_CODES.INVALID_RESPONSE,
      "AI analysis response is not a JSON object."
    );
  }

  const warnings = [];
  const strOrNull = (v) =>
    typeof v === "string" && v.trim() ? v.trim().slice(0, 500) : null;
  const list = (v) =>
    Array.isArray(v)
      ? v
          .filter((x) => typeof x === "string" && x.trim())
          .map((x) => x.trim().slice(0, 300))
          .slice(0, 12)
      : [];

  // Confidence must land in [0,1]; percentages are folded down.
  let confidence = raw.confidence;
  if (typeof confidence === "string") confidence = Number(confidence);
  if (typeof confidence === "number" && Number.isFinite(confidence)) {
    if (confidence > 1 && confidence <= 100) confidence = confidence / 100;
    confidence = Math.min(Math.max(confidence, 0), 1);
  } else {
    confidence = null;
  }

  const urgencyRaw =
    typeof raw.urgency === "string" ? raw.urgency.toLowerCase().trim() : "";
  const urgency = URGENCY_MAP[urgencyRaw] ?? "medium";
  if (!URGENCY_MAP[urgencyRaw]) {
    warnings.push(`Unknown urgency "${urgencyRaw || "(missing)"}" normalized to medium.`);
  }

  const observations = list(raw.observations);
  const possibleCauses = list(raw.possibleCauses);
  const recommendedActions = list(raw.recommendedActions);
  const prevention = list(raw.prevention);

  // Safety: high urgency or any exact chemical dosage forces expert review.
  const hasDosage = [...recommendedActions, ...prevention].some((s) =>
    DOSAGE_RE.test(s)
  );
  if (hasDosage) {
    warnings.push("Exact dosage figures detected — flagged for expert review.");
  }
  const needsExpertReview =
    Boolean(raw.needsExpertReview) || urgency === "high" || hasDosage;

  const identifiedCrop = strOrNull(raw.identifiedCrop);
  const possibleIssue = strOrNull(raw.possibleIssue);

  if (!identifiedCrop && !possibleIssue && observations.length === 0) {
    throw new TimelineGenerationError(
      GENERATION_ERROR_CODES.INVALID_RESPONSE,
      "AI analysis contained no usable findings."
    );
  }

  return {
    identifiedCrop,
    possibleIssue,
    confidence,
    observations,
    possibleCauses,
    recommendedActions,
    prevention,
    urgency,
    needsExpertReview,
    warnings,
  };
}

/**
 * Full image-analysis flow for one crop:
 *   image record (base64, existing storage pattern) → crop context →
 *   existing AI backend → strict validation → saved AI analysis.
 * NEVER throws — returns { ok: true, analysis } or { ok: false, error }.
 */
export async function analyzeAndSaveCropImage(uid, cropId, options = {}) {
  const { imageBase64 = null, userNotes = null, timeoutMs = DEFAULT_TIMEOUT_MS } = options;

  if (!uid || !cropId) {
    return {
      ok: false,
      error: {
        code: GENERATION_ERROR_CODES.MISSING_CONTEXT,
        message: "An authenticated user and crop are required.",
      },
    };
  }
  if (typeof imageBase64 !== "string" || !imageBase64.startsWith("data:image/")) {
    return {
      ok: false,
      error: {
        code: GENERATION_ERROR_CODES.MISSING_CONTEXT,
        message: "A valid image is required for analysis.",
      },
    };
  }

  // ---- 1. Image record first (persists even if the AI call fails) ----
  let imageRecord;
  try {
    imageRecord = await timelineService.addTimelineImage(uid, cropId, {
      purpose: "analysis",
      base64: imageBase64,
      caption: userNotes ? String(userNotes).slice(0, 200) : "AI image analysis",
    });
  } catch (err) {
    return {
      ok: false,
      error: {
        code: GENERATION_ERROR_CODES.SAVE_FAILED,
        message: err.message ?? "The image could not be saved.",
      },
    };
  }

  // ---- 2. Crop profile + activity history context ----
  let context;
  try {
    context = await buildCropAIContext(cropId, { uid });
  } catch (err) {
    return {
      ok: false,
      error: {
        code: GENERATION_ERROR_CODES.MISSING_CONTEXT,
        message: err.message ?? "Crop context could not be built.",
      },
    };
  }

  // ---- 3. Existing AI backend with the image attached ----
  let validated;
  try {
    const apiUrl = resolveApiUrl(options);
    if (!apiUrl) {
      throw new TimelineGenerationError(
        GENERATION_ERROR_CODES.MISSING_API_URL,
        "VITE_API_URL is missing. Check your .env.local file."
      );
    }
    const prompt = buildImageAnalysisPrompt(context, userNotes);
    const reply = await callAIBackend(apiUrl, prompt, {
      location: context.locationString,
      image: imageBase64,
      timeoutMs,
    });
    const raw = extractJsonFromReply(reply);
    validated = validateAnalysisResponse(raw);
  } catch (err) {
    return {
      ok: false,
      imageId: imageRecord.id,
      error: {
        code: err.code ?? GENERATION_ERROR_CODES.AI_REQUEST_FAILED,
        message: err.message ?? "Image analysis failed.",
      },
    };
  }

  // ---- 4. Persist the validated analysis, linked to the image record ----
  try {
    const findings =
      validated.possibleIssue ??
      (validated.observations[0] ?? "No issue identified from this image.");
    const recommendations =
      validated.recommendedActions.join("; ") ||
      "No specific actions suggested — monitor the crop.";

    const analysis = await timelineService.saveAIAnalysis(uid, cropId, {
      kind: "image",
      imageId: imageRecord.id,
      ...validated,
      findings,
      recommendations,
    });
    return {
      ok: true,
      analysis,
      imageId: imageRecord.id,
      warnings: validated.warnings,
    };
  } catch (err) {
    return {
      ok: false,
      imageId: imageRecord.id,
      error: {
        code: GENERATION_ERROR_CODES.SAVE_FAILED,
        message: err.message ?? "The analysis could not be saved.",
      },
    };
  }
}
