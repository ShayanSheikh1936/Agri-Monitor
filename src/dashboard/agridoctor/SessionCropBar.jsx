import { useState } from "react";
import { Info, Lock, Sprout } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectItem } from "@/components/ui/select";
import { SESSION_STATUS } from "@/services/agriDoctorService";
import { NO_CROP, findCropOption, cropDisplayName } from "./agriDoctorCrop";
import { cn } from "@/lib/utils";

// The ONE crop profile tied to this consultation.
//
// Attaching is OPTIONAL — the farmer can consult without naming a crop — but
// the first attach locks the session for good. The picker therefore disappears
// the moment `session.cropKey` is set (live from Firestore, so a second browser
// tab sees the lock too) and is replaced by a read-only "Locked" chip. Both
// agriDoctorService.attachCropToSession (transaction) and firestore.rules
// (cropLockRespected) reject any attempt to swap it afterwards.
export default function SessionCropBar({
  session,
  cropOptions = [],
  attaching = false,
  onAttach,
}) {
  const [key, setKey] = useState(NO_CROP);

  const locked = Boolean(session?.cropKey);
  // Only a live booking can still gain its crop; closed/no-show threads are
  // history and must not be edited.
  const canEdit = !locked && session?.status === SESSION_STATUS.ACTIVE;
  const chosen = findCropOption(cropOptions, key);
  const lockedOption = findCropOption(cropOptions, session?.cropKey);

  const handleAttach = async () => {
    if (!chosen || attaching) return;
    const res = await onAttach?.(session, chosen);
    // Leave the selection alone when the write was rejected (already locked in
    // another tab, rules not published, …) so the farmer can retry.
    if (res?.ok) setKey(NO_CROP);
  };

  if (locked) {
    return (
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-[var(--border)] bg-[#F2DEC4]/40 px-3 py-2">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#679936]/15">
          <Sprout size={15} className="text-[#4a7028]" aria-hidden="true" />
        </span>
        <span className="truncate text-[13px] font-bold text-black">
          {cropDisplayName(session, cropOptions)}
        </span>
        {lockedOption?.sublabel ? (
          <span className="truncate text-[11px] text-black/50">{lockedOption.sublabel}</span>
        ) : null}
        <Badge className="ml-auto flex items-center gap-1 bg-gray-200 text-gray-700">
          <Lock size={11} aria-hidden="true" /> Locked
        </Badge>
      </div>
    );
  }

  if (!canEdit) {
    return (
      <p className="shrink-0 border-b border-[var(--border)] bg-[#F2DEC4]/40 px-3 py-2 text-[11px] text-black/50">
        No crop profile was attached to this consultation.
      </p>
    );
  }

  return (
    <div className="grid shrink-0 gap-1.5 border-b border-[var(--border)] bg-[#F2DEC4]/40 px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={key}
          onChange={(e) => setKey(e.target.value)}
          disabled={attaching}
          aria-label="Crop profile for this consultation"
          className="min-w-[190px] flex-1"
        >
          <SelectItem value={NO_CROP}>No crop profile</SelectItem>
          {cropOptions.map((o) => (
            <SelectItem key={o.key} value={o.key}>
              {o.sublabel ? `${o.label} — ${o.sublabel}` : o.label}
            </SelectItem>
          ))}
        </Select>
        <button
          type="button"
          onClick={handleAttach}
          disabled={!chosen || attaching}
          className={cn(
            "rounded-xl px-3 py-2 text-[13px] font-semibold text-white transition-colors",
            attaching
              ? "cursor-wait bg-[#4a7028]"
              : "cursor-pointer bg-[#679936] hover:bg-[#4a7028] disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
          )}
        >
          {attaching ? "Attaching…" : "Attach crop"}
        </button>
      </div>
      <p className="flex items-start gap-1 text-[11px] leading-4 text-black/50">
        <Info size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
        {cropOptions.length === 0
          ? "You have no crop profiles yet — add one from the dashboard to attach it here. Skipping is fine."
          : "One crop per consultation, and it cannot be changed once attached. Skipping is fine — the doctor still sees your messages and photos."}
      </p>
    </div>
  );
}
