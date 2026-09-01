// Shared metadata for the Disaster Alerts page — icons, labels, colors,
// preparedness recommendations and formatters. Kept separate from components
// so fast-refresh stays happy (same convention as weatheralerts/alertMeta.js).

import {
  Waves,
  ThermometerSun,
  CloudRain,
  Tornado,
  Sun,
  Snowflake,
  CloudHail,
  Flame,
  Mountain,
  AlertTriangle,
  Sprout,
  Beef,
  Droplets,
  Layers,
  Tractor,
  Warehouse,
} from "lucide-react";

// -----------------------------------------------------------------------------
// Disaster types
// -----------------------------------------------------------------------------

export const DISASTER_TYPE_META = {
  flood: { label: "Flood", Icon: Waves, chipClass: "bg-blue-100 text-blue-800", marker: "#1d4ed8" },
  drought: { label: "Drought", Icon: ThermometerSun, chipClass: "bg-amber-100 text-amber-800", marker: "#b45309" },
  heavy_rain: { label: "Heavy Rain", Icon: CloudRain, chipClass: "bg-sky-100 text-sky-800", marker: "#0284c7" },
  cyclone: { label: "Cyclone / Storm", Icon: Tornado, chipClass: "bg-violet-100 text-violet-800", marker: "#6d28d9" },
  heatwave: { label: "Heatwave", Icon: Sun, chipClass: "bg-orange-100 text-orange-800", marker: "#ea580c" },
  frost: { label: "Frost", Icon: Snowflake, chipClass: "bg-cyan-100 text-cyan-800", marker: "#0891b2" },
  hailstorm: { label: "Hailstorm", Icon: CloudHail, chipClass: "bg-slate-200 text-slate-700", marker: "#475569" },
  wildfire: { label: "Wildfire", Icon: Flame, chipClass: "bg-red-100 text-red-700", marker: "#dc2626" },
  earthquake: { label: "Earthquake", Icon: Mountain, chipClass: "bg-stone-200 text-stone-700", marker: "#78350f" },
};

export const DISASTER_TYPE_KEYS = Object.keys(DISASTER_TYPE_META);

export function disasterTypeMeta(type) {
  return DISASTER_TYPE_META[type] ?? { label: "Severe Weather", Icon: AlertTriangle, chipClass: "bg-gray-100 text-gray-700", marker: "#525252" };
}

// -----------------------------------------------------------------------------
// Severity / status / risk meta
// -----------------------------------------------------------------------------

export const SEVERITY_META = {
  critical: { label: "Critical", rank: 4, className: "bg-red-600 text-white", marker: "#dc2626" },
  high: { label: "High", rank: 3, className: "bg-orange-500 text-white", marker: "#f97316" },
  medium: { label: "Medium", rank: 2, className: "bg-amber-400 text-black", marker: "#f59e0b" },
  low: { label: "Low", rank: 1, className: "bg-green-600 text-white", marker: "#16a34a" },
};

export function severityMeta(severity) {
  return SEVERITY_META[severity] ?? SEVERITY_META.medium;
}

export const STATUS_META = {
  active: { label: "Active", className: "bg-red-100 text-red-700" },
  watch: { label: "Watch", className: "bg-amber-100 text-amber-800" },
  advisory: { label: "Advisory", className: "bg-blue-100 text-blue-700" },
  resolved: { label: "Resolved", className: "bg-green-100 text-green-700" },
};

export function statusMeta(status) {
  return STATUS_META[status] ?? STATUS_META.active;
}

// Numeric impact (0–1) -> readable risk level with accessible color pairing.
export function impactRisk(value) {
  const v = typeof value === "number" ? value : 0;
  if (v >= 0.75) return { label: "Extreme", className: "bg-red-600", text: "text-red-700" };
  if (v >= 0.5) return { label: "High", className: "bg-orange-500", text: "text-orange-600" };
  if (v >= 0.25) return { label: "Moderate", className: "bg-amber-400", text: "text-amber-600" };
  return { label: "Low", className: "bg-green-600", text: "text-green-700" };
}

// -----------------------------------------------------------------------------
// Agricultural impact assets
// -----------------------------------------------------------------------------

export const IMPACT_ASSETS = [
  { key: "crops", label: "Crops", Icon: Sprout },
  { key: "livestock", label: "Livestock", Icon: Beef },
  { key: "irrigation", label: "Irrigation", Icon: Droplets },
  { key: "soil", label: "Soil", Icon: Layers },
  { key: "equipment", label: "Farm Equipment", Icon: Tractor },
  { key: "infrastructure", label: "Agri Infrastructure", Icon: Warehouse },
];

// -----------------------------------------------------------------------------
// Preparedness recommendations (agricultural guidance, NOT official orders)
// -----------------------------------------------------------------------------

export const PREPAREDNESS_DISCLAIMER =
  "Agricultural preparedness guidance from Agri Monitor — not an official emergency instruction. Always follow directions issued by your local disaster management authority.";

export const PREPARATION_RECOMMENDATIONS = {
  flood: [
    { title: "Protect equipment", detail: "Move tractors, pump sets and tools to raised ground or covered sheds before water arrives." },
    { title: "Relocate livestock", detail: "Shift animals to elevated shelters with feed and water stocked for 3–4 days." },
    { title: "Secure inputs", detail: "Lift fertilizer and seed bags onto raised platforms; seal chemicals in waterproof containers." },
    { title: "Inspect drainage", detail: "Clear field channels and culverts now so water can exit quickly once levels drop." },
    { title: "Protect standing crops", detail: "Harvest mature produce early where possible; mark field boundaries for post-flood assessment." },
  ],
  heatwave: [
    { title: "Increase irrigation monitoring", detail: "Check soil moisture daily; shift irrigation to early morning or late evening to cut evaporation losses." },
    { title: "Protect livestock", detail: "Provide shade, extra drinking water and ventilation; avoid grazing during peak afternoon heat." },
    { title: "Monitor crop stress", detail: "Watch for midday wilting and leaf scorch; consider light, frequent irrigation for young orchards." },
    { title: "Adjust field work", detail: "Reschedule spraying and labor-intensive tasks to cooler hours." },
  ],
  frost: [
    { title: "Protect sensitive crops", detail: "Cover nurseries and vegetable seedlings; use straw mulch or temporary windbreaks around orchard rows." },
    { title: "Monitor temperature", detail: "Watch overnight readings near ground level between 2 AM and 6 AM, when frost risk peaks." },
    { title: "Delay irrigation timing", detail: "Avoid late-evening irrigation that can worsen radiant cooling on clear nights." },
    { title: "Keep frost tools ready", detail: "Stage smoke pots or sprinklers in advance for high-value plots." },
  ],
  cyclone: [
    { title: "Secure equipment", detail: "Anchor or store loose machinery, drip lines, mulch sheets and small tools indoors." },
    { title: "Reinforce greenhouse structures", detail: "Tighten clamps and bracing; remove shade nets that act as sails in high wind." },
    { title: "Follow official warnings", detail: "Track advisories from your local disaster authority and comply with evacuation guidance for coastal blocks." },
    { title: "Safeguard inputs and feed", detail: "Move feed, seed and chemicals above possible surge levels and away from openings." },
    { title: "Protect livestock", detail: "Move animals to sturdy, high-ground shelters away from trees and temporary sheds." },
  ],
  drought: [
    { title: "Plan water budget", detail: "Match cropping area to available reservoir/well water; prioritize high-value and perennial crops." },
    { title: "Adopt conservation practices", detail: "Mulch, contour bunds and drip irrigation stretch limited moisture furthest." },
    { title: "Arrange fodder", detail: "Secure fodder reserves or grazing arrangements early for dairy herds." },
    { title: "Review crop choices", detail: "Consider short-duration, drought-tolerant varieties for upcoming sowings." },
  ],
  heavy_rain: [
    { title: "Pause field operations", detail: "Hold spraying and fertilizer application ahead of heavy bursts to avoid wash-off." },
    { title: "Open field drains", detail: "Clear waterlogged furrows so sensitive crops do not sit in standing water." },
    { title: "Store inputs dry", detail: "Keep bags and chemicals off the floor and away from leak-prone roofs." },
    { title: "Check livestock shelters", detail: "Ensure sheds drain well and bedding stays dry to prevent foot-rot and mastitis." },
  ],
  hailstorm: [
    { title: "Cover high-value crops", detail: "Deploy hail nets or temporary covers over nurseries, orchards and vegetable plots." },
    { title: "Shelter livestock and equipment", detail: "Move animals under solid roofs and park machinery away from skylights and tin roofs." },
    { title: "Plan post-hail assessment", detail: "Document damage with photos within 24 hours to support insurance claims." },
  ],
  wildfire: [
    { title: "Clear field borders", detail: "Remove dry residue and create bare-soil firebreaks around plots and storage yards." },
    { title: "Protect stored fodder", detail: "Keep fodder stacks and fuel stores away from boundaries; keep water sources accessible." },
    { title: "Keep tools ready", detail: "Stage water drums, sand and beaters; agree on an early-warning signal with neighbors." },
  ],
  earthquake: [
    { title: "Check hillside structures", detail: "Inspect terrace walls, irrigation channels and storage sheds for cracks after tremors." },
    { title: "Watch landslide signs", detail: "New cracks, leaning trees or muddy seepage on slopes mean stay away and report." },
    { title: "Secure heavy items", detail: "Anchor pump sets, tanks and chemical drums in sheds." },
  ],
};

export function preparationRecommendations(type) {
  return PREPARATION_RECOMMENDATIONS[type] ?? [
    { title: "Stay informed", detail: "Monitor the alert feed and your local agricultural advisory for updates." },
    { title: "Protect assets first", detail: "Move equipment, inputs and livestock away from the expected impact zone." },
  ];
}

// -----------------------------------------------------------------------------
// Formatters
// -----------------------------------------------------------------------------

export function formatDisasterTime(ms) {
  if (typeof ms !== "number" || Number.isNaN(ms)) return "—";
  return new Date(ms).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDisasterDate(ms) {
  if (typeof ms !== "number" || Number.isNaN(ms)) return "—";
  return new Date(ms).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** "Starts in ~6h" / "Ends in ~2d" style relative label for a window. */
export function formatWindow(startsAt, endsAt, now = Date.now()) {
  const fmt = (ms) => {
    const diff = ms - now;
    const abs = Math.abs(diff);
    const hours = Math.round(abs / 3_600_000);
    const label = hours < 24 ? `${hours}h` : `${Math.round(hours / 24)}d`;
    return { diff, label };
  };
  if (typeof startsAt === "number" && startsAt > now) {
    const s = fmt(startsAt);
    return `Starts in ~${s.label}`;
  }
  if (typeof endsAt === "number") {
    const e = fmt(endsAt);
    return e.diff > 0 ? `Ends in ~${e.label}` : "Window elapsed";
  }
  return "Ongoing";
}
