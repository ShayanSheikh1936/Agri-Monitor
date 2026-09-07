import { Clock, MessageSquare, ChevronRight, Sprout } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SESSION_STATUS } from "@/services/agriDoctorService";
import { sessionStateMeta } from "./agriDoctorMeta";
import { cropDisplayName } from "./agriDoctorCrop";
import {
  isWindowOpen,
  isUpcoming,
  formatCountdown,
  formatDayLabel,
  formatStamp,
} from "./agriDoctorSlots";
import useCountdown from "./useCountdown";
import { cn } from "@/lib/utils";

// Farmer-facing list item for one consultation. Tapping opens the thread.
// No-show ("removed") sessions are filtered out upstream, so this renders ACTIVE
// bookings — either UPCOMING (slot has not started, counts down to its start) or
// OPEN (counts down to the 2-hour close) — plus CLOSED read-only history.
// The attached crop (at most one, permanently locked) is echoed here so the
// farmer can tell two same-day bookings apart without opening them.
export default function SessionCard({ session, cropOptions = [], onOpen }) {
  const isActive = session.status === SESSION_STATUS.ACTIVE;
  // Recomputed on every countdown tick, so the card flips from "Starts in" to
  // "Closes in" the moment the slot's own start time arrives.
  const upcoming = isActive && isUpcoming(session);
  const { remaining } = useCountdown(
    isActive ? (upcoming ? session.startMs : session.endMs) : null
  );
  const open = isWindowOpen(session);
  const status = sessionStateMeta(session);
  const unread = session.unreadForUser ?? 0;

  return (
    <button
      type="button"
      onClick={() => onOpen?.(session)}
      className={cn(
        "grid w-full gap-2 rounded-2xl border p-3 text-left transition-colors cursor-pointer",
        upcoming
          ? "border-amber-300/70 bg-amber-50 hover:bg-amber-100/70"
          : open
            ? "border-[#679936]/50 bg-[#679936]/5 hover:bg-[#679936]/10"
            : "border-[var(--border)] bg-white hover:bg-black/5"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-[14px] font-bold text-black">
            {formatDayLabel(session.date)} · {session.slotLabel}
          </span>
          <Badge className={status.className}>{status.label}</Badge>
        </div>
        <ChevronRight size={16} className="shrink-0 text-black/40" aria-hidden="true" />
      </div>

      <div className="flex items-center justify-between gap-2 text-[12px] text-black/55">
        <span>Booked {formatStamp(session.bookedAtMs)}</span>
        {upcoming ? (
          <span className="flex items-center gap-1 font-semibold text-amber-700">
            <Clock size={12} aria-hidden="true" /> Starts in {formatCountdown(remaining)}
          </span>
        ) : open ? (
          <span className="flex items-center gap-1 font-semibold text-green-700">
            <Clock size={12} aria-hidden="true" /> Closes in {formatCountdown(remaining)}
          </span>
        ) : session.status === SESSION_STATUS.CLOSED ? (
          <span>Closed {formatStamp(session.closedAt)}</span>
        ) : null}
      </div>

      {session.cropKey ? (
        <span className="flex min-w-0 items-center gap-1 text-[12px] font-semibold text-[#4a7028]">
          <Sprout size={12} className="shrink-0" aria-hidden="true" />
          <span className="truncate">{cropDisplayName(session, cropOptions)}</span>
        </span>
      ) : null}

      {session.lastMessagePreview ? (
        <p className="flex items-center gap-1 truncate text-[12px] text-black/60">
          <MessageSquare size={12} aria-hidden="true" /> {session.lastMessagePreview}
        </p>
      ) : null}

      {unread > 0 && (
        <span className="justify-self-start rounded-full bg-[#679936] px-2 py-0.5 text-[11px] font-bold text-white">
          {unread} new from doctor
        </span>
      )}
    </button>
  );
}
