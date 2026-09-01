import { Badge } from "@/components/ui/badge";
import {
  getPlantAgeDays,
  getHealthStatus,
  getSowingDate,
  formatDate,
  HEALTH_LABELS,
} from "@/lib/cropUtils";

// Compact "what the suggestions are based on" strip. Facts only — every
// value comes from the stored crop profile, timeline meta or live weather.
export default function SuggestionContextBar({ crop, meta = null, weather = null }) {
  const ageDays = getPlantAgeDays(crop);
  const sowing = getSowingDate(crop);
  const health = getHealthStatus(crop);
  const condition = meta?.profile?.currentCondition ?? null;

  const facts = [
    { label: "Stage", value: meta?.currentStage ?? null },
    { label: "Age", value: ageDays != null ? `Day ${ageDays}` : null },
    { label: "Sown", value: sowing ? formatDate(sowing) : null },
    { label: "Variety", value: crop.SeedType ?? null },
    { label: "Health", value: health ? (HEALTH_LABELS[health] ?? health) : null },
    { label: "Condition", value: condition },
    { label: "Soil", value: crop.SoilType ?? null },
    { label: "Irrigation", value: crop.IrrigationType ?? null },
    {
      label: "Rain outlook",
      value:
        weather?.context?.rainExpectedSoon
          ? `rain expected${weather.context.significantRainDays?.length ? ` (${weather.context.significantRainDays.join(", ")})` : ""}`
          : weather
            ? "no significant rain expected"
            : null,
    },
  ].filter((f) => f.value);

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-[#cfe0b5] bg-[#D7E8C0]/30 px-3 py-2">
      <span className="text-[11px] font-bold uppercase tracking-wide text-[#526b55]">
        Based on:
      </span>
      {facts.length > 0 ? (
        facts.map((f) => (
          <Badge key={f.label} variant="secondary" className="gap-1 font-normal">
            <span className="font-semibold">{f.label}:</span> {f.value}
          </Badge>
        ))
      ) : (
        <span className="text-[12px] text-black/50">
          Very little is recorded for this crop yet — add details via Add New
          Crop or log activities for better suggestions.
        </span>
      )}
    </div>
  );
}
