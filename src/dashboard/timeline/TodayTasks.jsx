import { Sunrise } from "lucide-react";
import TaskListCard from "./TaskListCard";

// Today's persisted timeline events (date === user's current local date).
export default function TodayTasks({ crop, events, loading, emptyHint }) {
  return (
    <TaskListCard
      title="Today"
      icon={Sunrise}
      events={events}
      loading={loading}
      countLabel="task"
      emptyText={
        emptyHint ??
        `Nothing scheduled for today on ${crop?.CropName || "this crop"}.`
      }
    />
  );
}
