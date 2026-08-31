// Data hook for the Weather Alert page.
//
//  - Location comes ONLY from the selected crop's stored gpsLocation — this
//    hook never invents coordinates (same contract as useWeatherPage).
//  - Weather is fetched through the existing shared weatherService (15-min
//    in-memory cache); fetching happens once per selected crop, never per
//    render.
//  - Alert detection runs ONCE per weather payload per crop (syncedRef
//    guard), so component re-renders can never re-trigger detection, dedupe
//    checks or webhook sends.
//  - The notification preference is the EXISTING users/{uid}
//    `personaluser.notification` field — toggling here writes that same field
//    (optimistic UI with rollback on failure), so Personalinfo.jsx stays in
//    sync on its next read.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchWeatherForCrop, clearWeatherCache, WEATHER_ERROR_CODES } from "@/services/weatherService";
import { getGpsLocation, cropKey } from "@/lib/cropUtils";
import { detectWeatherAlerts } from "@/lib/alertRules";
import {
  getWeatherAlertPreference,
  setWeatherAlertPreference,
  recordAlert,
  sendAlertNotification,
  getRecentAlerts,
  acknowledgeAlert as ackAlert,
  resolveAlert as resolveAlertDoc,
  expireElapsedAlerts,
} from "@/services/weatherAlertService";

export default function useWeatherAlerts(crops, uid) {
  // All crops with their stable key + resolved GPS (null when missing).
  const located = useMemo(
    () =>
      (crops ?? []).map((crop, index) => ({
        crop,
        index,
        key: cropKey(crop, index),
        gps: getGpsLocation(crop),
      })),
    [crops]
  );

  const withGps = useMemo(() => located.filter((c) => c.gps), [located]);

  // Selection is DERIVED: stored key is user intent; if it no longer exists
  // (crop deleted / no GPS crops) the first located crop is used.
  const [selectedKey, setSelectedKey] = useState(null);
  const effectiveKey = withGps.some((c) => c.key === selectedKey)
    ? selectedKey
    : withGps[0]?.key ?? null;
  const selected = withGps.find((c) => c.key === effectiveKey) ?? null;
  const selectedCropKey = selected?.key ?? null;

  // ---- Weather load (mirrors useWeatherPage) --------------------------------
  const [weatherData, setWeatherData] = useState(null);
  const [dataKey, setDataKey] = useState(null);
  const [errorCode, setErrorCode] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const requestRef = useRef(0);

  const load = useCallback(async (entry, bypassCache) => {
    const id = ++requestRef.current;
    try {
      if (bypassCache) clearWeatherCache();
      const data = await fetchWeatherForCrop(entry.crop, {
        forecastDays: 7,
        hourly: true,
        useCache: !bypassCache,
      });
      if (requestRef.current !== id) return;
      setWeatherData(data);
      setDataKey(entry.key);
    } catch (err) {
      if (requestRef.current !== id) return;
      setWeatherData(null);
      setDataKey(null);
      setErrorCode(err?.code ?? WEATHER_ERROR_CODES.UNAVAILABLE);
      setErrorMessage(err?.message ?? "Weather is unavailable right now.");
    } finally {
      if (requestRef.current === id) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  const loadingRef = useRef(false);
  useEffect(() => {
    if (!selected) return;
    if (!loadingRef.current) {
      loadingRef.current = true;
      queueMicrotask(() => {
        loadingRef.current = false;
        setLoading(true);
        setErrorCode(null);
        setErrorMessage("");
      });
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(selected, false);
  }, [selectedCropKey, selected, load]);

  // Weather is only exposed for the crop it belongs to.
  const weather = dataKey === selectedCropKey ? weatherData : null;

  // ---- Notification preference (existing personaluser.notification field) --
  const [prefEnabled, setPrefEnabled] = useState(false);
  const [prefLoading, setPrefLoading] = useState(true);
  const [prefError, setPrefError] = useState("");
  const prefRef = useRef({ enabled: false, loading: true });

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    (async () => {
      try {
        const enabled = await getWeatherAlertPreference(uid);
        if (cancelled) return;
        prefRef.current = { enabled: Boolean(enabled), loading: false };
        setPrefEnabled(Boolean(enabled));
        setPrefError("");
      } catch (err) {
        if (cancelled) return;
        console.error("weather alerts: failed to read preference:", err);
        prefRef.current = { enabled: false, loading: false };
        setPrefError("Could not load your notification preference.");
      } finally {
        if (!cancelled) setPrefLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uid]);

  // Optimistic toggle — reverts when the Firestore write fails.
  const togglePreference = useCallback(async () => {
    if (!uid || prefRef.current.loading) return;
    const next = !prefRef.current.enabled;
    prefRef.current = { ...prefRef.current, enabled: next };
    setPrefEnabled(next);
    setPrefError("");
    try {
      await setWeatherAlertPreference(uid, next);
    } catch (err) {
      console.error("weather alerts: preference update failed:", err);
      prefRef.current = { ...prefRef.current, enabled: !next };
      setPrefEnabled(!next);
      setPrefError("Could not save the setting — please try again.");
    }
  }, [uid]);

  // ---- Alert store -----------------------------------------------------------
  const [alerts, setAlerts] = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [historyCursor, setHistoryCursor] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [actionError, setActionError] = useState("");
  // Monotonic "now" captured outside render (async callbacks only) so the
  // upcoming/current split stays pure during rendering.
  const [checkedAt, setCheckedAt] = useState(0);
  // Detection runs once per weather payload per crop — re-renders never
  // re-trigger dedupe checks or webhook sends.
  const syncedRef = useRef(null);

  const refreshAlerts = useCallback(async () => {
    if (!uid) return;
    setAlertsLoading(true);
    try {
      const nowMs = Date.now();
      const { alerts: recent, nextCursor } = await getRecentAlerts(uid, { limitTo: 15 });
      await expireElapsedAlerts(uid, recent, nowMs);
      const expiredIds = new Set(
        recent
          .filter((a) => a.status === "active" || a.status === "acknowledged")
          .filter((a) => typeof a.endTime === "number" && a.endTime < nowMs)
          .map((a) => a.id)
      );
      setAlerts(
        recent.map((a) => (expiredIds.has(a.id) ? { ...a, status: "expired" } : a))
      );
      setHistoryCursor(nextCursor);
      setCheckedAt(nowMs);
    } catch (err) {
      console.error("weather alerts: failed to load alerts:", err);
    } finally {
      setAlertsLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    // refreshAlerts() only queues setState after awaited reads resolve — the
    // same accepted pattern as useWeatherPage's load() call.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshAlerts();
  }, [refreshAlerts]);

  const loadOlder = useCallback(async () => {
    if (!uid || !historyCursor) return;
    try {
      const { alerts: older, nextCursor } = await getRecentAlerts(uid, {
        limitTo: 10,
        cursor: historyCursor,
      });
      setAlerts((prev) => [...prev, ...older]);
      setHistoryCursor(nextCursor);
    } catch (err) {
      console.error("weather alerts: failed to load older alerts:", err);
    }
  }, [uid, historyCursor]);

  // Detect -> dedupe -> persist -> (notify when enabled). Runs at most once
  // per weather payload per selected crop. prefLoading is a dep so detection
  // also runs when the preference resolves AFTER the weather payload.
  useEffect(() => {
    if (!weather || !uid || !selected || prefLoading) return;
    const syncKey = `${selected.key}@${weather.fetchedAt}`;
    if (syncedRef.current === syncKey) return;
    syncedRef.current = syncKey;

    let cancelled = false;
    (async () => {
      setSyncing(true);
      try {
        const detections = detectWeatherAlerts(weather, selected.key, selected.crop);
        const notificationsEnabled = prefRef.current.enabled;
        for (const detection of detections) {
          if (cancelled) return;
          const enriched = {
            ...detection,
            cropName: selected.crop?.CropName ?? null,
            location: selected.gps
              ? {
                  latitude: selected.gps.lat,
                  longitude: selected.gps.lon,
                  name: selected.crop?.CropName ?? null,
                }
              : null,
          };
          const { alert, created } = await recordAlert(uid, enriched, {
            notificationsEnabled,
          });
          // Webhook: only for brand-new alerts, only when enabled, only once.
          if (created && notificationsEnabled && !alert.notificationSent) {
            await sendAlertNotification(uid, alert);
          }
        }
        if (!cancelled) setLastSync(Date.now());
      } catch (err) {
        console.error("weather alerts: detection sync failed:", err);
      } finally {
        if (!cancelled) setSyncing(false);
        refreshAlerts();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [weather, uid, selected, prefLoading, refreshAlerts]);

  // ---- Alert actions ---------------------------------------------------------
  const patchLocal = (alertId, patch) =>
    setAlerts((prev) => prev.map((a) => (a.id === alertId ? { ...a, ...patch } : a)));

  const acknowledge = useCallback(
    async (alertId) => {
      setActionError("");
      patchLocal(alertId, { status: "acknowledged", acknowledgedAt: Date.now() });
      try {
        await ackAlert(uid, alertId);
      } catch (err) {
        console.error("weather alerts: acknowledge failed:", err);
        setActionError("Could not acknowledge the alert — please try again.");
        refreshAlerts();
      }
    },
    [uid, refreshAlerts]
  );

  const resolve = useCallback(
    async (alertId) => {
      setActionError("");
      patchLocal(alertId, { status: "resolved", resolvedAt: Date.now() });
      try {
        await resolveAlertDoc(uid, alertId);
      } catch (err) {
        console.error("weather alerts: resolve failed:", err);
        setActionError("Could not resolve the alert — please try again.");
        refreshAlerts();
      }
    },
    [uid, refreshAlerts]
  );

  // ---- Refresh (weather + alerts) -------------------------------------------
  const refresh = useCallback(() => {
    if (selected && !loading && !refreshing) {
      setRefreshing(true);
      setErrorCode(null);
      setErrorMessage("");
      load(selected, true);
    }
    refreshAlerts();
  }, [selected, loading, refreshing, load, refreshAlerts]);

  // ---- Derived lists for the selected crop (alerts never mix between crops) -
  const cropAlerts = useMemo(
    () => (selectedCropKey ? alerts.filter((a) => a.cropScope === selectedCropKey) : []),
    [alerts, selectedCropKey]
  );
  const activeAlerts = useMemo(
    () => cropAlerts.filter((a) => a.status === "active" || a.status === "acknowledged"),
    [cropAlerts]
  );
  const upcomingAlerts = useMemo(() => {
    if (!checkedAt) return [];
    return activeAlerts.filter(
      (a) => typeof a.startTime === "number" && a.startTime > checkedAt
    );
  }, [activeAlerts, checkedAt]);
  const currentAlerts = useMemo(() => {
    if (!checkedAt) return activeAlerts;
    return activeAlerts.filter(
      (a) => !(typeof a.startTime === "number" && a.startTime > checkedAt)
    );
  }, [activeAlerts, checkedAt]);
  const historyAlerts = useMemo(
    () => cropAlerts.filter((a) => a.status === "resolved" || a.status === "expired"),
    [cropAlerts]
  );

  return {
    crops: located,
    withGps,
    selected,
    selectedKey: effectiveKey,
    setSelectedKey,
    weather,
    errorCode,
    errorMessage,
    loading,
    refreshing,
    refresh,
    prefEnabled,
    prefLoading,
    prefError,
    togglePreference,
    alerts: cropAlerts,
    alertsLoading,
    activeAlerts,
    currentAlerts,
    upcomingAlerts,
    historyAlerts,
    loadOlder,
    historyCursor,
    acknowledge,
    resolve,
    actionError,
    syncing,
    lastSync,
  };
}
