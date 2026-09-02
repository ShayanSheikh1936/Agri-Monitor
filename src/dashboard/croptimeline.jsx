import { useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { Plus, Sprout, RefreshCw, ClipboardList, Lightbulb, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "../features/auth/authContext";
import { cropKey, formatDate } from "@/lib/cropUtils";
import useDayTick from "@/lib/useDayTick";
import useTimelineDashboard from "./timeline/useTimelineDashboard";
import CropSelectorBar from "./CropSelectorBar";
import CropOverview from "./timeline/CropOverview";
import CropStageCard from "./timeline/CropStageCard";
import CropTimeline from "./timeline/CropTimeline";
import TodayTasks from "./timeline/TodayTasks";
import TomorrowTasks from "./timeline/TomorrowTasks";
import UpcomingTasks from "./timeline/UpcomingTasks";

// Personalized Crop Timeline — refocused on the lifecycle question:
// "Where is my crop, what is coming next, and how has the plan changed?"
// Daily execution lives on Daily Crop Progress; recommendations live on
// Crop Suggestion. All three pages read the SAME persisted data via
// useTimelineDashboard, so nothing here is duplicated.
export default function CropTimelinePage() {
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

  // Read-only persisted timeline data (bounded reads, no regeneration).
  const dash = useTimelineDashboard(currentUser?.uid ?? null, crop, key);

  // Write-capable children must use the RESOLVED cropId, not the derived key.
  const effectiveKey = dash.cropId ?? key;

  // No crops yet — honest empty state, same pattern as dashboard.jsx
  if (!crop) {
    return (
      <div className="flex-6 flex flex-col items-center justify-center h-screen gap-3 px-4 text-center">
        <Sprout size={48} className="text-[var(--text1)]" />
        <h1 className="bebas-neue-regular text-3xl text-[var(--text1)]">
          Crop Timeline
        </h1>
        <p className="text-[15px] text-[rgb(0,0,0,0.5)]">
          Nothing to show yet — add your first crop to start building its
          personalized timeline.
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

  const reviewCount = Number(dash.meta?.reviewCount ?? 0);

  return (
    <div className="flex-6 h-screen overflow-y-auto bg-[var(--bg)] p-4 scrollbar-thin scrollbar-track-[#F2DEC4] scrollbar-thumb-[#679936]">
      {/* Page header */}
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="bebas-neue-regular text-4xl leading-none text-[var(--text1)] [-webkit-text-stroke:0.4px_black]">
            Crop Timeline
          </h1>
          <p className="mt-1 text-[14px] text-black/60">
            Personalized growth timeline
            {userData?.fullname ? ` for ${userData.fullname}'s fields` : ""}
          </p>
          {dash.meta?.currentStage && (
            <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-[#D7E8C0]/60 px-2.5 py-0.5 text-[11px] font-semibold text-[#3f5f22]">
              <Sprout size={12} />
              Current stage: {dash.meta.currentStage}
            </span>
          )}
        </div>
        <Button asChild size="sm">
          <Link to="/dashboard/addnewcrop">
            <Plus size={16} /> Add New Crop
          </Link>
        </Button>
      </div>

      {/* Crop selector — real crops only */}
      <CropSelectorBar
        crops={crops}
        selectedIndex={safeIndex}
        onSelect={setSelectedIndex}
      />

      {/* Overview (real stored crop data + persisted timeline meta) */}
      <CropOverview
        crop={crop}
        meta={dash.meta}
        nextMilestone={dash.nextMilestone}
      />

      {/* How the plan has changed — compact review strip, no extra reads
          (all values already live on the timeline meta doc). */}
      <Card className="mt-4 gap-3 border-l-4 border-l-[var(--text1)]">
        <CardContent className="flex flex-wrap items-center gap-2">
          <span className="flex w-7 h-7 shrink-0 items-center justify-center rounded-full bg-[#D7E8C0]/70">
            <RefreshCw size={14} className="text-[var(--text1)]" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wide text-[#526b55]">
              Plan changes
            </p>
            <span className="text-[13px] text-black/70">
            {reviewCount > 0 ? (
              <>
                <strong>{reviewCount}</strong> AI plan review
                {reviewCount === 1 ? "" : "s"}
                {dash.meta?.lastReviewReason
                  ? ` — last: ${dash.meta.lastReviewReason}`
                  : ""}
                {dash.meta?.lastReviewAt
                  ? ` (${formatDate(dash.meta.lastReviewAt)})`
                  : ""}
              </>
            ) : (
              "No plan changes yet — new activities, observations and conditions update future events, never completed history."
            )}
            </span>
          </div>
          {dash.observations.length > 0 && (
            <Badge variant="secondary" className="ml-auto">
              {dash.observations.length} recent observation(s)
            </Badge>
          )}
        </CardContent>
      </Card>

      {/* Main grid — lifecycle & upcoming plan only */}
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="grid content-start gap-4 xl:col-span-2">
          <CropTimeline crop={crop} cropIndex={safeIndex} cropId={effectiveKey} />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <TodayTasks
              crop={crop}
              events={dash.today}
              loading={dash.loading}
            />
            <TomorrowTasks
              crop={crop}
              events={dash.tomorrow}
              loading={dash.loading}
            />
            <UpcomingTasks
              crop={crop}
              events={dash.upcoming}
              loading={dash.loading}
            />
          </div>
        </div>
        <div className="grid content-start gap-4">
          <CropStageCard crop={crop} meta={dash.meta} />

          {/* Small contextual pointers instead of full duplicate cards —
              the details live on their dedicated pages. */}
          <Link
            to="/dashboard/cropprogress"
            className="group flex items-center gap-3 rounded-2xl border border-[#cfe0b5] bg-[#D7E8C0]/30 px-3 py-3 transition-colors hover:bg-[#D7E8C0]/60"
          >
            <span className="flex w-9 h-9 shrink-0 items-center justify-center rounded-xl bg-[var(--text1)] text-white">
              <ClipboardList size={17} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-semibold text-black/80">
                Daily Crop Progress
              </span>
              <span className="block text-[12px] text-black/60">
                {dash.today.length > 0
                  ? `${dash.today.length} task(s) scheduled today — mark them done`
                  : "Log today's field activity"}
              </span>
            </span>
            <ChevronRight
              size={16}
              className="shrink-0 text-[var(--text1)]/60 transition-transform group-hover:translate-x-0.5"
            />
          </Link>
          <Link
            to="/dashboard/cropsuggestion"
            className="group flex items-center gap-3 rounded-2xl border border-[#cfe0b5] bg-[#D7E8C0]/30 px-3 py-3 transition-colors hover:bg-[#D7E8C0]/60"
          >
            <span className="flex w-9 h-9 shrink-0 items-center justify-center rounded-xl bg-[var(--text1)] text-white">
              <Lightbulb size={17} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-semibold text-black/80">
                Crop Suggestion
              </span>
              <span className="block text-[12px] text-black/60">
                Irrigation, nutrition and monitoring suggestions
              </span>
            </span>
            <ChevronRight
              size={16}
              className="shrink-0 text-[var(--text1)]/60 transition-transform group-hover:translate-x-0.5"
            />
          </Link>
        </div>
      </div>
    </div>
  );
}
