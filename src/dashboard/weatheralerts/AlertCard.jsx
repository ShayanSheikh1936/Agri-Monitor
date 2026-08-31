// Alert card for the Weather Alert page. Severity is conveyed with BOTH
// color and text (icons are never the only indication) for accessibility.
// Shared labels/styling live in alertMeta.js (fast-refresh: components only).

import { MapPin, Clock, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { alertTypeMeta, SEVERITY_META, STATUS_META, formatAlertTime } from "./alertMeta";

// Rendered weather context values — only real fields carried by the alert.
const CONTEXT_LABELS = {
  temperature: "Temp",
  precipitation: "Rain",
  precipitationProbability: "Rain prob",
  windSpeed: "Wind",
  humidity: "Humidity",
  uvIndex: "UV",
  et0: "ET₀",
  weatherCode: "Code",
};

function WeatherContextChips({ context }) {
  if (!context || typeof context !== "object") return null;
  const chips = Object.entries(context)
    .filter(([, v]) => v !== null && v !== undefined)
    .map(([key, value]) => {
      const label = CONTEXT_LABELS[key] ?? key;
      const unit =
        key === "temperature" ? "°C"
        : key === "precipitation" || key === "et0" ? "mm"
        : key === "precipitationProbability" || key === "humidity" ? "%"
        : key === "windSpeed" ? "km/h"
        : "";
      const text = typeof value === "number"
        ? `${Number.isInteger(value) ? value : value.toFixed(1)}${unit}`
        : String(value);
      return { key, label, text };
    });
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((chip) => (
        <span
          key={chip.key}
          className="text-[11px] bg-[rgba(0,0,0,0.06)] text-black/70 rounded-lg px-2 py-0.5"
        >
          {chip.label}: <b>{chip.text}</b>
        </span>
      ))}
    </div>
  );
}

export default function AlertCard({ alert, onAcknowledge, onResolve, upcoming = false }) {
  const { label: typeLabel, Icon } = alertTypeMeta(alert.alertType);
  const severity = SEVERITY_META[alert.severity] ?? SEVERITY_META.medium;
  const status = STATUS_META[alert.status] ?? STATUS_META.active;
  const isAcknowledged = alert.status === "acknowledged";

  return (
    <div
      className={`bg-card rounded-2xl border py-4 px-4 shadow-sm grid gap-2.5 min-w-0 ${
        alert.severity === "critical" ? "border-red-300" : ""
      }`}
    >
      <div className="flex items-start gap-3 min-w-0">
        <span className="w-10 h-10 rounded-xl bg-[#D7E8C0] grid place-items-center shrink-0">
          <Icon size={20} className="text-[#3b6d1f]" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge className={severity.className}>{severity.label}</Badge>
            <Badge variant="secondary" className="capitalize">{typeLabel}</Badge>
            <Badge className={status.className}>{upcoming && !isAcknowledged ? "Upcoming" : status.label}</Badge>
          </div>
          <h3 className="text-[15px] font-bold text-black mt-1.5 leading-5">{alert.title}</h3>
        </div>
      </div>

      <p className="text-[12.5px] text-black/65 leading-5">{alert.message}</p>

      <WeatherContextChips context={alert.weatherContext} />

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-black/55">
        {alert.cropName ? <span className="capitalize">Crop: <b>{alert.cropName}</b></span> : null}
        {alert.location ? (
          <span className="flex items-center gap-1">
            <MapPin size={11} aria-hidden="true" />
            {Number(alert.location.latitude).toFixed(3)}, {Number(alert.location.longitude).toFixed(3)}
          </span>
        ) : null}
        <span className="flex items-center gap-1">
          <Clock size={11} aria-hidden="true" />
          {formatAlertTime(alert.startTime)} → {formatAlertTime(alert.endTime)}
        </span>
        <span>Source: {alert.source}</span>
      </div>

      {onAcknowledge || onResolve ? (
        <div className="flex flex-wrap gap-2 pt-1">
          {onAcknowledge && !isAcknowledged ? (
            <button
              type="button"
              onClick={() => onAcknowledge(alert.id)}
              className="flex items-center gap-1.5 rounded-xl bg-[var(--text1)] px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-[#4a7028] transition-colors cursor-pointer"
            >
              <Check size={13} aria-hidden="true" /> Acknowledge
            </button>
          ) : null}
          {onResolve ? (
            <button
              type="button"
              onClick={() => onResolve(alert.id)}
              className="rounded-xl border border-black/15 px-3 py-1.5 text-[12px] font-semibold text-black/70 hover:bg-black/5 transition-colors cursor-pointer"
            >
              Mark resolved
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
