import { Cpu } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/cropUtils";

// Recent persisted AI observations (bounded read). Empty state is honest —
// observations are only shown once some phase stores them.
export default function AIObservationCard({ crop, observations = [], loading }) {
  return (
    <Card className="gap-3">
      <CardHeader className="pb-0">
        <CardTitle className="flex items-center gap-2 text-[15px]">
          <Cpu size={16} className="text-[var(--text1)]" />
          AI Observations
          <Badge variant="secondary" className="ml-auto">
            {loading ? "…" : observations.length}
          </Badge>
        </CardTitle>
        <CardDescription>
          Personalized insights about {crop?.CropName || "this crop"} from the
          Agri Monitor AI.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2">
        {loading ? (
          <div className="grid gap-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : observations.length > 0 ? (
          observations.map((obs) => (
            <div
              key={obs.id}
              className="rounded-xl bg-[#D7E8C0]/40 px-3 py-2"
            >
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="text-[13px] font-semibold text-black">
                  {obs.title || obs.category}
                </p>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {obs.category}
                </Badge>
                {obs.severity && obs.severity !== "info" && (
                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                    {obs.severity}
                  </Badge>
                )}
              </div>
              {obs.message && (
                <p className="text-[12px] text-black/70 mt-0.5 leading-4">
                  {obs.message}
                </p>
              )}
              <p className="text-[11px] text-black/40 mt-0.5">
                {formatDate(obs.createdAt) ?? obs.date ?? ""}
              </p>
            </div>
          ))
        ) : (
          <p className="rounded-xl bg-[#D7E8C0]/40 px-3 py-3 text-[13px] leading-5 text-black/65">
            No AI observations yet. Observations about growth, risks and
            recommended actions will appear here — generated from your real
            crop data, never invented.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
