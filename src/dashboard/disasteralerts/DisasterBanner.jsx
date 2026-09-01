import { MapPin, Clock, Siren, Eye, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  disasterTypeMeta,
  severityMeta,
  statusMeta,
  formatWindow,
} from "./disasterMeta";

// Critical Alert Banner — the most serious active disaster gets a dedicated,
// high-contrast strip so it stands out from normal monitoring content.
export default function DisasterBanner({ alert, onViewDetails, onPrepare }) {
  if (!alert) return null;
  const type = disasterTypeMeta(alert.type);
  const severity = severityMeta(alert.severity);
  const status = statusMeta(alert.status);
  const critical = severity.rank >= 4;

  return (
    <section
      aria-label="Critical disaster alert"
      className={`relative overflow-hidden rounded-2xl border shadow-sm ${
        critical
          ? "border-red-700/60 bg-gradient-to-r from-red-700 via-red-600 to-orange-600"
          : "border-orange-600/50 bg-gradient-to-r from-orange-600 to-amber-500"
      }`}
    >
      {/* subtle radar-sweep texture */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 85% 20%, white 0, transparent 32%), repeating-radial-gradient(circle at 85% 20%, transparent 0 14px, white 14px 15px)",
        }}
      />
      <div className="relative flex flex-col gap-3 p-4 sm:p-5 lg:flex-row lg:items-center">
        <div className="flex items-start gap-3 lg:w-[46%] min-w-0">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/30">
            <type.Icon size={26} className="text-white" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-white/85">
                {critical ? "Critical Alert" : "High Alert"} · {type.label}
              </span>
              <Badge className="bg-white/20 text-white border-transparent">{severity.label}</Badge>
              <Badge className="bg-black/20 text-white border-transparent">{status.label}</Badge>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white leading-6 mt-0.5">
              {alert.name}
            </h2>
          </div>
        </div>

        <div className="grid gap-1 text-[13px] text-white/90 lg:w-[34%] min-w-0">
          <span className="flex items-center gap-1.5">
            <MapPin size={14} className="shrink-0" aria-hidden="true" />
            {alert.location}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock size={14} className="shrink-0" aria-hidden="true" />
            {formatWindow(alert.startsAt, alert.endsAt)}
            {alert.expectedDuration ? ` · ${alert.expectedDuration}` : ""}
          </span>
          <span className="flex items-start gap-1.5 leading-5">
            <Siren size={14} className="mt-1 shrink-0" aria-hidden="true" />
            <span className="line-clamp-2">{alert.agriculturalRisk}</span>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
          <button
            type="button"
            onClick={() => onViewDetails(alert)}
            className="flex items-center gap-1.5 rounded-xl bg-white/15 px-3.5 py-2 text-[13px] font-bold text-white ring-1 ring-white/40 transition-colors hover:bg-white/25 cursor-pointer"
          >
            <Eye size={15} aria-hidden="true" /> View Details
          </button>
          <button
            type="button"
            onClick={() => onPrepare(alert)}
            className="flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-[13px] font-bold text-red-700 shadow-sm transition-colors hover:bg-red-50 cursor-pointer"
          >
            <ShieldCheck size={15} aria-hidden="true" /> Prepare Now
          </button>
        </div>
      </div>
    </section>
  );
}
