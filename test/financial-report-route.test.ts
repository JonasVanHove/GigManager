import { beforeEach, describe, expect, it, vi } from "vitest";

const findUserMock = vi.fn();
const findGigsMock = vi.fn();
const getUserIdFromHeaderMock = vi.fn();
const getCacheEntryMock = vi.fn();
const setCacheEntryMock = vi.fn();
const recordMetricMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: findUserMock,
    },
    gig: {
      findMany: findGigsMock,
    },
  },
}));

vi.mock("@/lib/auth-helpers", () => ({
  getUserIdFromHeader: getUserIdFromHeaderMock,
}));

vi.mock("@/lib/calculations", () => ({
  calculateGigFinancials: vi.fn(() => ({
    totalReceived: 1200,
    myEarnings: 300,
    amountOwedToOthers: 900,
  })),
}));

vi.mock("@/lib/cache", () => ({
  getCacheEntry: getCacheEntryMock,
  getCacheKey: (...parts: string[]) => parts.join(":"),
  setCacheEntry: setCacheEntryMock,
  getApiCacheHeaders: () => ({}),
}));

vi.mock("@/lib/performance-metrics", () => ({
  measureAsync: vi.fn(async (_name: string, fn: () => Promise<unknown>) => fn()),
  recordMetric: recordMetricMock,
}));

describe("GET /api/reports/financial", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUserIdFromHeaderMock.mockResolvedValue("supabase-user-1");
    findUserMock.mockResolvedValue({ id: "internal-user-42" });
    getCacheEntryMock.mockReturnValue(null);
    findGigsMock.mockResolvedValue([
      {
        id: "gig-1",
        eventName: "Summer Jam",
        date: new Date("2026-08-01T00:00:00.000Z"),
        isCharity: false,
        paymentReceived: true,
        bandPaid: false,
        performanceFee: 1000,
        technicalFee: 200,
        managerBonusType: "fixed",
        managerBonusAmount: 0,
        numberOfMusicians: 4,
        claimPerformanceFee: true,
        claimTechnicalFee: true,
        technicalFeeClaimAmount: 200,
        advanceReceivedByManager: 0,
        advanceToMusicians: 0,
      },
    ]);
  });

  it("uses the internal database user id when loading report gigs", async () => {
    const { GET } = await import("@/app/api/reports/financial/route");

    const response = await GET(
      new Request("https://example.com/api/reports/financial") as any
    );

    expect(response.status).toBe(200);
    expect(findUserMock).toHaveBeenCalledWith({
      where: { supabaseId: "supabase-user-1" },
      select: { id: true },
    });
    expect(findGigsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "internal-user-42",
        }),
      })
    );

    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        summary: expect.objectContaining({
          totalGigsCount: 1,
          totalRevenue: 1200,
          totalMyEarnings: 300,
          totalOwedToBand: 900,
        }),
      })
    );
  });
});
