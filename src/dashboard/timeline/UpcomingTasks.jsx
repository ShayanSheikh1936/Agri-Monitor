import TaskListCard from "./TaskListCard";

export default function UpcomingTasks({ crop }) {
  return (
    <TaskListCard
      title="Upcoming Tasks"
      description="No upcoming tasks yet. Future irrigation, fertilization and protection windows will be listed here once the personalized timeline is generated."
    />
  );
}
