import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateUser } from "@/lib/auth-helpers";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DEFAULT_SETTINGS_BODY = {
  currency: "EUR",
  claimPerformanceFee: true,
  claimTechnicalFee: true,
  theme: "system",
} as const;

function getBearerToken(request: NextRequest): string | null {
  const auth =
    request.headers.get("authorization") ??
    request.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  return auth.slice(7);
}

// Decode JWT without verification (for local dev/fallback)
function decodeJWT(token: string): any {
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

// -- Auth: never throw; on app-DB failure we still allow read of default settings --

type SettingsAuthOk =
  | { user: Awaited<ReturnType<typeof getOrCreateUser>> }
  | { useDefaultsOnly: true };

type SettingsAuthResult = { error: NextResponse } | SettingsAuthOk;

async function requireAuth(request: NextRequest): Promise<SettingsAuthResult> {
  const token = getBearerToken(request);
  if (!token) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  try {
    // First, try to decode JWT locally to get user info
    const jwtPayload = decodeJWT(token);
    if (jwtPayload && jwtPayload.sub) {
      console.log("[Settings Auth] JWT decoded successfully, sub:", jwtPayload.sub);
      
      // Get or create user from JWT payload
      try {
        const user = await getOrCreateUser(
          jwtPayload.sub,
          jwtPayload.email || "",
          jwtPayload.name
        );
        console.log("[Settings Auth] User created/retrieved from JWT:", user.id);
        return { user };
      } catch (dbErr) {
        const dbErrMsg = dbErr instanceof Error ? dbErr.message : String(dbErr);
        console.error("[Settings Auth] Database error (JWT path):", dbErrMsg);
        // Valid JWT but app DB unreachable — allow default settings
        return { useDefaultsOnly: true };
      }
    }
    
    // Fallback: try Supabase admin API if JWT decode fails
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    const supabaseUser = data?.user ?? null;

    if (error) {
      console.error("[Settings Auth] Invalid token:", error.message);
      return {
        error: NextResponse.json(
          { error: "Invalid token", details: error.message },
          { status: 401 }
        ),
      };
    }

    if (!supabaseUser) {
      console.error("[Settings Auth] No user in response");
      return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
    }

    try {
      const user = await getOrCreateUser(
        supabaseUser.id,
        supabaseUser.email || "",
        supabaseUser.user_metadata?.name
      );
      return { user };
    } catch (dbErr) {
      const dbErrMsg = dbErr instanceof Error ? dbErr.message : String(dbErr);
      console.error("[Settings Auth] DB unavailable or user sync failed:", dbErrMsg);
      return { useDefaultsOnly: true };
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[Settings Auth] Exception:", errorMsg);
    return {
      error: NextResponse.json(
        { error: "Unauthorized", details: errorMsg },
        { status: 401 }
      ),
    };
  }
}

// -- GET /api/settings — return user settings (or defaults) --------------------

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;
    if ("useDefaultsOnly" in auth && auth.useDefaultsOnly) {
      return NextResponse.json({ ...DEFAULT_SETTINGS_BODY });
    }

    const { user } = auth as { user: Awaited<ReturnType<typeof getOrCreateUser>> };

    try {
      const settings = await prisma.userSettings.findUnique({
        where: { userId: user.id },
      });

      if (!settings) {
        return NextResponse.json({ ...DEFAULT_SETTINGS_BODY });
      }

      return NextResponse.json({
        currency: settings.currency,
        claimPerformanceFee: settings.claimPerformanceFee,
        claimTechnicalFee: settings.claimTechnicalFee,
        theme: settings.theme || "system",
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error("[GET /api/settings] error:", errorMsg);
      return NextResponse.json({ ...DEFAULT_SETTINGS_BODY });
    }
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : String(e);
    console.error("[GET /api/settings] fatal:", errorMsg);
    return NextResponse.json({ ...DEFAULT_SETTINGS_BODY });
  }
}

// -- PUT /api/settings — upsert user settings ---------------------------------

const SUPPORTED_CURRENCIES = [
  "EUR", "USD", "GBP", "CHF", "SEK", "NOK", "DKK",
  "PLN", "CZK", "HUF", "CAD", "AUD", "JPY",
];

export async function PUT(request: NextRequest) {
  let currency: string | undefined;
  let claimPerformanceFee: boolean | undefined;
  let claimTechnicalFee: boolean | undefined;
  let theme: string | undefined;

  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    const body = await request.json();

    currency =
      typeof body.currency === "string" && SUPPORTED_CURRENCIES.includes(body.currency.toUpperCase())
        ? body.currency.toUpperCase()
        : undefined;

    claimPerformanceFee =
      typeof body.claimPerformanceFee === "boolean" ? body.claimPerformanceFee : undefined;

    claimTechnicalFee =
      typeof body.claimTechnicalFee === "boolean" ? body.claimTechnicalFee : undefined;

    theme =
      typeof body.theme === "string" && ["light", "dark", "system"].includes(body.theme)
        ? body.theme
        : undefined;

    if ("useDefaultsOnly" in auth && auth.useDefaultsOnly) {
      return NextResponse.json({
        currency: currency ?? DEFAULT_SETTINGS_BODY.currency,
        claimPerformanceFee: claimPerformanceFee ?? DEFAULT_SETTINGS_BODY.claimPerformanceFee,
        claimTechnicalFee: claimTechnicalFee ?? DEFAULT_SETTINGS_BODY.claimTechnicalFee,
        theme: theme ?? DEFAULT_SETTINGS_BODY.theme,
        degraded: true,
      });
    }

    const { user } = auth as { user: Awaited<ReturnType<typeof getOrCreateUser>> };

    const data: Record<string, unknown> = {};
    if (currency !== undefined) data.currency = currency;
    if (claimPerformanceFee !== undefined) data.claimPerformanceFee = claimPerformanceFee;
    if (claimTechnicalFee !== undefined) data.claimTechnicalFee = claimTechnicalFee;
    if (theme !== undefined) data.theme = theme;

    try {
      const settings = await prisma.userSettings.upsert({
        where: { userId: user.id },
        update: data,
        create: {
          userId: user.id,
          currency: currency ?? "EUR",
          claimPerformanceFee: claimPerformanceFee ?? true,
          claimTechnicalFee: claimTechnicalFee ?? true,
          theme: theme ?? "system",
        },
      });

      return NextResponse.json({
        currency: settings.currency,
        claimPerformanceFee: settings.claimPerformanceFee,
        claimTechnicalFee: settings.claimTechnicalFee,
        theme: settings.theme || "system",
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error("[PUT /api/settings] error:", errorMsg);
      return NextResponse.json({
        currency: currency || "EUR",
        claimPerformanceFee: claimPerformanceFee ?? true,
        claimTechnicalFee: claimTechnicalFee ?? true,
        theme: theme || "system",
        degraded: true,
      });
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[PUT /api/settings] fatal:", errorMsg);
    return NextResponse.json({
      currency: currency || "EUR",
      claimPerformanceFee: claimPerformanceFee ?? true,
      claimTechnicalFee: claimTechnicalFee ?? true,
      theme: theme || "system",
      degraded: true,
    });
  }
}
