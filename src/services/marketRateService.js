// =============================================================================
// Global Market Rates service — Agri Monitor Marketplace page.
//
// READ side : fetches the commodity price feed (VITE_MARKET_API_URL) and
//             normalizes it into a defensive, UI-ready shape. The upstream
//             payload is NEVER trusted raw — every field is type-checked.
// WRITE side: persists the user's marketplace data in Firestore under
//             marketData/{uid}/favorites/{docId}
//             marketData/{uid}/analyses/{docId}
//             marketData/{uid}/settings/preferences
//             rooted at the auth uid, exactly like weatherAlerts/{uid}/alerts.
//
// SAFETY: no function here throws into the page — reads reject with a coded
// Error and the hook turns it into a retry-able state; writes return
// { ok, ... } so a Firestore failure can never blank the market table.
// =============================================================================

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { fdb } from "../features/auth/firebase.js";

export const MARKET_ERROR_CODES = {
  MISSING_API_URL: "MARKET_MISSING_API_URL",
  TIMEOUT: "MARKET_TIMEOUT",
  UNAVAILABLE: "MARKET_UNAVAILABLE",
  BAD_RESPONSE: "MARKET_BAD_RESPONSE",
  NOT_AUTHENTICATED: "MARKET_NOT_AUTHENTICATED",
  SAVE_FAILED: "MARKET_SAVE_FAILED",
};

// Fallback keeps the page alive if the env key is ever missed in a build.
// Only a public endpoint URL — never a key/token.
const DEFAULT_MARKET_API_URL =
  "https://test1936.netlify.app/.netlify/functions/market";

const FETCH_TIMEOUT_MS = 20_000;
const MAX_ITEMS = 400;

const MARKET_COLLECTION = "marketData";
const FAVORITES_SUB = "favorites";
const ANALYSES_SUB = "analyses";
const SETTINGS_SUB = "settings";
const PREFS_DOC = "preferences";

export const ANALYSIS_KINDS = { MARKET: "market", COMMODITY: "commodity" };
export const ALERT_STATES = { IDLE: "idle", ABOVE: "above", BELOW: "below" };

// -----------------------------------------------------------------------------
// Small shared helpers
// -----------------------------------------------------------------------------

const finiteNumber = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);

const text = (v, cap = 200) =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, cap) : null;

const round2 = (v) => (v === null ? null : Math.round(v * 100) / 100);

// Firestore rejects undefined values — strip them before any write.
function stripUndefined(obj) {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  );
}

// Document ids cannot contain "/" and item ids arrive as "provider:slug",
// so derive a stable, storage-safe id and keep the raw one in a field.
export function marketDocId(itemId) {
  const safe = String(itemId ?? "")
    .replace(/[^A-Za-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 120);
  return safe || "unknown";
}

function codedError(code, message) {
  const err = new Error(message);
  err.code = code;
  return err;
}

// -----------------------------------------------------------------------------
// Feed fetch + normalization
// -----------------------------------------------------------------------------

export function marketApiUrl() {
  const env = typeof import.meta.env === "object" ? import.meta.env : {};
  const url = env.VITE_MARKET_API_URL;
  return typeof url === "string" && url.trim() ? url.trim() : DEFAULT_MARKET_API_URL;
}

function normalizeDirection(raw, changePct) {
  const d = typeof raw === "string" ? raw.toLowerCase().trim() : "";
  if (d === "up" || d === "down" || d === "flat") return d;
  if (changePct === null) return "flat";
  if (changePct > 0) return "up";
  if (changePct < 0) return "down";
  return "flat";
}

// "2026-08" -> months since epoch (null when unparsable) so staleness is
// comparable without timezone-sensitive Date math.
function periodToMonths(period) {
  if (typeof period !== "string") return null;
  const m = period.match(/^(\d{4})-(\d{2})/);
  if (!m) return null;
  const months = Number(m[1]) * 12 + (Number(m[2]) - 1);
  return Number.isFinite(months) ? months : null;
}

function normalizeItem(raw, newestPeriodMonths) {
  const id = text(raw?.id, 160);
  const name = text(raw?.name, 160);
  if (!id || !name) return null;

  const value = finiteNumber(raw.value);
  const prevValue = finiteNumber(raw.prevValue);

  let change = finiteNumber(raw.change);
  if (change === null && value !== null && prevValue !== null) {
    change = value - prevValue;
  }

  let changePct = finiteNumber(raw.changePct);
  if (changePct === null && change !== null && prevValue) {
    changePct = (change / Math.abs(prevValue)) * 100;
  }
  changePct = round2(changePct);

  const itemPeriod = periodToMonths(raw.date);
  const lagMonths =
    itemPeriod !== null && newestPeriodMonths !== null
      ? Math.max(0, newestPeriodMonths - itemPeriod)
      : null;

  return {
    id,
    name,
    category: text(raw.category, 80) ?? "Other",
    region: text(raw.region, 80),
    country: text(raw.country, 80),
    commodityCode: text(raw.commodityCode, 40),
    value: round2(value),
    prevValue: round2(prevValue),
    change: round2(change),
    changePct,
    direction: normalizeDirection(raw.direction, changePct),
    currency: text(raw.currency, 12) ?? "USD",
    unit: text(raw.unit, 40),
    priceType: text(raw.priceType, 80),
    date: text(raw.date, 20),
    lagMonths,
    // Anything older than one month behind the newest period is shown with an
    // "as of" badge so a stale quote is never mistaken for a live one.
    isStale: lagMonths !== null && lagMonths > 0,
    frequency: text(raw.frequency, 20),
    source: text(raw.source, 120),
    sourceUrl: text(raw.sourceUrl, 400),
    provider: text(raw.provider, 40),
    updatedAt: text(raw.updatedAt, 40),
  };
}

function normalizeProvider(key, raw) {
  return {
    key,
    status: text(raw?.status, 20) ?? "unknown",
    source: text(raw?.source, 120),
    sourceUrl: text(raw?.sourceUrl, 400),
    period: text(raw?.period, 20),
    frequency: text(raw?.frequency, 20),
    updatedAt: text(raw?.updatedAt, 40),
    error: text(raw?.error, 300),
  };
}

/**
 * Fetches and normalizes the global commodity feed.
 * Resolves { items, providers, generatedAt, period } or rejects with a coded
 * Error (MARKET_TIMEOUT / MARKET_UNAVAILABLE / MARKET_BAD_RESPONSE).
 */
export async function fetchMarketRates({ signal } = {}) {
  const url = marketApiUrl();
  if (!url) {
    throw codedError(
      MARKET_ERROR_CODES.MISSING_API_URL,
      "VITE_MARKET_API_URL is missing. Check your .env.local file."
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  // Lets an unmounting page cancel the request without aborting the timeout.
  const onOuterAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener("abort", onOuterAbort, { once: true });
  }

  let response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
  } catch (err) {
    if (err?.name === "AbortError") {
      throw codedError(
        MARKET_ERROR_CODES.TIMEOUT,
        "The market feed took too long to respond."
      );
    }
    throw codedError(
      MARKET_ERROR_CODES.UNAVAILABLE,
      "Could not reach the market rates service."
    );
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener("abort", onOuterAbort);
  }

  const body = await response.text();
  if (!response.ok) {
    let message = `Market service returned HTTP ${response.status}.`;
    try {
      const parsed = JSON.parse(body);
      if (parsed?.error) message = String(parsed.error).slice(0, 300);
    } catch {
      /* gateway/HTML error page — keep the default message */
    }
    throw codedError(MARKET_ERROR_CODES.UNAVAILABLE, message);
  }

  let data;
  try {
    data = JSON.parse(body);
  } catch {
    throw codedError(
      MARKET_ERROR_CODES.BAD_RESPONSE,
      "Market service returned a non-JSON response."
    );
  }

  const rawItems = Array.isArray(data?.items) ? data.items : [];
  if (rawItems.length === 0) {
    throw codedError(
      MARKET_ERROR_CODES.BAD_RESPONSE,
      data?.success === false
        ? "The market feed reported no data for this period."
        : "The market feed contained no commodities."
    );
  }

  // Two passes: find the newest quote period first, then mark lagging rows.
  let newestPeriodMonths = null;
  for (const raw of rawItems) {
    const months = periodToMonths(raw?.date);
    if (months !== null && (newestPeriodMonths === null || months > newestPeriodMonths)) {
      newestPeriodMonths = months;
    }
  }

  const items = rawItems
    .slice(0, MAX_ITEMS)
    .map((raw) => normalizeItem(raw, newestPeriodMonths))
    .filter(Boolean);

  if (items.length === 0) {
    throw codedError(
      MARKET_ERROR_CODES.BAD_RESPONSE,
      "Market feed rows could not be read."
    );
  }

  const rawProviders =
    data?.providers && typeof data.providers === "object" ? data.providers : {};
  const providers = Object.keys(rawProviders).map((key) =>
    normalizeProvider(key, rawProviders[key])
  );

  const okProviders = providers.filter((p) => p.status === "ok");
  const period =
    okProviders[0]?.period ??
    items.find((i) => i.date)?.date ??
    null;

  return {
    items,
    providers,
    period,
    generatedAt: text(data?.generatedAt, 40) ?? new Date().toISOString(),
  };
}

// -----------------------------------------------------------------------------
// Derived market analytics (pure — no I/O, safe to run on every render)
// -----------------------------------------------------------------------------

export function getMarketCategories(items) {
  const counts = new Map();
  for (const item of items) {
    counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export function computeMarketStats(items) {
  const withPct = items.filter((i) => i.changePct !== null);
  const gainers = withPct.filter((i) => i.direction === "up");
  const losers = withPct.filter((i) => i.direction === "down");
  const flat = withPct.filter((i) => i.direction === "flat");

  const avgChangePct = withPct.length
    ? round2(withPct.reduce((sum, i) => sum + i.changePct, 0) / withPct.length)
    : null;

  const byAbsPct = (a, b) => Math.abs(b.changePct ?? 0) - Math.abs(a.changePct ?? 0);
  const topGainer =
    gainers.slice().sort((a, b) => (b.changePct ?? 0) - (a.changePct ?? 0))[0] ?? null;
  const topLoser =
    losers.slice().sort((a, b) => (a.changePct ?? 0) - (b.changePct ?? 0))[0] ?? null;
  const mostVolatile = withPct.slice().sort(byAbsPct)[0] ?? null;

  const staleCount = items.filter((i) => i.isStale).length;

  // Per-category average move — drives the category performance bars.
  const categoryStats = new Map();
  for (const item of withPct) {
    const bucket = categoryStats.get(item.category) ?? {
      category: item.category,
      count: 0,
      sum: 0,
      gainers: 0,
      losers: 0,
    };
    bucket.count += 1;
    bucket.sum += item.changePct;
    if (item.direction === "up") bucket.gainers += 1;
    if (item.direction === "down") bucket.losers += 1;
    categoryStats.set(item.category, bucket);
  }

  const categories = [...categoryStats.values()]
    .map((b) => ({
      category: b.category,
      count: b.count,
      gainers: b.gainers,
      losers: b.losers,
      avgChangePct: round2(b.sum / b.count),
    }))
    .sort((a, b) => b.avgChangePct - a.avgChangePct);

  const breadth = withPct.length
    ? Math.round((gainers.length / withPct.length) * 100)
    : null;

  return {
    total: items.length,
    quoted: withPct.length,
    gainers: gainers.length,
    losers: losers.length,
    flat: flat.length,
    avgChangePct,
    breadth,
    topGainer,
    topLoser,
    mostVolatile,
    staleCount,
    categories,
  };
}

// -----------------------------------------------------------------------------
// Firestore — favorites (watchlist)
// -----------------------------------------------------------------------------

function favoritesCol(uid) {
  return collection(fdb, MARKET_COLLECTION, uid, FAVORITES_SUB);
}

function favoriteRef(uid, itemId) {
  return doc(favoritesCol(uid), marketDocId(itemId));
}

function requireUid(uid) {
  if (!uid) {
    throw codedError(
      MARKET_ERROR_CODES.NOT_AUTHENTICATED,
      "Sign in to save your marketplace data."
    );
  }
}

function normalizeStoredFavorite(snap) {
  const d = snap.data() ?? {};
  const added = d.addedAt?.toMillis ? d.addedAt.toMillis() : null;
  return {
    docId: snap.id,
    itemId: text(d.itemId, 160) ?? snap.id,
    name: text(d.name, 160) ?? "Commodity",
    category: text(d.category, 80) ?? "Other",
    unit: text(d.unit, 40),
    currency: text(d.currency, 12) ?? "USD",
    priceType: text(d.priceType, 80),
    sourceUrl: text(d.sourceUrl, 400),
    value: finiteNumber(d.value),
    prevValue: finiteNumber(d.prevValue),
    changePct: finiteNumber(d.changePct),
    direction: normalizeDirection(d.direction, finiteNumber(d.changePct)),
    note: typeof d.note === "string" ? d.note.slice(0, 500) : "",
    targetPrice: finiteNumber(d.targetPrice),
    alertAbove: finiteNumber(d.alertAbove),
    alertBelow: finiteNumber(d.alertBelow),
    alertState: [ALERT_STATES.ABOVE, ALERT_STATES.BELOW].includes(d.alertState)
      ? d.alertState
      : ALERT_STATES.IDLE,
    lastTriggeredAt: text(d.lastTriggeredAt, 40),
    addedAtMs: added,
    addedAt: text(d.addedAtISO, 40),
  };
}

/** Latest quote for each favorited id — keeps stored snapshots fresh. */
export function mergeFavoritesWithLive(favorites, items) {
  const byId = new Map(items.map((i) => [i.id, i]));
  return favorites.map((fav) => {
    const live = byId.get(fav.itemId);
    if (!live) return { ...fav, live: null };
    return {
      ...fav,
      name: live.name,
      category: live.category,
      unit: live.unit,
      currency: live.currency,
      value: live.value,
      prevValue: live.prevValue,
      changePct: live.changePct,
      direction: live.direction,
      isStale: live.isStale,
      date: live.date,
      live,
    };
  });
}

/**
 * Evaluates every favorite against the live quote and returns the alerts that
 * are currently breached (target price + above/below thresholds).
 */
export function evaluateFavoriteAlerts(mergedFavorites) {
  const alerts = [];
  for (const fav of mergedFavorites) {
    if (fav.value === null) continue;

    if (fav.alertAbove !== null && fav.value >= fav.alertAbove) {
      alerts.push({
        key: `${fav.itemId}:above`,
        favorite: fav,
        kind: "above",
        threshold: fav.alertAbove,
        message: `${fav.name} reached ${fav.value}${fav.unit ? ` ${fav.unit}` : ""} — at or above your ${fav.alertAbove} alert.`,
      });
    }
    if (fav.alertBelow !== null && fav.value <= fav.alertBelow) {
      alerts.push({
        key: `${fav.itemId}:below`,
        favorite: fav,
        kind: "below",
        threshold: fav.alertBelow,
        message: `${fav.name} fell to ${fav.value}${fav.unit ? ` ${fav.unit}` : ""} — at or below your ${fav.alertBelow} alert.`,
      });
    }
    if (fav.targetPrice !== null && fav.value <= fav.targetPrice) {
      alerts.push({
        key: `${fav.itemId}:target`,
        favorite: fav,
        kind: "target",
        threshold: fav.targetPrice,
        message: `${fav.name} is at ${fav.value} — your ${fav.targetPrice} buy target is met.`,
      });
    }
  }
  return alerts;
}

export async function getMarketFavorites(uid) {
  requireUid(uid);
  const snap = await getDocs(favoritesCol(uid));
  // Sorted client-side: ordering on addedAt would silently drop any doc
  // written before the field existed.
  return snap.docs
    .map(normalizeStoredFavorite)
    .sort((a, b) => (b.addedAtMs ?? 0) - (a.addedAtMs ?? 0) || a.name.localeCompare(b.name));
}

export async function addMarketFavorite(uid, item, extra = {}) {
  requireUid(uid);
  if (!item?.id) {
    throw codedError(MARKET_ERROR_CODES.SAVE_FAILED, "A valid commodity is required.");
  }
  const now = new Date().toISOString();
  const record = stripUndefined({
    itemId: item.id,
    name: item.name,
    category: item.category,
    unit: item.unit ?? null,
    currency: item.currency ?? "USD",
    priceType: item.priceType ?? null,
    sourceUrl: item.sourceUrl ?? null,
    value: item.value ?? null,
    prevValue: item.prevValue ?? null,
    changePct: item.changePct ?? null,
    direction: item.direction ?? "flat",
    note: typeof extra.note === "string" ? extra.note.slice(0, 500) : "",
    targetPrice: finiteNumber(extra.targetPrice),
    alertAbove: finiteNumber(extra.alertAbove),
    alertBelow: finiteNumber(extra.alertBelow),
    alertState: ALERT_STATES.IDLE,
    lastTriggeredAt: null,
    addedAtISO: now,
    addedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await setDoc(favoriteRef(uid, item.id), record);
  return normalizeStoredFavorite({ id: marketDocId(item.id), data: () => record });
}

export async function removeMarketFavorite(uid, itemId) {
  requireUid(uid);
  await deleteDoc(favoriteRef(uid, itemId));
}

export async function updateMarketFavorite(uid, itemId, patch) {
  requireUid(uid);
  const clean = stripUndefined({
    ...patch,
    note: typeof patch.note === "string" ? patch.note.slice(0, 500) : undefined,
    updatedAt: serverTimestamp(),
  });
  if (Object.keys(clean).length === 0) return null;
  await updateDoc(favoriteRef(uid, itemId), clean);
  return clean;
}

// -----------------------------------------------------------------------------
// Firestore — page preferences
// -----------------------------------------------------------------------------

export const DEFAULT_MARKET_PREFERENCES = {
  category: "all",
  relevance: "all",
  direction: "all",
  sortBy: "changePct",
  sortDir: "desc",
  view: "table",
  agriFocusOnly: false,
  autoRefreshMinutes: 0,
};

function prefsRef(uid) {
  return doc(fdb, MARKET_COLLECTION, uid, SETTINGS_SUB, PREFS_DOC);
}

export async function getMarketPreferences(uid) {
  if (!uid) return { ...DEFAULT_MARKET_PREFERENCES };
  try {
    const snap = await getDoc(prefsRef(uid));
    if (!snap.exists()) return { ...DEFAULT_MARKET_PREFERENCES };
    const d = snap.data() ?? {};
    return {
      category: text(d.category, 60) ?? DEFAULT_MARKET_PREFERENCES.category,
      relevance: text(d.relevance, 30) ?? DEFAULT_MARKET_PREFERENCES.relevance,
      direction: text(d.direction, 20) ?? DEFAULT_MARKET_PREFERENCES.direction,
      sortBy: text(d.sortBy, 30) ?? DEFAULT_MARKET_PREFERENCES.sortBy,
      sortDir: d.sortDir === "asc" ? "asc" : "desc",
      view: d.view === "cards" ? "cards" : "table",
      agriFocusOnly: Boolean(d.agriFocusOnly),
      autoRefreshMinutes: Number.isFinite(Number(d.autoRefreshMinutes))
        ? Math.min(Math.max(Math.round(Number(d.autoRefreshMinutes)), 0), 120)
        : 0,
    };
  } catch (err) {
    console.error("marketRateService: preferences read failed:", err);
    return { ...DEFAULT_MARKET_PREFERENCES };
  }
}

export async function saveMarketPreferences(uid, prefs) {
  requireUid(uid);
  const next = { ...DEFAULT_MARKET_PREFERENCES, ...prefs };
  // `search` is intentionally never persisted — it is transient UI state.
  await setDoc(
    prefsRef(uid),
    stripUndefined({ ...next, updatedAt: serverTimestamp() }),
    { merge: true }
  );
  return next;
}

// -----------------------------------------------------------------------------
// Firestore — saved AI analyses
// -----------------------------------------------------------------------------

function analysesCol(uid) {
  return collection(fdb, MARKET_COLLECTION, uid, ANALYSES_SUB);
}

function normalizeStoredAnalysis(snap) {
  const d = snap.data() ?? {};
  const created = d.createdAt?.toMillis ? d.createdAt.toMillis() : null;
  return {
    id: snap.id,
    kind: d.kind === ANALYSIS_KINDS.COMMODITY ? ANALYSIS_KINDS.COMMODITY : ANALYSIS_KINDS.MARKET,
    subjectId: text(d.subjectId, 160),
    subjectName: text(d.subjectName, 160) ?? "Global market",
    result: d.result && typeof d.result === "object" ? d.result : null,
    period: text(d.period, 20),
    stats: d.stats && typeof d.stats === "object" ? d.stats : null,
    createdAtMs: created,
    createdAtISO: text(d.createdAtISO, 40),
  };
}

export async function getMarketAnalyses(uid, max = 12) {
  if (!uid) return [];
  try {
    const snap = await getDocs(
      query(analysesCol(uid), orderBy("createdAt", "desc"), limit(max))
    );
    return snap.docs.map(normalizeStoredAnalysis);
  } catch (err) {
    console.error("marketRateService: analyses read failed:", err);
    return [];
  }
}

export async function saveMarketAnalysis(uid, { kind, subjectId, subjectName, result, period, stats }) {
  requireUid(uid);
  const now = new Date().toISOString();
  const record = stripUndefined({
    kind: kind === ANALYSIS_KINDS.COMMODITY ? ANALYSIS_KINDS.COMMODITY : ANALYSIS_KINDS.MARKET,
    subjectId: subjectId ?? null,
    subjectName: subjectName ?? "Global market",
    result: result ?? null,
    period: period ?? null,
    stats: stats ?? null,
    createdAtISO: now,
    createdAt: serverTimestamp(),
  });
  const ref = doc(analysesCol(uid));
  await setDoc(ref, record);
  return normalizeStoredAnalysis({ id: ref.id, data: () => record });
}

export async function deleteMarketAnalysis(uid, analysisId) {
  requireUid(uid);
  await deleteDoc(doc(analysesCol(uid), analysisId));
}
