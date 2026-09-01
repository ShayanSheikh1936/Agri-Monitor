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

function Fact({ label, value, highlight = false }) {
  return (
    <div
      className={
        highlight
          ? "flex flex-col gap-0.5 rounded-xl bg-[var(--text1)]/10 px-3 py-2 ring-1 ring-[var(--text1)]/30"
          : "flex flex-col gap-0.5 rounded-xl bg-[#D7E8C0]/50 px-3 py-2"
      }
    >
      <span
        className={
          highlight
            ? "text-[11px] font-bold uppercase tracking-wide text-[#3f5f22]"
            : "text-[11px] font-bold uppercase tracking-wide text-[#526b55]"
        }
      >
        {label}
      </span>
      <span className="text-[14px] font-semibold text-black">
        {value ?? <span className="font-normal text-black/40">Not provided</span>}
      </span>
    </div>
  );
}

// Whole days from today (local) until a "yyyy-mm-dd" milestone date.
function daysUntil(iso) {
  if (typeof iso !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (Number.isNaN(target.getTime())) return null;
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export default function CropOverview({ crop, meta = null, nextMilestone = null }) {
  const sowing = getSowingDate(crop);
  const ageDays = getPlantAgeDays(crop);
  const health = getHealthStatus(crop);
  const gps = getGpsLocation(crop);
  const milestoneDays = daysUntil(nextMilestone?.date);
  const daysToNextStage =
    milestoneDays == null
      ? null
      : milestoneDays <= 0
        ? "due now"
        : `~${milestoneDays} day${milestoneDays === 1 ? "" : "s"}`;

  const healthVariant =
    health === "Healthy" || !health
      ? "default"
      : health === "PestAttack"
        ? "destructive"
        : "secondary";

  // Lifecycle progress from the persisted meta (no extra reads).
  const eventCount = Number(meta?.eventCount ?? 0);
  const completedCount = Number(meta?.completedCount ?? 0);
  const progressPercent =
    eventCount > 0
      ? Math.min(100, Math.round((completedCount / eventCount) * 100))
      : null;

  return (
    <Card className="overflow-hidden border-[#cfe0b5]">
      {/* Lifecycle accent strip */}
      <div className="h-1.5 w-full bg-gradient-to-r from-[#679936] via-[#8CB85C] to-[#D7E8C0]" />
      <CardContent className="flex flex-col gap-4 pt-4 md:flex-row md:items-center">
        {/* Crop identity */}
        <div className="flex items-center gap-4">
          <span className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-[var(--text1)] bg-[#D7E8C0] shrink-0 shadow-sm shadow-[#679936]/20">
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
          <Fact label="Current Stage" value={meta?.currentStage ?? null} highlight />
          <Fact
            label="Next Milestone"
            value={
              nextMilestone
                ? `${nextMilestone.title}${nextMilestone.date ? ` · ${formatDate(nextMilestone.date)}` : ""}`
                : null
            }
            highlight
          />
          <Fact
            label="Est. Days to Next Stage"
            value={daysToNextStage}
            highlight
          />
          <Fact
            label="Est. Harvest"
            value={meta?.expectedHarvestDate ? formatDate(meta.expectedHarvestDate) : null}
            highlight
          />
          <Fact
            label="Variety / Seed"
            value={crop.SeedType ?? null}
          />
        </div>
      </CardContent>

      {/* Timeline lifecycle progress */}
      {progressPercent != null && (
        <div className="px-6 pb-4">
          <div className="mb-1 flex items-center justify-between text-[11px] font-semibold text-black/60">
            <span>Lifecycle progress</span>
            <span>
              {completedCount}/{eventCount} events · {progressPercent}%
            </span>
          </div>
          <div
            className="h-2 w-full overflow-hidden rounded-full bg-[#D7E8C0]/70"
            role="progressbar"
            aria-valuenow={progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Timeline lifecycle progress"
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#4a7028] to-[#679936] transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}
    </Card>
  );
}
