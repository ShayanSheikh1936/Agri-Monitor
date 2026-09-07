import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Clock, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  subscribeMessages,
  markSessionRead,
  sendMessage,
  ROLES,
  SESSION_STATUS,
} from "@/services/agriDoctorService";
import { isWindowOpen, isUpcoming, formatCountdown, formatClock, formatDayLabel } from "./agriDoctorSlots";
import { sessionStateMeta } from "./agriDoctorMeta";
import useCountdown from "./useCountdown";
import MessageBubble from "./MessageBubble";
import ChatComposer from "./ChatComposer";
import SessionCropBar from "./SessionCropBar";
import CropContextPanel from "./CropContextPanel";

// The consultation thread. Shared by the farmer page (role="user") and the
// doctor console (role="doctor"): it subscribes to the message subcollection,
// keeps the viewer's unread counter cleared, auto-scrolls, and gates sending on
// the live 2-hour window. Closing/expiry is driven by data, never by a timer
// left running here.
//
// The strip under the header is role-specific: the farmer gets the ONE-crop
// picker/lock (cropOptions + onAttachCrop), the doctor gets the read-only crop
// snapshot the farmer attached.
export default function ConsultationChat({
  session,
  role,
  onBack,
  onSent,
  doctorProfile = null,
  cropOptions = [],
  attachingCrop = false,
  onAttachCrop,
}) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);

  const isDoctor = role === ROLES.DOCTOR;
  // Upcoming = booked, but the slot's own start time has not arrived yet, so the
  // composer stays locked and the countdown points at the START, not the end.
  const upcoming = isUpcoming(session);
  const { remaining } = useCountdown(upcoming ? session?.startMs : session?.endMs);
  const open = isWindowOpen(session);
  const status = sessionStateMeta(session);

  // Live message thread.
  useEffect(() => {
    if (!session?.id) return undefined;
    // Syncing the loading flag with the (re)subscription is intentional — the
    // same accepted pattern as the other dashboard data hooks.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    const unsub = subscribeMessages(session.id, (list) => {
      setMessages(list);
      setLoading(false);
    });
    return () => unsub();
  }, [session?.id]);

  // Clear THIS viewer's unread counter, but only when it is actually non-zero
  // (session is a live doc from the parent subscription) — avoids idle writes.
  const unread = isDoctor ? session?.unreadForDoctor : session?.unreadForUser;
  useEffect(() => {
    if (!session?.id || !unread) return;
    markSessionRead(session.id, role);
  }, [session?.id, unread, role]);

  // Keep the newest message in view.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, loading]);

  const handleSend = async (payload) => {
    await sendMessage({
      sessionId: session.id,
      senderRole: role,
      senderId: isDoctor ? "doctor" : session.userId,
      // The doctor's own display name (set in the console) so the farmer sees
      // who actually replied, falling back to the generic label.
      senderName: isDoctor
        ? doctorProfile?.displayName || "Agri Doctor"
        : session.userName || "Farmer",
      ...payload,
    });
    onSent?.();
  };

  const closedNote = upcoming
    ? `This consultation opens at ${formatClock(session?.startMs)}. ${
        isDoctor ? "You can reply once it starts." : "You can start sending messages then."
      }`
    : session?.status === SESSION_STATUS.REMOVED
      ? "This booking was removed as a no-show — the consultation never opened."
      : "The 2-hour consultation window has closed. This thread is now read-only.";

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-card">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[#D7E8C0]/40 px-3 py-2.5">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to consultations"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[var(--border)] text-black/60 transition-colors hover:bg-black/5 hover:text-black cursor-pointer"
          >
            <ArrowLeft size={18} />
          </button>
        )}

        <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full border border-[var(--border)] bg-white">
          {isDoctor && session?.userPhoto ? (
            <img src={session.userPhoto} alt="" className="h-full w-full object-cover" />
          ) : (
            <ShieldCheck size={18} className="text-[#4a7028]" />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-bold text-black">
            {isDoctor
              ? session?.userName || "Farmer"
              : doctorProfile?.displayName || "Agri Doctor"}
          </p>
          <p className="truncate text-[11px] text-black/55">
            {isDoctor
              ? `${formatDayLabel(session?.date)} · ${session?.slotLabel}`
              : [
                  doctorProfile?.specialization,
                  `${formatDayLabel(session?.date)} · ${session?.slotLabel}`,
                ]
                  .filter(Boolean)
                  .join(" — ")}
          </p>
        </div>

        {upcoming ? (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[12px] font-semibold text-amber-700">
            <Clock size={13} aria-hidden="true" /> Starts in {formatCountdown(remaining)}
          </span>
        ) : open ? (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-[12px] font-semibold text-green-700">
            <Clock size={13} aria-hidden="true" /> Closes in {formatCountdown(remaining)}
          </span>
        ) : (
          <Badge className={status.className}>{status.label}</Badge>
        )}
      </div>

      {/* The ONE crop profile tied to this consultation */}
      {isDoctor ? (
        <CropContextPanel session={session} />
      ) : (
        <SessionCropBar
          session={session}
          cropOptions={cropOptions}
          attaching={attachingCrop}
          onAttach={onAttachCrop}
        />
      )}

      {/* Messages */}
      <div
        ref={scrollRef}
        className="scrollbar-thin scrollbar-track-[#F2DEC4] scrollbar-thumb-[#679936] grid min-h-0 flex-1 content-start gap-2 overflow-y-auto p-3"
      >
        {loading ? (
          <>
            <Skeleton className="h-12 w-2/3" />
            <Skeleton className="h-12 w-1/2 justify-self-end" />
          </>
        ) : messages.length === 0 ? (
          <div className="py-8 text-center text-[13px] text-black/50">
            {upcoming
              ? isDoctor
                ? `This consultation opens at ${formatClock(session?.startMs)}.`
                : `Your consultation opens at ${formatClock(session?.startMs)}. Come back then to send photos and messages.`
              : open
                ? isDoctor
                  ? "No messages yet. Review the farmer's photos/notes and send your opinion."
                  : "Consultation is open. Send text, a photo of the affected crop, or a voice note."
                : "No messages in this consultation."}
          </div>
        ) : (
          messages.map((m) => <MessageBubble key={m.id} message={m} viewerRole={role} />)
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-[var(--border)] bg-white p-2.5">
        {!open && <p className="mb-2 text-center text-[12px] text-black/55">{closedNote}</p>}
        <ChatComposer
          onSend={handleSend}
          disabled={!open}
          placeholder={isDoctor ? "Write your opinion / advice…" : "Describe your crop issue…"}
          disabledPlaceholder={
            upcoming ? `Opens at ${formatClock(session?.startMs)}` : "Consultation closed"
          }
        />
      </div>
    </div>
  );
}
