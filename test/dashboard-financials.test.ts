import { describe, expect, it } from "vitest";
import { summarizeDashboardFinancials } from "@/lib/dashboard-financials";

describe("dashboard financial summary", () => {
  it("counts income as received only after the band payout has been marked", () => {
    const gigs = [
      {
        id: "client-paid-but-unpaid",
        paymentReceived: true,
        bandPaid: false,
        bandPaidDate: null,
        performanceFee: 1000,
        technicalFee: 0,
        managerBonusType: "fixed",
        managerBonusAmount: 0,
        numberOfMusicians: 1,
        claimPerformanceFee: true,
        claimTechnicalFee: false,
        technicalFeeClaimAmount: null,
        advanceReceivedByManager: 0,
        advanceToMusicians: 0,
        isCharity: false,
        performers: "Band A",
        managerHandlesDistribution: false,
      },
      {
        id: "band-paid",
        paymentReceived: true,
        bandPaid: true,
        bandPaidDate: "2026-01-02",
        performanceFee: 2000,
        technicalFee: 0,
        managerBonusType: "fixed",
        managerBonusAmount: 0,
        numberOfMusicians: 1,
        claimPerformanceFee: true,
        claimTechnicalFee: false,
        technicalFeeClaimAmount: null,
        advanceReceivedByManager: 0,
        advanceToMusicians: 0,
        isCharity: false,
        performers: "Band B",
        managerHandlesDistribution: false,
      },
    ] as any;

    const summary = summarizeDashboardFinancials(gigs);

    expect(summary.totalEarningsReceived).toBe(2000);
    expect(summary.totalEarningsPending).toBe(1000);
  });
});
