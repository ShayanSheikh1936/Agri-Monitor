// Data hook for the Disaster Alerts page — mirrors the useWeatherAlerts
// contract: components never fetch directly, every load is guarded by a
// request counter so stale responses can never overwrite newer ones.
//
// User preferences (region, disaster categories, minimum severity,
// notification channels) are loaded from disasterAlertService and drive the
// filtering of active alerts shown on the page.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  fetchDisasterFeed,
  getDisasterRegions,
  getDisasterPreferences,
  saveDisasterPreferences,
  DISASTER_ERROR_CODES,
} from "@/services/disasterAlertService";
import { severityMeta } from "./disasterMeta";

const RISK_ORDER = { extreme: 4, high: 3, moderate: 2, low: 1 };

function alertRank(alert) {
  const severity = severityMeta(alert.severity).rank;
  const risk = RISK_ORDER[alert.riskLevel] ?? 2;
  return severity * 10 + risk;
}

export default function useDisasterAlerts() {
  const regions = useMemo(() => getDisasterRegions(), []);

  // ---- Preferences ------------------------------------------------------------
  const [prefs, setPrefs] = useState(() => getDisasterPreferences());
  const [regionId, setRegionId] = useState(() => {
    const saved = getDisasterPreferences().regionId;
    return getDisasterRegions().some((r) => r.id === saved)
      ? saved
      : getDisasterRegions()[0].id;
  });

  // ---- Feed load ----------------------------------------------------------------
  const [feed, setFeed] = useState(null); // { region, alerts, history, generatedAt }
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null); // { code, message }
  const requestRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const load = useCallback(async (rid, { bypass = false } = {}) => {
    const id = ++requestRef.current;
    if (bypass) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await fetchDisasterFeed({ regionId: rid });
      if (requestRef.current !== id || !mountedRef.current) return;
      setFeed(data);
    } catch (err) {
      if (requestRef.current !== id || !mountedRef.current) return;
      setFeed(null);
      setError({
        code: err?.code ?? DISASTER_ERROR_CODES.UNAVAILABLE,
        message: err?.message ?? "The disaster feed is unavailable.",
      });
    } finally {
      if (requestRef.current === id && mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    // load() only queues setState after the awaited fetch resolves — the
    // same accepted pattern as useWeatherAlerts' feed loads.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(regionId);
  }, [regionId, load]);

  const refresh = useCallback(() => load(regionId, { bypass: true }), [load, regionId]);

  // ---- Derived alert sets -------------------------------------------------------
  const sortedAlerts = useMemo(
    () => [...(feed?.alerts ?? [])].sort((a, b) => alertRank(b) - alertRank(a)),
    [feed]
  );

  // Preference filters (categories + minimum severity) apply to what is shown.
  const minRank = severityMeta(prefs.minSeverity).rank;
  const visibleAlerts = useMemo(
    () =>
      sortedAlerts.filter(
        (a) =>
          prefs.disasterTypes.includes(a.type) &&
          severityMeta(a.severity).rank >= minRank
      ),
    [sortedAlerts, prefs.disasterTypes, minRank]
  );
  const hiddenCount = sortedAlerts.length - visibleAlerts.length;

  // Most serious alert for the critical banner (critical/high only).
  const criticalAlert = useMemo(() => {
    const top = visibleAlerts[0] ?? null;
    if (!top) return null;
    const rank = severityMeta(top.severity).rank;
    return rank >= 3 ? top : null;
  }, [visibleAlerts]);

  // ---- Preferences actions ------------------------------------------------------
  const updatePrefs = useCallback((patch) => {
    setPrefs((prev) => ({ ...prev, ...patch }));
  }, []);

  const savePrefs = useCallback(
    (draft) => {
      const next = { ...prefs, ...draft, regionId };
      saveDisasterPreferences(next);
      setPrefs(next);
      return next;
    },
    [prefs, regionId]
  );

  return {
    regions,
    region: feed?.region ?? regions.find((r) => r.id === regionId) ?? null,
    regionId,
    setRegionId,
    alerts: sortedAlerts, // unfiltered (map + counts use full picture)
    visibleAlerts,
    hiddenCount,
    criticalAlert,
    history: feed?.history ?? [],
    lastUpdated: feed?.generatedAt ?? null,
    loading,
    refreshing,
    error,
    refresh,
    retry: () => load(regionId),
    prefs,
    updatePrefs,
    savePrefs,
  };
}
