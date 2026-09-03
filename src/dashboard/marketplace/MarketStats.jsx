import {
  TrendingUp,
  TrendingDown,
  Minus,
  Gauge,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  History,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip } from "@/components/ui/tooltip";
import {
  categoryMeta,
  formatPct,
  formatPrice,
  formatStaleness,
} from "./marketMeta";

function KpiTile({ icon: Icon, label, value, hint, tone = "text-black", chip = "bg-[#D7E8C0]" }) {
  return (
    <Card className="min-w-0 py-4">
      <CardContent className="grid gap-1.5">
        <div className="flex items-center gap-2">
          <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${chip}`}>
            <Icon size={15} className="text-black/70" aria-hidden="true" />
          </span>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-black/50">{label}</p>
        </div>
        <p className={`text-[22px] font-bold leading-7 ${tone}`}>{value}</p>
        {hint ? <p className="text-[11px] text-black/45 leading-4">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

function MoverCard({ item, tone }) {
  if (!item) return null;
  const up = tone === "up";
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  const meta = categoryMeta(item.category);
  const CategoryIcon = meta.icon;
  const stale = formatStaleness(item.lagMonths);

  return (
    <Card className={`min-w-0 py-4 ${up ? "border-green-200" : "border-red-200"}`}>
      <CardContent className="grid gap-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-black/50">
            {up ? "Top riser" : "Top faller"}
          </p>
          <span
            className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
              up ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
            }`}
          >
            <Icon size={12} aria-hidden="true" />
            {formatPct(item.changePct)}
          </span>
        </div>

        <div className="flex items-start gap-2 min-w-0">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-black/5">
            <CategoryIcon size={16} className="text-black/60" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[14px] font-bold text-black leading-5">{item.name}</p>
            <p className="text-[11px] text-black/50">
              {item.category} · {formatPrice(item.value, { unit: item.unit })}
              {stale ? ` · ${stale}` : ""}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CategoryBars({ categories, onSelect }) {
  if (categories.length === 0) return null;
  const maxAbs = Math.max(...categories.map((c) => Math.abs(c.avgChangePct ?? 0)), 1);

  return (
    <Card className="min-w-0 py-4">
      <CardContent className="grid gap-2.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[13px] font-bold text-black">Category performance</p>
          <span className="text-[11px] text-black/45">average change %</span>
        </div>

        <div className="grid gap-1.5">
          {categories.map((c) => {
            const pct = c.avgChangePct ?? 0;
            const width = Math.max(3, (Math.abs(pct) / maxAbs) * 50);
            const up = pct > 0;
            const flat = pct === 0;
            return (
              <button
                key={c.category}
                type="button"
                onClick={() => onSelect?.(c.category)}
                className="group grid grid-cols-[minmax(96px,132px)_1fr_auto] items-center gap-2 rounded-lg px-1 py-1 text-left transition-colors hover:bg-black/5 cursor-pointer"
              >
                <span className="truncate text-[12px] font-semibold text-black/75 group-hover:text-black">
                  {c.category}
                </span>

                {/* Diverging bar around a center baseline */}
                <span className="relative flex h-3 items-center rounded bg-black/5">
                  <span className="absolute left-1/2 h-full w-px bg-black/15" aria-hidden="true" />
                  <span
                    className={`absolute h-2.5 rounded-full transition-all ${
                      flat ? "bg-black/25" : up ? "bg-green-500" : "bg-red-500"
                    }`}
                    style={
                      flat
                        ? { left: "50%", width: "3px" }
                        : up
                          ? { left: "50%", width: `${width}%` }
                          : { right: "50%", width: `${width}%` }
                    }
                    aria-hidden="true"
                  />
                </span>

                <Tooltip content={`${c.count} items · ${c.gainers} up · ${c.losers} down`} side="left">
                  <span
                    className={`w-[54px] text-right text-[12px] font-bold tabular-nums ${
                      flat ? "text-black/50" : up ? "text-green-700" : "text-red-600"
                    }`}
                  >
                    {formatPct(c.avgChangePct)}
                  </span>
                </Tooltip>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default function MarketStats({ stats, onSelectCategory }) {
  if (!stats || stats.total === 0) return null;

  const breadthTone =
    stats.breadth === null
      ? "text-black"
      : stats.breadth >= 60
        ? "text-green-700"
        : stats.breadth <= 40
          ? "text-red-600"
          : "text-amber-700";

  return (
    <section aria-label="Market summary" className="grid gap-3 min-w-0">
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        <KpiTile
          icon={TrendingUp}
          label="Rising"
          value={stats.gainers}
          hint={`${stats.breadth ?? 0}% of quoted commodities`}
          tone="text-green-700"
          chip="bg-green-100"
        />
        <KpiTile
          icon={TrendingDown}
          label="Falling"
          value={stats.losers}
          hint={`${stats.categories.length} categories tracked`}
          tone="text-red-600"
          chip="bg-red-100"
        />
        <KpiTile
          icon={Minus}
          label="Unchanged"
          value={stats.flat}
          hint="Same as the previous period"
          tone="text-black/70"
          chip="bg-black/5"
        />
        <KpiTile
          icon={Gauge}
          label="Average move"
          value={formatPct(stats.avgChangePct)}
          hint="Across every quoted commodity"
          tone={(stats.avgChangePct ?? 0) >= 0 ? "text-green-700" : "text-red-600"}
          chip="bg-[#D7E8C0]"
        />
        <KpiTile
          icon={Activity}
          label="Market breadth"
          value={stats.breadth === null ? "—" : `${stats.breadth}%`}
          hint={
            stats.breadth === null
              ? "No change data in this feed"
              : stats.breadth >= 60
                ? "Broadly rising market"
                : stats.breadth <= 40
                  ? "Broadly falling market"
                  : "Mixed market conditions"
          }
          tone={breadthTone}
          chip="bg-[#D7E8C0]"
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MoverCard item={stats.topGainer} tone="up" />
        <MoverCard item={stats.topLoser} tone="down" />

        <Card className="min-w-0 py-4">
          <CardContent className="grid gap-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-black/50">
                Most volatile
              </p>
              {stats.mostVolatile?.isStale ? (
                <Badge className="bg-amber-100 text-amber-800">lagging quote</Badge>
              ) : null}
            </div>
            {stats.mostVolatile ? (
              <>
                <p className="truncate text-[14px] font-bold text-black leading-5">
                  {stats.mostVolatile.name}
                </p>
                <p className="text-[11px] text-black/50">
                  {stats.mostVolatile.category} ·{" "}
                  {formatPrice(stats.mostVolatile.value, { unit: stats.mostVolatile.unit })}
                </p>
                <p
                  className={`text-[18px] font-bold leading-6 ${
                    (stats.mostVolatile.changePct ?? 0) >= 0 ? "text-green-700" : "text-red-600"
                  }`}
                >
                  {formatPct(stats.mostVolatile.changePct)}
                </p>
              </>
            ) : (
              <p className="text-[12px] text-black/45">No change data available.</p>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0 py-4">
          <CardContent className="grid gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-black/50">
              Data quality
            </p>
            <p className="text-[22px] font-bold leading-7 text-black">
              {stats.quoted}
              <span className="text-[13px] font-semibold text-black/45">/{stats.total} quoted</span>
            </p>
            <p className="flex items-center gap-1 text-[11px] text-black/45 leading-4">
              <History size={12} aria-hidden="true" />
              {stats.staleCount > 0
                ? `${stats.staleCount} row${stats.staleCount === 1 ? "" : "s"} use an older quote period`
                : "All rows are from the newest period"}
            </p>
          </CardContent>
        </Card>
      </div>

      <CategoryBars categories={stats.categories} onSelect={onSelectCategory} />
    </section>
  );
}
