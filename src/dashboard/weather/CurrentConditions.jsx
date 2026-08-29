import {
  Thermometer,
  ThermometerSun,
  Droplets,
  CloudRain,
  Wind,
  Compass,
  Cloudy,
  Gauge,
  CloudFog,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { windDirectionLabel } from "@/lib/weatherUtils";

function Metric({ icon: Icon, label, value, sub }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="rounded-xl bg-[#D7E8C0]/50 px-3 py-2.5 flex flex-col gap-1">
      <span className="flex items-center gap-1.5 text-[11px] text-black/50">
        <Icon size={13} className="text-[#3b6d1f]" />
        {label}
      </span>
      <span className="text-[17px] font-semibold text-black leading-none">{value}</span>
      {sub ? <span className="text-[11px] text-black/50">{sub}</span> : null}
    </div>
  );
}

// Detailed current-weather panel. Metrics render only when the API actually
// returned them — missing fields are skipped, never shown as undefined.
export default function CurrentConditions({ weather }) {
  const c = weather?.current;
  if (!c) return null;

  const windDir = windDirectionLabel(c.windDirectionDeg);
  // Dew point comes from the current hour of the hourly feed.
  const firstHour = weather?.hourly?.[0] ?? null;

  return (
    <Card className="min-w-0">
      <CardHeader className="pb-0">
        <CardTitle className="text-[15px]">Current Conditions</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
        <Metric
          icon={Thermometer}
          label="Temperature"
          value={c.temperatureC !== null ? `${Math.round(c.temperatureC)}°C` : null}
          sub={c.condition}
        />
        <Metric
          icon={ThermometerSun}
          label="Feels Like"
          value={c.apparentTemperatureC !== null ? `${Math.round(c.apparentTemperatureC)}°C` : null}
        />
        <Metric
          icon={Droplets}
          label="Humidity"
          value={c.humidityPercent !== null ? `${Math.round(c.humidityPercent)}%` : null}
        />
        <Metric
          icon={CloudRain}
          label="Precipitation"
          value={c.precipitationMm !== null ? `${c.precipitationMm}mm` : null}
          sub="last hour"
        />
        <Metric
          icon={Wind}
          label="Wind Speed"
          value={c.windSpeedKmh !== null ? `${Math.round(c.windSpeedKmh)} km/h` : null}
        />
        <Metric
          icon={Compass}
          label="Wind Direction"
          value={windDir}
          sub={c.windDirectionDeg !== null ? `${Math.round(c.windDirectionDeg)}°` : null}
        />
        <Metric
          icon={Cloudy}
          label="Cloud Cover"
          value={c.cloudCoverPercent !== null ? `${Math.round(c.cloudCoverPercent)}%` : null}
        />
        <Metric
          icon={Gauge}
          label="Pressure"
          value={c.pressureHpa !== null ? `${Math.round(c.pressureHpa)} hPa` : null}
        />
        <Metric
          icon={CloudFog}
          label="Dew Point"
          value={firstHour?.dewPointC !== null && firstHour?.dewPointC !== undefined ? `${Math.round(firstHour.dewPointC)}°C` : null}
        />
      </CardContent>
    </Card>
  );
}
