import { History, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/cropUtils";

// Recommendation & AI-analysis history — bounded, cursor-paginated reads of
// the SAME analyses subcollection used everywhere else. Purely presentational;
// the page owns the fetched pages so there is only one read path.
export default function RecommendationHistory({
  crop,
  docs = [],
  nextCursor = null,
  loadingMore = false,
  onLoadMore,
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[16px]">
          <History size={17} className="text-[var(--text1)]" />
          Recommendation History
        </CardTitle>
        <CardDescription>
          Previously generated recommendations and AI analyses for{" "}
          {crop?.CropName || "this crop"} — newest first.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2">
        {docs.length === 0 ? (
          <p className="rounded-xl bg-[#D7E8C0]/40 px-3 py-3 text-[13px] leading-5 text-black/65">
            No history yet. Generated recommendations and image analyses will
            be listed here.
          </p>
        ) : (
          docs.map((doc) => (
            <div
              key={doc.id}
              className="flex flex-col gap-1 rounded-xl bg-[#D7E8C0]/40 px-3 py-2"
            >
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {doc.kind === "recommendation"
                    ? "AI recommendation"
                    : doc.kind === "image"
                      ? "Image analysis"
                      : doc.kind ?? "AI record"}
                </Badge>
                {doc.status && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {doc.status}
                  </Badge>
                )}
                {doc.urgency && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    urgency: {doc.urgency}
                  </Badge>
                )}
                <span className="ml-auto text-[11px] text-black/40">
                  {formatDate(doc.createdAt) ?? doc.date ?? ""}
                </span>
              </div>
              {(doc.summary || doc.findings) && (
                <p className="text-[12px] leading-4 text-black/70">
                  {(doc.summary || doc.findings).slice(0, 220)}
                  {(doc.summary || doc.findings).length > 220 ? "…" : ""}
                </p>
              )}
              {doc.recommendations && (
                <p className="text-[12px] leading-4 text-black/55">
                  <span className="font-semibold text-black/70">Suggested: </span>
                  {doc.recommendations.slice(0, 220)}
                  {doc.recommendations.length > 220 ? "…" : ""}
                </p>
              )}
            </div>
          ))
        )}

        {nextCursor && (
          <button
            type="button"
            onClick={onLoadMore}
            disabled={loadingMore}
            className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-xl border border-[var(--text1)]/50 px-3 py-1.5 text-[12px] font-semibold text-[var(--text1)] transition-colors hover:bg-[#D7E8C0]/50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingMore ? (
              <>
                <Loader2 size={13} className="animate-spin" /> Loading…
              </>
            ) : (
              "Load more"
            )}
          </button>
        )}
      </CardContent>
    </Card>
  );
}
