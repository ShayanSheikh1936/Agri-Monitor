import { useState } from "react";
import { MapPin, CalendarClock, Radio, Info, CheckCircle2, LocateFixed } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  disasterTypeMeta,
  severityMeta,
  statusMeta,
  impactRisk,
  IMPACT_ASSETS,
  preparationRecommendations,
  PREPAREDNESS_DISCLAIMER,
  formatDisasterTime,
  formatWindow,
} from "./disasterMeta";

function MetaRow({ icon: Icon, label, children }) {
  return (
    <div className="grid gap-0.5 rounded-xl bg-black/[0.03] p-2.5">
      <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-black/45">
        <Icon size={12} aria-hidden="true" /> {label}
      </span>
      <span className="text-[13px] font-semibold text-black/80 leading-5">{children}</span>
    </div>
  );
}

// Alert Details modal — full information for one disaster alert with
// Overview / Impact / Preparation tabs. The parent re-mounts this dialog via
// key when a new alert opens, so the tab always starts on initialTab.
export default function DisasterDetailDialog({ alert, open, onOpenChange, initialTab = "overview" }) {
  const [tab, setTab] = useState(initialTab);

  if (!alert) return null;

  const type = disasterTypeMeta(alert.type);
  const severity = severityMeta(alert.severity);
  const status = statusMeta(alert.status);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)}>
        <DialogHeader>
          <div className="flex items-start gap-3 pr-8">
            <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${type.chipClass}`}>
              <type.Icon size={22} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge className={type.chipClass}>{type.label}</Badge>
                <Badge className={severity.className}>{severity.label} severity</Badge>
                <Badge className={status.className}>{status.label}</Badge>
              </div>
              <DialogTitle className="mt-1">{alert.name}</DialogTitle>
            </div>
          </div>
          <DialogDescription className="flex items-center gap-1.5">
            <MapPin size={12} className="shrink-0" aria-hidden="true" />
            {alert.location}
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="impact">Impact</TabsTrigger>
              <TabsTrigger value="preparation">Preparation</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div className="grid gap-3">
                <p className="text-[13px] text-black/75 leading-5">{alert.description}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <MetaRow icon={CalendarClock} label="Issued">
                    {formatDisasterTime(alert.issuedAt)}
                  </MetaRow>
                  <MetaRow icon={CalendarClock} label="Expected window">
                    {formatWindow(alert.startsAt, alert.endsAt)}
                    {alert.endsAt ? ` · until ${formatDisasterTime(alert.endsAt)}` : ""}
                  </MetaRow>
                  <MetaRow icon={CalendarClock} label="Duration">
                    {alert.expectedDuration ?? "Ongoing"}
                  </MetaRow>
                  <MetaRow icon={LocateFixed} label="Coordinates">
                    {alert.coordinates
                      ? `${alert.coordinates.lat.toFixed(3)}, ${alert.coordinates.lon.toFixed(3)}`
                      : "Not specified"}
                    {alert.affectedRadiusKm ? ` · ~${alert.affectedRadiusKm} km radius` : ""}
                  </MetaRow>
                  <MetaRow icon={Radio} label="Source">
                    {alert.source ?? "Agri Monitor"}
                  </MetaRow>
                  <MetaRow icon={Info} label="Risk level">
                    <span className="capitalize">{alert.riskLevel}</span>
                  </MetaRow>
                </div>
                <div className="rounded-xl border border-orange-200 bg-orange-50 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-orange-700">
                    Agricultural risk
                  </p>
                  <p className="mt-1 text-[13px] text-black/75 leading-5">{alert.agriculturalRisk}</p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="impact">
              {alert.impact ? (
                <div className="grid gap-2.5">
                  {IMPACT_ASSETS.map(({ key, label, Icon }) => {
                    const value = alert.impact[key] ?? 0;
                    const risk = impactRisk(value);
                    return (
                      <div key={key} className="grid gap-1">
                        <div className="flex items-center gap-2 text-[12px]">
                          <Icon size={14} className="text-[#3b6d1f] shrink-0" aria-hidden="true" />
                          <span className="font-semibold text-black/80">{label}</span>
                          <span className={`ml-auto text-[11px] font-bold uppercase tracking-wide ${risk.text}`}>
                            {risk.label}
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-black/8">
                          <div
                            className={`h-full rounded-full ${risk.className}`}
                            style={{ width: `${Math.max(value * 100, 2)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  <p className="text-[11px] text-black/40">
                    Estimated exposure of each farm asset to this event (0–100%).
                  </p>
                </div>
              ) : (
                <p className="text-[13px] text-black/60">
                  No per-asset impact estimate is available for this alert.
                </p>
              )}
            </TabsContent>

            <TabsContent value="preparation">
              <div className="grid gap-2">
                {preparationRecommendations(alert.type).map((rec) => (
                  <div key={rec.title} className="flex items-start gap-2.5 rounded-xl bg-[#D7E8C0]/40 p-2.5">
                    <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-[#3b6d1f]" aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="text-[13px] font-bold text-black leading-4">{rec.title}</p>
                      <p className="text-[12px] text-black/60 leading-4 mt-0.5">{rec.detail}</p>
                    </div>
                  </div>
                ))}
                <p className="flex items-start gap-1.5 text-[11px] text-black/40 leading-4 mt-1">
                  <Info size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
                  {PREPAREDNESS_DISCLAIMER}
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
