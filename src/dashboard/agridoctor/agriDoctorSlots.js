// =============================================================================
// Agri Doctor — slot schedule + time helpers.
//
// Slots are FIXED daily 2-hour consultation windows. The whole schedule lives
// here so it can be edited in one place without touching any component. Every
// date is derived in LOCAL time (reusing cropUtils.localDateISO) so a farmer in
// any timezone never sees the calendar drift by a day — the same robustness
// rule the crop timeline already follows.
// =============================================================================

import { localDateISO } from "@/lib/cropUtils";
import { WINDOW_MS, SLOT_CAPACITY, slotWindow } from "@/services/agriDoctorService";

/** The fixed daily consultation windows (2 hours each, capacity 3 farmers). */
export const DAILY_SLOTS = [
  { id: "s08", startHour: 8, label: "08:00 – 10:00" },
  { id: "s10", startHour: 10, label: "10:00 – 12:00" },
  { id: "s12", startHour: 12, label: "12:00 – 14:00" },
  { id: "s14", startHour: 14, label: "14:00 – 16:00" },
  { id: "s16", startHour: 16, label: "16:00 – 18:00" },
  { id: "s18", startHour: 18, label: "18:00 – 20:00" },
];

/** How many days ahead a farmer can book (today + next 2 days). */
export const BOOKABLE_DAYS = 3;

/** Local yyyy-mm-dd for a Date — shared by the slot-date helpers below. */
function isoOf(date) {
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${m}-${d}`;
}

/**
 * Local yyyy-mm-dd strings for the bookable window, today first.
 *
 * `todayISO` optionally anchors the grid to an explicit day so a caller can
 * regenerate it only when the calendar day flips (useDayTick) rather than
 * re-reading the clock on every render. Omitted/invalid -> the real today,
 * which keeps the result identical to localDateISO(0..count-1).
 */
export function getSlotDates(count = BOOKABLE_DAYS, todayISO = "") {
  const [y, m, d] = String(todayISO).split("-").map(Number);
  const anchored = new Date(y, (m ?? 1) - 1, d ?? 1);
  const base =
    todayISO && !Number.isNaN(anchored.getTime()) ? anchored : new Date();
  return Array.from({ length: count }, (_, i) =>
    isoOf(new Date(base.getFullYear(), base.getMonth(), base.getDate() + i))
  );
}

/** Stable Firestore id for a (date, slot) occupancy doc. */
export function slotKey(date, slotId) {
  return `${date}__${slotId}`;
}

/** "Today" / "Tomorrow" / "Wed, 9 Sep" from a local yyyy-mm-dd string. */
export function formatDayLabel(dateStr) {
  if (!dateStr) return "";
  const today = localDateISO(0);
  const tomorrow = localDateISO(1);
  if (dateStr === today) return "Today";
  if (dateStr === tomorrow) return "Tomorrow";
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

/** epoch ms -> local "HH:MM" (used for the window close time). */
export function formatClock(ms) {
  if (!ms) return "";
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/** epoch ms -> "9 Sep, 14:32" (booking / message stamps). */
export function formatStamp(ms) {
  if (!ms) return "";
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString([], {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Remaining window as a compact human string.
 *   >= 1h -> "1h 42m"   |   < 1h -> "42m 07s"   |   elapsed -> "Closed"
 */
export function formatCountdown(remainingMs) {
  if (!Number.isFinite(remainingMs) || remainingMs <= 0) return "Closed";
  const totalSec = Math.floor(remainingMs / 1000);
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
}

/**
 * True while the consultation window is LIVE: the slot's own start time has
 * arrived AND its 2-hour end has not passed. A session booked for a later slot
 * stays closed until that slot starts (see isUpcoming).
 */
export function isWindowOpen(session, nowMs = Date.now()) {
  if (session?.status !== "active") return false;
  if (typeof session.endMs !== "number" || session.endMs <= nowMs) return false;
  const start = session.startMs;
  return typeof start !== "number" || nowMs >= start;
}

/** True when a booking exists but its slot has not started yet. */
export function isUpcoming(session, nowMs = Date.now()) {
  return (
    session?.status === "active" &&
    typeof session.startMs === "number" &&
    session.startMs > nowMs
  );
}

/** Local epoch-ms at which a (date, startHour) slot opens. */
export function slotStartMs(dateStr, startHour) {
  return slotWindow(dateStr, startHour).startMs;
}

/** True once a slot's whole 2-hour window has finished (no longer bookable). */
export function isSlotElapsed(dateStr, startHour, nowMs = Date.now()) {
  const { endMs } = slotWindow(dateStr, startHour);
  return typeof endMs === "number" && endMs <= nowMs;
}

export { WINDOW_MS, SLOT_CAPACITY, slotWindow };
