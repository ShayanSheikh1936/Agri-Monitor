import { CalendarRange } from "lucide-react";
import TaskListCard from "./TaskListCard";

// Future persisted timeline events, ordered chronologically.
export default function UpcomingTasks({ crop, events, loading, emptyHint }) {
  return (
    <TaskListCard
      title="Upcoming"
      icon={CalendarRange}
      events={events}
      loading={loading}
      countLabel="planned"
      emptyText={
        emptyHint ??
        `No upcoming tasks yet. Future irrigation, nutrition and protection windows for ${crop?.CropName || "this crop"} will appear here once the personalized timeline is generated.`
      }
    />
  );
}
