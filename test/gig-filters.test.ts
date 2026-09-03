import { describe, it, expect } from "vitest";
import type { Gig } from "@/types";
import {
  isGigUnpaid,
  isGigPaid,
  isGigTentative,
  isGigConfirmed,
  isGigCancelled,
  isGigCharity,
  matchesSearchText,
  calculateGigKpis,
  applyGigFilters,
} from "@/lib/gig-filters";

describe("Gig Filter Predicates", () => {
  describe("isGigUnpaid", () => {
    it("returns true when paymentStatus is 'unpaid' or 'pending'", () => {
      const gigUnpaid = { id: "1", paymentStatus: "unpaid", paymentReceived: false } as unknown as Gig;
      const gigPending = { id: "2", paymentStatus: "pending", paymentReceived: false } as unknown as Gig;
      expect(isGigUnpaid(gigUnpaid)).toBe(true);
      expect(isGigUnpaid(gigPending)).toBe(true);
    });

    it("returns false when paymentStatus is 'paid'", () => {
      const gig = { id: "1", paymentStatus: "paid", paymentReceived: false } as unknown as Gig;
      expect(isGigUnpaid(gig)).toBe(false);
    });

    it("returns false when paymentReceived is true", () => {
      const gig = { id: "1", paymentReceived: true, performanceFee: 500 } as Gig;
      expect(isGigUnpaid(gig)).toBe(false);
    });

    it("returns true when fee > 0 and paymentReceived is false", () => {
      const gigPerf = { id: "1", paymentReceived: false, performanceFee: 250, technicalFee: 0 } as Gig;
      const gigTech = { id: "2", paymentReceived: false, performanceFee: 0, technicalFee: 150 } as Gig;
      expect(isGigUnpaid(gigPerf)).toBe(true);
      expect(isGigUnpaid(gigTech)).toBe(true);
    });

    it("returns true when performanceFeeUnknown is true and not paid", () => {
      const gig = { id: "1", paymentReceived: false, performanceFee: 0, performanceFeeUnknown: true } as Gig;
      expect(isGigUnpaid(gig)).toBe(true);
    });

    it("returns false for charity with 0 fee when paymentReceived is false", () => {
      const gig = { id: "1", isCharity: true, paymentReceived: false, performanceFee: 0, technicalFee: 0 } as Gig;
      expect(isGigUnpaid(gig)).toBe(false);
    });

    it("returns true for regular gig with 0 fee when paymentReceived is false", () => {
      const gig = { id: "1", isCharity: false, paymentReceived: false, performanceFee: 0, technicalFee: 0 } as Gig;
      expect(isGigUnpaid(gig)).toBe(true);
    });
  });

  describe("isGigPaid", () => {
    it("returns true when paymentReceived is true", () => {
      const gig = { id: "1", paymentReceived: true } as Gig;
      expect(isGigPaid(gig)).toBe(true);
    });

    it("returns true when paymentStatus is 'paid'", () => {
      const gig = { id: "1", paymentStatus: "paid", paymentReceived: false } as unknown as Gig;
      expect(isGigPaid(gig)).toBe(true);
    });

    it("returns false when paymentStatus is 'unpaid' even if paymentReceived is true", () => {
      const gig = { id: "1", paymentStatus: "unpaid", paymentReceived: true } as unknown as Gig;
      expect(isGigPaid(gig)).toBe(false);
    });

    it("returns false when paymentReceived is false", () => {
      const gig = { id: "1", paymentReceived: false } as Gig;
      expect(isGigPaid(gig)).toBe(false);
    });
  });

  describe("isGigTentative & isGigConfirmed", () => {
    it("identifies tentative gigs from boolean isTentative", () => {
      const gig = { id: "1", isTentative: true } as Gig;
      expect(isGigTentative(gig)).toBe(true);
      expect(isGigConfirmed(gig)).toBe(false);
    });

    it("identifies tentative gigs from status property", () => {
      const gigTentative = { id: "1", isTentative: false, status: "tentative" } as unknown as Gig;
      const gigOption = { id: "2", isTentative: false, status: "option" } as unknown as Gig;
      expect(isGigTentative(gigTentative)).toBe(true);
      expect(isGigTentative(gigOption)).toBe(true);
      expect(isGigConfirmed(gigTentative)).toBe(false);
      expect(isGigConfirmed(gigOption)).toBe(false);
    });

    it("identifies confirmed gigs correctly", () => {
      const gig = { id: "1", isTentative: false } as Gig;
      expect(isGigTentative(gig)).toBe(false);
      expect(isGigConfirmed(gig)).toBe(true);
    });

    it("respects cancelled gigs as not confirmed", () => {
      const gig = { id: "1", isTentative: false, status: "cancelled" } as unknown as Gig;
      expect(isGigConfirmed(gig)).toBe(false);
      expect(isGigCancelled(gig)).toBe(true);
    });
  });

  describe("matchesSearchText", () => {
    const gig = {
      id: "1",
      eventName: "Summer Jazz Gala",
      performers: "The Velvet Trio",
      notes: "Stage in the garden area",
      performanceLineup: "Piano, Sax, Drums",
      venue: "Grand Ballroom",
      city: "Brussels",
    } as unknown as Gig;

    it("matches event name case-insensitively", () => {
      expect(matchesSearchText(gig, "jazz")).toBe(true);
      expect(matchesSearchText(gig, "SUMMER")).toBe(true);
    });

    it("matches performers / band name", () => {
      expect(matchesSearchText(gig, "velvet")).toBe(true);
    });

    it("matches venue and city", () => {
      expect(matchesSearchText(gig, "ballroom")).toBe(true);
      expect(matchesSearchText(gig, "brussels")).toBe(true);
    });

    it("returns false when query does not match", () => {
      expect(matchesSearchText(gig, "rock festival")).toBe(false);
    });
  });

  describe("calculateGigKpis", () => {
    const now = new Date("2026-09-01T12:00:00Z");
    const gigs: Gig[] = [
      {
        id: "1",
        date: "2026-09-10T12:00:00Z",
        isTentative: false,
        paymentReceived: false,
        performanceFee: 500,
        technicalFee: 100,
      } as Gig,
      {
        id: "2",
        date: "2026-09-15T12:00:00Z",
        isTentative: true,
        paymentReceived: false,
        performanceFee: 300,
        technicalFee: 0,
      } as Gig,
      {
        id: "3",
        date: "2026-08-01T12:00:00Z", // Past gig
        isTentative: false,
        paymentReceived: true,
        performanceFee: 400,
        technicalFee: 0,
      } as Gig,
    ];

    it("calculates correct KPIs", () => {
      const kpis = calculateGigKpis(gigs, now);
      expect(kpis.totalCount).toBe(3);
      expect(kpis.upcomingCount).toBe(2);
      expect(kpis.unpaidCount).toBe(2);
      expect(kpis.unpaidTotalAmount).toBe(900); // 600 + 300
      expect(kpis.tentativeCount).toBe(1);
      expect(kpis.confirmedCount).toBe(2);
    });
  });

  describe("applyGigFilters - Strict Logical AND", () => {
    const now = new Date("2026-09-01T12:00:00Z");
    const gigs: Gig[] = [
      {
        id: "1",
        eventName: "Club Night",
        performers: "DJ Shadow",
        date: "2026-09-10T12:00:00Z",
        isTentative: false,
        paymentReceived: true,
      } as Gig,
      {
        id: "2",
        eventName: "Acoustic Evening",
        performers: "The Velvet Trio",
        date: "2026-09-12T12:00:00Z",
        isTentative: true,
        paymentReceived: false,
        performanceFee: 300,
      } as Gig,
      {
        id: "3",
        eventName: "Jazz Fest",
        performers: "The Velvet Trio",
        date: "2026-09-15T12:00:00Z",
        isTentative: false,
        paymentReceived: false,
        performanceFee: 800,
      } as Gig,
      {
        id: "4",
        eventName: "Past Gala",
        performers: "The Velvet Trio",
        date: "2026-08-01T12:00:00Z",
        isTentative: false,
        paymentReceived: true,
      } as Gig,
    ];

    it("filters strictly by unpaid", () => {
      const res = applyGigFilters(gigs, {
        statusFilters: new Set(["unpaid"]),
      }, now);
      expect(res.map((g) => g.id)).toEqual(["2", "3"]);
    });

    it("filters strictly by tentative", () => {
      const res = applyGigFilters(gigs, {
        statusFilters: new Set(["tentative"]),
      }, now);
      expect(res.map((g) => g.id)).toEqual(["2"]);
    });

    it("combines artist AND unpaid AND tentative using strict logical AND", () => {
      const res = applyGigFilters(gigs, {
        selectedArtists: new Set(["The Velvet Trio"]),
        statusFilters: new Set(["unpaid", "tentative"]),
      }, now);
      // Only gig 2 is Velvet Trio AND unpaid AND tentative
      expect(res.map((g) => g.id)).toEqual(["2"]);
    });

    it("combines hidePastGigs with status filters", () => {
      const res = applyGigFilters(gigs, {
        selectedArtists: new Set(["The Velvet Trio"]),
        hidePastGigs: true,
      }, now);
      // Gigs 2 and 3 are upcoming; gig 4 is past
      expect(res.map((g) => g.id)).toEqual(["2", "3"]);
    });

    it("combines search text with status", () => {
      const res = applyGigFilters(gigs, {
        searchText: "Fest",
        statusFilters: new Set(["unpaid"]),
      }, now);
      expect(res.map((g) => g.id)).toEqual(["3"]);
    });
  });
});
