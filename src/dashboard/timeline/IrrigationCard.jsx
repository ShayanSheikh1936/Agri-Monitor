import { Droplets } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function IrrigationCard({ crop }) {
  return (
    <Card className="gap-3">
      <CardHeader className="pb-0">
        <CardTitle className="flex items-center gap-2 text-[15px]">
          <Droplets size={16} className="text-[var(--text1)]" />
          Irrigation
          <Badge variant="secondary" className="ml-auto">
            Schedule coming soon
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2">
        <div className="rounded-xl bg-[#D7E8C0]/50 px-3 py-2">
          <p className="text-[11px] font-bold uppercase text-[#526b55]">
            Irrigation System
          </p>
          <p className="text-[14px] font-semibold text-black">
            {crop.IrrigationType || (
              <span className="font-normal text-black/40">Not provided</span>
            )}
          </p>
        </div>
        <p className="rounded-xl border border-dashed border-[var(--text1)]/40 px-3 py-2 text-[12px] leading-5 text-black/60">
          A smart watering schedule based on crop stage and local weather will
          appear here in a later phase.
        </p>
      </CardContent>
    </Card>
  );
}
