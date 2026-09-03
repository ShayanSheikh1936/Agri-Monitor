import { useState } from "react";
import {
  Star,
  Trash2,
  SlidersHorizontal,
  Check,
  X,
  NotebookPen,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  categoryMeta,
  directionMeta,
  formatPct,
  formatPeriod,
  formatPrice,
} from "./marketMeta";

// Number inputs hold strings while typing; null means "no value stored".
const toInput = (v) => (v === null || v === undefined ? "" : String(v));
const fromInput = (v) => {
  const s = String(v ?? "").trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

function FavoriteRow({ favorite, busy, onUpdate, onRemove, onOpen, onAnalyze }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({
    note: "",
    targetPrice: null,
    alertAbove: null,
    alertBelow: null,
  });
  const [saving, setSaving] = useState(false);

  const meta = categoryMeta(favorite.category);
  const CategoryIcon = meta.icon;
  const dir = directionMeta(favorite.direction);
  const DirIcon = dir.icon;
  const live = favorite.live ?? null;

  const hasSettings =
    Boolean(favorite.note) ||
    favorite.targetPrice !== null ||
    favorite.alertAbove !== null ||
    favorite.alertBelow !== null;

  const openEditor = () => {
    setDraft({
      note: favorite.note ?? "",
      targetPrice: favorite.targetPrice,
      alertAbove: favorite.alertAbove,
      alertBelow: favorite.alertBelow,
    });
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);
    await onUpdate?.(favorite.itemId, {
      note: draft.note.trim(),
      targetPrice: draft.targetPrice,
      alertAbove: draft.alertAbove,
      alertBelow: draft.alertBelow,
    });
    setSaving(false);
    setOpen(false);
  };

  return (
    <li className={cn("rounded-xl border bg-card transition-colors", open ? "border-[#679936]/60" : "border-black/5")}>
      <div className="flex flex-wrap items-center gap-2 px-3 py-2">
        <span
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg"
          style={{ backgroundColor: `${meta.tone}1a` }}
        >
          <CategoryIcon size={15} style={{ color: meta.tone }} aria-hidden="true" />
        </span>

        <button
          type="button"
          onClick={() => onOpen?.(live ?? { id: favorite.itemId, name: favorite.name })}
          className="min-w-0 flex-1 text-left cursor-pointer"
        >
          <span className="flex items-center gap-1.5">
            <span className="truncate text-[13px] font-bold text-black leading-4 hover:text-[#3f6220]">
              {favorite.name}
            </span>
            {hasSettings ? (
              <Tooltip content="Has a note or price alert" side="top">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#679936]" />
              </Tooltip>
            ) : null}
          </span>
          <span className="block truncate text-[11px] text-black/45 leading-4">
            {favorite.category}
            {live ? ` · as of ${formatPeriod(live.date)}` : " · quote unavailable in this feed"}
          </span>
        </button>

        <span className="grid shrink-0 justify-items-end">
          <span className="text-[13px] font-bold tabular-nums text-black">
            {formatPrice(favorite.value)}
            <span className="ml-1 text-[10px] font-semibold text-black/40">{favorite.unit ?? ""}</span>
          </span>
          <span className={cn("flex items-center gap-1 text-[11px] font-bold tabular-nums", dir.text)}>
            <DirIcon size={11} aria-hidden="true" />
            {formatPct(favorite.changePct)}
          </span>
        </span>

        <span className="flex shrink-0 items-center gap-0.5">
          {onAnalyze ? (
            <Tooltip content="AI analysis" side="top">
              <button
                type="button"
                onClick={() => onAnalyze(live ?? favorite)}
                aria-label={`Run AI analysis for ${favorite.name}`}
                className="grid h-8 w-8 place-items-center rounded-lg text-black/35 transition-colors hover:bg-[#679936]/10 hover:text-[#3f6220] cursor-pointer"
              >
                <Sparkles size={15} />
              </button>
            </Tooltip>
          ) : null}

          <Tooltip content="Note & price alerts" side="top">
            <button
              type="button"
              onClick={() => (open ? setOpen(false) : openEditor())}
              aria-label={`Edit watchlist settings for ${favorite.name}`}
              aria-expanded={open}
              className={cn(
                "grid h-8 w-8 place-items-center rounded-lg transition-colors cursor-pointer",
                open ? "bg-[#679936]/15 text-[#3f6220]" : "text-black/35 hover:bg-black/5 hover:text-black"
              )}
            >
              <SlidersHorizontal size={15} />
            </button>
          </Tooltip>

          <Tooltip content="Remove from watchlist" side="top">
            <button
              type="button"
              onClick={() => onRemove?.(favorite)}
              disabled={busy}
              aria-label={`Remove ${favorite.name} from watchlist`}
              className="grid h-8 w-8 place-items-center rounded-lg text-black/35 transition-colors hover:bg-red-50 hover:text-red-600 cursor-pointer disabled:opacity-50"
            >
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
            </button>
          </Tooltip>
        </span>
      </div>

      {open ? (
        <div className="grid gap-2.5 border-t border-black/5 px-3 py-3">
          <label className="grid gap-1">
            <span className="flex items-center gap-1 text-[11px] font-semibold text-black/55">
              <NotebookPen size={12} aria-hidden="true" />
              Personal note
            </span>
            <textarea
              value={draft.note}
              onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value.slice(0, 500) }))}
              rows={2}
              placeholder="Why are you watching this? e.g. sell wheat when it crosses 280 $/mt"
              className="w-full resize-y rounded-lg border border-[var(--border)] bg-card px-2.5 py-1.5 text-[12px] text-black outline-none transition-colors placeholder:text-black/30 focus:border-[#679936] focus:ring-2 focus:ring-[#679936]/25"
            />
          </label>

          <div className="grid gap-2 sm:grid-cols-3">
            {[
              { key: "targetPrice", label: "Buy target", hint: "Alert at or below" },
              { key: "alertAbove", label: "Alert above", hint: "Sell signal" },
              { key: "alertBelow", label: "Alert below", hint: "Buy signal" },
            ].map((field) => (
              <label key={field.key} className="grid gap-1">
                <span className="text-[11px] font-semibold text-black/55">
                  {field.label}
                  <span className="ml-1 font-normal text-black/35">({favorite.unit ?? "value"})</span>
                </span>
                <input
                  type="number"
                  step="any"
                  inputMode="decimal"
                  value={toInput(draft[field.key])}
                  onChange={(e) => setDraft((d) => ({ ...d, [field.key]: fromInput(e.target.value) }))}
                  placeholder={field.hint}
                  className="w-full rounded-lg border border-[var(--border)] bg-card px-2.5 py-1.5 text-[12px] tabular-nums text-black outline-none transition-colors placeholder:text-black/30 focus:border-[#679936] focus:ring-2 focus:ring-[#679936]/25"
                />
              </label>
            ))}
          </div>

          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] text-black/40 leading-3">
              Saved to your account · alerts are re-checked on every refresh
            </p>
            <span className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={saving}
                className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[12px] font-semibold text-black/55 transition-colors hover:bg-black/5 hover:text-black cursor-pointer disabled:opacity-50"
              >
                <X size={13} />
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="flex items-center gap-1 rounded-lg bg-[var(--text1)] px-2.5 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-[#4a7028] cursor-pointer disabled:opacity-50"
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                Save
              </button>
            </span>
          </div>
        </div>
      ) : null}
    </li>
  );
}

export default function FavoritesPanel({
  favorites = [],
  loading = false,
  favoriteBusy,
  onUpdate,
  onRemove,
  onOpen,
  onAnalyze,
  onClearAll,
}) {
  const quoted = favorites.filter((f) => f.changePct !== null);
  const rising = quoted.filter((f) => f.direction === "up").length;
  const falling = quoted.filter((f) => f.direction === "down").length;
  const average = quoted.length
    ? Math.round((quoted.reduce((sum, f) => sum + f.changePct, 0) / quoted.length) * 100) / 100
    : null;

  return (
    <Card className="min-w-0 py-4">
      <CardContent className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-amber-100">
              <Star size={16} className="fill-amber-500 text-amber-500" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-[14px] font-bold text-black leading-5">My watchlist</p>
              <p className="text-[11px] text-black/50 leading-4">
                {favorites.length === 0
                  ? "Star any commodity to track it here"
                  : `${favorites.length} tracked · ${rising} rising · ${falling} falling`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {average !== null ? (
              <Tooltip content="Average change across your watchlist" side="top">
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums",
                    average >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  )}
                >
                  avg {formatPct(average)}
                </span>
              </Tooltip>
            ) : null}
            {favorites.length > 0 ? (
              <button
                type="button"
                onClick={onClearAll}
                className="rounded-lg px-2 py-1 text-[11px] font-semibold text-black/50 transition-colors hover:bg-red-50 hover:text-red-600 cursor-pointer"
              >
                Clear all
              </button>
            ) : null}
          </div>
        </div>

        {loading ? (
          <p className="flex items-center gap-2 py-4 text-[12px] text-black/45">
            <Loader2 size={14} className="animate-spin" aria-hidden="true" />
            Loading your watchlist...
          </p>
        ) : favorites.length === 0 ? (
          <div className="grid justify-items-center gap-1.5 rounded-xl border border-dashed border-black/15 px-4 py-6 text-center">
            <Star size={22} className="text-black/20" aria-hidden="true" />
            <p className="text-[13px] font-semibold text-black/70">Nothing tracked yet</p>
            <p className="max-w-[320px] text-[11px] text-black/45 leading-4">
              Use the star on any commodity to save it here with your own note,
              buy target and price alerts. Everything is stored in your account.
            </p>
          </div>
        ) : (
          <ul className="grid gap-1.5">
            {favorites.map((fav) => (
              <FavoriteRow
                key={fav.itemId}
                favorite={fav}
                busy={favoriteBusy?.has(fav.itemId) ?? false}
                onUpdate={onUpdate}
                onRemove={onRemove}
                onOpen={onOpen}
                onAnalyze={onAnalyze}
              />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
