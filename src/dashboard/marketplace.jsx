import { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  CloudOff,
  SearchX,
  AlertTriangle,
  Info,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ToastProvider } from "@/components/ui/toast";
import { useToast } from "@/components/ui/useToast";
import { useAuth } from "../features/auth/authContext";
import useMarketRates from "./marketplace/useMarketRates";
import MarketHeader from "./marketplace/MarketHeader";
import MarketStats from "./marketplace/MarketStats";
import MarketFilters from "./marketplace/MarketFilters";
import MarketRateTable from "./marketplace/MarketRateTable";
import MarketRateGrid from "./marketplace/MarketRateGrid";
import PriceAlertBanner from "./marketplace/PriceAlertBanner";
import FavoritesPanel from "./marketplace/FavoritesPanel";
import ComparePanel from "./marketplace/ComparePanel";
import MarketAIInsights from "./marketplace/MarketAIInsights";
import CommodityDetailDialog from "./marketplace/CommodityDetailDialog";

// Global Market Rates page — world commodity prices from the market feed
// (VITE_MARKET_API_URL) with a Firestore-backed watchlist, price alerts,
// comparison and AI decision support via the EXISTING dashboard AI endpoint.
// Nothing on this page writes to any other feature's Firestore data.
function MarketplaceInner() {
  const { userData, userCropData } = useOutletContext();
  const { currentUser } = useAuth();
  const { toast } = useToast();

  // Same location string the chatbot sends — never "undefined undefined".
  const location = useMemo(() => {
    const parts = [userData?.personaluser?.City, userData?.personaluser?.Country].filter(Boolean);
    return parts.join(" ") || null;
  }, [userData]);

  const crops = useMemo(() => userCropData?.crops ?? [], [userCropData]);

  const page = useMarketRates({
    uid: currentUser?.uid ?? null,
    crops,
    location,
    toast,
  });

  const [detail, setDetail] = useState(null); // commodity shown in the dialog

  const openItem = (item) => {
    if (item?.id) setDetail(item);
  };

  const detailFavorite = useMemo(
    () => (detail ? page.favorites.find((f) => f.itemId === detail.id) ?? null : null),
    [detail, page.favorites]
  );

  const detailCategoryStats = useMemo(
    () => (detail ? page.stats.categories.find((c) => c.category === detail.category) ?? null : null),
    [detail, page.stats.categories]
  );

  const handleRefresh = () => {
    page.refresh();
    toast({
      title: "Refreshing market rates",
      description: "Pulling the latest commodity quotes.",
      variant: "info",
    });
  };

  // ---- 1. Page header ----------------------------------------------------------
  const headerCard = (
    <MarketHeader
      period={page.period}
      generatedAt={page.generatedAt}
      providers={page.providers}
      itemCount={page.items.length}
      favoriteCount={page.favorites.length}
      loading={page.loading}
      refreshing={page.refreshing}
      autoRefreshMinutes={page.filters.autoRefreshMinutes}
      onAutoRefreshChange={(minutes) => page.patchFilters({ autoRefreshMinutes: minutes })}
      onRefresh={handleRefresh}
      onExport={page.exportCsv}
    />
  );

  // ---- Loading state -------------------------------------------------------------
  if (page.loading && !page.feed) {
    return (
      <div className="scrollbar-thin scrollbar-thumb-[#679936] scrollbar-track-[#F2DEC4] flex-6 h-screen overflow-y-auto overflow-x-hidden p-3 sm:p-4">
        <div className="w-full max-w-[1280px] mx-auto grid gap-3 content-start min-w-0">
          {headerCard}
          <Skeleton className="h-24 w-full" />
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-[420px] w-full" />
        </div>
      </div>
    );
  }

  // ---- Hard error state (nothing to show) ------------------------------------------
  if (page.error && !page.feed) {
    return (
      <div className="scrollbar-thin scrollbar-thumb-[#679936] scrollbar-track-[#F2DEC4] flex-6 h-screen overflow-y-auto overflow-x-hidden p-3 sm:p-4">
        <div className="w-full max-w-[1280px] mx-auto grid gap-3 content-start min-w-0">
          {headerCard}
          <Card>
            <CardContent className="grid gap-2 justify-items-center text-center py-8">
              <CloudOff size={34} className="text-black/30" aria-hidden="true" />
              <p className="text-[15px] font-semibold text-black">Market feed unavailable</p>
              <p className="text-[12px] text-black/55 max-w-[440px]">{page.error.message}</p>
              <button
                type="button"
                onClick={page.retry}
                className="rounded-xl bg-[var(--text1)] px-3 py-1.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#4a7028] cursor-pointer"
              >
                Try again
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ---- Main page ---------------------------------------------------------------------
  return (
    <div className="scrollbar-thin scrollbar-thumb-[#679936] scrollbar-track-[#F2DEC4] flex-6 h-screen overflow-y-auto overflow-x-hidden p-3 sm:p-4">
      <div className="w-full max-w-[1280px] mx-auto grid gap-3 content-start min-w-0">
        {headerCard}

        {/* Soft error — a failed refresh keeps the last good quotes on screen */}
        {page.error ? (
          <Card className="min-w-0 border-red-200 bg-red-50/60 py-3">
            <CardContent className="flex flex-wrap items-center gap-2">
              <AlertTriangle size={16} className="shrink-0 text-red-600" aria-hidden="true" />
              <p className="min-w-0 flex-1 text-[12px] text-black/70">
                <strong className="font-bold text-red-700">Could not refresh the feed.</strong>{" "}
                {page.error.message} Showing the last successful quotes instead.
              </p>
              <button
                type="button"
                onClick={page.retry}
                className="shrink-0 rounded-lg bg-red-600 px-2.5 py-1 text-[12px] font-semibold text-white transition-colors hover:bg-red-700 cursor-pointer"
              >
                Retry
              </button>
            </CardContent>
          </Card>
        ) : null}

        {!page.uid ? (
          <Card className="min-w-0 border-amber-200 bg-amber-50/60 py-3">
            <CardContent className="flex items-start gap-2">
              <Info size={16} className="mt-0.5 shrink-0 text-amber-700" aria-hidden="true" />
              <p className="text-[12px] leading-4 text-black/70">
                Sign in to keep a watchlist, price alerts and saved AI analyses —
                they are stored against your account.
              </p>
            </CardContent>
          </Card>
        ) : null}

        {/* 2. Watchlist price alerts */}
        <PriceAlertBanner alerts={page.alerts} onDismiss={page.dismissAlert} onOpen={openItem} />

        {/* 3. Market summary + category performance */}
        <MarketStats
          stats={page.stats}
          onSelectCategory={(category) =>
            page.patchFilters({ category: page.filters.category === category ? "all" : category })
          }
        />

        {/* 4. Search / filter / sort / view controls */}
        <MarketFilters
          filters={page.filters}
          categories={page.categories}
          resultCount={page.visibleItems.length}
          totalCount={page.items.length}
          favoriteCount={page.favorites.length}
          onPatch={page.patchFilters}
          onReset={page.resetFilters}
        />

        {/* 5. Market rates — table or card view */}
        {page.visibleItems.length === 0 ? (
          <Card>
            <CardContent className="grid gap-2 justify-items-center py-8 text-center">
              <SearchX size={30} className="text-black/25" aria-hidden="true" />
              <p className="text-[14px] font-semibold text-black">No commodities match these filters</p>
              <p className="max-w-[380px] text-[12px] text-black/55">
                Try a different search term, or clear the category and movement filters.
              </p>
              <button
                type="button"
                onClick={page.resetFilters}
                className="rounded-xl bg-[var(--text1)] px-3 py-1.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#4a7028] cursor-pointer"
              >
                Reset filters
              </button>
            </CardContent>
          </Card>
        ) : page.filters.view === "cards" ? (
          <MarketRateGrid
            items={page.visibleItems}
            favoriteIds={page.favoriteIds}
            favoriteBusy={page.favoriteBusy}
            compareIds={page.compareIds}
            onToggleFavorite={page.toggleFavorite}
            onToggleCompare={page.toggleCompare}
            onOpen={openItem}
          />
        ) : (
          <MarketRateTable
            items={page.visibleItems}
            favoriteIds={page.favoriteIds}
            favoriteBusy={page.favoriteBusy}
            compareIds={page.compareIds}
            onToggleFavorite={page.toggleFavorite}
            onToggleCompare={page.toggleCompare}
            onOpen={openItem}
          />
        )}

        {/* 6. AI insights + watchlist/comparison workspace */}
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] min-w-0">
          <MarketAIInsights
            insights={page.insights}
            onRun={page.runMarketInsights}
            savedAnalyses={page.savedAnalyses}
            onDeleteAnalysis={page.removeAnalysis}
            disabled={page.items.length === 0}
          />

          <div className="grid gap-3 content-start min-w-0">
            <FavoritesPanel
              favorites={page.favorites}
              loading={page.favoritesLoading}
              favoriteBusy={page.favoriteBusy}
              onUpdate={page.updateFavorite}
              onRemove={(fav) =>
                page.toggleFavorite(fav.live ?? { id: fav.itemId, name: fav.name })
              }
              onOpen={openItem}
              onAnalyze={(item) => {
                openItem(item);
                page.runCommodityInsights(item);
              }}
              onClearAll={page.clearFavorites}
            />

            <ComparePanel
              items={page.comparedItems}
              onRemove={page.toggleCompare}
              onClear={page.clearCompare}
              onOpen={openItem}
            />
          </div>
        </div>

        <p className="pb-3 text-[11px] text-black/40 leading-4">
          Global Market Rates shows published world commodity reference prices
          from the connected data providers. Quotes are monthly or annual
          reference values, not live exchange prices, and some rows lag behind
          the newest period. AI output is decision support only — never
          financial advice.
        </p>
      </div>

      <CommodityDetailDialog
        key={detail?.id ?? "closed"}
        item={detail}
        open={Boolean(detail)}
        onOpenChange={(open) => !open && setDetail(null)}
        isFavorite={page.favoriteIds.has(detail?.id)}
        favorite={detailFavorite}
        favoriteBusy={detail ? page.favoriteBusy.has(detail.id) : false}
        isComparing={detail ? page.compareIds.includes(detail.id) : false}
        categoryStats={detailCategoryStats}
        ai={page.commodityAI}
        onToggleFavorite={page.toggleFavorite}
        onToggleCompare={page.toggleCompare}
        onAnalyze={page.runCommodityInsights}
      />
    </div>
  );
}

export default function MarketplacePage() {
  return (
    <ToastProvider>
      <MarketplaceInner />
    </ToastProvider>
  );
}
