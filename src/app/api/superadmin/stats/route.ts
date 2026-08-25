import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateGigFinancials } from "@/lib/calculations";
import { requireSuperAdminUser } from "@/lib/superadmin-access";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function toNumber(value: number | null | undefined): number {
  return Number.isFinite(value ?? NaN) ? Number(value) : 0;
}

export async function GET(request: NextRequest) {
  try {
    const result = await requireSuperAdminUser(request);
    if ("error" in result) return result.error;

    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      totalBands,
      totalGigs,
      activeUsers,
      activeBands,
      totalRevenueGigs,
      latestUser,
      latestGig,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.bands.count(),
      prisma.gig.count(),
      prisma.user.count({
        where: {
          OR: [
            { gigs: { some: {} } },
            { bandMembers: { some: {} } },
            { setlists: { some: {} } },
            { createdAt: { gte: ninetyDaysAgo } },
            { updatedAt: { gte: ninetyDaysAgo } },
          ],
        },
      }),
      prisma.bands.count({
        where: {
          OR: [
            { gigs: { some: {} } },
            { setlists: { some: {} } },
            { updatedAt: { gte: ninetyDaysAgo } },
          ],
        },
      }),
      prisma.gig.findMany({
        select: {
          performanceFee: true,
          technicalFee: true,
          managerBonusType: true,
          managerBonusAmount: true,
          numberOfMusicians: true,
          claimPerformanceFee: true,
          claimTechnicalFee: true,
          technicalFeeClaimAmount: true,
          advanceReceivedByManager: true,
          advanceToMusicians: true,
          isCharity: true,
          paymentReceived: true,
          performanceDistribution: true,
          managerPerformanceAmount: true,
        },
      }),
      prisma.user.findFirst({
        orderBy: { createdAt: "desc" },
        select: { id: true, email: true, name: true, createdAt: true },
      }),
      prisma.gig.findFirst({
        orderBy: { createdAt: "desc" },
        select: { id: true, eventName: true, date: true, createdAt: true },
      }),
    ]);

    const totalRevenue = totalRevenueGigs.reduce((sum, gig) => {
      const calc = calculateGigFinancials(
        toNumber(gig.performanceFee),
        toNumber(gig.technicalFee),
        (gig.managerBonusType as "fixed" | "percentage") || "fixed",
        toNumber(gig.managerBonusAmount),
        toNumber(gig.numberOfMusicians),
        gig.claimPerformanceFee ?? true,
        gig.claimTechnicalFee ?? true,
        gig.technicalFeeClaimAmount ?? null,
        toNumber(gig.advanceReceivedByManager),
        toNumber(gig.advanceToMusicians),
        gig.isCharity ?? false,
        (gig.performanceDistribution as "equal" | "managerFixed" | "custom") || "equal",
        gig.managerPerformanceAmount ?? null
      );

      return sum + calc.totalReceived;
    }, 0);

    const receivedRevenue = totalRevenueGigs.reduce((sum, gig) => {
      const calc = calculateGigFinancials(
        toNumber(gig.performanceFee),
        toNumber(gig.technicalFee),
        (gig.managerBonusType as "fixed" | "percentage") || "fixed",
        toNumber(gig.managerBonusAmount),
        toNumber(gig.numberOfMusicians),
        gig.claimPerformanceFee ?? true,
        gig.claimTechnicalFee ?? true,
        gig.technicalFeeClaimAmount ?? null,
        toNumber(gig.advanceReceivedByManager),
        toNumber(gig.advanceToMusicians),
        gig.isCharity ?? false,
        (gig.performanceDistribution as "equal" | "managerFixed" | "custom") || "equal",
        gig.managerPerformanceAmount ?? null
      );

      const earned = gig.bandPaid ? calc.myEarnings : calc.myEarningsAlreadyReceived;
      return sum + earned;
    }, 0);

    const outstandingRevenue = totalRevenueGigs.reduce((sum, gig) => {
      const calc = calculateGigFinancials(
        toNumber(gig.performanceFee),
        toNumber(gig.technicalFee),
        (gig.managerBonusType as "fixed" | "percentage") || "fixed",
        toNumber(gig.managerBonusAmount),
        toNumber(gig.numberOfMusicians),
        gig.claimPerformanceFee ?? true,
        gig.claimTechnicalFee ?? true,
        gig.technicalFeeClaimAmount ?? null,
        toNumber(gig.advanceReceivedByManager),
        toNumber(gig.advanceToMusicians),
        gig.isCharity ?? false,
        (gig.performanceDistribution as "equal" | "managerFixed" | "custom") || "equal",
        gig.managerPerformanceAmount ?? null
      );

      return sum + (gig.bandPaid ? 0 : calc.myEarningsStillOwed);
    }, 0);

    return NextResponse.json({
      stats: {
        totalUsers,
        totalBands,
        totalGigs,
        activeUsers,
        inactiveUsers: Math.max(0, totalUsers - activeUsers),
        activeBands,
        inactiveBands: Math.max(0, totalBands - activeBands),
        totalRevenue,
        totalRevenueReceived: receivedRevenue,
        totalRevenueOutstanding: outstandingRevenue,
        totalRevenuePending: outstandingRevenue,
      },
      health: {
        database: "healthy",
        api: "healthy",
        lastUpdated: new Date().toISOString(),
      },
      recentActivity: {
        newestUser: latestUser,
        newestGig: latestGig,
      },
    });
  } catch (error) {
    console.error("GET /api/superadmin/stats error:", error);
    return NextResponse.json({ error: "Failed to load superadmin statistics" }, { status: 500 });
  }
}
