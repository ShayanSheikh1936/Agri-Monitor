import { CheckCircle2, Circle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDate, localDateISO } from "@/lib/cropUtils";

const PRIORITY_STYLES = {
  high: "bg-red-100 text-red-700 border-red-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  low: "bg-[#D7E8C0] text-emerald-800 border-emerald-200",
};

const STATUS_STYLES = {
  upcoming: "bg-white/70 text-black/60 border-black/20",
  today: "bg-[var(--text1)] text-white border-[var(--text1)]",
  completed: "bg-[#D7E8C0] text-emerald-900 border-emerald-300",
  skipped: "bg-black/5 text-black/40 border-black/15",
  postponed: "bg-amber-50 text-amber-700 border-amber-200",
  needs_attention: "bg-red-50 text-red-700 border-red-200",
};

// Reusable, responsive, presentational timeline renderer.
// Shows every stored field: date, stage, title, description, tasks,
// priority, status and a clear estimated indicator. Never fetches,
// never invents — renders exactly what was persisted.
export default function TimelineEventList({ events, showTrack = true }) {
  const todayIso = localDateISO(0);
  const tomorrowIso = localDateISO(1);

  return (
    <div className="relative pl-6">
      {showTrack && (
        <span className="absolute left-[7px] top-1 bottom-1 w-[2px] rounded bg-[var(--text1)]/25" />
      )}
      {events.map((event) => {
        const isToday = event.date === todayIso;
        const dayLabel =
          event.date === todayIso
            ? "today"
            : event.date === tomorrowIso
              ? "tomorrow"
              : null;
        return (
          <div key={event.id ?? `${event.dayNumber}-${event.title}`} className="relative pb-4 last:pb-0">
            {/* Marker — dashed ring = estimated, fill follows status */}
            <span
              className={`absolute -left-6 top-0.5 w-4 h-4 rounded-full border-2 ${
                isToday
                  ? "border-[var(--text1)] bg-[var(--text1)]"
                  : event.status === "completed"
                    ? "border-[var(--text1)] bg-[#D7E8C0]"
                    : "border-[var(--text1)]/60 bg-[var(--bg)]"
              } ${event.isEstimated ? "border-dashed" : ""}`}
            />
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="text-[14px] font-semibold text-black">
                Day {event.dayNumber} · {event.title}
              </p>
              {event.stage && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {event.stage}
                </Badge>
              )}
              <span
                className={`text-[10px] px-1.5 py-0 rounded-full border ${PRIORITY_STYLES[event.priority] ?? PRIORITY_STYLES.medium}`}
              >
                {event.priority}
              </span>
              <span
                className={`text-[10px] px-1.5 py-0 rounded-full border ${STATUS_STYLES[event.status] ?? STATUS_STYLES.upcoming}`}
              >
                {event.status}
              </span>
              {event.isEstimated && (
                <span className="text-[10px] text-black/45 italic">
                  estimated
                </span>
              )}
            </div>
            <p className="text-[12px] text-black/55">
              {event.date ? formatDate(event.date) : "Date unknown"}
              {dayLabel && ` — ${dayLabel}`}
            </p>
            {event.description && (
              <p className="text-[12px] text-black/70 mt-0.5 leading-4">
                {event.description}
              </p>
            )}
            {Array.isArray(event.tasks) && event.tasks.length > 0 && (
              <ul className="mt-1 grid gap-1">
                {event.tasks.map((task, i) => {
                  const done = Boolean(task?.done);
                  const label = typeof task === "string" ? task : task?.title;
                  if (!label) return null;
                  return (
                    <li
                      key={i}
                      className="flex items-start gap-1.5 text-[12px] text-black/70"
                    >
                      {done ? (
                        <CheckCircle2
                          size={14}
                          className="mt-0.5 shrink-0 text-[var(--text1)]"
                        />
                      ) : (
                        <Circle
                          size={14}
                          className="mt-0.5 shrink-0 text-black/30"
                        />
                      )}
                      <span className={done ? "line-through opacity-60" : ""}>
                        {label}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
