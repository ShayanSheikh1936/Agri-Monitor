import TaskListCard from "./TaskListCard";

export default function TodayTasks({ crop }) {
  return (
    <TaskListCard
      title="Today's Tasks"
      description={`No tasks yet. Once AI timeline generation is enabled, today's recommended activities for ${crop.CropName || "this crop"} will appear here.`}
    />
  );
}
