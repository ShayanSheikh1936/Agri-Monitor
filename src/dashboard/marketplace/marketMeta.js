// Presentation metadata + pure helpers for the Global Market Rates page.
// Kept dependency-free (lucide icons only) and separate from the service so
// formatting rules can change without touching data fetching or Firestore.

import {
  Wheat,
  Droplet,
  Coffee,
  Beef,
  TreePine,
  Flame,
  FlaskConical,
  Gem,
  Factory,
  Leaf,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";

// -----------------------------------------------------------------------------
// Farm relevance — a farmer cares about what they SELL, what they BUY, and
// everything else only as context. Used by the "Agri focus" filter.
// -----------------------------------------------------------------------------

export const RELEVANCE = {
  OUTPUT: "farm_output",
  INPUT: "farm_input",
  OTHER: "other",
};

export const RELEVANCE_META = {
  [RELEVANCE.OUTPUT]: {
    id: RELEVANCE.OUTPUT,
    label: "Farm outputs",
    short: "Outputs",
    hint: "Commodities a farm typically sells",
    chip: "bg-[#679936]/15 text-[#3f6220]",
  },
  [RELEVANCE.INPUT]: {
    id: RELEVANCE.INPUT,
    label: "Farm inputs",
    short: "Inputs",
    hint: "Costs a farm typically pays (fertilizer, fuel, feed)",
    chip: "bg-amber-100 text-amber-800",
  },
  [RELEVANCE.OTHER]: {
    id: RELEVANCE.OTHER,
    label: "Other markets",
    short: "Other",
    hint: "Metals and broader reference markets",
    chip: "bg-slate-200/70 text-slate-700",
  },
};

const CATEGORY_META = {
  grains: { icon: Wheat, relevance: RELEVANCE.OUTPUT, tone: "#679936" },
  "oils and meals": { icon: Droplet, relevance: RELEVANCE.OUTPUT, tone: "#c99a2e" },
  beverages: { icon: Coffee, relevance: RELEVANCE.OUTPUT, tone: "#8a5a2b" },
  "other food": { icon: Beef, relevance: RELEVANCE.OUTPUT, tone: "#b4553f" },
  "other raw materials": { icon: Leaf, relevance: RELEVANCE.OUTPUT, tone: "#4f8a5b" },
  timber: { icon: TreePine, relevance: RELEVANCE.OUTPUT, tone: "#3f7a52" },
  fertilizers: { icon: FlaskConical, relevance: RELEVANCE.INPUT, tone: "#7a5ea8" },
  energy: { icon: Flame, relevance: RELEVANCE.INPUT, tone: "#d97b29" },
  "metals and minerals": { icon: Factory, relevance: RELEVANCE.OTHER, tone: "#5b7285" },
  "precious metals": { icon: Gem, relevance: RELEVANCE.OTHER, tone: "#a8894a" },
};

const FALLBACK_ICON = Leaf;

/** Category display meta with a safe default for categories the feed adds later. */
export function categoryMeta(category) {
  const key = String(category ?? "").toLowerCase().trim();
  const hit = CATEGORY_META[key];
  if (hit) return { icon: hit.icon, relevance: hit.relevance, tone: hit.tone };

  // Unknown category: guess relevance from words in the name. Anything left over
  // is filed under "Other markets" — never claim a commodity is something the
  // farm sells when the feed has not said so.
  if (/fertil|fuel|energy|gas|oil, crude|urea|pesticide/.test(key)) {
    return { icon: FALLBACK_ICON, relevance: RELEVANCE.INPUT, tone: "#5b7285" };
  }
  if (/grain|wheat|maize|rice|crop|food|meal|oilseed|cotton|sugar|meat|dairy/.test(key)) {
    return { icon: FALLBACK_ICON, relevance: RELEVANCE.OUTPUT, tone: "#679936" };
  }
  return { icon: FALLBACK_ICON, relevance: RELEVANCE.OTHER, tone: "#5b7285" };
}

// -----------------------------------------------------------------------------
// Direction meta
// -----------------------------------------------------------------------------

export const DIRECTION_META = {
  up: {
    icon: TrendingUp,
    label: "Rising",
    text: "text-green-700",
    bg: "bg-green-100",
    stroke: "#2f8f4e",
  },
  down: {
    icon: TrendingDown,
    label: "Falling",
    text: "text-red-600",
    bg: "bg-red-100",
    stroke: "#d1495b",
  },
  flat: {
    icon: Minus,
    label: "Unchanged",
    text: "text-black/55",
    bg: "bg-black/5",
    stroke: "#8a8a8a",
  },
};

export function directionMeta(direction) {
  return DIRECTION_META[direction] ?? DIRECTION_META.flat;
}

// -----------------------------------------------------------------------------
// Formatters
// -----------------------------------------------------------------------------

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatPrice(value, { unit = null, currency = null } = {}) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const abs = Math.abs(value);
  const digits = abs >= 1000 ? 0 : abs >= 10 ? 1 : 2;
  const formatted = value.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  if (unit) return `${formatted} ${unit}`;
  if (currency) return `${formatted} ${currency}`;
  return formatted;
}

export function formatSigned(value, suffix = "") {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const abs = Math.abs(value);
  const digits = abs >= 1000 ? 0 : abs >= 10 ? 1 : 2;
  const formatted = abs.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  return `${value > 0 ? "+" : value < 0 ? "−" : ""}${formatted}${suffix}`;
}

export function formatPct(pct) {
  if (pct === null || pct === undefined || Number.isNaN(pct)) return "—";
  const abs = Math.abs(pct);
  return `${pct > 0 ? "+" : pct < 0 ? "−" : ""}${abs.toFixed(abs >= 10 ? 1 : 2)}%`;
}

/** "2026-08" -> "Aug 2026" (falls back to the raw string when unparsable). */
export function formatPeriod(period) {
  const m = typeof period === "string" ? period.match(/^(\d{4})-(\d{2})/) : null;
  if (!m) return period ?? "—";
  const month = MONTHS[Number(m[2]) - 1];
  return month ? `${month} ${m[1]}` : period;
}

export function formatDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString([], {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTimeAgo(iso) {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export function formatStaleness(lagMonths) {
  if (!lagMonths || lagMonths <= 0) return null;
  if (lagMonths < 12) return `${lagMonths} mo old`;
  const years = Math.floor(lagMonths / 12);
  const rest = lagMonths % 12;
  return rest ? `${years}y ${rest}m old` : `${years}y old`;
}

// -----------------------------------------------------------------------------
// Filtering + sorting
// -----------------------------------------------------------------------------

export const SORT_OPTIONS = [
  { value: "changePct", label: "Biggest % move" },
  { value: "name", label: "Name (A–Z)" },
  { value: "value", label: "Price (high → low)" },
  { value: "category", label: "Category" },
  { value: "volatility", label: "Most volatile" },
];

export const VIEW_OPTIONS = [
  { value: "table", label: "Table" },
  { value: "cards", label: "Cards" },
];

const SORTERS = {
  changePct: (a, b) => (b.changePct ?? -Infinity) - (a.changePct ?? -Infinity),
  value: (a, b) => (b.value ?? -Infinity) - (a.value ?? -Infinity),
  volatility: (a, b) => Math.abs(b.changePct ?? 0) - Math.abs(a.changePct ?? 0),
  name: (a, b) => a.name.localeCompare(b.name),
  category: (a, b) =>
    a.category.localeCompare(b.category) || a.name.localeCompare(b.name),
};

export function applyMarketFilters(items, filters) {
  const search = String(filters?.search ?? "").trim().toLowerCase();
  const category = filters?.category ?? "all";
  const relevance = filters?.relevance ?? "all";
  const direction = filters?.direction ?? "all";
  const favoriteOnly = Boolean(filters?.favoriteOnly);
  const favoriteIds = filters?.favoriteIds instanceof Set ? filters.favoriteIds : null;

  const filtered = items.filter((item) => {
    if (category !== "all" && item.category !== category) return false;
    if (relevance !== "all" && categoryMeta(item.category).relevance !== relevance) return false;
    if (direction !== "all" && item.direction !== direction) return false;
    if (favoriteOnly && !(favoriteIds?.has(item.id) ?? false)) return false;
    if (search) {
      const haystack = `${item.name} ${item.category} ${item.unit ?? ""} ${item.region ?? ""}`.toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });

  const sorter = SORTERS[filters?.sortBy] ?? SORTERS.changePct;
  const sorted = filtered.slice().sort(sorter);
  return filters?.sortDir === "asc" && filters?.sortBy !== "volatility"
    ? sorted.reverse()
    : sorted;
}

// -----------------------------------------------------------------------------
// Comparison (normalized % change against the previous period)
// -----------------------------------------------------------------------------

export const MAX_COMPARE = 4;

export const COMPARE_COLORS = ["#679936", "#d97b29", "#2d6ca3", "#a3458c"];

/** Builds the two-point normalized series used by the comparison chart. */
export function buildComparisonSeries(items) {
  return items.map((item, index) => ({
    id: item.id,
    name: item.name,
    category: item.category,
    color: COMPARE_COLORS[index % COMPARE_COLORS.length],
    previous: 0,
    current: item.changePct ?? 0,
    unit: item.unit,
    value: item.value,
  }));
}

// -----------------------------------------------------------------------------
// CSV export — client-side only, no backend involved
// -----------------------------------------------------------------------------

function csvCell(value) {
  if (value === null || value === undefined) return "";
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function exportMarketCsv(items, { period = null, filename = "agri-monitor-market-rates" } = {}) {
  if (!items?.length) return false;

  const header = [
    "Commodity",
    "Category",
    "Price",
    "Unit",
    "Currency",
    "Previous",
    "Change",
    "Change %",
    "Direction",
    "Quote period",
    "Region",
    "Source",
  ];
  const rows = items.map((i) => [
    i.name,
    i.category,
    i.value,
    i.unit,
    i.currency,
    i.prevValue,
    i.change,
    i.changePct,
    i.direction,
    i.date,
    i.region,
    i.source,
  ]);

  const title = `# Agri Monitor global market rates${period ? ` (period ${period})` : ""}`;
  const csv = [title, header.map(csvCell).join(","), ...rows.map((r) => r.map(csvCell).join(","))].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}-${period ? String(period).replace(/[^0-9-]/g, "") : "latest"}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Revoke on the next tick so Safari/Edge finish reading the blob first.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

// -----------------------------------------------------------------------------
// AI insight presentation helpers
// -----------------------------------------------------------------------------

export const TONE_META = {
  rising: { label: "Rising market", chip: "bg-green-100 text-green-700" },
  falling: { label: "Falling market", chip: "bg-red-100 text-red-700" },
  mixed: { label: "Mixed market", chip: "bg-amber-100 text-amber-800" },
  stable: { label: "Stable market", chip: "bg-slate-200/70 text-slate-700" },
};

export const GUIDANCE_META = {
  hold: { label: "Hold", chip: "bg-slate-200/70 text-slate-700" },
  watch: { label: "Watch closely", chip: "bg-amber-100 text-amber-800" },
  consider_selling: { label: "Consider selling", chip: "bg-green-100 text-green-700" },
  consider_buying: { label: "Consider buying", chip: "bg-sky-100 text-sky-800" },
};

export const SEVERITY_CHIP = {
  low: "bg-green-100 text-green-700",
  medium: "bg-amber-100 text-amber-800",
  high: "bg-red-100 text-red-700",
};
