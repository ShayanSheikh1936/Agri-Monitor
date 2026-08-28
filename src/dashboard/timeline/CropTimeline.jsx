import { useEffect, useRef, useState } from "react";
import { CalendarDays, RefreshCw, Sparkles, Sprout } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "../../features/auth/authContext";
import { cropKey, getPlantAgeDays, formatDate } from "@/lib/cropUtils";
import {
  getTimeline,
  getTimelineEvents,
} from "@/services/timelineService";
import { generateCropTimeline, reviewCropTimeline } from "@/services/timelineGenerator";
import { buildCropAIContext } from "@/services/aiContextBuilder";

// Local yyyy-mm-dd helpers for the bounded event window query.
function isoOf(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function windowStart() {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  return isoOf(weekAgo);
}

const PRIORITY_STYLES = {
  high: "bg-red-100 text-red-700 border-red-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  low: "bg-[#D7E8C0] text-emerald-800 border-emerald-200",
};

// Bounded event read: recent window first, falling back to the earliest
// stages when nothing falls inside the window. Never throws.
async function loadStoredEvents(uid, key, eventCount) {
  if (!(eventCount > 0)) return { events: [], failed: false };
  try {
    const result = await getTimelineEvents(uid, key, {
      startDate: windowStart(),
      limitTo: 14,
    });
    if (result.events.length > 0) return { events: result.events, failed: false };
    const fallback = await getTimelineEvents(uid, key, { limitTo: 14 });
    return { events: fallback.events, failed: false };
  } catch {
    return { events: [], failed: true };
  }
}

// Personalized crop lifecycle timeline. Loads stored events (bounded query,
// only when the selected crop changes) and offers explicit generation/retry —
// generation NEVER runs automatically on render.
export default function CropTimeline({ crop, cropIndex = 0 }) {
  const { currentUser } = useAuth();
  const ageDays = getPlantAgeDays(crop);
  const key = cropKey(crop, cropIndex);

  const [meta, setMeta] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [reviewNote, setReviewNote] = useState(null);
  const [genError, setGenError] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const requestRef = useRef(0);

  // Re-read meta + bounded events (used by initial load, generate, review).
  const reloadStored = async () => {
    try {
      const timelineMeta = await getTimeline(currentUser.uid, key);
      setMeta(timelineMeta);
      const { events: reloaded, failed } = await loadStoredEvents(
        currentUser.uid,
        key,
        timelineMeta?.eventCount
      );
      setEvents(reloaded);
      setLoadError(failed);
    } catch {
      /* keep previous state */
    }
  };

  // Load stored timeline — a read of at most 1 meta doc + 14 bounded events.
  useEffect(() => {
    if (!currentUser?.uid) return;
    const requestId = ++requestRef.current;
    setLoading(true);
    setGenError(null);

    (async () => {
      let timelineMeta = null;
      try {
        timelineMeta = await getTimeline(currentUser.uid, key);
      } catch {
        timelineMeta = null;
      }
      const { events: timelineEvents, failed } = await loadStoredEvents(
        currentUser.uid,
        key,
        timelineMeta?.eventCount
      );
      if (requestRef.current === requestId) {
        setMeta(timelineMeta);
        setEvents(timelineEvents);
        setLoadError(failed);
      }
    })().finally(() => {
      if (requestRef.current === requestId) setLoading(false);
    });
  }, [currentUser?.uid, key]);

  // Explicit generation — only on user click, never on render.
  const handleGenerate = async () => {
    if (generating || !currentUser?.uid) return;
    setGenerating(true);
    setGenError(null);
    try {
      const context = await buildCropAIContext(key, {
        uid: currentUser.uid,
        cropEntry: crop,
        index: cropIndex,
      });
      const result = await generateCropTimeline(context);
      if (!result.ok) {
        setGenError(result.error?.message ?? "Timeline generation failed.");
      }
    } catch (err) {
      setGenError(err.message ?? "Timeline generation failed.");
    } finally {
      setGenerating(false);
      // Reload stored state regardless of outcome
      await reloadStored();
    }
  };

  // Manual intelligent review — surgical updates to future events only;
  // completed history is never touched.
  const handleReview = async () => {
    if (reviewing || generating || !currentUser?.uid) return;
    setReviewing(true);
    setReviewNote(null);
    const result = await reviewCropTimeline(currentUser.uid, key, {
      trigger: "manual",
      force: true,
    });
    if (!result.ok) {
      setReviewNote(result.error?.message ?? "Timeline review failed.");
    } else if (!result.changesNeeded) {
      setReviewNote("AI reviewed the timeline — no changes were needed.");
    } else {
      const parts = [];
      if (result.updated) parts.push(`updated ${result.updated} event(s)`);
      if (result.added) parts.push(`added ${result.added} follow-up(s)`);
      setReviewNote(
        `AI ${parts.join(" and ") || "reviewed the timeline"} — ${result.reason}`
      );
    }
    await reloadStored();
    setReviewing(false);
  };

  const hasTimeline = events.length > 0;
  const failedBefore = Boolean(meta?.lastGenerationError);
  const todayIso = isoOf(new Date());

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[16px]">
          <CalendarDays size={17} className="text-[var(--text1)]" />
          Crop Timeline
          {meta?.expectedHarvestDate && (
            <Badge variant="secondary" className="ml-auto">
              Harvest ~ {formatDate(meta.expectedHarvestDate)}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          A personalized stage-by-stage timeline, generated from this crop's
          profile, local weather and AI agronomy.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative pl-6">
          {/* Vertical track */}
          <span className="absolute left-[7px] top-1 bottom-1 w-[2px] rounded bg-[var(--text1)]/25" />

          {/* Real marker: crop registration */}
          <div className="relative pb-4">
            <span className="absolute -left-6 top-0.5 w-4 h-4 rounded-full border-2 border-[var(--text1)] bg-[#D7E8C0]" />
            <p className="text-[14px] font-semibold text-black">
              Crop registered
            </p>
            <p className="text-[12px] text-black/55">
              {formatDate(crop.createdAt) ?? "Date unknown"}
              {ageDays != null && ` — currently day ${ageDays}`}
            </p>
          </div>

          {/* Loading state */}
          {loading && (
            <div className="relative">
              <span className="absolute -left-6 top-0.5 w-4 h-4 rounded-full border-2 border-dashed border-[var(--text1)]/50 bg-[var(--bg)] animate-pulse" />
              <p className="text-[13px] text-black/45">Loading timeline…</p>
            </div>
          )}

          {/* Generated stages (bounded recent window) */}
          {!loading &&
            events.map((event) => {
              const isToday = event.date === todayIso;
              return (
                <div key={event.id} className="relative pb-4">
                  <span
                    className={`absolute -left-6 top-0.5 w-4 h-4 rounded-full border-2 ${
                      isToday
                        ? "border-[var(--text1)] bg-[var(--text1)]"
                        : event.status === "completed"
                          ? "border-[var(--text1)] bg-[#D7E8C0]"
                          : "border-[var(--text1)]/60 bg-[var(--bg)]"
                    }`}
                  />
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="text-[14px] font-semibold text-black">
                      Day {event.dayNumber} · {event.title}
                    </p>
                    {event.stage && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {event.stage}
                      </Badge>
                    )}
                    <span
                      className={`text-[10px] px-1.5 py-0 rounded-full border ${PRIORITY_STYLES[event.priority] ?? PRIORITY_STYLES.medium}`}
                    >
                      {event.priority}
                    </span>
                    {event.isEstimated && (
                      <span className="text-[10px] text-black/40 italic">estimated</span>
                    )}
                    {Array.isArray(event.history) && event.history.length > 0 && (
                      <span
                        className="text-[10px] text-amber-700 italic"
                        title={
                          event.history[event.history.length - 1]?.reason ??
                          "Updated by an AI timeline review"
                        }
                      >
                        updated ×{event.history.length}
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] text-black/55">
                    {event.date ? formatDate(event.date) : "Date unknown"}
                    {isToday && " — today"}
                  </p>
                  {event.description && (
                    <p className="text-[12px] text-black/70 mt-0.5 leading-4">
                      {event.description}
                    </p>
                  )}
                </div>
              );
            })}

          {/* Stored stages exist but could not be loaded */}
          {!loading && !hasTimeline && !generating && loadError && (
            <div className="relative">
              <span className="absolute -left-6 top-0.5 w-4 h-4 rounded-full border-2 border-dashed border-red-400 bg-[var(--bg)]" />
              <p className="text-[13px] text-red-600">
                Stored stages could not be loaded right now — check your
                connection and refresh the page.
              </p>
            </div>
          )}

          {/* No timeline yet — explicit generate action */}
          {!loading && !hasTimeline && !generating && !loadError && (
            <div className="relative">
              <span className="absolute -left-6 top-0.5 w-4 h-4 rounded-full border-2 border-dashed border-[var(--text1)]/50 bg-[var(--bg)]" />
              <p className="text-[14px] font-semibold text-black/45">
                Growth stages will appear here
              </p>
              <p className="text-[12px] text-black/45 mb-2">
                Germination → Vegetative → Flowering → Maturity, with dates
                personalized for {crop.CropName || "this crop"}.
              </p>
              <button
                type="button"
                onClick={handleGenerate}
                className="inline-flex items-center gap-1.5 bg-[var(--text1)] hover:bg-[#4a7028] text-white text-[13px] font-semibold px-3 py-1.5 rounded-xl cursor-pointer transition-colors"
              >
                <Sparkles size={14} />
                {failedBefore ? "Retry Timeline Generation" : "Generate Timeline"}
              </button>
              {failedBefore && !genError && (
                <p className="text-[11px] text-red-600 mt-1.5">
                  Previous attempt failed: {meta.lastGenerationError}
                </p>
              )}
            </div>
          )}

          {/* Generating state */}
          {generating && (
            <div className="relative">
              <span className="absolute -left-6 top-0.5 w-4 h-4 rounded-full border-2 border-[var(--text1)] border-t-transparent animate-spin" />
              <p className="text-[13px] font-semibold text-black/70">
                Generating personalized timeline… (can take up to a minute)
              </p>
            </div>
          )}

          {genError && (
            <p className="text-[12px] text-red-600 mt-1">{genError}</p>
          )}
        </div>

        {hasTimeline && meta?.currentStage && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-[#D7E8C0]/40 px-3 py-2 text-[13px] text-black/65">
            <Sprout size={15} className="shrink-0 text-[var(--text1)]" />
            Current stage: <strong>{meta.currentStage}</strong>
            {meta.status !== "active" && (
              <Badge variant="secondary" className="ml-auto">
                {meta.status}
              </Badge>
            )}
          </div>
        )}

        {/* Intelligent review — updates future events only, keeps history */}
        {hasTimeline && (
          <div className="mt-3">
            <button
              type="button"
              onClick={handleReview}
              disabled={reviewing || generating}
              className="inline-flex items-center gap-1.5 border border-[var(--text1)]/50 text-[var(--text1)] hover:bg-[#D7E8C0]/50 text-[12px] font-semibold px-3 py-1.5 rounded-xl cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw size={13} className={reviewing ? "animate-spin" : ""} />
              {reviewing ? "Reviewing timeline…" : "AI Review Timeline"}
            </button>
            <p className="mt-1 text-[11px] text-black/45">
              Checks new activities, observations and weather against the plan
              and adjusts only future events — completed history is preserved.
            </p>
            {reviewNote && (
              <p className="mt-1.5 rounded-xl bg-[#D7E8C0]/50 px-3 py-2 text-[12px] text-black/70">
                {reviewNote}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
