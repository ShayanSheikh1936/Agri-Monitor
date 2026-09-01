import { useState } from "react";
import { ListTodo, CheckCircle2, SkipForward, CalendarClock } from "lucide-react";
import TaskListCard from "../timeline/TaskListCard";
import { updateEventStatus } from "@/services/timelineService";

const ACTION_BTN =
  "inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";

// Today's timeline events with execution controls. Reuses the shared task
// list renderer — status changes go through updateEventStatus(), which
// transitions the event in place (never deletes timeline data) and keeps the
// meta counters in sync, so Crop Timeline reflects the change immediately.
export default function TodayTaskActions({ uid, cropId, crop, events, loading, onChanged }) {
  const [busyId, setBusyId] = useState(null); // `${eventId}:${status}`
  const [error, setError] = useState(null);

  async function handleStatus(event, status) {
    if (!uid || !cropId || busyId) return;
    setBusyId(`${event.id}:${status}`);
    setError(null);
    try {
      await updateEventStatus(uid, cropId, event.id, status);
      onChanged?.();
    } catch (err) {
      setError(err.message ?? "The task status could not be updated.");
    } finally {
      setBusyId(null);
    }
  }

  const renderActions = (event) => {
    const closed = event.status === "completed" || event.status === "skipped";
    return (
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        {!closed && (
          <>
            <button
              type="button"
              onClick={() => handleStatus(event, "completed")}
              disabled={Boolean(busyId)}
              className={`${ACTION_BTN} border-[var(--text1)]/50 text-[#3f5f22] hover:bg-[#D7E8C0]/60`}
            >
              <CheckCircle2 size={12} /> Mark complete
            </button>
            <button
              type="button"
              onClick={() => handleStatus(event, "skipped")}
              disabled={Boolean(busyId)}
              className={`${ACTION_BTN} border-black/20 text-black/60 hover:bg-black/5`}
            >
              <SkipForward size={12} /> Skip
            </button>
            {event.status !== "postponed" && (
              <button
                type="button"
                onClick={() => handleStatus(event, "postponed")}
                disabled={Boolean(busyId)}
                className={`${ACTION_BTN} border-amber-300 text-amber-700 hover:bg-amber-50`}
              >
                <CalendarClock size={12} /> Postpone
              </button>
            )}
          </>
        )}
        {closed && (
          <button
            type="button"
            onClick={() => handleStatus(event, "today")}
            disabled={Boolean(busyId)}
            className={`${ACTION_BTN} border-black/15 text-black/50 hover:bg-black/5`}
            title="Reopen this task"
          >
            Reopen
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="grid gap-2">
      <TaskListCard
        title="Today's Tasks"
        icon={ListTodo}
        events={events}
        loading={loading}
        countLabel="task"
        renderActions={renderActions}
        emptyText={`Nothing scheduled for today on ${crop?.CropName || "this crop"}. Log field activity below — meaningful entries can update the plan.`}
      />
      {error && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-[12px] text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
