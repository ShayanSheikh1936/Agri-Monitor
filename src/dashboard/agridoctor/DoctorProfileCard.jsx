import {
  Stethoscope,
  GraduationCap,
  BriefcaseMedical,
  Languages,
  Microscope,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DEFAULT_DOCTOR_PROFILE } from "@/services/agriDoctorService";

// "Who am I talking to?" — the doctor's public profile.
//
// Live from agriDoctor/main -> doctorProfile, which the doctor edits in their
// own console, so a change there appears here without a redeploy. Read-only for
// farmers. Falls back to DEFAULT_DOCTOR_PROFILE when nothing has been saved yet
// and drops empty fields, so the card never renders a wall of blanks.
export default function DoctorProfileCard({ profile = null, loading = false }) {
  const p = profile ?? DEFAULT_DOCTOR_PROFILE;

  const facts = [
    { Icon: GraduationCap, value: p.qualification },
    { Icon: Microscope, value: p.specialization },
    {
      Icon: BriefcaseMedical,
      value:
        p.experienceYears == null
          ? ""
          : `${p.experienceYears} year${p.experienceYears === 1 ? "" : "s"} of field experience`,
    },
    { Icon: Languages, value: p.languages },
  ].filter((f) => typeof f.value === "string" && f.value.trim() !== "");

  return (
    <Card className="min-w-0">
      <CardContent className="grid gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#679936]/15">
            <Stethoscope size={24} className="text-[#4a7028]" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            {loading ? (
              <>
                <Skeleton className="h-5 w-40" />
                <Skeleton className="mt-1.5 h-4 w-56" />
              </>
            ) : (
              <>
                <p className="truncate text-[15px] font-bold leading-5 text-black">
                  {p.displayName}
                </p>
                <p className="text-[12px] text-black/55">
                  Answers every consultation personally during your booked 2-hour window.
                </p>
              </>
            )}
          </div>
        </div>

        {!loading && facts.length > 0 && (
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {facts.map(({ Icon, value }) => (
              <li key={value} className="flex min-w-0 items-start gap-2">
                <Icon size={14} className="mt-0.5 shrink-0 text-[#4a7028]" aria-hidden="true" />
                <span className="min-w-0 text-[12px] leading-4 text-black/70">{value}</span>
              </li>
            ))}
          </ul>
        )}

        {!loading && p.bio && (
          <p className="rounded-xl bg-[#679936]/8 px-3 py-2 text-[12px] leading-5 text-black/70">
            {p.bio}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
