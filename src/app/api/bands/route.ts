import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getUserIdFromHeader } from "@/lib/auth-helpers";

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromHeader(request);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { supabaseId: userId }, select: { id: true } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const bands = await prisma.$queryRaw<Array<any>>(Prisma.sql`
      SELECT id, name, "logoUrl" FROM bands WHERE "userId" = ${user.id} ORDER BY name ASC
    `);
    return NextResponse.json(bands);
  } catch (err) {
    console.error("GET /api/bands error:", err);
    return NextResponse.json({ error: "Failed to load bands" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromHeader(request);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { name, logoUrl } = body;
    if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { supabaseId: userId }, select: { id: true } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const id = crypto.randomUUID();
    await prisma.$executeRaw`INSERT INTO bands (id, name, "logoUrl", "userId", "createdAt") VALUES (${id}, ${name}, ${logoUrl || null}, ${user.id}, NOW())`;
    return NextResponse.json({ id, name, logoUrl }, { status: 201 });
  } catch (err) {
    console.error("POST /api/bands error:", err);
    return NextResponse.json({ error: "Failed to create band" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const userId = await getUserIdFromHeader(request);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { id, logoUrl } = body;
    if (!id) return NextResponse.json({ error: "Band ID required" }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { supabaseId: userId }, select: { id: true } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    await prisma.$executeRaw`UPDATE bands SET "logoUrl" = ${logoUrl || null}, "updatedAt" = NOW() WHERE id = ${id} AND "userId" = ${user.id}`;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("PATCH /api/bands error:", err);
    return NextResponse.json({ error: "Failed to update band" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = await getUserIdFromHeader(request);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(request.url);
    const id = url.pathname.split('/').pop();
    if (!id) return NextResponse.json({ error: "Band ID required" }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { supabaseId: userId }, select: { id: true } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    await prisma.$executeRaw`DELETE FROM bands WHERE id = ${id} AND "userId" = ${user.id}`;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/bands error:", err);
    return NextResponse.json({ error: "Failed to delete band" }, { status: 500 });
  }
}
