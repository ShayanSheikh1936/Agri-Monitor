import { useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { Plus, Sprout } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cropKey, getPlantAgeDays } from "@/lib/cropUtils";
import CropOverview from "./timeline/CropOverview";
import CropStageCard from "./timeline/CropStageCard";
import CropTimeline from "./timeline/CropTimeline";
import TodayTasks from "./timeline/TodayTasks";
import TomorrowTasks from "./timeline/TomorrowTasks";
import UpcomingTasks from "./timeline/UpcomingTasks";
import CropHealthCard from "./timeline/CropHealthCard";
import IrrigationCard from "./timeline/IrrigationCard";
import SoilCard from "./timeline/SoilCard";
import WeatherCard from "./timeline/WeatherCard";
import AIObservationCard from "./timeline/AIObservationCard";
import CropActivityCard from "./timeline/CropActivityCard";
import AskAI from "./timeline/AskAI";
import CropImageAnalysis from "./timeline/CropImageAnalysis";

// Personalized Crop Timeline dashboard page (foundation stage).
// Reads ONLY existing data: auth user + crops/{uid} via the Outlet context
// provided by router/dashboardLayout.jsx. No Firestore writes, no fake data.
export default function CropTimelinePage() {
  const { userData, userCropData } = useOutletContext();
  const crops = userCropData?.crops ?? [];
  const [selectedIndex, setSelectedIndex] = useState(0);

  const safeIndex =
    crops.length > 0 ? Math.min(selectedIndex, crops.length - 1) : 0;
  const crop = crops[safeIndex] ?? null;

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

      {/* Overview (real stored crop data) */}
      <CropOverview crop={crop} />

      {/* Main grid */}
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="grid content-start gap-4 xl:col-span-2">
          <CropTimeline crop={crop} />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <TodayTasks crop={crop} />
            <TomorrowTasks crop={crop} />
            <UpcomingTasks crop={crop} />
          </div>
          <CropActivityCard crop={crop} />
        </div>
        <div className="grid content-start gap-4">
          <CropStageCard crop={crop} />
          <CropHealthCard crop={crop} />
          <WeatherCard crop={crop} />
          <IrrigationCard crop={crop} />
          <SoilCard crop={crop} />
        </div>
      </div>

      {/* Bottom row */}
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <AIObservationCard crop={crop} />
        <CropImageAnalysis crop={crop} />
        <AskAI crop={crop} />
      </div>
    </div>
  );
}
