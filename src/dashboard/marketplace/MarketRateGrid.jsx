import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  RELEVANCE_META,
  categoryMeta,
  directionMeta,
  formatPct,
  formatPeriod,
  formatPrice,
  formatSigned,
  formatStaleness,
} from "./marketMeta";
import CommodityActions from "./CommodityActions";

const MAX_BAR_PCT = 20;

export default function MarketRateGrid({
  items = [],
  favoriteIds,
  favoriteBusy,
  compareIds = [],
  onToggleFavorite,
  onToggleCompare,
  onOpen,
}) {
  if (items.length === 0) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 min-w-0">
      {items.map((item) => {
        const meta = categoryMeta(item.category);
        const CategoryIcon = meta.icon;
        const dir = directionMeta(item.direction);
        const DirIcon = dir.icon;
        const isFavorite = favoriteIds?.has(item.id) ?? false;
        const stale = formatStaleness(item.lagMonths);
        const width = Math.min(100, (Math.abs(item.changePct ?? 0) / MAX_BAR_PCT) * 100);
        const relevance = RELEVANCE_META[meta.relevance];

        return (
          <Card
            key={item.id}
            onClick={() => onOpen?.(item)}
            className={cn(
              "min-w-0 py-4 transition-colors cursor-pointer hover:border-[#679936]/60",
              isFavorite && "border-amber-300"
            )}
          >
            <CardContent className="grid gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5 min-w-0">
                  <span
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-xl"
                    style={{ backgroundColor: `${meta.tone}1a` }}
                  >
                    <CategoryIcon size={17} style={{ color: meta.tone }} aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-bold text-black leading-5">{item.name}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1">
                      <span className="rounded-full bg-black/5 px-1.5 py-0.5 text-[10px] font-semibold text-black/55">
                        {item.category}
                      </span>
                      <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-semibold", relevance.chip)}>
                        {relevance.short}
                      </span>
                    </div>
                  </div>
                </div>

                <CommodityActions
                  name={item.name}
                  isFavorite={isFavorite}
                  isComparing={compareIds.includes(item.id)}
                  busy={favoriteBusy?.has(item.id) ?? false}
                  onToggleFavorite={() => onToggleFavorite?.(item)}
                  onToggleCompare={() => onToggleCompare?.(item.id)}
                  onOpen={() => onOpen?.(item)}
                />
              </div>

              <div className="flex items-end justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[24px] font-bold leading-7 tabular-nums text-black">
                    {formatPrice(item.value)}
                  </p>
                  <p className="text-[11px] text-black/45">
                    per {item.unit ?? item.currency} · prev {formatPrice(item.prevValue)}
                  </p>
                </div>

                <div className="grid justify-items-end gap-1">
                  <span className={cn("flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-bold tabular-nums", dir.bg, dir.text)}>
                    <DirIcon size={13} aria-hidden="true" />
                    {formatPct(item.changePct)}
                  </span>
                  <span className={cn("text-[11px] font-semibold tabular-nums", dir.text)}>
                    {formatSigned(item.change)}
                  </span>
                </div>
              </div>

              {/* Diverging bar around the previous-period baseline */}
              <div>
                <div className="relative flex h-2 items-center rounded-full bg-black/5">
                  <span className="absolute left-1/2 h-full w-px bg-black/20" aria-hidden="true" />
                  <span
                    className={cn(
                      "absolute h-2 rounded-full transition-all",
                      item.direction === "up" ? "bg-green-500" : item.direction === "down" ? "bg-red-500" : "bg-black/25"
                    )}
                    style={
                      item.direction === "flat"
                        ? { left: "50%", width: "3px" }
                        : item.direction === "up"
                          ? { left: "50%", width: `${Math.max(width, 3)}%` }
                          : { right: "50%", width: `${Math.max(width, 3)}%` }
                    }
                    aria-hidden="true"
                  />
                </div>
                <div className="mt-1 flex items-center justify-between text-[10px] text-black/40">
                  <span>−{MAX_BAR_PCT}%</span>
                  <span>previous period</span>
                  <span>+{MAX_BAR_PCT}%</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-black/5 pt-2">
                <span className="text-[11px] text-black/45">
                  {item.region ?? "Global"} · {formatPeriod(item.date)}
                </span>
                {stale ? (
                  <Tooltip content={`This quote is from ${formatPeriod(item.date)}`} side="top">
                    <Badge className="bg-amber-100 text-amber-800">{stale}</Badge>
                  </Tooltip>
                ) : item.source ? (
                  <Tooltip content={item.source} side="top">
                    <span className="truncate text-[11px] text-black/40">{item.source}</span>
                  </Tooltip>
                ) : null}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
