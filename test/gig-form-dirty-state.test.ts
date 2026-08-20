import { describe, expect, it } from "vitest";
import { hasGigFormChanges } from "@/lib/gig-form-dirty-state";

describe("gig form dirty-state guard", () => {
  it("detects changes when required fields or payment data differ", () => {
    const initial = {
      eventName: "Moonlight Jazz",
      date: "2026-08-20",
      performers: "The Blue Notes",
      numberOfMusicians: 3,
      performanceLineup: "Alice, Bob",
      managerPerforms: true,
      isCharity: false,
      isTentative: false,
      performanceFee: 1200,
      performanceFeeUnknown: false,
      technicalFee: 150,
      managerBonusType: "fixed",
      managerBonusAmount: 100,
      performanceDistribution: "equal",
      managerPerformanceAmount: null,
      claimPerformanceFee: true,
      claimTechnicalFee: true,
      technicalFeeClaimAmount: null,
      managerHandlesDistribution: true,
      advanceReceivedByManager: 0,
      advanceToMusicians: 0,
      paymentReceived: false,
      paymentReceivedDate: "",
      managerInstantPayment: false,
      bandPaid: false,
      bandPaidDate: "",
      bookingDate: "2026-08-10",
      notes: "",
      bandId: null,
      bandMemberIds: [],
    } as any;

    const changed = {
      ...initial,
      performanceFee: 1400,
      notes: "Updated note",
      bandPaid: true,
      bandPaidDate: "2026-08-21",
    };

    expect(hasGigFormChanges(initial, changed)).toBe(true);
    expect(hasGigFormChanges(initial, initial)).toBe(false);
  });
});
