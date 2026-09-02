import { useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { Plus, Sunrise } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "../features/auth/authContext";
import { cropKey } from "@/lib/cropUtils";
import useDayTick from "@/lib/useDayTick";
import useTimelineDashboard from "./timeline/useTimelineDashboard";
import CropSelectorBar from "./CropSelectorBar";
// Reused timeline cards, relocated here (single source of truth — no copies).
import ActivityLogger from "./timeline/ActivityLogger";
import CropActivityCard from "./timeline/CropActivityCard";
import AIObservationCard from "./timeline/AIObservationCard";
import CropHealthCard from "./timeline/CropHealthCard";
import WeatherCard from "./timeline/WeatherCard";
// Daily-execution components.
import DailyOverviewCard from "./daily/DailyOverviewCard";
import TodayTaskActions from "./daily/TodayTaskActions";
import ConditionRecorder from "./daily/ConditionRecorder";
import DailyAISummary from "./daily/DailyAISummary";

// Daily Crop Progress — "what should I do today, what has been done, and how
// is the crop progressing today?" Focused on daily execution; the full
// lifecycle plan stays on the Crop Timeline page. Reads the SAME persisted
// data through useTimelineDashboard, so every status change is reflected on
// the other pages after a reload.
export default function CropProgressPage() {
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
  // Write-capable children must use the RESOLVED cropId, not the derived key.
  const effectiveKey = dash.cropId ?? key;

  if (!crop) {
    return (
      <div className="flex-6 flex flex-col items-center justify-center h-screen gap-3 px-4 text-center">
        <Sunrise size={48} className="text-[var(--text1)]" />
        <h1 className="bebas-neue-regular text-3xl text-[var(--text1)]">
          Daily Crop Progress
        </h1>
        <p className="text-[15px] text-[rgb(0,0,0,0.5)]">
          Nothing to show yet — add your first crop to start tracking its
          daily tasks and field activities.
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
            Daily Crop Progress
          </h1>
          <p className="mt-1 text-[14px] text-black/60">
            Today's tasks, field activity and crop condition
            {userData?.fullname ? ` for ${userData.fullname}'s fields` : ""}
          </p>
        </div>
        <Button asChild size="sm">
          <Link to="/dashboard/addnewcrop">
            <Plus size={16} /> Add New Crop
          </Link>
        </Button>
      </div>

      {/* Same crop selector as every other dashboard page */}
      <CropSelectorBar
        crops={crops}
        selectedIndex={safeIndex}
        onSelect={setSelectedIndex}
      />

      {/* Today's overview + progress indicators */}
      <DailyOverviewCard
        crop={crop}
        meta={dash.meta}
        todayEvents={dash.today}
        activities={dash.activities}
        loading={dash.loading}
      />

      {/* Main grid */}
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* Left — today's execution */}
        <div className="grid content-start gap-4 xl:col-span-2">
          <TodayTaskActions
            uid={currentUser?.uid ?? null}
            cropId={effectiveKey}
            crop={crop}
            events={dash.today}
            loading={dash.loading}
            onChanged={dash.reload}
          />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ActivityLogger
              uid={currentUser?.uid ?? null}
              cropId={effectiveKey}
              crop={crop}
              onLogged={dash.reload}
            />
            <ConditionRecorder
              uid={currentUser?.uid ?? null}
              cropId={effectiveKey}
              crop={crop}
              meta={dash.meta}
              onChanged={dash.reload}
            />
          </div>

          <CropActivityCard
            crop={crop}
            activities={dash.activities}
            loading={dash.loading}
          />
        </div>

        {/* Right — today's context */}
        <div className="grid content-start gap-4">
          <DailyAISummary
            uid={currentUser?.uid ?? null}
            cropId={effectiveKey}
            crop={crop}
            todayEvents={dash.today}
            observations={dash.observations}
            currentStage={dash.meta?.currentStage ?? null}
          />
          <WeatherCard
            crop={crop}
            weather={dash.weather}
            weatherError={dash.weatherError}
            loading={dash.loading}
          />
          <CropHealthCard crop={crop} />
          <AIObservationCard
            crop={crop}
            observations={dash.observations}
            loading={dash.loading}
          />
        </div>
      </div>

      {/* Cross-navigation */}
      <p className="mt-4 text-[12px] text-black/45">
        Looking for the bigger picture?{" "}
        <Link to="/dashboard/croptimeline" className="font-semibold text-[var(--text1)] hover:underline">
          View the full crop timeline
        </Link>{" "}
        or{" "}
        <Link to="/dashboard/cropsuggestion" className="font-semibold text-[var(--text1)] hover:underline">
          get crop suggestions
        </Link>
        .
      </p>
    </div>
  );
}
