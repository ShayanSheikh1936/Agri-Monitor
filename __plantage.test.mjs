// Temp verification for the dynamic plant-age fix (spec section 17).
import {
  calculatePlantAgeDays,
  getPlantAgeDays,
  getPlantAgeInfo,
  formatPlantAge,
  getSowingDate,
} from "./src/lib/cropUtils.js";

const DAY = 86400000;
const now = Date.now();
const ymd = (offset) => {
  const t = new Date(now - offset * DAY);
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
};
const PIN = new Date(2026, 8, 2); // pinned "today" = 2026-09-02 local

let fail = 0;
const check = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) fail++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}  ->  ${JSON.stringify(actual)}${ok ? "" : ` (expected ${JSON.stringify(expected)})`}`);
};

// 1-4: calendar-day diffs
check("1 sowing today -> 0", getPlantAgeDays({ SowingDate: ymd(0) }), 0);
check("2 sowing yesterday -> 1", getPlantAgeDays({ SowingDate: ymd(1) }), 1);
check("3 sowing 7 days ago -> 7", getPlantAgeDays({ SowingDate: ymd(7) }), 7);
check("4 sowing 30 days ago -> 30", getPlantAgeDays({ SowingDate: ymd(30) }), 30);
// 5: future sowing -> not started, never negative day
check("5 future sowing info", getPlantAgeInfo({ SowingDate: ymd(-91) }), { status: "notStarted", days: null, daysUntil: 91 });
check("5 future label", formatPlantAge({ SowingDate: ymd(-91) }), "Starts in 91 days");
check("5 future getPlantAgeDays", getPlantAgeDays({ SowingDate: ymd(-91) }), null);
check("5 tomorrow label singular", formatPlantAge({ SowingDate: ymd(-1) }), "Starts in 1 day");
// 6-7: missing / invalid
check("6 missing SowingDate", getPlantAgeInfo({}), { status: "unknown", days: null, daysUntil: null });
check("6 missing label", formatPlantAge({}), null);
check("7 invalid SowingDate", getPlantAgeDays({ SowingDate: "not-a-date" }), null);
check("7 null SowingDate", getPlantAgeDays({ SowingDate: null }), null);
// 8: stale stored plantAgeDays must NOT control the UI
check("8 stale plantAgeDays ignored", getPlantAgeDays({ SowingDate: ymd(7), plantAgeDays: 3 }), 7);
check("8 stale plantAgeDays only (no sowing)", getPlantAgeDays({ plantAgeDays: 6418 }), null);
// 9: pinned-date utility (spec section 9 examples)
check("9 calculatePlantAgeDays(2026-08-26, 2026-09-02)", calculatePlantAgeDays("2026-08-26", PIN), 7);
check("9 calculatePlantAgeDays(same day)", calculatePlantAgeDays("2026-09-02", PIN), 0);
check("9 calculatePlantAgeDays invalid", calculatePlantAgeDays("garbage", PIN), null);
// 10: different crops, different ages
check("10 multi-crop", [ymd(3), ymd(12), ymd(0)].map((d) => getPlantAgeDays({ SowingDate: d })), [3, 12, 0]);
// Legacy / stored shapes still parse
check("legacy {seconds} timestamp", getPlantAgeDays({ SowingDate: { seconds: Math.floor((now - 7 * DAY) / 1000) } }), 7);
check("legacy epoch seconds number", getPlantAgeDays({ SowingDate: Math.floor((now - 7 * DAY) / 1000) }), 7);
check("legacy epoch ms number", getPlantAgeDays({ SowingDate: now - 7 * DAY }), 7);
check("legacy Sowingdate spelling", getPlantAgeDays({ Sowingdate: ymd(7) }), 7);
check("legacy full ISO string", getPlantAgeDays({ SowingDate: new Date(now - 7 * DAY).toISOString() }), 7);
check("Firestore-like toDate()", getPlantAgeDays({ SowingDate: { toDate: () => new Date(now - 7 * DAY) } }), 7);
// Labels
check("label active", formatPlantAge({ SowingDate: ymd(7) }), "Day 7");
check("sowing date round-trips", getSowingDate({ SowingDate: "2026-08-26" }).toISOString().slice(0, 10), new Date(2026, 7, 26).toISOString().slice(0, 10));

console.log(fail === 0 ? "\nALL TESTS PASSED" : `\n${fail} TEST(S) FAILED`);
process.exit(fail === 0 ? 0 : 1);
