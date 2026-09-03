// Data hook for the Global Market Rates page — mirrors the useDisasterAlerts
// contract: components never fetch directly, and every load is guarded by a
// request counter so a slow response can never overwrite a newer one.
//
// Owns four concerns:
//   1. live market feed   (marketRateService.fetchMarketRates)
//   2. user marketplace data in Firestore (favorites, preferences, analyses)
//   3. derived filters / stats / price alerts
//   4. AI insights via the EXISTING dashboard endpoint (marketAIService)

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ANALYSIS_KINDS,
  DEFAULT_MARKET_PREFERENCES,
  MARKET_ERROR_CODES,
  addMarketFavorite,
  computeMarketStats,
  deleteMarketAnalysis,
  evaluateFavoriteAlerts,
  fetchMarketRates,
  getMarketAnalyses,
  getMarketCategories,
  getMarketFavorites,
  getMarketPreferences,
  mergeFavoritesWithLive,
  removeMarketFavorite,
  saveMarketAnalysis,
  saveMarketPreferences,
  updateMarketFavorite,
} from "@/services/marketRateService";
import {
  generateCommodityAnalysis,
  generateMarketInsights,
} from "@/services/marketAIService";
import { MAX_COMPARE, applyMarketFilters, exportMarketCsv } from "./marketMeta";

// AI is only ever run on an explicit user action, and the cooldown stops
// accidental double-clicks from hammering the shared backend.
const AI_COOLDOWN_MS = 3 * 60 * 1000;
const PREFS_SAVE_DEBOUNCE_MS = 900;

// Frozen empty set so the "nothing dismissed" state keeps a stable identity.
const EMPTY_ALERT_KEYS = new Set();

const TRANSIENT_FILTERS = {
  category: DEFAULT_MARKET_PREFERENCES.category,
  relevance: DEFAULT_MARKET_PREFERENCES.relevance,
  direction: DEFAULT_MARKET_PREFERENCES.direction,
  sortBy: DEFAULT_MARKET_PREFERENCES.sortBy,
  sortDir: DEFAULT_MARKET_PREFERENCES.sortDir,
  view: DEFAULT_MARKET_PREFERENCES.view,
  autoRefreshMinutes: DEFAULT_MARKET_PREFERENCES.autoRefreshMinutes,
};

export default function useMarketRates({ uid = null, crops = [], location = null, toast } = {}) {
  // ---- Feed ------------------------------------------------------------------
  const [feed, setFeed] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null); // { code, message }
  const requestRef = useRef(0);
  const mountedRef = useRef(true);
  const abortRef = useRef(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  const load = useCallback(async ({ bypass = false } = {}) => {
    const id = ++requestRef.current;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    if (bypass) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const data = await fetchMarketRates({ signal: controller.signal });
      if (requestRef.current !== id || !mountedRef.current) return;
      setFeed(data);
    } catch (err) {
      // A newer request (or an unmount) already superseded this one.
      if (requestRef.current !== id || !mountedRef.current) return;
      // Keep the last good feed so a failed refresh never blanks the table;
      // the error card renders alongside it.
      setError({
        code: err?.code ?? MARKET_ERROR_CODES.UNAVAILABLE,
        message: err?.message ?? "The market feed is unavailable.",
      });
    } finally {
      if (requestRef.current === id && mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const refresh = useCallback(() => load({ bypass: true }), [load]);

  // ---- Filters + persisted preferences ---------------------------------------
  const [filters, setFilters] = useState({
    ...TRANSIENT_FILTERS,
    search: "",
    favoriteOnly: false,
  });
  // Derived rather than stored: a signed-out visitor has nothing to load, so
  // preferences are "ready" immediately and the debounced writer stays gated.
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const prefsReady = !uid || prefsLoaded;

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    getMarketPreferences(uid)
      .then((prefs) => {
        if (cancelled || !mountedRef.current) return;
        setFilters((prev) => ({ ...prev, ...prefs }));
      })
      .catch((err) => console.error("market: preferences load failed:", err))
      .finally(() => {
        if (!cancelled && mountedRef.current) setPrefsLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [uid]);

  // Debounced preference persistence — never writes before the initial load,
  // and never writes for a signed-out visitor.
  useEffect(() => {
    if (!prefsReady || !uid) return;
    const timer = setTimeout(() => {
      const persistable = {
        category: filters.category,
        relevance: filters.relevance,
        direction: filters.direction,
        sortBy: filters.sortBy,
        sortDir: filters.sortDir,
        view: filters.view,
        autoRefreshMinutes: filters.autoRefreshMinutes,
      };
      saveMarketPreferences(uid, persistable).catch((err) =>
        console.error("market: preferences save failed:", err)
      );
    }, PREFS_SAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [
    prefsReady,
    uid,
    filters.category,
    filters.relevance,
    filters.direction,
    filters.sortBy,
    filters.sortDir,
    filters.view,
    filters.autoRefreshMinutes,
  ]);

  const patchFilters = useCallback((patch) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters((prev) => ({
      ...TRANSIENT_FILTERS,
      search: "",
      favoriteOnly: false,
      autoRefreshMinutes: prev.autoRefreshMinutes,
    }));
  }, []);

  // ---- Auto refresh (opt-in, persisted) ---------------------------------------
  useEffect(() => {
    const minutes = Number(filters.autoRefreshMinutes);
    if (!minutes || minutes <= 0) return;
    const timer = setInterval(() => {
      load({ bypass: true });
    }, Math.max(minutes, 1) * 60_000);
    return () => clearInterval(timer);
  }, [filters.autoRefreshMinutes, load]);

  // ---- Favorites (Firestore) ---------------------------------------------------
  const [favorites, setFavorites] = useState([]);
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  const [favoriteBusy, setFavoriteBusy] = useState(() => new Set());

  const loadFavorites = useCallback(async () => {
    if (!uid) {
      setFavorites([]);
      return;
    }
    setFavoritesLoading(true);
    try {
      const list = await getMarketFavorites(uid);
      if (mountedRef.current) setFavorites(list);
    } catch (err) {
      console.error("market: favorites load failed:", err);
      if (mountedRef.current && err?.code !== MARKET_ERROR_CODES.NOT_AUTHENTICATED) {
        toast?.({
          title: "Watchlist unavailable",
          description: err?.message ?? "Saved commodities could not be loaded.",
          variant: "error",
        });
      }
    } finally {
      if (mountedRef.current) setFavoritesLoading(false);
    }
  }, [uid, toast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadFavorites();
  }, [loadFavorites]);

  const favoriteIds = useMemo(() => new Set(favorites.map((f) => f.itemId)), [favorites]);

  const markBusy = useCallback((itemId, busy) => {
    setFavoriteBusy((prev) => {
      const next = new Set(prev);
      if (busy) next.add(itemId);
      else next.delete(itemId);
      return next;
    });
  }, []);

  const toggleFavorite = useCallback(
    async (item) => {
      if (!uid) {
        toast?.({
          title: "Sign in required",
          description: "Your watchlist is saved to your account.",
          variant: "error",
        });
        return { ok: false };
      }
      if (!item?.id) return { ok: false };

      const isFavorite = favoriteIds.has(item.id);
      markBusy(item.id, true);

      // Optimistic update — reverted below if the write fails.
      setFavorites((prev) =>
        isFavorite
          ? prev.filter((f) => f.itemId !== item.id)
          : [
              {
                docId: item.id,
                itemId: item.id,
                name: item.name,
                category: item.category,
                unit: item.unit,
                currency: item.currency,
                value: item.value,
                prevValue: item.prevValue,
                changePct: item.changePct,
                direction: item.direction,
                note: "",
                targetPrice: null,
                alertAbove: null,
                alertBelow: null,
                addedAtMs: Date.now(),
              },
              ...prev,
            ]
      );

      try {
        if (isFavorite) {
          await removeMarketFavorite(uid, item.id);
          toast?.({ title: "Removed from watchlist", description: item.name, variant: "info" });
        } else {
          await addMarketFavorite(uid, item);
          toast?.({
            title: "Added to watchlist",
            description: `${item.name} is now tracked with price alerts.`,
            variant: "success",
          });
        }
        return { ok: true, favorited: !isFavorite };
      } catch (err) {
        // Roll back to the server truth instead of guessing.
        await loadFavorites();
        toast?.({
          title: "Watchlist update failed",
          description: err?.message ?? "Please try again.",
          variant: "error",
        });
        return { ok: false, error: err };
      } finally {
        markBusy(item.id, false);
      }
    },
    [uid, favoriteIds, markBusy, toast, loadFavorites]
  );

  const updateFavorite = useCallback(
    async (itemId, patch) => {
      if (!uid || !itemId) return { ok: false };
      const previous = favorites;
      setFavorites((prev) =>
        prev.map((f) => (f.itemId === itemId ? { ...f, ...patch } : f))
      );
      try {
        await updateMarketFavorite(uid, itemId, patch);
        return { ok: true };
      } catch (err) {
        setFavorites(previous);
        toast?.({
          title: "Could not save",
          description: err?.message ?? "Your watchlist detail was not updated.",
          variant: "error",
        });
        return { ok: false, error: err };
      }
    },
    [uid, favorites, toast]
  );

  const clearFavorites = useCallback(async () => {
    if (!uid || favorites.length === 0) return { ok: false };
    const previous = favorites;
    setFavorites([]);
    try {
      await Promise.all(previous.map((f) => removeMarketFavorite(uid, f.itemId)));
      toast?.({
        title: "Watchlist cleared",
        description: `${previous.length} commodit${previous.length === 1 ? "y" : "ies"} removed.`,
        variant: "info",
      });
      return { ok: true };
    } catch (err) {
      setFavorites(previous);
      toast?.({
        title: "Could not clear watchlist",
        description: err?.message ?? "Please try again.",
        variant: "error",
      });
      return { ok: false, error: err };
    }
  }, [uid, favorites, toast]);

  // ---- Derived market data ------------------------------------------------------
  const items = useMemo(() => feed?.items ?? [], [feed]);
  const stats = useMemo(() => computeMarketStats(items), [items]);
  const categories = useMemo(() => getMarketCategories(items), [items]);

  const visibleItems = useMemo(
    () => applyMarketFilters(items, { ...filters, favoriteIds }),
    [items, filters, favoriteIds]
  );

  const mergedFavorites = useMemo(
    () => mergeFavoritesWithLive(favorites, items),
    [favorites, items]
  );

  const feedStamp = feed?.generatedAt ?? null;

  // Dismissals are stamped with the feed they belong to, so a fresh feed
  // re-evaluates every threshold and the previous dismissals expire on their
  // own — no reset effect, no extra render pass.
  const [dismissedAlerts, setDismissedAlerts] = useState({ stamp: null, keys: EMPTY_ALERT_KEYS });

  const activeAlerts = useMemo(() => {
    const alerts = evaluateFavoriteAlerts(mergedFavorites);
    const dismissed = dismissedAlerts.stamp === feedStamp ? dismissedAlerts.keys : null;
    return dismissed ? alerts.filter((a) => !dismissed.has(a.key)) : alerts;
  }, [mergedFavorites, dismissedAlerts, feedStamp]);

  const dismissAlert = useCallback(
    (key) => {
      setDismissedAlerts((prev) => ({
        stamp: feedStamp,
        keys: new Set(prev.stamp === feedStamp ? prev.keys : EMPTY_ALERT_KEYS).add(key),
      }));
    },
    [feedStamp]
  );

  const favoriteItems = useMemo(() => {
    const byId = new Map(items.map((i) => [i.id, i]));
    return mergedFavorites.map((f) => byId.get(f.itemId) ?? null).filter(Boolean);
  }, [mergedFavorites, items]);

  // ---- Comparison tray -----------------------------------------------------------
  const [compareIds, setCompareIds] = useState([]);

  const toggleCompare = useCallback(
    (itemId) => {
      if (compareIds.includes(itemId)) {
        setCompareIds((prev) => prev.filter((id) => id !== itemId));
        return;
      }
      if (compareIds.length >= MAX_COMPARE) {
        toast?.({
          title: "Comparison limit reached",
          description: `Remove one commodity first — up to ${MAX_COMPARE} can be compared.`,
          variant: "info",
        });
        return;
      }
      setCompareIds((prev) => (prev.length >= MAX_COMPARE ? prev : [...prev, itemId]));
    },
    [compareIds, toast]
  );

  const clearCompare = useCallback(() => setCompareIds([]), []);

  const comparedItems = useMemo(() => {
    const byId = new Map(items.map((i) => [i.id, i]));
    return compareIds.map((id) => byId.get(id)).filter(Boolean);
  }, [compareIds, items]);

  // ---- Saved analyses --------------------------------------------------------------
  const [savedAnalyses, setSavedAnalyses] = useState([]);

  const loadAnalyses = useCallback(async () => {
    if (!uid) {
      setSavedAnalyses([]);
      return;
    }
    const list = await getMarketAnalyses(uid, 12);
    if (mountedRef.current) setSavedAnalyses(list);
  }, [uid]);

  // Ref so the AI actions can refresh the history list without a dep cycle.
  // Synced in an effect — refs must never be written during render.
  const loadAnalysesRef = useRef(loadAnalyses);
  useEffect(() => {
    loadAnalysesRef.current = loadAnalyses;
  }, [loadAnalyses]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAnalyses();
  }, [loadAnalyses]);

  // ---- AI insights ---------------------------------------------------------------
  const [insights, setInsights] = useState({
    status: "idle", // idle | loading | ready | error
    result: null,
    error: null,
    generatedAt: null,
    question: "",
  });
  const [commodityAI, setCommodityAI] = useState({
    itemId: null,
    status: "idle",
    result: null,
    error: null,
    generatedAt: null,
  });
  const lastInsightMsRef = useRef(0);
  const cropListRef = useRef([]);
  useEffect(() => {
    cropListRef.current = Array.isArray(crops) ? crops : [];
  }, [crops]);

  const runMarketInsights = useCallback(
    async ({ question = null, force = false } = {}) => {
      if (items.length === 0) {
        setInsights((prev) => ({
          ...prev,
          status: "error",
          error: { message: "Market data must load before AI insights can run." },
        }));
        return { ok: false };
      }
      const sinceLast = Date.now() - lastInsightMsRef.current;
      if (!force && lastInsightMsRef.current && sinceLast < AI_COOLDOWN_MS) {
        const waitMins = Math.ceil((AI_COOLDOWN_MS - sinceLast) / 60000);
        toast?.({
          title: "Insights refreshed recently",
          description: `Try again in about ${waitMins} minute${waitMins === 1 ? "" : "s"}.`,
          variant: "info",
        });
        return { ok: false, cooldown: true };
      }

      lastInsightMsRef.current = Date.now();
      setInsights((prev) => ({ ...prev, status: "loading", error: null, question: question ?? prev.question }));

      const outcome = await generateMarketInsights(
        { feed, stats, favorites: mergedFavorites, crops: cropListRef.current, question },
        { location }
      );

      if (!outcome.ok) {
        setInsights((prev) => ({ ...prev, status: "error", error: outcome.error }));
        toast?.({
          title: "AI insights unavailable",
          description: outcome.error?.message ?? "Please try again shortly.",
          variant: "error",
        });
        return outcome;
      }

      setInsights({
        status: "ready",
        result: outcome.result,
        error: null,
        generatedAt: new Date().toISOString(),
        question: question ?? "",
      });

      // Best effort persistence — an AI result is still shown if saving fails.
      if (uid) {
        saveMarketAnalysis(uid, {
          kind: ANALYSIS_KINDS.MARKET,
          subjectName: `Global market · ${feed?.period ?? "latest"}`,
          result: outcome.result,
          period: feed?.period ?? null,
          stats: {
            total: stats.total,
            gainers: stats.gainers,
            losers: stats.losers,
            avgChangePct: stats.avgChangePct,
          },
        })
          .then(() => loadAnalysesRef.current?.())
          .catch((err) => console.error("market: insight save failed:", err));
      }

      toast?.({
        title: "AI market insights ready",
        description: `${outcome.result.keyTrends.length} trends · ${outcome.result.actionPlan.length} actions`,
        variant: "success",
      });
      return outcome;
    },
    [items.length, feed, stats, mergedFavorites, location, uid, toast]
  );

  const runCommodityInsights = useCallback(
    async (item, { question = null } = {}) => {
      if (!item?.id) return { ok: false };
      setCommodityAI({
        itemId: item.id,
        status: "loading",
        result: null,
        error: null,
        generatedAt: null,
      });

      const categoryStats =
        stats.categories.find((c) => c.category === item.category) ?? null;

      const outcome = await generateCommodityAnalysis(
        {
          item,
          categoryStats,
          favorites: mergedFavorites,
          crops: cropListRef.current,
          question,
        },
        { location }
      );

      if (!outcome.ok) {
        setCommodityAI({
          itemId: item.id,
          status: "error",
          result: null,
          error: outcome.error,
          generatedAt: null,
        });
        toast?.({
          title: "Commodity analysis failed",
          description: outcome.error?.message ?? "Please try again shortly.",
          variant: "error",
        });
        return outcome;
      }

      setCommodityAI({
        itemId: item.id,
        status: "ready",
        result: outcome.result,
        error: null,
        generatedAt: new Date().toISOString(),
      });

      if (uid) {
        saveMarketAnalysis(uid, {
          kind: ANALYSIS_KINDS.COMMODITY,
          subjectId: item.id,
          subjectName: item.name,
          result: outcome.result,
          period: feed?.period ?? item.date ?? null,
          stats: {
            value: item.value,
            changePct: item.changePct,
            unit: item.unit,
            category: item.category,
          },
        })
          .then(() => loadAnalysesRef.current?.())
          .catch((err) => console.error("market: commodity analysis save failed:", err));
      }

      return outcome;
    },
    [stats.categories, mergedFavorites, location, uid, feed, toast]
  );

  const removeAnalysis = useCallback(
    async (analysisId) => {
      if (!uid || !analysisId) return { ok: false };
      const previous = savedAnalyses;
      setSavedAnalyses((prev) => prev.filter((a) => a.id !== analysisId));
      try {
        await deleteMarketAnalysis(uid, analysisId);
        return { ok: true };
      } catch (err) {
        setSavedAnalyses(previous);
        toast?.({
          title: "Could not delete",
          description: err?.message ?? "The saved analysis is still there.",
          variant: "error",
        });
        return { ok: false, error: err };
      }
    },
    [uid, savedAnalyses, toast]
  );

  // ---- CSV export -------------------------------------------------------------------
  const handleExportCsv = useCallback(() => {
    const rows = visibleItems.length ? visibleItems : items;
    if (rows.length === 0) {
      toast?.({ title: "Nothing to export", description: "No market rows are loaded.", variant: "info" });
      return false;
    }
    const ok = exportMarketCsv(rows, { period: feed?.period ?? null });
    toast?.({
      title: ok ? "CSV exported" : "Export failed",
      description: ok ? `${rows.length} commodities written to your downloads.` : "The browser blocked the download.",
      variant: ok ? "success" : "error",
    });
    return ok;
  }, [visibleItems, items, feed, toast]);

  return {
    // feed
    feed,
    items,
    visibleItems,
    providers: feed?.providers ?? [],
    period: feed?.period ?? null,
    generatedAt: feed?.generatedAt ?? null,
    loading,
    refreshing,
    error,
    refresh,
    retry: () => load(),
    // filters
    filters,
    patchFilters,
    resetFilters,
    categories,
    prefsReady,
    // derived
    stats,
    // favorites
    uid,
    favorites: mergedFavorites,
    favoriteItems,
    favoriteIds,
    favoritesLoading,
    favoriteBusy,
    toggleFavorite,
    updateFavorite,
    clearFavorites,
    reloadFavorites: loadFavorites,
    // alerts
    alerts: activeAlerts,
    dismissAlert,
    // compare
    compareIds,
    comparedItems,
    toggleCompare,
    clearCompare,
    // ai
    insights,
    runMarketInsights,
    commodityAI,
    runCommodityInsights,
    savedAnalyses,
    removeAnalysis,
    // misc
    exportCsv: handleExportCsv,
  };
}
