import { useState } from "react";
import {
  Sparkles,
  Loader2,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Lightbulb,
  ListChecks,
  History,
  Trash2,
  ArrowLeft,
  Fuel,
  ShieldAlert,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { SEVERITY_CHIP, TONE_META, formatDateTime } from "./marketMeta";

const TREND_ICONS = { up: TrendingUp, down: TrendingDown, flat: Minus };
const TREND_TONES = {
  up: "text-green-700 bg-green-100",
  down: "text-red-600 bg-red-100",
  flat: "text-black/55 bg-black/5",
};

function ConfidenceMeter({ value }) {
  if (value === null || value === undefined) return null;
  const pct = Math.round(value * 100);
  const tone = pct >= 70 ? "bg-green-500" : pct >= 40 ? "bg-amber-500" : "bg-red-400";
  return (
    <Tooltip content="Model confidence in this analysis" side="top">
      <span className="flex items-center gap-1.5">
        <span className="h-1.5 w-16 overflow-hidden rounded-full bg-black/10">
          <span className={cn("block h-full rounded-full", tone)} style={{ width: `${pct}%` }} />
        </span>
        <span className="text-[11px] font-semibold text-black/50 tabular-nums">{pct}%</span>
      </span>
    </Tooltip>
  );
}

function SectionTitle({ icon: Icon, title, count, tone = "text-[#3f6220]" }) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon size={14} className={tone} aria-hidden="true" />
      <p className="text-[12px] font-bold uppercase tracking-wide text-black/60">{title}</p>
      {count ? <Badge className="bg-black/5 text-black/55">{count}</Badge> : null}
    </div>
  );
}

function InsightResult({ result, generatedAt }) {
  const tone = TONE_META[result.marketTone] ?? TONE_META.mixed;

  return (
    <div className="grid gap-4">
      {/* Summary */}
      <div className="grid gap-2 rounded-xl border border-[#679936]/25 bg-[#D7E8C0]/35 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", tone.chip)}>
              {tone.label}
            </span>
            {generatedAt ? (
              <span className="text-[11px] text-black/45">{formatDateTime(generatedAt)}</span>
            ) : null}
          </div>
          <ConfidenceMeter value={result.confidence} />
        </div>
        <p className="text-[13px] leading-5 text-black/80">{result.summary}</p>
      </div>

      {/* Key trends */}
      {result.keyTrends?.length ? (
        <section className="grid gap-2">
          <SectionTitle icon={TrendingUp} title="Key trends" count={result.keyTrends.length} />
          <ul className="grid gap-1.5">
            {result.keyTrends.map((trend, i) => {
              const Icon = TREND_ICONS[trend.direction] ?? Minus;
              return (
                <li key={`${trend.title}-${i}`} className="flex items-start gap-2 rounded-lg bg-black/[0.03] px-2.5 py-2">
                  <span className={cn("mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md", TREND_TONES[trend.direction] ?? TREND_TONES.flat)}>
                    <Icon size={13} aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[13px] font-bold text-black leading-4">{trend.title}</span>
                      {trend.category ? (
                        <span className="rounded-full bg-black/5 px-1.5 py-0.5 text-[10px] font-semibold text-black/50">
                          {trend.category}
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-0.5 block text-[12px] leading-4 text-black/60">{trend.detail}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Input cost outlook */}
        {result.inputCostOutlook?.detail ? (
          <section className="grid gap-2">
            <SectionTitle icon={Fuel} title="Farm input cost outlook" tone="text-amber-700" />
            <div className="grid gap-1.5 rounded-xl border border-amber-200 bg-amber-50/60 p-3">
              <span className="w-fit rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800 capitalize">
                {result.inputCostOutlook.trend} costs
              </span>
              <p className="text-[12px] leading-5 text-black/75">{result.inputCostOutlook.detail}</p>
            </div>
          </section>
        ) : null}

        {/* Opportunities */}
        {result.opportunities?.length ? (
          <section className="grid gap-2">
            <SectionTitle icon={Lightbulb} title="Opportunities" count={result.opportunities.length} />
            <ul className="grid gap-1.5">
              {result.opportunities.map((o, i) => (
                <li key={`${o.title}-${i}`} className="grid gap-0.5 rounded-lg border border-green-200 bg-green-50/50 px-2.5 py-2">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[12px] font-bold text-black leading-4">{o.title}</span>
                    {o.timing ? (
                      <span className="rounded-full bg-white/70 px-1.5 py-0.5 text-[10px] font-semibold text-black/55">
                        {o.timing}
                      </span>
                    ) : null}
                  </span>
                  <span className="text-[12px] leading-4 text-black/65">{o.detail}</span>
                  {o.relatedCommodity ? (
                    <span className="text-[10px] font-semibold text-black/40">Linked: {o.relatedCommodity}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>

      {/* Risks */}
      {result.risks?.length ? (
        <section className="grid gap-2">
          <SectionTitle icon={ShieldAlert} title="Risks to watch" count={result.risks.length} tone="text-red-600" />
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {result.risks.map((r, i) => (
              <li key={`${r.title}-${i}`} className="grid gap-0.5 rounded-lg border border-red-200 bg-red-50/50 px-2.5 py-2">
                <span className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[12px] font-bold text-black leading-4">{r.title}</span>
                  <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-bold capitalize", SEVERITY_CHIP[r.severity] ?? SEVERITY_CHIP.medium)}>
                    {r.severity}
                  </span>
                </span>
                <span className="text-[12px] leading-4 text-black/65">{r.detail}</span>
                {r.relatedCommodity ? (
                  <span className="text-[10px] font-semibold text-black/40">Linked: {r.relatedCommodity}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Action plan */}
      {result.actionPlan?.length ? (
        <section className="grid gap-2">
          <SectionTitle icon={ListChecks} title="Suggested action plan" count={result.actionPlan.length} />
          <ol className="grid gap-1.5">
            {result.actionPlan.map((step, i) => (
              <li key={`${step}-${i}`} className="flex items-start gap-2 rounded-lg bg-black/[0.03] px-2.5 py-2">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#679936] text-[11px] font-bold text-white">
                  {i + 1}
                </span>
                <span className="text-[12px] leading-5 text-black/75">{step}</span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  );
}

export default function MarketAIInsights({
  insights,
  onRun,
  savedAnalyses = [],
  onDeleteAnalysis,
  disabled = false,
}) {
  const [question, setQuestion] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [viewing, setViewing] = useState(null); // saved analysis opened from history

  const loading = insights.status === "loading";
  const failed = insights.status === "error";

  // A saved analysis from history renders through the same result component.
  const savedAt = viewing
    ? viewing.createdAtISO ??
      (viewing.createdAtMs ? new Date(viewing.createdAtMs).toISOString() : null)
    : null;
  const displayed = viewing ? { result: viewing.result, generatedAt: savedAt } : insights;
  const result = displayed?.result ?? null;

  const marketHistory = savedAnalyses.filter((a) => a.kind !== "commodity");

  const run = () => {
    setViewing(null);
    onRun?.({ question: question.trim() || null, force: insights.status === "error" });
  };

  return (
    <Card className="min-w-0 py-4">
      <CardContent className="grid gap-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-start gap-2 min-w-0">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#D7E8C0]">
              <Sparkles size={16} className="text-[#3f6220]" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-[14px] font-bold text-black leading-5">AI market insights</p>
              <p className="text-[11px] text-black/50 leading-4 max-w-[520px]">
                Turns the live feed into farm-focused advice — selling windows,
                input costs and risks. Generated on demand from real prices only.
              </p>
            </div>
          </div>

          {marketHistory.length > 0 ? (
            <button
              type="button"
              onClick={() => setHistoryOpen((v) => !v)}
              aria-expanded={historyOpen}
              className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-black/55 transition-colors hover:bg-black/5 hover:text-black cursor-pointer"
            >
              <History size={13} aria-hidden="true" />
              Saved ({marketHistory.length})
            </button>
          ) : null}
        </div>

        {/* Saved analyses history */}
        {historyOpen && marketHistory.length > 0 ? (
          <ul className="grid gap-1 rounded-xl border border-black/10 bg-black/[0.02] p-1.5">
            {marketHistory.map((a) => (
              <li key={a.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-card">
                <button
                  type="button"
                  onClick={() => setViewing(a)}
                  className="min-w-0 flex-1 text-left cursor-pointer"
                >
                  <span className="block truncate text-[12px] font-semibold text-black">
                    {a.subjectName}
                  </span>
                  <span className="block text-[10px] text-black/45">
                    {a.createdAtMs ? formatDateTime(new Date(a.createdAtMs).toISOString()) : a.period ?? "saved"}
                    {a.stats ? ` · ${a.stats.gainers ?? 0} up / ${a.stats.losers ?? 0} down` : ""}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteAnalysis?.(a.id)}
                  aria-label="Delete saved insight"
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-black/35 transition-colors hover:bg-red-50 hover:text-red-600 cursor-pointer"
                >
                  <Trash2 size={13} />
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        {viewing ? (
          <button
            type="button"
            onClick={() => setViewing(null)}
            className="flex w-fit items-center gap-1 rounded-lg bg-black/5 px-2 py-1 text-[11px] font-semibold text-black/60 transition-colors hover:bg-black/10 cursor-pointer"
          >
            <ArrowLeft size={12} aria-hidden="true" />
            Back to latest run
          </button>
        ) : null}

        {/* Prompt box */}
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value.slice(0, 300))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !loading && !disabled) run();
            }}
            disabled={loading || disabled}
            placeholder="Optional: ask about a specific market, e.g. “should I hold my wheat?”"
            aria-label="Optional question for the market AI"
            className="min-w-[200px] flex-1 rounded-xl border border-[var(--border)] bg-card px-3 py-2 text-[12px] text-black outline-none transition-colors placeholder:text-black/35 focus:border-[#679936] focus:ring-2 focus:ring-[#679936]/25 disabled:opacity-60"
          />
          <button
            type="button"
            onClick={run}
            disabled={loading || disabled}
            className={cn(
              "flex items-center gap-1.5 rounded-xl px-3 py-2 text-[13px] font-semibold text-white transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
              failed ? "bg-red-600 hover:bg-red-700" : "bg-[var(--text1)] hover:bg-[#4a7028]"
            )}
          >
            {loading ? (
              <Loader2 size={14} className="animate-spin" aria-hidden="true" />
            ) : (
              <RefreshCw size={14} aria-hidden="true" />
            )}
            {loading ? "Analyzing market..." : failed ? "Retry analysis" : result ? "Regenerate insights" : "Generate insights"}
          </button>
        </div>

        {disabled ? (
          <p className="text-[11px] text-black/45">
            Market data must load before AI insights can run.
          </p>
        ) : null}

        {/* Loading */}
        {loading ? (
          <div className="grid gap-2 rounded-xl border border-[#679936]/25 bg-[#D7E8C0]/25 p-3">
            <p className="flex items-center gap-2 text-[12px] font-semibold text-black/65">
              <Loader2 size={14} className="animate-spin" aria-hidden="true" />
              Reading every quoted commodity and preparing farm-focused advice...
            </p>
            <div className="grid gap-1.5">
              <span className="h-2.5 w-full animate-pulse rounded bg-black/10" />
              <span className="h-2.5 w-11/12 animate-pulse rounded bg-black/10" />
              <span className="h-2.5 w-9/12 animate-pulse rounded bg-black/10" />
            </div>
            <p className="text-[10px] text-black/40">This can take up to a minute.</p>
          </div>
        ) : null}

        {/* Error */}
        {failed && !loading ? (
          <div className="grid gap-1.5 rounded-xl border border-red-200 bg-red-50/60 p-3">
            <p className="flex items-center gap-1.5 text-[12px] font-bold text-red-700">
              <AlertTriangle size={14} aria-hidden="true" />
              AI insights could not be generated
            </p>
            <p className="text-[12px] leading-4 text-black/60">
              {insights.error?.message ?? "The AI service did not respond."}
            </p>
          </div>
        ) : null}

        {/* Result */}
        {result && !loading ? <InsightResult result={result} generatedAt={displayed.generatedAt} /> : null}

        {!result && !loading && !failed ? (
          <p className="rounded-xl border border-dashed border-black/15 px-3 py-4 text-center text-[12px] text-black/45">
            No insights yet — generate them to see trends, opportunities, risks
            and a suggested action plan for your farm.
          </p>
        ) : null}

        <p className="text-[10px] leading-4 text-black/40">
          AI decision support based only on the prices shown on this page. Not
          financial or investment advice — always confirm with your local market
          before trading.
          {result?.warnings?.length ? ` Normalizations applied: ${result.warnings.length}.` : ""}
        </p>
      </CardContent>
    </Card>
  );
}
