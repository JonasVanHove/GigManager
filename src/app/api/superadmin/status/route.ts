import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdminUser } from "@/lib/superadmin-access";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const result = await requireSuperAdminUser(request);
    if ("error" in result) return result.error;

    return NextResponse.json({ superAdmin: true, userId: result.user.id });
  } catch (error) {
    console.error("GET /api/superadmin/status error:", error);
    return NextResponse.json({ error: "Failed to check superadmin access" }, { status: 500 });
  }
}