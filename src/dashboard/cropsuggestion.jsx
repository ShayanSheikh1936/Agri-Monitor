import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { Plus, RefreshCw, Loader2, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "../features/auth/authContext";
import { cropKey, getPlantAgeDays, getHealthStatus, HEALTH_LABELS } from "@/lib/cropUtils";
import useDayTick from "@/lib/useDayTick";
import useTimelineDashboard from "./timeline/useTimelineDashboard";
import { getAnalysesPage } from "@/services/timelineService";
import { generateCropRecommendations } from "@/services/timelineGenerator";
import CropSelectorBar from "./CropSelectorBar";
// Reused timeline cards, relocated here (single source of truth — no copies).
import AIRecommendationCard from "./timeline/AIRecommendationCard";
import CropImageAnalysis from "./timeline/CropImageAnalysis";
import IrrigationCard from "./timeline/IrrigationCard";
import SoilCard from "./timeline/SoilCard";
import AskAI from "./timeline/AskAI";
// Suggestion-page components.
import SuggestionContextBar from "./suggestion/SuggestionContextBar";
import RecommendationSections from "./suggestion/RecommendationSections";
import RecommendationHistory from "./suggestion/RecommendationHistory";

const PAGE_SIZE = 6;

// Crop Suggestion — "what should I do next for this crop?" Recommendation
// focused, not timeline focused. Reads the SAME persisted crop/timeline data
// as the other pages; refreshed recommendations are generated on demand only.
export default function CropSuggestionPage() {
  const { userData, userCropData } = useOutletContext();
  // Keeps "Day N" labels in sync when the tab stays open past midnight.
  useDayTick();
  const { currentUser } = useAuth();
  const crops = userCropData?.crops ?? [];
  const [selectedIndex, setSelectedIndex] = useState(0);

  const safeIndex =
    crops.length > 0 ? Math.min(selectedIndex, crops.length - 1) : 0;
  const crop = crops[safeIndex] ?? null;
  const key = crop ? cropKey(crop, safeIndex) : null;

  const dash = useTimelineDashboard(currentUser?.uid ?? null, crop, key);
  const effectiveKey = dash.cropId ?? key;

  // ---- Recommendation/analysis history (single read path, cursor pages) ----
  const [historyDocs, setHistoryDocs] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const historyRef = useRef(0);
  const uid = currentUser?.uid ?? null;

  const loadFirstPage = useCallback(async () => {
    if (!uid || !effectiveKey) return;
    const requestId = ++historyRef.current;
    setHistoryLoading(true);
    setHistoryDocs([]);
    setNextCursor(null);
    try {
      const page = await getAnalysesPage(uid, effectiveKey, {
        count: PAGE_SIZE,
      });
      if (historyRef.current === requestId) {
        setHistoryDocs(page.analyses);
        setNextCursor(page.nextCursor);
      }
    } catch {
      if (historyRef.current === requestId) setHistoryDocs([]);
    } finally {
      if (historyRef.current === requestId) setHistoryLoading(false);
    }
  }, [uid, effectiveKey]);

  // Effect-driven data loading — same established pattern as
  // useTimelineDashboard (its reload() effect is flagged identically).
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    loadFirstPage();
  }, [loadFirstPage]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function handleLoadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await getAnalysesPage(uid, effectiveKey, {
        count: PAGE_SIZE,
        cursor: nextCursor,
      });
      setHistoryDocs((prev) => [...prev, ...page.analyses]);
      setNextCursor(page.nextCursor);
    } catch {
      /* keep what we already have */
    } finally {
      setLoadingMore(false);
    }
  }

  // Latest persisted recommendation batch (first "recommendation" doc).
  const latestRecommendation =
    historyDocs.find((d) => d.kind === "recommendation") ?? null;

  // ---- On-demand refresh (cooldown-protected, never per render) ----
  const [refreshing, setRefreshing] = useState(false);
  const [refreshNote, setRefreshNote] = useState(null);
  const [refreshError, setRefreshError] = useState(null);

  async function handleRefresh() {
    if (refreshing || !currentUser?.uid || !effectiveKey) return;
    setRefreshing(true);
    setRefreshError(null);
    setRefreshNote(null);
    try {
      const result = await generateCropRecommendations(currentUser.uid, effectiveKey, {
        currentStage: dash.meta?.currentStage ?? null,
        observations: dash.observations,
      });
      if (!result.ok) {
        setRefreshError(result.error?.message ?? "Recommendation refresh failed.");
      } else {
        setRefreshNote(
          `Generated ${result.items.length} recommendation(s) from your recorded data.`
        );
      }
    } catch (err) {
      setRefreshError(err.message ?? "Recommendation refresh failed.");
    } finally {
      setRefreshing(false);
      // Refresh both the history and the shared dashboard context.
      await Promise.allSettled([loadFirstPage(), dash.reload()]);
    }
  }

  // ---- Real data signals shown in "Why this recommendation?" ----
  const health = crop ? getHealthStatus(crop) : null;
  const contextSignals = crop
    ? [
        dash.meta?.currentStage && `Crop stage: ${dash.meta.currentStage}`,
        getPlantAgeDays(crop) != null && `Plant age: day ${getPlantAgeDays(crop)}`,
        health && `Recorded health: ${HEALTH_LABELS[health] ?? health}`,
        dash.meta?.profile?.currentCondition &&
          `Reported condition: ${dash.meta.profile.currentCondition}`,
        crop.SoilType && `Soil type: ${crop.SoilType}`,
        crop.IrrigationType && `Irrigation system: ${crop.IrrigationType}`,
        ...dash.activities
          .slice(0, 3)
          .map(
            (a) =>
              `Recent activity: ${a.title ?? a.type} on ${a.date ?? "unknown date"}`
          ),
        dash.observations[0] &&
          `Recent observation: ${dash.observations[0].title ?? dash.observations[0].category}`,
        dash.weather?.context?.rainExpectedSoon &&
          `Rainfall expected soon (${(dash.weather.context.significantRainDays ?? []).join(", ") || "coming days"})`,
      ].filter(Boolean)
    : [];

  if (!crop) {
    return (
      <div className="flex-6 flex flex-col items-center justify-center h-screen gap-3 px-4 text-center">
        <Lightbulb size={48} className="text-[var(--text1)]" />
        <h1 className="bebas-neue-regular text-3xl text-[var(--text1)]">
          Crop Suggestion
        </h1>
        <p className="text-[15px] text-[rgb(0,0,0,0.5)]">
          Nothing to show yet — add your first crop to receive personalized
          recommendations.
        </p>
        <Link
          to="/dashboard/addnewcrop"
          className="capitalize bg-[#679936] rounded-2xl px-3 py-2 text-[var(--text-h)] transition-colors hover:bg-[#4a7028] flex items-center gap-2"
        >
          <Plus /> add crop
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-6 h-screen overflow-y-auto bg-[var(--bg)] p-4 scrollbar-thin scrollbar-track-[#F2DEC4] scrollbar-thumb-[#679936]">
      {/* Page header */}
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="bebas-neue-regular text-4xl leading-none text-[var(--text1)] [-webkit-text-stroke:0.4px_black]">
            Crop Suggestion
          </h1>
          <p className="mt-1 text-[14px] text-black/60">
            What to do next for your crop, based on its real recorded data
            {userData?.fullname ? ` — for ${userData.fullname}'s fields` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            aria-busy={refreshing}
            className="shadow-sm shadow-black/10"
          >
            {refreshing ? (
              <>
                <Loader2 size={15} className="animate-spin" /> Refreshing…
              </>
            ) : (
              <>
                <RefreshCw size={15} /> Refresh recommendations
              </>
            )}
          </Button>
          <Button asChild size="sm">
            <Link to="/dashboard/addnewcrop">
              <Plus size={16} /> Add New Crop
            </Link>
          </Button>
        </div>
      </div>

      {/* Same crop selector as every other dashboard page */}
      <CropSelectorBar
        crops={crops}
        selectedIndex={safeIndex}
        onSelect={setSelectedIndex}
      />

      {/* The actual data every suggestion is built from */}
      <SuggestionContextBar
        crop={crop}
        meta={dash.meta}
        weather={dash.weather}
      />

      {refreshing && (
        <p className="mt-3 rounded-xl bg-[#D7E8C0]/50 px-3 py-2 text-[13px] text-black/70">
          Generating fresh recommendations from your crop profile, activities,
          observations and weather… (can take up to a minute)
        </p>
      )}
      {refreshNote && !refreshing && (
        <p className="mt-3 rounded-xl bg-[#D7E8C0]/60 px-3 py-2 text-[13px] text-[#3f5f22]">
          {refreshNote}
        </p>
      )}
      {refreshError && (
        <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-[13px] text-red-600">
          {refreshError}
        </p>
      )}

      {/* Main grid */}
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* Left — recommendations + history */}
        <div className="grid content-start gap-4 xl:col-span-2">
          <RecommendationSections
            crop={crop}
            recommendation={latestRecommendation}
            contextSignals={contextSignals}
            loading={historyLoading}
          />
          <RecommendationHistory
            crop={crop}
            docs={historyDocs}
            nextCursor={nextCursor}
            loadingMore={loadingMore}
            onLoadMore={handleLoadMore}
          />
        </div>

        {/* Right — supporting context & inputs */}
        <div className="grid content-start gap-4">
          <AIRecommendationCard
            crop={crop}
            analyses={dash.analyses}
            loading={dash.loading}
          />
          <CropImageAnalysis
            crop={crop}
            uid={currentUser?.uid ?? null}
            cropId={effectiveKey}
            onAnalyzed={() => {
              loadFirstPage();
              dash.reload();
            }}
          />
          <IrrigationCard crop={crop} />
          <SoilCard crop={crop} />
          <AskAI crop={crop} />
        </div>
      </div>

      {/* Cross-navigation */}
      <p className="mt-4 text-[12px] text-black/45">
        Want the full plan?{" "}
        <Link to="/dashboard/croptimeline" className="font-semibold text-[var(--text1)] hover:underline">
          Open the crop timeline
        </Link>{" "}
        or{" "}
        <Link to="/dashboard/cropprogress" className="font-semibold text-[var(--text1)] hover:underline">
          check today's progress
        </Link>
        .
      </p>
    </div>
  );
}
