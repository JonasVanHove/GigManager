import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// ── GET /api/gigs/:id ───────────────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const gig = await prisma.gig.findUnique({ where: { id: params.id } });
    if (!gig) {
      return NextResponse.json({ error: "Gig not found" }, { status: 404 });
    }
    return NextResponse.json(gig);
  } catch (error) {
    console.error(`[GET /api/gigs/${params.id}]`, error);
    return NextResponse.json(
      { error: "Failed to fetch gig" },
      { status: 500 }
    );
  }
}

// ── PUT /api/gigs/:id ───────────────────────────────────────────────────────

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    const gig = await prisma.gig.update({
      where: { id: params.id },
      data: {
        eventName: String(body.eventName).trim(),
        date: new Date(new Date(String(body.date)).toISOString()),
        performers: String(body.performers).trim(),
        numberOfMusicians: Math.max(1, Math.round(Number(body.numberOfMusicians))),
        performanceFee: Math.max(0, Number(body.performanceFee) || 0),
        technicalFee: Math.max(0, Number(body.technicalFee) || 0),
        managerBonusType: (body.managerBonusType as string) || "fixed",
        managerBonusAmount: Math.max(0, Number(body.managerBonusAmount) || 0),
        paymentReceived: Boolean(body.paymentReceived),
        paymentReceivedDate: body.paymentReceivedDate
          ? new Date(String(body.paymentReceivedDate))
          : null,
        bandPaid: Boolean(body.bandPaid),
        bandPaidDate: body.bandPaidDate
          ? new Date(String(body.bandPaidDate))
          : null,
        notes: body.notes ? String(body.notes).trim() : null,
      },
    });

    return NextResponse.json(gig);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json({ error: "Gig not found" }, { status: 404 });
    }
    console.error(`[PUT /api/gigs/${params.id}]`, error);
    return NextResponse.json(
      { error: "Failed to update gig" },
      { status: 500 }
    );
  }
}

// ── DELETE /api/gigs/:id ─────────────────────────────────────────────────────

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.gig.delete({ where: { id: params.id } });
    return NextResponse.json({ message: "Gig deleted successfully" });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json({ error: "Gig not found" }, { status: 404 });
    }
    console.error(`[DELETE /api/gigs/${params.id}]`, error);
    return NextResponse.json(
      { error: "Failed to delete gig" },
      { status: 500 }
    );
  }
}
