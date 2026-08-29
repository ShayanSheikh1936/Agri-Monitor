import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wind, Droplets, Sunrise, Sunset, Clock, SunMedium, Waves, Leaf } from "lucide-react";
import {
  windDirectionLabel,
  formatClock,
  dayLengthLabel,
  localTodayISO,
  uvLevel,
  next24hAverage,
} from "@/lib/weatherUtils";

function maxOf(values) {
  let best = null;
  for (const v of values) {
    if (v === null || v === undefined) continue;
    if (best === null || v > best) best = v;
  }
  return best;
}

function avgOf(values) {
  const v = values.filter((x) => x !== null && Number.isFinite(x));
  return v.length ? Math.round(v.reduce((s, x) => s + x, 0) / v.length) : null;
}

export function WindCard({ weather }) {
  const c = weather?.current;
  if (!c || c.windSpeedKmh === null) return null;

  const daily = weather?.daily ?? [];
  const strongest = maxOf(daily.slice(0, 3).map((d) => d.windSpeedMaxKmh));
  const strongestDay = daily
    .slice(0, 3)
    .find((d) => d.windSpeedMaxKmh === strongest);
  const dir = windDirectionLabel(c.windDirectionDeg);

  return (
    <Card>
      <CardHeader className="pb-0">
        <CardTitle className="flex items-center gap-2 text-[15px]">
          <Wind size={16} className="text-[var(--text1)]" />
          Wind
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-black">{Math.round(c.windSpeedKmh)}</span>
          <span className="text-[13px] text-black/60">km/h {dir ? `from ${dir}` : ""}</span>
        </div>
        {strongest !== null && (
          <p className="text-[12px] text-black/60">
            Strongest expected: <b className="text-black">{Math.round(strongest)} km/h</b>
            {strongestDay ? ` on ${strongestDay.date === localTodayISO() ? "Today" : strongestDay.date}` : ""}.
          </p>
        )}
        <p className="rounded-xl border border-dashed border-[var(--text1)]/40 px-3 py-2 text-[11px] leading-4 text-black/60">
          Stronger winds may affect spraying and can increase evaporation —
          consider this when planning field work.
        </p>
      </CardContent>
    </Card>
  );
}

export function HumidityCard({ weather }) {
  const c = weather?.current;
  if (!c || c.humidityPercent === null) return null;

  const next24 = (weather?.hourly ?? []).slice(0, 24);
  const upcomingAvg = avgOf(next24.map((h) => h.humidityPercent));
  const upcomingMax = maxOf(next24.map((h) => h.humidityPercent));

  return (
    <Card>
      <CardHeader className="pb-0">
        <CardTitle className="flex items-center gap-2 text-[15px]">
          <Droplets size={16} className="text-[var(--text1)]" />
          Humidity
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-black">{Math.round(c.humidityPercent)}%</span>
          <span className="text-[13px] text-black/60">right now</span>
        </div>
        {upcomingAvg !== null && (
          <p className="text-[12px] text-black/60">
            Next 24h: ~<b className="text-black">{upcomingAvg}%</b> average
            {upcomingMax !== null ? `, peaks near ${Math.round(upcomingMax)}%` : ""}.
          </p>
        )}
        <p className="rounded-xl border border-dashed border-[var(--text1)]/40 px-3 py-2 text-[11px] leading-4 text-black/60">
          High humidity may justify closer crop monitoring. Humidity alone does
          not prove a disease or pest problem.
        </p>
      </CardContent>
    </Card>
  );
}

// Sunrise/sunset for the selected day (falls back to today's entry).
export function SunCycleCard({ weather, selectedDate }) {
  const daily = weather?.daily ?? [];
  if (daily.length === 0) return null;

  const day =
    daily.find((d) => d.date === selectedDate) ??
    daily.find((d) => d.date === localTodayISO()) ??
    daily[0];
  if (!day.sunrise && !day.sunset) return null;

  const length = dayLengthLabel(day.sunrise, day.sunset);

  return (
    <Card>
      <CardHeader className="pb-0">
        <CardTitle className="flex items-center gap-2 text-[15px]">
          <Sunrise size={16} className="text-[var(--text1)]" />
          Sun Cycle
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-[#D7E8C0]/50 px-3 py-2 flex flex-col gap-1">
            <span className="flex items-center gap-1.5 text-[11px] text-black/50">
              <Sunrise size={13} className="text-[#d97b29]" /> Sunrise
            </span>
            <span className="text-[16px] font-semibold text-black">
              {day.sunrise ? formatClock(day.sunrise) : "—"}
            </span>
          </div>
          <div className="rounded-xl bg-[#D7E8C0]/50 px-3 py-2 flex flex-col gap-1">
            <span className="flex items-center gap-1.5 text-[11px] text-black/50">
              <Sunset size={13} className="text-[#d97b29]" /> Sunset
            </span>
            <span className="text-[16px] font-semibold text-black">
              {day.sunset ? formatClock(day.sunset) : "—"}
            </span>
          </div>
        </div>
        {length && (
          <p className="flex items-center gap-1.5 text-[12px] text-black/60">
            <Clock size={13} className="text-[#3b6d1f]" />
            Daylight: <b className="text-black">{length}</b>
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// UV index + sunshine hours for today (falls back to the first day that has
// the data). UV bands follow the WHO scale; wording stays contextual.
export function UvSunCard({ weather }) {
  const daily = weather?.daily ?? [];
  const day =
    daily.find((d) => d.date === localTodayISO() && d.uvIndexMax !== null) ??
    daily.find((d) => d.uvIndexMax !== null) ??
    null;
  if (!day) return null;

  const band = uvLevel(day.uvIndexMax);
  const bandStyle =
    band?.level === "high"
      ? "bg-[#f3d0c4] text-[#a24a2a]"
      : band?.level === "moderate"
        ? "bg-[#f3e3b3] text-[#8a6d1a]"
        : "bg-[#D7E8C0] text-[#3b6d1f]";

  return (
    <Card>
      <CardHeader className="pb-0">
        <CardTitle className="flex items-center gap-2 text-[15px]">
          <SunMedium size={16} className="text-[var(--text1)]" />
          UV &amp; Sunshine
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2">
        <div className="flex items-center gap-2">
          <span className="text-3xl font-bold text-black">{Math.round(day.uvIndexMax)}</span>
          {band && (
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${bandStyle}`}>
              {band.label}
            </span>
          )}
        </div>
        {day.sunshineHours !== null && day.daylightHours !== null && (
          <p className="text-[12px] text-black/60">
            ~<b className="text-black">{day.sunshineHours}h</b> of sunshine out of{" "}
            <b className="text-black">{day.daylightHours}h</b> daylight.
          </p>
        )}
        <p className="rounded-xl border border-dashed border-[var(--text1)]/40 px-3 py-2 text-[11px] leading-4 text-black/60">
          On high-UV days, consider shading young seedlings during peak hours
          and timing field work for early morning.
        </p>
      </CardContent>
    </Card>
  );
}

// Soil moisture (0–1cm), soil temperature and ET₀ — direct irrigation context.
// Values are the next-24h averages from the hourly feed; shown only when the
// API actually returned them.
export function SoilCard({ weather }) {
  const moisture = next24hAverage(weather, "soilMoistureM3m3");
  const soilTemp = next24hAverage(weather, "soilTemperatureC");
  const today = (weather?.daily ?? []).find((d) => d.date === localTodayISO());
  const et0 = today?.et0Mm ?? null;

  if (moisture === null && soilTemp === null && et0 === null) return null;

  return (
    <Card>
      <CardHeader className="pb-0">
        <CardTitle className="flex items-center gap-2 text-[15px]">
          <Leaf size={16} className="text-[var(--text1)]" />
          Soil &amp; Water Demand
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2">
        <div className="grid grid-cols-2 gap-2">
          {moisture !== null && (
            <div className="rounded-xl bg-[#D7E8C0]/50 px-3 py-2 flex flex-col gap-1">
              <span className="flex items-center gap-1.5 text-[11px] text-black/50">
                <Waves size={13} className="text-[#2d6ca3]" /> Soil moisture
              </span>
              <span className="text-[16px] font-semibold text-black">
                {(moisture * 100).toFixed(1)}%
              </span>
              <span className="text-[10px] text-black/45">top 1cm, 24h avg</span>
            </div>
          )}
          {soilTemp !== null && (
            <div className="rounded-xl bg-[#D7E8C0]/50 px-3 py-2 flex flex-col gap-1">
              <span className="flex items-center gap-1.5 text-[11px] text-black/50">
                <Leaf size={13} className="text-[#3b6d1f]" /> Soil temp
              </span>
              <span className="text-[16px] font-semibold text-black">
                {Math.round(soilTemp)}°C
              </span>
              <span className="text-[10px] text-black/45">surface, 24h avg</span>
            </div>
          )}
        </div>
        {et0 !== null && (
          <p className="text-[12px] text-black/60">
            Estimated water loss today (ET₀): <b className="text-black">{et0}mm</b>
            {moisture !== null ? " — compare against soil moisture before irrigating." : "."}
          </p>
        )}
        <p className="rounded-xl border border-dashed border-[var(--text1)]/40 px-3 py-2 text-[11px] leading-4 text-black/60">
          Model estimates only — always confirm with your own field check
          before making irrigation decisions.
        </p>
      </CardContent>
    </Card>
  );
}
