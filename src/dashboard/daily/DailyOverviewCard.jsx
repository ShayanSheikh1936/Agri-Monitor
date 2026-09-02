import { Sun } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  formatPlantAge,
  getHealthStatus,
  formatDate,
  localDateISO,
  HEALTH_LABELS,
} from "@/lib/cropUtils";

// Lightweight progress bar — pure CSS, matches the dashboard theme.
function Bar({ value }) {
  return (
    <span className="block h-1.5 w-full overflow-hidden rounded-full bg-black/10">
      <span
        className="block h-full rounded-full bg-[var(--text1)] transition-all"
        style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
      />
    </span>
  );
}

function Stat({ label, value, sub, pct = null }) {
  return (
    <div className="rounded-xl bg-[#D7E8C0]/50 px-3 py-2">
      <p className="text-[11px] font-bold uppercase tracking-wide text-[#526b55]">
        {label}
      </p>
      <p className="text-[15px] font-semibold text-black">{value}</p>
      {pct != null && <Bar value={pct} />}
      {sub && <p className="mt-0.5 text-[11px] text-black/50">{sub}</p>}
    </div>
  );
}

// Today's overview + daily progress indicators. Every figure is derived from
// the same persisted timeline/activity records the other pages read — never
// computed from invented data.
export default function DailyOverviewCard({
  crop,
  meta = null,
  todayEvents = [],
  activities = [],
  loading = false,
}) {
  const ageLabel = formatPlantAge(crop);
  const health = getHealthStatus(crop);
  const todayIso = localDateISO(0);

  const doneToday = todayEvents.filter((e) => e.status === "completed").length;
  const skippedToday = todayEvents.filter((e) => e.status === "skipped").length;
  const pendingToday = Math.max(
    todayEvents.length - doneToday - skippedToday,
    0
  );
  const completionPct =
    todayEvents.length > 0 ? Math.round((doneToday / todayEvents.length) * 100) : 0;

  const eventCount = Number(meta?.eventCount ?? 0);
  const completedCount = Number(meta?.completedCount ?? 0);
  const lifecyclePct =
    eventCount > 0 ? Math.round((completedCount / eventCount) * 100) : 0;

  const todayActivities = activities.filter((a) => a.date === todayIso).length;
  const attentionItems =
    todayEvents.filter((e) => e.status === "needs_attention").length +
    (health && health !== "Healthy" ? 1 : 0);

  return (
    <Card className="border-[#cfe0b5]">
      <CardContent className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] md:items-center">
        {/* Today's identity strip */}
        <div className="flex items-center gap-3">
          <span className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-[var(--text1)] bg-[#D7E8C0] shrink-0">
            {crop.cropImage ? (
              <img
                src={crop.cropImage}
                alt={crop.CropName || "Crop"}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="flex items-center justify-center w-full h-full text-2xl font-bold text-[var(--text1)]">
                {(crop.CropName || "C").charAt(0).toUpperCase()}
              </span>
            )}
          </span>
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <h2 className="bebas-neue-regular text-2xl leading-none text-[var(--text1)] [-webkit-text-stroke:0.4px_black]">
                {crop.CropName || "Unnamed crop"}
              </h2>
              <Sun size={15} className="text-[var(--text1)]" />
            </div>
            <p className="text-[12px] text-black/55">
              {formatDate(new Date())}
              {ageLabel && ` • ${ageLabel}`}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {meta?.currentStage ? (
                <Badge variant="secondary">{meta.currentStage}</Badge>
              ) : (
                <Badge variant="outline">Stage unknown</Badge>
              )}
              {health && (
                <Badge variant={health === "Healthy" ? "default" : "destructive"}>
                  {HEALTH_LABELS[health] ?? health}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Daily progress indicators */}
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <Stat
            label="Today's Tasks"
            value={loading && !todayEvents.length ? "…" : `${completionPct}%`}
            sub={`${doneToday} of ${todayEvents.length} done`}
            pct={completionPct}
          />
          <Stat
            label="Done / Pending"
            value={loading ? "…" : `${doneToday} / ${pendingToday}`}
            sub={skippedToday ? `${skippedToday} skipped` : "nothing skipped"}
          />
          <Stat
            label="Lifecycle Progress"
            value={loading || !eventCount ? "—" : `${lifecyclePct}%`}
            sub={eventCount ? `${completedCount}/${eventCount} milestones` : "no timeline yet"}
            pct={lifecyclePct}
          />
          <Stat
            label="Field Activity"
            value={loading ? "…" : `${todayActivities} today`}
            sub={
              attentionItems > 0
                ? `${attentionItems} item(s) need attention`
                : "no attention items"
            }
          />
        </div>
      </CardContent>
    </Card>
  );
}
