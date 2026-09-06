import { describe, expect, it } from "vitest";
import { optimizeSetlistFlow, type FlowItemLike } from "@/lib/setlist-flow";

describe("optimizeSetlistFlow", () => {
  it("reorders songs by BPM descending within sets", () => {
    const items: FlowItemLike[] = [
      { id: "s1", kind: "song", label: "Slow Song", specialLabel: "", tempo: "75", tuning: "Standard" },
      { id: "s2", kind: "song", label: "Fast Song", specialLabel: "", tempo: "140", tuning: "Standard" },
      { id: "s3", kind: "song", label: "Mid Song", specialLabel: "", tempo: "105", tuning: "Standard" },
    ];

    const result = optimizeSetlistFlow(items);
    expect(result.optimizedItems.map((i) => i.id)).toEqual(["s2", "s3", "s1"]);
    expect(result.optimizedItems[0].label).toBe("Fast Song");
    expect(result.optimizedItems[1].label).toBe("Mid Song");
    expect(result.optimizedItems[2].label).toBe("Slow Song");
    
    // Verify preview shows song order changes
    expect(result.previewItems).toHaveLength(1);
    expect(result.previewItems[0].label).toBe("Song Order");
    expect(result.previewItems[0].before).toContain("Slow Song");
    expect(result.previewItems[0].after).toContain("Fast Song");
    expect(result.previewItems[0].changed).toBe(true);
  });

  it("maintains relative set boundaries for special blocks (PAUZE, BIS, BINDTEKST)", () => {
    const items: FlowItemLike[] = [
      // Set 1
      { id: "s1", kind: "song", label: "Song 1 (80)", specialLabel: "", tempo: "80", tuning: "Standard" },
      { id: "s2", kind: "song", label: "Song 2 (120)", specialLabel: "", tempo: "120", tuning: "Standard" },
      // Pause
      { id: "b1", kind: "special", label: "PAUZE", specialLabel: "PAUZE", tempo: "", tuning: "" },
      // Set 2
      { id: "s3", kind: "song", label: "Song 3 (90)", specialLabel: "", tempo: "90", tuning: "Standard" },
      { id: "s4", kind: "song", label: "Song 4 (150)", specialLabel: "", tempo: "150", tuning: "Standard" },
      // Stage talk
      { id: "b2", kind: "special", label: "BINDTEKST", specialLabel: "BINDTEKST", tempo: "", tuning: "" },
      // Encore / Bis
      { id: "s5", kind: "song", label: "Song 5 (70)", specialLabel: "", tempo: "70", tuning: "Standard" },
      { id: "s6", kind: "song", label: "Song 6 (130)", specialLabel: "", tempo: "130", tuning: "Standard" },
      { id: "b3", kind: "special", label: "BIS", specialLabel: "BIS", tempo: "", tuning: "" },
      { id: "s7", kind: "song", label: "Song 7 (110)", specialLabel: "", tempo: "110", tuning: "Standard" },
    ];

    const result = optimizeSetlistFlow(items);
    const resultIds = result.optimizedItems.map((i) => i.id);

    // Set 1 reordered: s2 (120) before s1 (80), followed by PAUZE
    expect(resultIds.slice(0, 3)).toEqual(["s2", "s1", "b1"]);

    // Set 2 reordered: s4 (150) before s3 (90), followed by BINDTEKST
    expect(resultIds.slice(3, 6)).toEqual(["s4", "s3", "b2"]);

    // Section 3: s6 (130) before s5 (70), followed by BIS
    expect(resultIds.slice(6, 9)).toEqual(["s6", "s5", "b3"]);

    // Encore: s7 (110)
    expect(resultIds.slice(9)).toEqual(["s7"]);

    // Verify original IDs and labels are preserved
    expect(result.optimizedItems.find((i) => i.id === "s4")?.label).toBe("Song 4 (150)");
    expect(result.optimizedItems.find((i) => i.id === "b1")?.specialLabel).toBe("PAUZE");
    expect(result.optimizedItems.find((i) => i.id === "b3")?.specialLabel).toBe("BIS");
    
    // Verify explanations are generated but preview only shows order changes
    expect(result.explanations.length).toBeGreaterThan(0);
    expect(result.previewItems.length).toBeGreaterThan(0);
  });

  it("preserves song metadata and only reorders songs", () => {
    const items: FlowItemLike[] = [
      { id: "s1", kind: "song", label: "Song A", specialLabel: "", tempo: "100", tuning: "Capo III" },
      { id: "s2", kind: "song", label: "Song B", specialLabel: "", tempo: "150", tuning: "Standard" },
    ];

    const result = optimizeSetlistFlow(items);
    
    // Verify songs are reordered
    expect(result.optimizedItems.map((i) => i.id)).toEqual(["s2", "s1"]);
    
    // Verify metadata is preserved (not changed)
    expect(result.optimizedItems[0].tuning).toBe("Standard");
    expect(result.optimizedItems[1].tuning).toBe("Capo III");
    expect(result.optimizedItems[0].tempo).toBe("150");
    expect(result.optimizedItems[1].tempo).toBe("100");
  });
});
