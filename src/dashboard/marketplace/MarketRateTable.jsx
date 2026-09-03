import { Card, CardContent } from "@/components/ui/card";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  categoryMeta,
  directionMeta,
  formatPct,
  formatPeriod,
  formatPrice,
  formatSigned,
  formatStaleness,
} from "./marketMeta";
import CommodityActions from "./CommodityActions";

const MAX_BAR_PCT = 20; // full-width bar at ±20% change

function ChangeCell({ item }) {
  const meta = directionMeta(item.direction);
  const Icon = meta.icon;
  const width = Math.min(100, (Math.abs(item.changePct ?? 0) / MAX_BAR_PCT) * 100);

  return (
    <div className="flex items-center justify-end gap-2">
      <span className="hidden w-[70px] shrink-0 sm:block">
        <span className="flex h-1.5 items-center justify-end rounded-full bg-black/5">
          <span
            className={cn("h-1.5 rounded-full", item.direction === "up" ? "bg-green-500" : item.direction === "down" ? "bg-red-500" : "bg-black/25")}
            style={{ width: item.direction === "flat" ? "3px" : `${Math.max(width, 4)}%` }}
            aria-hidden="true"
          />
        </span>
      </span>
      <span className={cn("flex w-[74px] items-center justify-end gap-1 text-[13px] font-bold tabular-nums", meta.text)}>
        <Icon size={13} aria-hidden="true" />
        {formatPct(item.changePct)}
      </span>
    </div>
  );
}

export default function MarketRateTable({
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
    <Card className="min-w-0 py-0 overflow-hidden">
      <CardContent className="p-0">
        <div className="max-h-[620px] overflow-auto scrollbar-thin scrollbar-track-[#F2DEC4] scrollbar-thumb-[#679936]">
          <table className="w-full border-collapse text-left">
            <thead className="sticky top-0 z-10 bg-[#D7E8C0]">
              <tr className="text-[11px] font-bold uppercase tracking-wide text-black/60">
                <th scope="col" className="px-3 py-2.5">Commodity</th>
                <th scope="col" className="px-3 py-2.5 text-right">Price</th>
                <th scope="col" className="hidden px-3 py-2.5 text-right lg:table-cell">Previous</th>
                <th scope="col" className="hidden px-3 py-2.5 text-right md:table-cell">Change</th>
                <th scope="col" className="px-3 py-2.5 text-right">Change %</th>
                <th scope="col" className="hidden px-3 py-2.5 xl:table-cell">Period</th>
                <th scope="col" className="px-3 py-2.5 text-right">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                const meta = categoryMeta(item.category);
                const CategoryIcon = meta.icon;
                const isFavorite = favoriteIds?.has(item.id) ?? false;
                const stale = formatStaleness(item.lagMonths);

                return (
                  <tr
                    key={item.id}
                    onClick={() => onOpen?.(item)}
                    className={cn(
                      "border-t border-black/5 text-[13px] transition-colors cursor-pointer hover:bg-[#D7E8C0]/40",
                      index % 2 === 1 && "bg-black/[0.015]"
                    )}
                  >
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg"
                          style={{ backgroundColor: `${meta.tone}1a` }}
                        >
                          <CategoryIcon size={15} style={{ color: meta.tone }} aria-hidden="true" />
                        </span>
                        <span className="min-w-0">
                          <span className="flex items-center gap-1.5">
                            <span className="truncate text-[13px] font-bold text-black leading-4">{item.name}</span>
                            {isFavorite ? (
                              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" aria-label="On watchlist" />
                            ) : null}
                          </span>
                          <span className="flex flex-wrap items-center gap-x-1.5 text-[11px] text-black/45 leading-4">
                            <span>{item.category}</span>
                            {item.region ? <span>· {item.region}</span> : null}
                            {stale ? (
                              <Tooltip content={`This quote is from ${formatPeriod(item.date)}`} side="top">
                                <span className="rounded bg-amber-100 px-1 text-[10px] font-semibold text-amber-800">
                                  {stale}
                                </span>
                              </Tooltip>
                            ) : null}
                          </span>
                        </span>
                      </div>
                    </td>

                    <td className="px-3 py-2 text-right">
                      <span className="block text-[13px] font-bold tabular-nums text-black">
                        {formatPrice(item.value)}
                      </span>
                      <span className="block text-[10px] text-black/45">{item.unit ?? item.currency}</span>
                    </td>

                    <td className="hidden px-3 py-2 text-right tabular-nums text-black/55 lg:table-cell">
                      {formatPrice(item.prevValue)}
                    </td>

                    <td
                      className={cn(
                        "hidden px-3 py-2 text-right tabular-nums font-semibold md:table-cell",
                        directionMeta(item.direction).text
                      )}
                    >
                      {formatSigned(item.change)}
                    </td>

                    <td className="px-3 py-2 text-right">
                      <ChangeCell item={item} />
                    </td>

                    <td className="hidden px-3 py-2 text-[12px] text-black/55 xl:table-cell">
                      {formatPeriod(item.date)}
                    </td>

                    <td className="px-2 py-2">
                      <div className="flex justify-end">
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
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
