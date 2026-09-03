import { Search, X, ArrowUpDown, Table, LayoutGrid, Star, RotateCcw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectItem } from "@/components/ui/select";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { RELEVANCE, RELEVANCE_META, SORT_OPTIONS, VIEW_OPTIONS } from "./marketMeta";

const DIRECTION_OPTIONS = [
  { value: "all", label: "All movements" },
  { value: "up", label: "Rising only" },
  { value: "down", label: "Falling only" },
  { value: "flat", label: "Unchanged only" },
];

const RELEVANCE_OPTIONS = [
  { id: "all", label: "Everything", hint: "All commodities in the feed" },
  { id: RELEVANCE.OUTPUT, ...RELEVANCE_META[RELEVANCE.OUTPUT] },
  { id: RELEVANCE.INPUT, ...RELEVANCE_META[RELEVANCE.INPUT] },
  { id: RELEVANCE.OTHER, ...RELEVANCE_META[RELEVANCE.OTHER] },
];

const VIEW_ICONS = { table: Table, cards: LayoutGrid };

export default function MarketFilters({
  filters,
  categories = [],
  resultCount = 0,
  totalCount = 0,
  favoriteCount = 0,
  onPatch,
  onReset,
}) {
  const activeFilters =
    (filters.category !== "all" ? 1 : 0) +
    (filters.relevance !== "all" ? 1 : 0) +
    (filters.direction !== "all" ? 1 : 0) +
    (filters.search ? 1 : 0) +
    (filters.favoriteOnly ? 1 : 0);

  return (
    <Card className="min-w-0 py-4">
      <CardContent className="grid gap-3">
        {/* Row 1 — search + sorting + view */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[190px] flex-1">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-black/40"
              aria-hidden="true"
            />
            <input
              type="search"
              value={filters.search}
              onChange={(e) => onPatch({ search: e.target.value })}
              placeholder="Search commodity, category or unit..."
              aria-label="Search commodities"
              className="w-full rounded-xl border border-[var(--border)] bg-card py-2 pl-9 pr-8 text-[13px] text-black outline-none transition-colors placeholder:text-black/35 hover:border-[#679936]/60 focus:border-[#679936] focus:ring-2 focus:ring-[#679936]/25"
            />
            {filters.search ? (
              <button
                type="button"
                onClick={() => onPatch({ search: "" })}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full text-black/40 transition-colors hover:bg-black/5 hover:text-black cursor-pointer"
              >
                <X size={13} />
              </button>
            ) : null}
          </div>

          <Select
            value={filters.direction}
            onChange={(e) => onPatch({ direction: e.target.value })}
            aria-label="Filter by price movement"
            className="w-[150px]"
          >
            {DIRECTION_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </Select>

          <Select
            value={filters.sortBy}
            onChange={(e) => onPatch({ sortBy: e.target.value })}
            aria-label="Sort commodities"
            className="w-[170px]"
          >
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </Select>

          <Tooltip content={filters.sortDir === "desc" ? "Highest first" : "Lowest first"} side="bottom">
            <button
              type="button"
              onClick={() => onPatch({ sortDir: filters.sortDir === "desc" ? "asc" : "desc" })}
              aria-label="Toggle sort direction"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[var(--border)] bg-card text-black/60 transition-colors hover:border-[#679936]/60 hover:text-[#3f6220] cursor-pointer"
            >
              <ArrowUpDown size={15} className={filters.sortDir === "asc" ? "-scale-y-100" : ""} />
            </button>
          </Tooltip>

          <div className="inline-flex shrink-0 gap-1 rounded-xl bg-[#D7E8C0]/70 p-1">
            {VIEW_OPTIONS.map((opt) => {
              const Icon = VIEW_ICONS[opt.value];
              const active = filters.view === opt.value;
              return (
                <Tooltip key={opt.value} content={`${opt.label} view`} side="bottom">
                  <button
                    type="button"
                    onClick={() => onPatch({ view: opt.value })}
                    aria-label={`${opt.label} view`}
                    aria-pressed={active}
                    className={cn(
                      "grid h-7 w-8 place-items-center rounded-lg transition-colors cursor-pointer",
                      active ? "bg-[#679936] text-white shadow-sm" : "text-black/60 hover:bg-black/5"
                    )}
                  >
                    <Icon size={15} />
                  </button>
                </Tooltip>
              );
            })}
          </div>
        </div>

        {/* Row 2 — category pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-track-[#F2DEC4] scrollbar-thumb-[#679936]">
          <button
            type="button"
            onClick={() => onPatch({ category: "all" })}
            aria-pressed={filters.category === "all"}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors cursor-pointer",
              filters.category === "all"
                ? "bg-[#679936] text-white"
                : "bg-black/5 text-black/65 hover:bg-black/10"
            )}
          >
            All · {totalCount}
          </button>
          {categories.map((c) => (
            <button
              key={c.name}
              type="button"
              onClick={() => onPatch({ category: filters.category === c.name ? "all" : c.name })}
              aria-pressed={filters.category === c.name}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors cursor-pointer",
                filters.category === c.name
                  ? "bg-[#679936] text-white"
                  : "bg-black/5 text-black/65 hover:bg-black/10"
              )}
            >
              {c.name} · {c.count}
            </button>
          ))}
        </div>

        {/* Row 3 — farm relevance + watchlist + reset */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {RELEVANCE_OPTIONS.map((opt) => {
              const active = filters.relevance === opt.id;
              return (
                <Tooltip key={opt.id} content={opt.hint ?? opt.label} side="top">
                  <button
                    type="button"
                    onClick={() => onPatch({ relevance: active ? "all" : opt.id })}
                    aria-pressed={active}
                    className={cn(
                      "rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer",
                      active
                        ? "border-[#679936] bg-[#679936] text-white"
                        : "border-[var(--border)] bg-card text-black/60 hover:border-[#679936]/60 hover:text-[#3f6220]"
                    )}
                  >
                    {opt.label}
                  </button>
                </Tooltip>
              );
            })}

            <button
              type="button"
              onClick={() => onPatch({ favoriteOnly: !filters.favoriteOnly })}
              aria-pressed={filters.favoriteOnly}
              className={cn(
                "flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer",
                filters.favoriteOnly
                  ? "border-amber-400 bg-amber-100 text-amber-800"
                  : "border-[var(--border)] bg-card text-black/60 hover:border-amber-400/70 hover:text-amber-800"
              )}
            >
              <Star size={12} className={filters.favoriteOnly ? "fill-current" : ""} aria-hidden="true" />
              My watchlist{favoriteCount > 0 ? ` (${favoriteCount})` : ""}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-black/45">
              Showing <strong className="font-bold text-black/70">{resultCount}</strong> of {totalCount}
            </span>
            {activeFilters > 0 ? (
              <button
                type="button"
                onClick={onReset}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-black/55 transition-colors hover:bg-black/5 hover:text-black cursor-pointer"
              >
                <RotateCcw size={12} aria-hidden="true" />
                Reset {activeFilters} filter{activeFilters === 1 ? "" : "s"}
              </button>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
