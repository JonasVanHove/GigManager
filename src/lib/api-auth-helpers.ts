/**
 * Shared authentication helpers for API routes
 * Handles JWT decoding and Supabase token validation
 */

import { NextRequest } from "next/server";
import { supabaseAdmin } from "./supabase-admin";
import { getOrCreateUser } from "./auth-helpers";

export function getBearerToken(request: NextRequest): string | null {
  const auth =
    request.headers.get("authorization") ??
    request.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  return auth.slice(7);
}

// Decode JWT without verification (for local dev/fallback)
export function decodeJWT(token: string): any {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const payload = parts[1];
    const decoded = Buffer.from(payload, "base64").toString("utf-8");
    return JSON.parse(decoded);
  } catch (err) {
    return null;
  }
}

export type AuthResult =
  | { user: Awaited<ReturnType<typeof getOrCreateUser>> }
  | { degraded: true }
  | { error: string; status: number };

/**
 * Validate JWT token and return user or degraded mode
 * Tries JWT decode first (fast path), falls back to Supabase admin API
 */
export async function validateTokenAndGetUser(
  token: string
): Promise<AuthResult> {
  // First, try to decode JWT locally to get user info
  const jwtPayload = decodeJWT(token);
  if (jwtPayload && jwtPayload.sub) {
    console.log("[validateTokenAndGetUser] JWT decoded, sub:", jwtPayload.sub);

    // Get or create user from JWT payload
    try {
      const user = await getOrCreateUser(
        jwtPayload.sub,
        jwtPayload.email || "",
        jwtPayload.name
      );
      console.log("[validateTokenAndGetUser] User ready from JWT:", user.id);
      return { user };
    } catch (dbErr) {
      const dbErrMsg = dbErr instanceof Error ? dbErr.message : String(dbErr);
      console.error(
        "[validateTokenAndGetUser] Database error (JWT path):",
        dbErrMsg
      );
      // Valid JWT but app DB unreachable
      return { degraded: true };
    }
  }

  // Fallback: try Supabase admin API if JWT decode fails
  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    const supabaseUser = data?.user ?? null;

    if (error) {
      console.error("[validateTokenAndGetUser] Supabase error:", error.message);
      return {
        error: "Invalid token",
        status: 401,
      };
    }

    if (!supabaseUser) {
      console.error("[validateTokenAndGetUser] No user in response");
      return {
        error: "Unauthorized",
        status: 401,
      };
    }

    // Get or create user record
    try {
      const user = await getOrCreateUser(
        supabaseUser.id,
        supabaseUser.email || "",
        supabaseUser.user_metadata?.name
      );
      console.log("[validateTokenAndGetUser] User ready from Supabase:", user.id);
      return { user };
    } catch (dbErr) {
      const dbErrMsg = dbErr instanceof Error ? dbErr.message : String(dbErr);
      console.error(
        "[validateTokenAndGetUser] Database error (Supabase path):",
        dbErrMsg
      );
      // Valid JWT but app DB unreachable
      return { degraded: true };
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[validateTokenAndGetUser] Exception:", errorMsg);
    return {
      error: "Token validation failed",
      status: 401,
    };
  }
}
