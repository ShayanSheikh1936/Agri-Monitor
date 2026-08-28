import { CalendarDays, Sprout } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getPlantAgeDays, formatDate } from "@/lib/cropUtils";

// Timeline of crop stages. At the foundation stage there is no AI-generated
// timeline yet, so this renders an honest empty state with the only real
// timeline fact we have: the registration/sowing marker.
export default function CropTimeline({ crop }) {
  const ageDays = getPlantAgeDays(crop);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[16px]">
          <CalendarDays size={17} className="text-[var(--text1)]" />
          Crop Timeline
          <Badge variant="secondary" className="ml-auto">
            AI coming soon
          </Badge>
        </CardTitle>
        <CardDescription>
          A personalized stage-by-stage timeline, generated from this crop's
          profile, local weather and AI agronomy.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative pl-6">
          {/* Vertical track */}
          <span className="absolute left-[7px] top-1 bottom-1 w-[2px] rounded bg-[var(--text1)]/25" />

          {/* Real marker: crop registration */}
          <div className="relative pb-4">
            <span className="absolute -left-6 top-0.5 w-4 h-4 rounded-full border-2 border-[var(--text1)] bg-[#D7E8C0]" />
            <p className="text-[14px] font-semibold text-black">
              Crop registered
            </p>
            <p className="text-[12px] text-black/55">
              {formatDate(crop.createdAt) ?? "Date unknown"}
              {ageDays != null && ` — currently day ${ageDays}`}
            </p>
          </div>

          {/* Placeholder marker: generated stages */}
          <div className="relative">
            <span className="absolute -left-6 top-0.5 w-4 h-4 rounded-full border-2 border-dashed border-[var(--text1)]/50 bg-[var(--bg)]" />
            <p className="text-[14px] font-semibold text-black/45">
              Growth stages will appear here
            </p>
            <p className="text-[12px] text-black/45">
              Germination → Vegetative → Flowering → Maturity, with dates
              personalized for {crop.CropName || "this crop"}.
            </p>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-xl bg-[#D7E8C0]/40 px-3 py-2 text-[13px] text-black/65">
          <Sprout size={15} className="shrink-0 text-[var(--text1)]" />
          AI timeline generation is not enabled yet. Nothing is invented —
          stages will be created from your real crop data.
        </div>
      </CardContent>
    </Card>
  );
}
