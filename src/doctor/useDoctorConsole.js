// Data hook for the doctor console.
//
// Mirrors useAgriDoctor's contract (all Firestore access lives here, components
// stay presentational) but subscribes to EVERY farmer's sessions so the doctor
// can triage the whole queue. The lifecycle sweep runs on the same 30s cadence
// here too, so an idle doctor tab still closes elapsed windows and clears
// no-shows even when no farmer has the page open.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  subscribeAllSessions,
  sweepSessions,
  SESSION_STATUS,
} from "@/services/agriDoctorService";
import { isWindowOpen, isUpcoming } from "@/dashboard/agridoctor/agriDoctorSlots";

const SWEEP_INTERVAL_MS = 30_000;

export const DOCTOR_FILTERS = {
  OPEN: "open", // everything still to handle — live windows + booked slots
  UNREAD: "unread", // farmer messaged, doctor hasn't opened yet
  ALL: "all",
  CLOSED: "closed", // attended + window elapsed (read-only history)
  REMOVED: "removed", // no-shows
};

export default function useDoctorConsole() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState(DOCTOR_FILTERS.OPEN);

  const mountedRef = useRef(true);
  const sweepingRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // ---- Live queue of every consultation -----------------------------------
  useEffect(() => {
    const unsub = subscribeAllSessions(
      (list) => {
        if (!mountedRef.current) return;
        setSessions(list);
        setError("");
        setLoading(false);
      },
      (err) => {
        if (!mountedRef.current) return;
        // permission-denied here almost always means the doctor Firestore rule
        // (DOCTOR_EMAIL provision) is not active for this session.
        const denied = err?.code === "permission-denied";
        setError(
          denied
            ? "Access denied. The doctor Firestore rule is not active for this session."
            : "Could not load consultations."
        );
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // ---- Lifecycle sweep (close attended / remove no-shows) ------------------
  const runSweep = useCallback(async () => {
    if (sweepingRef.current || sessions.length === 0) return;
    const nowMs = Date.now();
    const hasElapsed = sessions.some(
      (s) => s.status === SESSION_STATUS.ACTIVE && typeof s.endMs === "number" && s.endMs < nowMs
    );
    if (!hasElapsed) return;
    sweepingRef.current = true;
    try {
      await sweepSessions(sessions, nowMs);
    } catch (err) {
      console.error("doctorConsole: sweep failed:", err);
    } finally {
      sweepingRef.current = false;
    }
  }, [sessions]);

  useEffect(() => {
    runSweep();
    const id = setInterval(runSweep, SWEEP_INTERVAL_MS);
    return () => clearInterval(id);
  }, [runSweep]);

  // ---- Derived buckets -----------------------------------------------------
  const activeSessions = useMemo(
    () => sessions.filter((s) => s.status === SESSION_STATUS.ACTIVE),
    [sessions]
  );
  // Window is live right now — the farmer can already send messages.
  const openSessions = useMemo(
    () => activeSessions.filter((s) => isWindowOpen(s)),
    [activeSessions]
  );
  // Booked, but the slot's own start time has not arrived yet.
  const upcomingSessions = useMemo(
    () => activeSessions.filter((s) => isUpcoming(s)),
    [activeSessions]
  );
  // The doctor's triage queue must NOT drop a booking just because its slot has
  // not started yet (otherwise an 11:00 slot booked at 08:00 would be invisible
  // until 11:00). Live windows come first — they need a reply now — sorted by
  // the soonest closing time; upcoming slots follow, sorted by start time.
  const queueSessions = useMemo(() => {
    const rank = (s) => (isWindowOpen(s) ? 0 : 1);
    return [...activeSessions].sort((a, b) => {
      const byRank = rank(a) - rank(b);
      if (byRank !== 0) return byRank;
      const aMs = rank(a) === 0 ? (a.endMs ?? 0) : (a.startMs ?? 0);
      const bMs = rank(b) === 0 ? (b.endMs ?? 0) : (b.startMs ?? 0);
      return aMs - bMs;
    });
  }, [activeSessions]);
  const unreadSessions = useMemo(
    () => sessions.filter((s) => (s.unreadForDoctor ?? 0) > 0),
    [sessions]
  );
  const closedSessions = useMemo(
    () => sessions.filter((s) => s.status === SESSION_STATUS.CLOSED),
    [sessions]
  );
  const removedSessions = useMemo(
    () => sessions.filter((s) => s.status === SESSION_STATUS.REMOVED),
    [sessions]
  );

  const totalUnread = useMemo(
    () => sessions.reduce((sum, s) => sum + (s.unreadForDoctor ?? 0), 0),
    [sessions]
  );

  const visibleSessions = useMemo(() => {
    switch (filter) {
      case DOCTOR_FILTERS.OPEN:
        return queueSessions;
      case DOCTOR_FILTERS.UNREAD:
        return unreadSessions;
      case DOCTOR_FILTERS.CLOSED:
        return closedSessions;
      case DOCTOR_FILTERS.REMOVED:
        return removedSessions;
      default:
        return sessions;
    }
  }, [filter, queueSessions, unreadSessions, closedSessions, removedSessions, sessions]);

  return {
    loading,
    error,
    sessions,
    filter,
    setFilter,
    visibleSessions,
    queueSessions,
    activeSessions,
    openSessions,
    upcomingSessions,
    unreadSessions,
    closedSessions,
    removedSessions,
    totalUnread,
  };
}
