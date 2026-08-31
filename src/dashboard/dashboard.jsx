import { Link, useOutletContext } from "react-router-dom";
import {
  Plus,
  CalendarRange,
  Sprout,
  CloudSun,
  AlertTriangle,
  MessageCircle,
  ChevronRight,
} from "lucide-react";
import { cropKey, formatDate, getPlantAgeDays } from "@/lib/cropUtils";

// Redesigned dashboard home — an overview / "get to know your dashboard" page.
// Left column: guide cards explaining how to best use each dashboard page and
// the chatbot. Right column: the user's crop profiles with created-at dates.
// All detailed data (tasks, weather, soil, AI cards...) lives on its own page,
// so this page only reads the crops list from the outlet context.

const GUIDE_CARDS = [
  {
    to: "/dashboard/croptimeline",
    icon: CalendarRange,
    title: "Crop Timeline",
    desc: "Generate your crop's personalized day-by-day plan — milestones, tasks, AI observations and recommendations all live here.",
  },
  {
    to: "/dashboard/cropsuggestion",
    icon: Sprout,
    title: "Crop Suggestion",
    desc: "Ask the AI what to plant next and get care suggestions matched to your field, season and crop condition.",
  },
  {
    to: "/dashboard/weatherforecast",
    icon: CloudSun,
    title: "Weather Forecast",
    desc: "Check hourly & daily forecasts with farming guidance before planning irrigation, spraying or harvest.",
  },
  {
    to: "/dashboard/weatheralerts",
    icon: AlertTriangle,
    title: "Weather Alerts",
    desc: "Stay ahead of heavy rain, heatwaves, frost and wind warnings that can affect your crops.",
  },
  {
    to: null,
    icon: MessageCircle,
    title: "Agri Chatbot",
    desc: "Tap the round chat button at the bottom-right corner on any dashboard page — ask about crop diseases, weather or care, and even attach a crop photo for AI analysis.",
  },
];

// One guide card — renders as a Link when `to` exists, plain card otherwise.
function GuideCard({ to, icon: Icon, title, desc }) {
  const inner = (
    <>
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[var(--text1)] text-[var(--text-h)]">
        <Icon size={24} />
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[16px] font-bold text-black">{title}</span>
        <span className="text-[13px] leading-5 text-black/60">{desc}</span>
      </span>
      {to && <ChevronRight size={18} className="ml-auto shrink-0 text-[var(--text1)]" />}
    </>
  );
  const cardClass =
    "flex items-center gap-3 rounded-2xl border-2 border-[var(--text1)]/40 bg-[rgba(255,255,255,0.55)] p-3 transition-colors";

  if (to) {
    return (
      <Link to={to} className={`${cardClass} hover:border-[var(--text1)] hover:bg-[#D7E8C0]/60`}>
        {inner}
      </Link>
    );
  }
  return <div className={cardClass}>{inner}</div>;
}

// One crop profile row — name + created-at date + live plant age.
function CropRow({ crop, index }) {
  const ageDays = getPlantAgeDays(crop);
  const created = formatDate(crop.createdAt);

  return (
    <Link
      to="/dashboard/croptimeline"
      className="flex items-center gap-3 rounded-xl border-2 border-transparent bg-[#D7E8C0]/40 px-3 py-2.5 transition-colors hover:border-[var(--text1)] hover:bg-[#D7E8C0]"
    >
      <span className="h-11 w-11 shrink-0 overflow-hidden rounded-full border-2 border-[var(--text1)] bg-[var(--text1)]/20">
        {crop.cropImage ? (
          <img src={crop.cropImage} alt={crop.CropName || "Crop"} className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-sm font-bold text-[var(--text1)]">
            {(crop.CropName || "C").charAt(0).toUpperCase()}
          </span>
        )}
      </span>
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="truncate text-[15px] font-bold text-[var(--text1)]">
          {crop.CropName || `Crop ${index + 1}`}
        </span>
        <span className="text-[12px] text-black/60">
          {created ? `Created ${created}` : "Created recently"}
          {ageDays != null && <span> • Day {ageDays}</span>}
        </span>
      </span>
      <ChevronRight size={18} className="ml-auto shrink-0 text-[var(--text1)]" />
    </Link>
  );
}

const Dashboard = () => {
  const { userData, userCropData } = useOutletContext();
  const crops = userCropData?.crops ?? [];
  const firstName = (userData?.fullname || "Farmer").trim().split(" ")[0];

  return (
    <div className="flex-6 h-screen overflow-y-auto bg-[var(--bg)] p-4 md:p-6 scrollbar-thin scrollbar-track-[#F2DEC4] scrollbar-thumb-[#679936]">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="bebas-neue-regular text-5xl leading-none text-[var(--text1)] [-webkit-text-stroke:0.4px_black]">
            Hello, <span className="capitalize">{firstName}</span>
          </h1>
          <p className="mt-1 text-[15px] text-black/60">
            Welcome back to Agri Monitor — here's how to get the most out of your dashboard.
          </p>
        </div>
        <Link
          to="/dashboard/addnewcrop"
          className="flex items-center gap-2 rounded-2xl bg-[#679936] px-3 py-2 text-[var(--text-h)] transition-colors hover:bg-[#4a7028]"
        >
          <Plus size={18} /> Add New Crop
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Left column — guide cards (like the reference layout) */}
        <div className="flex flex-col gap-6">
          <section>
            <p className="mb-2 font-semibold text-black/70">Get started</p>
            <GuideCard
              to="/dashboard/addnewcrop"
              icon={Plus}
              title="Create a new crop profile"
              desc="Register your crop with its sowing date to unlock personalized timelines, tasks and AI insights across the dashboard."
            />
          </section>

          <section>
            <p className="mb-2 font-semibold text-black/70">Explore your dashboard</p>
            <div className="grid gap-3">
              {GUIDE_CARDS.map((card) => (
                <GuideCard key={card.title} {...card} />
              ))}
            </div>
          </section>
        </div>

        {/* Right column — user crop profiles */}
        <div>
          <p className="mb-2 font-semibold text-black/70">Your crops</p>
          <div className="flex flex-col gap-2 rounded-2xl border-2 border-[var(--text1)]/50 bg-[rgba(255,255,255,0.55)] p-3">
            {crops.length > 0 ? (
              crops.map((crop, index) => <CropRow key={cropKey(crop, index)} crop={crop} index={index} />)
            ) : (
              <div className="flex flex-col items-center gap-2 py-8">
                <Link
                  to="/dashboard/addnewcrop"
                  className="flex items-center gap-2 rounded-2xl bg-[#679936] px-3 py-2 capitalize text-[var(--text-h)] transition-colors hover:bg-[#4a7028]"
                >
                  <Plus size={18} /> add crop
                </Link>
                <p className="text-[14px] capitalize text-black/50">No crops added yet</p>
              </div>
            )}
            {crops.length > 0 && (
              <p className="mt-1 text-right text-[12px] text-black/50">
                1–{crops.length} of {crops.length}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
