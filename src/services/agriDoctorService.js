// =============================================================================
// Agri Doctor service — persistence for the consultation feature.
//
// DESIGN DECISIONS (mirrors weatherAlertService / marketRateService patterns):
//  - One NEW top-level collection `agriDoctor` holds every Agri Doctor record.
//    A single fixed hub doc (`agriDoctor/main`) parents the credits/slots/
//    sessions subcollections, so the whole feature stays under one root and
//    never touches users/{uid}, crops/{uid} or any existing collection.
//    (Firestore paths alternate collection/document, so a root-level
//    `agriDoctor/slots` would be a 2-segment DOC path, not a collection —
//    the `main` hub keeps every subcollection at a valid odd segment count.)
//        agriDoctor/main/credits/{uid}                       -> credit balance
//        agriDoctor/main/slots/{slotKey}                     -> per-slot occupancy
//        agriDoctor/main/sessions/{sessionId}                -> one booked consult
//        agriDoctor/main/sessions/{sessionId}/messages/{id}  -> chat thread
//  - Money-like values (credits) and capacity (slot seats) are mutated inside a
//    single Firestore transaction so a double-click or two users racing for the
//    last seat can never over-book or over-spend.
//  - Ordering fields are numeric epoch-ms (`*Ms`) written from the client, so
//    `orderBy` never sees a null serverTimestamp on a brand-new doc and no
//    composite index is required for the single-field queries used here.
//  - The 2-hour window is enforced by data (endMs) + a sweep, never by leaving
//    a listener running: any client that loads the page reconciles elapsed
//    sessions (close attended ones, remove no-shows). Idempotent.
// =============================================================================

import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  runTransaction,
  increment,
} from "firebase/firestore";
import { fdb } from "@/features/auth/firebase";
import { toEpochMs } from "@/lib/cropUtils";

// -----------------------------------------------------------------------------
// Constants — the single source of truth for the feature's business rules.
// -----------------------------------------------------------------------------

export const AGRI_DOCTOR = {
  root: "agriDoctor",
  // Fixed intermediate doc so credits/slots/sessions are valid SUBcollections
  // (a collection path must have an odd number of segments).
  hub: "main",
  credits: "credits",
  slots: "slots",
  sessions: "sessions",
  messages: "messages",
};

/** A booked consultation stays open for exactly 2 hours, then closes. */
export const WINDOW_MS = 2 * 60 * 60 * 1000;

/** Maximum farmers that can share the same daily slot before it is "Full". */
export const SLOT_CAPACITY = 3;

/** Credits deducted from the farmer's balance per booking. */
export const SLOT_COST = 5;

/** One-time free credit grant when a farmer first opens Agri Doctor. */
export const FREE_CREDITS = 100;

export const SESSION_STATUS = {
  ACTIVE: "active", // window still open — chat enabled
  CLOSED: "closed", // window elapsed, farmer attended — read-only history
  REMOVED: "removed", // window elapsed, farmer never attended — no-show
};

export const MESSAGE_TYPES = {
  TEXT: "text",
  IMAGE: "image",
  VOICE: "voice",
};

export const ROLES = {
  USER: "user",
  DOCTOR: "doctor",
};

// Doctor portal credentials. The portal is gated client-side by these values
// (see src/doctor/doctorAuth.js). DOCTOR_EMAIL is the identity the Firestore
// rules recognise for cross-user access — create this Firebase Auth account to
// make doctor access server-enforced (documented in firestore.rules).
export const DOCTOR_CREDENTIALS = {
  username: "agrimonitor",
  password: "admindoctor",
};
export const DOCTOR_EMAIL = "agridoctor@agrimonitor.app";

/** Typed failure reasons surfaced by bookSlot() so the UI can explain them. */
export const BOOKING_ERRORS = {
  SLOT_FULL: "slot_full",
  INSUFFICIENT_CREDITS: "insufficient_credits",
  WINDOW_PASSED: "window_passed",
  UNKNOWN: "unknown",
};

/**
 * Local-time start/end (epoch ms) of a scheduled slot window.
 *
 * The consultation window IS the booked slot: it opens at the slot's OWN start
 * hour — booking an 11:00 slot at 08:00 does not open it early — and closes
 * WINDOW_MS (2 hours) later. Built from local calendar fields so the hour never
 * shifts across timezones.
 */
export function slotWindow(dateStr, startHour) {
  if (!dateStr) return { startMs: null, endMs: null };
  const [y, m, d] = String(dateStr).split("-").map(Number);
  const start = new Date(y, (m ?? 1) - 1, d ?? 1, Number(startHour) || 0, 0, 0, 0);
  if (Number.isNaN(start.getTime())) return { startMs: null, endMs: null };
  const startMs = start.getTime();
  return { startMs, endMs: startMs + WINDOW_MS };
}

// -----------------------------------------------------------------------------
// Internal helpers
// -----------------------------------------------------------------------------

function assertUid(uid) {
  if (!uid || typeof uid !== "string") {
    throw new Error("agriDoctorService: an authenticated uid is required.");
  }
}

const creditsCol = () =>
  collection(fdb, AGRI_DOCTOR.root, AGRI_DOCTOR.hub, AGRI_DOCTOR.credits);
const slotsCol = () =>
  collection(fdb, AGRI_DOCTOR.root, AGRI_DOCTOR.hub, AGRI_DOCTOR.slots);
const sessionsCol = () =>
  collection(fdb, AGRI_DOCTOR.root, AGRI_DOCTOR.hub, AGRI_DOCTOR.sessions);
const messagesCol = (sessionId) =>
  collection(
    fdb,
    AGRI_DOCTOR.root,
    AGRI_DOCTOR.hub,
    AGRI_DOCTOR.sessions,
    sessionId,
    AGRI_DOCTOR.messages
  );

const creditRef = (uid) => doc(creditsCol(), uid);
const slotRef = (slotKey) => doc(slotsCol(), slotKey);
const sessionRef = (sessionId) => doc(sessionsCol(), sessionId);

// Firestore rejects `undefined` — strip it recursively before any write.
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

function normalizeCredit(d) {
  const data = d.data() ?? {};
  return {
    uid: d.id,
    balance: Number.isFinite(data.balance) ? data.balance : 0,
    grantedAt: toEpochMs(data.grantedAt),
    updatedAt: toEpochMs(data.updatedAt),
  };
}

function normalizeSlot(d) {
  const data = d.data() ?? {};
  return {
    slotKey: d.id,
    date: data.date ?? null,
    slotId: data.slotId ?? null,
    booked: Number.isFinite(data.booked) ? data.booked : 0,
    capacity: Number.isFinite(data.capacity) ? data.capacity : SLOT_CAPACITY,
  };
}

function normalizeSession(d) {
  const data = { id: d.id, ...(d.data() ?? {}) };
  data.bookedAtMs = toEpochMs(data.bookedAtMs) ?? toEpochMs(data.createdAt);
  // Sessions written before scheduled windows existed carry no startMs — fall
  // back to the booking time so those legacy docs keep working (open at once).
  data.startMs = toEpochMs(data.startMs) ?? data.bookedAtMs;
  data.endMs = toEpochMs(data.endMs);
  data.attendedAt = toEpochMs(data.attendedAt);
  data.closedAt = toEpochMs(data.closedAt);
  data.removedAt = toEpochMs(data.removedAt);
  data.lastMessageAtMs = toEpochMs(data.lastMessageAtMs);
  data.createdAt = toEpochMs(data.createdAt);
  data.updatedAt = toEpochMs(data.updatedAt);
  data.unreadForDoctor = Number.isFinite(data.unreadForDoctor) ? data.unreadForDoctor : 0;
  data.unreadForUser = Number.isFinite(data.unreadForUser) ? data.unreadForUser : 0;
  data.userAttended = data.userAttended === true;
  return data;
}

function normalizeMessage(d) {
  const data = { id: d.id, ...(d.data() ?? {}) };
  data.createdAtMs = toEpochMs(data.createdAtMs) ?? toEpochMs(data.createdAt) ?? 0;
  return data;
}

// -----------------------------------------------------------------------------
// Credits
// -----------------------------------------------------------------------------

/**
 * Grants the one-time FREE_CREDITS on first use, then returns the balance.
 * Idempotent: an existing account is returned untouched (never re-granted).
 */
export async function ensureCreditAccount(uid) {
  assertUid(uid);
  const ref = creditRef(uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return normalizeCredit(snap);
  const now = serverTimestamp();
  await setDoc(ref, {
    uid,
    balance: FREE_CREDITS,
    grantedAt: now,
    updatedAt: now,
  });
  const fresh = await getDoc(ref);
  return normalizeCredit(fresh);
}

/** Reads the balance without granting (0 when no account exists yet). */
export async function getCreditBalance(uid) {
  assertUid(uid);
  const snap = await getDoc(creditRef(uid));
  return snap.exists() ? normalizeCredit(snap).balance : 0;
}

/** Live balance subscription. Returns the unsubscribe function. */
export function subscribeCredits(uid, onChange) {
  assertUid(uid);
  return onSnapshot(
    creditRef(uid),
    (snap) => onChange(snap.exists() ? normalizeCredit(snap) : { uid, balance: 0 }),
    (err) => console.error("agriDoctor: credits subscription failed:", err)
  );
}

// -----------------------------------------------------------------------------
// Slot occupancy
// -----------------------------------------------------------------------------

/**
 * Live occupancy for a set of local dates. Uses a single-field `in` query so no
 * composite index is needed. Missing slot docs simply mean "0 booked".
 */
export function subscribeSlots(dates, onChange) {
  if (!Array.isArray(dates) || dates.length === 0) {
    onChange([]);
    return () => {};
  }
  const q = query(slotsCol(), where("date", "in", dates.slice(0, 30)));
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map(normalizeSlot)),
    (err) => console.error("agriDoctor: slots subscription failed:", err)
  );
}

// -----------------------------------------------------------------------------
// Sessions
// -----------------------------------------------------------------------------

/** Live list of one farmer's sessions (newest first, sorted client-side). */
export function subscribeUserSessions(uid, onChange) {
  assertUid(uid);
  const q = query(sessionsCol(), where("userId", "==", uid));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map(normalizeSession);
      list.sort((a, b) => (b.bookedAtMs ?? 0) - (a.bookedAtMs ?? 0));
      onChange(list);
    },
    (err) => console.error("agriDoctor: sessions subscription failed:", err)
  );
}

/** Live list of ALL sessions for the doctor console (newest first). */
export function subscribeAllSessions(onChange, onError) {
  const q = query(sessionsCol(), orderBy("bookedAtMs", "desc"), limit(200));
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map(normalizeSession)),
    (err) => {
      console.error("agriDoctor: all-sessions subscription failed:", err);
      onError?.(err);
    }
  );
}

export async function getSession(sessionId) {
  const snap = await getDoc(sessionRef(sessionId));
  return snap.exists() ? normalizeSession(snap) : null;
}

/** Live message thread for one session (oldest first). */
export function subscribeMessages(sessionId, onChange) {
  const q = query(messagesCol(sessionId), orderBy("createdAtMs", "asc"));
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map(normalizeMessage)),
    (err) => console.error("agriDoctor: messages subscription failed:", err)
  );
}

// -----------------------------------------------------------------------------
// Booking — atomic capacity + credit check
// -----------------------------------------------------------------------------

/**
 * Books a slot for the farmer. Runs entirely in a transaction so the seat count
 * and the credit balance can never drift under concurrent writes.
 *
 * @returns {Promise<{sessionId:string}>}
 * @throws {{code:string}} one of BOOKING_ERRORS.
 */
export async function bookSlot({ uid, user, slot, date, slotKey, nowMs = Date.now() }) {
  assertUid(uid);
  if (!slot || !date || !slotKey) {
    throw { code: BOOKING_ERRORS.UNKNOWN, message: "A slot and date are required." };
  }

  // The window is the slot's own scheduled time, not "now + 2h". A slot whose
  // 2 hours have already finished cannot be booked at all.
  const { startMs, endMs } = slotWindow(date, slot.startHour);
  if (!startMs) {
    throw { code: BOOKING_ERRORS.UNKNOWN, message: "That slot date is invalid." };
  }
  if (endMs <= nowMs) {
    throw { code: BOOKING_ERRORS.WINDOW_PASSED };
  }

  // The credit doc must exist for tx.update() — grant it first if needed.
  await ensureCreditAccount(uid);

  const newSessionRef = doc(sessionsCol());

  try {
    await runTransaction(fdb, async (tx) => {
      const slotSnap = await tx.get(slotRef(slotKey));
      const creditSnap = await tx.get(creditRef(uid));

      const booked = slotSnap.exists() ? Number(slotSnap.data().booked ?? 0) : 0;
      if (booked >= SLOT_CAPACITY) {
        throw { code: BOOKING_ERRORS.SLOT_FULL };
      }

      const balance = creditSnap.exists() ? Number(creditSnap.data().balance ?? 0) : 0;
      if (balance < SLOT_COST) {
        throw { code: BOOKING_ERRORS.INSUFFICIENT_CREDITS };
      }

      const now = serverTimestamp();
      tx.set(newSessionRef, stripUndefined({
        userId: uid,
        userName: user?.fullname || user?.firstName || "Agri Monitor farmer",
        userEmail: user?.EmailAddress || "",
        userPhoto: user?.displayphoto || null,
        slotId: slot.id,
        slotLabel: slot.label,
        startHour: slot.startHour,
        date,
        slotKey,
        bookedAtMs: nowMs,
        startMs,
        endMs,
        status: SESSION_STATUS.ACTIVE,
        creditsCost: SLOT_COST,
        userAttended: false,
        attendedAt: null,
        closedAt: null,
        removedAt: null,
        closeReason: null,
        lastMessageAtMs: null,
        lastMessagePreview: "",
        unreadForDoctor: 0,
        unreadForUser: 0,
        createdAt: now,
        updatedAt: now,
      }));

      tx.set(
        slotRef(slotKey),
        { slotKey, date, slotId: slot.id, booked: booked + 1, capacity: SLOT_CAPACITY, updatedAt: now },
        { merge: true }
      );

      tx.update(creditRef(uid), {
        balance: balance - SLOT_COST,
        updatedAt: now,
      });
    });
  } catch (err) {
    // Re-throw typed booking errors; wrap anything else.
    if (err && err.code) throw err;
    console.error("agriDoctor: booking transaction failed:", err);
    throw { code: BOOKING_ERRORS.UNKNOWN, message: err?.message ?? "Booking failed." };
  }

  return { sessionId: newSessionRef.id };
}

// -----------------------------------------------------------------------------
// Messaging
// -----------------------------------------------------------------------------

/**
 * Appends a message to a session thread and updates the session's preview,
 * attendance flag (first farmer message) and the other party's unread counter.
 */
export async function sendMessage({
  sessionId,
  senderRole,
  senderId,
  senderName,
  type = MESSAGE_TYPES.TEXT,
  text = "",
  mediaData = null,
  mediaMime = null,
  durationMs = null,
  nowMs = Date.now(),
}) {
  if (!sessionId) throw new Error("sendMessage: sessionId is required.");

  const preview =
    type === MESSAGE_TYPES.TEXT
      ? text.slice(0, 80)
      : type === MESSAGE_TYPES.IMAGE
        ? "📷 Image"
        : "🎤 Voice message";

  await addDoc(messagesCol(sessionId), stripUndefined({
    sessionId,
    senderRole,
    senderId: senderId ?? (senderRole === ROLES.DOCTOR ? "doctor" : null),
    senderName: senderName ?? (senderRole === ROLES.DOCTOR ? "Agri Doctor" : "You"),
    type,
    text: type === MESSAGE_TYPES.TEXT ? text : "",
    mediaData: type === MESSAGE_TYPES.TEXT ? null : mediaData,
    mediaMime: type === MESSAGE_TYPES.TEXT ? null : mediaMime,
    durationMs: type === MESSAGE_TYPES.VOICE ? durationMs : null,
    createdAtMs: nowMs,
    createdAt: serverTimestamp(),
  }));

  const unreadField =
    senderRole === ROLES.USER ? "unreadForDoctor" : "unreadForUser";

  await updateDoc(sessionRef(sessionId), {
    lastMessageAtMs: nowMs,
    lastMessagePreview: preview,
    lastMessageRole: senderRole,
    [unreadField]: increment(1),
    // First farmer message marks the slot as "attended" so the sweep keeps it.
    ...(senderRole === ROLES.USER ? { userAttended: true, attendedAt: serverTimestamp() } : {}),
    updatedAt: serverTimestamp(),
  });
}

/** Clears the unread counter for the party that just opened the thread. */
export async function markSessionRead(sessionId, role) {
  if (!sessionId) return;
  const field = role === ROLES.DOCTOR ? "unreadForDoctor" : "unreadForUser";
  try {
    await updateDoc(sessionRef(sessionId), { [field]: 0 });
  } catch (err) {
    console.error("agriDoctor: markSessionRead failed:", err);
  }
}

// -----------------------------------------------------------------------------
// Lifecycle sweep — close attended windows, remove no-shows
// -----------------------------------------------------------------------------

/**
 * Reconciles elapsed ACTIVE sessions against the clock:
 *   - attended (userAttended) -> CLOSED (kept as read-only history)
 *   - never attended          -> REMOVED (no-show) + frees the slot seat
 * Best-effort and idempotent (only ACTIVE sessions are transitioned, so a seat
 * is released at most once). Returns the number of sessions changed.
 */
export async function sweepSessions(sessions, nowMs = Date.now()) {
  if (!Array.isArray(sessions) || sessions.length === 0) return 0;
  const elapsed = sessions.filter(
    (s) => s.status === SESSION_STATUS.ACTIVE && typeof s.endMs === "number" && s.endMs < nowMs
  );

  let changed = 0;
  for (const s of elapsed) {
    try {
      if (s.userAttended) {
        await updateDoc(sessionRef(s.id), {
          status: SESSION_STATUS.CLOSED,
          closedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        await updateDoc(sessionRef(s.id), {
          status: SESSION_STATUS.REMOVED,
          removedAt: serverTimestamp(),
          closeReason: "no_show",
          updatedAt: serverTimestamp(),
        });
        // Free the seat so another farmer can take the slot.
        if (s.slotKey) {
          await updateDoc(slotRef(s.slotKey), {
            booked: increment(-1),
            updatedAt: serverTimestamp(),
          }).catch(() => {});
        }
      }
      changed += 1;
    } catch (err) {
      console.error("agriDoctor: sweep update failed for session", s.id, err);
    }
  }
  return changed;
}

// -----------------------------------------------------------------------------
// Doctor portal credential check
// -----------------------------------------------------------------------------

/** Verifies the doctor portal username/password gate. */
export function verifyDoctorCredentials(username, password) {
  return (
    String(username ?? "").trim().toLowerCase() === DOCTOR_CREDENTIALS.username &&
    String(password ?? "") === DOCTOR_CREDENTIALS.password
  );
}

/** One-shot read of every session (used for a manual doctor refresh/export). */
export async function getAllSessions() {
  const snap = await getDocs(query(sessionsCol(), orderBy("bookedAtMs", "desc"), limit(200)));
  return snap.docs.map(normalizeSession);
}
