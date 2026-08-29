import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CloudRain, Thermometer } from "lucide-react";
import { formatDateShort, localTodayISO } from "@/lib/weatherUtils";

// Lightweight inline SVG charts — no chart library added, keeps the bundle
// light. Both charts degrade gracefully: if there is no usable numeric data
// the card simply does not render.

const W = 560;
const H = 170;
const PAD = { top: 18, right: 10, bottom: 26, left: 34 };

function frame() {
  return {
    innerW: W - PAD.left - PAD.right,
    innerH: H - PAD.top - PAD.bottom,
  };
}

export function RainfallChart({ daily }) {
  const days = (daily ?? []).filter((d) => d.precipitationSumMm !== null);
  if (days.length === 0) return null;

  const { innerW, innerH } = frame();
  const maxMm = Math.max(5, ...days.map((d) => d.precipitationSumMm));
  const barW = innerW / days.length;
  const today = localTodayISO();

  return (
    <Card>
      <CardHeader className="pb-0">
        <CardTitle className="flex items-center gap-2 text-[15px]">
          <CloudRain size={16} className="text-[var(--text1)]" />
          Rainfall Outlook
        </CardTitle>
      </CardHeader>
      <CardContent>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Daily rainfall forecast chart">
          {/* grid lines at 0, half, max */}
          {[0, 0.5, 1].map((f) => {
            const y = PAD.top + innerH - f * innerH;
            return (
              <g key={f}>
                <line x1={PAD.left} x2={W - PAD.right} y1={y} y2={y} stroke="#67993622" strokeWidth="1" />
                <text x={PAD.left - 6} y={y + 3} textAnchor="end" fontSize="9" fill="#00000066">
                  {Math.round(f * maxMm)}
                </text>
              </g>
            );
          })}
          {days.map((d, i) => {
            const h = (d.precipitationSumMm / maxMm) * innerH;
            const x = PAD.left + i * barW + barW * 0.2;
            const y = PAD.top + innerH - h;
            const heavy = d.precipitationSumMm >= 5;
            return (
              <g key={d.date}>
                <rect
                  x={x}
                  y={y}
                  width={barW * 0.6}
                  height={Math.max(h, d.precipitationSumMm > 0 ? 2 : 0)}
                  rx="3"
                  fill={heavy ? "#2d6ca3" : "#67993699"}
                />
                {d.precipitationSumMm > 0 && (
                  <text x={x + barW * 0.3} y={y - 4} textAnchor="middle" fontSize="9" fontWeight="700" fill="#000000aa">
                    {d.precipitationSumMm}
                  </text>
                )}
                {d.precipitationProbabilityMaxPercent !== null && (
                  <text x={x + barW * 0.3} y={PAD.top + innerH + 9} textAnchor="middle" fontSize="8" fill="#2d6ca3">
                    {Math.round(d.precipitationProbabilityMaxPercent)}%
                  </text>
                )}
                <text x={x + barW * 0.3} y={H - 4} textAnchor="middle" fontSize="9" fill="#00000088">
                  {d.date === today ? "Today" : formatDateShort(d.date)}
                </text>
              </g>
            );
          })}
          <text x={PAD.left - 6} y={PAD.top - 6} textAnchor="end" fontSize="8" fill="#00000066">
            mm
          </text>
        </svg>
        <p className="text-[11px] text-black/40">
          Bars show expected rainfall (mm); percentages show the chance of precipitation.
        </p>
      </CardContent>
    </Card>
  );
}

export function TemperatureChart({ daily }) {
  const days = (daily ?? []).filter((d) => d.tempMaxC !== null || d.tempMinC !== null);
  if (days.length === 0) return null;

  const { innerW, innerH } = frame();
  const all = days.flatMap((d) => [d.tempMaxC, d.tempMinC]).filter((v) => v !== null);
  const maxT = Math.max(...all) + 1;
  const minT = Math.min(...all) - 1;
  const range = Math.max(maxT - minT, 1);
  const stepX = days.length > 1 ? innerW / (days.length - 1) : innerW;
  const today = localTodayISO();

  const y = (t) => PAD.top + innerH - ((t - minT) / range) * innerH;
  const x = (i) => PAD.left + i * stepX;
  const line = (get) =>
    days
      .map((d, i) => (get(d) === null ? null : `${x(i)},${y(get(d))}`))
      .filter(Boolean)
      .join(" ");

  return (
    <Card>
      <CardHeader className="pb-0">
        <CardTitle className="flex items-center gap-2 text-[15px]">
          <Thermometer size={16} className="text-[var(--text1)]" />
          Temperature Trend
        </CardTitle>
      </CardHeader>
      <CardContent>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Daily temperature trend chart">
          {/* horizontal reference grid */}
          {[0, 0.5, 1].map((f) => {
            const t = minT + f * range;
            const yy = y(t);
            return (
              <g key={f}>
                <line x1={PAD.left} x2={W - PAD.right} y1={yy} y2={yy} stroke="#67993622" strokeWidth="1" />
                <text x={PAD.left - 6} y={yy + 3} textAnchor="end" fontSize="9" fill="#00000066">
                  {Math.round(t)}°
                </text>
              </g>
            );
          })}
          <polyline points={line((d) => d.tempMaxC)} fill="none" stroke="#d97b29" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <polyline points={line((d) => d.tempMinC)} fill="none" stroke="#2d6ca3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          {days.map((d, i) => (
            <g key={d.date}>
              {d.tempMaxC !== null && <circle cx={x(i)} cy={y(d.tempMaxC)} r="3" fill="#d97b29" />}
              {d.tempMinC !== null && <circle cx={x(i)} cy={y(d.tempMinC)} r="3" fill="#2d6ca3" />}
              <text x={x(i)} y={H - 4} textAnchor="middle" fontSize="9" fill="#00000088">
                {d.date === today ? "Today" : formatDateShort(d.date)}
              </text>
            </g>
          ))}
        </svg>
        <div className="flex gap-4 text-[11px] text-black/50">
          <span className="flex items-center gap-1">
            <span className="w-3 h-[3px] rounded bg-[#d97b29] inline-block" /> Daily maximum
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-[3px] rounded bg-[#2d6ca3] inline-block" /> Daily minimum
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
