import { useState } from "react";
import { Mic } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { MESSAGE_TYPES, ROLES } from "@/services/agriDoctorService";
import { formatClock } from "./agriDoctorSlots";
import { cn } from "@/lib/utils";

// One chat message. Alignment + colour depend on whether the viewer sent it,
// so the SAME component serves the farmer page and the doctor console (the
// `viewerRole` prop decides which side is "own").
export default function MessageBubble({ message, viewerRole }) {
  const [zoom, setZoom] = useState(false);
  const own = message.senderRole === viewerRole;
  const fromDoctor = message.senderRole === ROLES.DOCTOR;

  // Own messages (whichever side is viewing) use the brand green; incoming
  // doctor replies use the light green from the app palette, so the farmer can
  // still tell at a glance which bubbles came from the doctor.
  const bubble = own
    ? "bg-[#679936] text-white rounded-br-sm"
    : fromDoctor
      ? "bg-[#D7E8C0] text-black border border-[#679936]/30 rounded-bl-sm"
      : "bg-white text-black border border-black/10 rounded-bl-sm";

  const seconds = message.durationMs ? Math.round(message.durationMs / 1000) : null;

  return (
    <>
      <div className={cn("flex w-full", own ? "justify-end" : "justify-start")}>
        <div className={cn("max-w-[80%] sm:max-w-[70%] rounded-2xl px-3 py-2 shadow-sm", bubble)}>
          {!own && (
            <p
              className={cn(
                "text-[11px] font-bold mb-0.5",
                fromDoctor ? "text-[#3b6d1f]" : "text-[#4a7028]"
              )}
            >
              {message.senderName || (fromDoctor ? "Agri Doctor" : "Farmer")}
            </p>
          )}

          {message.type === MESSAGE_TYPES.TEXT && (
            <p className="text-[14px] leading-5 whitespace-pre-wrap break-words">{message.text}</p>
          )}

          {message.type === MESSAGE_TYPES.IMAGE && message.mediaData && (
            <button
              type="button"
              onClick={() => setZoom(true)}
              className="block rounded-xl overflow-hidden cursor-zoom-in"
              aria-label="View image full size"
            >
              <img
                src={message.mediaData}
                alt="Shared crop"
                className="max-h-56 w-auto object-contain bg-black/5"
              />
            </button>
          )}

          {message.type === MESSAGE_TYPES.VOICE && message.mediaData && (
            <div className="grid gap-1 min-w-[190px]">
              <span className="flex items-center gap-1 text-[11px] font-semibold opacity-85">
                <Mic size={12} aria-hidden="true" /> Voice note{seconds ? ` · ${seconds}s` : ""}
              </span>
              <audio controls src={message.mediaData} className="w-full h-9" />
            </div>
          )}

          <p className={cn("text-[10px] mt-1", own ? "text-white/70" : "text-black/40")}>
            {formatClock(message.createdAtMs)}
          </p>
        </div>
      </div>

      <Dialog open={zoom} onOpenChange={setZoom}>
        <DialogContent
          onClose={() => setZoom(false)}
          className="max-w-[92vw] bg-transparent border-0 shadow-none"
        >
          {message.mediaData && (
            <img
              src={message.mediaData}
              alt="Full size"
              className="max-h-[85vh] w-auto mx-auto rounded-xl"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
