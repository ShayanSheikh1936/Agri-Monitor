import { useMemo, useState } from "react";
import { Map as MapIcon, SearchX } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  DISASTER_TYPE_META,
  DISASTER_TYPE_KEYS,
  disasterTypeMeta,
  severityMeta,
} from "./disasterMeta";

const VIEW_W = 1000;
const VIEW_H = 625;

// Deterministic pseudo-random generator (seeded by region id) so each region
// renders its own stable schematic terrain without any map tiles/library.
function seededRandom(seed) {
  let h = 2166136261;
  for (const ch of String(seed)) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

function project(coord, bounds) {
  const x = ((coord.lon - bounds.west) / (bounds.east - bounds.west)) * 100;
  const y = ((bounds.north - coord.lat) / (bounds.north - bounds.south)) * 100;
  return { x: Math.min(Math.max(x, 3), 97), y: Math.min(Math.max(y, 4), 96) };
}

function terrainFor(regionId) {
  const rand = seededRandom(regionId);
  const patches = Array.from({ length: 6 }, () => {
    const cx = 120 + rand() * 760;
    const cy = 90 + rand() * 440;
    const r = 60 + rand() * 110;
    const points = Array.from({ length: 8 }, (_, i) => {
      const angle = (i / 8) * Math.PI * 2;
      const rr = r * (0.7 + rand() * 0.5);
      return `${(cx + Math.cos(angle) * rr).toFixed(1)},${(cy + Math.sin(angle) * rr * 0.72).toFixed(1)}`;
    }).join(" ");
    return { points, opacity: 0.25 + rand() * 0.3 };
  });
  const riverY = 160 + rand() * 300;
  const river = `M -20 ${riverY} C 200 ${riverY - 90 + rand() * 180}, 420 ${riverY + 110 - rand() * 200}, 640 ${riverY - 40 + rand() * 90} S 940 ${riverY - 60 + rand() * 120}, 1030 ${riverY + 30}`;
  return { patches, river };
}

// Interactive Disaster Map — schematic regional view with severity-colored
// markers, affected-area halos, type filters and hover tooltips. Rendered
// with plain SVG + positioned buttons: zero map-library dependencies.
export default function DisasterMap({ region, alerts, onSelectAlert }) {
  const [filter, setFilter] = useState("all");
  const [hoverId, setHoverId] = useState(null);

  const terrain = useMemo(() => terrainFor(region?.id ?? "default"), [region?.id]);

  const bounds = region?.bounds ?? { south: 0, north: 1, west: 0, east: 1 };
  const placed = useMemo(
    () =>
      alerts
        .filter((a) => a.coordinates)
        .map((alert) => ({ alert, pos: project(alert.coordinates, bounds) })),
    // bounds is rebuilt from region every render — region.id captures change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [alerts, region?.id]
  );

  const counts = useMemo(() => {
    const map = { all: placed.length };
    for (const key of DISASTER_TYPE_KEYS) {
      map[key] = placed.filter((p) => p.alert.type === key).length;
    }
    return map;
  }, [placed]);

  const visible = placed.filter((p) => filter === "all" || p.alert.type === filter);
  const hovered = visible.find((p) => p.alert.id === hoverId) ?? null;

  // Affected-area halo radius: km -> viewBox px along the longitude span.
  const kmPerDegLon = 111.32 * Math.cos((((bounds.north + bounds.south) / 2) * Math.PI) / 180);
  const pxPerKm = VIEW_W / ((bounds.east - bounds.west) * kmPerDegLon);

  const chip = (key, label) => {
    const active = filter === key;
    const meta = key === "all" ? null : DISASTER_TYPE_META[key];
    return (
      <button
        key={key}
        type="button"
        onClick={() => setFilter(key)}
        aria-pressed={active}
        className={cn(
          "flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-semibold transition-colors cursor-pointer",
          active
            ? "border-[#679936] bg-[#679936] text-white"
            : "border-black/10 bg-white text-black/70 hover:border-[#679936]/50"
        )}
      >
        {meta ? <meta.Icon size={13} aria-hidden="true" /> : null}
        {label}
        <span
          className={cn(
            "rounded-full px-1.5 text-[10px] font-bold",
            active ? "bg-white/25 text-white" : "bg-black/8 text-black/55"
          )}
        >
          {counts[key] ?? 0}
        </span>
      </button>
    );
  };

  return (
    <Card className="min-w-0">
      <CardContent className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-[15px] font-bold text-black">
            <MapIcon size={17} className="text-[#3b6d1f]" aria-hidden="true" />
            Disaster Map
            {region ? (
              <span className="text-[12px] font-semibold text-black/45">· {region.name}</span>
            ) : null}
          </h2>
          <span className="text-[11px] text-black/40">
            Schematic view — markers placed by coordinates, not to scale
          </span>
        </div>

        {/* Type filters */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-track-[#F2DEC4] scrollbar-thumb-[#679936]">
          {chip("all", "All")}
          {DISASTER_TYPE_KEYS.map((key) => chip(key, DISASTER_TYPE_META[key].label))}
        </div>

        {/* Map canvas */}
        <div
          className="relative w-full overflow-hidden rounded-xl border border-[#679936]/25"
          style={{ aspectRatio: "16 / 10" }}
        >
          <svg
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="terrainBg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f1f5e6" />
                <stop offset="100%" stopColor="#e4ecd2" />
              </linearGradient>
            </defs>
            <rect width={VIEW_W} height={VIEW_H} fill="url(#terrainBg)" />
            {/* graticule grid */}
            {Array.from({ length: 9 }, (_, i) => (
              <line key={`v${i}`} x1={(i + 1) * 100} y1={0} x2={(i + 1) * 100} y2={VIEW_H} stroke="#679936" strokeOpacity={0.08} />
            ))}
            {Array.from({ length: 5 }, (_, i) => (
              <line key={`h${i}`} x1={0} y1={(i + 1) * 104} x2={VIEW_W} y2={(i + 1) * 104} stroke="#679936" strokeOpacity={0.08} />
            ))}
            {/* farmland patches */}
            {terrain.patches.map((p, i) => (
              <polygon key={i} points={p.points} fill="#bcd69a" opacity={p.opacity * 0.55} />
            ))}
            {/* river */}
            <path d={terrain.river} fill="none" stroke="#9cc3dd" strokeWidth={9} strokeOpacity={0.65} strokeLinecap="round" />
            <path d={terrain.river} fill="none" stroke="#ffffff" strokeWidth={2} strokeOpacity={0.35} strokeDasharray="2 14" strokeLinecap="round" />
            {/* affected-area halos */}
            {visible.map(({ alert, pos }) => {
              const sev = severityMeta(alert.severity);
              const rPx = alert.affectedRadiusKm
                ? Math.min(Math.max(alert.affectedRadiusKm * pxPerKm, 22), 240)
                : 42;
              return (
                <circle
                  key={`halo-${alert.id}`}
                  cx={(pos.x / 100) * VIEW_W}
                  cy={(pos.y / 100) * VIEW_H}
                  r={rPx}
                  fill={sev.marker}
                  opacity={hoverId === alert.id ? 0.22 : 0.12}
                  stroke={sev.marker}
                  strokeOpacity={0.4}
                  strokeDasharray="6 6"
                />
              );
            })}
          </svg>

          {/* markers (HTML buttons = keyboard accessible) */}
          {visible.map(({ alert, pos }) => {
            const sev = severityMeta(alert.severity);
            const type = disasterTypeMeta(alert.type);
            const critical = sev.rank >= 4;
            return (
              <button
                key={alert.id}
                type="button"
                onClick={() => onSelectAlert(alert)}
                onMouseEnter={() => setHoverId(alert.id)}
                onMouseLeave={() => setHoverId(null)}
                onFocus={() => setHoverId(alert.id)}
                onBlur={() => setHoverId(null)}
                aria-label={`${type.label}: ${alert.name}, ${alert.location}, severity ${sev.label}. Open details.`}
                className="absolute z-10 -translate-x-1/2 -translate-y-1/2 cursor-pointer outline-none"
                style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
              >
                {critical ? (
                  <span
                    className="absolute inset-0 rounded-full animate-[disasterPulse_1.8s_ease-out_infinite]"
                    style={{ backgroundColor: sev.marker }}
                    aria-hidden="true"
                  />
                ) : null}
                <span
                  className="relative grid h-5 w-5 place-items-center rounded-full border-2 border-white shadow-md transition-transform duration-150 group-focus:scale-110 hover:scale-110"
                  style={{ backgroundColor: sev.marker }}
                >
                  <type.Icon size={11} className="text-white" aria-hidden="true" />
                </span>
              </button>
            );
          })}

          {/* hover tooltip */}
          {hovered ? (
            <div
              className="pointer-events-none absolute z-20 w-max max-w-[240px] -translate-x-1/2 rounded-lg bg-[#26352a] px-2.5 py-1.5 text-white shadow-lg"
              style={{
                left: `${hovered.pos.x}%`,
                top: `${hovered.pos.y}%`,
                transform: "translate(-50%, calc(-100% - 16px))",
              }}
            >
              <p className="text-[12px] font-bold leading-4">{hovered.alert.name}</p>
              <p className="text-[11px] text-white/70 leading-4">
                {disasterTypeMeta(hovered.alert.type).label} · {severityMeta(hovered.alert.severity).label} ·{" "}
                {hovered.alert.location}
              </p>
            </div>
          ) : null}

          {/* empty filter state */}
          {visible.length === 0 ? (
            <div className="absolute inset-0 z-10 grid place-items-center bg-white/55 backdrop-blur-[1px]">
              <div className="grid justify-items-center gap-1.5 text-center px-4">
                <SearchX size={26} className="text-black/35" aria-hidden="true" />
                <p className="text-[13px] font-semibold text-black/70">
                  No {filter === "all" ? "" : disasterTypeMeta(filter).label.toLowerCase() + " "}
                  alerts in this region right now
                </p>
                <p className="text-[11px] text-black/45">Try another filter or refresh the feed.</p>
              </div>
            </div>
          ) : null}

          {/* region stamp */}
          <span className="absolute left-2.5 top-2.5 rounded-md bg-white/85 px-2 py-0.5 text-[11px] font-bold text-black/70 shadow-sm">
            {region?.name ?? "Monitoring region"}
          </span>
        </div>

        {/* severity legend */}
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-black/60">
          <span className="font-semibold text-black/50">Severity:</span>
          {["critical", "high", "medium", "low"].map((s) => {
            const sev = severityMeta(s);
            return (
              <span key={s} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: sev.marker }} aria-hidden="true" />
                {sev.label}
              </span>
            );
          })}
          <Badge className="ml-auto bg-black/5 text-black/50 border-transparent">
            {visible.length} marker{visible.length === 1 ? "" : "s"} shown
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
