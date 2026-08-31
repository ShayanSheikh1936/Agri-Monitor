import { createElement, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { RefreshCw, MapPin, Plus, CloudOff, LocateOff } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { WEATHER_ERROR_CODES } from "@/services/weatherService";
import { getWeatherIcon } from "@/lib/weatherUtils";
import useWeatherPage from "./weather/useWeatherPage";
import ForecastHighlights from "./weather/ForecastHighlights";
import CurrentConditions from "./weather/CurrentConditions";
import HourlyForecast from "./weather/HourlyForecast";
import DailyForecast from "./weather/DailyForecast";
import { RainfallChart, TemperatureChart } from "./weather/TrendCharts";
import { WindCard, HumidityCard, SunCycleCard, UvSunCard, SoilCard } from "./weather/EnvironmentCards";
import AgriGuidance from "./weather/AgriGuidance";

function PageState({ icon: Icon, title, children, action }) {
  return (
    <div className="flex-6 grid place-items-center h-screen px-4">
      <div className="max-w-[420px] w-full text-center grid gap-3 justify-items-center">
        <Icon size={40} className="text-[var(--text1)]" />
        <h2 className="text-xl font-bold text-black">{title}</h2>
        <div className="text-[13px] text-black/60 leading-5">{children}</div>
        {action}
      </div>
    </div>
  );
}

// Weather Forecast page — live Open-Meteo intelligence for the user's real
// crop locations. Read-only: nothing here writes to Firestore, and weather is
// never stored — only an in-memory 15-minute cache inside weatherService.
export default function WeatherForecastPage() {
  const { userData, userCropData } = useOutletContext();
  const page = useWeatherPage(userCropData?.crops);
  // Day-detail pick is stored with the crop it belongs to, so switching crops
  // automatically falls back to the new crop's first day (no effect needed).
  const [dayPick, setDayPick] = useState({ cropKey: null, date: null });
  const selectedDate =
    dayPick.cropKey === page.selectedKey ? dayPick.date : null;

  const cropsLoading = userCropData === undefined || userCropData === null;
  const { weather, errorCode } = page;

  // ---- Empty / unavailable states (never fake data) ------------------------

  if (cropsLoading) {
    return (
      <div className="flex-6 h-screen overflow-y-auto p-4 grid gap-3 content-start">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-60 w-full" />
      </div>
    );
  }

  if (page.crops.length === 0) {
    return (
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
        Add a crop first — the forecast is tied to your crop's field location.
      </PageState>
    );
  }

  if (page.withGps.length === 0) {
    return (
      <PageState icon={LocateOff} title="Location unavailable">
        <p>
          None of your crops has GPS coordinates, so there is no field location
          to forecast for. Coordinates are never invented.
        </p>
        {userData?.personaluser?.City ? (
          <p className="mt-1">
            Your profile lists <b>{userData.personaluser.City}</b>, but a text
            address cannot be safely resolved to coordinates here. Add a field
            location to a crop via Add New Crop.
          </p>
        ) : null}
        <Link
          to="/dashboard/addnewcrop"
          className="capitalize bg-[#679936] rounded-2xl px-3 py-2 text-[var(--text-h)] transition-colors hover:bg-[#4a7028] flex items-center gap-2"
        >
          <Plus size={16} /> add crop with location
        </Link>
      </PageState>
    );
  }

  // ---- Main page ------------------------------------------------------------

  const CurrentIcon = weather
    ? getWeatherIcon(weather.current?.weatherCode, weather.current?.isDay)
    : null;

  return (
    <div className="scrollbar-thin scrollbar-thumb-[#679936] scrollbar-track-[#F2DEC4] flex-6 h-screen overflow-y-auto overflow-x-hidden p-3 sm:p-4">
      <div className="w-full max-w-[1280px] mx-auto grid gap-3 content-start min-w-0">
      {/* 1. Header: crop selector, location, current conditions, refresh */}
      <Card className="min-w-0">
        <CardContent className="grid gap-3">
          {/* Crop selector — every crop shown; ones without GPS are disabled */}
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
                      ? `Show weather for ${entry.crop.CropName || "this crop"}`
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

          {/* Current snapshot row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 justify-between">
            <div className="flex items-center gap-3">
              {page.loading ? (
                <Skeleton className="w-14 h-14 rounded-2xl" />
              ) : CurrentIcon && weather?.current ? (
                createElement(CurrentIcon, { size: 44, className: "text-[#3b6d1f]" })
              ) : (
                <CloudOff size={44} className="text-black/30" />
              )}
              <div>
                <p className="text-2xl font-bold text-black leading-none">
                  {page.loading ? (
                    <Skeleton className="h-7 w-20" />
                  ) : weather?.current?.temperatureC !== null && weather?.current?.temperatureC !== undefined ? (
                    `${Math.round(weather.current.temperatureC)}°C`
                  ) : (
                    "—"
                  )}
                  {weather?.current?.condition ? (
                    <span className="ml-2 text-[14px] font-semibold text-black/60">
                      {weather.current.condition}
                    </span>
                  ) : null}
                </p>
                <p className="text-[12px] text-black/55 mt-1">
                  {weather?.current?.apparentTemperatureC !== null &&
                  weather?.current?.apparentTemperatureC !== undefined
                    ? `Feels like ${Math.round(weather.current.apparentTemperatureC)}°C · `
                    : ""}
                  {new Date().toLocaleDateString(undefined, {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>

            <div className="flex flex-col items-end gap-1">
              <button
                type="button"
                onClick={page.refresh}
                disabled={page.loading || page.refreshing}
                aria-label="Refresh weather"
                className="flex items-center gap-1.5 rounded-xl bg-[var(--text1)] px-3 py-1.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#4a7028] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw size={14} className={page.refreshing ? "animate-spin" : ""} />
                {page.refreshing ? "Refreshing..." : "Refresh"}
              </button>
              <p className="flex items-center gap-1 text-[11px] text-black/45">
                <MapPin size={11} />
                {page.selected?.gps
                  ? `${page.selected.gps.lat.toFixed(3)}, ${page.selected.gps.lon.toFixed(3)}`
                  : ""}
                {weather?.fetchedAt
                  ? ` · updated ${new Date(weather.fetchedAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}`
                  : ""}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API failure / timeout / invalid response states */}
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
          <Skeleton className="h-60 w-full" />
        </>
      ) : weather ? (
        <>
          <ForecastHighlights weather={weather} />
          <CurrentConditions weather={weather} />
          <AgriGuidance weather={weather} crop={page.selected?.crop ?? null} />
          <HourlyForecast hourly={weather.hourly} />
          <DailyForecast
            daily={weather.daily}
            hourly={weather.hourly}
            selectedDate={selectedDate}
            onSelect={(date) => setDayPick({ cropKey: page.selectedKey, date })}
          />
          <div className="grid gap-3 lg:grid-cols-2 min-w-0">
            <div className="min-w-0"><RainfallChart daily={weather.daily} /></div>
            <div className="min-w-0"><TemperatureChart daily={weather.daily} /></div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 min-w-0">
            <WindCard weather={weather} />
            <HumidityCard weather={weather} />
            <SunCycleCard weather={weather} selectedDate={selectedDate} />
            <UvSunCard weather={weather} />
            <SoilCard weather={weather} />
          </div>
          <p className="text-[11px] text-black/40 pb-2">
            Weather data by Qoder for{" "}
            {page.selected?.gps
              ? `${page.selected.gps.lat.toFixed(3)}, ${page.selected.gps.lon.toFixed(3)}`
              : "your field location"}
            . Forecasts are decision support — always combine them with your own
            field observations.
            {page.selected?.crop?.CropName ? (
              <Badge variant="secondary" className="ml-1 capitalize">
                {page.selected.crop.CropName}
              </Badge>
            ) : null}
          </p>
        </>
      ) : null}
      </div>
    </div>
  );
}
