// Data hook for the farmer-facing Agri Doctor page.
//
//  - Owns every Firestore interaction through agriDoctorService; components
//    never read/write directly (same contract as useWeatherAlerts /
//    useMarketRates).
//  - Credits, slot occupancy and the farmer's sessions are LIVE subscriptions,
//    so two farmers racing for the last seat see "Full" without a refresh.
//  - The lifecycle sweep (close attended windows / remove no-shows) runs on
//    load and every 30s while the page is open. It is overlap-guarded and
//    idempotent, and only writes when an ACTIVE window has actually elapsed.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ensureCreditAccount,
  subscribeCredits,
  subscribeSlots,
  subscribeUserSessions,
  sweepSessions,
  bookSlot,
  SESSION_STATUS,
} from "@/services/agriDoctorService";
import {
  DAILY_SLOTS,
  SLOT_CAPACITY,
  BOOKABLE_DAYS,
  getSlotDates,
  slotKey,
  formatDayLabel,
  isWindowOpen,
  isUpcoming,
  isSlotElapsed,
  slotStartMs,
} from "./agriDoctorSlots";
import { describeBookingError } from "./agriDoctorMeta";
import useDayTick from "@/lib/useDayTick";

const SWEEP_INTERVAL_MS = 30_000;
const SLOT_TICK_MS = 60_000;

export default function useAgriDoctor(uid, userDoc) {
  const [credits, setCredits] = useState(null); // { uid, balance } | null
  const [creditError, setCreditError] = useState("");
  const [slots, setSlots] = useState([]); // occupancy docs
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  // The slotKey currently being booked (null when idle). Tracking the KEY —
  // not just a boolean — lets exactly one slot card show its own "Booking…".
  const [bookingKey, setBookingKey] = useState(null);
  const [actionError, setActionError] = useState("");

  const mountedRef = useRef(true);
  const sweepingRef = useRef(false);
  // Regenerates the day grid when the local calendar day flips (tab left open
  // over midnight), reusing the shared dashboard tick instead of a new timer.
  const dayKey = useDayTick();
  const dates = useMemo(() => getSlotDates(BOOKABLE_DAYS, dayKey), [dayKey]);
  // Minute-granularity local tick so a slot whose 2-hour window finishes while
  // the tab stays open flips to "Time passed" without a manual refresh.
  // Purely local — never touches Firestore.
  const [slotTickMs, setSlotTickMs] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setSlotTickMs(Date.now()), SLOT_TICK_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // ---- Credits: grant the one-time free 100, then live-subscribe -----------
  useEffect(() => {
    if (!uid) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    let unsub = () => {};
    (async () => {
      try {
        await ensureCreditAccount(uid); // idempotent grant of FREE_CREDITS
        if (cancelled) return;
        unsub = subscribeCredits(uid, (c) => {
          if (cancelled || !mountedRef.current) return;
          setCredits(c);
          setCreditError("");
          setLoading(false);
        });
      } catch (err) {
        if (cancelled) return;
        console.error("agridoctor: credit init failed:", err);
        setCreditError("Could not load your credit balance.");
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      unsub();
    };
  }, [uid]);

  // ---- Slot occupancy for the bookable days -------------------------------
  useEffect(() => {
    if (!uid) return undefined;
    const unsub = subscribeSlots(dates, (list) => {
      if (mountedRef.current) setSlots(list);
    });
    return () => unsub();
  }, [uid, dates]);

  // ---- The farmer's sessions ----------------------------------------------
  useEffect(() => {
    if (!uid) return undefined;
    const unsub = subscribeUserSessions(uid, (list) => {
      if (mountedRef.current) setSessions(list);
    });
    return () => unsub();
  }, [uid]);

  // ---- Lifecycle sweep ----------------------------------------------------
  const runSweep = useCallback(async () => {
    if (!uid || sweepingRef.current || sessions.length === 0) return;
    const nowMs = Date.now();
    const hasElapsed = sessions.some(
      (s) => s.status === SESSION_STATUS.ACTIVE && typeof s.endMs === "number" && s.endMs < nowMs
    );
    if (!hasElapsed) return;
    sweepingRef.current = true;
    try {
      await sweepSessions(sessions, nowMs);
    } catch (err) {
      console.error("agridoctor: sweep failed:", err);
    } finally {
      sweepingRef.current = false;
    }
  }, [uid, sessions]);

  useEffect(() => {
    runSweep();
    const id = setInterval(runSweep, SWEEP_INTERVAL_MS);
    return () => clearInterval(id);
  }, [runSweep]);

  // ---- Booking ------------------------------------------------------------
  const book = useCallback(
    async (slot, date) => {
      if (!uid) return { ok: false, code: "no-auth" };
      const key = slotKey(date, slot.id);
      setBookingKey(key);
      setActionError("");
      try {
        const res = await bookSlot({
          uid,
          user: userDoc,
          slot,
          date,
          slotKey: key,
          nowMs: Date.now(),
        });
        return {
          ok: true,
          sessionId: res.sessionId,
          startMs: slotStartMs(date, slot.startHour),
        };
      } catch (err) {
        const info = describeBookingError(err);
        setActionError(info.title);
        return { ok: false, code: err?.code, ...info };
      } finally {
        setBookingKey(null);
      }
    },
    [uid, userDoc]
  );

  // ---- Derived slot grid (dates x slots, with live occupancy) -------------
  const slotGrid = useMemo(() => {
    const bookedByKey = new Map(slots.map((s) => [s.slotKey, s.booked ?? 0]));
    return dates.map((date) => ({
      date,
      dayLabel: formatDayLabel(date),
      slots: DAILY_SLOTS.map((slot) => {
        const key = slotKey(date, slot.id);
        const booked = bookedByKey.get(key) ?? 0;
        return {
          ...slot,
          key,
          date,
          booked,
          remaining: Math.max(0, SLOT_CAPACITY - booked),
          full: booked >= SLOT_CAPACITY,
          startMs: slotStartMs(date, slot.startHour),
          // The slot's whole 2-hour window already finished (e.g. this
          // morning's slot) — booking would fail, so the picker greys it out.
          past: isSlotElapsed(date, slot.startHour, slotTickMs),
        };
      }),
    }));
  }, [dates, slots, slotTickMs]);

  const activeSessions = useMemo(
    () => sessions.filter((s) => s.status === SESSION_STATUS.ACTIVE),
    [sessions]
  );
  const openSessions = useMemo(
    () => activeSessions.filter((s) => isWindowOpen(s)),
    [activeSessions]
  );
  // Booked but the slot's own start time has not arrived yet.
  const upcomingSessions = useMemo(
    () => activeSessions.filter((s) => isUpcoming(s)),
    [activeSessions]
  );
  // No-show ("removed") sessions are intentionally hidden from the farmer —
  // they are removed from the user's view, but kept for the doctor's records.
  const historySessions = useMemo(
    () => sessions.filter((s) => s.status === SESSION_STATUS.CLOSED),
    [sessions]
  );

  return {
    uid,
    loading,
    credits,
    balance: credits?.balance ?? 0,
    creditError,
    slotGrid,
    sessions,
    activeSessions,
    openSessions,
    upcomingSessions,
    historySessions,
    book,
    bookingKey,
    booking: bookingKey !== null,
    actionError,
  };
}
