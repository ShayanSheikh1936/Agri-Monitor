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

export default function CropStageCard({ crop }) {
  const sowing = getSowingDate(crop);
  const ageDays = getPlantAgeDays(crop);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[16px]">
          <Sprout size={17} className="text-[var(--text1)]" />
          Current Growth Stage
          <Badge variant="secondary" className="ml-auto">
            AI coming soon
          </Badge>
        </CardTitle>
        <CardDescription>
          Stage estimation will be personalized by AI from your crop profile.
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
        <div className="col-span-2 rounded-xl border border-dashed border-[var(--text1)]/40 px-3 py-2 text-[13px] text-black/60">
          Germination, vegetative, flowering and maturity stages will appear
          here once AI timeline generation is enabled.
        </div>
      </CardContent>
    </Card>
  );
}
