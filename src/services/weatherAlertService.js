// =============================================================================
// Weather alert service — persistence + notification delivery for the
// Weather Alert page.
//
// DESIGN DECISIONS (from project inspection):
//  - Notification preference REUSES the existing field the Personalinfo.jsx
//    toggle already writes: `users/{uid}.personaluser.notification` (boolean).
//    No second preference is ever created; reads and writes go through that
//    exact path so both surfaces stay synchronized.
//  - Alert records live in one NEW user-rooted collection:
//        weatherAlerts/{uid}/alerts/{alertId}
//    Rooted at the auth uid so ownership is enforced by path — the same
//    pattern `timelineData` already uses. Alert ids are deterministic
//    (cropScope:type:window) which makes writes idempotent: the same weather
//    event can never create a duplicate record.
//  - Webhook delivery uses the configurable VITE_WEBHOOK_URL env value —
//    ngrok dev URLs rotate, so the endpoint is never scattered through
//    components. A webhook failure NEVER breaks the dashboard: delivery is
//    best-effort and the outcome is recorded on the alert itself.
//  - All reads are bounded (limit / startAfter) — history is paginated.
// =============================================================================

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { fdb } from "../features/auth/firebase.js";

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

export const ALERT_COLLECTIONS = {
  root: "weatherAlerts",
  alerts: "alerts",
};

export const ALERT_STATUSES = {
  ACTIVE: "active",
  ACKNOWLEDGED: "acknowledged",
  RESOLVED: "resolved",
  EXPIRED: "expired",
};

export const NOTIFICATION_STATUSES = {
  SENT: "sent",
  FAILED: "failed",
  SKIPPED_DISABLED: "skipped_disabled",
  SKIPPED_DUPLICATE: "skipped_duplicate",
};

const WEBHOOK_TIMEOUT_MS = 8_000;
const HISTORY_PAGE_SIZE = 10;

// -----------------------------------------------------------------------------
// Notification preference — the EXISTING Personalinfo field, reused as-is
// -----------------------------------------------------------------------------

/** Reads `users/{uid}.personaluser.notification`. Null when never saved. */
export async function getWeatherAlertPreference(uid) {
  const snap = await getDoc(doc(fdb, "users", uid));
  if (!snap.exists()) return null;
  const value = snap.data()?.personaluser?.notification;
  return value === true;
}

/**
 * Updates the existing preference field in place (dotted-path write), so no
 * other personalinfo field is touched or overwritten.
 */
export async function setWeatherAlertPreference(uid, enabled) {
  await updateDoc(doc(fdb, "users", uid), {
    "personaluser.notification": Boolean(enabled),
  });
  return Boolean(enabled);
}

// -----------------------------------------------------------------------------
// Alert store paths — rooted at the authenticated uid
// -----------------------------------------------------------------------------

function assertUid(uid) {
  if (!uid || typeof uid !== "string") {
    throw new Error("weatherAlertService: an authenticated uid is required.");
  }
}

function alertsCollectionRef(uid) {
  return collection(fdb, ALERT_COLLECTIONS.root, uid, ALERT_COLLECTIONS.alerts);
}

function alertDocRef(uid, alertId) {
  return doc(alertsCollectionRef(uid), alertId);
}

// Firestore rejects `undefined` values — strip them recursively.
function stripUndefined(value) {
  if (Array.isArray(value)) return value.map(stripUndefined);
  if (value && typeof value === "object" && !(value instanceof Date)) {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (v !== undefined) out[k] = stripUndefined(v);
    }
    return out;
  }
  return value;
}

function toEpochMs(value) {
  if (!value) return null;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? null : t;
}

function normalizeStoredAlert(d) {
  const data = { id: d.id, ...d.data() };
  data.startTime = toEpochMs(data.startTime);
  data.endTime = toEpochMs(data.endTime);
  data.triggeredAt = toEpochMs(data.triggeredAt);
  data.notificationSentAt = toEpochMs(data.notificationSentAt);
  data.acknowledgedAt = toEpochMs(data.acknowledgedAt);
  data.resolvedAt = toEpochMs(data.resolvedAt);
  data.updatedAt = toEpochMs(data.updatedAt);
  return data;
}

// -----------------------------------------------------------------------------
// Deduplicated alert creation
// -----------------------------------------------------------------------------

/**
 * Records a detected alert WITHOUT duplicates. The deterministic detection id
 * is used as the document id: an existing record for the same crop + type +
 * forecast window is returned untouched (no re-write, no re-notification).
 * Returns { alert, created }.
 */
export async function recordAlert(uid, detection, { notificationsEnabled }) {
  assertUid(uid);
  const ref = alertDocRef(uid, detection.id);
  const existing = await getDoc(ref);
  if (existing.exists()) {
    return { alert: normalizeStoredAlert(existing), created: false };
  }

  const now = serverTimestamp();
  const record = stripUndefined({
    userId: uid,
    cropScope: detection.cropScope,
    cropName: detection.cropName ?? null,
    alertType: detection.alertType,
    severity: detection.severity,
    title: detection.title,
    message: detection.message,
    location: detection.location ?? null,
    weatherContext: detection.weatherContext ?? null,
    startTime: detection.startTime,
    endTime: detection.endTime,
    windowBucket: detection.windowBucket ?? null,
    triggeredAt: Date.now(),
    status: ALERT_STATUSES.ACTIVE,
    acknowledgedAt: null,
    resolvedAt: null,
    notificationSent: false,
    notificationStatus: notificationsEnabled ? null : NOTIFICATION_STATUSES.SKIPPED_DISABLED,
    notificationSentAt: null,
    source: detection.source ?? "open-meteo",
    createdAt: now,
    updatedAt: now,
  });

  await setDoc(ref, record);
  const snap = await getDoc(ref);
  return { alert: normalizeStoredAlert(snap), created: true };
}

// -----------------------------------------------------------------------------
// Webhook delivery — best effort, never throws into the dashboard
// -----------------------------------------------------------------------------

/** The configured webhook endpoint (env), or null when unset/blank. */
export function getWebhookUrl() {
  const url = import.meta.env.VITE_WEBHOOK_URL;
  return typeof url === "string" && url.trim() ? url.trim() : null;
}

/** Builds the structured notification payload — no arbitrary UI text. */
export function buildWebhookPayload(alert) {
  return {
    eventType: "weather_alert",
    userId: alert.userId,
    cropId: alert.cropScope,
    cropName: alert.cropName ?? null,
    alertId: alert.id,
    alertType: alert.alertType,
    severity: alert.severity,
    title: alert.title,
    message: alert.message,
    location: alert.location ?? null,
    weatherContext: alert.weatherContext ?? null,
    triggeredAt: new Date(alert.triggeredAt ?? Date.now()).toISOString(),
    source: alert.source ?? "open-meteo",
  };
}

/**
 * Sends the alert event to the configured webhook and records the outcome on
 * the alert doc. Returns one of NOTIFICATION_STATUSES (or null when no
 * endpoint is configured). Never throws — delivery failure only marks the
 * alert, it must never break the page.
 */
export async function sendAlertNotification(uid, alert) {
  assertUid(uid);
  const url = getWebhookUrl();
  if (!url) return null;

  let status;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildWebhookPayload(alert)),
      signal: controller.signal,
    });
    status = response.ok
      ? NOTIFICATION_STATUSES.SENT
      : NOTIFICATION_STATUSES.FAILED;
  } catch {
    status = NOTIFICATION_STATUSES.FAILED; // timeout / network / unavailable
  } finally {
    clearTimeout(timer);
  }

  try {
    await updateDoc(alertDocRef(uid, alert.id), {
      notificationSent: status === NOTIFICATION_STATUSES.SENT,
      notificationStatus: status,
      notificationSentAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    // Recording the outcome is best-effort too.
    console.error("weatherAlertService: failed to record notification state:", err);
  }
  return status;
}

// -----------------------------------------------------------------------------
// Bounded reads + lifecycle transitions
// -----------------------------------------------------------------------------

/**
 * Recent alerts, newest first. Options: { limitTo, cursor } — pass
 * `nextCursor` from a previous call to paginate. Returns { alerts, nextCursor }.
 */
export async function getRecentAlerts(uid, { limitTo = HISTORY_PAGE_SIZE, cursor = null } = {}) {
  assertUid(uid);
  const constraints = [orderBy("triggeredAt", "desc"), limit(limitTo)];
  if (cursor) constraints.splice(1, 0, startAfter(cursor));
  const snap = await getDocs(query(alertsCollectionRef(uid), ...constraints));
  return {
    alerts: snap.docs.map(normalizeStoredAlert),
    nextCursor: snap.docs.length === limitTo ? snap.docs[snap.docs.length - 1] : null,
  };
}

/** Acknowledges one alert (active -> acknowledged). */
export async function acknowledgeAlert(uid, alertId) {
  assertUid(uid);
  await updateDoc(alertDocRef(uid, alertId), {
    status: ALERT_STATUSES.ACKNOWLEDGED,
    acknowledgedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/** Marks one alert resolved by the user. */
export async function resolveAlert(uid, alertId) {
  assertUid(uid);
  await updateDoc(alertDocRef(uid, alertId), {
    status: ALERT_STATUSES.RESOLVED,
    resolvedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Lifecycle sweep: alerts whose forecast window has ended become "expired".
 * Best-effort — returns the ids transitioned. Cheap: runs over the already
 * fetched in-memory page of alerts, no extra query.
 */
export async function expireElapsedAlerts(uid, alerts, nowMs = Date.now()) {
  assertUid(uid);
  const elapsed = alerts.filter(
    (a) =>
      (a.status === ALERT_STATUSES.ACTIVE || a.status === ALERT_STATUSES.ACKNOWLEDGED) &&
      typeof a.endTime === "number" &&
      a.endTime < nowMs
  );
  for (const alert of elapsed) {
    try {
      await updateDoc(alertDocRef(uid, alert.id), {
        status: ALERT_STATUSES.EXPIRED,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("weatherAlertService: expiry update failed:", err);
    }
  }
  return elapsed.map((a) => a.id);
}
