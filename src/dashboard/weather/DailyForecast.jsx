import { createElement } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sunrise, Sunset, Droplets, Wind, Cloudy, CloudRain } from "lucide-react";
import {
  getWeatherIcon,
  formatDateShort,
  formatDateLong,
  formatClock,
  dayLengthLabel,
  windDirectionLabel,
  localTodayISO,
  WEATHER_THRESHOLDS,
} from "@/lib/weatherUtils";

// Hedged one-line interpretation for a single forecast day — never a
// diagnosis, only context.
function dayInterpretation(day) {
  const parts = [];
  if ((day.precipitationSumMm ?? 0) >= 5) {
    parts.push("A notably wet day — field access and spraying may be limited.");
  } else if (day.isRainExpected) {
    parts.push("Some rain is possible — worth keeping an eye on plans.");
  } else {
    parts.push("No significant rain expected.");
  }
  if (day.tempMaxC !== null && day.tempMaxC >= WEATHER_THRESHOLDS.heatHotC) {
    parts.push("Hot conditions may increase water demand.");
  }
  if (day.tempMinC !== null && day.tempMinC <= WEATHER_THRESHOLDS.coldRiskC) {
    parts.push("Cold overnight lows may stress sensitive crops.");
  }
  if (day.windSpeedMaxKmh !== null && day.windSpeedMaxKmh >= WEATHER_THRESHOLDS.windBreezyKmh) {
    parts.push("Noticeable wind may affect spraying.");
  }
  return parts.join(" ");
}

function DetailItem({ icon: Icon, label, value }) {
  if (!value && value !== 0) return null;
  return (
    <span className="flex items-center gap-1.5 rounded-lg bg-[#D7E8C0]/40 px-2 py-1 text-[12px] text-black/70">
      <Icon size={13} className="text-[#3b6d1f] shrink-0" />
      {label}: <b className="text-black">{value}</b>
    </span>
  );
}

// Multi-day forecast with a selectable day → expanded detail section.
export default function DailyForecast({ daily, hourly, selectedDate, onSelect }) {
  if (!daily || daily.length === 0) return null;

  const today = localTodayISO();
  const selected = daily.find((d) => d.date === selectedDate) ?? daily[0];

  // Humidity / cloud cover for the selected day come from that day's hourly
  // entries (daily API doesn't provide them); gracefully hidden if absent.
  const dayHourly = (hourly ?? []).filter((h) => h.time?.startsWith(selected.date));
  const avg = (vals) => {
    const v = vals.filter((x) => x !== null && Number.isFinite(x));
    return v.length ? Math.round(v.reduce((s, x) => s + x, 0) / v.length) : null;
  };
  const humidityAvg = avg(dayHourly.map((h) => h.humidityPercent));
  const cloudAvg = avg(dayHourly.map((h) => h.cloudCoverPercent));

  return (
    <Card className="min-w-0">
      <CardHeader className="pb-0">
        <CardTitle className="text-[15px]">7-Day Forecast</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {daily.map((day) => {
            const Icon = getWeatherIcon(day.weatherCode, true);
            const active = day.date === selected.date;
            return (
              <button
                key={day.date}
                type="button"
                onClick={() => onSelect?.(day.date)}
                aria-pressed={active}
                className={`rounded-xl px-2 py-3 flex flex-col items-center gap-1 text-center transition-colors cursor-pointer border ${
                  active
                    ? "bg-[#679936] text-white border-[#679936]"
                    : "bg-[#D7E8C0]/40 border-transparent hover:border-[#679936]/40 text-black"
                }`}
              >
                <span className="text-[11px] font-semibold">
                  {day.date === today ? "Today" : formatDateShort(day.date)}
                </span>
                <Icon size={22} className={active ? "text-white" : "text-[#3b6d1f]"} />
                <span className="text-[12px] font-bold leading-none">
                  {day.tempMaxC !== null ? `${Math.round(day.tempMaxC)}°` : "—"}
                  <span className={active ? "text-white/70" : "text-black/50"}>
                    {day.tempMinC !== null ? ` / ${Math.round(day.tempMinC)}°` : ""}
                  </span>
                </span>
                <span className={`text-[10px] ${active ? "text-white/80" : "text-[#2d6ca3]"}`}>
                  {day.precipitationProbabilityMaxPercent !== null
                    ? `${Math.round(day.precipitationProbabilityMaxPercent)}%`
                    : ""}
                  {day.precipitationSumMm !== null && day.precipitationSumMm > 0
                    ? ` · ${day.precipitationSumMm}mm`
                    : ""}
                </span>
              </button>
            );
          })}
        </div>

        {/* Selected day detail */}
        <div className="rounded-xl border border-dashed border-[var(--text1)]/50 p-3">
          <div className="flex items-center gap-2 flex-wrap">
            {createElement(getWeatherIcon(selected.weatherCode, true), {
              size: 24,
              className: "text-[#3b6d1f]",
            })}
            <p className="text-[15px] font-semibold text-black">
              {selected.date === today ? "Today" : formatDateLong(selected.date)} — {selected.condition}
            </p>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <DetailItem
              icon={Sunrise}
              label="Sunrise"
              value={selected.sunrise ? formatClock(selected.sunrise) : null}
            />
            <DetailItem
              icon={Sunset}
              label="Sunset"
              value={selected.sunset ? formatClock(selected.sunset) : null}
            />
            <DetailItem
              icon={Sunrise}
              label="Day length"
              value={dayLengthLabel(selected.sunrise, selected.sunset)}
            />
            <DetailItem
              icon={CloudRain}
              label="Rain"
              value={
                selected.precipitationSumMm !== null
                  ? `${selected.precipitationSumMm}mm${
                      selected.precipitationProbabilityMaxPercent !== null
                        ? ` (${Math.round(selected.precipitationProbabilityMaxPercent)}% chance)`
                        : ""
                    }`
                  : null
              }
            />
            <DetailItem
              icon={Droplets}
              label="Humidity"
              value={humidityAvg !== null ? `~${humidityAvg}% avg` : null}
            />
            <DetailItem
              icon={Cloudy}
              label="Cloud cover"
              value={cloudAvg !== null ? `~${cloudAvg}% avg` : null}
            />
            <DetailItem
              icon={Wind}
              label="Wind"
              value={
                selected.windSpeedMaxKmh !== null
                  ? `up to ${Math.round(selected.windSpeedMaxKmh)} km/h${
                      selected.windDirectionDominantDeg !== null
                        ? ` from ${windDirectionLabel(selected.windDirectionDominantDeg)}`
                        : ""
                    }`
                  : null
              }
            />
            <DetailItem
              icon={Sunrise}
              label="Temp range"
              value={
                selected.tempMinC !== null && selected.tempMaxC !== null
                  ? `${Math.round(selected.tempMinC)}° – ${Math.round(selected.tempMaxC)}°C`
                  : null
              }
            />
          </div>
          <p className="mt-2 text-[12px] leading-5 text-black/60">{dayInterpretation(selected)}</p>
        </div>
      </CardContent>
    </Card>
  );
}
