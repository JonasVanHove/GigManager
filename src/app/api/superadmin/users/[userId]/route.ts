import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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
            paymentReceived: true,
            paymentReceivedDate: true,
            numberOfMusicians: true,
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
      const base = (gig.performanceFee || 0) + (gig.technicalFee || 0);
      return sum + base;
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
      recentGigs: user.gigs.slice(0, 5),
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
