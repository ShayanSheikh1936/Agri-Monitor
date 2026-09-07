// =============================================================================
// Agri Doctor — crop-profile helpers.
//
// A consultation is tied to AT MOST ONE crop profile. The farmer picks it while
// booking (optional) or once inside the session, and it is PERMANENTLY LOCKED
// after that — see agriDoctorService.attachCropToSession.
//
// The doctor's Firestore rules grant NO access to crops/{uid}, so the chosen
// profile is SNAPSHOTTED onto the session document here and the doctor reads
// that snapshot back. That is also why the snapshot stores plain strings and
// numbers only: no Timestamps, no nested Firestore types, nothing to convert.
//
// Selection is keyed by cropKey (cropUtils) — NEVER by array index — so
// deleting an unrelated crop can't silently re-point a consultation at another
// field. Base64 cropImage / affectedImage are deliberately EXCLUDED: they would
// push the session doc toward Firestore's 1 MB limit, and the farmer can send
// photos through the chat anyway.
// =============================================================================

import {
  cropKey,
  getSowingDate,
  formatPlantAge,
  calculatePlantAgeDays,
  formatDate,
  getHealthStatus,
  getAffectedPart,
  getGpsLocation,
  HEALTH_LABELS,
} from "@/lib/cropUtils";
import { CROP_ERRORS } from "@/services/agriDoctorService";

/** Sentinel for "no crop attached" — attaching a crop is always optional. */
export const NO_CROP = "";

// Date -> local yyyy-mm-dd. getSowingDate normalises every stored shape to a
// local-midnight Date, so this only has to format it back out.
function toISODate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${m}-${d}`;
}

// Never render an empty option label, whatever the profile is missing.
function cropLabel(crop) {
  const name = String(crop?.CropName ?? "").trim() || "Unnamed crop";
  const category = String(crop?.CropCategory ?? "").trim();
  return category && category !== name ? `${name} · ${category}` : name;
}

/**
 * The farmer's crops as picker options: [{ key, label, sublabel, crop }].
 * The array index is used ONLY to derive the stable cropKey and is deliberately
 * not exposed — nothing downstream may key off a position that shifts when an
 * unrelated crop is deleted.
 */
export function buildCropOptions(crops) {
  if (!Array.isArray(crops)) return [];
  return crops.map((crop, index) => ({
    key: cropKey(crop, index),
    label: cropLabel(crop),
    // Recomputed on every render via cropUtils, so it never freezes at the
    // value stored when the crop was registered.
    sublabel: formatPlantAge(crop) ?? (getSowingDate(crop) ? "Sown" : "No sowing date"),
    crop,
  }));
}

/** Resolves a stored cropKey back to its live option (null when gone/none). */
export function findCropOption(options, key) {
  if (!key || !Array.isArray(options)) return null;
  return options.find((o) => o.key === key) ?? null;
}

/**
 * The object persisted on the session doc as `cropSnapshot`.
 *
 * Called with the LIVE crop at selection time. Plant age is intentionally NOT
 * copied: crop.plantAgeDays is a stale creation-time snapshot, so the doctor
 * recomputes it from sowingDate instead (see cropContextRows). The stable
 * cropKey is stored separately on the session — never an array index.
 */
export function buildCropSnapshot(crop) {
  if (!crop) return null;
  const health = getHealthStatus(crop);
  return {
    cropName: String(crop?.CropName ?? "").trim() || "Unnamed crop",
    cropCategory: String(crop?.CropCategory ?? "").trim(),
    sowingDate: toISODate(getSowingDate(crop)),
    areaSize: String(crop?.AreaSize ?? "").trim(),
    areaUnit: String(crop?.AreaUnit ?? "").trim(),
    fieldCount: String(crop?.FieldCount ?? "").trim(),
    soilType: String(crop?.SoilType ?? "").trim(),
    irrigationType: String(crop?.IrrigationType ?? "").trim(),
    seedType: String(crop?.SeedType ?? "").trim(),
    healthStatus: health || "",
    healthLabel: HEALTH_LABELS[health] ?? health ?? "",
    affectedPart: getAffectedPart(crop) || "",
    gps: getGpsLocation(crop),
    capturedAtMs: Date.now(),
  };
}

// Live "Day 42" from the snapshot's date-only sowing string. calculatePlantAgeDays
// parses "yyyy-mm-dd" as LOCAL midnight, so this never drifts by a timezone.
function livePlantAge(sowingISO) {
  if (!sowingISO) return "";
  const days = calculatePlantAgeDays(sowingISO);
  if (days == null) return "";
  if (days < 0) return `Sowing in ${-days} day${days === -1 ? "" : "s"}`;
  return `Day ${days}`;
}

function formatGps(gps) {
  if (!gps || gps.lat == null || gps.lon == null) return "";
  return `${Number(gps.lat).toFixed(4)}, ${Number(gps.lon).toFixed(4)}`;
}

/**
 * Rows for the doctor's crop-context panel: [{ label, value }].
 *
 * Empty values are dropped, so a sparse profile never renders a wall of blanks.
 * Everything comes from the snapshot — this performs no Firestore read, which
 * matters because the doctor is not allowed to read crops/{uid} at all.
 */
export function cropContextRows(snapshot) {
  if (!snapshot) return [];
  const area = snapshot.areaSize
    ? `${snapshot.areaSize}${snapshot.areaUnit ? ` ${snapshot.areaUnit}` : ""}`
    : "";
  const rows = [
    { label: "Crop", value: snapshot.cropName },
    { label: "Category", value: snapshot.cropCategory },
    { label: "Plant age", value: livePlantAge(snapshot.sowingDate) },
    { label: "Sowing date", value: snapshot.sowingDate ? formatDate(snapshot.sowingDate) ?? snapshot.sowingDate : "" },
    { label: "Area", value: area },
    { label: "Fields", value: snapshot.fieldCount },
    { label: "Soil type", value: snapshot.soilType },
    { label: "Irrigation", value: snapshot.irrigationType },
    { label: "Seed type", value: snapshot.seedType },
    { label: "Health", value: snapshot.healthLabel || snapshot.healthStatus },
    { label: "Affected part", value: snapshot.affectedPart },
    { label: "GPS", value: formatGps(snapshot.gps) },
  ];
  return rows.filter((r) => typeof r.value === "string" && r.value.trim() !== "");
}

/**
 * Best available display name for an attached crop. Prefers the immutable
 * snapshot (what the doctor saw), then falls back to the live profile so a
 * renamed crop still shows something sensible on the farmer's side.
 */
export function cropDisplayName(session, options) {
  const snapName = String(session?.cropSnapshot?.cropName ?? "").trim();
  if (snapName) return snapName;
  return findCropOption(options, session?.cropKey)?.label ?? "Selected crop";
}

// Friendly copy for the typed crop-lock failures, mirroring describeBookingError.
const CROP_ERROR_COPY = {
  [CROP_ERRORS.ALREADY_LOCKED]: {
    title: "Crop already locked",
    description: "This consultation is already tied to a crop and cannot be changed.",
  },
  [CROP_ERRORS.NOT_FOUND]: {
    title: "Consultation not found",
    description: "That consultation no longer exists. Please go back and try again.",
  },
  [CROP_ERRORS.INVALID]: {
    title: "Could not attach crop",
    description: "Please pick a crop profile and try again.",
  },
};

export function describeCropError(err) {
  const code = err?.code ?? CROP_ERRORS.INVALID;
  return (
    CROP_ERROR_COPY[code] ?? {
      title: "Could not attach crop",
      description: err?.message ?? "Please try again.",
    }
  );
}
