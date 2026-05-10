/**
 * Supabase client for server-side operations.
 * Uses the service role key for admin tasks.
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Lazy validation: only throw at runtime if actually used, not at build time
let client: ReturnType<typeof createClient> | null = null;

type CachedAuthUserResult = Awaited<ReturnType<ReturnType<typeof createClient>["auth"]["getUser"]>>;

const authUserCache = new Map<
  string,
  {
    value: CachedAuthUserResult;
    expiresAt: number;
  }
>();

const AUTH_CACHE_TTL_MS = 15_000;

function getCachedAuthUser(token: string): CachedAuthUserResult | null {
  const cached = authUserCache.get(token);
  if (!cached) return null;

  if (Date.now() > cached.expiresAt) {
    authUserCache.delete(token);
    return null;
  }

  return cached.value;
}

function setCachedAuthUser(token: string, value: CachedAuthUserResult) {
  authUserCache.set(token, {
    value,
    expiresAt: Date.now() + AUTH_CACHE_TTL_MS,
  });

  if (authUserCache.size > 500) {
    const oldestKey = authUserCache.keys().next().value;
    if (oldestKey) authUserCache.delete(oldestKey);
  }
}

async function getUserWithCache(token: string): Promise<CachedAuthUserResult> {
  const cached = getCachedAuthUser(token);
  if (cached) return cached;

  const result = await getSupabaseAdmin().auth.getUser(token);

  if (!result.error && result.data?.user) {
    setCachedAuthUser(token, result);
  }

  return result;
}

export function getSupabaseAdmin(): ReturnType<typeof createClient> {
  if (!client) {
    if (!supabaseUrl || !supabaseServiceKey) {
      console.warn(
        "[Supabase] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — returning graceful stub client"
      );

      // Return a stub client that simulates the auth.getUser behaviour
      client = {
        auth: {
          getUser: async (_token: string) => {
            return {
              data: null,
              error: {
                message:
                  "Supabase admin client not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
                status: 500,
                code: "NO_SERVICE_KEY",
              },
            } as any;
          },
        },
      } as any;
      return client;
    }

    try {
      client = createClient(supabaseUrl, supabaseServiceKey);
    } catch (err) {
      console.error("[Supabase] Failed to create client:", err);
      throw err;
    }
  }
  if (!client) {
    throw new Error("Supabase admin client is not initialized");
  }
  return client;
}

// For backward compatibility
export const supabaseAdmin = {
  auth: {
    getUser: async (token: string) => getUserWithCache(token),
  },
} as any;
