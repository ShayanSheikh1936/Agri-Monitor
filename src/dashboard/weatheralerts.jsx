import { Link, useOutletContext } from "react-router-dom";
import {
  RefreshCw,
  MapPin,
  Plus,
  CloudOff,
  LocateOff,
  Bell,
  BellOff,
  BellRing,
  CheckCircle2,
  History,
  Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/authContext";
import { WEATHER_ERROR_CODES } from "@/services/weatherService";
import useWeatherAlerts from "./weatheralerts/useWeatherAlerts";
import AlertCard from "./weatheralerts/AlertCard";
import {
  alertTypeMeta,
  SEVERITY_META,
  STATUS_META,
  NOTIFICATION_STATUS_LABELS,
  formatAlertTime,
} from "./weatheralerts/alertMeta";

function PageState({ icon: Icon, title, children, action }) {
  return (
    <div className="max-w-[420px] w-full text-center grid gap-3 justify-items-center mx-auto py-10">
      <Icon size={40} className="text-[var(--text1)]" />
      <h2 className="text-xl font-bold text-black">{title}</h2>
      <div className="text-[13px] text-black/60 leading-5">{children}</div>
      {action}
    </div>
  );
}

// Accessible ON/OFF switch bound to the user's real preference.
function PreferenceSwitch({ enabled, disabled, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label="Weather alert notifications"
      disabled={disabled}
      onClick={onChange}
      className={`w-[45px] h-[22px] rounded-full relative transition-colors duration-300 shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
        enabled ? "bg-[#22c55e]" : "bg-[#d1d5db]"
      }`}
    >
      <span
        className={`absolute top-[3px] ${enabled ? "left-[26px]" : "left-[3px]"} w-[15px] h-[15px] bg-white rounded-full transition-[left] duration-300 ease-in-out shadow-[0_2px_4px_rgba(0,0,0,0.2)] pointer-events-none`}
      />
    </button>
  );
}

// Weather Alert page — detects meaningful conditions from real Open-Meteo
// data, tracks alert lifecycle, and (only when the user's existing
// notification preference is ON) delivers structured webhook events.
export default function WeatherAlertsPage() {
  const { userCropData } = useOutletContext();
  const { currentUser } = useAuth();
  const page = useWeatherAlerts(userCropData?.crops, currentUser?.uid);

  const cropsLoading = userCropData === undefined || userCropData === null;
  const { weather, errorCode } = page;

  // ---- Notification settings card (always visible) -------------------------
  const settingsCard = (
    <Card className="min-w-0">
      <CardContent className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {page.prefEnabled ? (
              <BellRing size={18} className="text-[#3b6d1f]" aria-hidden="true" />
            ) : (
              <BellOff size={18} className="text-black/40" aria-hidden="true" />
            )}
            <h2 className="text-[15px] font-bold text-black">Weather Alert Notifications</h2>
          </div>
          <PreferenceSwitch
            enabled={page.prefEnabled}
            disabled={page.prefLoading}
            onChange={page.togglePreference}
          />
        </div>
        <p className="text-[12px] text-black/60 leading-5">
          {page.prefEnabled
            ? "Weather alerts are enabled. When a meaningful condition is detected, the alert is saved here and a notification event is sent. This setting is shared with your Personal Information page."
            : "Weather alerts are disabled. Conditions are still checked and shown here, but no notification events are sent. You can also change this in your Personal Information."}
        </p>
        {page.prefError ? (
          <p role="alert" className="text-[12px] text-red-600 font-semibold">
            {page.prefError}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );

  // ---- Empty / unavailable states (never fake data) ------------------------

  if (cropsLoading) {
    return (
      <div className="flex-6 h-screen overflow-y-auto p-4 grid gap-3 content-start">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (page.crops.length === 0) {
    return (
      <div className="flex-6 h-screen overflow-y-auto p-4 grid gap-3 content-start">
        <div className="w-full max-w-[1280px] mx-auto grid gap-3 min-w-0">
          {settingsCard}
          <PageState
            icon={CloudOff}
            title="No crops yet"
            action={
              <Link
                to="/dashboard/addnewcrop"
                className="capitalize bg-[#679936] rounded-2xl px-3 py-2 text-[var(--text-h)] transition-colors hover:bg-[#4a7028] flex items-center gap-2"
              >
                <Plus size={16} /> add crop
              </Link>
            }
          >
            Weather alerts are tied to your crop's field location. Add a crop
            first to start monitoring.
          </PageState>
        </div>
      </div>
    );
  }

  if (page.withGps.length === 0) {
    return (
      <div className="flex-6 h-screen overflow-y-auto p-4 grid gap-3 content-start">
        <div className="w-full max-w-[1280px] mx-auto grid gap-3 min-w-0">
          {settingsCard}
          <PageState
            icon={LocateOff}
            title="Weather alerts require a valid crop/farm location"
            action={
              <Link
                to="/dashboard/addnewcrop"
                className="capitalize bg-[#679936] rounded-2xl px-3 py-2 text-[var(--text-h)] transition-colors hover:bg-[#4a7028] flex items-center gap-2"
              >
                <Plus size={16} /> add crop with location
              </Link>
            }
          >
            None of your crops has GPS coordinates, so alerts cannot be
            located. Coordinates are never invented — add a field location via
            Add New Crop.
          </PageState>
        </div>
      </div>
    );
  }

  // ---- Main page ------------------------------------------------------------

  const notifiedAlerts = page.alerts
    .filter((a) => a.notificationStatus)
    .slice(0, 8);

  return (
    <div className="scrollbar-thin scrollbar-thumb-[#679936] scrollbar-track-[#F2DEC4] flex-6 h-screen overflow-y-auto overflow-x-hidden p-3 sm:p-4">
      <div className="w-full max-w-[1280px] mx-auto grid gap-3 content-start min-w-0">
        {/* 1. Header: crop selector, location, last check, refresh, status */}
        <Card className="min-w-0">
          <CardContent className="grid gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Bell size={20} className="text-[#3b6d1f]" aria-hidden="true" />
                <h1 className="text-xl font-bold text-black">Weather Alerts</h1>
                {page.prefEnabled ? (
                  <Badge className="bg-green-600 text-white">Alerts enabled</Badge>
                ) : (
                  <Badge className="bg-gray-200 text-gray-600">Alerts disabled</Badge>
                )}
              </div>
              <button
                type="button"
                onClick={page.refresh}
                disabled={page.loading || page.refreshing}
                aria-label="Refresh weather and alerts"
                className="flex items-center gap-1.5 rounded-xl bg-[var(--text1)] px-3 py-1.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#4a7028] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw size={14} className={page.refreshing ? "animate-spin" : ""} />
                {page.refreshing ? "Refreshing..." : "Refresh"}
              </button>
            </div>

            {/* Crop selector — alerts never mix between crops */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-track-[#D7E8C0] scrollbar-thumb-[#679936]">
              {page.crops.map((entry) => {
                const hasGps = Boolean(entry.gps);
                const active = entry.key === page.selectedKey;
                return (
                  <button
                    key={entry.key}
                    type="button"
                    disabled={!hasGps}
                    onClick={() => page.setSelectedKey(entry.key)}
                    aria-pressed={active}
                    title={
                      hasGps
                        ? `Show alerts for ${entry.crop.CropName || "this crop"}`
                        : `${entry.crop.CropName || "This crop"} has no GPS location`
                    }
                    className={`shrink-0 flex items-center gap-2 rounded-2xl px-2 py-1.5 pr-3 border transition-colors ${
                      active
                        ? "bg-[#679936] border-[#679936] text-white"
                        : "bg-[#D7E8C0]/50 border-transparent text-black hover:border-[#679936]/40"
                    } ${hasGps ? "cursor-pointer" : "cursor-not-allowed opacity-50"}`}
                  >
                    <span className="w-8 h-8 rounded-full overflow-hidden border-2 border-white/60 bg-black/10 shrink-0">
                      {entry.crop.cropImage ? (
                        <img
                          src={entry.crop.cropImage}
                          alt={entry.crop.CropName || "crop"}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="flex items-center justify-center w-full h-full text-xs font-bold">
                          {(entry.crop.CropName || "C").charAt(0).toUpperCase()}
                        </span>
                      )}
                    </span>
                    <span className="text-[13px] font-semibold capitalize">
                      {entry.crop.CropName || `Crop ${entry.index + 1}`}
                    </span>
                    {!hasGps && <span className="text-[10px]">(no GPS)</span>}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-[12px] text-black/55">
              <span className="flex items-center gap-1 capitalize">
                <MapPin size={12} aria-hidden="true" />
                {page.selected?.crop?.CropName || "Selected crop"}
                {page.selected?.gps
                  ? ` · ${page.selected.gps.lat.toFixed(3)}, ${page.selected.gps.lon.toFixed(3)}`
                  : ""}
              </span>
              <span>
                Last weather check:{" "}
                {weather?.fetchedAt
                  ? new Date(weather.fetchedAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : page.loading
                    ? "checking..."
                    : "—"}
                {page.syncing ? " · scanning for alerts..." : ""}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* 2. Notification settings */}
        {settingsCard}

        {/* Weather failure states */}
        {errorCode && !page.loading ? (
          <Card>
            <CardContent className="grid gap-2 justify-items-center text-center py-6">
              <CloudOff size={32} className="text-black/30" />
              <p className="text-[15px] font-semibold text-black">Weather unavailable</p>
              <p className="text-[12px] text-black/55 max-w-[420px]">
                {page.errorMessage}
                {errorCode === WEATHER_ERROR_CODES.TIMEOUT
                  ? " The request timed out — try again."
                  : ""}
              </p>
              <button
                type="button"
                onClick={page.refresh}
                className="rounded-xl bg-[var(--text1)] px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-[#4a7028] cursor-pointer transition-colors"
              >
                Try again
              </button>
            </CardContent>
          </Card>
        ) : page.loading ? (
          <>
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-28 w-full" />
          </>
        ) : (
          <>
            {/* 3. Active alerts */}
            <section aria-label="Active weather alerts" className="grid gap-2 min-w-0">
              <h2 className="text-[15px] font-bold text-black flex items-center gap-2">
                Active Alerts
                {page.currentAlerts.length > 0 ? (
                  <Badge className="bg-red-600 text-white">{page.currentAlerts.length}</Badge>
                ) : null}
              </h2>
              {page.alertsLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : page.currentAlerts.length > 0 ? (
                page.currentAlerts.map((alert) => (
                  <AlertCard
                    key={alert.id}
                    alert={alert}
                    onAcknowledge={page.acknowledge}
                    onResolve={page.resolve}
                  />
                ))
              ) : (
                <Card>
                  <CardContent className="flex items-center gap-2 py-2">
                    <CheckCircle2 size={18} className="text-green-600" aria-hidden="true" />
                    <p className="text-[13px] text-black/60">
                      No active weather alerts for this crop right now.
                    </p>
                  </CardContent>
                </Card>
              )}
              {page.actionError ? (
                <p role="alert" className="text-[12px] text-red-600 font-semibold">
                  {page.actionError}
                </p>
              ) : null}
            </section>

            {/* 4. Upcoming alerts */}
            <section aria-label="Upcoming weather alerts" className="grid gap-2 min-w-0">
              <h2 className="text-[15px] font-bold text-black">Upcoming Alerts</h2>
              {page.upcomingAlerts.length > 0 ? (
                page.upcomingAlerts.map((alert) => (
                  <AlertCard key={alert.id} alert={alert} upcoming />
                ))
              ) : (
                <p className="text-[12px] text-black/50 px-1">
                  No upcoming alerts in the current forecast window.
                </p>
              )}
            </section>

            {/* 5. Notification activity */}
            <section aria-label="Notification activity" className="grid gap-2 min-w-0">
              <h2 className="text-[15px] font-bold text-black">Notification Activity</h2>
              <Card>
                <CardContent className="grid gap-2">
                  {!page.prefEnabled ? (
                    <p className="text-[12px] text-black/55">
                      Notifications are disabled — alerts appear here but no
                      notification events are sent.
                    </p>
                  ) : null}
                  {notifiedAlerts.length === 0 ? (
                    <p className="text-[12px] text-black/55">
                      No notification events recorded for this crop yet.
                    </p>
                  ) : (
                    notifiedAlerts.map((alert) => {
                      const failed = alert.notificationStatus === "failed";
                      return (
                        <div
                          key={alert.id}
                          className="flex flex-wrap items-center justify-between gap-2 text-[12px] border-b border-black/5 last:border-0 pb-1.5 last:pb-0"
                        >
                          <span className="text-black/75 min-w-0">
                            <b>{alert.title}</b>
                            <span className="text-black/45">
                              {" "}
                              · {formatAlertTime(alert.notificationSentAt ?? alert.triggeredAt)}
                            </span>
                          </span>
                          <Badge
                            className={
                              failed
                                ? "bg-red-100 text-red-700"
                                : alert.notificationStatus === "sent"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-gray-100 text-gray-600"
                            }
                          >
                            {NOTIFICATION_STATUS_LABELS[alert.notificationStatus] ??
                              alert.notificationStatus}
                          </Badge>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            </section>

            {/* 6. Alert history (bounded, paginated) */}
            <section aria-label="Alert history" className="grid gap-2 min-w-0 pb-3">
              <h2 className="text-[15px] font-bold text-black flex items-center gap-2">
                <History size={16} aria-hidden="true" /> Alert History
              </h2>
              <Card>
                <CardContent className="grid gap-2">
                  {page.historyAlerts.length === 0 ? (
                    <p className="text-[12px] text-black/55">
                      No resolved or expired alerts for this crop yet.
                    </p>
                  ) : (
                    page.historyAlerts.map((alert) => {
                      const typeMeta = alertTypeMeta(alert.alertType);
                      const severity = SEVERITY_META[alert.severity] ?? SEVERITY_META.medium;
                      const status = STATUS_META[alert.status] ?? STATUS_META.expired;
                      return (
                        <div
                          key={alert.id}
                          className="flex flex-wrap items-center gap-2 text-[12px] border-b border-black/5 last:border-0 pb-1.5 last:pb-0"
                        >
                          <typeMeta.Icon size={14} className="text-[#3b6d1f] shrink-0" aria-hidden="true" />
                          <span className="text-black/75 min-w-0 flex-1 truncate">{alert.title}</span>
                          <span className="text-black/45">
                            {formatAlertTime(alert.triggeredAt)}
                          </span>
                          <Badge className={severity.className}>{severity.label}</Badge>
                          <Badge className={status.className}>{status.label}</Badge>
                          <span className="text-black/45">
                            {alert.notificationSent ? "notified" : "not notified"}
                          </span>
                        </div>
                      );
                    })
                  )}
                  {page.historyCursor ? (
                    <button
                      type="button"
                      onClick={page.loadOlder}
                      className="justify-self-center flex items-center gap-1.5 rounded-xl border border-black/15 px-3 py-1.5 text-[12px] font-semibold text-black/70 hover:bg-black/5 transition-colors cursor-pointer"
                    >
                      <Loader2 size={13} aria-hidden="true" /> Load older alerts
                    </button>
                  ) : null}
                </CardContent>
              </Card>
              <p className="text-[11px] text-black/40">
                Alerts are decision support derived from weather forecast
                thresholds — always combine them with your own field
                observations.
              </p>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
