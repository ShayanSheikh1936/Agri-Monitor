import { useState } from "react";
import { NotebookPen, Loader2, Sparkles } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { generateDailySummary } from "@/services/timelineGenerator";

// Daily AI summary — generated ON DEMAND (never per render) from the crop's
// real stage, today's tasks, recent activities, weather and observations via
// the existing AI backend. Missing data is left out, never invented.
export default function DailyAISummary({
  uid,
  cropId,
  crop,
  todayEvents = [],
  observations = [],
  currentStage = null,
}) {
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);

  async function handleGenerate() {
    if (busy || !uid || !cropId) return;
    setBusy(true);
    setError(null);
    try {
      const result = await generateDailySummary(uid, cropId, {
        todayEvents,
        observations,
        currentStage,
      });
      if (!result.ok) {
        throw new Error(result.error?.message ?? "Daily summary failed.");
      }
      setSummary(result.summary);
    } catch (err) {
      setError(err.message ?? "Daily summary failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="gap-3">
      <CardHeader className="pb-0">
        <CardTitle className="flex items-center gap-2 text-[15px]">
          <NotebookPen size={16} className="text-[var(--text1)]" />
          Daily AI Summary
        </CardTitle>
        <CardDescription>
          A short recap of today for {crop?.CropName || "this crop"}, written
          from your real tasks, activities and weather.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2">
        {!summary && (
          <Button size="sm" onClick={handleGenerate} disabled={busy} className="w-fit">
            {busy ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Writing summary…
              </>
            ) : (
              <>
                <Sparkles size={14} /> Generate today's summary
              </>
            )}
          </Button>
        )}

        {busy && (
          <p className="text-[12px] text-black/55">
            Reading today's tasks, recent activities and weather… (can take
            up to a minute)
          </p>
        )}

        {summary && !busy && (
          <div className="rounded-xl bg-[#D7E8C0]/40 px-3 py-2.5">
            <p className="whitespace-pre-line text-[13px] leading-5 text-black/75">
              {summary}
            </p>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={busy}
              className="mt-2 text-[12px] font-semibold text-[var(--text1)] hover:underline cursor-pointer disabled:opacity-50"
            >
              Regenerate
            </button>
          </div>
        )}

        {error && (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-[12px] text-red-600">
            {error}
          </p>
        )}

        <p className="text-[11px] text-black/40">
          Uses only recorded data — unknown values are left out, not guessed.
        </p>
      </CardContent>
    </Card>
  );
}
