// =============================================================================
// Disaster alert service — the ONLY place disaster data access lives.
//
// DESIGN:
//  - UI components never fetch or shape data themselves; they call this
//    service through useDisasterAlerts (same contract as weatherService).
//  - When VITE_DISASTER_API_URL is configured, the service consumes the real
//    API and normalizes its payload into the internal alert shape. When it is
//    NOT configured, a time-consistent mock feed is served — the UI behaves
//    identically either way.
//  - Preferences persist to localStorage for now; swap `prefsStorage` for a
//    Firestore document later without touching any component.
// =============================================================================

import {
  MOCK_DISASTER_REGIONS,
  buildMockDisasterFeed,
} from "../data/mockDisasterAlerts.js";

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

export const DISASTER_ERROR_CODES = {
  UNAVAILABLE: "DISASTER_UNAVAILABLE",
  TIMEOUT: "DISASTER_TIMEOUT",
  BAD_RESPONSE: "DISASTER_BAD_RESPONSE",
};

export const DISASTER_SEVERITIES = ["critical", "high", "medium", "low"];
export const DISASTER_STATUSES = ["active", "watch", "advisory", "resolved"];

const FETCH_TIMEOUT_MS = 10_000;
const MOCK_LATENCY_MS = 650;
const PREFS_STORAGE_KEY = "agrimonitor.disasterAlertPreferences";

// -----------------------------------------------------------------------------
// Regions (location selector)
// -----------------------------------------------------------------------------

export function getDisasterRegions() {
  // A real API would serve these; the mock list has the same shape.
  return MOCK_DISASTER_REGIONS;
}

// -----------------------------------------------------------------------------
// Feed fetch — real API when configured, mock otherwise
// -----------------------------------------------------------------------------

function apiUrl() {
  const url = import.meta.env.VITE_DISASTER_API_URL;
  return typeof url === "string" && url.trim() ? url.trim() : null;
}

/**
 * Maps a real-API alert record onto the internal shape used across the page.
 * Field names here are the contract with the future provider — adjust this
 * single function when integrating a specific disaster/weather API.
 */
export function normalizeApiAlert(raw, regionId) {
  const toMs = (v) => {
    if (v == null) return null;
    if (typeof v === "number") return v;
    const t = new Date(v).getTime();
    return Number.isNaN(t) ? null : t;
  };
  return {
    id: String(raw.id ?? raw.eventId ?? raw.uuid ?? Math.random().toString(36).slice(2)),
    type: String(raw.type ?? raw.eventType ?? "severe_weather").toLowerCase(),
    name: raw.name ?? raw.title ?? raw.headline ?? "Disaster alert",
    regionId,
    location: raw.location ?? raw.area ?? raw.regionName ?? "Affected region",
    coordinates:
      raw.coordinates ??
      (raw.lat != null && (raw.lon ?? raw.lng) != null
        ? { lat: Number(raw.lat), lon: Number(raw.lon ?? raw.lng) }
        : null),
    severity: DISASTER_SEVERITIES.includes(raw.severity) ? raw.severity : "medium",
    status: DISASTER_STATUSES.includes(raw.status) ? raw.status : "active",
    riskLevel: raw.riskLevel ?? "moderate",
    issuedAt: toMs(raw.issuedAt ?? raw.createdAt),
    startsAt: toMs(raw.startsAt ?? raw.startTime),
    endsAt: toMs(raw.endsAt ?? raw.endTime),
    expectedDuration: raw.expectedDuration ?? raw.duration ?? null,
    affectedRadiusKm: raw.affectedRadiusKm ?? raw.radiusKm ?? null,
    agriculturalRisk: raw.agriculturalRisk ?? raw.summary ?? "",
    description: raw.description ?? raw.summary ?? "",
    impact: raw.impact ?? null,
    source: raw.source ?? raw.provider ?? "External feed",
  };
}

async function fetchRealFeed(regionId) {
  const base = apiUrl();
  const url = `${base.replace(/\/$/, "")}/disaster-alerts?region=${encodeURIComponent(regionId)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(url, { signal: controller.signal });
  } catch {
    clearTimeout(timer);
    const err = new Error("Disaster feed request failed.");
    err.code = controller.signal.aborted
      ? DISASTER_ERROR_CODES.TIMEOUT
      : DISASTER_ERROR_CODES.UNAVAILABLE;
    throw err;
  }
  clearTimeout(timer);

  if (!response.ok) {
    const err = new Error(`Disaster feed responded with ${response.status}.`);
    err.code = DISASTER_ERROR_CODES.BAD_RESPONSE;
    throw err;
  }

  const payload = await response.json();
  return {
    alerts: (payload.alerts ?? payload.data ?? []).map((raw) =>
      normalizeApiAlert(raw, regionId)
    ),
    history: (payload.history ?? []).map((raw) => ({
      ...normalizeApiAlert(raw, regionId),
      status: "resolved",
      impactSummary: raw.impactSummary ?? raw.summary ?? "",
    })),
    generatedAt: Date.now(),
  };
}

/**
 * Loads the disaster feed for one region.
 * Returns { region, alerts, history, generatedAt }.
 * Throws with a `code` from DISASTER_ERROR_CODES on failure.
 */
export async function fetchDisasterFeed({ regionId }) {
  const region = getDisasterRegions().find((r) => r.id === regionId) ?? null;
  if (!region) {
    const err = new Error(`Unknown disaster region: ${regionId}`);
    err.code = DISASTER_ERROR_CODES.BAD_RESPONSE;
    throw err;
  }

  if (apiUrl()) {
    const feed = await fetchRealFeed(regionId);
    return { region, ...feed };
  }

  // Mock path — small latency so skeleton/loading states behave realistically.
  await new Promise((resolve) => setTimeout(resolve, MOCK_LATENCY_MS));
  const feed = buildMockDisasterFeed(regionId);
  return { region, ...feed };
}

// -----------------------------------------------------------------------------
// Alert preferences — localStorage today, Firestore-swappable later
// -----------------------------------------------------------------------------

export const DEFAULT_DISASTER_PREFERENCES = {
  regionId: MOCK_DISASTER_REGIONS[0].id,
  disasterTypes: [
    "flood",
    "drought",
    "heavy_rain",
    "cyclone",
    "heatwave",
    "frost",
    "hailstorm",
    "wildfire",
    "earthquake",
  ],
  minSeverity: "low",
  notifications: {
    inApp: true,
    email: false,
    sms: false,
  },
};

const prefsStorage = {
  read() {
    try {
      const raw = window.localStorage.getItem(PREFS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  write(prefs) {
    try {
      window.localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      // Storage unavailable (private mode etc.) — prefs stay session-only.
    }
  },
};

/** Returns saved preferences merged over the defaults. */
export function getDisasterPreferences() {
  const saved = prefsStorage.read();
  if (!saved || typeof saved !== "object") {
    return { ...DEFAULT_DISASTER_PREFERENCES };
  }
  return {
    ...DEFAULT_DISASTER_PREFERENCES,
    ...saved,
    notifications: {
      ...DEFAULT_DISASTER_PREFERENCES.notifications,
      ...(saved.notifications ?? {}),
    },
    disasterTypes: Array.isArray(saved.disasterTypes)
      ? saved.disasterTypes
      : DEFAULT_DISASTER_PREFERENCES.disasterTypes,
  };
}

/** Persists preferences. Returns the saved object. */
export function saveDisasterPreferences(prefs) {
  const merged = {
    ...DEFAULT_DISASTER_PREFERENCES,
    ...prefs,
    notifications: {
      ...DEFAULT_DISASTER_PREFERENCES.notifications,
      ...(prefs?.notifications ?? {}),
    },
  };
  prefsStorage.write(merged);
  return merged;
}
