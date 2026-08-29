import { useMemo } from "react";
import {
  Sprout,
  CloudRain,
  ThermometerSun,
  Wind,
  Droplets,
  Snowflake,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  buildAgriNotes,
  buildCropGuidance,
  computeWeatherIndicators,
  INDICATOR_LEVELS,
} from "@/lib/weatherUtils";

const NOTE_ICONS = {
  rain: CloudRain,
  heat: ThermometerSun,
  wind: Wind,
  humidity: Droplets,
  cold: Snowflake,
  ok: CheckCircle2,
};

const LEVEL_STYLES = {
  [INDICATOR_LEVELS.LOW]: "bg-[#D7E8C0] text-[#3b6d1f]",
  [INDICATOR_LEVELS.MODERATE]: "bg-[#f3e3b3] text-[#8a6d1a]",
  [INDICATOR_LEVELS.HIGH]: "bg-[#f3d0c4] text-[#a24a2a]",
};

function Indicator({ name, ind }) {
  return (
    <div className="rounded-xl bg-[#D7E8C0]/40 px-3 py-2 flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12px] font-semibold text-black">{name}</span>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${LEVEL_STYLES[ind.level]}`}>
          {ind.label}
        </span>
      </div>
      <span className="text-[11px] text-black/55 leading-4">{ind.basis}</span>
    </div>
  );
}

// Agricultural interpretation of the real weather data for the selected crop.
// Everything here is decision-support wording ("may", "consider", "review") —
// never certainty, never an automated directive like "skip irrigation".
export default function AgriGuidance({ weather, crop }) {
  const indicators = useMemo(() => computeWeatherIndicators(weather), [weather]);
  const notes = useMemo(() => buildAgriNotes(weather), [weather]);
  const guidance = useMemo(
    () => buildCropGuidance(weather, crop, indicators),
    [weather, crop, indicators]
  );

  return (
    <div className="grid gap-3 min-w-0">
      {/* Summary notes + status indicators */}
      <Card className="min-w-0">
        <CardHeader className="pb-0">
          <CardTitle className="flex items-center gap-2 text-[15px]">
            <Sprout size={16} className="text-[var(--text1)]" />
            Agricultural Weather Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2">
          {notes.map((n, i) => {
            const Icon = NOTE_ICONS[n.kind] ?? NOTE_ICONS.ok;
            return (
              <p
                key={i}
                className="flex items-start gap-2 rounded-xl bg-[#D7E8C0]/40 px-3 py-2 text-[13px] leading-5 text-black/75"
              >
                <Icon size={16} className="text-[#3b6d1f] shrink-0 mt-0.5" />
                {n.text}
              </p>
            );
          })}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 mt-1">
            <Indicator name="Rain likelihood" ind={indicators.rainLikelihood} />
            <Indicator name="Heat level" ind={indicators.heat} />
            <Indicator name="Wind level" ind={indicators.wind} />
            <Indicator name="Humidity level" ind={indicators.humidity} />
            <Indicator name="Irrigation attention" ind={indicators.irrigationAttention} />
            <Indicator name="Weather stability" ind={indicators.stability} />
          </div>
          <p className="text-[11px] text-black/40">
            Indicators are calculated from live forecast values and are context
            only — not guaranteed agronomic advice.
          </p>
        </CardContent>
      </Card>

      {/* Crop-specific guidance */}
      <Card className="min-w-0">
        <CardHeader className="pb-0">
          <CardTitle className="text-[15px]">
            Weather-Based Guidance
            {crop?.CropName ? (
              <Badge variant="secondary" className="ml-2 capitalize">
                {crop.CropName}
              </Badge>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          {[
            { title: "Irrigation", items: guidance.irrigation },
            { title: "Field activity", items: guidance.fieldWork },
            { title: "Crop monitoring", items: guidance.monitoring },
          ].map((group) => (
            <div key={group.title} className="rounded-xl bg-[#D7E8C0]/30 p-3">
              <p className="text-[13px] font-semibold text-black mb-1">{group.title}</p>
              <ul className="grid gap-1">
                {group.items.map((item, i) => (
                  <li key={i} className="text-[12px] leading-4 text-black/65">
                    • {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
