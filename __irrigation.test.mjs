// Sanity checks for the smart irrigation scheduler (run: node __irrigation.test.mjs)
import assert from "node:assert/strict";
import {
  buildIrrigationSchedule,
  resolveCropStage,
} from "./src/services/irrigationScheduler.js";

const NOW = new Date(2026, 8, 3); // 3 Sep 2026
const iso = (offset) => {
  const d = new Date(NOW);
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const crop = {
  CropName: "Wheat",
  CropCategory: "Grain",
  SowingDate: iso(-60),
  SoilType: "Loamy",
  IrrigationType: "Drip",
  gpsLocation: { lat: 31.5, lon: 74.3 },
};

const weather = {
  daily: [
    { date: iso(0), tempMaxC: 33, tempMinC: 24, precipitationSumMm: 0, windSpeedMaxKmh: 8, et0Mm: 5.2 },
    { date: iso(1), tempMaxC: 34, tempMinC: 25, precipitationSumMm: 0, windSpeedMaxKmh: 10, et0Mm: 5.4 },
    { date: iso(2), tempMaxC: 31, tempMinC: 23, precipitationSumMm: 12, windSpeedMaxKmh: 12, et0Mm: 4.6 },
    { date: iso(3), tempMaxC: 36, tempMinC: 26, precipitationSumMm: 0, windSpeedMaxKmh: 9, et0Mm: 6.1 },
    { date: iso(4), tempMaxC: 30, tempMinC: 1, windSpeedMaxKmh: 7, precipitationSumMm: 0, et0Mm: 3.8 },
    { date: iso(5), tempMaxC: 29, tempMinC: 21, precipitationSumMm: 1, windSpeedMaxKmh: 30, et0Mm: 4.1 },
    { date: iso(6), tempMaxC: 32, tempMinC: 22, precipitationSumMm: 0, windSpeedMaxKmh: 11, et0Mm: 5.0 },
  ],
};

// 1. Stage resolution — wheat day 60 of 150 => vegetative growth (0.15–0.4 => day 22–60 boundary; 60/150 = 0.4 => mid-season start)
const stage = resolveCropStage(crop, NOW);
assert.equal(stage.cycleDays, 150);
assert.ok(stage.index >= 1 && stage.index <= 2, `stage index ${stage.index}`);
assert.equal(stage.stages.length, 4);
assert.ok(stage.kc > 0.4 && stage.kc <= 1.2, `kc ${stage.kc}`);

// 2. Full schedule with live weather
const plan = buildIrrigationSchedule({ crop, weather, now: NOW });
assert.equal(plan.baseline, false);
assert.equal(plan.days.length, 7);
assert.equal(plan.system.key, "Drip");
assert.equal(plan.system.efficiency, 0.9);
for (const d of plan.days) {
  assert.ok(["water", "skip", "rest"].includes(d.action), d.action);
  assert.ok(d.moisturePct >= 0 && d.moisturePct <= 100, `moisture ${d.moisturePct}`);
  assert.ok(d.etc > 0, `etc ${d.etc}`);
  if (d.action === "water") assert.ok(d.grossMm > 0 && d.window, d);
}
// rain day (12mm) must skip or leave the bucket healthy — never a water day with rain>=5 and healthy bucket
const rainDay = plan.days[2];
assert.notEqual(rainDay.action, "water", "12mm rain day should not need watering");
// frost day must be held
assert.equal(plan.days[4].action, "skip", "frost night must hold irrigation");
assert.ok(plan.notes.some((n) => n.kind === "frost"));
assert.ok(plan.notes.some((n) => n.kind === "rain"));
// heat day watering (if any) uses dawn window
for (const d of plan.days) {
  if (d.action === "water" && d.flags.includes("heat")) {
    assert.equal(d.window, "05:30 – 07:00");
  }
}
// totals consistent
assert.equal(
  plan.totals.weeklyMm,
  Math.round(plan.days.reduce((s, d) => s + d.grossMm, 0) * 10) / 10
);

// 3. No weather => honest baseline, still 7 days
const base = buildIrrigationSchedule({ crop, weather: null, now: NOW });
assert.equal(base.baseline, true);
assert.equal(base.days.length, 7);
assert.ok(base.notes.some((n) => n.kind === "baseline"));

// 4. Future sowing => nothing scheduled
const future = buildIrrigationSchedule({
  crop: { ...crop, SowingDate: iso(10) },
  weather,
  now: NOW,
});
assert.equal(future.stage.notStarted, true);
assert.ok(future.days.every((d) => d.action === "rest"));
assert.equal(future.nextSession, null);

// 5. Past cycle => season closed
const done = buildIrrigationSchedule({
  crop: { ...crop, SowingDate: iso(-200) },
  weather,
  now: NOW,
});
assert.equal(done.stage.complete, true);
assert.ok(done.days.every((d) => d.action === "rest"));

// 6. Fruit category => perennial season stage, no crash without gps
const fruit = buildIrrigationSchedule({
  crop: { CropName: "Mango", CropCategory: "Fruit", IrrigationType: "Sprinkler" },
  weather,
  now: NOW,
});
assert.equal(fruit.stage.perennial, true);
assert.equal(fruit.system.key, "Sprinkler");
assert.ok(fruit.stage.name.length > 0);

// 7. Unknown crop + no soil/system recorded => defaults, never throws
const mystery = buildIrrigationSchedule({
  crop: { CropName: "Dragonfruit" },
  weather,
  now: NOW,
});
assert.equal(mystery.system.key, null);
assert.equal(mystery.soil.key, null);
assert.equal(mystery.days.length, 7);

console.log("irrigation scheduler: all sanity checks passed");
console.log(
  "sample week:",
  plan.days.map((d) => `${d.weekday}:${d.action}${d.grossMm ? `(${d.grossMm}mm)` : ""}`).join(" ")
);
console.log("next session:", plan.nextSession?.date, plan.nextSession?.window, `${plan.nextSession?.grossMm}mm`);
