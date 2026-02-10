import type { GigCalculations } from "@/types";

/**
 * Core financial calculations for a gig.
 *
 * Rules:
 *  - Performance fee is split **evenly** among all musicians (including the manager).
 *  - Manager bonus is added on top and goes entirely to the manager.
 *  - Technical fee is **not** split — it belongs to the manager.
 *  - "Amount owed to others" = the shares that must be paid to the other musicians.
 */
export function calculateGigFinancials(
  performanceFee: number,
  technicalFee: number,
  managerBonusType: "fixed" | "percentage",
  managerBonusAmount: number,
  numberOfMusicians: number
): GigCalculations {
  const actualManagerBonus =
    managerBonusType === "percentage"
      ? performanceFee * (managerBonusAmount / 100)
      : managerBonusAmount;

  const totalReceived = performanceFee + technicalFee + actualManagerBonus;
  const amountPerMusician =
    numberOfMusicians > 0 ? performanceFee / numberOfMusicians : 0;
  const myEarnings = amountPerMusician + technicalFee + actualManagerBonus;
  const amountOwedToOthers =
    numberOfMusicians > 1 ? (numberOfMusicians - 1) * amountPerMusician : 0;

  return {
    actualManagerBonus: round(actualManagerBonus),
    totalReceived: round(totalReceived),
    amountPerMusician: round(amountPerMusician),
    myEarnings: round(myEarnings),
    amountOwedToOthers: round(amountOwedToOthers),
  };
}

// ─── Formatting helpers ──────────────────────────────────────────────────────

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ─── Internal ────────────────────────────────────────────────────────────────

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
