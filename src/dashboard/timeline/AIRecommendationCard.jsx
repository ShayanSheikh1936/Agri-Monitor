import { Lightbulb } from "lucide-react";
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

// Recent persisted AI analyses → recommendations (bounded read of 3).
// Read-only: the dashboard never triggers an analysis itself.
export default function AIRecommendationCard({ crop, analyses = [], loading }) {
  return (
    <Card className="gap-3">
      <CardHeader className="pb-0">
        <CardTitle className="flex items-center gap-2 text-[15px]">
          <Lightbulb size={16} className="text-[var(--text1)]" />
          AI Recommendations
          <Badge variant="secondary" className="ml-auto">
            {loading ? "…" : analyses.length}
          </Badge>
        </CardTitle>
        <CardDescription>
          Recommendations from recent AI analyses for{" "}
          {crop?.CropName || "this crop"}.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2">
        {loading ? (
          <div className="grid gap-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : analyses.length > 0 ? (
          analyses.map((a) => (
            <div key={a.id} className="rounded-xl bg-[#D7E8C0]/40 px-3 py-2">
              {a.findings && (
                <p className="text-[12px] text-black/70 leading-4">
                  <span className="font-semibold text-black">Findings: </span>
                  {a.findings}
                </p>
              )}
              {a.recommendations && (
                <p className="text-[12px] text-black/70 mt-1 leading-4">
                  <span className="font-semibold text-black">Recommend: </span>
                  {a.recommendations}
                </p>
              )}
              <p className="text-[11px] text-black/40 mt-1">
                {formatDate(a.createdAt) ?? a.date ?? ""}
              </p>
            </div>
          ))
        ) : (
          <p className="rounded-xl bg-[#D7E8C0]/40 px-3 py-3 text-[13px] leading-5 text-black/65">
            No AI recommendations yet. When AI analyses (e.g. crop image
            analysis) are saved, their recommendations will appear here.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
