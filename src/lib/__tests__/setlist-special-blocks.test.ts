import { describe, expect, it } from "vitest";
import {
  getSpecialBlockDisplayLabel,
  isKnownSpecialBlock,
  normalizeSpecialBlockKey,
} from "@/lib/setlist-special-blocks";

describe("setlist special blocks", () => {
  it("normalizes known block keys", () => {
    expect(normalizeSpecialBlockKey("PAUZE")).toBe("PAUZE");
    expect(normalizeSpecialBlockKey("pause")).toBe("PAUZE");
    expect(normalizeSpecialBlockKey("ENCORE")).toBe("BIS");
    expect(normalizeSpecialBlockKey("STAGE TALK")).toBe("BINDTEKST");
    expect(normalizeSpecialBlockKey("INTERLUDE")).toBe("BINDTEKST");
    expect(normalizeSpecialBlockKey("Custom note")).toBeNull();
  });

  it("returns locale-specific display labels", () => {
    expect(getSpecialBlockDisplayLabel("PAUZE", "nl")).toBe("PAUZE");
    expect(getSpecialBlockDisplayLabel("PAUZE", "en")).toBe("PAUSE");
    expect(getSpecialBlockDisplayLabel("BIS", "en")).toBe("ENCORE");
    expect(getSpecialBlockDisplayLabel("BINDTEKST", "en")).toBe("STAGE TALK");
    expect(getSpecialBlockDisplayLabel("Custom note", "en")).toBe("Custom note");
  });

  it("detects known special blocks", () => {
    expect(isKnownSpecialBlock("BINDTEKST")).toBe(true);
    expect(isKnownSpecialBlock("STAGE TALK")).toBe(true);
    expect(isKnownSpecialBlock("Outro note")).toBe(false);
  });
});
