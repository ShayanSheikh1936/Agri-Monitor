// =============================================================================
// Market AI insights — Global Market Rates page.
//
// Uses the EXISTING dashboard AI backend (VITE_DASHBOARD_URL) with its fixed
// contract { prompt, lang, image, location } -> { reply }. No new endpoint, no
// new backend field: every piece of market context is embedded INTO the prompt
// string, exactly like src/services/timelineGenerator.js does for crops.
//
// SAFETY:
//  - AI output is NEVER trusted raw — every field is validated and bounded.
//  - Only real, fetched market numbers are ever put in a prompt.
//  - Neither entry point throws; both return { ok, ... } so an AI outage can
//    never break the market table.
// =============================================================================

import { getPlantAgeDays } from "../lib/cropUtils.js";

export const MARKET_AI_ERROR_CODES = {
  MISSING_API_URL: "MARKET_MISSING_API_URL",
  MISSING_CONTEXT: "MARKET_MISSING_CONTEXT",
  AI_REQUEST_FAILED: "MARKET_AI_REQUEST_FAILED",
  AI_TIMEOUT: "MARKET_AI_TIMEOUT",
  INVALID_RESPONSE: "MARKET_INVALID_RESPONSE",
};

const DEFAULT_TIMEOUT_MS = 75_000;
const MAX_LIST = 8;
const MAX_MOVERS_IN_PROMPT = 10;

export class MarketAIError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "MarketAIError";
    this.code = code;
  }
}

// -----------------------------------------------------------------------------
// Backend call — same contract as timelineGenerator's callAIBackend, kept
// self-contained so this feature cannot affect any other page's AI flow.
// -----------------------------------------------------------------------------

function resolveApiUrl(options) {
  if (options.apiUrl) return options.apiUrl;
  const env = typeof import.meta.env === "object" ? import.meta.env : {};
  return env.VITE_DASHBOARD_URL || null;
}

async function fetchWithDnsRetry(url, init) {
  try {
    return await fetch(url, init);
  } catch (err) {
    if (err?.name === "AbortError" || err?.name === "TimeoutError") throw err;
    await new Promise((r) => setTimeout(r, 1500));
    return fetch(url, init);
  }
}

async function callDashboardAI(apiUrl, prompt, { location = null, timeoutMs }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetchWithDnsRetry(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, lang: "English", image: null, location }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err?.name === "AbortError") {
      throw new MarketAIError(
        MARKET_AI_ERROR_CODES.AI_TIMEOUT,
        "The market AI analysis timed out."
      );
    }
    throw new MarketAIError(
      MARKET_AI_ERROR_CODES.AI_REQUEST_FAILED,
      "Could not reach the AI service."
    );
  } finally {
    clearTimeout(timer);
  }

  const body = await response.text();

  if (!response.ok) {
    // Gateway timeouts are the most common failure on this backend — report
    // them as "temporarily unavailable" instead of a raw HTTP number.
    if ([502, 503, 504].includes(response.status)) {
      throw new MarketAIError(
        MARKET_AI_ERROR_CODES.AI_REQUEST_FAILED,
        "The AI service is temporarily unavailable (gateway timeout). Try again shortly."
      );
    }
    let message = `AI service returned HTTP ${response.status}.`;
    try {
      const parsed = JSON.parse(body);
      if (parsed?.error) message = String(parsed.error).slice(0, 300);
    } catch {
      /* non-JSON error body (e.g. gateway HTML page) — keep default */
    }
    throw new MarketAIError(MARKET_AI_ERROR_CODES.AI_REQUEST_FAILED, message);
  }

  let data;
  try {
    data = JSON.parse(body);
  } catch {
    throw new MarketAIError(
      MARKET_AI_ERROR_CODES.INVALID_RESPONSE,
      "AI service returned a non-JSON response."
    );
  }

  if (!data?.reply) {
    throw new MarketAIError(
      MARKET_AI_ERROR_CODES.INVALID_RESPONSE,
      "AI service returned no reply."
    );
  }
  return data.reply;
}

export function extractJsonFromReply(reply) {
  if (typeof reply !== "string" || reply.trim() === "") {
    throw new MarketAIError(MARKET_AI_ERROR_CODES.INVALID_RESPONSE, "AI reply was empty.");
  }
  let text = reply.trim();

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) text = fenced[1].trim();

  if (!text.startsWith("{")) {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end <= start) {
      throw new MarketAIError(
        MARKET_AI_ERROR_CODES.INVALID_RESPONSE,
        "No JSON object found in AI reply."
      );
    }
    text = text.slice(start, end + 1);
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new MarketAIError(
      MARKET_AI_ERROR_CODES.INVALID_RESPONSE,
      "AI reply contained malformed JSON."
    );
  }
}

// -----------------------------------------------------------------------------
// Prompt context — shared by both AI flows
// -----------------------------------------------------------------------------

function formatQuote(item) {
  const unit = item.unit ? ` ${item.unit}` : "";
  const pct =
    item.changePct === null
      ? "no change data"
      : `${item.changePct > 0 ? "+" : ""}${item.changePct}%`;
  const stale = item.isStale ? " (older quote period)" : "";
  return `${item.name} [${item.category}]: ${item.value}${unit}, ${pct}${stale}`;
}

function moversBlock(items, direction, label) {
  const list = items
    .filter((i) => i.direction === direction && i.changePct !== null)
    .sort((a, b) =>
      direction === "up"
        ? (b.changePct ?? 0) - (a.changePct ?? 0)
        : (a.changePct ?? 0) - (b.changePct ?? 0)
    )
    .slice(0, MAX_MOVERS_IN_PROMPT);

  if (list.length === 0) return [`${label}: none reported.`];
  return [`${label}:`, ...list.map((i) => `- ${formatQuote(i)}`)];
}

function cropsBlock(crops) {
  const list = Array.isArray(crops) ? crops.filter(Boolean) : [];
  if (list.length === 0) return [];

  // Real crop entry field names (see timelineService.buildCropProfile).
  const lines = ["", "FARMER'S OWN CROPS (personalize advice to these):"];
  for (const crop of list.slice(0, 6)) {
    const parts = [String(crop.CropName ?? "Unnamed crop")];
    if (crop.CropCategory) parts.push(`category ${crop.CropCategory}`);
    if (crop.SeedType) parts.push(`variety ${crop.SeedType}`);
    const age = getPlantAgeDays(crop);
    if (age !== null) parts.push(`plant age ${age} days`);
    else if (crop.SowingDate ?? crop.Sowingdate) parts.push(`sown ${crop.SowingDate ?? crop.Sowingdate}`);
    if (crop.AreaSize) parts.push(`land ${crop.AreaSize} ${crop.AreaUnit ?? ""}`.trim());
    if (crop.SoilType) parts.push(`soil ${crop.SoilType}`);
    if (crop.gpsLocation) parts.push(`location ${crop.gpsLocation}`);
    lines.push(`- ${parts.join(", ")}`);
  }
  return lines;
}

function watchlistBlock(favorites) {
  const list = Array.isArray(favorites) ? favorites.filter(Boolean) : [];
  if (list.length === 0) return [];

  const lines = ["", "FARMER'S WATCHLIST (already tracked by the user):"];
  for (const fav of list.slice(0, MAX_LIST)) {
    const extras = [];
    if (fav.targetPrice !== null && fav.targetPrice !== undefined) extras.push(`buy target ${fav.targetPrice}`);
    if (fav.alertAbove !== null && fav.alertAbove !== undefined) extras.push(`alert above ${fav.alertAbove}`);
    if (fav.alertBelow !== null && fav.alertBelow !== undefined) extras.push(`alert below ${fav.alertBelow}`);
    if (fav.note) extras.push(`note: ${String(fav.note).slice(0, 120)}`);
    lines.push(`- ${fav.name} [${fav.category ?? "Other"}]${extras.length ? ` — ${extras.join(", ")}` : ""}`);
  }
  return lines;
}

// -----------------------------------------------------------------------------
// 1. Market-wide insights
// -----------------------------------------------------------------------------

export function buildMarketInsightsPrompt({ feed, stats, favorites = [], crops = [], question = null }) {
  const items = feed?.items ?? [];
  const providers = feed?.providers ?? [];

  const lines = [
    "You are an expert agricultural commodity market analyst for the Agri Monitor farm dashboard.",
    "Interpret the REAL market data below and advise a farmer on what it means for their farm.",
    "Respond with STRICT JSON only: no markdown, no code fences, no commentary.",
    "",
    `MARKET SNAPSHOT (period ${feed?.period ?? "unknown"}, generated ${feed?.generatedAt ?? "unknown"}):`,
    `- Commodities tracked: ${stats?.total ?? items.length}`,
    `- Rising: ${stats?.gainers ?? 0}, falling: ${stats?.losers ?? 0}, unchanged: ${stats?.flat ?? 0}`,
    `- Average move across all commodities: ${stats?.avgChangePct ?? 0}%`,
    `- Market breadth (share rising): ${stats?.breadth ?? 0}%`,
  ];

  if (providers.length) {
    lines.push("", "DATA PROVIDERS:");
    for (const p of providers) {
      lines.push(
        `- ${p.source ?? p.key}: ${p.status === "ok" ? `available (period ${p.period ?? "n/a"})` : `unavailable${p.error ? ` — ${p.error}` : ""}`}`
      );
    }
  }

  if (stats?.categories?.length) {
    lines.push("", "CATEGORY PERFORMANCE (average change %):");
    for (const c of stats.categories.slice(0, MAX_LIST + 4)) {
      lines.push(`- ${c.category}: ${c.avgChangePct}% across ${c.count} items (${c.gainers} up, ${c.losers} down)`);
    }
  }

  lines.push("", ...moversBlock(items, "up", "TOP RISING COMMODITIES"));
  lines.push("", ...moversBlock(items, "down", "TOP FALLING COMMODITIES"));

  lines.push(...watchlistBlock(favorites));
  lines.push(...cropsBlock(crops));

  if (question && String(question).trim()) {
    lines.push("", `FARMER'S SPECIFIC QUESTION: ${String(question).trim().slice(0, 400)}`);
  }

  lines.push(
    "",
    "RULES:",
    "1. Use ONLY the numbers above. Never invent prices, percentages, dates or commodities that are not listed.",
    "2. Keep advice relevant to a FARMER: selling decisions, input costs (fertilizer, fuel, feed), storage timing and contract planning.",
    "3. Use uncertainty language (likely, may, appears, consider) — never guaranteed price predictions.",
    '4. marketTone must be exactly "rising", "falling", "mixed" or "stable".',
    '5. Every direction/severity must be exactly one of the allowed values shown in the JSON shape.',
    "6. SAFETY: never name specific chemical products, dosages or financial instruments; never give investment advice.",
    "7. If the farmer's own crops are listed, tie at least one opportunity or risk to them.",
    "8. Keep each title under 60 characters and each detail under 220 characters.",
    "",
    "Return exactly this JSON object shape:",
    '{"summary":"two or three sentences on what this market snapshot means for a farmer","marketTone":"rising|falling|mixed|stable","keyTrends":[{"title":"short title","detail":"what the data shows","category":"category name","direction":"up|down|flat"}],"inputCostOutlook":{"trend":"rising|falling|stable","detail":"what fertilizer/energy/feed prices imply for farm costs"},"opportunities":[{"title":"short title","detail":"what the farmer could consider","relatedCommodity":"commodity name or null","timing":"short window or null"}],"risks":[{"title":"short title","detail":"what could hurt the farmer","relatedCommodity":"commodity name or null","severity":"low|medium|high"}],"actionPlan":["concrete step 1","concrete step 2"],"confidence":0.6}'
  );

  return lines.join("\n");
}

const TONES = ["rising", "falling", "mixed", "stable"];
const DIRECTIONS = ["up", "down", "flat"];
const SEVERITIES = ["low", "medium", "high"];
const TRENDS = ["rising", "falling", "stable"];

function confidenceOf(raw, warnings) {
  let confidence = raw.confidence;
  if (typeof confidence === "string") confidence = Number(confidence);
  if (typeof confidence === "number" && Number.isFinite(confidence)) {
    if (confidence > 1 && confidence <= 100) confidence /= 100;
    return Math.min(Math.max(confidence, 0), 1);
  }
  warnings.push("Missing confidence — defaulted to 0.5.");
  return 0.5;
}

function listOfStrings(value, cap, itemCap) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v) => typeof v === "string" && v.trim())
    .map((v) => v.trim().slice(0, itemCap))
    .slice(0, cap);
}

/** Validates the market-wide insights reply. Throws MarketAIError when unusable. */
export function validateMarketInsights(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new MarketAIError(
      MARKET_AI_ERROR_CODES.INVALID_RESPONSE,
      "AI market response is not a JSON object."
    );
  }

  const warnings = [];
  const str = (v, cap) => (typeof v === "string" && v.trim() ? v.trim().slice(0, cap) : null);

  const summary = str(raw.summary, 700);
  const keyTrends = [];
  for (const t of Array.isArray(raw.keyTrends) ? raw.keyTrends.slice(0, MAX_LIST) : []) {
    const title = str(t?.title, 90);
    const detail = str(t?.detail, 320);
    if (!title || !detail) {
      warnings.push("Skipped a key trend without a title or detail.");
      continue;
    }
    const direction = DIRECTIONS.includes(String(t?.direction ?? "").toLowerCase())
      ? String(t.direction).toLowerCase()
      : "flat";
    keyTrends.push({ title, detail, category: str(t?.category, 60), direction });
  }

  const opportunities = [];
  for (const o of Array.isArray(raw.opportunities) ? raw.opportunities.slice(0, MAX_LIST) : []) {
    const title = str(o?.title, 90);
    const detail = str(o?.detail, 320);
    if (!title || !detail) {
      warnings.push("Skipped an opportunity without a title or detail.");
      continue;
    }
    opportunities.push({
      title,
      detail,
      relatedCommodity: str(o?.relatedCommodity, 80),
      timing: str(o?.timing, 60),
    });
  }

  const risks = [];
  for (const r of Array.isArray(raw.risks) ? raw.risks.slice(0, MAX_LIST) : []) {
    const title = str(r?.title, 90);
    const detail = str(r?.detail, 320);
    if (!title || !detail) {
      warnings.push("Skipped a risk without a title or detail.");
      continue;
    }
    const severityRaw = String(r?.severity ?? "").toLowerCase();
    risks.push({
      title,
      detail,
      relatedCommodity: str(r?.relatedCommodity, 80),
      severity: SEVERITIES.includes(severityRaw) ? severityRaw : "medium",
    });
  }

  const actionPlan = listOfStrings(raw.actionPlan, MAX_LIST, 240);

  if (!summary && keyTrends.length === 0 && opportunities.length === 0) {
    throw new MarketAIError(
      MARKET_AI_ERROR_CODES.INVALID_RESPONSE,
      "AI returned no usable market insight."
    );
  }

  const toneRaw = String(raw.marketTone ?? "").toLowerCase();
  const inputCost = raw.inputCostOutlook && typeof raw.inputCostOutlook === "object" ? raw.inputCostOutlook : {};
  const trendRaw = String(inputCost.trend ?? "").toLowerCase();

  return {
    summary: summary ?? "No market summary was returned.",
    marketTone: TONES.includes(toneRaw) ? toneRaw : "mixed",
    keyTrends,
    inputCostOutlook: {
      trend: TRENDS.includes(trendRaw) ? trendRaw : "stable",
      detail: str(inputCost.detail, 400),
    },
    opportunities,
    risks,
    actionPlan,
    confidence: confidenceOf(raw, warnings),
    warnings,
  };
}

// -----------------------------------------------------------------------------
// 2. Single-commodity analysis
// -----------------------------------------------------------------------------

export function buildCommodityAnalysisPrompt({ item, categoryStats = null, favorites = [], crops = [], question = null }) {
  if (!item) {
    throw new MarketAIError(
      MARKET_AI_ERROR_CODES.MISSING_CONTEXT,
      "A commodity is required for analysis."
    );
  }

  const lines = [
    "You are an expert agricultural commodity market analyst for the Agri Monitor farm dashboard.",
    "Analyze ONE commodity from the live market feed and explain what it means for a farmer.",
    "Respond with STRICT JSON only: no markdown, no code fences, no commentary.",
    "",
    "COMMODITY:",
    `- Name: ${item.name}`,
    `- Category: ${item.category}`,
    `- Current price: ${item.value ?? "unknown"} ${item.unit ?? ""} (${item.currency ?? "USD"})`,
    `- Previous period: ${item.prevValue ?? "unknown"} ${item.unit ?? ""}`,
    `- Change: ${item.change ?? "unknown"} (${item.changePct ?? "unknown"}%, direction ${item.direction})`,
    `- Quote period: ${item.date ?? "unknown"} (${item.frequency ?? "unknown"} frequency)`,
    `- Region: ${item.region ?? "Global"}`,
    `- Source: ${item.source ?? "unknown"}`,
  ];

  if (item.isStale) {
    lines.push(`- NOTE: this quote is ${item.lagMonths} month(s) older than the newest period in the feed — treat it as lagging data.`);
  }

  if (categoryStats) {
    lines.push(
      "",
      "CATEGORY CONTEXT:",
      `- ${categoryStats.category} average move: ${categoryStats.avgChangePct}% across ${categoryStats.count} items (${categoryStats.gainers} up, ${categoryStats.losers} down)`
    );
  }

  lines.push(...watchlistBlock(favorites.filter((f) => f.itemId === item.id)));
  lines.push(...cropsBlock(crops));

  if (question && String(question).trim()) {
    lines.push("", `FARMER'S SPECIFIC QUESTION: ${String(question).trim().slice(0, 400)}`);
  }

  lines.push(
    "",
    "RULES:",
    "1. Use ONLY the figures above. Never invent prices, historical series, forecasts or news that were not provided.",
    '2. guidance must be exactly "hold", "watch", "consider_selling" or "consider_buying" — it is decision support, never financial advice.',
    "3. Use uncertainty language (likely, may, appears, consider).",
    '4. urgency must be exactly "low", "medium" or "high".',
    "5. SAFETY: never name specific chemical products or dosages; never promise a price movement.",
    "6. If the farmer's own crops are listed, say whether this commodity is relevant to them.",
    "7. Keep outlook under 220 characters, each driver under 160 characters and farmerImpact under 300 characters.",
    "",
    "Return exactly this JSON object shape:",
    '{"outlook":"one or two sentences on what this price move suggests","guidance":"hold|watch|consider_selling|consider_buying","drivers":["likely reason 1","likely reason 2"],"farmerImpact":"what this means for the farmer\'s costs or income","recommendedAction":"one concrete, safe step","relatedCrops":["crop this commodity affects"],"watchFor":["signal to monitor next"],"urgency":"low|medium|high","confidence":0.6}'
  );

  return lines.join("\n");
}

const GUIDANCE = ["hold", "watch", "consider_selling", "consider_buying"];

/** Validates the single-commodity analysis reply. Throws MarketAIError when unusable. */
export function validateCommodityAnalysis(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new MarketAIError(
      MARKET_AI_ERROR_CODES.INVALID_RESPONSE,
      "AI commodity response is not a JSON object."
    );
  }

  const warnings = [];
  const str = (v, cap) => (typeof v === "string" && v.trim() ? v.trim().slice(0, cap) : null);

  const outlook = str(raw.outlook, 400);
  const farmerImpact = str(raw.farmerImpact, 500);
  const recommendedAction = str(raw.recommendedAction, 320);
  const drivers = listOfStrings(raw.drivers, MAX_LIST, 220);
  const relatedCrops = listOfStrings(raw.relatedCrops, 6, 60);
  const watchFor = listOfStrings(raw.watchFor, MAX_LIST, 200);

  if (!outlook && !farmerImpact && drivers.length === 0) {
    throw new MarketAIError(
      MARKET_AI_ERROR_CODES.INVALID_RESPONSE,
      "AI returned no usable commodity analysis."
    );
  }

  const guidanceRaw = String(raw.guidance ?? "").toLowerCase().replace(/[\s-]+/g, "_");
  if (raw.guidance && !GUIDANCE.includes(guidanceRaw)) {
    warnings.push(`Unknown guidance "${raw.guidance}" normalized to watch.`);
  }

  const urgencyRaw = String(raw.urgency ?? "").toLowerCase();

  return {
    outlook: outlook ?? "No outlook was returned for this commodity.",
    guidance: GUIDANCE.includes(guidanceRaw) ? guidanceRaw : "watch",
    drivers,
    farmerImpact,
    recommendedAction,
    relatedCrops,
    watchFor,
    urgency: SEVERITIES.includes(urgencyRaw) ? urgencyRaw : "medium",
    confidence: confidenceOf(raw, warnings),
    warnings,
  };
}

// -----------------------------------------------------------------------------
// Orchestration — never throws
// -----------------------------------------------------------------------------

function ensureApiUrl(options) {
  const apiUrl = resolveApiUrl(options);
  if (!apiUrl) {
    throw new MarketAIError(
      MARKET_AI_ERROR_CODES.MISSING_API_URL,
      "VITE_DASHBOARD_URL is missing. Check your .env.local file."
    );
  }
  return apiUrl;
}

/**
 * Market-wide AI insights. NEVER throws — returns { ok, result } or
 * { ok: false, error }. Called only on explicit user action.
 */
export async function generateMarketInsights(payload, options = {}) {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, location = null } = options;

  const items = payload?.feed?.items;
  if (!Array.isArray(items) || items.length === 0) {
    return {
      ok: false,
      error: {
        code: MARKET_AI_ERROR_CODES.MISSING_CONTEXT,
        message: "Market data must load before AI insights can run.",
      },
    };
  }

  try {
    const apiUrl = ensureApiUrl(options);
    const prompt = buildMarketInsightsPrompt(payload);
    const reply = await callDashboardAI(apiUrl, prompt, { location, timeoutMs });
    return { ok: true, result: validateMarketInsights(extractJsonFromReply(reply)) };
  } catch (err) {
    return {
      ok: false,
      error: {
        code: err?.code ?? MARKET_AI_ERROR_CODES.AI_REQUEST_FAILED,
        message: err?.message ?? "Market insight generation failed.",
      },
    };
  }
}

/**
 * Single-commodity AI analysis. NEVER throws — returns { ok, result } or
 * { ok: false, error }.
 */
export async function generateCommodityAnalysis(payload, options = {}) {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, location = null } = options;

  if (!payload?.item) {
    return {
      ok: false,
      error: {
        code: MARKET_AI_ERROR_CODES.MISSING_CONTEXT,
        message: "A commodity is required for analysis.",
      },
    };
  }

  try {
    const apiUrl = ensureApiUrl(options);
    const prompt = buildCommodityAnalysisPrompt(payload);
    const reply = await callDashboardAI(apiUrl, prompt, { location, timeoutMs });
    return { ok: true, result: validateCommodityAnalysis(extractJsonFromReply(reply)) };
  } catch (err) {
    return {
      ok: false,
      error: {
        code: err?.code ?? MARKET_AI_ERROR_CODES.AI_REQUEST_FAILED,
        message: err?.message ?? "Commodity analysis failed.",
      },
    };
  }
}
