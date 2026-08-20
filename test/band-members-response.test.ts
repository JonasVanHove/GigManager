import { beforeEach, describe, expect, it, vi } from "vitest";
import { normalizeArrayResponse } from "@/lib/api-response";

const getUserMock = vi.fn();
const findManyMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    bandMember: { findMany: findManyMock },
    $queryRaw: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("@/lib/supabase-admin", () => ({
  supabaseAdmin: {
    auth: { getUser: getUserMock },
  },
}));

vi.mock("@/lib/auth-helpers", () => ({
  getOrCreateUser: vi.fn().mockResolvedValue({ id: "user-123" }),
}));

vi.mock("@/lib/cache", () => ({
  getCacheEntry: vi.fn(() => null),
  setCacheEntry: vi.fn(),
  invalidateCache: vi.fn(),
  getCacheKey: (...parts: string[]) => parts.join(":"),
  getApiCacheHeaders: () => ({}),
}));

vi.mock("@/lib/error-detection", async () => {
  const actual = await vi.importActual<typeof import("@/lib/error-detection")>("@/lib/error-detection");
  return {
    ...actual,
    getErrorStatusCode: () => 500,
  };
});

describe("band members response handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findManyMock.mockResolvedValue([]);
  });

  it("returns an empty array for empty or invalid payloads", () => {
    expect(normalizeArrayResponse([])).toEqual([]);
    expect(normalizeArrayResponse(undefined)).toEqual([]);
    expect(normalizeArrayResponse({ error: "Unauthorized" })).toEqual([]);
  });

  it("keeps valid arrays intact", () => {
    const payload = [{ id: "m-1", name: "Ada" }];
    expect(normalizeArrayResponse(payload)).toEqual(payload);
  });

  it("returns 401 without a bearer token", async () => {
    const { GET } = await import("@/app/api/band-members/route");
    const response = await GET(new Request("https://example.com/api/band-members") as any);

    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json).toEqual({ error: "Unauthorized" });
  });

  it("returns 200 ok with an empty array when the user has no band members", async () => {
    getUserMock.mockResolvedValue({
      data: {
        user: {
          id: "supabase-user-1",
          email: "user@example.com",
          user_metadata: { name: "Test User" },
        },
      },
      error: null,
    });

    const { GET } = await import("@/app/api/band-members/route");
    const response = await GET(
      new Request("https://example.com/api/band-members", {
        headers: { Authorization: "Bearer valid-token" },
      }) as any
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([]);
  });
});
