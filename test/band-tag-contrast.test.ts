import { describe, it, expect } from "vitest";
import { getBandColorStyles } from "@/lib/preferences";

describe("band tag contrast", () => {
  it("uses dark text on light backgrounds", () => {
    const styles = getBandColorStyles("Test", "#fef3c7");
    expect(styles.solid.color).toBe("#111827");
    expect(styles.soft.color).toBe("#111827");
  });

  it("uses light text on dark backgrounds", () => {
    const styles = getBandColorStyles("Test", "#1d4ed8");
    expect(styles.solid.color).toBe("#ffffff");
    expect(styles.soft.color).toBe("#ffffff");
  });

  it("uses light text for black backgrounds", () => {
    const styles = getBandColorStyles("Test", "#000000");
    expect(styles.solid.color).toBe("#ffffff");
  });

  it("uses dark text for bright green backgrounds", () => {
    const styles = getBandColorStyles("Test", "#86efac");
    expect(styles.solid.color).toBe("#111827");
  });
});
