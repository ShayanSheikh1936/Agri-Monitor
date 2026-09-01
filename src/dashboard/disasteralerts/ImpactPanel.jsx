import { Card, CardContent } from "@/components/ui/card";
import { ShieldCheck } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";
import { IMPACT_ASSETS, impactRisk, disasterTypeMeta } from "./disasterMeta";

// Agricultural Impact Panel — aggregates active alerts into per-asset risk
// levels (crops, livestock, irrigation, soil, equipment, infrastructure).
export default function ImpactPanel({ alerts }) {
  // Risk per asset = strongest single impact among active alerts, with the
  // alert that drives it surfaced as the "top threat".
  const assetRisks = IMPACT_ASSETS.map(({ key, label, Icon }) => {
    let value = 0;
    let threat = null;
    for (const alert of alerts) {
      const v = alert.impact?.[key] ?? 0;
      if (v > value) {
        value = v;
        threat = alert;
      }
    }
    return { key, label, Icon, value, threat };
  });

  return (
    <Card className="min-w-0">
      <CardContent className="grid gap-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[15px] font-bold text-black">Agricultural Impact</h2>
          <Tooltip content="Highest active threat per farm asset" side="bottom">
            <span className="text-[11px] font-semibold text-black/45">Region aggregate</span>
          </Tooltip>
        </div>

        {alerts.length === 0 ? (
          <div className="flex items-center gap-2 rounded-xl bg-green-50 p-3">
            <ShieldCheck size={18} className="text-green-600 shrink-0" aria-hidden="true" />
            <p className="text-[12px] text-black/65 leading-4">
              No active threats right now — asset risk levels are clear.
            </p>
          </div>
        ) : (
          <div className="grid gap-2.5">
            {assetRisks.map(({ key, label, Icon, value, threat }) => {
              const risk = impactRisk(value);
              const threatType = threat ? disasterTypeMeta(threat.type) : null;
              return (
                <div key={key} className="grid gap-1">
                  <div className="flex items-center gap-2 text-[12px]">
                    <Icon size={14} className="text-[#3b6d1f] shrink-0" aria-hidden="true" />
                    <span className="font-semibold text-black/80">{label}</span>
                    {threat ? (
                      <Tooltip content={`Top threat: ${threat.name}`} side="top">
                        <span className="flex items-center gap-1 truncate text-[11px] text-black/45">
                          <threatType.Icon size={11} aria-hidden="true" />
                          <span className="truncate">{threatType.label}</span>
                        </span>
                      </Tooltip>
                    ) : (
                      <span className="text-[11px] text-black/35">No active threat</span>
                    )}
                    <span
                      className={`ml-auto text-[11px] font-bold uppercase tracking-wide ${risk.text}`}
                    >
                      {risk.label}
                    </span>
                  </div>
                  <div
                    className="h-2 w-full overflow-hidden rounded-full bg-black/8"
                    role="meter"
                    aria-label={`${label} risk`}
                    aria-valuenow={Math.round(value * 100)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className={`h-full rounded-full ${risk.className} transition-[width] duration-500`}
                      style={{ width: `${Math.max(value * 100, 2)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-[11px] text-black/40 leading-4">
          Risk levels combine severity and expected agricultural exposure of
          active alerts in this region.
        </p>
      </CardContent>
    </Card>
  );
}
