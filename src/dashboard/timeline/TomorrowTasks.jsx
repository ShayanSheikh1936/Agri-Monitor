import TaskListCard from "./TaskListCard";

export default function TomorrowTasks({ crop }) {
  return (
    <TaskListCard
      title="Tomorrow's Tasks"
      description={`No tasks yet. Tomorrow's planned activities for ${crop.CropName || "this crop"} will be suggested here based on the crop stage and weather.`}
    />
  );
}
