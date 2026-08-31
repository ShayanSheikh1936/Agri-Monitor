// Read-only helpers for the existing crops/{uid} document structure.
// These helpers NEVER write to Firestore — they only normalize what is
// already stored, tolerating legacy key spellings found in older entries.

// Stable per-crop key for React keys and future timeline references.
// Crops currently have no stored id, so the key is derived deterministically.
export function cropKey(crop, index) {
  if (crop?.cropId) return String(crop.cropId);
  const day = (crop?.createdAt || "").slice(0, 10);
  const slug = (crop?.CropName || "crop")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");
  return `${index}_${day}_${slug}`;
}

// Index-free suffix of a derived crop key ("_<date>_<slug>"). Stays stable
// when another crop is deleted and indexes shift, so persisted timelines can
// be recovered under their old key (findCropTimeline).
export function cropKeySuffix(crop) {
  if (crop?.cropId) return null; // explicit ids always match exactly
  const day = (crop?.createdAt || "").slice(0, 10);
  const slug = (crop?.CropName || "crop")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");
  return `_${day}_${slug}`;
}

// Sowing date — tolerates both stored spellings, Firestore Timestamps,
// Date objects and "yyyy-mm-dd" strings (anchored at LOCAL midnight so the
// age never drifts by a day because of timezone offsets).
export function getSowingDate(crop) {
  const raw = crop?.SowingDate ?? crop?.Sowingdate ?? null;
  if (!raw) return null;
  // Firestore Timestamp (or anything date-like) with a toDate() helper.
  if (typeof raw?.toDate === "function") {
    const d = raw.toDate();
    return Number.isNaN(d.getTime()) ? null : d;
  }
  // "yyyy-mm-dd" from the date input — parse as local midnight.
  if (typeof raw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [y, m, d] = raw.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

// Live plant age in days — ALWAYS recomputed from the sowing date against
// the actual current day, so the dashboard shows the real age every time it
// is rendered (falls back to the stored plantAgeDays only when no sowing
// date exists at all).
export function getPlantAgeDays(crop) {
  const sowing = getSowingDate(crop);
  if (sowing) {
    const start = new Date(sowing.getFullYear(), sowing.getMonth(), sowing.getDate());
    const today = new Date();
    const nowDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return Math.max(Math.round((nowDay.getTime() - start.getTime()) / 86400000), 0);
  }
  const stored = Number(crop?.plantAgeDays);
  return Number.isFinite(stored) && stored > 0 ? stored : null;
}

export function getHealthStatus(crop) {
  return crop?.HealthStatus ?? crop?.["Crop health"] ?? null;
}

export function getAffectedPart(crop) {
  return crop?.AffectedPart ?? crop?.["Crop affected area"] ?? null;
}

export function getGpsLocation(crop) {
  const gps = crop?.gpsLocation;
  if (!gps || gps.lat == null || gps.lon == null) return null;
  return { lat: Number(gps.lat), lon: Number(gps.lon) };
}

export function formatDate(value) {
  // Tolerates Firestore Timestamps as well as Date / iso-string / epoch ms.
  if (value && typeof value.toDate === "function") value = value.toDate();
  else if (value && typeof value.toMillis === "function") value = value.toMillis();
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// Local-timezone yyyy-mm-dd for "today" / "tomorrow" window queries.
// Never hard-coded — always derived from the user's current local date.
export function localDateISO(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

// Firestore Timestamp / Date / number / iso-string -> epoch ms (or null).
export function toEpochMs(value) {
  if (!value) return null;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? null : t;
}

// Derives the timeline generation state from the stored meta doc ONLY —
// the dashboard never triggers generation itself.
//   none        → no meta, or meta without any attempt yet
//   in_progress → attempt stamped within the last 5 minutes, no result yet
//   stalled     → old attempt, no result, no stored error (treat as failed)
//   failed      → stored lastGenerationError
//   ready       → events exist
export function getGenerationState(meta, nowMs = Date.now()) {
  if (!meta) return "none";
  if (Number(meta.eventCount ?? 0) > 0) return "ready";
  if (meta.lastGenerationError) return "failed";
  const attemptMs = toEpochMs(meta.lastAttemptAt);
  if (attemptMs == null) return "none";
  return nowMs - attemptMs < 5 * 60 * 1000 ? "in_progress" : "stalled";
}

// Human labels for the stored HealthStatus values (from addnewcrop.jsx).
export const HEALTH_LABELS = {
  Healthy: "💚 Healthy",
  YellowLeaves: "🟡 Yellow Leaves",
  PestAttack: "🐛 Pest Attack",
  Dry: "🥀 Dry / Wilting",
};
