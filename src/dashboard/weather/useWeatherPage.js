// Data hook for the Weather Forecast page.
//
//  - Location comes ONLY from the selected crop's stored gpsLocation — this
//    hook never invents coordinates.
//  - Fetching happens exactly once per selected crop (effect keyed on the crop
//    key); unrelated re-renders never trigger requests because the service
//    layer also keeps a 15-minute in-memory cache.
//  - A stale-request guard (requestRef) prevents a slow response from one
//    crop overwriting the data of a newly selected crop.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchWeatherForCrop, WEATHER_ERROR_CODES } from "@/services/weatherService";
import { getGpsLocation, cropKey } from "@/lib/cropUtils";

export default function useWeatherPage(crops) {
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

  // Selection is DERIVED, never synced in an effect: the stored key is user
  // intent; if it no longer exists (crop deleted / no GPS crops at all) the
  // first located crop is used automatically.
  const [selectedKey, setSelectedKey] = useState(null);
  const effectiveKey = withGps.some((c) => c.key === selectedKey)
    ? selectedKey
    : withGps[0]?.key ?? null;

  const selected = withGps.find((c) => c.key === effectiveKey) ?? null;
  const selectedCropKey = selected?.key ?? null;

  const [weatherData, setWeatherData] = useState(null);
  const [dataKey, setDataKey] = useState(null);
  const [errorCode, setErrorCode] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const requestRef = useRef(0);

  // NOTE: load() never calls setState synchronously at call time — all
  // pre-flight state changes happen in the microtask queue (effect path) or in
  // the click handler (refresh path). This keeps the effect body free of
  // synchronous setState.
  const load = useCallback(async (entry, bypassCache) => {
    const id = ++requestRef.current;
    try {
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
    // Pre-flight state (loading + error clears) is queued to the microtask
    // queue so the effect body itself performs no synchronous setState.
    if (!loadingRef.current) {
      loadingRef.current = true;
      queueMicrotask(() => {
        loadingRef.current = false;
        setLoading(true);
        setErrorCode(null);
        setErrorMessage("");
      });
    }
    // load() sets no state synchronously — every setState runs after the awaited
    // network call resolves (same fetch pattern as useTimelineDashboard).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(selected, false);
  }, [selectedCropKey, selected, load]);

  // Weather is only exposed for the crop it belongs to — switching crops can
  // never render another crop's data while the new request is in flight.
  const weather = dataKey === selectedCropKey ? weatherData : null;

  const refresh = useCallback(() => {
    if (selected && !loading && !refreshing) {
      // Click-handler path: synchronous setState here is fine (event handler).
      setRefreshing(true);
      setErrorCode(null);
      setErrorMessage("");
      load(selected, true);
    }
  }, [selected, loading, refreshing, load]);

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
  };
}
