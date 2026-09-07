import { useState } from "react";
import {
  Stethoscope,
  LogOut,
  Inbox,
  Users,
  Clock,
  MessageSquare,
  AlertTriangle,
  Sprout,
  UserRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SESSION_STATUS, ROLES } from "@/services/agriDoctorService";
import ConsultationChat from "@/dashboard/agridoctor/ConsultationChat";
import {
  isWindowOpen,
  isUpcoming,
  formatCountdown,
  formatDayLabel,
  formatStamp,
} from "@/dashboard/agridoctor/agriDoctorSlots";
import { sessionStateMeta } from "@/dashboard/agridoctor/agriDoctorMeta";
import { cropDisplayName } from "@/dashboard/agridoctor/agriDoctorCrop";
import useCountdown from "@/dashboard/agridoctor/useCountdown";
import { cn } from "@/lib/utils";
import useDoctorConsole, { DOCTOR_FILTERS } from "./useDoctorConsole";
import DoctorProfileEditor from "./DoctorProfileEditor";

// One row in the doctor's triage list. Module-scope (not exported) so the file
// keeps a single default component export for fast-refresh.
function DoctorSessionItem({ session, selected, onSelect }) {
  const isActive = session.status === SESSION_STATUS.ACTIVE;
  // Booked, but the slot's own start time has not arrived yet.
  const upcoming = isUpcoming(session);
  // One ticker covers both phases: it counts down to the slot's start while it
  // is upcoming, then re-arms to the close time once the window goes live.
  const { remaining } = useCountdown(
    isActive ? (upcoming ? session.startMs : session.endMs) : null
  );
  const open = isWindowOpen(session);
  const status = sessionStateMeta(session);
  const unread = session.unreadForDoctor ?? 0;

  return (
    <button
      type="button"
      onClick={() => onSelect(session)}
      className={cn(
        "grid w-full gap-1.5 border-b border-[var(--border)] p-3 text-left transition-colors cursor-pointer",
        selected
          ? "bg-[#D7E8C0]/60"
          : upcoming
            ? "bg-amber-50 hover:bg-amber-100/70"
            : open
              ? "bg-white hover:bg-[#679936]/5"
              : "bg-white hover:bg-black/5"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2">
          <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full border border-[var(--border)] bg-white">
            {session.userPhoto ? (
              <img src={session.userPhoto} alt="" className="h-full w-full object-cover" />
            ) : (
              <Users size={15} className="text-[#4a7028]" aria-hidden="true" />
            )}
          </span>
          <span className="truncate text-[14px] font-bold text-black">
            {session.userName || "Farmer"}
          </span>
        </span>
        <Badge className={status.className}>{status.label}</Badge>
      </div>

      <div className="flex items-center justify-between gap-2 text-[11px] text-black/55">
        <span className="truncate">
          {formatDayLabel(session.date)} · {session.slotLabel}
        </span>
        {upcoming ? (
          <span className="flex shrink-0 items-center gap-1 font-semibold text-amber-700">
            <Clock size={11} aria-hidden="true" /> Starts in {formatCountdown(remaining)}
          </span>
        ) : open ? (
          <span className="flex shrink-0 items-center gap-1 font-semibold text-green-700">
            <Clock size={11} aria-hidden="true" /> {formatCountdown(remaining)}
          </span>
        ) : (
          <span className="shrink-0">{formatStamp(session.bookedAtMs)}</span>
        )}
      </div>

      {session.cropKey ? (
        <span className="flex min-w-0 items-center gap-1 text-[11px] font-semibold text-[#4a7028]">
          <Sprout size={11} className="shrink-0" aria-hidden="true" />
          {/* From the snapshot the farmer attached — the doctor has no access
              to crops/{uid}, so this is the only crop context available. */}
          <span className="truncate">{cropDisplayName(session, [])}</span>
        </span>
      ) : null}

      {session.lastMessagePreview ? (
        <p className="flex items-center gap-1 truncate text-[12px] text-black/60">
          <MessageSquare size={12} aria-hidden="true" /> {session.lastMessagePreview}
        </p>
      ) : null}

      {unread > 0 && (
        <span className="justify-self-start rounded-full bg-[#679936] px-2 py-0.5 text-[11px] font-bold text-white">
          {unread} new from farmer
        </span>
      )}
    </button>
  );
}

const FILTER_TABS = [
  { id: DOCTOR_FILTERS.OPEN, label: "Queue" },
  { id: DOCTOR_FILTERS.UNREAD, label: "Unread" },
  { id: DOCTOR_FILTERS.ALL, label: "All" },
  { id: DOCTOR_FILTERS.CLOSED, label: "Closed" },
  { id: DOCTOR_FILTERS.REMOVED, label: "No-shows" },
];

// The Agri Doctor console: triage every farmer consultation on the left, and
// reply (text / image / voice) in the shared ConsultationChat on the right.
// Styled with the app's own green/beige palette. All data comes from
// useDoctorConsole; this file is layout only.
export default function DoctorConsole({ onSignOut }) {
  const store = useDoctorConsole();
  const [selectedId, setSelectedId] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);

  const selectedSession = store.sessions.find((s) => s.id === selectedId) ?? null;

  const counts = {
    [DOCTOR_FILTERS.OPEN]: store.queueSessions.length,
    [DOCTOR_FILTERS.UNREAD]: store.unreadSessions.length,
    [DOCTOR_FILTERS.ALL]: store.sessions.length,
    [DOCTOR_FILTERS.CLOSED]: store.closedSessions.length,
    [DOCTOR_FILTERS.REMOVED]: store.removedSessions.length,
  };

  return (
    <div className="flex h-screen min-h-0 flex-col bg-[var(--bg)]">
      {/* Top bar */}
      <header className="flex shrink-0 items-center justify-between gap-3 bg-[#679936] px-4 py-3 text-white">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/15">
            <Stethoscope size={20} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-[15px] font-bold leading-5">Agri Doctor Console</h1>
            <p className="truncate text-[11px] text-white/70">
              {/* JS string — no HTML entities here, they would render literally. */}
              {store.doctorProfile?.displayName || "Farmer consultations and opinions"}
              {store.doctorProfile?.specialization
                ? ` · ${store.doctorProfile.specialization}`
                : ""}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {store.totalUnread > 0 && (
            <span className="rounded-full bg-white/15 px-2.5 py-1 text-[12px] font-bold">
              {store.totalUnread} unread
            </span>
          )}
          <button
            type="button"
            onClick={() => setProfileOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-white/15 px-3 py-1.5 text-[13px] font-semibold transition-colors hover:bg-white/25 cursor-pointer"
          >
            <UserRound size={15} aria-hidden="true" /> My profile
          </button>
          <button
            type="button"
            onClick={onSignOut}
            className="flex items-center gap-1.5 rounded-xl bg-white/15 px-3 py-1.5 text-[13px] font-semibold transition-colors hover:bg-white/25 cursor-pointer"
          >
            <LogOut size={15} aria-hidden="true" /> Sign out
          </button>
        </div>
      </header>

      {/* Body: list + chat */}
      <div className="flex min-h-0 flex-1">
        {/* Left — triage list */}
        <aside
          className={cn(
            "w-full min-w-0 flex-col border-r border-[#679936]/40 bg-white md:flex md:w-[360px]",
            selectedSession ? "hidden" : "flex"
          )}
        >
          <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-[#679936]/25 p-2 scrollbar-none">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => store.setFilter(tab.id)}
                className={cn(
                  "flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-[12px] font-semibold transition-colors cursor-pointer",
                  store.filter === tab.id
                    ? "bg-[#679936] text-white"
                    : "bg-black/5 text-black/60 hover:bg-black/10"
                )}
              >
                {tab.label}
                <span
                  className={cn(
                    "rounded-full px-1.5 text-[10px]",
                    store.filter === tab.id ? "bg-white/25" : "bg-black/10"
                  )}
                >
                  {counts[tab.id]}
                </span>
              </button>
            ))}
          </div>

          <div className="scrollbar-thin scrollbar-track-[#F2DEC4] scrollbar-thumb-[#679936] min-h-0 flex-1 overflow-y-auto">
            {store.error ? (
              <div className="grid gap-2 p-4 text-center">
                <AlertTriangle size={22} className="mx-auto text-red-500" aria-hidden="true" />
                <p className="text-[13px] font-semibold text-red-600">{store.error}</p>
              </div>
            ) : store.loading ? (
              <div className="grid gap-2 p-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : store.visibleSessions.length === 0 ? (
              <div className="grid justify-items-center gap-2 p-8 text-center">
                <Inbox size={26} className="text-black/30" aria-hidden="true" />
                <p className="text-[13px] text-black/50">No consultations in this view.</p>
              </div>
            ) : (
              store.visibleSessions.map((s) => (
                <DoctorSessionItem
                  key={s.id}
                  session={s}
                  selected={s.id === selectedId}
                  onSelect={(sess) => setSelectedId(sess.id)}
                />
              ))
            )}
          </div>
        </aside>

        {/* Right — conversation */}
        <section
          className={cn(
            "min-w-0 flex-1 flex-col p-0 md:flex md:p-3",
            selectedSession ? "flex" : "hidden"
          )}
        >
          {selectedSession ? (
            <div className="h-full min-h-0 w-full">
              <ConsultationChat
                session={selectedSession}
                role={ROLES.DOCTOR}
                onBack={() => setSelectedId(null)}
                doctorProfile={store.doctorProfile}
              />
            </div>
          ) : (
            <div className="grid h-full place-items-center p-6 text-center">
              <div className="grid justify-items-center gap-2">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#679936]/15">
                  <Stethoscope size={26} className="text-[#4a7028]" aria-hidden="true" />
                </span>
                <p className="text-[14px] font-semibold text-black/70">Select a consultation</p>
                <p className="max-w-[280px] text-[12px] text-black/45">
                  Open a farmer&apos;s booking to review their photos, messages and voice notes,
                  then send your opinion while the 2-hour window is open.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Public profile farmers see before they book */}
      <DoctorProfileEditor
        open={profileOpen}
        onOpenChange={setProfileOpen}
        profile={store.doctorProfile}
        onSave={store.updateProfile}
        saving={store.savingProfile}
        error={store.profileError}
      />
    </div>
  );
}
