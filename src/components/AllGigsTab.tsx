"use client";

import { useState, useMemo, useDeferredValue, useEffect } from "react";
import type { Gig } from "@/types";
import GigCard from "./GigCard";
import BandTag from "./BandTag";
import { useSettings } from "./SettingsProvider";
import { Icons } from "./Icons";

interface AllGigsTabProps {
  gigs: Gig[];
  onEdit: (gig: Gig) => void;
  fmtCurrency: (amount: number) => string;
  loading: boolean;
}

type SortOption = "date-asc" | "date-desc" | "band-asc" | "band-desc" | "fee-high" | "fee-low" | "payment-status" | "chronology";

export default function AllGigsTab({
  gigs,
  onEdit,
  fmtCurrency,
  loading,
}: AllGigsTabProps) {
  const { language } = useSettings();
  const PAGE_SIZE = 24;
  const [sortBy, setSortBy] = useState<SortOption>("chronology");
  const [selectedArtists, setSelectedArtists] = useState<Set<string>>(new Set());
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [hidePastGigs, setHidePastGigs] = useState(false);
  const [globalExpandState, setGlobalExpandState] = useState<boolean | undefined>(undefined);
  const [showCharity, setShowCharity] = useState(true);
  const [showTentative, setShowTentative] = useState(true);
  const [showPaid, setShowPaid] = useState(true);
  const [showUnpaid, setShowUnpaid] = useState(true);
  const deferredGigs = useDeferredValue(gigs);

  const copy = language === "nl"
    ? {
        noPerformancesYet: "Nog geen optredens",
        sortBy: "Sorteer op",
        newestFirst: "Nieuwste eerst",
        oldestFirst: "Oudste eerst",
        bandAz: "Band A-Z",
        bandZa: "Band Z-A",
        highestFee: "Hoogste vergoeding",
        lowestFee: "Laagste vergoeding",
        paymentStatus: "Betaalstatus",
        chronology: "Chronologie (voorbije onderaan)",
        filterByArtist: "Filter op artiest",
        clearAll: "Alles wissen",
        performances: "optredens",
        noMatches: "Geen optredens komen overeen met je filters",
        loadMore: "Meer laden",
        left: "over",
        hidePastGigs: "Verbergen voorbije optredens",
        expandAll: "Alles uitklappen",
        collapseAll: "Alles inklappen",
        showCharity: "Charity",
        showTentative: "Tentative",
        paid: "Betaald",
        unpaid: "Niet betaald",
        filters: "Filters",
      }
    : {
        noPerformancesYet: "No performances yet",
        sortBy: "Sort by",
        newestFirst: "Newest First",
        oldestFirst: "Oldest First",
        bandAz: "Band A-Z",
        bandZa: "Band Z-A",
        highestFee: "Highest Fee",
        lowestFee: "Lowest Fee",
        paymentStatus: "Payment Status",
        chronology: "Chronology (past at bottom)",
        filterByArtist: "Filter by Artist",
        clearAll: "Clear all",
        performances: "performances",
        noMatches: "No performances match your filters",
        loadMore: "Load more",
        left: "left",
        hidePastGigs: "Hide past performances",
        expandAll: "Expand all",
        collapseAll: "Collapse all",
        showCharity: "Charity",
        showTentative: "Tentative",
        paid: "Paid",
        unpaid: "Unpaid",
        filters: "Filters",
      };

  // Get all unique artists
  const artists = useMemo(() => {
    const unique = new Set<string>();
    deferredGigs.forEach((gig) => {
      if (gig.performers) unique.add(gig.performers);
    });
    return Array.from(unique).sort();
  }, [deferredGigs]);

  // Filter by selected artists, hide past gigs, payment status, and gig types
  const filteredGigs = useMemo(() => {
    let filtered = deferredGigs;

    // Filter by artists
    if (selectedArtists.size > 0) {
      filtered = filtered.filter((gig) => selectedArtists.has(gig.performers));
    }

    // Filter past gigs if toggle is enabled
    if (hidePastGigs) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      filtered = filtered.filter((gig) => new Date(gig.date) >= today);
    }

    // Filter by gig type (charity and tentative)
    filtered = filtered.filter((gig) => {
      const isCharity = gig.isCharity;
      const isTentative = gig.isTentative;

      // If both filters are off, exclude both
      if (!showCharity && !showTentative && (isCharity || isTentative)) return false;
      // If only showing charity, exclude non-charity
      if (showCharity && !showTentative && !isCharity && isTentative) return false;
      // If only showing tentative, exclude non-tentative
      if (!showCharity && showTentative && isCharity) return false;
      return true;
    });

    // Filter by payment status
    filtered = filtered.filter((gig) => {
      const isPaid = gig.paymentReceived;
      if (isPaid && !showPaid) return false;
      if (!isPaid && !showUnpaid) return false;
      return true;
    });

    return filtered;
  }, [deferredGigs, selectedArtists, hidePastGigs, showCharity, showTentative, showPaid, showUnpaid]);

  // Sort
  const sortedGigs = useMemo(() => {
    const sorted = [...filteredGigs];

    switch (sortBy) {
      case "date-desc":
        sorted.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        break;
      case "date-asc":
        sorted.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        break;
      case "band-asc":
        sorted.sort((a, b) => a.performers.localeCompare(b.performers) || new Date(b.date).getTime() - new Date(a.date).getTime());
        break;
      case "band-desc":
        sorted.sort((a, b) => b.performers.localeCompare(a.performers) || new Date(b.date).getTime() - new Date(a.date).getTime());
        break;
      case "fee-high":
        sorted.sort(
          (a, b) =>
            (b.performanceFee + b.technicalFee) -
            (a.performanceFee + a.technicalFee)
        );
        break;
      case "fee-low":
        sorted.sort(
          (a, b) =>
            (a.performanceFee + a.technicalFee) -
            (b.performanceFee + b.technicalFee)
        );
        break;
      case "payment-status":
        sorted.sort((a, b) => {
          const aScore = (a.paymentReceived ? 2 : 0) + (a.bandPaid ? 1 : 0);
          const bScore = (b.paymentReceived ? 2 : 0) + (b.bandPaid ? 1 : 0);
          return bScore - aScore || new Date(b.date).getTime() - new Date(a.date).getTime();
        });
        break;
      case "chronology": {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const future = sorted.filter((g) => new Date(g.date) >= today);
        const past = sorted.filter((g) => new Date(g.date) < today);
        future.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        past.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return [...future, ...past];
      }
    }

    return sorted;
  }, [filteredGigs, sortBy]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [sortBy, selectedArtists, hidePastGigs, showCharity, showTentative, showPaid, showUnpaid, deferredGigs.length]);

  const visibleGigs = useMemo(
    () => sortedGigs.slice(0, visibleCount),
    [sortedGigs, visibleCount]
  );

  const remainingCount = Math.max(0, sortedGigs.length - visibleCount);

  const toggleArtist = (artist: string) => {
    const updated = new Set(selectedArtists);
    if (updated.has(artist)) {
      updated.delete(artist);
    } else {
      updated.add(artist);
    }
    setSelectedArtists(updated);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Icons.Spinner className="h-8 w-8 text-brand-600" />
      </div>
    );
  }

  if (gigs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 py-20 text-center">
        <Icons.Music2 className="mb-4 h-12 w-12 text-slate-300 dark:text-slate-600" />
        <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">
          {copy.noPerformancesYet}
        </h3>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* -- Controls: Sort & Filter ---------------------------------------- */}
      <div className="space-y-4">
        {/* Sort dropdown */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            {copy.sortBy}
          </label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="block w-full max-w-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-sm focus:border-brand-500 dark:focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          >
            <option value="date-desc">{copy.newestFirst}</option>
            <option value="date-asc">{copy.oldestFirst}</option>
            <option value="band-asc">{copy.bandAz}</option>
            <option value="band-desc">{copy.bandZa}</option>
            <option value="fee-high">{copy.highestFee}</option>
            <option value="fee-low">{copy.lowestFee}</option>
            <option value="payment-status">{copy.paymentStatus}</option>
            <option value="chronology">{copy.chronology}</option>
          </select>
        </div>

        {/* Expand/Collapse All & Hide past gigs toggle */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setGlobalExpandState(true)}
            className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 bg-white dark:bg-slate-800 transition"
            title={copy.expandAll}
          >
            {copy.expandAll}
          </button>
          <button
            onClick={() => setGlobalExpandState(false)}
            className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 bg-white dark:bg-slate-800 transition"
            title={copy.collapseAll}
          >
            {copy.collapseAll}
          </button>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={hidePastGigs}
              onChange={(e) => setHidePastGigs(e.target.checked)}
              className="w-4 h-4 rounded border border-slate-300 dark:border-slate-600 text-brand-600 focus:ring-2 focus:ring-brand-500/20 cursor-pointer"
            />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {copy.hidePastGigs}
            </span>
          </label>
        </div>

        {/* Payment & Gig Type Filters */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">
            {copy.filters}
          </p>
          <div className="flex flex-wrap gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showPaid}
                onChange={(e) => setShowPaid(e.target.checked)}
                className="w-4 h-4 rounded border border-slate-300 dark:border-slate-600 text-green-600 focus:ring-2 focus:ring-green-500/20 cursor-pointer"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">{copy.paid}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showUnpaid}
                onChange={(e) => setShowUnpaid(e.target.checked)}
                className="w-4 h-4 rounded border border-slate-300 dark:border-slate-600 text-orange-600 focus:ring-2 focus:ring-orange-500/20 cursor-pointer"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">{copy.unpaid}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showCharity}
                onChange={(e) => setShowCharity(e.target.checked)}
                className="w-4 h-4 rounded border border-slate-300 dark:border-slate-600 text-red-600 focus:ring-2 focus:ring-red-500/20 cursor-pointer"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">💕 {copy.showCharity}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showTentative}
                onChange={(e) => setShowTentative(e.target.checked)}
                className="w-4 h-4 rounded border border-slate-300 dark:border-slate-600 text-yellow-600 focus:ring-2 focus:ring-yellow-500/20 cursor-pointer"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">⏳ {copy.showTentative}</span>
            </label>
          </div>
        </div>

        {/* Artist filter buttons */}
        {artists.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                {copy.filterByArtist}
              </label>
              {selectedArtists.size > 0 && (
                <button
                  onClick={() => setSelectedArtists(new Set())}
                  className="text-xs text-brand-600 dark:text-brand-400 hover:underline"
                >
                  {copy.clearAll}
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {artists.map((artist) => (
                <button
                  key={artist}
                  onClick={() => toggleArtist(artist)}
                  className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition ${selectedArtists.has(artist) ? "badge-enter" : ""} ${
                    selectedArtists.has(artist)
                      ? "bg-brand-600 text-white dark:bg-brand-500"
                      : "border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-slate-400 dark:hover:border-slate-500 bg-white dark:bg-slate-800"
                  }`}
                >
                  <BandTag name={artist} variant={selectedArtists.has(artist) ? "solid" : "soft"} />
                  {selectedArtists.has(artist) && (
                    <Icons.Check className="ml-1.5 h-3 w-3" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* -- Results -------------------------------------------------------- */}
      <div className="space-y-1">
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          {sortedGigs.length} of {deferredGigs.length} {copy.performances}
        </p>
      </div>

      {sortedGigs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 dark:border-slate-700 py-12 text-center">
          <Icons.AlertCircle className="mb-3 h-8 w-8 text-slate-300 dark:text-slate-600" />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {copy.noMatches}
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-5">
          {visibleGigs.map((gig, idx) => (
            <div key={gig.id} className={`animate-fade-in animate-stagger-${Math.min(idx + 1, 10)}`}>
              <GigCard
                gig={gig}
                onEdit={onEdit}
                fmtCurrency={fmtCurrency}
                claimPerformanceFee={gig.claimPerformanceFee}
                claimTechnicalFee={gig.claimTechnicalFee}
                isExpandedGlobal={globalExpandState}
              />
            </div>
          ))}
          </div>

          {remainingCount > 0 && (
            <div className="flex justify-center pt-2">
              <button
                onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
                className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                {copy.loadMore} ({remainingCount} {copy.left})
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
