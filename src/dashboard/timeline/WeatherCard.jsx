import { Sun, CloudRain, Droplets, Wind } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getGpsLocation, formatDate } from "@/lib/cropUtils";
import { WEATHER_ERROR_CODES } from "@/services/weatherService";

// Live Open-Meteo forecast for the crop's stored GPS location.
// Weather is CONTEXTUAL information only — it is presented as facts and
// never turns into automatic decisions like "rain = skip irrigation".
export default function WeatherCard({ crop, weather, weatherError, loading }) {
  const gps = getGpsLocation(crop);

  return (
    <Card className="gap-3">
      <CardHeader className="pb-0">
        <CardTitle className="flex items-center gap-2 text-[15px]">
          <Sun size={16} className="text-[var(--text1)]" />
          Weather
          {weather && (
            <Badge variant="secondary" className="ml-auto">
              {weather.current.condition}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2">
        {loading ? (
          <div className="grid gap-2">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : weather ? (
          <>
            <div className="flex items-center justify-between rounded-xl bg-[#D7E8C0]/50 px-3 py-2">
              <span className="text-[15px] font-semibold text-black">
                {weather.current.temperatureC}°C
              </span>
              <span className="flex items-center gap-1 text-[12px] text-black/60">
                <Droplets size={13} /> {weather.current.humidityPercent}%
              </span>
              <span className="flex items-center gap-1 text-[12px] text-black/60">
                <Wind size={13} /> {weather.current.windSpeedKmh} km/h
              </span>
            </div>

            {weather.daily?.slice(0, 4).map((day) => (
              <div
                key={day.date}
                className="flex items-center justify-between rounded-xl bg-[#D7E8C0]/30 px-3 py-1.5 text-[12px] text-black/70"
              >
                <span className="w-20 shrink-0">{formatDate(day.date)}</span>
                <span className="flex-1 truncate px-2">{day.condition}</span>
                <span className="shrink-0">
                  {day.tempMinC}–{day.tempMaxC}°C
                </span>
                <span className="ml-2 flex shrink-0 items-center gap-1 text-[#3b6d1f]">
                  <CloudRain size={12} />
                  {day.precipitationSumMm ?? 0}mm
                </span>
              </div>
            ))}

            {weather.context?.rainExpectedSoon ? (
              <p className="rounded-xl border border-dashed border-[var(--text1)]/40 px-3 py-2 text-[12px] leading-5 text-black/60">
                Rainfall expected in the coming days
                {weather.context.significantRainDays?.length
                  ? ` (${weather.context.significantRainDays.join(", ")})`
                  : ""}
                — worth reviewing planned irrigation. Context only; decide
                based on your field conditions.
              </p>
            ) : (
              <p className="rounded-xl border border-dashed border-[var(--text1)]/40 px-3 py-2 text-[12px] leading-5 text-black/60">
                No significant rainfall expected in the forecast window.
              </p>
            )}
          </>
        ) : weatherError === WEATHER_ERROR_CODES.MISSING_COORDINATES ||
          weatherError === WEATHER_ERROR_CODES.INVALID_COORDINATES ? (
          <p className="rounded-xl bg-[#D7E8C0]/50 px-3 py-2 text-[12px] text-black/60">
            No valid GPS location stored for this crop. Add it via Add New
            Crop for field-level weather.
          </p>
        ) : (
          <p className="rounded-xl bg-[#D7E8C0]/50 px-3 py-2 text-[12px] text-black/60">
            Weather unavailable right now
            {weatherError ? ` (${weatherError})` : ""}. The rest of the
            dashboard works without it.
          </p>
        )}

        {!loading && (
          <p className="text-[11px] text-black/40">
            {gps
              ? `Forecast for ${gps.lat.toFixed(3)}, ${gps.lon.toFixed(3)} — Open-Meteo.`
              : "Open-Meteo forecast, no API key required."}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
