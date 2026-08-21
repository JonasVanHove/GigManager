import { describe, expect, it } from "vitest";
import { getBandMemberAvatarUrl, getBandMemberInitial } from "@/lib/member-avatar";

describe("band member avatar rules", () => {
  it("returns the authenticated profile image for Jonas", () => {
    expect(getBandMemberAvatarUrl("Jonas", null, "https://example.com/jonas.png")).toBe("https://example.com/jonas.png");
    expect(getBandMemberAvatarUrl("jonas", "https://example.com/other.png", "https://example.com/jonas.png")).toBe("https://example.com/jonas.png");
  });

  it("uses a custom avatar for non-Jonas members when one is set", () => {
    expect(getBandMemberAvatarUrl("Alex", "https://example.com/alex.png", "https://example.com/jonas.png")).toBe("https://example.com/alex.png");
  });

  it("uses the first letter of the name for the fallback badge", () => {
    expect(getBandMemberInitial("Alex")).toBe("A");
    expect(getBandMemberInitial(" mark ")).toBe("M");
  });

  it("falls back to a question mark when no name is available", () => {
    expect(getBandMemberInitial(" ")).toBe("?");
  });
});