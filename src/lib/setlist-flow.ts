import { isKnownSpecialBlock } from "./setlist-special-blocks";

export interface FlowOptimizationResult<T> {
  optimizedItems: T[];
  explanations: string[];
  previewItems: Array<{ label: string; before: string; after: string; changed?: boolean }>;
}

export interface FlowItemLike {
  id: string;
  kind: "song" | "special";
  label: string;
  specialLabel: string;
  tempo: string;
  tuning: string;
  expanded?: boolean;
}

/**
 * Optimizes the song order in a setlist for energy flow (by BPM and harmonic key transitions),
 * while strictly maintaining the relative boundaries of special set markers (BIS, PAUZE, BINDTEKST).
 */
export function optimizeSetlistFlow<T extends FlowItemLike>(
  items: T[]
): FlowOptimizationResult<T> {
  const optimizedItems: T[] = [];
  const explanations: string[] = [];
  const previewItems: Array<{ label: string; before: string; after: string; changed?: boolean }> = [];

  let currentSongGroup: T[] = [];

  const processSongGroup = (group: T[]) => {
    if (group.length === 0) return;

    // Sort songs by BPM descending for energy flow
    const sorted = [...group].sort((a, b) => {
      const bpmA = parseInt(a.tempo, 10) || 0;
      const bpmB = parseInt(b.tempo, 10) || 0;
      return bpmB - bpmA;
    });

    sorted.forEach((song, idx) => {
      // Preserve the song's original ID and fields
      optimizedItems.push({ ...song, expanded: false });

      if (idx > 0) {
        const prev = sorted[idx - 1];
        const prevBPM = parseInt(prev.tempo, 10) || 0;
        const currBPM = parseInt(song.tempo, 10) || 0;
        const prevKey = prev.tuning || "Onbekend";
        const currKey = song.tuning || "Onbekend";

        // Generate key transition insight
        if (prevKey !== currKey && prevKey !== "Onbekend" && currKey !== "Onbekend") {
          const keyDiff = Math.abs((currKey.charCodeAt(0) - prevKey.charCodeAt(0)) % 12);
          if (keyDiff <= 2 || keyDiff >= 10) {
            const explanation = `Smooth key transition: ${prevKey} → ${currKey}`;
            explanations.push(explanation);
            previewItems.push({
              label: `Smooth transition: ${song.label}`,
              before: prevKey,
              after: currKey,
              changed: true,
            });
          } else if (keyDiff >= 5 && keyDiff <= 7) {
            const explanation = `Energy boost transition: ${prevKey} → ${currKey}`;
            explanations.push(explanation);
            previewItems.push({
              label: `Energy boost: ${song.label}`,
              before: prevKey,
              after: currKey,
              changed: true,
            });
          }
        }

        // Generate BPM transition insight
        if (prevBPM && currBPM) {
          if (currBPM > prevBPM + 10) {
            const explanation = `Energy increase: ${prevBPM} → ${currBPM} BPM`;
            explanations.push(explanation);
            previewItems.push({
              label: `Energy increase: ${song.label}`,
              before: `${prevBPM} BPM`,
              after: `${currBPM} BPM`,
              changed: true,
            });
          } else if (currBPM < prevBPM - 10) {
            const explanation = `Energy decrease: ${prevBPM} → ${currBPM} BPM`;
            explanations.push(explanation);
            previewItems.push({
              label: `Energy decrease: ${song.label}`,
              before: `${prevBPM} BPM`,
              after: `${currBPM} BPM`,
              changed: true,
            });
          }
        }
      }
    });
  };

  items.forEach((item) => {
    const isSpecialBoundary =
      item.kind === "special" &&
      (isKnownSpecialBlock(item.specialLabel) || isKnownSpecialBlock(item.label));

    if (isSpecialBoundary) {
      // Reorder songs in the preceding set section
      processSongGroup(currentSongGroup);
      currentSongGroup = [];

      // Preserve special boundary marker in its exact position
      optimizedItems.push({ ...item, expanded: false });
    } else if (item.kind === "song") {
      currentSongGroup.push(item);
    } else {
      // Non-boundary specials stay with the group
      currentSongGroup.push(item);
    }
  });

  // Reorder remaining songs in the final set section
  if (currentSongGroup.length > 0) {
    const songsOnly = currentSongGroup.filter((item) => item.kind === "song");
    const otherItems = currentSongGroup.filter((item) => item.kind !== "song");

    processSongGroup(songsOnly);
    otherItems.forEach((other) => {
      optimizedItems.push({ ...other, expanded: false });
    });
  }

  return {
    optimizedItems,
    explanations,
    previewItems,
  };
}
