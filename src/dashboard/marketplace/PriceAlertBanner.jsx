import { useState } from "react";
import { BellRing, X, ChevronDown, ChevronUp, Target } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatPrice } from "./marketMeta";

const KIND_META = {
  above: { label: "Above alert", chip: "bg-red-100 text-red-700" },
  below: { label: "Below alert", chip: "bg-green-100 text-green-700" },
  target: { label: "Buy target met", chip: "bg-amber-100 text-amber-800" },
};

export default function PriceAlertBanner({ alerts = [], onDismiss, onOpen }) {
  const [expanded, setExpanded] = useState(false);
  if (alerts.length === 0) return null;

  const shown = expanded ? alerts : alerts.slice(0, 2);

  return (
    <Card className="min-w-0 border-amber-300 bg-amber-50/60 py-4" role="status">
      <CardContent className="grid gap-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-amber-100">
              <BellRing size={16} className="text-amber-700" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-[14px] font-bold text-black leading-5">
                {alerts.length} watchlist price alert{alerts.length === 1 ? "" : "s"} triggered
              </p>
              <p className="text-[11px] text-black/55 leading-4">
                Checked against the latest quotes for the commodities you follow.
              </p>
            </div>
          </div>

          {alerts.length > 2 ? (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-semibold text-black/60 transition-colors hover:bg-black/5 hover:text-black cursor-pointer"
            >
              {expanded ? "Show less" : `Show all ${alerts.length}`}
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          ) : null}
        </div>

        <ul className="grid gap-1.5">
          {shown.map((alert) => {
            const kind = KIND_META[alert.kind] ?? KIND_META.target;
            const fav = alert.favorite;
            return (
              <li
                key={alert.key}
                className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-card px-3 py-2"
              >
                <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold", kind.chip)}>
                  {kind.label}
                </span>

                <button
                  type="button"
                  onClick={() => onOpen?.(fav.live ?? { id: fav.itemId, name: fav.name })}
                  className="min-w-0 flex-1 text-left cursor-pointer"
                >
                  <span className="block truncate text-[13px] font-bold text-black leading-4 hover:text-[#3f6220]">
                    {fav.name}
                  </span>
                  <span className="block truncate text-[11px] text-black/55 leading-4">
                    {alert.message}
                  </span>
                </button>

                <span className="flex shrink-0 items-center gap-1 text-[11px] text-black/50">
                  <Target size={12} aria-hidden="true" />
                  {formatPrice(alert.threshold, { unit: fav.unit })}
                </span>

                <button
                  type="button"
                  onClick={() => onDismiss?.(alert.key)}
                  aria-label={`Dismiss ${fav.name} alert`}
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-black/35 transition-colors hover:bg-black/5 hover:text-black cursor-pointer"
                >
                  <X size={14} />
                </button>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
