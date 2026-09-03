import { Star, BarChart3, ChevronRight } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// Shared row/card actions — identical behavior in the table and card views.
export default function CommodityActions({
  isFavorite = false,
  isComparing = false,
  busy = false,
  name = "Commodity",
  onToggleFavorite,
  onToggleCompare,
  onOpen,
}) {
  return (
    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
      <Tooltip content={isFavorite ? "Remove from watchlist" : "Add to watchlist"} side="top">
        <button
          type="button"
          onClick={onToggleFavorite}
          disabled={busy}
          aria-label={isFavorite ? `Remove ${name} from watchlist` : `Add ${name} to watchlist`}
          aria-pressed={isFavorite}
          className={cn(
            "grid h-8 w-8 place-items-center rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
            isFavorite
              ? "bg-amber-100 text-amber-500 hover:bg-amber-200"
              : "text-black/35 hover:bg-black/5 hover:text-amber-500"
          )}
        >
          <Star size={16} className={isFavorite ? "fill-current" : ""} />
        </button>
      </Tooltip>

      <Tooltip content={isComparing ? "Remove from comparison" : "Add to comparison"} side="top">
        <button
          type="button"
          onClick={onToggleCompare}
          aria-label={isComparing ? `Remove ${name} from comparison` : `Add ${name} to comparison`}
          aria-pressed={isComparing}
          className={cn(
            "grid h-8 w-8 place-items-center rounded-lg transition-colors cursor-pointer",
            isComparing
              ? "bg-[#679936]/15 text-[#3f6220] hover:bg-[#679936]/25"
              : "text-black/35 hover:bg-black/5 hover:text-[#3f6220]"
          )}
        >
          <BarChart3 size={16} />
        </button>
      </Tooltip>

      <Tooltip content="Details & AI analysis" side="top">
        <button
          type="button"
          onClick={onOpen}
          aria-label={`Open details for ${name}`}
          className="grid h-8 w-8 place-items-center rounded-lg text-black/35 transition-colors hover:bg-black/5 hover:text-black cursor-pointer"
        >
          <ChevronRight size={16} />
        </button>
      </Tooltip>
    </div>
  );
}
