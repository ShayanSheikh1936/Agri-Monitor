import { Cpu } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function AIObservationCard({ crop }) {
  return (
    <Card className="gap-3">
      <CardHeader className="pb-0">
        <CardTitle className="flex items-center gap-2 text-[15px]">
          <Cpu size={16} className="text-[var(--text1)]" />
          AI Observations
          <Badge variant="secondary" className="ml-auto">
            Coming soon
          </Badge>
        </CardTitle>
        <CardDescription>
          Personalized insights about {crop.CropName || "this crop"} from the
          Agri Monitor AI.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="rounded-xl bg-[#D7E8C0]/40 px-3 py-3 text-[13px] leading-5 text-black/65">
          No AI observations yet. Once AI timeline generation is enabled,
          observations about growth, risks and recommended actions will appear
          here — generated from your real crop data, never invented.
        </p>
      </CardContent>
    </Card>
  );
}
