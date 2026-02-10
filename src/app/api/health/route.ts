import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Force dynamic — never pre-render this route during build
export const dynamic = "force-dynamic";

/**
 * GET /api/health
 *
 * Lightweight health-check that pings the database.
 * Used by:
 *  - Monitoring / uptime checks
 *  - GitHub Actions keep-alive cron (prevents Supabase free-tier pause)
 */
export async function GET() {
  const start = Date.now();

  try {
    await prisma.$queryRaw`SELECT 1`;
    const latencyMs = Date.now() - start;

    return NextResponse.json({
      status: "healthy",
      database: "connected",
      latencyMs,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        database: "disconnected",
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
