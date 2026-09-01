import { useState } from "react";
import { HeartPulse, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { updateExtendedProfile } from "@/services/timelineService";
import { reviewCropTimeline } from "@/services/timelineGenerator";

// Daily crop condition — stored in the EXISTING timeline meta profile
// (profile.currentCondition via updateExtendedProfile), never inventing a
// new health store. A meaningful change triggers a background timeline
// review (condition_change), same pattern as ActivityLogger.
const CONDITIONS = [
  { value: "healthy", label: "Healthy", cls: "border-[var(--text1)]/50 text-[#3f5f22] hover:bg-[#D7E8C0]/60" },
  { value: "needs_attention", label: "Needs attention", cls: "border-amber-300 text-amber-700 hover:bg-amber-50" },
  { value: "stressed", label: "Stressed", cls: "border-orange-300 text-orange-700 hover:bg-orange-50" },
  { value: "affected", label: "Affected", cls: "border-red-300 text-red-700 hover:bg-red-50" },
];

export default function ConditionRecorder({ uid, cropId, crop, meta, onChanged }) {
  const stored = meta?.profile?.currentCondition ?? null;
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  async function handlePick(condition) {
    if (!uid || !cropId || saving || condition === stored) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await updateExtendedProfile(uid, cropId, { currentCondition: condition });
      setSaved(true);
      onChanged?.();

      // Anything other than "healthy" is a meaningful change signal.
      if (condition !== "healthy") {
        reviewCropTimeline(uid, cropId, {
          trigger: "condition_change",
          triggerDetail: `Farmer reported crop condition: ${condition} for ${crop?.CropName ?? "this crop"}.`,
        })
          .catch(() => {})
          .finally(() => onChanged?.());
      }
    } catch (err) {
      setError(err.message ?? "The condition could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="gap-3">
      <CardHeader className="pb-0">
        <CardTitle className="flex items-center gap-2 text-[15px]">
          <HeartPulse size={16} className="text-[var(--text1)]" />
          Crop Condition Today
        </CardTitle>
        <CardDescription>
          Your own field check for {crop?.CropName || "this crop"} — recorded
          as-is, never inferred.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2">
        <div className="grid grid-cols-2 gap-2">
          {CONDITIONS.map((c) => {
            const active = stored === c.value;
            return (
              <button
                key={c.value}
                type="button"
                disabled={saving}
                onClick={() => handlePick(c.value)}
                className={`rounded-xl border px-3 py-2 text-[13px] font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                  active ? `${c.cls} bg-[#D7E8C0]/60` : "border-black/15 text-black/60 hover:bg-black/5"
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>
        {saving && (
          <p className="flex items-center gap-1.5 text-[12px] text-black/55">
            <Loader2 size={13} className="animate-spin" /> Saving condition…
          </p>
        )}
        {saved && !error && (
          <p className="rounded-xl bg-[#D7E8C0]/60 px-3 py-2 text-[12px] text-[#3f5f22]">
            Condition recorded.
          </p>
        )}
        {error && (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-[12px] text-red-600">
            {error}
          </p>
        )}
        <p className="text-[11px] text-black/40">
          {stored
            ? `Last recorded: ${CONDITIONS.find((c) => c.value === stored)?.label ?? stored}`
            : "No condition recorded for this crop yet."}
        </p>
      </CardContent>
    </Card>
  );
}
