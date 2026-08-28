import { useState } from "react";
import { ClipboardList, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ACTIVITY_TYPES, REVIEW_TRIGGERING_ACTIVITIES, logCropActivity } from "../../services/timelineService";
import { reviewCropTimeline } from "../../services/timelineGenerator";
import { localDateISO } from "@/lib/cropUtils";

// Labels shown to the farmer for each stored activity type.
const ACTIVITY_LABELS = {
  planting: "Planting",
  irrigation: "Irrigation",
  fertilizer: "Fertilizer application",
  pesticide: "Pesticide application",
  weeding: "Weeding",
  pruning: "Pruning",
  pest_observation: "Pest observation",
  disease_observation: "Disease observation",
  harvesting: "Harvesting",
  other: "Other",
};

const inputClass =
  "w-full rounded-xl border border-black/15 bg-white px-3 py-2 text-[13px] text-black outline-none focus:border-[var(--text1)]";

// Records user-logged field activities under timelineData/{uid}/crops/{cropId}.
// Never writes to the existing crops collection.
export default function ActivityLogger({ uid, cropId, crop, onLogged }) {
  const [type, setType] = useState("irrigation");
  const [date, setDate] = useState(localDateISO());
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!uid || !cropId || saving) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const saved = await logCropActivity(uid, cropId, {
        type,
        date,
        quantity: quantity === "" ? null : Number(quantity),
        unit: unit.trim() || null,
        title: ACTIVITY_LABELS[type] ?? "Field activity",
        notes: notes.trim() || null,
      });
      const trimmedNotes = notes.trim();
      setQuantity("");
      setUnit("");
      setNotes("");
      setSaved(true);
      onLogged?.();

      // Meaningful activities trigger an intelligent timeline review in the
      // background (fire-and-forget; a 10-minute cooldown prevents spam).
      if (REVIEW_TRIGGERING_ACTIVITIES.includes(type)) {
        const qtyText = saved.quantity ? ` ${saved.quantity}${saved.unit ? " " + saved.unit : ""}` : "";
        reviewCropTimeline(uid, cropId, {
          trigger: "activity",
          causedBy: saved.id,
          triggerDetail: `${ACTIVITY_LABELS[type] ?? type} logged on ${saved.date}${qtyText}${trimmedNotes ? ` — ${trimmedNotes}` : ""}`,
        })
          .catch(() => {})
          .finally(() => onLogged?.());
      }
    } catch (err) {
      setError(err.message ?? "The activity could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="gap-3">
      <CardHeader className="pb-0">
        <CardTitle className="flex items-center gap-2 text-[15px]">
          <ClipboardList size={16} className="text-[var(--text1)]" />
          Log Field Activity
        </CardTitle>
        <CardDescription>
          Record work done on {crop?.CropName || "this crop"} — it feeds the
          AI context, and meaningful entries trigger a background timeline
          review.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-2">
          <div className="grid grid-cols-2 gap-2">
            <label className="grid gap-1">
              <span className="text-[11px] font-semibold text-black/55">
                Activity type
              </span>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className={inputClass}
              >
                {ACTIVITY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {ACTIVITY_LABELS[t]}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1">
              <span className="text-[11px] font-semibold text-black/55">
                Date
              </span>
              <input
                type="date"
                value={date}
                max={localDateISO()}
                onChange={(e) => setDate(e.target.value)}
                className={inputClass}
                required
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="grid gap-1">
              <span className="text-[11px] font-semibold text-black/55">
                Quantity (optional)
              </span>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="e.g. 20"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="grid gap-1">
              <span className="text-[11px] font-semibold text-black/55">
                Unit (optional)
              </span>
              <input
                type="text"
                maxLength={100}
                placeholder="kg, litres, hours…"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className={inputClass}
              />
            </label>
          </div>

          <label className="grid gap-1">
            <span className="text-[11px] font-semibold text-black/55">
              Notes (optional)
            </span>
            <textarea
              rows={2}
              maxLength={500}
              placeholder="What was done / observed…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={`${inputClass} resize-none`}
            />
          </label>

          {error && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-[12px] text-red-600">
              {error}
            </p>
          )}
          {saved && !error && (
            <p className="rounded-xl bg-[#D7E8C0]/60 px-3 py-2 text-[12px] text-[#3f5f22]">
              Activity saved.
            </p>
          )}

          <Button type="submit" size="sm" disabled={saving} className="mt-1">
            {saving ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Saving…
              </>
            ) : (
              "Save Activity"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
