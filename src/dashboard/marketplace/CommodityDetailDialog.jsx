import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  BarChart3,
  ExternalLink,
  Loader2,
  Sparkles,
  Star,
  Target,
} from "lucide-react";
import {
  GUIDANCE_META,
  RELEVANCE_META,
  SEVERITY_CHIP,
  categoryMeta,
  directionMeta,
  formatPct,
  formatPeriod,
  formatPrice,
  formatSigned,
  formatStaleness,
} from "./marketMeta";

const MAX_BAR_PCT = 20;

function DetailRow({ label, children }) {
  return (
    <div className="grid gap-0.5 rounded-lg bg-black/[0.03] px-2.5 py-1.5">
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-black/40">{label}</dt>
      <dd className="text-[12px] font-semibold text-black/80 break-words">{children}</dd>
    </div>
  );
}

function CommodityAIResult({ result }) {
  const guidance = GUIDANCE_META[result.guidance] ?? GUIDANCE_META.watch;
  return (
    <div className="grid gap-2.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", guidance.chip)}>
          {guidance.label}
        </span>
        <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold capitalize", SEVERITY_CHIP[result.urgency] ?? SEVERITY_CHIP.medium)}>
          {result.urgency} urgency
        </span>
        {result.confidence !== null ? (
          <span className="text-[11px] font-semibold text-black/45">
            confidence {Math.round(result.confidence * 100)}%
          </span>
        ) : null}
      </div>

      <p className="text-[13px] leading-5 text-black/80">{result.outlook}</p>

      {result.farmerImpact ? (
        <div className="grid gap-1 rounded-xl border border-[#679936]/25 bg-[#D7E8C0]/35 p-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-black/45">What it means for your farm</p>
          <p className="text-[12px] leading-5 text-black/75">{result.farmerImpact}</p>
        </div>
      ) : null}

      {result.recommendedAction ? (
        <div className="grid gap-1 rounded-xl border border-amber-200 bg-amber-50/60 p-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-black/45">Suggested next step</p>
          <p className="text-[12px] leading-5 text-black/75">{result.recommendedAction}</p>
        </div>
      ) : null}

      {result.drivers?.length ? (
        <div className="grid gap-1">
          <p className="text-[10px] font-bold uppercase tracking-wide text-black/45">Likely drivers</p>
          <ul className="grid gap-1">
            {result.drivers.map((d, i) => (
              <li key={`${d}-${i}`} className="flex items-start gap-1.5 text-[12px] leading-4 text-black/70">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#679936]" aria-hidden="true" />
                {d}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-2">
        {result.relatedCrops?.length ? (
          <div className="grid gap-1">
            <p className="text-[10px] font-bold uppercase tracking-wide text-black/45">Related crops</p>
            <div className="flex flex-wrap gap-1">
              {result.relatedCrops.map((c) => (
                <span key={c} className="rounded-full bg-[#679936]/12 px-2 py-0.5 text-[11px] font-semibold text-[#3f6220]">
                  {c}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {result.watchFor?.length ? (
          <div className="grid gap-1">
            <p className="text-[10px] font-bold uppercase tracking-wide text-black/45">Watch for</p>
            <ul className="grid gap-1">
              {result.watchFor.map((w, i) => (
                <li key={`${w}-${i}`} className="text-[12px] leading-4 text-black/70">
                  · {w}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function CommodityDetailDialog({
  item,
  open = false,
  onOpenChange,
  isFavorite = false,
  favorite = null,
  favoriteBusy = false,
  isComparing = false,
  categoryStats = null,
  ai = null,
  onToggleFavorite,
  onToggleCompare,
  onAnalyze,
}) {
  if (!item) return null;

  const meta = categoryMeta(item.category);
  const CategoryIcon = meta.icon;
  const relevance = RELEVANCE_META[meta.relevance];
  const dir = directionMeta(item.direction);
  const DirIcon = dir.icon;
  const stale = formatStaleness(item.lagMonths);
  const width = Math.min(100, (Math.abs(item.changePct ?? 0) / MAX_BAR_PCT) * 100);

  // Only show this commodity's AI state — never another dialog's leftovers.
  const aiState = ai?.itemId === item.id ? ai : null;
  const aiLoading = aiState?.status === "loading";
  const aiError = aiState?.status === "error" ? aiState.error : null;
  const aiResult = aiState?.status === "ready" ? aiState.result : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[720px]" onClose={() => onOpenChange?.(false)}>
        <DialogHeader className="pr-12">
          <div className="flex items-start gap-3">
            <span
              className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl"
              style={{ backgroundColor: `${meta.tone}1f` }}
            >
              <CategoryIcon size={22} style={{ color: meta.tone }} aria-hidden="true" />
            </span>
            <div className="min-w-0 grid gap-1.5">
              <DialogTitle className="break-words">{item.name}</DialogTitle>
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge className="bg-black/5 text-black/60">{item.category}</Badge>
                <Badge className={relevance.chip}>{relevance.label}</Badge>
                <Badge className={cn(dir.bg, dir.text)}>
                  <DirIcon size={11} aria-hidden="true" />
                  {formatPct(item.changePct)}
                </Badge>
                {stale ? <Badge className="bg-amber-100 text-amber-800">{stale}</Badge> : null}
              </div>
            </div>
          </div>
        </DialogHeader>

        <DialogBody>
          {/* Price + movement */}
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <div className="grid gap-1">
              <p className="text-[30px] font-bold leading-9 tabular-nums text-black">
                {formatPrice(item.value)}
                <span className="ml-1.5 text-[13px] font-semibold text-black/45">
                  {item.unit ?? item.currency}
                </span>
              </p>
              <p className={cn("flex items-center gap-1.5 text-[13px] font-bold tabular-nums", dir.text)}>
                <DirIcon size={15} aria-hidden="true" />
                {formatSigned(item.change)} ({formatPct(item.changePct)}) vs {formatPrice(item.prevValue)}
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onToggleFavorite?.(item)}
                disabled={favoriteBusy}
                className={cn(
                  "flex items-center gap-1.5 rounded-xl px-3 py-2 text-[13px] font-semibold transition-colors cursor-pointer disabled:opacity-50",
                  isFavorite
                    ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                    : "border border-[var(--border)] bg-card text-black/65 hover:border-amber-400/70 hover:text-amber-700"
                )}
              >
                {favoriteBusy ? (
                  <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                ) : (
                  <Star size={14} className={isFavorite ? "fill-current" : ""} aria-hidden="true" />
                )}
                {isFavorite ? "On watchlist" : "Add to watchlist"}
              </button>

              <Tooltip content={isComparing ? "Remove from comparison" : "Add to comparison"} side="top">
                <button
                  type="button"
                  onClick={() => onToggleCompare?.(item.id)}
                  aria-pressed={isComparing}
                  className={cn(
                    "grid h-9 w-9 place-items-center rounded-xl transition-colors cursor-pointer",
                    isComparing
                      ? "bg-[#679936] text-white"
                      : "border border-[var(--border)] bg-card text-black/55 hover:border-[#679936]/60 hover:text-[#3f6220]"
                  )}
                >
                  <BarChart3 size={15} />
                </button>
              </Tooltip>
            </div>
          </div>

          {/* Diverging bar */}
          <div className="grid gap-1">
            <div className="relative flex h-2.5 items-center rounded-full bg-black/5">
              <span className="absolute left-1/2 h-full w-px bg-black/20" aria-hidden="true" />
              <span
                className={cn(
                  "absolute h-2.5 rounded-full",
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
            <div className="flex items-center justify-between text-[10px] text-black/40">
              <span>−{MAX_BAR_PCT}%</span>
              <span>previous period baseline</span>
              <span>+{MAX_BAR_PCT}%</span>
            </div>
          </div>

          {stale ? (
            <p className="flex items-start gap-1.5 rounded-xl border border-amber-200 bg-amber-50/60 px-3 py-2 text-[12px] leading-4 text-black/70">
              <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-700" aria-hidden="true" />
              This quote is from {formatPeriod(item.date)} — {stale.replace(" old", "")} behind the
              newest period in the feed. Treat the change figure as lagging data.
            </p>
          ) : null}

          {categoryStats ? (
            <div className="flex flex-wrap items-center gap-2 rounded-xl bg-black/[0.03] px-3 py-2 text-[12px] text-black/60">
              <strong className="font-bold text-black/80">{item.category}</strong>
              <span>
                averaged{" "}
                <strong className={cn("font-bold tabular-nums", (categoryStats.avgChangePct ?? 0) >= 0 ? "text-green-700" : "text-red-600")}>
                  {formatPct(categoryStats.avgChangePct)}
                </strong>{" "}
                across {categoryStats.count} commodities ({categoryStats.gainers} up, {categoryStats.losers} down)
              </span>
            </div>
          ) : null}

          {/* Source details */}
          <dl className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            <DetailRow label="Quote period">{formatPeriod(item.date)}</DetailRow>
            <DetailRow label="Frequency">{item.frequency ?? "—"}</DetailRow>
            <DetailRow label="Region">{item.region ?? "Global"}</DetailRow>
            <DetailRow label="Currency">{item.currency}</DetailRow>
            <DetailRow label="Unit">{item.unit ?? "—"}</DetailRow>
            <DetailRow label="Price type">{item.priceType ?? "Reference price"}</DetailRow>
            <DetailRow label="Provider">{item.provider ?? "—"}</DetailRow>
            <DetailRow label="Source">
              {item.sourceUrl ? (
                <a
                  href={item.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[#3f6220] underline-offset-2 hover:underline"
                >
                  {item.source ?? "Open source"}
                  <ExternalLink size={11} aria-hidden="true" />
                </a>
              ) : (
                item.source ?? "—"
              )}
            </DetailRow>
          </dl>

          {/* Saved watchlist settings for this commodity */}
          {isFavorite && favorite ? (
            <div className="grid gap-1.5 rounded-xl border border-amber-200 bg-amber-50/50 px-3 py-2.5">
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-amber-800">
                <Target size={12} aria-hidden="true" />
                Your watchlist settings
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-black/70">
                <span>Buy target: <strong className="tabular-nums">{favorite.targetPrice ?? "not set"}</strong></span>
                <span>Alert above: <strong className="tabular-nums">{favorite.alertAbove ?? "not set"}</strong></span>
                <span>Alert below: <strong className="tabular-nums">{favorite.alertBelow ?? "not set"}</strong></span>
              </div>
              {favorite.note ? (
                <p className="text-[12px] leading-4 text-black/60">Note: {favorite.note}</p>
              ) : null}
              <p className="text-[10px] text-black/40">
                Edit these in the “My watchlist” panel on this page.
              </p>
            </div>
          ) : null}

          {/* AI analysis */}
          <div className="grid gap-2.5 rounded-xl border border-[#679936]/25 bg-[#D7E8C0]/20 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-[13px] font-bold text-black">
                <Sparkles size={15} className="text-[#3f6220]" aria-hidden="true" />
                AI analysis for {item.name}
              </p>
              <button
                type="button"
                onClick={() => onAnalyze?.(item)}
                disabled={aiLoading}
                className={cn(
                  "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12px] font-semibold text-white transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
                  aiError ? "bg-red-600 hover:bg-red-700" : "bg-[var(--text1)] hover:bg-[#4a7028]"
                )}
              >
                {aiLoading ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : <Sparkles size={13} aria-hidden="true" />}
                {aiLoading ? "Analyzing..." : aiError ? "Retry AI analysis" : aiResult ? "Run again" : "Analyze with AI"}
              </button>
            </div>

            {aiLoading ? (
              <div className="grid gap-1.5">
                <span className="h-2.5 w-full animate-pulse rounded bg-black/10" />
                <span className="h-2.5 w-10/12 animate-pulse rounded bg-black/10" />
                <span className="h-2.5 w-8/12 animate-pulse rounded bg-black/10" />
              </div>
            ) : null}

            {aiError && !aiLoading ? (
              <p className="flex items-start gap-1.5 text-[12px] leading-4 text-red-700">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                {aiError.message ?? "The AI service did not respond."}
              </p>
            ) : null}

            {aiResult && !aiLoading ? <CommodityAIResult result={aiResult} /> : null}

            {!aiResult && !aiLoading && !aiError ? (
              <p className="text-[12px] leading-4 text-black/55">
                Get a farm-focused read on this commodity — outlook, likely
                drivers, cost or income impact and a suggested next step. Saved
                to your account automatically.
              </p>
            ) : null}

            <p className="text-[10px] leading-4 text-black/40">
              Decision support from the prices shown above only — not financial advice.
            </p>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
