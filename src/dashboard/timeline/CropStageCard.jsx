import { Sprout } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getSowingDate, getPlantAgeDays, formatDate } from "@/lib/cropUtils";

// Growth stage from the persisted timeline meta (AI-generated once, then
// only read here — never regenerated on the dashboard).
export default function CropStageCard({ crop, meta = null }) {
  const sowing = getSowingDate(crop);
  const ageDays = getPlantAgeDays(crop);
  const hasStage = Boolean(meta?.currentStage);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[16px]">
          <Sprout size={17} className="text-[var(--text1)]" />
          Current Growth Stage
          {hasStage && (
            <Badge variant="secondary" className="ml-auto">
              {meta.status === "active" ? "AI personalized" : meta.status}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Stage estimation personalized by AI from your crop profile.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-[#D7E8C0]/50 px-3 py-2">
          <p className="text-[11px] font-bold uppercase text-[#526b55]">
            Plant Age
          </p>
          <p className="text-[16px] font-semibold text-black">
            {ageDays != null ? `${ageDays} days` : "Unknown"}
          </p>
        </div>
        <div className="rounded-xl bg-[#D7E8C0]/50 px-3 py-2">
          <p className="text-[11px] font-bold uppercase text-[#526b55]">
            Sowing Date
          </p>
          <p className="text-[16px] font-semibold text-black">
            {sowing ? formatDate(sowing) : "Unknown"}
          </p>
        </div>
        <div className="col-span-2 rounded-xl bg-[#D7E8C0]/50 px-3 py-2">
          <p className="text-[11px] font-bold uppercase text-[#526b55]">
            Stage
          </p>
          {hasStage ? (
            <p className="text-[15px] font-semibold text-black">
              {meta.currentStage}
            </p>
          ) : (
            <p className="text-[13px] text-black/50">
              Not generated yet — open Crop Timeline to generate the
              personalized timeline.
            </p>
          )}
        </div>
        {meta?.expectedHarvestDate && (
          <div className="col-span-2 rounded-xl bg-[#D7E8C0]/50 px-3 py-2">
            <p className="text-[11px] font-bold uppercase text-[#526b55]">
              Estimated Harvest
            </p>
            <p className="text-[15px] font-semibold text-black">
              {formatDate(meta.expectedHarvestDate)}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
