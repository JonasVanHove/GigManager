import { describe, expect, it } from "vitest";
import { buildHighResImageUrl, getInitials } from "@/lib/image-utils";

describe("avatar image utilities", () => {
  it("adds high-resolution parameters to remote avatar URLs", () => {
    const url = buildHighResImageUrl("https://cdn.example.com/avatar.png", 96);

    expect(url).toContain("width=96");
    expect(url).toContain("height=96");
    expect(url).toContain("quality=100");
  });

  it("derives clean initials from display names", () => {
    expect(getInitials("Jane Doe", null)).toBe("JD");
    expect(getInitials(null, "jamie@example.com")).toBe("J");
  });
});
