import { Clock } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  formatDate,
  getAffectedPart,
  getHealthStatus,
  HEALTH_LABELS,
} from "@/lib/cropUtils";

// Activity log = persisted timeline activities (bounded recent read) plus
// the registration facts already stored on the crop entry. Nothing invented.
export default function CropActivityCard({ crop, activities = [], loading }) {
  const health = getHealthStatus(crop);
  const affectedPart = getAffectedPart(crop);

  const baseEvents = [];
  if (crop.createdAt) {
    baseEvents.push({
      id: "registered",
      dateLabel: formatDate(crop.createdAt),
      title: "Crop registered in Agri Monitor",
      detail: crop.CropName || "Unnamed crop",
    });
  }
  if (health && health !== "Healthy") {
    baseEvents.push({
      id: "health",
      dateLabel: formatDate(crop.createdAt),
      title: `Health reported: ${HEALTH_LABELS[health] ?? health}`,
      detail: affectedPart || "Affected part not specified",
    });
  }

  const storedEvents = activities.map((a) => {
    const qty =
      a.quantity != null
        ? `${a.quantity}${a.unit ? ` ${a.unit}` : ""}`
        : null;
    return {
      id: a.id,
      dateLabel: formatDate(a.createdAt),
      title: a.title || "Field activity",
      detail: [qty, a.notes ?? a.note ?? null].filter(Boolean).join(" — ") ||
        a.type ||
        "",
    };
  });

  const events = [...storedEvents, ...baseEvents];

  return (
    <Card className="gap-3">
      <CardHeader className="pb-0">
        <CardTitle className="flex items-center gap-2 text-[15px]">
          <Clock size={16} className="text-[var(--text1)]" />
          Crop Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2">
        {loading ? (
          <div className="grid gap-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : (
          events.map((event) => (
            <div
              key={event.id}
              className="flex items-start gap-3 rounded-xl bg-[#D7E8C0]/40 px-3 py-2"
            >
              <span className="mt-1 w-2 h-2 rounded-full bg-[var(--text1)] shrink-0" />
              <div>
                <p className="text-[13px] font-semibold text-black">
                  {event.title}
                </p>
                <p className="text-[12px] text-black/55">
                  {event.detail}
                  {event.dateLabel && ` • ${event.dateLabel}`}
                </p>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
