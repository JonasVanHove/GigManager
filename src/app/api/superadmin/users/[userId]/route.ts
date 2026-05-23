import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateGigFinancials } from "@/lib/calculations";
import { requireSuperAdminUser } from "@/lib/superadmin-access";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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
          take: 10,
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

    const gigsThisMonth = user.gigs.filter((gig) => new Date(gig.date) >= thirtyDaysAgo).length;
    const totalEarnings = user.gigs.reduce((sum, gig) => {
      const calculations = calculateGigFinancials(
        gig.performanceFee,
        gig.technicalFee,
        gig.managerBonusType as "fixed" | "percentage",
        gig.managerBonusAmount,
        gig.numberOfMusicians,
        gig.claimPerformanceFee,
        gig.claimTechnicalFee,
        gig.technicalFeeClaimAmount,
        gig.advanceReceivedByManager,
        gig.advanceToMusicians,
        gig.isCharity,
        (gig.performanceDistribution as "equal" | "managerFixed" | "custom") || "equal",
        gig.managerPerformanceAmount
      );
      return sum + calculations.myEarnings;
    }, 0);
    const totalInvested = user.investments.reduce((sum, inv) => sum + inv.amount, 0);
    const totalSharedWithMusician = user.investments.filter((inv) => inv.sharedWithMusician).length;

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
        totalEarnings,
        totalGigs: user.gigs.length,
        totalBandMembers: user.bandMembers.length,
        totalInvestments: user.investments.length,
        totalInvested,
        totalSharedWithMusician,
        totalSetlists: user.setlists.length,
      },
      recentGigs: user.gigs.slice(0, 5).map((gig) => {
        const calculations = calculateGigFinancials(
          gig.performanceFee,
          gig.technicalFee,
          gig.managerBonusType as "fixed" | "percentage",
          gig.managerBonusAmount,
          gig.numberOfMusicians,
          gig.claimPerformanceFee,
          gig.claimTechnicalFee,
          gig.technicalFeeClaimAmount,
          gig.advanceReceivedByManager,
          gig.advanceToMusicians,
          gig.isCharity,
          (gig.performanceDistribution as "equal" | "managerFixed" | "custom") || "equal",
          gig.managerPerformanceAmount
        );

        return {
          id: gig.id,
          eventName: gig.eventName,
          date: gig.date,
          myEarnings: calculations.myEarnings,
          paymentReceived: gig.paymentReceived,
        };
      }),
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
