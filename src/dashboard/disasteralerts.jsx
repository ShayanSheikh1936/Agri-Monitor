import { useState } from "react";
import {
  ShieldAlert,
  RefreshCw,
  MapPin,
  CloudOff,
  CheckCircle2,
  Radio,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectItem } from "@/components/ui/select";
import { Tooltip } from "@/components/ui/tooltip";
import { ToastProvider } from "@/components/ui/toast";
import { useToast } from "@/components/ui/useToast";
import useDisasterAlerts from "./disasteralerts/useDisasterAlerts";
import DisasterBanner from "./disasteralerts/DisasterBanner";
import DisasterMap from "./disasteralerts/DisasterMap";
import DisasterAlertCard from "./disasteralerts/DisasterAlertCard";
import ImpactPanel from "./disasteralerts/ImpactPanel";
import Recommendations from "./disasteralerts/Recommendations";
import AlertHistoryTable from "./disasteralerts/AlertHistoryTable";
import AlertPreferences from "./disasteralerts/AlertPreferences";
import DisasterDetailDialog from "./disasteralerts/DisasterDetailDialog";

// Disaster Alerts page — Agri Monitor Disaster Intelligence & Alert
// Dashboard. All data flows through useDisasterAlerts -> disasterAlertService
// (real API when configured, mock feed otherwise).
function DisasterAlertsInner() {
  const page = useDisasterAlerts();
  const { toast } = useToast();
  const [detail, setDetail] = useState(null); // { alert, tab }

  const openDetails = (alert) => setDetail({ alert, tab: "overview" });
  const openPrepare = (alert) => setDetail({ alert, tab: "preparation" });

  const handleRefresh = () => {
    page.refresh();
    toast({
      title: "Refreshing disaster feed",
      description: `Scanning ${page.region?.name ?? "your region"} for new threats.`,
      variant: "info",
    });
  };

  // ---- 1. Page header ---------------------------------------------------------
  const headerCard = (
    <Card className="min-w-0">
      <CardContent className="grid gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-red-100">
              <ShieldAlert size={24} className="text-red-600" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-black leading-6">Disaster Alerts</h1>
                {page.visibleAlerts.length > 0 ? (
                  <Badge className="bg-red-600 text-white">
                    {page.visibleAlerts.length} active
                  </Badge>
                ) : !page.loading && !page.error ? (
                  <Badge className="bg-green-100 text-green-700">All clear</Badge>
                ) : null}
              </div>
              <p className="mt-0.5 text-[12px] text-black/60 leading-4 max-w-[560px]">
                Monitor agricultural disasters and receive early warnings for
                threats affecting crops, livestock, and farms.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Tooltip content="Current monitoring location" side="bottom">
              <span className="flex items-center gap-1.5">
                <MapPin size={15} className="text-[#3b6d1f] shrink-0" aria-hidden="true" />
                <Select
                  value={page.regionId}
                  onChange={(e) => page.setRegionId(e.target.value)}
                  aria-label="Current location"
                  className="w-[220px] sm:w-[260px]"
                >
                  {page.regions.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </Select>
              </span>
            </Tooltip>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={page.loading || page.refreshing}
              aria-label="Refresh disaster alerts"
              className="flex items-center gap-1.5 rounded-xl bg-[var(--text1)] px-3 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[#4a7028] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw size={14} className={page.refreshing ? "animate-spin" : ""} />
              {page.refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-[12px] text-black/55">
          <span className="flex items-center gap-1.5">
            <Radio size={12} aria-hidden="true" />
            {page.region ? `${page.region.name} · ${page.region.country}` : "Select a region"}
          </span>
          <span>
            Last updated:{" "}
            {page.lastUpdated
              ? new Date(page.lastUpdated).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : page.loading
                ? "loading..."
                : "—"}
          </span>
        </div>
      </CardContent>
    </Card>
  );

  // ---- Loading state ------------------------------------------------------------
  if (page.loading) {
    return (
      <div className="scrollbar-thin scrollbar-thumb-[#679936] scrollbar-track-[#F2DEC4] flex-6 h-screen overflow-y-auto overflow-x-hidden p-3 sm:p-4">
        <div className="w-full max-w-[1280px] mx-auto grid gap-3 content-start min-w-0">
          {headerCard}
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-[380px] w-full" />
          <div className="grid gap-3 md:grid-cols-2">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
          <Skeleton className="h-56 w-full" />
        </div>
      </div>
    );
  }

  // ---- Error state ----------------------------------------------------------------
  if (page.error) {
    return (
      <div className="scrollbar-thin scrollbar-thumb-[#679936] scrollbar-track-[#F2DEC4] flex-6 h-screen overflow-y-auto overflow-x-hidden p-3 sm:p-4">
        <div className="w-full max-w-[1280px] mx-auto grid gap-3 content-start min-w-0">
          {headerCard}
          <Card>
            <CardContent className="grid gap-2 justify-items-center text-center py-8">
              <CloudOff size={34} className="text-black/30" aria-hidden="true" />
              <p className="text-[15px] font-semibold text-black">Disaster feed unavailable</p>
              <p className="text-[12px] text-black/55 max-w-[420px]">
                {page.error.message}
                {page.error.code === "DISASTER_TIMEOUT"
                  ? " The request timed out — try again."
                  : ""}
              </p>
              <button
                type="button"
                onClick={page.retry}
                className="rounded-xl bg-[var(--text1)] px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-[#4a7028] cursor-pointer transition-colors"
              >
                Try again
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ---- Main page --------------------------------------------------------------------
  return (
    <div className="scrollbar-thin scrollbar-thumb-[#679936] scrollbar-track-[#F2DEC4] flex-6 h-screen overflow-y-auto overflow-x-hidden p-3 sm:p-4">
      <div className="w-full max-w-[1280px] mx-auto grid gap-3 content-start min-w-0">
        {headerCard}

        {/* 2. Critical alert banner */}
        <DisasterBanner alert={page.criticalAlert} onViewDetails={openDetails} onPrepare={openPrepare} />

        {/* 3. Interactive disaster map */}
        <DisasterMap region={page.region} alerts={page.alerts} onSelectAlert={openDetails} />

        {/* 4. Active disaster alerts */}
        <section aria-label="Active disaster alerts" className="grid gap-2 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[15px] font-bold text-black">Active Disaster Alerts</h2>
            {page.visibleAlerts.length > 0 ? (
              <Badge className="bg-red-600 text-white">{page.visibleAlerts.length}</Badge>
            ) : null}
            {page.hiddenCount > 0 ? (
              <span className="text-[11px] text-black/45">
                {page.hiddenCount} hidden by your preference filters
              </span>
            ) : null}
          </div>

          {page.visibleAlerts.length === 0 ? (
            <Card>
              <CardContent className="flex items-center gap-2 py-3">
                <CheckCircle2 size={18} className="text-green-600 shrink-0" aria-hidden="true" />
                <p className="text-[13px] text-black/60">
                  {page.alerts.length > 0
                    ? "No alerts match your current preference filters. Adjust categories or minimum severity below."
                    : "No active disaster alerts for this region right now."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {page.visibleAlerts.map((alert) => (
                <DisasterAlertCard key={alert.id} alert={alert} onViewDetails={openDetails} />
              ))}
            </div>
          )}
        </section>

        {/* 5 + 6. Impact panel and preparation recommendations */}
        <div className="grid gap-3 xl:grid-cols-2 min-w-0">
          <ImpactPanel alerts={page.visibleAlerts} />
          <Recommendations alerts={page.visibleAlerts} />
        </div>

        {/* 7. Alert history */}
        <AlertHistoryTable history={page.history} />

        {/* 8. Alert preferences */}
        <AlertPreferences
          prefs={page.prefs}
          regions={page.regions}
          regionId={page.regionId}
          onRegionChange={page.setRegionId}
          onSave={page.savePrefs}
        />

        <p className="pb-3 text-[11px] text-black/40 leading-4">
          Disaster Alerts is a decision-support dashboard for agricultural
          preparedness. Always follow official warnings issued by your local
          disaster management authority during an emergency.
        </p>
      </div>

      {/* Alert details modal — keyed so every open starts on the right tab */}
      <DisasterDetailDialog
        key={detail ? `${detail.alert.id}-${detail.tab}` : "closed"}
        alert={detail?.alert ?? null}
        open={Boolean(detail)}
        onOpenChange={(open) => !open && setDetail(null)}
        initialTab={detail?.tab ?? "overview"}
      />
    </div>
  );
}

export default function DisasterAlertsPage() {
  return (
    <ToastProvider>
      <DisasterAlertsInner />
    </ToastProvider>
  );
}
