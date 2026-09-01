// =============================================================================
// Timeline data layer — Firestore service for the personalized crop timeline.
//
// DESIGN DECISIONS (from project inspection):
//  - One NEW top-level collection: `timelineData`, rooted at the auth UID so
//    ownership is enforced by path: timelineData/{uid}/crops/{cropId}/...
//  - The existing `users/{uid}` and `crops/{uid}` collections are NEVER
//    written to here. Crop profile data is REUSED read-only from the
//    existing crop entries via buildCropProfile().
//  - No fake data: metadata docs start empty; events are only written by
//    callers (AI generation phase comes later).
//  - All queries are bounded (limit / orderBy / cursors) so the dashboard
//    never downloads full history.
// =============================================================================

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  startAfter,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { fdb } from "../features/auth/firebase.js";
import { getSowingDate, getHealthStatus } from "../lib/cropUtils.js";

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

export const TIMELINE_COLLECTIONS = {
  root: "timelineData",
  crops: "crops",
  events: "events",
  activities: "activities",
  observations: "observations",
  analyses: "analyses",
  images: "images",
  reviews: "reviews",
};

export const EVENT_STATUSES = [
  "upcoming",
  "today",
  "completed",
  "skipped",
  "postponed",
  "needs_attention",
];

export const EVENT_PRIORITIES = ["low", "medium", "high", "critical"];

export const TIMELINE_STATUS = {
  DRAFT: "draft",
  ACTIVE: "active",
  OUTDATED: "outdated",
};

export const TIMELINE_SOURCE = {
  AI: "ai",
  MANUAL: "manual",
};

export const IMAGE_PURPOSES = ["crop", "affected", "analysis", "progress"];

// Historical event states that an AI timeline review may NEVER modify.
export const PROTECTED_EVENT_STATUSES = ["completed", "skipped"];

// What can cause an intelligent timeline review.
export const REVIEW_TRIGGERS = [
  "activity",
  "image_analysis",
  "observation",
  "condition_change",
  "weather",
  "profile_change",
  "manual",
];

// Activity types meaningful enough to trigger a timeline review.
export const REVIEW_TRIGGERING_ACTIVITIES = [
  "planting",
  "irrigation",
  "fertilizer",
  "pesticide",
  "pest_observation",
  "disease_observation",
  "harvesting",
];

// User-loggable field activities (crop activity tracking).
export const ACTIVITY_TYPES = [
  "planting",
  "irrigation",
  "fertilizer",
  "pesticide",
  "weeding",
  "pruning",
  "pest_observation",
  "disease_observation",
  "harvesting",
  "other",
];

// Safety caps
const MAX_BATCH_OPS = 450; // Firestore batch limit is 500; keep headroom
const MAX_IMAGE_BASE64_CHARS = 500_000; // ~375KB — protects the 1MiB doc limit
const MAX_ACTIVITY_TEXT = 500;
const MAX_QUANTITY_UNIT = 100;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// -----------------------------------------------------------------------------
// Path helpers — every path is scoped under the authenticated user's UID
// -----------------------------------------------------------------------------

export function timelineRootRef(uid) {
  return doc(fdb, TIMELINE_COLLECTIONS.root, uid);
}

export function cropTimelineRef(uid, cropId) {
  return doc(
    fdb,
    TIMELINE_COLLECTIONS.root,
    uid,
    TIMELINE_COLLECTIONS.crops,
    cropId
  );
}

export function eventsCollectionRef(uid, cropId) {
  return collection(cropTimelineRef(uid, cropId), TIMELINE_COLLECTIONS.events);
}

export function activitiesCollectionRef(uid, cropId) {
  return collection(
    cropTimelineRef(uid, cropId),
    TIMELINE_COLLECTIONS.activities
  );
}

export function observationsCollectionRef(uid, cropId) {
  return collection(
    cropTimelineRef(uid, cropId),
    TIMELINE_COLLECTIONS.observations
  );
}

export function analysesCollectionRef(uid, cropId) {
  return collection(
    cropTimelineRef(uid, cropId),
    TIMELINE_COLLECTIONS.analyses
  );
}

export function imagesCollectionRef(uid, cropId) {
  return collection(cropTimelineRef(uid, cropId), TIMELINE_COLLECTIONS.images);
}

export function reviewsCollectionRef(uid, cropId) {
  return collection(cropTimelineRef(uid, cropId), TIMELINE_COLLECTIONS.reviews);
}

// -----------------------------------------------------------------------------
// Small internal helpers
// -----------------------------------------------------------------------------

function assertUid(uid) {
  if (!uid || typeof uid !== "string") {
    throw new Error("timelineService: an authenticated uid is required.");
  }
}

function assertCropId(cropId) {
  if (!cropId || typeof cropId !== "string") {
    throw new Error("timelineService: a cropId is required.");
  }
}

export function assertEventStatus(status) {
  if (!EVENT_STATUSES.includes(status)) {
    throw new Error(
      `timelineService: invalid event status "${status}". Allowed: ${EVENT_STATUSES.join(", ")}`
    );
  }
}

// Firestore rejects `undefined` values — strip them recursively.
function stripUndefined(value) {
  if (Array.isArray(value)) {
    return value.map(stripUndefined);
  }
  if (value && typeof value === "object" && !(value instanceof Date)) {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (v !== undefined) out[k] = stripUndefined(v);
    }
    return out;
  }
  return value;
}

// Local-timezone date string "yyyy-mm-dd" (timeline dates are field-local).
export function toDateString(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// -----------------------------------------------------------------------------
// Timeline metadata (one doc per crop: summary fields for cheap header reads)
// -----------------------------------------------------------------------------

/**
 * Reads the timeline metadata doc. Returns null when no timeline exists yet.
 * This is the ONLY read the dashboard header needs — no events fetched.
 */
export async function getTimeline(uid, cropId) {
  assertUid(uid);
  assertCropId(cropId);
  const snap = await getDoc(cropTimelineRef(uid, cropId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/**
 * Resolves a crop's timeline even after an index shift (deleting another
 * crop re-keys the remaining crops). Fast path: one read of the exact key.
 * Orphan recovery: one bounded listing of this user's timeline metas (one
 * small doc per crop) matched by the stable date+name suffix.
 * Returns { cropId, meta } or null.
 */
export async function findCropTimeline(uid, exactKey, fallbackSuffix = null) {
  assertUid(uid);
  if (exactKey) {
    const meta = await getTimeline(uid, exactKey);
    if (meta) return { cropId: exactKey, meta };
  }
  if (!fallbackSuffix) return null;
  const snap = await getDocs(collection(timelineRootRef(uid), TIMELINE_COLLECTIONS.crops));
  for (const d of snap.docs) {
    if (d.id.endsWith(fallbackSuffix)) {
      return { cropId: d.id, meta: { id: d.id, ...d.data() } };
    }
  }
  return null;
}

/**
 * Creates the metadata doc for a crop if it does not exist yet.
 * Idempotent — never overwrites an existing timeline, never touches the
 * existing `crops` collection. Stores only timeline-specific extended
 * profile fields; base profile fields are always read live from the crop.
 */
export async function initTimeline(uid, cropId, meta = {}) {
  assertUid(uid);
  assertCropId(cropId);

  const ref = cropTimelineRef(uid, cropId);
  const existing = await getDoc(ref);
  if (existing.exists()) {
    return { id: ref.id, ...existing.data(), created: false };
  }

  const now = serverTimestamp();
  const data = stripUndefined({
    uid,
    cropId,
    status: TIMELINE_STATUS.DRAFT,
    generatedBy: null,
    version: 0,
    eventCount: 0,
    completedCount: 0,
    currentStage: null,
    nextEventDate: null,
    lastGeneratedAt: null,
    sowingDate: meta.sowingDate ?? null,
    // Extended profile fields NOT stored on the existing crop entry.
    profile: {
      soilTestInfo: meta.soilTestInfo ?? null,
      waterAvailability: meta.waterAvailability ?? null,
      farmingMethod: meta.farmingMethod ?? null,
      currentCondition: meta.currentCondition ?? null,
    },
    createdAt: now,
    updatedAt: now,
  });

  await setDoc(ref, data);
  return { id: cropId, ...data, created: true };
}

/**
 * Partial update of timeline metadata (status, summary counters, etc.).
 */
export async function updateTimelineMeta(uid, cropId, patch) {
  assertUid(uid);
  assertCropId(cropId);
  await updateDoc(cropTimelineRef(uid, cropId), {
    ...stripUndefined(patch),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Stamps an attempt start so dashboards can show "generation in progress"
 * without ever triggering generation themselves. Call only after initTimeline.
 */
export async function markGenerationAttempt(uid, cropId) {
  assertUid(uid);
  assertCropId(cropId);
  await updateDoc(cropTimelineRef(uid, cropId), {
    lastAttemptAt: serverTimestamp(),
  });
}

/**
 * Stamps the review start IMMEDIATELY (not at completion) so two
 * near-simultaneous triggers — e.g. an activity log followed by an image
 * analysis — hit the cooldown instead of firing two parallel AI calls.
 */
export async function markReviewStart(uid, cropId) {
  assertUid(uid);
  assertCropId(cropId);
  await updateDoc(cropTimelineRef(uid, cropId), {
    lastReviewAt: serverTimestamp(),
  });
}

/**
 * Timeline-only extended profile fields. Base crop profile data stays in the
 * existing crops collection and is merged at read time by buildCropProfile().
 */
export async function updateExtendedProfile(
  uid,
  cropId,
  { soilTestInfo, waterAvailability, farmingMethod, currentCondition }
) {
  assertUid(uid);
  assertCropId(cropId);
  const patch = {};
  if (soilTestInfo !== undefined) patch["profile.soilTestInfo"] = soilTestInfo;
  if (waterAvailability !== undefined)
    patch["profile.waterAvailability"] = waterAvailability;
  if (farmingMethod !== undefined) patch["profile.farmingMethod"] = farmingMethod;
  if (currentCondition !== undefined)
    patch["profile.currentCondition"] = currentCondition;
  patch.updatedAt = serverTimestamp();
  await updateDoc(cropTimelineRef(uid, cropId), patch);
}

/**
 * Composes the full crop profile WITHOUT duplicating data:
 * base fields come from the existing crop entry (crops/{uid}.crops[i]),
 * extended fields come from the timeline metadata doc.
 */
export function buildCropProfile(cropEntry, timelineMeta) {
  const sowing = getSowingDate(cropEntry);
  const extended = timelineMeta?.profile ?? {};
  return {
    name: cropEntry?.CropName ?? null,
    category: cropEntry?.CropCategory ?? null,
    varietySeedType: cropEntry?.SeedType ?? null,
    sowingDate: sowing ? toDateString(sowing) : null,
    location: cropEntry?.gpsLocation ?? null,
    soil: cropEntry?.SoilType ?? null,
    soilTestInfo: extended.soilTestInfo ?? null,
    irrigation: cropEntry?.IrrigationType ?? null,
    waterAvailability: extended.waterAvailability ?? null,
    landArea: cropEntry?.AreaSize
      ? `${cropEntry.AreaSize} ${cropEntry.AreaUnit ?? ""}`.trim()
      : null,
    fieldCount: cropEntry?.FieldCount ?? null,
    farmingMethod: extended.farmingMethod ?? null,
    currentCondition: getHealthStatus(cropEntry) ?? extended.currentCondition ?? null,
  };
}

// -----------------------------------------------------------------------------
// Timeline events
// -----------------------------------------------------------------------------

function normalizeEvent(cropId, event) {
  assertEventStatus(event.status ?? "upcoming");
  const tasks = Array.isArray(event.tasks)
    ? event.tasks.map((t) =>
        typeof t === "string" ? { title: t, done: false } : { ...t }
      )
    : [];

  return stripUndefined({
    cropId,
    date: event.date ?? null,
    dayNumber: Number(event.dayNumber ?? 0),
    stage: event.stage ?? null,
    title: event.title ?? "",
    description: event.description ?? "",
    tasks,
    irrigationGuidance: event.irrigationGuidance ?? null,
    soilGuidance: event.soilGuidance ?? null,
    nutritionGuidance: event.nutritionGuidance ?? null,
    pestMonitoring: event.pestMonitoring ?? null,
    diseaseMonitoring: event.diseaseMonitoring ?? null,
    priority: EVENT_PRIORITIES.includes(event.priority)
      ? event.priority
      : "medium",
    status: event.status ?? "upcoming",
    isEstimated: Boolean(event.isEstimated),
    aiGenerated: Boolean(event.aiGenerated),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Writes timeline events in batches.
 * With { replace: true } existing events are removed first (used when the AI
 * regenerates a timeline). Batching keeps writes atomic per chunk and below
 * Firestore's 500-op batch limit.
 */
export async function writeTimelineEvents(uid, cropId, events, { replace = false, allowDestroyHistory = false } = {}) {
  assertUid(uid);
  assertCropId(cropId);
  if (!Array.isArray(events)) {
    throw new Error("timelineService: events must be an array.");
  }

  if (replace) {
    // History guard: never wipe completed/skipped events unless explicitly
    // allowed. Regeneration targets empty timelines; reviews are surgical.
    if (!allowDestroyHistory) {
      const [{ events: done }, { events: skippedEv }] = await Promise.all([
        getTimelineEvents(uid, cropId, { status: "completed", limitTo: 1 }),
        getTimelineEvents(uid, cropId, { status: "skipped", limitTo: 1 }),
      ]);
      if (done.length > 0 || skippedEv.length > 0) {
        throw new Error(
          "timelineService: refusing to replace a timeline with completed history."
        );
      }
    }
    await deleteAllEvents(uid, cropId);
  }

  const normalized = events.map((e) => normalizeEvent(cropId, e));

  for (let i = 0; i < normalized.length; i += MAX_BATCH_OPS) {
    const chunk = normalized.slice(i, i + MAX_BATCH_OPS);
    const batch = writeBatch(fdb);
    chunk.forEach((event) => {
      batch.set(doc(eventsCollectionRef(uid, cropId)), event);
    });
    await batch.commit();
  }

  await updateTimelineMeta(uid, cropId, {
    eventCount: normalized.length,
    completedCount: 0,
    nextEventDate:
      normalized
        .map((e) => e.date)
        .filter(Boolean)
        .sort()[0] ?? null,
  });

  return { written: normalized.length };
}

/** Removes every event for one crop only. Never touches other crops/users. */
export async function deleteAllEvents(uid, cropId) {
  assertUid(uid);
  assertCropId(cropId);
  const snap = await getDocs(eventsCollectionRef(uid, cropId));
  if (snap.empty) return { deleted: 0 };

  const docs = snap.docs;
  for (let i = 0; i < docs.length; i += MAX_BATCH_OPS) {
    const batch = writeBatch(fdb);
    docs.slice(i, i + MAX_BATCH_OPS).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
  return { deleted: docs.length };
}

/**
 * Bounded, ordered event reads.
 * Options:
 *   startDate/endDate — "yyyy-mm-dd" window (both optional)
 *   status            — filter by one of EVENT_STATUSES
 *   limitTo           — page size (default 30)
 *   cursor            — pass `nextCursor` from a previous call to paginate
 * Returns { events, nextCursor } — nextCursor is null when exhausted.
 *
 * INDEX-FREE BY DESIGN: queries never combine filters/ordering across
 * different fields, so no composite Firestore indexes are required.
 * Ordering ties are resolved client-side by dayNumber.
 */
export async function getTimelineEvents(
  uid,
  cropId,
  { startDate, endDate, status, limitTo = 30, cursor = null } = {}
) {
  assertUid(uid);
  assertCropId(cropId);

  const constraints = [];
  let clientDateFilter = null;

  if (status) {
    // Equality-only filter on one field — single-field index suffices.
    assertEventStatus(status);
    constraints.push(where("status", "==", status));
    if (startDate || endDate) clientDateFilter = { startDate, endDate };
  } else {
    // Range filter + ordering on the SAME field — single-field index suffices.
    if (startDate) constraints.push(where("date", ">=", startDate));
    if (endDate) constraints.push(where("date", "<=", endDate));
    constraints.push(orderBy("date", "asc"));
    if (cursor) constraints.push(startAfter(cursor));
  }
  constraints.push(limit(limitTo));

  const snap = await getDocs(
    query(eventsCollectionRef(uid, cropId), ...constraints)
  );
  let events = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  if (clientDateFilter) {
    events = events.filter(
      (e) =>
        (!clientDateFilter.startDate || (e.date ?? "") >= clientDateFilter.startDate) &&
        (!clientDateFilter.endDate || (e.date ?? "") <= clientDateFilter.endDate)
    );
  }
  events.sort(
    (a, b) =>
      (a.date ?? "").localeCompare(b.date ?? "") ||
      (a.dayNumber ?? 0) - (b.dayNumber ?? 0)
  );

  return {
    events,
    nextCursor:
      !status && snap.docs.length === limitTo
        ? snap.docs[snap.docs.length - 1]
        : null,
  };
}

/** Only events dated today — the dashboard's "Today" panel. */
export async function getTodayEvents(uid, cropId) {
  const today = toDateString();
  const { events } = await getTimelineEvents(uid, cropId, {
    startDate: today,
    endDate: today,
    limitTo: 20,
  });
  return events;
}

/** Next N events from today onward — the "Upcoming" panel. Date-window query
 *  (not status-based) so events an AI review moved to needs_attention /
 *  postponed / today remain visible instead of disappearing. */
export async function getUpcomingEvents(uid, cropId, count = 7) {
  const today = toDateString();
  const { events } = await getTimelineEvents(uid, cropId, {
    startDate: today,
    limitTo: Math.max(count * 2, 14),
  });
  return events.slice(0, count);
}

/**
 * Transitions an event's status (one of EVENT_STATUSES) and keeps the
 * metadata summary counters in sync in a single atomic batch.
 */
export async function updateEventStatus(uid, cropId, eventId, status) {
  assertUid(uid);
  assertCropId(cropId);
  assertEventStatus(status);

  const eventRef = doc(eventsCollectionRef(uid, cropId), eventId);
  const snap = await getDoc(eventRef);
  if (!snap.exists()) {
    throw new Error("timelineService: event not found.");
  }

  const previous = snap.data().status;
  const delta =
    (status === "completed" ? 1 : 0) - (previous === "completed" ? 1 : 0);

  const batch = writeBatch(fdb);
  batch.update(eventRef, { status, updatedAt: serverTimestamp() });
  if (delta !== 0) {
    const metaRef = cropTimelineRef(uid, cropId);
    const metaSnap = await getDoc(metaRef);
    const current = metaSnap.exists()
      ? Number(metaSnap.data().completedCount ?? 0)
      : 0;
    batch.update(metaRef, {
      completedCount: Math.max(current + delta, 0),
      updatedAt: serverTimestamp(),
    });
  }
  await batch.commit();
  return { eventId, status };
}

// -----------------------------------------------------------------------------
// Intelligent timeline reviews — surgical updates only.
// Completed/skipped events are NEVER modified; every applied change keeps a
// before/after audit trail on the event itself plus a review record.
// -----------------------------------------------------------------------------

const MAX_EVENT_HISTORY = 10;
const MAX_REVIEW_TASKS_TOTAL = 12;

/**
 * Today's and future events (candidates the AI may update) plus the most
 * recent completed events (context only — immutable). Bounded reads.
 */
export async function getEventsForReview(uid, cropId) {
  const today = toDateString();
  const [{ events: upcoming }, { events: completed }] = await Promise.all([
    getTimelineEvents(uid, cropId, { startDate: today, limitTo: 40 }),
    getTimelineEvents(uid, cropId, { status: "completed", limitTo: 20 }),
  ]);
  const recentCompleted = completed
    .filter((e) => e.date)
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
    .slice(0, 5);
  return { upcoming, recentCompleted };
}

/**
 * Updates ONE non-protected event and records what/why/when on the event
 * itself (`history`). Returns { applied, reason } instead of throwing for
 * missing/protected targets so reviews stay non-fatal per event.
 */
export async function updateEventWithAudit(uid, cropId, eventId, patch, audit = {}) {
  assertUid(uid);
  assertCropId(cropId);
  if (!eventId) return { applied: false, reason: "missing" };

  const ref = doc(eventsCollectionRef(uid, cropId), eventId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return { applied: false, reason: "missing" };

  const current = snap.data();
  if (PROTECTED_EVENT_STATUSES.includes(current.status)) {
    return { applied: false, reason: "protected" };
  }

  const { addTasks, ...fields } = patch ?? {};
  const clean = stripUndefined(fields);

  // Only record fields that actually change.
  const changes = {};
  const write = {};
  for (const [k, v] of Object.entries(clean)) {
    if (JSON.stringify(current[k] ?? null) !== JSON.stringify(v)) {
      changes[k] = { from: current[k] ?? null, to: v };
      write[k] = v;
    }
  }

  // Appended tasks (never removes existing task state).
  let tasksWritten = false;
  if (Array.isArray(addTasks) && addTasks.length > 0) {
    const extra = addTasks
      .filter((t) => typeof t === "string" && t.trim())
      .map((t) => ({ title: t.trim(), done: false }));
    if (extra.length > 0) {
      const tasks = [...(current.tasks ?? []), ...extra].slice(-MAX_REVIEW_TASKS_TOTAL);
      write.tasks = tasks;
      changes.tasks = { from: current.tasks ?? [], to: tasks };
      tasksWritten = true;
    }
  }

  if (Object.keys(write).length === 0) {
    return { applied: false, reason: "no_change" };
  }

  // Audit entry: what changed, why, when, and what caused it.
  const entry = stripUndefined({
    at: serverTimestamp(),
    trigger: audit.trigger ?? "manual",
    reason: audit.reason ? String(audit.reason).slice(0, 300) : null,
    causedBy: audit.causedBy ?? null, // activity / analysis / image record id
    changes,
  });
  const history = [...(current.history ?? []), entry].slice(-MAX_EVENT_HISTORY);

  await updateDoc(ref, { ...write, history, updatedAt: serverTimestamp() });
  return { applied: true, reason: null, changedFields: Object.keys(changes), tasksWritten };
}

/**
 * Applies a validated AI review: updates only the listed future events,
 * adds approved new events, and writes one review record for auditability.
 * `review` = { trigger, causedBy, reason, confidence, changesNeeded,
 *              newObservation, recommendedFollowUp, updates, additions }.
 */
export async function applyTimelineReview(uid, cropId, review) {
  assertUid(uid);
  assertCropId(cropId);

  const trigger = REVIEW_TRIGGERS.includes(review.trigger)
    ? review.trigger
    : "manual";

  const updatedEventIds = [];
  const skippedEventIds = [];
  for (const u of review.updates ?? []) {
    const res = await updateEventWithAudit(uid, cropId, u.id, u.patch, {
      trigger,
      reason: u.reason ?? review.reason,
      causedBy: review.causedBy ?? null,
    });
    if (res.applied) updatedEventIds.push(u.id);
    else skippedEventIds.push({ id: u.id, reason: res.reason });
  }

  const addedEventIds = [];
  for (const e of review.additions ?? []) {
    const data = {
      ...normalizeEvent(cropId, e),
      source: "ai_review",
      reviewReason: review.reason ? String(review.reason).slice(0, 300) : null,
    };
    const ref = await addDoc(eventsCollectionRef(uid, cropId), data);
    addedEventIds.push(ref.id);
  }

  // One review record per review — the durable "why did the timeline change".
  const reviewRef = await addDoc(
    reviewsCollectionRef(uid, cropId),
    stripUndefined({
      cropId,
      trigger,
      causedBy: review.causedBy ?? null,
      changesNeeded: Boolean(review.changesNeeded),
      reason: review.reason ? String(review.reason).slice(0, 500) : null,
      confidence:
        typeof review.confidence === "number" ? review.confidence : null,
      newObservation: review.newObservation ?? null,
      recommendedFollowUp: review.recommendedFollowUp ?? null,
      updatedEventIds,
      addedEventIds,
      skippedEventIds,
      createdBy: uid,
      createdAt: serverTimestamp(),
    })
  );

  // Meta summary — cheap header state, no event reads needed.
  const metaSnap = await getDoc(cropTimelineRef(uid, cropId));
  const meta = metaSnap.exists() ? metaSnap.data() : {};
  await updateDoc(cropTimelineRef(uid, cropId), {
    lastReviewAt: serverTimestamp(),
    lastReviewReason: review.reason ? String(review.reason).slice(0, 200) : null,
    reviewCount: Number(meta.reviewCount ?? 0) + 1,
    eventCount: Number(meta.eventCount ?? 0) + addedEventIds.length,
    updatedAt: serverTimestamp(),
  });

  return {
    reviewId: reviewRef.id,
    updated: updatedEventIds.length,
    added: addedEventIds.length,
    skipped: skippedEventIds.length,
    updatedEventIds,
    addedEventIds,
    skippedEventIds,
  };
}

/** Bounded recent review records (audit trail reads). */
export async function getRecentReviews(uid, cropId, count = 3) {
  assertUid(uid);
  assertCropId(cropId);
  const q = query(
    reviewsCollectionRef(uid, cropId),
    orderBy("createdAt", "desc"),
    limit(count)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// -----------------------------------------------------------------------------
// Crop activities (user-logged field actions) — recent-first, bounded reads
// -----------------------------------------------------------------------------

export async function logCropActivity(uid, cropId, activity) {
  assertUid(uid);
  assertCropId(cropId);

  // Type must be one of the known activity types (internal "note" kept for
  // auto-logged timeline events); anything else falls back to "other".
  const rawType = activity.type ?? "other";
  const type =
    ACTIVITY_TYPES.includes(rawType) || rawType === "note" ? rawType : "other";

  // Date must be a valid field-local yyyy-mm-dd when provided.
  const date =
    typeof activity.date === "string" && DATE_RE.test(activity.date)
      ? activity.date
      : toDateString();

  // Quantity is optional; only finite positive numbers are stored.
  const qty = Number(activity.quantity);
  const quantity = Number.isFinite(qty) && qty > 0 ? qty : null;

  const data = stripUndefined({
    cropId,
    type,
    date,
    quantity,
    unit: activity.unit
      ? String(activity.unit).slice(0, MAX_QUANTITY_UNIT)
      : null,
    title: String(activity.title ?? "").slice(0, MAX_ACTIVITY_TEXT),
    notes: activity.notes
      ? String(activity.notes).slice(0, MAX_ACTIVITY_TEXT)
      : null,
    eventId: activity.eventId ?? null,
    createdBy: uid,
    createdAt: serverTimestamp(),
  });
  const ref = await addDoc(activitiesCollectionRef(uid, cropId), data);
  return { id: ref.id, ...data };
}

/** Limited recent activities — the dashboard never pulls full history. */
export async function getRecentActivities(uid, cropId, count = 5) {
  assertUid(uid);
  assertCropId(cropId);
  const q = query(
    activitiesCollectionRef(uid, cropId),
    orderBy("createdAt", "desc"),
    limit(count)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// -----------------------------------------------------------------------------
// AI observations — bounded recent reads only
// -----------------------------------------------------------------------------

export async function addAIObservation(uid, cropId, observation) {
  assertUid(uid);
  assertCropId(cropId);
  const data = stripUndefined({
    cropId,
    date: observation.date ?? toDateString(),
    category: observation.category ?? "general",
    severity: observation.severity ?? "info",
    title: observation.title ?? "",
    message: observation.message ?? "",
    eventId: observation.eventId ?? null,
    source: observation.source ?? TIMELINE_SOURCE.AI,
    createdAt: serverTimestamp(),
  });
  const ref = await addDoc(observationsCollectionRef(uid, cropId), data);
  return { id: ref.id, ...data };
}

export async function getRecentObservations(uid, cropId, count = 5) {
  assertUid(uid);
  assertCropId(cropId);
  const q = query(
    observationsCollectionRef(uid, cropId),
    orderBy("createdAt", "desc"),
    limit(count)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// -----------------------------------------------------------------------------
// AI analyses (structured findings, e.g. from image analysis) — bounded reads
// -----------------------------------------------------------------------------

export const ANALYSIS_URGENCIES = ["low", "medium", "high"];

export async function saveAIAnalysis(uid, cropId, analysis) {
  assertUid(uid);
  assertCropId(cropId);

  const stringArray = (v, cap = 12) =>
    Array.isArray(v)
      ? v
          .slice(0, cap)
          .map((x) => (typeof x === "string" ? x.trim() : ""))
          .filter(Boolean)
      : [];

  const data = stripUndefined({
    cropId,
    date: analysis.date ?? toDateString(),
    kind: analysis.kind ?? "image",
    imageId: analysis.imageId ?? null,
    // Structured analysis (image analysis contract).
    identifiedCrop: analysis.identifiedCrop ?? null,
    possibleIssue: analysis.possibleIssue ?? null,
    confidence:
      typeof analysis.confidence === "number" ? analysis.confidence : null,
    observations: stringArray(analysis.observations),
    possibleCauses: stringArray(analysis.possibleCauses),
    recommendedActions: stringArray(analysis.recommendedActions),
    prevention: stringArray(analysis.prevention),
    urgency: ANALYSIS_URGENCIES.includes(analysis.urgency)
      ? analysis.urgency
      : "medium",
    needsExpertReview: Boolean(analysis.needsExpertReview),
    // Human-readable summary used by the recommendations card.
    findings: analysis.findings ?? "",
    recommendations: analysis.recommendations ?? "",
    modelVersion: analysis.modelVersion ?? null,
    source: analysis.source ?? TIMELINE_SOURCE.AI,
    createdAt: serverTimestamp(),
  });
  const ref = await addDoc(analysesCollectionRef(uid, cropId), data);
  return { id: ref.id, ...data };
}

export async function getRecentAnalyses(uid, cropId, count = 3) {
  assertUid(uid);
  assertCropId(cropId);
  const q = query(
    analysesCollectionRef(uid, cropId),
    orderBy("createdAt", "desc"),
    limit(count)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Cursor-paginated read of the unified analyses/recommendations history
 * (Crop Suggestion page). Returns { analyses, nextCursor } — nextCursor is
 * null when the history is exhausted. Same collection, no new data.
 */
export async function getAnalysesPage(uid, cropId, { count = 5, cursor = null } = {}) {
  assertUid(uid);
  assertCropId(cropId);
  const constraints = [orderBy("createdAt", "desc"), limit(count)];
  if (cursor) constraints.push(startAfter(cursor));
  const snap = await getDocs(
    query(analysesCollectionRef(uid, cropId), ...constraints)
  );
  return {
    analyses: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
    nextCursor:
      snap.docs.length === count ? snap.docs[snap.docs.length - 1] : null,
  };
}

/**
 * Persists one AI recommendation batch in the SAME analyses subcollection
 * (kind = "recommendation") — one unified recommendation history, no new
 * collection. Keeps the findings/recommendations text fields so existing
 * readers render it unchanged; structured items live in `items`.
 */
export async function saveAIRecommendation(uid, cropId, recommendation) {
  assertUid(uid);
  assertCropId(cropId);

  const items = Array.isArray(recommendation.items)
    ? recommendation.items.slice(0, 30).map((r) => stripUndefined({ ...r }))
    : [];

  const data = stripUndefined({
    cropId,
    date: recommendation.date ?? toDateString(),
    kind: "recommendation",
    status: recommendation.status ?? "active",
    summary: recommendation.summary ?? "",
    findings: recommendation.summary ?? "",
    recommendations: items
      .map((r) => r.title)
      .filter(Boolean)
      .join("; ")
      .slice(0, 500),
    items,
    source: TIMELINE_SOURCE.AI,
    createdAt: serverTimestamp(),
  });
  const ref = await addDoc(analysesCollectionRef(uid, cropId), data);
  return { id: ref.id, ...data };
}

// -----------------------------------------------------------------------------
// Timeline images — NEW timeline-specific uploads only.
// Existing crop photos already live on the crop entry and are reused
// read-only via getExistingCropImages(); they are never copied/duplicated.
// -----------------------------------------------------------------------------

/** Reuses images already stored on the existing crop entry. No new data. */
export function getExistingCropImages(cropEntry) {
  return {
    cropImage: cropEntry?.cropImage ?? null,
    affectedImage: cropEntry?.affectedImage ?? null,
  };
}

export async function addTimelineImage(uid, cropId, image) {
  assertUid(uid);
  assertCropId(cropId);

  const base64 = image.base64;
  if (typeof base64 !== "string" || base64.length === 0) {
    throw new Error("timelineService: image.base64 is required.");
  }
  if (base64.length > MAX_IMAGE_BASE64_CHARS) {
    throw new Error(
      "timelineService: image too large. Compress to ~300px JPEG before saving."
    );
  }
  const purpose = IMAGE_PURPOSES.includes(image.purpose)
    ? image.purpose
    : "progress";

  const data = {
    cropId,
    purpose,
    base64,
    caption: image.caption ? String(image.caption).slice(0, 200) : null,
    takenAt: image.takenAt ?? toDateString(),
    analysisId: image.analysisId ?? null,
    createdBy: uid,
    createdAt: serverTimestamp(),
  };
  const ref = await addDoc(imagesCollectionRef(uid, cropId), data);
  return { id: ref.id, cropId, purpose, caption: data.caption };
}

export async function getRecentImages(uid, cropId, count = 4) {
  assertUid(uid);
  assertCropId(cropId);
  const q = query(
    imagesCollectionRef(uid, cropId),
    orderBy("createdAt", "desc"),
    limit(count)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// -----------------------------------------------------------------------------
// Crop removal cleanup — deletes ONLY this crop's timeline data (meta doc +
// every subcollection). The existing crops/{uid} entry and all other crops'
// data are never touched. Call this when the user deletes a crop profile.
// -----------------------------------------------------------------------------

export async function deleteCropTimeline(uid, cropId) {
  assertUid(uid);
  assertCropId(cropId);

  const subcollections = [
    eventsCollectionRef(uid, cropId),
    activitiesCollectionRef(uid, cropId),
    observationsCollectionRef(uid, cropId),
    analysesCollectionRef(uid, cropId),
    imagesCollectionRef(uid, cropId),
    reviewsCollectionRef(uid, cropId),
  ];

  let deleted = 0;
  for (const colRef of subcollections) {
    const snap = await getDocs(colRef);
    for (let i = 0; i < snap.docs.length; i += MAX_BATCH_OPS) {
      const batch = writeBatch(fdb);
      snap.docs
        .slice(i, i + MAX_BATCH_OPS)
        .forEach((d) => batch.delete(d.ref));
      await batch.commit();
      deleted += Math.min(MAX_BATCH_OPS, snap.docs.length - i);
    }
  }

  // Meta doc last — a timeline without a meta doc reads as "none".
  const metaRef = cropTimelineRef(uid, cropId);
  const metaSnap = await getDoc(metaRef);
  if (metaSnap.exists()) {
    await deleteDoc(metaRef);
    deleted += 1;
  }

  return { deleted };
}
