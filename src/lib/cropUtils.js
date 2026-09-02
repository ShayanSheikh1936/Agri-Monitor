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

// Any stored date shape (Firestore Timestamp, plain { seconds } object from
// a JSON round-trip, epoch seconds/ms, Date, "yyyy-mm-dd" or full ISO
// string) -> LOCAL-midnight Date, so calendar-day maths never drifts by a
// day because of timezone offsets. Invalid/missing values -> null.
function toDateOnly(value) {
  if (!value) return null;
  let v = value;
  if (typeof v.toDate === "function") v = v.toDate();
  else if (typeof v === "object" && typeof v.seconds === "number")
    v = new Date(v.seconds * 1000);
  else if (typeof v === "number")
    v = new Date(Math.abs(v) < 1e11 ? v * 1000 : v); // seconds vs ms epochs
  let d;
  if (v instanceof Date) d = v;
  else if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
    // "yyyy-mm-dd" from the date input — parse as local midnight, NOT UTC.
    const [y, m, day] = v.split("-").map(Number);
    d = new Date(y, m - 1, day);
  } else d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

// Sowing date — tolerates both stored spellings and every shape above.
export function getSowingDate(crop) {
  return toDateOnly(crop?.SowingDate ?? crop?.Sowingdate ?? null);
}

// Calendar-day difference between two date-only values (never hour/
// timestamp based). Negative when sowingDate lies in the future. Accepts an
// optional currentDate so tests can pin "today".
//   calculatePlantAgeDays("2026-08-26", "2026-09-02") -> 7
export function calculatePlantAgeDays(sowingDate, currentDate = new Date()) {
  const start = toDateOnly(sowingDate);
  const now = toDateOnly(currentDate);
  if (!start || !now) return null;
  return Math.round((now.getTime() - start.getTime()) / 86400000);
}

// Single source of truth for crop age status:
//   active     -> sown; days = calendar days since sowing (0 on sowing day)
//   notStarted -> sowing date lies in the future (daysUntil > 0)
//   unknown    -> no usable sowing date stored (never invent one)
export function getPlantAgeInfo(crop, now = new Date()) {
  const sowing = getSowingDate(crop);
  const diff = sowing ? calculatePlantAgeDays(sowing, now) : null;
  if (diff == null) return { status: "unknown", days: null, daysUntil: null };
  if (diff < 0)
    return { status: "notStarted", days: null, daysUntil: -diff };
  return { status: "active", days: diff, daysUntil: 0 };
}

// Live plant age in days — ALWAYS recomputed from SowingDate against the
// actual current local day, so every page shows the real age on every
// render. The stored plantAgeDays snapshot is NEVER read here (it freezes at
// creation time); null means "not planted yet" / "no usable sowing date"
// and callers show their own empty state.
export function getPlantAgeDays(crop, now = new Date()) {
  const info = getPlantAgeInfo(crop, now);
  return info.status === "active" ? info.days : null;
}

// Shared display label so every chip/card/row phrases age identically:
// "Day 7" | "Starts in 91 days" | null (caller renders its empty state).
export function formatPlantAge(crop, now = new Date()) {
  const info = getPlantAgeInfo(crop, now);
  if (info.status === "active") return `Day ${info.days}`;
  if (info.status === "notStarted")
    return `Starts in ${info.daysUntil} day${info.daysUntil === 1 ? "" : "s"}`;
  return null;
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
