// Temporary verification for the weather alert rules engine.
import assert from "node:assert";

const { detectWeatherAlerts, ALERT_TYPES, ALERT_SEVERITY } = await import(
  "./src/lib/alertRules.js"
);

const today = new Date();
const iso = (offset) => {
  const d = new Date(today);
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// ---- Severe scenario: storm code, heavy rain, heat, strong wind ------------
const severe = {
  source: "open-meteo",
  current: { temperatureC: 30, humidityPercent: 60, windSpeedKmh: 10, weatherCode: 95 },
  daily: [
    { date: iso(0), tempMaxC: 41, tempMinC: 24, precipitationSumMm: 30, precipitationProbabilityMaxPercent: 92, windSpeedMaxKmh: 55, weatherCode: 95, uvIndexMax: 9, et0Mm: 6.2 },
    { date: iso(1), tempMaxC: 33, tempMinC: 2, precipitationSumMm: 2, precipitationProbabilityMaxPercent: 30, windSpeedMaxKmh: 12, weatherCode: 2, uvIndexMax: 5, et0Mm: 4.1 },
  ],
  hourly: Array.from({ length: 24 }, (_, i) => ({
    time: `${iso(0)}T${String(i).padStart(2, "0")}:00`,
    precipitationProbabilityPercent: i < 6 ? 90 : 10,
    humidityPercent: 88,
    temperatureC: 30 + (i < 4 ? 9 : 0),
  })),
};

const found = detectWeatherAlerts(severe, "crop-1", { CropName: "Wheat" });
const types = new Set(found.map((a) => a.alertType));
assert.ok(types.has(ALERT_TYPES.SEVERE_WEATHER), "severe weather code detected");
assert.ok(types.has(ALERT_TYPES.HEAVY_RAIN), "heavy rain detected");
assert.ok(types.has(ALERT_TYPES.EXTREME_HEAT), "extreme heat detected");
assert.ok(types.has(ALERT_TYPES.STRONG_WIND), "strong wind detected");
assert.ok(types.has(ALERT_TYPES.HIGH_RAIN_PROBABILITY), "rain probability detected");
assert.ok(types.has(ALERT_TYPES.HIGH_HUMIDITY), "humidity monitoring alert");
assert.ok(types.has(ALERT_TYPES.COLD_FROST), "cold stress detected for tomorrow min 2C");
assert.ok(types.has(ALERT_TYPES.UV_RISK), "uv risk detected");

const storm = found.find((a) => a.alertType === ALERT_TYPES.SEVERE_WEATHER);
assert.equal(storm.severity, ALERT_SEVERITY.CRITICAL);
assert.ok(storm.message.includes("Wheat"), "crop context present in message");
assert.ok(!/skip irrigation|apply pesticide|dosage/i.test(storm.message), "no directives");

// Dedupe ids are stable + scoped: same input twice -> same ids; different crop -> different ids.
const ids1 = found.map((a) => a.id).sort();
const ids2 = detectWeatherAlerts(severe, "crop-1", { CropName: "Wheat" }).map((a) => a.id).sort();
assert.deepEqual(ids1, ids2, "detection ids are deterministic");
const otherCropIds = detectWeatherAlerts(severe, "crop-2").map((a) => a.id);
assert.ok(otherCropIds.every((id) => !ids1.includes(id)), "ids scoped per crop");
assert.ok(ids1.every((id) => id.startsWith("crop-1:")), "id format crop:type:window");

// ---- Calm scenario: no fabricated alerts -----------------------------------
const calm = {
  source: "open-meteo",
  current: { temperatureC: 24, humidityPercent: 55, windSpeedKmh: 6, weatherCode: 1 },
  daily: [
    { date: iso(0), tempMaxC: 27, tempMinC: 18, precipitationSumMm: 0, precipitationProbabilityMaxPercent: 10, windSpeedMaxKmh: 9, weatherCode: 1, uvIndexMax: 5, et0Mm: 3.5 },
    { date: iso(1), tempMaxC: 26, tempMinC: 17, precipitationSumMm: 1, precipitationProbabilityMaxPercent: 20, windSpeedMaxKmh: 10, weatherCode: 2, uvIndexMax: 4, et0Mm: 3.2 },
  ],
  hourly: Array.from({ length: 24 }, (_, i) => ({
    time: `${iso(0)}T${String(i).padStart(2, "0")}:00`,
    precipitationProbabilityPercent: 10,
    humidityPercent: 55,
    temperatureC: 24,
  })),
};
assert.equal(detectWeatherAlerts(calm, "crop-1").length, 0, "calm weather yields no alerts");

// ---- Missing/empty data never throws ---------------------------------------
assert.deepEqual(detectWeatherAlerts(null, "crop-1"), []);
assert.deepEqual(detectWeatherAlerts({ daily: [], hourly: [] }, ""), []);

console.log("ALERT RULES: PASS");
