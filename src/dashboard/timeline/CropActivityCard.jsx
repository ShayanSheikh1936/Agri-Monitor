import { Clock } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  formatDate,
  getAffectedPart,
  getHealthStatus,
  HEALTH_LABELS,
} from "@/lib/cropUtils";

// Activity log built ONLY from data already stored on the crop entry.
// No events are invented — at minimum the registration event exists.
export default function CropActivityCard({ crop }) {
  const health = getHealthStatus(crop);
  const affectedPart = getAffectedPart(crop);

  const events = [];
  if (crop.createdAt) {
    events.push({
      date: formatDate(crop.createdAt),
      title: "Crop registered in Agri Monitor",
      detail: crop.CropName || "Unnamed crop",
    });
  }
  if (health && health !== "Healthy") {
    events.push({
      date: formatDate(crop.createdAt),
      title: `Health reported: ${HEALTH_LABELS[health] ?? health}`,
      detail: affectedPart || "Affected part not specified",
    });
  }

  return (
    <Card className="gap-3">
      <CardHeader className="pb-0">
        <CardTitle className="flex items-center gap-2 text-[15px]">
          <Clock size={16} className="text-[var(--text1)]" />
          Crop Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2">
        {events.map((event, index) => (
          <div
            key={index}
            className="flex items-start gap-3 rounded-xl bg-[#D7E8C0]/40 px-3 py-2"
          >
            <span className="mt-1 w-2 h-2 rounded-full bg-[var(--text1)] shrink-0" />
            <div>
              <p className="text-[13px] font-semibold text-black">
                {event.title}
              </p>
              <p className="text-[12px] text-black/55">
                {event.detail}
                {event.date && ` • ${event.date}`}
              </p>
            </div>
          </div>
        ))}
        <p className="text-[12px] text-black/40">
          Completed tasks and field updates will be logged here in later
          phases.
        </p>
      </CardContent>
    </Card>
  );
}
