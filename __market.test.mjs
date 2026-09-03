// Temporary verification for the Global Market Rates data layer.
// Run: node --import ./__register.mjs __market.test.mjs
import assert from "node:assert";

const {
  marketDocId,
  marketApiUrl,
  fetchMarketRates,
  getMarketCategories,
  computeMarketStats,
  mergeFavoritesWithLive,
  evaluateFavoriteAlerts,
  getMarketFavorites,
  addMarketFavorite,
  removeMarketFavorite,
  updateMarketFavorite,
  getMarketPreferences,
  saveMarketPreferences,
  getMarketAnalyses,
  saveMarketAnalysis,
  deleteMarketAnalysis,
  DEFAULT_MARKET_PREFERENCES,
  ANALYSIS_KINDS,
} = await import("./src/services/marketRateService.js");

const {
  extractJsonFromReply,
  buildMarketInsightsPrompt,
  validateMarketInsights,
  buildCommodityAnalysisPrompt,
  validateCommodityAnalysis,
  generateMarketInsights,
  generateCommodityAnalysis,
} = await import("./src/services/marketAIService.js");

const {
  categoryMeta,
  directionMeta,
  formatPrice,
  formatPct,
  formatSigned,
  formatStaleness,
  applyMarketFilters,
  buildComparisonSeries,
  RELEVANCE,
} = await import("./src/dashboard/marketplace/marketMeta.js");

const UID = "smoke-uid";

// ---- 1. Storage-safe document ids -------------------------------------------
assert.equal(marketDocId("worldbank:crude-oil-average"), "worldbank_crude-oil-average");
assert.equal(marketDocId(""), "unknown");
assert.ok(!marketDocId("a/b:c").includes("/"), "doc id must never contain a slash");
console.log("1. marketDocId ok");

// ---- 2. Endpoint resolution --------------------------------------------------
assert.ok(
  marketApiUrl().startsWith("https://"),
  "must fall back to the built-in default when VITE_MARKET_API_URL is unset"
);
console.log("2. marketApiUrl ->", marketApiUrl());

// ---- 3. Live feed fetch + normalization --------------------------------------
const feed = await fetchMarketRates();
assert.ok(Array.isArray(feed.items) && feed.items.length > 0, "feed returned no items");
assert.ok(feed.items.length <= 400, "MAX_ITEMS cap not applied");
for (const it of feed.items) {
  assert.ok(typeof it.id === "string" && it.id, `item missing id: ${JSON.stringify(it)}`);
  assert.ok(typeof it.name === "string" && it.name, "item missing name");
  assert.ok(typeof it.category === "string" && it.category, "item missing category");
  assert.ok(["up", "down", "flat"].includes(it.direction), `bad direction: ${it.direction}`);
  assert.ok(
    it.value === null || typeof it.value === "number",
    "value must be a finite number or null"
  );
  assert.ok(typeof it.isStale === "boolean", "isStale must be derived for every row");
  assert.ok(it.lagMonths === null || Number.isFinite(it.lagMonths), "lagMonths must be derived");
}
const ids = feed.items.map((i) => i.id);
assert.equal(new Set(ids).size, ids.length, "duplicate item ids in the feed");
console.log(`3. fetchMarketRates ok — ${feed.items.length} items, period ${feed.period}`);

// ---- 4. Stats ----------------------------------------------------------------
const stats = computeMarketStats(feed.items);
const quotedRows = feed.items.filter((i) => i.changePct !== null);
assert.equal(stats.total, feed.items.length);
assert.equal(stats.quoted, quotedRows.length, "quoted must count rows with a % change");
assert.equal(stats.gainers, quotedRows.filter((i) => i.direction === "up").length);
assert.equal(stats.losers, quotedRows.filter((i) => i.direction === "down").length);
assert.equal(stats.flat, quotedRows.filter((i) => i.direction === "flat").length);
assert.equal(stats.gainers + stats.losers + stats.flat, stats.quoted);
assert.ok(stats.categories.length > 0, "no category rollup produced");
assert.ok(
  stats.categories.every((c) => c.category && Number.isFinite(c.avgChangePct)),
  "every category rollup needs a name and an average move"
);
assert.equal(
  stats.categories.reduce((sum, c) => sum + c.count, 0),
  stats.quoted,
  "category rollup lost rows"
);
if (stats.breadth !== null) assert.ok(stats.breadth >= 0 && stats.breadth <= 100);
if (stats.topGainer) assert.equal(stats.topGainer.direction, "up");
if (stats.topLoser) assert.equal(stats.topLoser.direction, "down");
if (stats.mostVolatile && stats.topGainer) {
  assert.ok(
    Math.abs(stats.mostVolatile.changePct) >= Math.abs(stats.topGainer.changePct),
    "mostVolatile must be the largest absolute move"
  );
}
console.log(
  `4. computeMarketStats ok — ${stats.gainers} up / ${stats.losers} down / ${stats.flat} flat, ` +
    `${stats.categories.length} categories, ${stats.staleCount} stale`
);

// ---- 5. Categories + presentation metadata -----------------------------------
// getMarketCategories returns { name, count } buckets — the shape MarketFilters
// renders as chips.
const categoryBuckets = getMarketCategories(feed.items);
const categoryNames = categoryBuckets.map((c) => c.name);
assert.ok(categoryNames.includes("Energy"), "Energy category missing");
assert.ok(categoryNames.includes("Fertilizers"), "Fertilizers category missing");
assert.equal(
  categoryBuckets.reduce((sum, c) => sum + c.count, 0),
  feed.items.length,
  "category buckets lost rows"
);
assert.deepEqual(
  categoryNames,
  [...categoryNames].sort(
    (a, b) =>
      categoryBuckets.find((c) => c.name === b).count -
        categoryBuckets.find((c) => c.name === a).count || a.localeCompare(b)
  ),
  "categories must be ordered by count, then name"
);
// lucide icons are forwardRef components (objects), so only assert renderability.
const isIcon = (v) => v && (typeof v === "function" || typeof v === "object");
for (const c of categoryNames) {
  const meta = categoryMeta(c);
  assert.ok(isIcon(meta.icon), `no icon for ${c}`);
  assert.ok(Object.values(RELEVANCE).includes(meta.relevance), `bad relevance for ${c}`);
  assert.ok(/^#/.test(meta.tone), `bad tone for ${c}`);
}
// Unknown categories must still resolve instead of crashing the row renderer.
assert.equal(categoryMeta("Something Brand New").relevance, RELEVANCE.OTHER);
assert.ok(isIcon(categoryMeta(null).icon), "a null category must still get an icon");
assert.equal(categoryMeta("Urea (spot)").relevance, RELEVANCE.INPUT);
assert.equal(categoryMeta("Coarse Grains").relevance, RELEVANCE.OUTPUT);
assert.equal(categoryMeta("Base Metals").relevance, RELEVANCE.OTHER);
assert.equal(directionMeta("sideways"), directionMeta("flat"));
assert.equal(directionMeta(undefined).icon, directionMeta("flat").icon);
console.log(
  `5. categories ok — ${categoryNames.length}: ${categoryNames.slice(0, 4).join(", ")}…`
);

// ---- 6. Formatters -----------------------------------------------------------
assert.equal(formatPrice(null), "—");
assert.equal(formatPrice(9.5), "9.50", "sub-10 prices keep 2 decimals");
assert.equal(formatPrice(95.5), "95.5", "10–999 prices keep 1 decimal");
assert.equal(formatPrice(1234.5, { unit: "US$/tonne" }), `${formatPrice(1234.5)} US$/tonne`);
assert.equal(formatPct(2.345), "+2.35%");
assert.equal(formatPct(-12.34), "−12.3%", "double-digit moves keep 1 decimal");
assert.equal(formatPct(0), "0.00%");
assert.equal(formatPct(null), "—");
assert.equal(formatSigned(-5), "−5.00");
assert.equal(formatSigned(0), "0.00", "zero must not carry a sign");
assert.equal(formatSigned(null), "—");
assert.equal(formatStaleness(0), null, "current rows must not show a staleness badge");
assert.equal(formatStaleness(3), "3 mo old");
assert.equal(formatStaleness(14), "1y 2m old");
assert.equal(formatStaleness(24), "2y old");
console.log("6. formatters ok");

// ---- 7. Filters --------------------------------------------------------------
const all = applyMarketFilters(feed.items, {
  search: "",
  category: "all",
  relevance: "all",
  direction: "all",
  favoriteOnly: false,
  favoriteIds: new Set(),
  sortBy: DEFAULT_MARKET_PREFERENCES.sortBy,
  sortDir: DEFAULT_MARKET_PREFERENCES.sortDir,
});
assert.equal(all.length, feed.items.length, "unfiltered view must keep every row");

const wheat = applyMarketFilters(feed.items, {
  search: "wheat",
  category: "all",
  relevance: "all",
  direction: "all",
  favoriteOnly: false,
  favoriteIds: new Set(),
  sortBy: "name",
  sortDir: "asc",
});
assert.ok(wheat.length > 0, "search for 'wheat' matched nothing");
assert.ok(
  wheat.every(
    (i) =>
      i.name.toLowerCase().includes("wheat") ||
      i.category.toLowerCase().includes("wheat") ||
      String(i.unit ?? "").toLowerCase().includes("wheat")
  ),
  "search leaked a row"
);

const fert = applyMarketFilters(feed.items, {
  search: "",
  category: "Fertilizers",
  relevance: "all",
  direction: "all",
  favoriteOnly: false,
  favoriteIds: new Set(),
  sortBy: "changePct",
  sortDir: "desc",
});
assert.ok(fert.every((i) => i.category === "Fertilizers"));

const rising = applyMarketFilters(feed.items, {
  search: "",
  category: "all",
  relevance: "all",
  direction: "up",
  favoriteOnly: false,
  favoriteIds: new Set(),
  sortBy: "changePct",
  sortDir: "desc",
});
assert.equal(rising.length, stats.gainers);
// Rows without a changePct must survive a name sort (no silent exclusion).
const byName = applyMarketFilters(feed.items, {
  search: "",
  category: "all",
  relevance: "all",
  direction: "all",
  favoriteOnly: false,
  favoriteIds: new Set(),
  sortBy: "name",
  sortDir: "asc",
});
assert.equal(byName.length, feed.items.length, "sorting dropped rows");
const inputs = applyMarketFilters(feed.items, {
  search: "",
  category: "all",
  relevance: RELEVANCE.INPUT,
  direction: "all",
  favoriteOnly: false,
  favoriteIds: new Set(),
  sortBy: "changePct",
  sortDir: "desc",
});
assert.ok(inputs.length > 0, "no farm-input commodities detected");
console.log(
  `7. applyMarketFilters ok — wheat ${wheat.length}, fertilizers ${fert.length}, ` +
    `rising ${rising.length}, farm inputs ${inputs.length}`
);

// ---- 8. Comparison series ----------------------------------------------------
const series = buildComparisonSeries(rising.slice(0, 3));
assert.equal(series.length, Math.min(3, rising.length));
assert.ok(series.every((s) => /^#/.test(s.color)), "every series row needs a color");
assert.equal(new Set(series.map((s) => s.color)).size, series.length, "colors must not repeat");
console.log(`8. buildComparisonSeries ok — ${series.length} rows`);

// ---- 9. Watchlist (favorites) CRUD against the Firestore stub ----------------
const target = feed.items.find((i) => i.value !== null);
assert.ok(target, "no quoted item to favorite");

const added = await addMarketFavorite(UID, target, { note: "watching this" });
assert.equal(added.itemId, target.id);
assert.equal(added.name, target.name);
assert.equal(added.note, "watching this");

let favs = await getMarketFavorites(UID);
assert.equal(favs.length, 1, "favorite not readable back");
assert.equal(favs[0].docId, marketDocId(target.id));

await updateMarketFavorite(UID, target.id, {
  note: "re-check next month",
  alertAbove: 1,
  targetPrice: null,
});
favs = await getMarketFavorites(UID);
assert.equal(favs[0].note, "re-check next month");
assert.equal(favs[0].alertAbove, 1, "alertAbove threshold not persisted");

// Live quotes must win over the stored snapshot.
const merged = mergeFavoritesWithLive(favs, feed.items);
assert.equal(merged.length, 1);
assert.equal(merged[0].value, target.value, "stored snapshot not refreshed from the feed");
assert.ok(merged[0].live, "live row not attached");

const alerts = evaluateFavoriteAlerts(merged);
assert.ok(
  alerts.some((a) => a.kind === "above" && a.key === `${target.id}:above`),
  "alertAbove=1 must fire for a commodity priced above 1"
);

// A favorite whose commodity left the feed must not crash the panel — it keeps
// its stored snapshot and simply carries no live row.
const orphan = mergeFavoritesWithLive([{ ...favs[0], itemId: "gone:item" }], feed.items);
assert.equal(orphan[0].live, null);
assert.equal(orphan[0].name, favs[0].name, "orphan lost its stored name");
assert.ok(Array.isArray(evaluateFavoriteAlerts(orphan)), "orphan evaluation must not throw");

// favoriteOnly must narrow to the watchlist.
const onlyFav = applyMarketFilters(feed.items, {
  search: "",
  category: "all",
  relevance: "all",
  direction: "all",
  favoriteOnly: true,
  favoriteIds: new Set([target.id]),
  sortBy: "changePct",
  sortDir: "desc",
});
assert.equal(onlyFav.length, 1, "favoriteOnly did not narrow the list");
assert.equal(onlyFav[0].id, target.id);

await removeMarketFavorite(UID, target.id);
favs = await getMarketFavorites(UID);
assert.equal(favs.length, 0, "favorite not removed");

// Signed-out visitors get a coded error, never a silent write.
await assert.rejects(() => addMarketFavorite(null, target), /Sign in/);
console.log("9. favorites CRUD + alert evaluation ok");

// ---- 10. Preferences round-trip ----------------------------------------------
assert.deepEqual(await getMarketPreferences(UID), DEFAULT_MARKET_PREFERENCES);
await saveMarketPreferences(UID, { view: "cards", sortBy: "name", autoRefreshMinutes: 15 });
const readBack = await getMarketPreferences(UID);
assert.equal(readBack.view, "cards");
assert.equal(readBack.sortBy, "name");
assert.equal(readBack.autoRefreshMinutes, 15);
// Garbage from an older schema must coerce back to safe values.
await saveMarketPreferences(UID, { view: "hologram", sortDir: "sideways", autoRefreshMinutes: 9999 });
const coerced = await getMarketPreferences(UID);
assert.equal(coerced.view, "table");
assert.equal(coerced.sortDir, "desc");
assert.equal(coerced.autoRefreshMinutes, 120, "auto-refresh must be clamped");
assert.deepEqual(await getMarketPreferences(null), DEFAULT_MARKET_PREFERENCES);
console.log("10. preferences round-trip + coercion ok");

// ---- 11. Saved analyses ------------------------------------------------------
const savedResult = validateMarketInsights({
  summary: "Fertilizer costs eased while grains firmed.",
  marketTone: "CAUTIOUSLY_POSITIVE",
  keyTrends: [
    { title: "Urea easing", detail: "Down for a second month.", direction: "DOWN", category: "Fertilizers" },
    { title: "no detail" },
  ],
  inputCostOutlook: { trend: "falling", detail: "Nitrogen cheaper." },
  opportunities: [{ title: "Pre-buy nitrogen", detail: "Prices are soft.", timing: "next 2 weeks" }],
  risks: [{ title: "Diesel", detail: "Energy up.", severity: "HIGH" }, { title: "x", detail: "y", severity: "apocalyptic" }],
  actionPlan: ["Lock in fertilizer", "Delay diesel purchases"],
  confidence: 0.8,
});
assert.equal(savedResult.keyTrends.length, 1, "incomplete trend should be dropped");
assert.equal(savedResult.keyTrends[0].direction, "down", "direction must be lowercased");
assert.equal(savedResult.marketTone, "mixed", "unknown tone must normalize to mixed");
assert.equal(savedResult.inputCostOutlook.trend, "falling");
assert.equal(savedResult.risks[0].severity, "high");
assert.equal(savedResult.risks[1].severity, "medium", "unknown severity must normalize to medium");
assert.deepEqual(savedResult.actionPlan, ["Lock in fertilizer", "Delay diesel purchases"]);
assert.ok(savedResult.warnings.length > 0, "dropped rows must be reported");

const a1 = await saveMarketAnalysis(UID, {
  kind: ANALYSIS_KINDS.MARKET,
  subjectName: "Global market",
  result: savedResult,
  period: feed.period,
  stats,
});
assert.equal(a1.kind, ANALYSIS_KINDS.MARKET);
assert.equal(a1.subjectName, "Global market");
const a2 = await saveMarketAnalysis(UID, {
  kind: ANALYSIS_KINDS.COMMODITY,
  subjectId: target.id,
  subjectName: target.name,
  result: { outlook: "Soft." },
});
assert.equal(a2.kind, ANALYSIS_KINDS.COMMODITY);
assert.equal(a2.subjectName, target.name);
// An unrecognized kind must fall back to the market-wide bucket.
const a3 = await saveMarketAnalysis(UID, { kind: "nonsense", subjectName: "x", result: {} });
assert.equal(a3.kind, ANALYSIS_KINDS.MARKET);
await deleteMarketAnalysis(UID, (await getMarketAnalyses(UID, 12)).find((a) => a.subjectName === "x").id);
let analyses = await getMarketAnalyses(UID, 12);
assert.equal(analyses.length, 2);
assert.equal(analyses[0].kind, ANALYSIS_KINDS.COMMODITY, "newest analysis must sort first");
assert.ok(analyses.every((a) => a.id), "analysis missing an id");
assert.equal(analyses[1].kind, ANALYSIS_KINDS.MARKET);
assert.equal(analyses[1].subjectName, "Global market");
assert.equal(analyses[1].period, feed.period, "period context must be stored with the analysis");
assert.equal(analyses[1].result?.summary, savedResult.summary, "saved result must round-trip intact");
assert.equal(analyses[0].subjectId, target.id);

// Delete through the id the UI actually holds (read back from the collection).
await deleteMarketAnalysis(UID, analyses[1].id);
analyses = await getMarketAnalyses(UID, 12);
assert.equal(analyses.length, 1, "analysis not deleted");
assert.equal(analyses[0].kind, ANALYSIS_KINDS.COMMODITY);
assert.deepEqual(await getMarketAnalyses(null), []);
console.log("11. saved analyses CRUD + ordering ok");

// ---- 12. Validators reject unusable AI output --------------------------------
assert.throws(() => validateMarketInsights(null), /not a JSON object/);
assert.throws(() => validateMarketInsights([]), /not a JSON object/);
assert.throws(() => validateMarketInsights({ foo: 1 }), /no usable market insight/);
assert.throws(() => validateCommodityAnalysis({ foo: 1 }), /no usable commodity analysis/);

// Unknown enums must normalize, not crash.
const normalized = validateCommodityAnalysis({
  outlook: "Prices drifting lower.",
  guidance: "WAIT AND SEE",
  urgency: "whenever",
  drivers: ["weak demand", 42, "", null],
  relatedCrops: ["Wheat", "Maize"],
});
assert.equal(normalized.guidance, "watch", "unknown guidance must normalize to watch");
assert.equal(normalized.urgency, "medium", "unknown urgency must normalize to medium");
assert.deepEqual(normalized.drivers, ["weak demand"], "non-string drivers must be dropped");
assert.ok(normalized.confidence > 0 && normalized.confidence <= 1);

// extractJsonFromReply handles fenced and prose-wrapped payloads.
assert.deepEqual(extractJsonFromReply('```json\n{"a":1}\n```'), { a: 1 });
assert.deepEqual(extractJsonFromReply('Sure! {"a":1} hope that helps'), { a: 1 });
assert.throws(() => extractJsonFromReply(""), /empty/);
assert.throws(() => extractJsonFromReply("no json here at all"), /JSON/);
console.log("12. validators + extractJsonFromReply ok");

// ---- 13. Prompt builders embed the real context ------------------------------
// Local-midnight date (never toISOString) so the 40-day age is timezone-proof.
const sown = new Date();
sown.setDate(sown.getDate() - 40);
const sownIso = `${sown.getFullYear()}-${String(sown.getMonth() + 1).padStart(2, "0")}-${String(
  sown.getDate()
).padStart(2, "0")}`;

const marketPrompt = buildMarketInsightsPrompt({
  feed,
  stats,
  favorites: merged,
  crops: [
    {
      CropName: "Wheat",
      CropCategory: "Cereal",
      SeedType: "Inqlab-91",
      SowingDate: sownIso,
      AreaSize: 4,
      AreaUnit: "acre",
      SoilType: "loam",
      gpsLocation: "Faisalabad, Pakistan",
    },
  ],
  question: "Should I sell now?",
});
assert.ok(marketPrompt.length > 500, "market prompt looks empty");
for (const marker of [feed.period, "Wheat", "Should I sell now?", target.name]) {
  assert.ok(marketPrompt.includes(String(marker)), `market prompt is missing "${marker}"`);
}
assert.ok(/plant age 40 days/i.test(marketPrompt), "dynamic plant age was not injected");
assert.ok(/land 4 acre/.test(marketPrompt), "land area was not injected");
assert.ok(!/undefined/.test(marketPrompt), "prompt leaked the literal 'undefined'");
// The reply-schema line legitimately says "commodity name or null"; what must
// never appear is a DATA field rendered as a bare null.
assert.ok(!/:\s*null/.test(marketPrompt), "prompt rendered a data field as null");
assert.ok(!/NaN/.test(marketPrompt), "prompt leaked NaN");

// A crop with no sowing date must degrade to "sown <raw>" or nothing — never crash.
const noAgePrompt = buildMarketInsightsPrompt({
  feed,
  stats,
  favorites: [],
  crops: [{ CropName: "Maize" }],
  question: null,
});
assert.ok(noAgePrompt.includes("Maize"));
assert.ok(!/plant age/.test(noAgePrompt), "plant age invented without a sowing date");
assert.ok(!/undefined/.test(noAgePrompt), "empty crop leaked 'undefined'");
// No crops at all must omit the whole block.
assert.ok(
  !buildMarketInsightsPrompt({ feed, stats, favorites: [], crops: [], question: null }).includes(
    "FARMER'S OWN CROPS"
  ),
  "crop block printed for a farmer with no crops"
);

const commodityPrompt = buildCommodityAnalysisPrompt({
  item: target,
  categoryStats: stats.categories.find((c) => c.category === target.category) ?? null,
  favorites: merged,
  crops: [],
  question: null,
});
assert.ok(commodityPrompt.includes(target.name));
assert.ok(!/undefined/.test(commodityPrompt), "commodity prompt leaked 'undefined'");
assert.ok(!/:\s*null/.test(commodityPrompt), "commodity prompt rendered a data field as null");
assert.throws(() => buildCommodityAnalysisPrompt({ item: null }), /commodity/i);
console.log(
  `13. prompt builders ok — market ${marketPrompt.length} chars, commodity ${commodityPrompt.length} chars`
);

// ---- 14. AI orchestration never throws ---------------------------------------
// No VITE_DASHBOARD_URL in Node → must return a coded failure, not an exception.
const noUrl = await generateMarketInsights({ feed, stats, favorites: merged, crops: [] });
assert.equal(noUrl.ok, false);
assert.ok(noUrl.error?.message, "missing error message");
console.log("14a. generateMarketInsights degrades gracefully:", noUrl.error.message);

// A real round-trip against the live dashboard endpoint (skipped when unreachable).
try {
  const live = await generateMarketInsights(
    { feed, stats, favorites: [], crops: [] },
    { apiUrl: "https://agrimonitordashboard.netlify.app/.netlify/functions/index", timeoutMs: 60000 }
  );
  if (live.ok) {
    assert.ok(live.result.summary, "no summary in the live reply");
    console.log("14b. live dashboard AI ok —", live.result.summary.slice(0, 90), "…");
  } else {
    console.log("14b. live dashboard AI unavailable (handled):", live.error.message);
  }
} catch (err) {
  assert.fail(`generateMarketInsights must never throw — it threw: ${err.message}`);
}

const commodityNoUrl = await generateCommodityAnalysis({ item: target, crops: [] });
assert.equal(commodityNoUrl.ok, false);
console.log("14c. generateCommodityAnalysis degrades gracefully:", commodityNoUrl.error.message);

console.log("\nAll Global Market Rates data-layer checks passed.");
