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

// Sowing date — tolerates both stored spellings.
export function getSowingDate(crop) {
  const raw = crop?.SowingDate ?? crop?.Sowingdate ?? null;
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

// Live plant age in days (recomputed from sowing date; falls back to the
// stored plantAgeDays which is frozen at creation time).
export function getPlantAgeDays(crop) {
  const sowing = getSowingDate(crop);
  if (sowing) {
    return Math.max(Math.floor((Date.now() - sowing.getTime()) / 86400000), 0);
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
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// Human labels for the stored HealthStatus values (from addnewcrop.jsx).
export const HEALTH_LABELS = {
  Healthy: "💚 Healthy",
  YellowLeaves: "🟡 Yellow Leaves",
  PestAttack: "🐛 Pest Attack",
  Dry: "🥀 Dry / Wilting",
};
