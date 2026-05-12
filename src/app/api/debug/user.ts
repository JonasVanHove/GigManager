import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function extractBearerToken(request: NextRequest): string | null {
  try {
    const authHeader = request.headers.get("authorization") ?? request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }
    return authHeader.slice(7);
  } catch (err) {
    console.error("[Debug User] Failed to extract bearer token:", err);
    return null;
  }
}

function decodeJWTPayload(token: string): Record<string, any> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return null;
    }

    const payload = parts[1];
    const decoded = Buffer.from(payload, "base64").toString("utf-8");
    return JSON.parse(decoded);
  } catch (err) {
    console.error("[Debug User] Failed to decode JWT:", err instanceof Error ? err.message : String(err));
    return null;
  }
}

export async function GET(request: NextRequest) {
  console.log("[GET /api/debug/user] Starting");

  try {
    // 1. Extract token
    const token = extractBearerToken(request);
    if (!token) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 });
    }

    // 2. Decode JWT
    const jwtPayload = decodeJWTPayload(token);
    if (!jwtPayload) {
      return NextResponse.json({ error: "Could not decode JWT" }, { status: 400 });
    }

    console.log("[Debug User] JWT payload:", jwtPayload);

    // 3. Try to get/create user
    try {
      const mod = await import("@/lib/auth-helpers");
      const getOrCreateUser = mod?.getOrCreateUser;

      if (!getOrCreateUser) {
        return NextResponse.json({ error: "Could not import getOrCreateUser" }, { status: 500 });
      }

      console.log("[Debug User] Calling getOrCreateUser with:", {
        sub: jwtPayload.sub,
        email: jwtPayload.email,
        name: jwtPayload.name,
      });

      const user = await getOrCreateUser(
        jwtPayload.sub,
        jwtPayload.email || "",
        jwtPayload.name || null
      );

      console.log("[Debug User] getOrCreateUser returned:", user);

      return NextResponse.json({
        jwt_sub: jwtPayload.sub,
        jwt_email: jwtPayload.email,
        jwt_name: jwtPayload.name,
        user_id: user?.id,
        user_email: user?.email,
        user_created_at: user?.createdAt,
        full_user: user,
      });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error("[Debug User] Error:", errMsg);
      return NextResponse.json({ error: errMsg }, { status: 500 });
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("[Debug User] Unexpected error:", errMsg);
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
