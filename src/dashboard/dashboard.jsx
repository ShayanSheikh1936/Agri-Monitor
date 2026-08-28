import { useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { Plus, CalendarRange } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "../features/auth/authContext";
import { cropKey, getPlantAgeDays } from "@/lib/cropUtils";
import useTimelineDashboard from "./timeline/useTimelineDashboard";
import CropOverview from "./timeline/CropOverview";
import CropStageCard from "./timeline/CropStageCard";
import TodayTasks from "./timeline/TodayTasks";
import TomorrowTasks from "./timeline/TomorrowTasks";
import UpcomingTasks from "./timeline/UpcomingTasks";
import TimelineEventList from "./timeline/TimelineEventList";
import CropHealthCard from "./timeline/CropHealthCard";
import IrrigationCard from "./timeline/IrrigationCard";
import SoilCard from "./timeline/SoilCard";
import WeatherCard from "./timeline/WeatherCard";
import AIObservationCard from "./timeline/AIObservationCard";
import AIRecommendationCard from "./timeline/AIRecommendationCard";
import CropActivityCard from "./timeline/CropActivityCard";

// Connected Agri Dashboard — reads ONLY persisted data (crops/{uid} via the
// outlet context + timelineData/{uid}/crops/{cropId} via useTimelineDashboard).
// Never regenerates AI data; generation lives on the Crop Timeline page.
const Dashboard = () => {
  const { userData, userCropData } = useOutletContext();
  const { currentUser } = useAuth();
  const crops = userCropData?.crops ?? [];
  const [selectedIndex, setSelectedIndex] = useState(0);

  const safeIndex =
    crops.length > 0 ? Math.min(selectedIndex, crops.length - 1) : 0;
  const crop = crops[safeIndex] ?? null;
  const key = crop ? cropKey(crop, safeIndex) : null;

  const dash = useTimelineDashboard(currentUser?.uid ?? null, crop, key);

  if (!crop) {
    return (
      <div className="flex-6 flex justify-center items-center w-full h-screen overflow-y-auto flex-col gap-1">
        <Link
          to="/dashboard/addnewcrop"
          className="capitalize bg-[#679936] rounded-2xl px-3 py-2 text-[var(--text-h)] transition-colors hover:bg-[#4a7028] flex items-center gap-2"
        >
          <Plus /> add crop
        </Link>
        <p className="text-[rgb(0,0,0,0.5)] capitalize text-[15px]">
          Nothing to add Crops yet
        </p>
      </div>
    );
  }

  // Honest empty-state hint for the task lists, derived from stored meta.
  const emptyHint =
    dash.generationState === "ready"
      ? undefined
      : dash.generationState === "in_progress"
        ? "Timeline generation in progress — tasks will appear here once it completes."
        : "No personalized timeline yet. Open Crop Timeline and press Generate Timeline — tasks will then appear here.";

  return (
    <div className="flex-6 h-screen overflow-y-auto bg-[var(--bg)] p-4 scrollbar-thin scrollbar-track-[#F2DEC4] scrollbar-thumb-[#679936]">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-3">
          {userData?.displayphoto && (
            <img
              src={userData.displayphoto}
              alt=""
              className="w-10 h-10 rounded-full"
            />
          )}
          <div>
            <h1 className="bebas-neue-regular text-4xl leading-none text-[var(--text1)] [-webkit-text-stroke:0.4px_black]">
              Agri Dashboard
            </h1>
            <p className="mt-1 text-[14px] text-black/60">
              Welcome {userData?.fullname} — here's what your fields need.
            </p>
          </div>
        </div>
        <Button asChild size="sm">
          <Link to="/dashboard/addnewcrop">
            <Plus size={16} /> Add New Crop
          </Link>
        </Button>
      </div>

      {/* Crop selector — real crops only */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {crops.map((c, index) => {
          const active = index === safeIndex;
          const ageDays = getPlantAgeDays(c);
          return (
            <button
              key={cropKey(c, index)}
              onClick={() => setSelectedIndex(index)}
              className={`flex shrink-0 items-center gap-2 rounded-2xl border-2 px-2 py-1.5 transition-colors cursor-pointer ${
                active
                  ? "border-[var(--text1)] bg-[#D7E8C0]"
                  : "border-transparent bg-[rgba(0,0,0,0.06)] hover:bg-[#D7E8C0]/50"
              }`}
            >
              <span className="w-9 h-9 rounded-full overflow-hidden border border-[var(--text1)] bg-[#D7E8C0]">
                {c.cropImage ? (
                  <img
                    src={c.cropImage}
                    alt={c.CropName || "Crop"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="flex items-center justify-center w-full h-full text-sm font-bold text-[var(--text1)]">
                    {(c.CropName || "C").charAt(0).toUpperCase()}
                  </span>
                )}
              </span>
              <span className="flex flex-col items-start leading-tight">
                <span className="text-[14px] font-semibold text-black max-w-[140px] truncate">
                  {c.CropName || `Crop ${index + 1}`}
                </span>
                <span className="text-[11px] text-black/50">
                  {ageDays != null ? `Day ${ageDays}` : "Age unknown"}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Generation status strip (failed / stalled / in progress / none) */}
      {dash.generationState !== "ready" && (
        <div
          className={`mb-4 flex flex-wrap items-center gap-2 rounded-2xl border px-3 py-2 text-[13px] ${
            dash.generationState === "failed" || dash.generationState === "stalled"
              ? "border-red-300 bg-red-50 text-red-700"
              : "border-[var(--text1)]/30 bg-[#D7E8C0]/40 text-black/70"
          }`}
        >
          {dash.generationState === "failed" || dash.generationState === "stalled"
            ? `Last timeline generation did not complete${dash.meta?.lastGenerationError ? `: ${dash.meta.lastGenerationError}` : ""}.`
            : dash.generationState === "in_progress"
              ? "Personalized timeline generation is in progress…"
              : "No personalized timeline for this crop yet."}
          <Link
            to="/dashboard/croptimeline"
            className="font-semibold underline underline-offset-2"
          >
            {dash.generationState === "failed" || dash.generationState === "stalled"
              ? "Retry from Crop Timeline"
              : "Generate it from Crop Timeline"}
          </Link>
        </div>
      )}

      {/* Crop overview — real stored facts + persisted timeline meta */}
      <CropOverview
        crop={crop}
        meta={dash.meta}
        nextMilestone={dash.nextMilestone}
      />

      {/* Main grid */}
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="grid content-start gap-4 xl:col-span-2">
          {/* Today / Tomorrow / Upcoming — persisted events only */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <TodayTasks
              crop={crop}
              events={dash.today}
              loading={dash.loading}
              emptyHint={emptyHint}
            />
            <TomorrowTasks
              crop={crop}
              events={dash.tomorrow}
              loading={dash.loading}
              emptyHint={emptyHint}
            />
            <UpcomingTasks
              crop={crop}
              events={dash.upcoming}
              loading={dash.loading}
              emptyHint={emptyHint}
            />
          </div>

          {/* Reusable responsive timeline (chronological future window) */}
          <Card>
            <CardHeader className="pb-0">
              <CardTitle className="flex items-center gap-2 text-[16px]">
                <CalendarRange size={17} className="text-[var(--text1)]" />
                Timeline
                <Badge variant="secondary" className="ml-auto">
                  {dash.loading ? "…" : `${dash.upcoming.length} upcoming`}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dash.loading ? (
                <div className="grid gap-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ) : dash.upcoming.length > 0 ? (
                <TimelineEventList events={dash.upcoming} />
              ) : (
                <p className="rounded-xl bg-[#D7E8C0]/40 px-3 py-3 text-[13px] leading-5 text-black/65">
                  {emptyHint ?? "No upcoming events stored for this crop."}
                </p>
              )}
              <div className="mt-3">
                <Button asChild variant="outline" size="sm">
                  <Link to="/dashboard/croptimeline">
                    View full timeline
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Side column */}
        <div className="grid content-start gap-4">
          <CropStageCard crop={crop} meta={dash.meta} />
          <WeatherCard
            crop={crop}
            weather={dash.weather}
            weatherError={dash.weatherError}
            loading={dash.loading}
          />
          <CropHealthCard crop={crop} />
          <IrrigationCard crop={crop} />
          <SoilCard crop={crop} />
        </div>
      </div>

      {/* Bottom row */}
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <AIObservationCard
          crop={crop}
          observations={dash.observations}
          loading={dash.loading}
        />
        <AIRecommendationCard
          crop={crop}
          analyses={dash.analyses}
          loading={dash.loading}
        />
        <CropActivityCard
          crop={crop}
          activities={dash.activities}
          loading={dash.loading}
        />
      </div>
    </div>
  );
};

export default Dashboard;
