import { CalendarDays } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  getSowingDate,
  getPlantAgeDays,
  getHealthStatus,
  getGpsLocation,
  formatDate,
  HEALTH_LABELS,
} from "@/lib/cropUtils";

function Fact({ label, value }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-xl bg-[#D7E8C0]/50 px-3 py-2">
      <span className="text-[11px] font-bold uppercase tracking-wide text-[#526b55]">
        {label}
      </span>
      <span className="text-[14px] font-semibold text-black">
        {value ?? <span className="font-normal text-black/40">Not provided</span>}
      </span>
    </div>
  );
}

export default function CropOverview({ crop, meta = null, nextMilestone = null }) {
  const sowing = getSowingDate(crop);
  const ageDays = getPlantAgeDays(crop);
  const health = getHealthStatus(crop);
  const gps = getGpsLocation(crop);

  const healthVariant =
    health === "Healthy" || !health
      ? "default"
      : health === "PestAttack"
        ? "destructive"
        : "secondary";

  return (
    <Card className="border-[#cfe0b5]">
      <CardContent className="flex flex-col gap-4 md:flex-row md:items-center">
        {/* Crop identity */}
        <div className="flex items-center gap-4">
          <span className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-[var(--text1)] bg-[#D7E8C0] shrink-0">
            {crop.cropImage ? (
              <img
                src={crop.cropImage}
                alt={crop.CropName || "Crop"}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="flex items-center justify-center w-full h-full text-3xl font-bold text-[var(--text1)]">
                {(crop.CropName || "C").charAt(0).toUpperCase()}
              </span>
            )}
          </span>
          <div className="flex flex-col gap-1">
            <h2 className="bebas-neue-regular text-3xl leading-none text-[var(--text1)] [-webkit-text-stroke:0.4px_black]">
              {crop.CropName || "Unnamed crop"}
            </h2>
            <div className="flex flex-wrap gap-2">
              {crop.CropCategory ? (
                <Badge variant="secondary">{crop.CropCategory}</Badge>
              ) : (
                <Badge variant="outline">Category unknown</Badge>
              )}
              {health ? (
                <Badge variant={healthVariant}>
                  {HEALTH_LABELS[health] ?? health}
                </Badge>
              ) : (
                <Badge variant="outline">Health unknown</Badge>
              )}
            </div>
            <p className="flex items-center gap-1 text-[12px] text-black/50">
              <CalendarDays size={13} />
              {sowing
                ? `Sown on ${formatDate(sowing)}`
                : "Sowing date not provided"}
              {ageDays != null && ` • Day ${ageDays} today`}
            </p>
          </div>
        </div>

        {/* Real stored facts */}
        <div className="grid flex-1 grid-cols-2 gap-2 md:grid-cols-4">
          <Fact
            label="Area"
            value={
              crop.AreaSize
                ? `${crop.AreaSize} ${crop.AreaUnit ?? ""}`.trim()
                : null
            }
          />
          <Fact label="Field Count" value={crop.FieldCount ?? null} />
          <Fact label="Soil Type" value={crop.SoilType ?? null} />
          <Fact
            label="GPS Location"
            value={
              gps
                ? `${gps.lat.toFixed(3)}, ${gps.lon.toFixed(3)}`
                : null
            }
          />
          <Fact label="Current Stage" value={meta?.currentStage ?? null} />
          <Fact
            label="Next Milestone"
            value={
              nextMilestone
                ? `${nextMilestone.title}${nextMilestone.date ? ` · ${formatDate(nextMilestone.date)}` : ""}`
                : null
            }
          />
          <Fact
            label="Est. Harvest"
            value={meta?.expectedHarvestDate ? formatDate(meta.expectedHarvestDate) : null}
          />
          <Fact
            label="Variety / Seed"
            value={crop.SeedType ?? null}
          />
        </div>
      </CardContent>
    </Card>
  );
}
