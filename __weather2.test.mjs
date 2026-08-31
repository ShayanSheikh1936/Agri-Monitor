// Temporary verification for the added weather fields/features.
import assert from "node:assert";

const utils = await import("./src/lib/weatherUtils.js");

// UV bands
assert.equal(utils.uvLevel(1).label, "Low");
assert.equal(utils.uvLevel(4).label, "Moderate");
assert.equal(utils.uvLevel(7).label, "High");
assert.equal(utils.uvLevel(9).label, "Very high");
assert.equal(utils.uvLevel(12).label, "Extreme");
assert.equal(utils.uvLevel(null), null);

// Highlights
const weather = {
  daily: [
    { date: "2026-08-29", tempMaxC: 34, precipitationSumMm: 0, windSpeedMaxKmh: 12, uvIndexMax: 6 },
    { date: "2026-08-30", tempMaxC: 38, precipitationSumMm: 8, windSpeedMaxKmh: 30, uvIndexMax: 9 },
    { date: "2026-08-31", tempMaxC: 33, precipitationSumMm: 0, windSpeedMaxKmh: 10, uvIndexMax: 5 },
  ],
  hourly: Array.from({ length: 30 }, (_, i) => ({
    soilMoistureM3m3: 0.25, soilTemperatureC: 26, dewPointC: 20 - i * 0,
  })),
};
const hl = utils.computeForecastHighlights(weather);
assert.deepEqual(hl.hottest, { date: "2026-08-30", label: "38°C" });
assert.deepEqual(hl.wettest, { date: "2026-08-30", label: "8mm" });
assert.deepEqual(hl.windiest, { date: "2026-08-30", label: "30 km/h" });
assert.deepEqual(hl.highestUv, { date: "2026-08-30", label: "9 UV" });
assert.equal(utils.next24hAverage(weather, "soilMoistureM3m3"), 0.25);
console.log("NEW UTILS: PASS");

// Service normalization of the new fields (mocked fetch)
globalThis.fetch = async () => ({
  ok: true,
  json: async () => ({
    timezone: "auto",
    current: { time: "2026-08-29T12:00", temperature_2m: 30, relative_humidity_2m: 60, precipitation: 0, weather_code: 1, wind_speed_10m: 8, is_day: 1, apparent_temperature: 31, surface_pressure: 1000, cloud_cover: 20, wind_direction_10m: 90 },
    daily: {
      time: ["2026-08-29"],
      temperature_2m_max: [34], temperature_2m_min: [24],
      precipitation_sum: [0], precipitation_probability_max: [10],
      weather_code: [1], wind_speed_10m_max: [12],
      sunrise: ["2026-08-29T05:50"], sunset: ["2026-08-29T18:45"],
      wind_direction_10m_dominant: [90],
      uv_index_max: [8.4], et0_fao_evapotranspiration: [5.2],
      daylight_duration: [46500], sunshine_duration: [41400],
    },
    hourly: {
      time: ["2026-08-29T12:00", "2026-08-29T13:00"],
      temperature_2m: [30, 31], apparent_temperature: [31, 32],
      precipitation_probability: [5, 5], precipitation: [0, 0],
      relative_humidity_2m: [60, 58], wind_speed_10m: [8, 9],
      wind_direction_10m: [90, 95], cloud_cover: [20, 25],
      weather_code: [1, 1], is_day: [1, 1],
      dew_point_2m: [21, 21.4],
      soil_moisture_0_to_1cm: [0.24, 0.23], soil_temperature_0cm: [27, 27.5],
    },
  }),
});

const svc = await import("./src/services/weatherService.js");
svc.clearWeatherCache();
const w = await svc.fetchWeather(31.5, 74.3, { forecastDays: 1, hourly: true });
assert.equal(w.daily[0].uvIndexMax, 8.4);
assert.equal(w.daily[0].et0Mm, 5.2);
assert.equal(w.daily[0].daylightHours, 12.9); // 46500s / 3600
assert.equal(w.daily[0].sunshineHours, 11.5);
assert.equal(w.hourly[0].dewPointC, 21);
assert.equal(w.hourly[0].soilMoistureM3m3, 0.24);
assert.equal(w.hourly[0].soilTemperatureC, 27);
// non-hourly consumers don't get these fields requested/normalized
svc.clearWeatherCache();
let urlSeen = null;
globalThis.fetch = async (url) => {
  urlSeen = String(url);
  return { ok: true, json: async () => ({
    current: { time: "2026-08-29T12:00", temperature_2m: 30, relative_humidity_2m: 60, precipitation: 0, weather_code: 1, wind_speed_10m: 8, is_day: 1 },
    daily: { time: ["2026-08-29"], temperature_2m_max: [34], temperature_2m_min: [24], precipitation_sum: [0], precipitation_probability_max: [10], weather_code: [1], wind_speed_10m_max: [12] },
  }) };
};
const w2 = await svc.fetchWeather(31.5, 74.3, { forecastDays: 1 });
assert.ok(!urlSeen.includes("uv_index_max")); // payload stays small
assert.equal(w2.daily[0].uvIndexMax, null);
console.log("NEW SERVICE FIELDS: PASS");
console.log("WEATHER UPGRADE: ALL PASS");
