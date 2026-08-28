import { Bug } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getHealthStatus, getAffectedPart, HEALTH_LABELS } from "@/lib/cropUtils";

export default function CropHealthCard({ crop }) {
  const health = getHealthStatus(crop);
  const affectedPart = getAffectedPart(crop);

  return (
    <Card className="gap-3">
      <CardHeader className="pb-0">
        <CardTitle className="flex items-center gap-2 text-[15px]">
          <Bug size={16} className="text-[var(--text1)]" />
          Crop Health
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2">
        {health ? (
          <div className="flex items-center justify-between rounded-xl bg-[#D7E8C0]/50 px-3 py-2">
            <span className="text-[13px] text-black/70">Current status</span>
            <Badge
              variant={
                health === "Healthy"
                  ? "default"
                  : health === "PestAttack"
                    ? "destructive"
                    : "secondary"
              }
            >
              {HEALTH_LABELS[health] ?? health}
            </Badge>
          </div>
        ) : (
          <p className="rounded-xl bg-[#D7E8C0]/30 px-3 py-2 text-[13px] text-black/50">
            No health status recorded for this crop.
          </p>
        )}

        {affectedPart && (
          <div className="rounded-xl bg-[#D7E8C0]/50 px-3 py-2">
            <p className="text-[11px] font-bold uppercase text-[#526b55]">
              Affected Part
            </p>
            <p className="text-[13px] font-semibold text-black">
              {affectedPart}
            </p>
          </div>
        )}

        {crop.affectedImage ? (
          <div className="flex items-center gap-3 rounded-xl bg-[#D7E8C0]/50 px-3 py-2">
            <img
              src={crop.affectedImage}
              alt="Affected part"
              className="w-12 h-12 rounded-lg object-cover border border-[var(--text1)]/40"
            />
            <p className="text-[12px] text-black/60">
              Affected part photo on file. AI analysis will be available in a
              later phase.
            </p>
          </div>
        ) : (
          !health && (
            <p className="text-[12px] text-black/40">
              Health updates will show here as you report them.
            </p>
          )
        )}
      </CardContent>
    </Card>
  );
}
