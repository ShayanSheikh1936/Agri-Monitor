import { Lock, Sprout } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cropContextRows, cropDisplayName } from "./agriDoctorCrop";

// Doctor-side, READ-ONLY view of the crop the farmer tied to this consultation.
//
// Everything is read from the snapshot stored on the session doc — never from
// crops/{uid}, which the Firestore rules deliberately keep private to the
// farmer. Plant age is recomputed from the snapshot's sowing date so it stays
// accurate even for a consultation opened days after booking.
export default function CropContextPanel({ session }) {
  const rows = cropContextRows(session?.cropSnapshot);

  if (!session?.cropKey) {
    return (
      <p className="shrink-0 border-b border-[var(--border)] bg-[#F2DEC4]/40 px-3 py-2 text-[11px] text-black/50">
        The farmer did not attach a crop profile to this consultation.
      </p>
    );
  }

  return (
    <div className="grid shrink-0 gap-1.5 border-b border-[var(--border)] bg-[#F2DEC4]/40 px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#679936]/15">
          <Sprout size={15} className="text-[#4a7028]" aria-hidden="true" />
        </span>
        <span className="truncate text-[13px] font-bold text-black">
          {cropDisplayName(session, [])}
        </span>
        <Badge className="ml-auto flex items-center gap-1 bg-gray-200 text-gray-700">
          <Lock size={11} aria-hidden="true" /> Locked by farmer
        </Badge>
      </div>

      {rows.length === 0 ? (
        <p className="text-[11px] text-black/50">No stored details for this crop profile.</p>
      ) : (
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1 sm:grid-cols-3 lg:grid-cols-4">
          {rows.map((r) => (
            <div key={r.label} className="min-w-0">
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-black/40">
                {r.label}
              </dt>
              <dd className="truncate text-[12px] font-semibold text-black">{r.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
