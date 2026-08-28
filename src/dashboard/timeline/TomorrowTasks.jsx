import { CalendarDays } from "lucide-react";
import TaskListCard from "./TaskListCard";

// Tomorrow's persisted timeline events (date === next calendar date).
export default function TomorrowTasks({ crop, events, loading, emptyHint }) {
  return (
    <TaskListCard
      title="Tomorrow"
      icon={CalendarDays}
      events={events}
      loading={loading}
      countLabel="task"
      emptyText={
        emptyHint ?? "Nothing scheduled for tomorrow yet."
      }
    />
  );
}
