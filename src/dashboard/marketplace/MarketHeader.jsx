import {
  CircleDollarSign,
  RefreshCw,
  Download,
  Clock,
  Globe,
  Star,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectItem } from "@/components/ui/select";
import { Tooltip } from "@/components/ui/tooltip";
import { formatDateTime, formatPeriod, formatTimeAgo } from "./marketMeta";

const AUTO_REFRESH_OPTIONS = [
  { value: 0, label: "Auto-refresh off" },
  { value: 15, label: "Every 15 min" },
  { value: 30, label: "Every 30 min" },
  { value: 60, label: "Every hour" },
];

export default function MarketHeader({
  period,
  generatedAt,
  providers = [],
  itemCount = 0,
  favoriteCount = 0,
  loading = false,
  refreshing = false,
  autoRefreshMinutes = 0,
  onAutoRefreshChange,
  onRefresh,
  onExport,
}) {
  const okProviders = providers.filter((p) => p.status === "ok");
  const failedProviders = providers.filter((p) => p.status !== "ok");
  const updatedAgo = formatTimeAgo(generatedAt);

  return (
    <Card className="min-w-0">
      <CardContent className="grid gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#D7E8C0]">
              <CircleDollarSign size={24} className="text-[#3f6220]" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-black leading-6">Global Market Rates</h1>
                {itemCount > 0 ? (
                  <Badge className="bg-[#679936] text-white">{itemCount} commodities</Badge>
                ) : null}
                {favoriteCount > 0 ? (
                  <Badge className="bg-amber-100 text-amber-800">
                    <Star size={11} className="fill-current" aria-hidden="true" />
                    {favoriteCount} watching
                  </Badge>
                ) : null}
              </div>
              <p className="mt-0.5 text-[12px] text-black/60 leading-4 max-w-[620px]">
                Live world commodity prices — grains, fertilizers, energy and
                more — with a watchlist, price alerts and AI decision support
                for your farm.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={String(autoRefreshMinutes)}
              onChange={(e) => onAutoRefreshChange?.(Number(e.target.value))}
              aria-label="Auto refresh interval"
              className="w-[150px]"
            >
              {AUTO_REFRESH_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={String(opt.value)}>
                  {opt.label}
                </SelectItem>
              ))}
            </Select>

            <Tooltip content="Download the rows currently shown as CSV" side="bottom">
              <button
                type="button"
                onClick={onExport}
                disabled={loading || itemCount === 0}
                aria-label="Export market rates as CSV"
                className="flex items-center gap-1.5 rounded-xl border border-[#679936]/50 bg-card px-3 py-2 text-[13px] font-semibold text-[#3f6220] transition-colors hover:bg-[#D7E8C0]/60 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download size={14} aria-hidden="true" />
                <span className="hidden sm:inline">Export</span>
              </button>
            </Tooltip>

            <button
              type="button"
              onClick={onRefresh}
              disabled={loading || refreshing}
              aria-label="Refresh market rates"
              className="flex items-center gap-1.5 rounded-xl bg-[var(--text1)] px-3 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[#4a7028] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} aria-hidden="true" />
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-[12px] text-black/55">
          <span className="flex items-center gap-1.5">
            <Globe size={12} aria-hidden="true" />
            Quote period:{" "}
            <strong className="font-semibold text-black/75">
              {period ? formatPeriod(period) : loading ? "loading..." : "—"}
            </strong>
          </span>

          <span className="flex items-center gap-1.5">
            <Clock size={12} aria-hidden="true" />
            Feed updated:{" "}
            {generatedAt ? (
              <Tooltip content={formatDateTime(generatedAt)} side="top">
                <span className="font-semibold text-black/75">{updatedAgo ?? formatDateTime(generatedAt)}</span>
              </Tooltip>
            ) : (
              <span>{loading ? "loading..." : "—"}</span>
            )}
          </span>

          {providers.length > 0 ? (
            <span className="flex flex-wrap items-center gap-1.5">
              {okProviders.map((p) => (
                <Tooltip key={p.key} content={p.error ?? `${p.source ?? p.key} · ${p.period ?? "n/a"}`} side="top">
                  <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-700">
                    <CheckCircle2 size={11} aria-hidden="true" />
                    {p.source ?? p.key}
                  </span>
                </Tooltip>
              ))}
              {failedProviders.map((p) => (
                <Tooltip key={p.key} content={p.error ?? "Provider unavailable"} side="top">
                  <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                    <AlertTriangle size={11} aria-hidden="true" />
                    {p.source ?? p.key} offline
                  </span>
                </Tooltip>
              ))}
            </span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
