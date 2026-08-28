import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import TimelineEventList from "./TimelineEventList";

// Shared card shell for Today / Tomorrow / Upcoming task lists.
// Purely presentational — the page supplies bounded, persisted events.
export default function TaskListCard({
  title,
  icon: Icon,
  events,
  loading = false,
  emptyText,
  countLabel,
}) {
  return (
    <Card className="gap-3">
      <CardHeader className="pb-0">
        <CardTitle className="flex items-center gap-2 text-[15px]">
          {Icon && <Icon size={16} className="text-[var(--text1)]" />}
          {title}
          <Badge variant="secondary" className="ml-auto">
            {loading ? "…" : `${events?.length ?? 0} ${countLabel ?? "events"}`}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="grid gap-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : events && events.length > 0 ? (
          <TimelineEventList events={events} />
        ) : (
          <div className="rounded-xl bg-[#D7E8C0]/40 px-3 py-3 text-[13px] leading-5 text-black/65">
            {emptyText}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
