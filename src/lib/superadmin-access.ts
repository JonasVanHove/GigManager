import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "./supabase-admin";
import { getOrCreateUser } from "./auth-helpers";

function getBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization") ?? request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice(7);
}

export async function requireSuperAdminUser(request: NextRequest) {
  const token = getBearerToken(request);
  if (!token) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const user = await getOrCreateUser(
    data.user.id,
    data.user.email || "",
    data.user.user_metadata?.name || null
  );

  if (!user.superAdmin) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { user, authUser: data.user, token };
}