import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getWeatherIcon, formatHourLabel } from "@/lib/weatherUtils";

// Horizontally scrollable hourly strip — capped at the 48 entries the service
// already slices, so no oversized dataset is ever rendered.
export default function HourlyForecast({ hourly }) {
  if (!hourly || hourly.length === 0) return null;

  return (
    <Card className="min-w-0">
      <CardHeader className="pb-0">
        <CardTitle className="text-[15px]">Hourly Forecast — Next 48 Hours</CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-thin scrollbar-track-[#D7E8C0] scrollbar-thumb-[#679936]"
          role="list"
          aria-label="Hourly weather forecast"
        >
          {hourly.map((h) => {
            const Icon = getWeatherIcon(h.weatherCode, h.isDay);
            return (
              <div
                key={h.time}
                role="listitem"
                title={`${formatHourLabel(h.time)} — ${h.condition}`}
                className="shrink-0 w-16 rounded-xl bg-[#D7E8C0]/40 px-1.5 py-3 flex flex-col items-center gap-1.5 text-center"
              >
                <span className="text-[11px] font-semibold text-black/70">
                  {formatHourLabel(h.time)}
                </span>
                <Icon size={22} className="text-[#3b6d1f]" />
                <span className="text-[14px] font-bold text-black leading-none">
                  {h.temperatureC !== null ? `${Math.round(h.temperatureC)}°` : "—"}
                </span>
                <span className="text-[10px] text-[#2d6ca3] leading-tight">
                  {h.precipitationProbabilityPercent !== null
                    ? `${Math.round(h.precipitationProbabilityPercent)}%`
                    : "—"}
                  {h.precipitationMm !== null && h.precipitationMm > 0
                    ? ` · ${h.precipitationMm}mm`
                    : ""}
                </span>
                <span className="text-[10px] text-black/50 leading-tight">
                  {h.windSpeedKmh !== null ? `${Math.round(h.windSpeedKmh)}km/h` : ""}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
