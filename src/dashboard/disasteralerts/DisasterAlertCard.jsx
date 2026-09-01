import { MapPin, Clock, Eye } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip } from "@/components/ui/tooltip";
import {
  disasterTypeMeta,
  severityMeta,
  statusMeta,
  formatWindow,
} from "./disasterMeta";

// One active disaster alert — used in the responsive card grid.
export default function DisasterAlertCard({ alert, onViewDetails }) {
  const type = disasterTypeMeta(alert.type);
  const severity = severityMeta(alert.severity);
  const status = statusMeta(alert.status);

  return (
    <Card className="min-w-0 border-l-4" style={{ borderLeftColor: severity.marker }}>
      <CardContent className="grid gap-2.5">
        <div className="flex items-start gap-2.5">
          <span
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${type.chipClass}`}
          >
            <type.Icon size={20} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge className={type.chipClass}>{type.label}</Badge>
              <Badge className={severity.className}>{severity.label}</Badge>
              <Badge className={status.className}>{status.label}</Badge>
            </div>
            <h3 className="mt-1 text-[15px] font-bold text-black leading-5">{alert.name}</h3>
          </div>
        </div>

        <div className="grid gap-1 text-[12px] text-black/60">
          <span className="flex items-center gap-1.5">
            <MapPin size={13} className="shrink-0" aria-hidden="true" />
            <span className="truncate">{alert.location}</span>
            <Tooltip content="Agricultural risk level" side="top">
              <span className="ml-auto shrink-0 text-[11px] font-bold uppercase tracking-wide text-black/50">
                Risk: <span className="capitalize">{alert.riskLevel}</span>
              </span>
            </Tooltip>
          </span>
          <span className="flex items-center gap-1.5">
            <Clock size={13} className="shrink-0" aria-hidden="true" />
            {formatWindow(alert.startsAt, alert.endsAt)}
            {alert.expectedDuration ? ` · ${alert.expectedDuration}` : ""}
          </span>
        </div>

        <p className="text-[12px] leading-5 text-black/70 line-clamp-2">
          {alert.agriculturalRisk}
        </p>

        <button
          type="button"
          onClick={() => onViewDetails(alert)}
          className="justify-self-start flex items-center gap-1.5 rounded-xl bg-[#679936] px-3 py-1.5 text-[12px] font-bold text-white transition-colors hover:bg-[#4a7028] cursor-pointer"
        >
          <Eye size={14} aria-hidden="true" /> View Details
        </button>
      </CardContent>
    </Card>
  );
}
