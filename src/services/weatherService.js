// =============================================================================
// Weather service — Open-Meteo integration for agricultural context.
//
// DESIGN DECISIONS:
//  - Open-Meteo is keyless: no API secrets exist or need protecting.
//  - Pure service module — no UI coupling. Consumed later by the dashboard
//    weather card, irrigation planning, AI context builder, timeline review.
//  - Returns FACTS, not decisions. Rainfall signals are contextual info
//    ("28mm expected in 48h"), never directives ("skip irrigation").
//  - In-memory TTL cache: re-renders within 15 min don't hit the API again.
//  - Every failure throws a WeatherError with a stable code so callers can
//    render honest "unknown" states instead of fake data.
// =============================================================================

import { getGpsLocation } from "../lib/cropUtils.js";

const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";
const REQUEST_TIMEOUT_MS = 10_000;
const DEFAULT_FORECAST_DAYS = 7;
const CACHE_TTL_MS = 15 * 60 * 1000;
// The forecast page only ever renders the next 48 hours of hourly data.
const HOURLY_WINDOW_HOURS = 48;

// Informational rainfall thresholds (mm/day) — context, never decisions.
export const RAIN_MM_TRACE = 1; // a "rain day"
export const RAIN_MM_SIGNIFICANT = 5; // worth reviewing field operations

export const WEATHER_ERROR_CODES = {
  MISSING_COORDINATES: "MISSING_COORDINATES",
  INVALID_COORDINATES: "INVALID_COORDINATES",
  API_ERROR: "API_ERROR",
  TIMEOUT: "TIMEOUT",
  UNAVAILABLE: "UNAVAILABLE",
};

export class WeatherError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "WeatherError";
    this.code = code;
  }
}

// -----------------------------------------------------------------------------
// WMO weather interpretation codes used by Open-Meteo
// -----------------------------------------------------------------------------

const WEATHER_CODE_DESCRIPTIONS = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  56: "Light freezing drizzle",
  57: "Dense freezing drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  66: "Light freezing rain",
  67: "Heavy freezing rain",
  71: "Slight snowfall",
  73: "Moderate snowfall",
  75: "Heavy snowfall",
  77: "Snow grains",
  80: "Slight rain showers",
  81: "Moderate rain showers",
  82: "Violent rain showers",
  85: "Slight snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with slight hail",
  99: "Thunderstorm with heavy hail",
};

const RAIN_CODES = new Set([
  51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99,
]);

export function describeWeatherCode(code) {
  return WEATHER_CODE_DESCRIPTIONS[code] ?? "Unknown conditions";
}

export function isRainCode(code) {
  return RAIN_CODES.has(Number(code));
}

// -----------------------------------------------------------------------------
// Validation
// -----------------------------------------------------------------------------

function assertCoordinates(latitude, longitude) {
  // Empty/blank strings must count as missing (Number("") === 0 pitfall).
  const isEmpty = (v) =>
    v === null ||
    v === undefined ||
    (typeof v === "string" && v.trim() === "");

  if (isEmpty(latitude) || isEmpty(longitude)) {
    throw new WeatherError(
      WEATHER_ERROR_CODES.MISSING_COORDINATES,
      "Crop coordinates are missing. Add a field location to this crop first."
    );
  }

  const lat = Number(latitude);
  const lon = Number(longitude);

  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    throw new WeatherError(
      WEATHER_ERROR_CODES.MISSING_COORDINATES,
      "Crop coordinates are missing. Add a field location to this crop first."
    );
  }
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    throw new WeatherError(
      WEATHER_ERROR_CODES.INVALID_COORDINATES,
      `Coordinates (${latitude}, ${longitude}) are outside valid range.`
    );
  }
  return { lat, lon };
}

// -----------------------------------------------------------------------------
// In-memory cache (module scope) — keyed on a ~1km grid
// -----------------------------------------------------------------------------

const cache = new Map();

function cacheKey(lat, lon, days, hourly) {
  return `${lat.toFixed(2)},${lon.toFixed(2)},${days},${hourly ? 1 : 0}`;
}

export function clearWeatherCache() {
  cache.clear();
}

// -----------------------------------------------------------------------------
// Fetch + normalization
// -----------------------------------------------------------------------------

async function requestOpenMeteo(lat, lon, forecastDays, hourly = false) {
  // Only request fields the UI actually renders. Hourly data is opt-in so
  // lightweight consumers (dashboard card, AI context) keep small payloads.
  const current = [
    "temperature_2m",
    "relative_humidity_2m",
    "precipitation",
    "weather_code",
    "wind_speed_10m",
    "is_day",
  ];
  const daily = [
    "temperature_2m_max",
    "temperature_2m_min",
    "precipitation_sum",
    "precipitation_probability_max",
    "weather_code",
    "wind_speed_10m_max",
  ];
  if (hourly) {
    current.push(
      "apparent_temperature",
      "surface_pressure",
      "cloud_cover",
      "wind_direction_10m"
    );
    daily.push(
      "sunrise",
      "sunset",
      "wind_direction_10m_dominant",
      "uv_index_max",
      "et0_fao_evapotranspiration",
      "daylight_duration",
      "sunshine_duration"
    );
  }

  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: current.join(","),
    daily: daily.join(","),
    timezone: "auto",
    forecast_days: String(forecastDays),
  });
  if (hourly) {
    params.set(
      "hourly",
      [
        "temperature_2m",
        "apparent_temperature",
        "precipitation_probability",
        "precipitation",
        "relative_humidity_2m",
        "wind_speed_10m",
        "wind_direction_10m",
        "cloud_cover",
        "weather_code",
        "is_day",
        "dew_point_2m",
        "soil_moisture_0_to_1cm",
        "soil_temperature_0cm",
      ].join(",")
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(`${OPEN_METEO_URL}?${params}`, {
      signal: controller.signal,
    });
  } catch (err) {
    if (err?.name === "AbortError") {
      throw new WeatherError(
        WEATHER_ERROR_CODES.TIMEOUT,
        `Weather request timed out after ${REQUEST_TIMEOUT_MS / 1000}s.`
      );
    }
    throw new WeatherError(
      WEATHER_ERROR_CODES.API_ERROR,
      "Could not reach the weather service. Check the network connection."
    );
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    let reason = `Weather service returned HTTP ${response.status}.`;
    try {
      const body = await response.json();
      if (body?.reason) reason = body.reason;
    } catch {
      /* non-JSON error body — keep default reason */
    }
    throw new WeatherError(WEATHER_ERROR_CODES.API_ERROR, reason);
  }

  return response.json();
}

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeWeather(raw, lat, lon, hourly = false) {
  if (!raw?.current || !Array.isArray(raw?.daily?.time)) {
    throw new WeatherError(
      WEATHER_ERROR_CODES.UNAVAILABLE,
      "Weather forecast is unavailable for this location right now."
    );
  }

  const c = raw.current;
  const d = raw.daily;

  const daily = d.time.map((date, i) => {
    const precipitationSumMm = num(d.precipitation_sum?.[i]);
    const weatherCode = num(d.weather_code?.[i]);
    return {
      date,
      tempMaxC: num(d.temperature_2m_max?.[i]),
      tempMinC: num(d.temperature_2m_min?.[i]),
      precipitationSumMm,
      precipitationProbabilityMaxPercent: num(
        d.precipitation_probability_max?.[i]
      ),
      windSpeedMaxKmh: num(d.wind_speed_10m_max?.[i]),
      windDirectionDominantDeg: num(d.wind_direction_10m_dominant?.[i]),
      uvIndexMax: num(d.uv_index_max?.[i]),
      et0Mm: num(d.et0_fao_evapotranspiration?.[i]),
      daylightHours: secToHours(d.daylight_duration?.[i]),
      sunshineHours: secToHours(d.sunshine_duration?.[i]),
      sunrise: typeof d.sunrise?.[i] === "string" ? d.sunrise[i] : null,
      sunset: typeof d.sunset?.[i] === "string" ? d.sunset[i] : null,
      weatherCode,
      condition: describeWeatherCode(weatherCode),
      isRainExpected:
        isRainCode(weatherCode) ||
        (precipitationSumMm !== null && precipitationSumMm >= RAIN_MM_TRACE),
    };
  });

  const next48h = daily.slice(0, 2);
  const rainDays = daily.filter((day) => day.isRainExpected);
  const significantRainDays = daily.filter(
    (day) =>
      day.precipitationSumMm !== null &&
      day.precipitationSumMm >= RAIN_MM_SIGNIFICANT
  );

  return {
    source: "open-meteo",
    fetchedAt: new Date().toISOString(),
    timezone: raw.timezone ?? null,
    coordinates: { lat, lon },
    current: {
      temperatureC: num(c.temperature_2m),
      apparentTemperatureC: num(c.apparent_temperature),
      humidityPercent: num(c.relative_humidity_2m),
      precipitationMm: num(c.precipitation),
      windSpeedKmh: num(c.wind_speed_10m),
      windDirectionDeg: num(c.wind_direction_10m),
      pressureHpa: num(c.surface_pressure),
      cloudCoverPercent: num(c.cloud_cover),
      weatherCode: num(c.weather_code),
      condition: describeWeatherCode(c.weather_code),
      isDay: c.is_day === 1,
    },
    daily,
    hourly: hourly ? normalizeHourly(raw) : [],
    // Contextual signals only — facts for AI/planning to interpret,
    // never automated irrigation/skipping decisions.
    context: {
      next48hExpectedRainfallMm: round1(
        next48h.reduce(
          (sum, day) => sum + (day.precipitationSumMm ?? 0),
          0
        )
      ),
      expectedRainDays: rainDays.map((day) => day.date),
      significantRainDays: significantRainDays.map((day) => day.date),
      rainExpectedSoon: rainDays.length > 0,
      significantRainfallExpected: significantRainDays.length > 0,
    },
  };
}

// Hourly entries are only present when requested (options.hourly). Times are
// location-local ISO strings (timezone=auto); we start the window at the
// current local hour and cap it so the page never renders a huge dataset.
function normalizeHourly(raw) {
  const times = raw?.hourly?.time;
  if (!Array.isArray(times) || times.length === 0) return [];

  const h = raw.hourly;
  const nowLocal =
    typeof raw?.current?.time === "string" ? raw.current.time : null;
  let start = 0;
  if (nowLocal) {
    const idx = times.findIndex((t) => t >= nowLocal);
    start = idx === -1 ? 0 : idx;
  }

  return times.slice(start, start + HOURLY_WINDOW_HOURS).map((time, slice) => {
    const i = start + slice;
    const weatherCode = num(h.weather_code?.[i]);
    return {
      time,
      temperatureC: num(h.temperature_2m?.[i]),
      apparentTemperatureC: num(h.apparent_temperature?.[i]),
      precipitationProbabilityPercent: num(h.precipitation_probability?.[i]),
      precipitationMm: num(h.precipitation?.[i]),
      humidityPercent: num(h.relative_humidity_2m?.[i]),
      windSpeedKmh: num(h.wind_speed_10m?.[i]),
      windDirectionDeg: num(h.wind_direction_10m?.[i]),
      cloudCoverPercent: num(h.cloud_cover?.[i]),
      dewPointC: num(h.dew_point_2m?.[i]),
      soilMoistureM3m3: num(h.soil_moisture_0_to_1cm?.[i]),
      soilTemperatureC: num(h.soil_temperature_0cm?.[i]),
      weatherCode,
      condition: describeWeatherCode(weatherCode),
      isDay: h.is_day?.[i] === 1,
    };
  });
}

function round1(value) {
  return Math.round(value * 10) / 10;
}

// Open-Meteo returns daylight/sunshine durations in seconds.
function secToHours(value) {
  const n = num(value);
  return n === null ? null : round1(n / 3600);
}

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

/**
 * Fetches normalized weather for explicit coordinates.
 * Throws WeatherError (MISSING_COORDINATES | INVALID_COORDINATES | API_ERROR |
 * TIMEOUT | UNAVAILABLE) — callers should catch and render unknown states.
 */
export async function fetchWeather(latitude, longitude, options = {}) {
  const { lat, lon } = assertCoordinates(latitude, longitude);
  const forecastDays = Math.min(
    Math.max(Number(options.forecastDays ?? DEFAULT_FORECAST_DAYS) || 7, 1),
    14
  );
  const hourly = options.hourly === true;

  const key = cacheKey(lat, lon, forecastDays, hourly);
  if (options.useCache !== false) {
    const hit = cache.get(key);
    if (hit && hit.expiresAt > Date.now()) return hit.data;
  }

  const raw = await requestOpenMeteo(lat, lon, forecastDays, hourly);
  const weather = normalizeWeather(raw, lat, lon, hourly);

  cache.set(key, { data: weather, expiresAt: Date.now() + CACHE_TTL_MS });
  // Guard against unbounded growth across many crops/fields.
  if (cache.size > 100) {
    const oldest = cache.keys().next().value;
    cache.delete(oldest);
  }

  return weather;
}

/**
 * Convenience wrapper for an existing crop entry — reuses the project's
 * getGpsLocation() normalization, so stored `gpsLocation` shape quirks are
 * handled in one place.
 */
export async function fetchWeatherForCrop(cropEntry, options = {}) {
  const location = getGpsLocation(cropEntry);
  if (!location) {
    throw new WeatherError(
      WEATHER_ERROR_CODES.MISSING_COORDINATES,
      "This crop has no GPS location. Add field coordinates to see weather."
    );
  }
  return fetchWeather(location.lat, location.lon, options);
}
