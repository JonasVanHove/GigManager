import { calculateGigFinancials } from "@/lib/calculations";

export type DashboardSummaryLike = {
  totalGigs: number;
  totalEarnings: number;
  totalEarningsReceived: number;
  totalEarningsPending: number;
  pendingClientPayments: number;
  outstandingToBand: number;
  pendingByBand: Array<{ band: string; amount: number; count: number }>;
};

export function summarizeDashboardFinancials<T extends {
  paymentReceived: boolean;
  bandPaid: boolean;
  managerHandlesDistribution: boolean;
  performers?: string | null;
  isCharity: boolean;
  advanceReceivedByManager: number;
  advanceToMusicians: number;
  performanceFee: number;
  technicalFee: number;
  managerBonusType: "fixed" | "percentage";
  managerBonusAmount: number;
  numberOfMusicians: number;
  claimPerformanceFee: boolean;
  claimTechnicalFee: boolean;
  technicalFeeClaimAmount: number | null;
}>(gigs: T[]): DashboardSummaryLike {
  const result = gigs.reduce(
    (acc, g) => {
      const c = calculateGigFinancials(
        g.performanceFee,
        g.technicalFee,
        g.managerBonusType,
        g.managerBonusAmount,
        g.numberOfMusicians,
        g.claimPerformanceFee,
        g.claimTechnicalFee,
        g.technicalFeeClaimAmount,
        g.advanceReceivedByManager,
        g.advanceToMusicians,
        g.isCharity
      );

      acc.totalGigs += 1;
      acc.totalEarnings += c.myEarnings;

      const isMoneyReceived = g.bandPaid;

      if (isMoneyReceived) {
        acc.totalEarningsReceived += c.myEarnings;
      } else {
        acc.totalEarningsReceived += c.myEarningsAlreadyReceived;
        acc.totalEarningsPending += c.myEarningsStillOwed;

        const bandName = g.performers || "Unknown";
        const totalGigValue = c.totalReceived;
        const pendingAmount = Math.max(0, totalGigValue - g.advanceReceivedByManager);
        const existing = acc.pendingByBand.find((b) => b.band === bandName);
        if (existing) {
          existing.amount += pendingAmount;
          existing.count += 1;
        } else {
          acc.pendingByBand.push({
            band: bandName,
            amount: pendingAmount,
            count: 1,
          });
        }
      }

      if (!g.paymentReceived) acc.pendingClientPayments += 1;
      if (!g.bandPaid && g.managerHandlesDistribution) acc.outstandingToBand += c.amountOwedToOthers;

      return acc;
    },
    {
      totalGigs: 0,
      totalEarnings: 0,
      totalEarningsReceived: 0,
      totalEarningsPending: 0,
      pendingClientPayments: 0,
      outstandingToBand: 0,
      pendingByBand: [],
    } as DashboardSummaryLike
  );

  return result;
}
