import { Flame, CloudRain, Wind, SunMedium } from "lucide-react";
import { computeForecastHighlights, formatDateShort, localTodayISO } from "@/lib/weatherUtils";

function Highlight({ icon: Icon, title, item }) {
  if (!item) return null;
  const isToday = item.date === localTodayISO();
  return (
    <div className="min-w-0 rounded-xl bg-[#D7E8C0]/50 px-3 py-2 flex items-center gap-2.5">
      <Icon size={18} className="text-[#3b6d1f] shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-black/45 truncate">{title}</p>
        <p className="text-[13px] font-bold text-black truncate leading-4">
          {item.label}
          <span className="font-semibold text-black/50">
            {" "}· {isToday ? "Today" : formatDateShort(item.date)}
          </span>
        </p>
      </div>
    </div>
  );
}

// One-glance summary of the notable days in the 7-day outlook.
export default function ForecastHighlights({ weather }) {
  const h = computeForecastHighlights(weather);
  if (!h.hottest && !h.wettest && !h.windiest && !h.highestUv) return null;

  return (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
      <Highlight icon={Flame} title="Hottest day" item={h.hottest} />
      <Highlight icon={CloudRain} title="Wettest day" item={h.wettest} />
      <Highlight icon={Wind} title="Windiest day" item={h.windiest} />
      <Highlight icon={SunMedium} title="Highest UV" item={h.highestUv} />
    </div>
  );
}
