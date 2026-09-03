import type { Gig } from "@/types";

export type GigStatusFilter =
  | "all"
  | "confirmed"
  | "tentative"
  | "paid"
  | "unpaid"
  | "cancelled"
  | "charity";

export type DatePreset = "all" | "upcoming" | "past" | "this-month" | "this-year" | "custom";

export interface GigFilterCriteria {
  searchText?: string;
  selectedArtists?: Set<string>;
  statusFilters?: Set<GigStatusFilter>; // Can contain one or multiple specific statuses
  datePreset?: DatePreset;
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  hidePastGigs?: boolean;
}

export interface GigKpiSummary {
  totalCount: number;
  upcomingCount: number;
  unpaidCount: number;
  unpaidTotalAmount: number;
  tentativeCount: number;
  confirmedCount: number;
}

/**
 * Accurately evaluates whether a gig is unpaid across all payment states and edge cases.
 */
export function isGigUnpaid(gig: Gig): boolean {
  const g = gig as any;
  const paymentStatus = typeof g.paymentStatus === "string" ? g.paymentStatus.toLowerCase().trim() : undefined;
  
  if (paymentStatus === "unpaid" || paymentStatus === "pending") return true;
  if (paymentStatus === "paid") return false;

  // If gig is marked paid received, it is not unpaid
  if (gig.paymentReceived) return false;

  // Fee calculation
  const perfFee = gig.performanceFee || 0;
  const techFee = gig.technicalFee || 0;
  const customFee = typeof g.fee === "number" ? g.fee : 0;
  const totalFee = perfFee + techFee + customFee;

  // If a monetary fee is attached or unknown, and not paid, it's unpaid
  if (totalFee > 0 && !gig.paymentReceived) return true;
  if (gig.performanceFeeUnknown && !gig.paymentReceived) return true;

  // For regular gigs with paymentReceived === false (excluding pure pro-bono charity with 0 fee)
  if (!gig.isCharity && !gig.paymentReceived) return true;

  return false;
}

/**
 * Accurately evaluates whether a gig is paid.
 */
export function isGigPaid(gig: Gig): boolean {
  const g = gig as any;
  const paymentStatus = typeof g.paymentStatus === "string" ? g.paymentStatus.toLowerCase().trim() : undefined;

  if (paymentStatus === "paid") return true;
  if (paymentStatus === "unpaid" || paymentStatus === "pending") return false;

  return !!gig.paymentReceived;
}

/**
 * Accurately matches tentative or option status.
 */
export function isGigTentative(gig: Gig): boolean {
  const g = gig as any;
  const status = typeof g.status === "string" ? g.status.toLowerCase().trim() : undefined;

  if (status === "tentative" || status === "option" || status === "optie") return true;
  if (status === "confirmed" || status === "cancelled") return false;

  return !!gig.isTentative;
}

/**
 * Evaluates whether a gig is confirmed (not tentative, not option, not cancelled).
 */
export function isGigConfirmed(gig: Gig): boolean {
  const g = gig as any;
  const status = typeof g.status === "string" ? g.status.toLowerCase().trim() : undefined;

  if (status === "confirmed") return true;
  if (status === "tentative" || status === "option" || status === "optie" || status === "cancelled") return false;

  return !gig.isTentative && !isGigCancelled(gig);
}

/**
 * Evaluates whether a gig is cancelled.
 */
export function isGigCancelled(gig: Gig): boolean {
  const g = gig as any;
  const status = typeof g.status === "string" ? g.status.toLowerCase().trim() : undefined;

  if (status === "cancelled" || status === "canceled") return true;
  return !!g.isCancelled;
}

/**
 * Evaluates whether a gig is a charity/pro bono gig.
 */
export function isGigCharity(gig: Gig): boolean {
  const g = gig as any;
  return !!gig.isCharity || g.type === "charity";
}

/**
 * Checks if a gig matches a free-text search across all relevant fields.
 */
export function matchesSearchText(gig: Gig, query: string): boolean {
  if (!query || !query.trim()) return true;
  const q = query.toLowerCase().trim();
  const g = gig as any;

  if (gig.eventName && gig.eventName.toLowerCase().includes(q)) return true;
  if (gig.performers && gig.performers.toLowerCase().includes(q)) return true;
  if (gig.notes && gig.notes.toLowerCase().includes(q)) return true;
  if (gig.performanceLineup && gig.performanceLineup.toLowerCase().includes(q)) return true;
  if (gig.band?.name && gig.band.name.toLowerCase().includes(q)) return true;
  if (g.venue && typeof g.venue === "string" && g.venue.toLowerCase().includes(q)) return true;
  if (g.location && typeof g.location === "string" && g.location.toLowerCase().includes(q)) return true;
  if (g.city && typeof g.city === "string" && g.city.toLowerCase().includes(q)) return true;

  return false;
}

/**
 * Calculates KPI metrics for the gigs header.
 */
export function calculateGigKpis(gigs: Gig[], now = new Date()): GigKpiSummary {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  let upcomingCount = 0;
  let unpaidCount = 0;
  let unpaidTotalAmount = 0;
  let tentativeCount = 0;
  let confirmedCount = 0;

  for (const gig of gigs) {
    const gigDate = new Date(gig.date);
    if (!Number.isNaN(gigDate.getTime()) && gigDate >= today) {
      upcomingCount++;
    }

    if (isGigTentative(gig)) {
      tentativeCount++;
    } else if (isGigConfirmed(gig)) {
      confirmedCount++;
    }

    if (isGigUnpaid(gig)) {
      unpaidCount++;
      const fee = (gig.performanceFee || 0) + (gig.technicalFee || 0);
      unpaidTotalAmount += fee;
    }
  }

  return {
    totalCount: gigs.length,
    upcomingCount,
    unpaidCount,
    unpaidTotalAmount,
    tentativeCount,
    confirmedCount,
  };
}

/**
 * Core multi-filter predicate engine combining all criteria using strict logical AND.
 */
export function applyGigFilters(
  gigs: Gig[],
  criteria: GigFilterCriteria,
  now = new Date()
): Gig[] {
  const {
    searchText = "",
    selectedArtists = new Set<string>(),
    statusFilters = new Set<GigStatusFilter>(),
    datePreset = "all",
    startDate,
    endDate,
    hidePastGigs = false,
  } = criteria;

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  return gigs.filter((gig) => {
    // 1. Search Query Filter
    if (!matchesSearchText(gig, searchText)) {
      return false;
    }

    // 2. Artist Filter
    if (selectedArtists.size > 0 && !selectedArtists.has(gig.performers)) {
      return false;
    }

    // 3. Date & Past Gigs Filter
    const gigDate = new Date(gig.date);
    const hasValidDate = !Number.isNaN(gigDate.getTime());

    if (hasValidDate) {
      // Hide past gigs if enabled
      if (hidePastGigs && gigDate < today) {
        return false;
      }

      // Date Presets
      if (datePreset === "upcoming" && gigDate < today) {
        return false;
      }
      if (datePreset === "past" && gigDate >= today) {
        return false;
      }
      if (datePreset === "this-month") {
        if (
          gigDate.getFullYear() !== now.getFullYear() ||
          gigDate.getMonth() !== now.getMonth()
        ) {
          return false;
        }
      }
      if (datePreset === "this-year") {
        if (gigDate.getFullYear() !== now.getFullYear()) {
          return false;
        }
      }

      // Explicit Start Date Range
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (!Number.isNaN(start.getTime()) && gigDate < start) {
          return false;
        }
      }

      // Explicit End Date Range
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (!Number.isNaN(end.getTime()) && gigDate > end) {
          return false;
        }
      }
    }

    // 4. Status Filters (Strict Logical AND across active criteria)
    if (statusFilters.size > 0 && !statusFilters.has("all")) {
      for (const status of statusFilters) {
        if (status === "paid" && !isGigPaid(gig)) return false;
        if (status === "unpaid" && !isGigUnpaid(gig)) return false;
        if (status === "confirmed" && !isGigConfirmed(gig)) return false;
        if (status === "tentative" && !isGigTentative(gig)) return false;
        if (status === "cancelled" && !isGigCancelled(gig)) return false;
        if (status === "charity" && !isGigCharity(gig)) return false;
      }
    }

    return true;
  });
}
