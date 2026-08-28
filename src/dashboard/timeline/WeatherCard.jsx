import { Sun, CloudRain } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getGpsLocation } from "@/lib/cropUtils";

// No weather API is implemented yet — this card intentionally shows an empty
// state. It surfaces the crop's stored GPS coordinates when available, since
// they are the future Open-Meteo input (no data is invented).
export default function WeatherCard({ crop }) {
  const gps = getGpsLocation(crop);

  return (
    <Card className="gap-3">
      <CardHeader className="pb-0">
        <CardTitle className="flex items-center gap-2 text-[15px]">
          <Sun size={16} className="text-[var(--text1)]" />
          Weather
          <Badge variant="secondary" className="ml-auto">
            Coming soon
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2">
        <div className="flex items-center gap-3 rounded-xl bg-[#D7E8C0]/40 px-3 py-3">
          <CloudRain size={20} className="shrink-0 text-[var(--text1)]" />
          <p className="text-[13px] leading-5 text-black/65">
            Local forecast, rainfall and irrigation guidance will appear here
            once weather integration is enabled.
          </p>
        </div>
        <p className="rounded-xl bg-[#D7E8C0]/50 px-3 py-2 text-[12px] text-black/60">
          {gps
            ? `GPS locked for this field (${gps.lat.toFixed(3)}, ${gps.lon.toFixed(3)}) — ready for local forecasts.`
            : "No GPS location stored for this crop. Add it via Add New Crop for field-level weather."}
        </p>
      </CardContent>
    </Card>
  );
}
