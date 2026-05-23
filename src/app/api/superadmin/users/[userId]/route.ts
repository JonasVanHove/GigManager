import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateGigFinancials } from "@/lib/calculations";
import { requireSuperAdminUser } from "@/lib/superadmin-access";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function toFiniteNumber(value: number | null | undefined): number {
  return Number.isFinite(value ?? NaN) ? (value as number) : 0;
}

export async function GET(request: NextRequest, { params }: { params: { userId: string } }) {
  try {
    const result = await requireSuperAdminUser(request);
    if ("error" in result) return result.error;

    const userId = params.userId;

    // Get detailed user data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        supabaseId: true,
        email: true,
        name: true,
        superAdmin: true,
        createdAt: true,
        updatedAt: true,
        gigs: {
          select: {
            id: true,
            eventName: true,
            date: true,
            performanceFee: true,
            technicalFee: true,
            managerBonusType: true,
            managerBonusAmount: true,
            paymentReceived: true,
            paymentReceivedDate: true,
            numberOfMusicians: true,
            claimPerformanceFee: true,
            claimTechnicalFee: true,
            technicalFeeClaimAmount: true,
            advanceReceivedByManager: true,
            advanceToMusicians: true,
            isCharity: true,
            performanceDistribution: true,
            managerPerformanceAmount: true,
          },
          orderBy: { date: "desc" },
        },
        bandMembers: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
          orderBy: { name: "asc" },
        },
        investments: {
          select: {
            id: true,
            amount: true,
            description: true,
            date: true,
            sharedWithMusician: true,
          },
          orderBy: { date: "desc" },
        },
        setlists: {
          select: {
            id: true,
            title: true,
            items: {
              select: { id: true },
            },
          },
          take: 5,
        },
        settings: {
          select: {
            currency: true,
            claimPerformanceFee: true,
            claimTechnicalFee: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Calculate stats
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const earningsByGig = user.gigs.map((gig) => {
      const calculations = calculateGigFinancials(
        toFiniteNumber(gig.performanceFee),
        toFiniteNumber(gig.technicalFee),
        gig.managerBonusType as "fixed" | "percentage",
        toFiniteNumber(gig.managerBonusAmount),
        toFiniteNumber(gig.numberOfMusicians),
        gig.claimPerformanceFee ?? true,
        gig.claimTechnicalFee ?? true,
        toFiniteNumber(gig.technicalFeeClaimAmount),
        toFiniteNumber(gig.advanceReceivedByManager),
        toFiniteNumber(gig.advanceToMusicians),
        gig.isCharity ?? false,
        (gig.performanceDistribution as "equal" | "managerFixed" | "custom") || "equal",
        toFiniteNumber(gig.managerPerformanceAmount)
      );
      const receivedForGig = gig.paymentReceived ? calculations.myEarnings : calculations.myEarningsAlreadyReceived;
      const pendingForGig = gig.paymentReceived ? 0 : calculations.myEarningsStillOwed;

      return {
        id: gig.id,
        eventName: gig.eventName,
        date: gig.date,
        myEarnings: calculations.myEarnings,
        paymentReceived: gig.paymentReceived,
        totalReceived: calculations.totalReceived,
        amountOwedToOthers: calculations.amountOwedToOthers,
        receivedForGig,
        pendingForGig,
        perfShare: calculations.perfShare,
        techShare: calculations.techShare,
        actualManagerBonus: calculations.actualManagerBonus,
        myEarningsAlreadyReceived: calculations.myEarningsAlreadyReceived,
      };
    });

    const gigsThisMonth = earningsByGig.filter((gig) => new Date(gig.date) >= thirtyDaysAgo).length;
    const totalMyEarnings = earningsByGig.reduce((sum, gig) => sum + toFiniteNumber(gig.myEarnings), 0);
    const totalMyEarningsReceived = earningsByGig.reduce((sum, gig) => sum + toFiniteNumber((gig as any).receivedForGig), 0);
    const totalMyEarningsPending = earningsByGig.reduce((sum, gig) => sum + toFiniteNumber((gig as any).pendingForGig), 0);
    const averageMyEarningsPerGig = user.gigs.length > 0 ? totalMyEarnings / user.gigs.length : 0;

    const pendingGigs = earningsByGig
      .filter((gig) => !gig.paymentReceived)
      .map((gig) => ({ id: gig.id, eventName: gig.eventName, date: gig.date, pendingAmount: toFiniteNumber((gig as any).pendingForGig) }));
    const biggestGig = earningsByGig.reduce<null | (typeof earningsByGig)[number]>((best, gig) => {
      if (!best || gig.myEarnings > best.myEarnings) return gig;
      return best;
    }, null);

    const totalInvested = user.investments.reduce((sum, inv) => sum + toFiniteNumber(inv.amount), 0);
    const sharedInvestments = user.investments.filter((inv) => inv.sharedWithMusician).length;
    const totalSharedWithMusician = sharedInvestments;
    const investmentShareRate = user.investments.length > 0 ? sharedInvestments / user.investments.length : 0;

    // Build breakdown explaining why the received total equals the shown My Earnings
    const breakdownReceived = {
      performance: 0,
      technical: 0,
      bonus: 0,
      advancesApplied: 0,
    };

    for (const g of earningsByGig) {
      const perf = toFiniteNumber((g as any).perfShare);
      const tech = toFiniteNumber((g as any).techShare);
      const bonus = toFiniteNumber((g as any).actualManagerBonus);
      const advance = toFiniteNumber((g as any).myEarningsAlreadyReceived);

      if (g.paymentReceived) {
        breakdownReceived.performance += perf;
        breakdownReceived.technical += tech;
        breakdownReceived.bonus += bonus;
        breakdownReceived.advancesApplied += advance;
      } else {
        // For unpaid gigs, only the advance (if any) contributes to received
        breakdownReceived.advancesApplied += advance;
      }
    }

    // Round breakdown values
    for (const k of Object.keys(breakdownReceived)) {
      (breakdownReceived as any)[k] = Math.round(((breakdownReceived as any)[k] || 0) * 100) / 100;
    }

    return NextResponse.json({
      user: {
        id: user.id,
        supabaseId: user.supabaseId,
        email: user.email,
        name: user.name,
        superAdmin: user.superAdmin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      stats: {
        gigsThisMonth,
        totalEarnings: totalMyEarnings,
        myEarnings: totalMyEarningsReceived,
        breakdownReceived,
        totalEarningsReceived: totalMyEarningsReceived,
        totalEarningsPending: totalMyEarningsPending,
        paidMyEarnings: totalMyEarningsReceived,
        pendingMyEarnings: totalMyEarningsPending,
        averageMyEarningsPerGig,
        totalGigs: user.gigs.length,
        totalBandMembers: user.bandMembers.length,
        totalInvestments: user.investments.length,
        totalInvested,
        totalSharedWithMusician,
        investmentShareRate,
        totalSetlists: user.setlists.length,
        biggestGig: biggestGig
          ? {
              id: biggestGig.id,
              eventName: biggestGig.eventName,
              date: biggestGig.date,
              myEarnings: biggestGig.myEarnings,
            }
          : null,
      },
      recentGigs: earningsByGig.slice(0, 5),
      pendingGigs,
      bandMembers: user.bandMembers.slice(0, 8),
      investments: user.investments.slice(0, 5),
      topSetlists: user.setlists.slice(0, 3),
      settings: user.settings,
    });
  } catch (error) {
    console.error("GET /api/superadmin/users/[userId] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
