import { describe, expect, it } from "vitest";
import { normalizeCapo, formatCapo, areCaposEqual, getCapoDifference } from "@/lib/capo-utils";

describe("capo-utils", () => {
  describe("normalizeCapo", () => {
    it("converts Roman numeral capo notations to integers", () => {
      expect(normalizeCapo("Capo I")).toBe(1);
      expect(normalizeCapo("Capo II")).toBe(2);
      expect(normalizeCapo("Capo III")).toBe(3);
      expect(normalizeCapo("Capo IV")).toBe(4);
      expect(normalizeCapo("Capo V")).toBe(5);
      expect(normalizeCapo("Capo VI")).toBe(6);
      expect(normalizeCapo("Capo VII")).toBe(7);
      expect(normalizeCapo("Capo VIII")).toBe(8);
      expect(normalizeCapo("Capo IX")).toBe(9);
      expect(normalizeCapo("Capo X")).toBe(10);
      expect(normalizeCapo("Capo XI")).toBe(11);
      expect(normalizeCapo("Capo XII")).toBe(12);
    });

    it("converts Arabic numeral capo notations to integers", () => {
      expect(normalizeCapo("Capo 1")).toBe(1);
      expect(normalizeCapo("Capo 2")).toBe(2);
      expect(normalizeCapo("Capo 3")).toBe(3);
      expect(normalizeCapo("Capo 4")).toBe(4);
      expect(normalizeCapo("Capo 5")).toBe(5);
      expect(normalizeCapo("Capo 6")).toBe(6);
      expect(normalizeCapo("Capo 7")).toBe(7);
      expect(normalizeCapo("Capo 8")).toBe(8);
      expect(normalizeCapo("Capo 9")).toBe(9);
      expect(normalizeCapo("Capo 10")).toBe(10);
      expect(normalizeCapo("Capo 11")).toBe(11);
      expect(normalizeCapo("Capo 12")).toBe(12);
    });

    it("handles case-insensitive input", () => {
      expect(normalizeCapo("capo i")).toBe(1);
      expect(normalizeCapo("CAPO II")).toBe(2);
      expect(normalizeCapo("CaPo 3")).toBe(3);
    });

    it("handles extra whitespace", () => {
      expect(normalizeCapo("  Capo I  ")).toBe(1);
      expect(normalizeCapo("Capo   II")).toBe(2);
    });

    it("returns null for non-capo strings", () => {
      expect(normalizeCapo("Standard")).toBeNull();
      expect(normalizeCapo("Downtuning")).toBeNull();
      expect(normalizeCapo("Open G")).toBeNull();
      expect(normalizeCapo("")).toBeNull();
      expect(normalizeCapo("Capo XIII")).toBeNull(); // Invalid capo position
    });
  });

  describe("formatCapo", () => {
    it("converts integers to Roman numeral format", () => {
      expect(formatCapo(1)).toBe("Capo I");
      expect(formatCapo(2)).toBe("Capo II");
      expect(formatCapo(3)).toBe("Capo III");
      expect(formatCapo(4)).toBe("Capo IV");
      expect(formatCapo(5)).toBe("Capo V");
      expect(formatCapo(6)).toBe("Capo VI");
      expect(formatCapo(7)).toBe("Capo VII");
      expect(formatCapo(8)).toBe("Capo VIII");
      expect(formatCapo(9)).toBe("Capo IX");
      expect(formatCapo(10)).toBe("Capo X");
      expect(formatCapo(11)).toBe("Capo XI");
      expect(formatCapo(12)).toBe("Capo XII");
    });

    it("returns 'Standard' for invalid capo positions", () => {
      expect(formatCapo(0)).toBe("Standard");
      expect(formatCapo(13)).toBe("Standard");
      expect(formatCapo(-1)).toBe("Standard");
    });
  });

  describe("areCaposEqual", () => {
    it("compares Roman and Arabic notations as equal", () => {
      expect(areCaposEqual("Capo I", "Capo 1")).toBe(true);
      expect(areCaposEqual("Capo II", "Capo 2")).toBe(true);
      expect(areCaposEqual("Capo III", "Capo 3")).toBe(true);
      expect(areCaposEqual("Capo IV", "Capo 4")).toBe(true);
    });

    it("compares different capo positions as not equal", () => {
      expect(areCaposEqual("Capo I", "Capo II")).toBe(false);
      expect(areCaposEqual("Capo 1", "Capo 2")).toBe(false);
      expect(areCaposEqual("Capo I", "Capo 2")).toBe(false);
    });

    it("handles non-capo strings", () => {
      expect(areCaposEqual("Standard", "Standard")).toBe(true);
      expect(areCaposEqual("Standard", "Capo I")).toBe(false);
      expect(areCaposEqual("Downtuning", "Downtuning")).toBe(true);
    });

    it("is case-insensitive", () => {
      expect(areCaposEqual("capo i", "CAPO 1")).toBe(true);
      expect(areCaposEqual("Capo II", "capo 2")).toBe(true);
    });
  });

  describe("getCapoDifference", () => {
    it("calculates capo position differences", () => {
      expect(getCapoDifference("Capo I", "Capo II")).toBe(1);
      expect(getCapoDifference("Capo 1", "Capo 3")).toBe(2);
      expect(getCapoDifference("Capo III", "Capo 1")).toBe(2);
      expect(getCapoDifference("Capo I", "Capo XII")).toBe(11);
    });

    it("handles mixed Roman and Arabic notations", () => {
      expect(getCapoDifference("Capo I", "Capo 2")).toBe(1);
      expect(getCapoDifference("Capo 3", "Capo IV")).toBe(1);
    });

    it("returns 0 for non-capo strings", () => {
      expect(getCapoDifference("Standard", "Standard")).toBe(0);
      expect(getCapoDifference("Standard", "Capo I")).toBe(0);
      expect(getCapoDifference("Downtuning", "Capo II")).toBe(0);
    });
  });
});
