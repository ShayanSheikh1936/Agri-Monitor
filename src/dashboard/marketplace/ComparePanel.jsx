import { BarChart3, X, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  COMPARE_COLORS,
  MAX_COMPARE,
  RELEVANCE_META,
  categoryMeta,
  directionMeta,
  formatPct,
  formatPrice,
} from "./marketMeta";

export default function ComparePanel({ items = [], onRemove, onClear, onOpen }) {
  const maxAbs = Math.max(...items.map((i) => Math.abs(i.changePct ?? 0)), 1);

  return (
    <Card className="min-w-0 py-4">
      <CardContent className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#D7E8C0]">
              <BarChart3 size={16} className="text-[#3f6220]" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-[14px] font-bold text-black leading-5">Compare commodities</p>
              <p className="text-[11px] text-black/50 leading-4">
                Change against the previous period — up to {MAX_COMPARE} at a time.
              </p>
            </div>
          </div>

          {items.length > 0 ? (
            <button
              type="button"
              onClick={onClear}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-black/50 transition-colors hover:bg-red-50 hover:text-red-600 cursor-pointer"
            >
              <Trash2 size={12} aria-hidden="true" />
              Clear comparison
            </button>
          ) : null}
        </div>

        {items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-black/15 px-3 py-4 text-center text-[12px] text-black/45">
            Use the <BarChart3 size={12} className="inline align-[-2px]" aria-hidden="true" /> icon on
            any commodity to line it up against others here.
          </p>
        ) : (
          <div className="grid gap-2">
            {items.map((item, index) => {
              const dir = directionMeta(item.direction);
              const meta = categoryMeta(item.category);
              const width = (Math.abs(item.changePct ?? 0) / maxAbs) * 46;
              return (
                <div key={item.id} className="grid gap-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: COMPARE_COLORS[index % COMPARE_COLORS.length] }}
                        aria-hidden="true"
                      />
                      <button
                        type="button"
                        onClick={() => onOpen?.(item)}
                        className="truncate text-[12px] font-bold text-black hover:text-[#3f6220] cursor-pointer"
                      >
                        {item.name}
                      </button>
                      <span className="hidden shrink-0 rounded-full bg-black/5 px-1.5 py-0.5 text-[10px] font-semibold text-black/45 sm:inline">
                        {RELEVANCE_META[meta.relevance]?.label ?? meta.relevance}
                      </span>
                    </span>

                    <span className="flex shrink-0 items-center gap-2">
                      <span className="text-[11px] tabular-nums text-black/55">
                        {formatPrice(item.value, { unit: item.unit })}
                      </span>
                      <span className={cn("w-[62px] text-right text-[12px] font-bold tabular-nums", dir.text)}>
                        {formatPct(item.changePct)}
                      </span>
                      <Tooltip content="Remove from comparison" side="top">
                        <button
                          type="button"
                          onClick={() => onRemove?.(item.id)}
                          aria-label={`Remove ${item.name} from comparison`}
                          className="grid h-6 w-6 place-items-center rounded-md text-black/35 transition-colors hover:bg-black/5 hover:text-black cursor-pointer"
                        >
                          <X size={12} />
                        </button>
                      </Tooltip>
                    </span>
                  </div>

                  <div className="relative flex h-3 items-center rounded-full bg-black/5">
                    <span className="absolute left-1/2 h-full w-px bg-black/20" aria-hidden="true" />
                    <span
                      className="absolute h-3 rounded-full transition-all"
                      style={{
                        backgroundColor: COMPARE_COLORS[index % COMPARE_COLORS.length],
                        ...(item.direction === "down"
                          ? { right: "50%", width: `${Math.max(width, 2)}%` }
                          : { left: "50%", width: `${Math.max(width, 2)}%` }),
                      }}
                      aria-hidden="true"
                    />
                  </div>
                </div>
              );
            })}

            <div className="flex items-center justify-between text-[10px] text-black/40">
              <span>−{Math.round(maxAbs)}%</span>
              <span>no change vs previous period</span>
              <span>+{Math.round(maxAbs)}%</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
