import { useCallback, useEffect, useRef, useState } from "react";
import {
  findCropTimeline,
  getTodayEvents,
  getTimelineEvents,
  getUpcomingEvents,
  getRecentActivities,
  getRecentObservations,
  getRecentAnalyses,
} from "../../services/timelineService";
import { fetchWeatherForCrop } from "../../services/weatherService";
import { localDateISO, getGenerationState, cropKeySuffix } from "../../lib/cropUtils";

// =============================================================================
// useTimelineDashboard — read-only dashboard data assembly.
//
//  - NEVER writes, NEVER regenerates AI data — only reads what was persisted.
//  - Bounded reads only: 1 meta doc + ≤10 today + ≤10 tomorrow + ≤7 upcoming
//    + 5 activities + 5 observations + 3 analyses + 1 cached weather call.
//  - Every read is isolated (Promise.allSettled): one failing source never
//    blanks the others.
//  - Subcollection reads are skipped entirely when the meta doc says there
//    are no events (no wasted queries for crops without a timeline).
// =============================================================================

const EMPTY = {
  meta: null,
  cropId: null,
  today: [],
  tomorrow: [],
  upcoming: [],
  activities: [],
  observations: [],
  analyses: [],
  weather: null,
  weatherError: null,
};

export default function useTimelineDashboard(uid, crop, cropId) {
  const [data, setData] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const requestRef = useRef(0);

  const reload = useCallback(async () => {
    if (!uid || !cropId || !crop) {
      setData(EMPTY);
      setLoading(false);
      return;
    }
    const requestId = ++requestRef.current;
    setLoading(true);

    // Meta + weather are independent — parallel, neither fatal to the other.
    // Meta is resolved across candidate keys so a timeline survives the index
    // shift caused by deleting another crop (one read in the common case).
    const [metaRes, weatherRes] = await Promise.allSettled([
      findCropTimeline(uid, cropId, cropKeySuffix(crop)),
      fetchWeatherForCrop(crop, { forecastDays: 5 }),
    ]);
    const resolved = metaRes.status === "fulfilled" ? metaRes.value : null;
    const effCropId = resolved?.cropId ?? cropId;
    const meta = resolved?.meta ?? null;
    const weather = weatherRes.status === "fulfilled" ? weatherRes.value : null;
    const weatherError =
      weatherRes.status === "rejected"
        ? (weatherRes.reason?.code ?? "WEATHER_UNKNOWN")
        : null;

    let today = [];
    let tomorrow = [];
    let upcoming = [];
    let activities = [];
    let observations = [];
    let analyses = [];

    if (meta) {
      const hasEvents = Number(meta.eventCount ?? 0) > 0;
      const reads = [
        ...(hasEvents
          ? [
              getTodayEvents(uid, effCropId),
              getTimelineEvents(uid, effCropId, {
                startDate: localDateISO(1),
                endDate: localDateISO(1),
                limitTo: 10,
              }),
              getUpcomingEvents(uid, effCropId, 7),
            ]
          : []),
        getRecentActivities(uid, effCropId, 5),
        getRecentObservations(uid, effCropId, 5),
        getRecentAnalyses(uid, effCropId, 3),
      ];
      const results = await Promise.allSettled(reads);
      const pick = (i) =>
        results[i]?.status === "fulfilled" ? results[i].value : [];
      if (hasEvents) {
        today = pick(0);
        tomorrow = pick(1);
        upcoming = pick(2);
        activities = pick(3);
        observations = pick(4);
        analyses = pick(5);
      } else {
        activities = pick(0);
        observations = pick(1);
        analyses = pick(2);
      }
    }

    if (requestRef.current === requestId) {
      setData({
        meta,
        cropId: effCropId,
        today,
        tomorrow,
        upcoming,
        activities,
        observations,
        analyses,
        weather,
        weatherError,
      });
      setLoading(false);
    }
  }, [uid, cropId, crop]);

  useEffect(() => {
    reload();
  }, [reload]);

  return {
    ...data,
    // Resolved cropId (may differ from the derived key after an index shift);
    // write-capable children must use this id.
    cropId: data.cropId ?? cropId,
    loading,
    reload,
    generationState: getGenerationState(data.meta),
    nextMilestone: data.upcoming[0] ?? null,
  };
}
