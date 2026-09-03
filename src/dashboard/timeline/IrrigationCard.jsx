import { useEffect, useMemo, useRef, useState } from "react";
import {
  Droplets,
  Droplet,
  CloudRain,
  CloudSun,
  Snowflake,
  ThermometerSun,
  Wind,
  Waves,
  Sprout,
  CalendarDays,
  CircleHelp,
  MapPin,
  Info,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Tooltip } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
} from "@/components/ui/dialog";
import {
  fetchWeatherForCrop,
  WEATHER_ERROR_CODES,
} from "../../services/weatherService";
import { buildIrrigationSchedule } from "../../services/irrigationScheduler";
import { formatDate } from "@/lib/cropUtils";
import useDayTick from "@/lib/useDayTick";
import styles from "./irrigation.module.css";

// =============================================================================
// Smart Irrigation card — stage + weather driven watering schedule.
//
//  - Self-contained: fetches its own (cached) weather so no other page or
//    hook had to change; the parent still renders <IrrigationCard crop={…}/>.
//  - All planning maths lives in services/irrigationScheduler.js (pure).
//  - Animations are scoped via irrigation.module.css (CSS module).
// =============================================================================

const NOTE_STYLES = {
  rain: "bg-sky-50 text-sky-800",
  heat: "bg-amber-50 text-amber-800",
  frost: "bg-cyan-50 text-cyan-800",
  wind: "bg-slate-100 text-slate-700",
  baseline: "bg-amber-50 text-amber-800",
};

const NOTE_ICONS = {
  rain: <CloudRain size={13} className="mt-0.5 shrink-0" />,
  heat: <ThermometerSun size={13} className="mt-0.5 shrink-0" />,
  frost: <Snowflake size={13} className="mt-0.5 shrink-0" />,
  wind: <Wind size={13} className="mt-0.5 shrink-0" />,
  baseline: <Info size={13} className="mt-0.5 shrink-0" />,
};

function dayColumnMeta(day) {
  if (day.action === "water")
    return {
      icon: (
        <Droplets
          size={16}
          className={`text-sky-600 ${day.isToday ? styles.drip : ""}`}
        />
      ),
      label: `${day.grossMm}mm`,
      bg: "bg-sky-100/80",
      tip: `Water ≈ ${day.grossMm} mm · ${day.window}`,
    };
  if (day.flags.includes("frost"))
    return {
      icon: <Snowflake size={15} className="text-cyan-600" />,
      label: "hold",
      bg: "bg-cyan-50",
      tip: `Frost risk (min ${day.tmin}°C) — held`,
    };
  if (day.action === "skip")
    return {
      icon: <CloudRain size={16} className="text-sky-700" />,
      label: "rain",
      bg: "bg-slate-100",
      tip: `Rain ≈ ${day.rainMm} mm — session skipped`,
    };
  return {
    icon: <CloudSun size={15} className="text-black/35" />,
    label: "—",
    bg: "bg-black/[0.04]",
    tip: `Reserve ~${day.moisturePct}% — no watering`,
  };
}

export default function IrrigationCard({ crop }) {
  const dayKey = useDayTick();
  const [weather, setWeather] = useState(null);
  const [weatherState, setWeatherState] = useState("loading"); // loading|ready|nolocation|error
  const [tab, setTab] = useState("week");
  const [helpOpen, setHelpOpen] = useState(false);
  const requestRef = useRef(0);

  // Own cached weather read (15-min TTL inside weatherService) — hourly=true
  // so the FAO ET0 field arrives for real evapotranspiration maths.
  useEffect(() => {
    if (!crop) return undefined;
    const requestId = ++requestRef.current;
    // Effect-driven data loading — same established pattern as
    // useTimelineDashboard (its reload() effect is flagged identically).
    /* eslint-disable react-hooks/set-state-in-effect */
    setWeatherState("loading");
    /* eslint-enable react-hooks/set-state-in-effect */
    fetchWeatherForCrop(crop, { forecastDays: 7, hourly: true })
      .then((w) => {
        if (requestRef.current !== requestId) return;
        setWeather(w);
        setWeatherState("ready");
      })
      .catch((err) => {
        if (requestRef.current !== requestId) return;
        setWeather(null);
        const missing =
          err?.code === WEATHER_ERROR_CODES.MISSING_COORDINATES ||
          err?.code === WEATHER_ERROR_CODES.INVALID_COORDINATES;
        setWeatherState(missing ? "nolocation" : "error");
      });
  }, [crop, dayKey]);

  // Midnight-safe clock: the day tick rebuilds this Date so the schedule is
  // recomputed (not just re-rendered) when the calendar day flips.
  const now = useMemo(() => {
    const [y, m, d] = dayKey.split("-").map(Number);
    return new Date(y, m - 1, d);
  }, [dayKey]);

  const schedule = useMemo(
    () => (crop ? buildIrrigationSchedule({ crop, weather, now }) : null),
    [crop, weather, now]
  );

  if (!crop) return null;

  const loading = weatherState === "loading";
  const moisture = schedule?.moistureNowPct ?? 0;
  const moistureTone =
    moisture > 55
      ? { bar: "bg-sky-500", text: "text-sky-700" }
      : moisture >= 35
        ? { bar: "bg-amber-400", text: "text-amber-600" }
        : { bar: "bg-red-400", text: "text-red-600" };

  return (
    <Card className="gap-3">
      <CardHeader className="pb-0">
        <CardTitle className="flex items-center gap-2 text-[15px]">
          <Droplets size={16} className="text-[var(--text1)]" />
          Smart Irrigation
          <Badge variant="secondary" className="ml-auto">
            {loading
              ? "Syncing weather…"
              : schedule?.baseline
                ? "Stage baseline"
                : "Live schedule"}
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            className="size-6 rounded-full text-black/50 hover:text-black"
            aria-label="How this schedule is built"
            onClick={() => setHelpOpen(true)}
          >
            <CircleHelp size={14} />
          </Button>
        </CardTitle>
      </CardHeader>

      <CardContent className="grid gap-2.5">
        {/* Recorded system + its planning parameters */}
        <div className={`${styles.rise} rounded-xl bg-[#D7E8C0]/50 px-3 py-2`}>
          <p className="text-[11px] font-bold uppercase text-[#526b55]">
            Irrigation System
          </p>
          <div className="flex items-center justify-between gap-2">
            <p className="text-[14px] font-semibold text-black">
              {crop.IrrigationType || (
                <span className="font-normal text-black/40">Not provided</span>
              )}
            </p>
            {schedule && (
              <span className="text-[11px] font-bold text-[#3f5f22]">
                {Math.round(schedule.system.efficiency * 100)}% efficient
              </span>
            )}
          </div>
          {schedule && (
            <p className="mt-0.5 text-[11px] text-black/55">
              Best window {schedule.system.window} · {schedule.system.windowNote}
            </p>
          )}
        </div>

        {loading && (
          <div className="grid gap-2">
            <Skeleton className="h-[72px] w-full rounded-xl" />
            <Skeleton className="h-8 w-full rounded-full" />
            <Skeleton className="h-[104px] w-full rounded-xl" />
          </div>
        )}

        {!loading && schedule && (
          <>
            {/* Honest disclosures first */}
            {weatherState === "nolocation" && (
              <p className="flex items-start gap-1.5 rounded-xl border border-dashed border-[var(--text1)]/40 px-3 py-2 text-[12px] leading-5 text-black/60">
                <MapPin size={14} className="mt-0.5 shrink-0 text-[var(--text1)]" />
                This crop has no field coordinates yet — add a GPS location to
                unlock rain-aware planning. Until then the schedule runs on
                stage-based baseline demand.
              </p>
            )}
            {weatherState === "error" && (
              <p className="flex items-start gap-1.5 rounded-xl border border-dashed border-amber-400/60 bg-amber-50 px-3 py-2 text-[12px] leading-5 text-amber-800">
                <Info size={14} className="mt-0.5 shrink-0" />
                Live weather could not be reached right now — showing the
                stage-based baseline schedule instead.
              </p>
            )}

            {/* Hero — next watering session */}
            <div
              className={`${styles.rise} relative overflow-hidden rounded-xl border border-sky-200 bg-sky-50 px-3 py-2.5`}
              style={{ animationDelay: "60ms" }}
            >
              <span className={styles.fall} style={{ left: "16%" }} />
              <span
                className={styles.fall}
                style={{ left: "52%", animationDelay: "0.9s" }}
              />
              <span
                className={styles.fall}
                style={{ left: "82%", animationDelay: "1.7s" }}
              />
              <div className="relative flex items-center gap-3">
                <span className="relative grid h-11 w-11 shrink-0 place-items-center">
                  <span className={styles.ripple} />
                  <span
                    className={styles.ripple}
                    style={{ animationDelay: "1.2s" }}
                  />
                  <span
                    className={`${styles.bob} relative grid h-11 w-11 place-items-center rounded-full bg-sky-100 text-sky-600`}
                  >
                    <Droplet size={20} />
                  </span>
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-sky-700">
                    Next watering · {schedule.stage.name}
                  </p>
                  {schedule.nextSession ? (
                    <>
                      <p className="truncate text-[15px] font-bold text-black">
                        {schedule.nextSession.isToday
                          ? "Today"
                          : formatDate(schedule.nextSession.date)}{" "}
                        · {schedule.nextSession.window}
                      </p>
                      <p className="text-[12px] text-black/60">
                        ≈ {schedule.nextSession.grossMm} mm (
                        {schedule.nextSession.grossMm} L/m²)
                        {schedule.nextSession.inDays > 0 &&
                          ` · in ${schedule.nextSession.inDays} day${schedule.nextSession.inDays === 1 ? "" : "s"}`}
                      </p>
                    </>
                  ) : (
                    <p className="text-[12px] leading-4 text-black/65">
                      {schedule.stage.notStarted
                        ? `Sowing starts in ${schedule.stage.daysUntil} day${schedule.stage.daysUntil === 1 ? "" : "s"} — watering begins after planting.`
                        : schedule.stage.complete
                          ? "Growth cycle complete — irrigation closed for this season."
                          : "No watering needed this week — rain and the soil reserve cover the crop."}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Root-zone water reserve gauge */}
            <div
              className={`${styles.rise} grid gap-1`}
              style={{ animationDelay: "120ms" }}
            >
              <div className="flex items-center justify-between text-[11px] font-semibold text-black/60">
                <span className="flex items-center gap-1">
                  <Waves size={12} className="text-sky-600" />
                  Root-zone water reserve
                </span>
                <span className={moistureTone.text}>{moisture}%</span>
              </div>
              <div className="relative h-2.5 overflow-hidden rounded-full bg-black/10">
                <div
                  className={`${styles.gaugeFill} absolute inset-y-0 left-0 rounded-full ${moistureTone.bar}`}
                  style={{ width: `${Math.max(moisture, 4)}%` }}
                />
              </div>
              <p className="text-[10px] leading-4 text-black/45">
                Simulated daily from ET₀, forecast rain and{" "}
                {schedule.soil.key ?? "default"} soil holding capacity (≈{" "}
                {schedule.capacityMm} mm readily available at{" "}
                {schedule.soil.rootDepthM} m rooting depth).
              </p>
            </div>

            {/* Week plan / stage need */}
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="w-full">
                <TabsTrigger value="week" className="flex-1">
                  <CalendarDays size={13} /> 7-Day Plan
                </TabsTrigger>
                <TabsTrigger value="stage" className="flex-1">
                  <Sprout size={13} /> Stage Need
                </TabsTrigger>
              </TabsList>

              <TabsContent value="week" className="grid gap-1.5">
                <div className="grid grid-cols-7 gap-1">
                  {schedule.days.map((day, i) => {
                    const meta = dayColumnMeta(day);
                    return (
                      <Tooltip key={day.date} content={meta.tip}>
                        <div
                          className={`${styles.rise} flex w-[42px] flex-col items-center gap-0.5 rounded-lg px-0.5 py-1.5 ${meta.bg} ${
                            day.isToday
                              ? "ring-2 ring-[var(--text1)]/50"
                              : ""
                          }`}
                          style={{ animationDelay: `${140 + i * 55}ms` }}
                        >
                          <span className="text-[9px] font-bold uppercase text-black/45">
                            {day.weekday}
                          </span>
                          <span className="text-[10px] font-semibold text-black/60">
                            {day.dayNum}
                          </span>
                          <span className="grid h-6 place-items-center">
                            {meta.icon}
                          </span>
                          <span className="text-[9px] font-bold text-black/70">
                            {meta.label}
                          </span>
                        </div>
                      </Tooltip>
                    );
                  })}
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-black/45">
                  <span className="flex items-center gap-1">
                    <Droplets size={11} className="text-sky-600" /> watering day
                  </span>
                  <span className="flex items-center gap-1">
                    <CloudRain size={11} className="text-sky-700" /> rain skip
                  </span>
                  <span className="flex items-center gap-1">
                    <CloudSun size={11} className="text-black/35" /> rest
                  </span>
                  <span className="ml-auto">
                    demand {schedule.totals.demandMm} mm/week
                  </span>
                </div>
              </TabsContent>

              <TabsContent value="stage" className="grid gap-1.5">
                {schedule.stage.stages.map((stage, i) => (
                  <div
                    key={stage.name}
                    className={`${styles.rise} flex items-center gap-2 rounded-lg px-2 py-1.5 ${
                      stage.current
                        ? "bg-[#D7E8C0]/60 ring-1 ring-[var(--text1)]/40"
                        : "bg-black/[0.03]"
                    }`}
                    style={{ animationDelay: `${i * 70}ms` }}
                  >
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${
                        stage.current
                          ? `bg-[var(--text1)] ${styles.pulseDot}`
                          : "bg-black/20"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="truncate text-[12px] font-semibold text-black">
                          {stage.name}
                        </p>
                        <p className="shrink-0 text-[10px] text-black/50">
                          Day {stage.fromDay}–{stage.toDay}
                        </p>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-black/10">
                        <div
                          className={`${styles.grow} h-full rounded-full bg-[var(--text1)]/70`}
                          style={{
                            width: `${Math.min((stage.kc / 1.3) * 100, 100)}%`,
                            animationDelay: `${i * 90}ms`,
                          }}
                        />
                      </div>
                    </div>
                    <span className="w-12 shrink-0 text-right text-[10px] font-bold text-black/60">
                      Kc {stage.kc}
                    </span>
                  </div>
                ))}
                <p className="text-[10px] leading-4 text-black/45">
                  Daily crop demand = Kc × ET₀ — the bar shows each stage's
                  crop coefficient; demand peaks mid-season{schedule.stage.perennial ? " (season-driven for fruit trees)" : ""}.
                </p>
              </TabsContent>
            </Tabs>

            {/* Live weather adjustments */}
            {schedule.notes.length > 0 && (
              <div className="grid gap-1.5">
                {schedule.notes.map((note, i) => (
                  <p
                    key={note.kind}
                    className={`${styles.slideIn} flex items-start gap-1.5 rounded-lg px-2 py-1.5 text-[11px] leading-4 ${NOTE_STYLES[note.kind] ?? "bg-black/[0.04] text-black/60"}`}
                    style={{ animationDelay: `${i * 80}ms` }}
                  >
                    {NOTE_ICONS[note.kind]}
                    <span>{note.text}</span>
                  </p>
                ))}
              </div>
            )}

            {/* Weekly totals */}
            <div
              className={`${styles.rise} flex items-center justify-between gap-2 rounded-xl bg-black/[0.04] px-3 py-2 text-[11px] font-semibold text-black/60`}
              style={{ animationDelay: "200ms" }}
            >
              <span className="flex items-center gap-1">
                <Droplets size={12} className="text-sky-600" />
                {schedule.totals.waterDays} watering day
                {schedule.totals.waterDays === 1 ? "" : "s"}
              </span>
              <span>≈ {schedule.totals.weeklyMm} mm/week</span>
              <span className="flex items-center gap-1">
                <CloudRain size={12} className="text-sky-700" />
                {schedule.totals.rainMm} mm rain
              </span>
            </div>
            <p className="text-[10px] text-black/40">
              FAO-56 Kc method · live Open-Meteo weather · recalculates daily ·
              never writes to your crop data
            </p>
          </>
        )}
      </CardContent>

      {/* Methodology dialog */}
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent onClose={() => setHelpOpen(false)}>
          <DialogHeader>
            <DialogTitle>How this schedule is built</DialogTitle>
            <DialogDescription>
              Every number on the card comes from your recorded crop data plus
              live local weather — the plan is recomputed on every visit and
              at midnight.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <ol className="grid list-decimal gap-2 pl-4 text-[13px] leading-5 text-black/70">
              <li>
                <strong>Stage</strong> — the growth stage follows the sowing
                date live through FAO growth stages (establishment →
                vegetative → flowering → ripening); each stage carries a crop
                coefficient (Kc).
              </li>
              <li>
                <strong>Demand</strong> — daily crop water need = Kc × ET₀,
                the FAO evapotranspiration for your exact field coordinates.
              </li>
              <li>
                <strong>Soil bucket</strong> — a root-zone reserve (soil type
                × rooting depth) drains by demand and refills with effective
                rain; a watering day triggers below ~35% reserve.
              </li>
              <li>
                <strong>System</strong> — the net volume is grossed up by your
                irrigation system's field efficiency: Drip 90%, Sprinkler 75%,
                Flood 60%, and paired with its best watering window.
              </li>
              <li>
                <strong>Weather overrides</strong> — ≥5 mm rain skips a
                session, frost nights hold irrigation, heatwaves move
                watering to dawn with +10% volume, windy days shift sprinkler
                passes to the calm evening.
              </li>
            </ol>
            <p className="text-[12px] leading-5 text-black/50">
              Without a GPS location or when the weather service is
              unreachable, the card honestly falls back to a stage-based
              baseline demand and says so on the card.
            </p>
          </DialogBody>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
