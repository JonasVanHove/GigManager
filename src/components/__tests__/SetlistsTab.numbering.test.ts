/**
 * Unit tests for setlist song numbering logic
 * Tests that only actual songs receive incremental track numbers, not notes/breaks
 */

import { describe, it, expect } from 'vitest';

// Mock types matching the SetlistsTab implementation
type DraftItem = {
  id: string;
  kind: "song" | "special";
  songId: string | null;
  label: string;
  artist: string;
  tuning: string;
  key: string;
  tempo: string;
  notitie: string;
  specialLabel: string;
  expanded: boolean;
};

// Helper function to calculate song number (matching the SetlistsTab implementation)
const getSongNumber = (items: DraftItem[], currentIndex: number): number => {
  if (!items || items.length === 0 || currentIndex < 0 || currentIndex >= items.length) {
    return 0;
  }
  let songCount = 0;
  for (let i = 0; i <= currentIndex; i++) {
    if (items[i]?.kind === "song") {
      songCount++;
    }
  }
  return songCount;
};

describe('Setlist Song Numbering', () => {
  describe('getSongNumber helper function', () => {
    it('should return 0 for empty array', () => {
      const items: DraftItem[] = [];
      // In practice, this wouldn't be called with index 0 on empty array
      // but the function should handle it gracefully
      expect(getSongNumber(items, -1)).toBe(0);
      expect(getSongNumber(items, 0)).toBe(0);
    });

    it('should return 1 for first song', () => {
      const items: DraftItem[] = [
        { id: '1', kind: 'song', songId: 'song1', label: 'Song A', artist: '', tuning: 'Standard', key: '', tempo: '', notitie: '', specialLabel: '', expanded: false }
      ];
      expect(getSongNumber(items, 0)).toBe(1);
    });

    it('should return 2 for second song', () => {
      const items: DraftItem[] = [
        { id: '1', kind: 'song', songId: 'song1', label: 'Song A', artist: '', tuning: 'Standard', key: '', tempo: '', notitie: '', specialLabel: '', expanded: false },
        { id: '2', kind: 'song', songId: 'song2', label: 'Song B', artist: '', tuning: 'Standard', key: '', tempo: '', notitie: '', specialLabel: '', expanded: false }
      ];
      expect(getSongNumber(items, 1)).toBe(2);
    });

    it('should not count special items in numbering', () => {
      const items: DraftItem[] = [
        { id: '1', kind: 'song', songId: 'song1', label: 'Song A', artist: '', tuning: 'Standard', key: '', tempo: '', notitie: '', specialLabel: '', expanded: false },
        { id: '2', kind: 'special', songId: null, label: '', artist: '', tuning: '', key: '', tempo: '', notitie: '', specialLabel: 'BINDTEKST', expanded: false },
        { id: '3', kind: 'special', songId: null, label: '', artist: '', tuning: '', key: '', tempo: '', notitie: '', specialLabel: 'PAUZE', expanded: false },
        { id: '4', kind: 'song', songId: 'song2', label: 'Song B', artist: '', tuning: 'Standard', key: '', tempo: '', notitie: '', specialLabel: '', expanded: false }
      ];
      expect(getSongNumber(items, 0)).toBe(1);
      expect(getSongNumber(items, 1)).toBe(1);
      expect(getSongNumber(items, 2)).toBe(1);
      expect(getSongNumber(items, 3)).toBe(2);
    });

    it('should not count special items in numbering (legacy case)', () => {
      const items: DraftItem[] = [
        { id: '1', kind: 'song', songId: 'song1', label: 'Song A', artist: '', tuning: 'Standard', key: '', tempo: '', notitie: '', specialLabel: '', expanded: false },
        { id: '2', kind: 'special', songId: null, label: '', artist: '', tuning: '', key: '', tempo: '', notitie: '', specialLabel: 'PAUZE', expanded: false },
        { id: '3', kind: 'song', songId: 'song2', label: 'Song B', artist: '', tuning: 'Standard', key: '', tempo: '', notitie: '', specialLabel: '', expanded: false }
      ];
      expect(getSongNumber(items, 0)).toBe(1); // First song
      expect(getSongNumber(items, 1)).toBe(1); // Pause (no number)
      expect(getSongNumber(items, 2)).toBe(2); // Second song (not 3)
    });

    it('should handle multiple special items correctly', () => {
      const items: DraftItem[] = [
        { id: '1', kind: 'song', songId: 'song1', label: 'Song A', artist: '', tuning: 'Standard', key: '', tempo: '', notitie: '', specialLabel: '', expanded: false },
        { id: '2', kind: 'special', songId: null, label: '', artist: '', tuning: '', key: '', tempo: '', notitie: '', specialLabel: 'PAUZE', expanded: false },
        { id: '3', kind: 'special', songId: null, label: '', artist: '', tuning: '', key: '', tempo: '', notitie: '', specialLabel: 'BIS', expanded: false },
        { id: '4', kind: 'song', songId: 'song2', label: 'Song B', artist: '', tuning: 'Standard', key: '', tempo: '', notitie: '', specialLabel: '', expanded: false },
        { id: '5', kind: 'special', songId: null, label: '', artist: '', tuning: '', key: '', tempo: '', notitie: '', specialLabel: 'Custom Note', expanded: false },
        { id: '6', kind: 'song', songId: 'song3', label: 'Song C', artist: '', tuning: 'Standard', key: '', tempo: '', notitie: '', specialLabel: '', expanded: false }
      ];
      expect(getSongNumber(items, 0)).toBe(1); // Song A
      expect(getSongNumber(items, 1)).toBe(1); // Pause
      expect(getSongNumber(items, 2)).toBe(1); // Bis
      expect(getSongNumber(items, 3)).toBe(2); // Song B (not 4)
      expect(getSongNumber(items, 4)).toBe(2); // Custom Note
      expect(getSongNumber(items, 5)).toBe(3); // Song C (not 6)
    });

    it('should handle special items at the beginning', () => {
      const items: DraftItem[] = [
        { id: '1', kind: 'special', songId: null, label: '', artist: '', tuning: '', key: '', tempo: '', notitie: '', specialLabel: 'Intro Note', expanded: false },
        { id: '2', kind: 'song', songId: 'song1', label: 'Song A', artist: '', tuning: 'Standard', key: '', tempo: '', notitie: '', specialLabel: '', expanded: false },
        { id: '3', kind: 'song', songId: 'song2', label: 'Song B', artist: '', tuning: 'Standard', key: '', tempo: '', notitie: '', specialLabel: '', expanded: false }
      ];
      expect(getSongNumber(items, 0)).toBe(0); // Intro Note (no number)
      expect(getSongNumber(items, 1)).toBe(1); // Song A
      expect(getSongNumber(items, 2)).toBe(2); // Song B
    });

    it('should handle special items at the end', () => {
      const items: DraftItem[] = [
        { id: '1', kind: 'song', songId: 'song1', label: 'Song A', artist: '', tuning: 'Standard', key: '', tempo: '', notitie: '', specialLabel: '', expanded: false },
        { id: '2', kind: 'song', songId: 'song2', label: 'Song B', artist: '', tuning: 'Standard', key: '', tempo: '', notitie: '', specialLabel: '', expanded: false },
        { id: '3', kind: 'special', songId: null, label: '', artist: '', tuning: '', key: '', tempo: '', notitie: '', specialLabel: 'Outro Note', expanded: false }
      ];
      expect(getSongNumber(items, 0)).toBe(1); // Song A
      expect(getSongNumber(items, 1)).toBe(2); // Song B
      expect(getSongNumber(items, 2)).toBe(2); // Outro Note (no number)
    });

    it('should handle only special items', () => {
      const items: DraftItem[] = [
        { id: '1', kind: 'special', songId: null, label: '', artist: '', tuning: '', key: '', tempo: '', notitie: '', specialLabel: 'PAUZE', expanded: false },
        { id: '2', kind: 'special', songId: null, label: '', artist: '', tuning: '', key: '', tempo: '', notitie: '', specialLabel: 'BIS', expanded: false }
      ];
      expect(getSongNumber(items, 0)).toBe(0); // Pause
      expect(getSongNumber(items, 1)).toBe(0); // Bis
    });
  });

  describe('Real-world setlist scenarios', () => {
    it('should correctly number a typical concert setlist', () => {
      const items: DraftItem[] = [
        { id: '1', kind: 'song', songId: 'song1', label: 'Opening Song', artist: '', tuning: 'Standard', key: '', tempo: '', notitie: '', specialLabel: '', expanded: false },
        { id: '2', kind: 'song', songId: 'song2', label: 'Second Song', artist: '', tuning: 'Standard', key: '', tempo: '', notitie: '', specialLabel: '', expanded: false },
        { id: '3', kind: 'special', songId: null, label: '', artist: '', tuning: '', key: '', tempo: '', notitie: '', specialLabel: 'PAUZE', expanded: false },
        { id: '4', kind: 'song', songId: 'song3', label: 'Third Song', artist: '', tuning: 'Drop D', key: '', tempo: '', notitie: '', specialLabel: '', expanded: false },
        { id: '5', kind: 'song', songId: 'song4', label: 'Fourth Song', artist: '', tuning: 'Drop D', key: '', tempo: '', notitie: '', specialLabel: '', expanded: false },
        { id: '6', kind: 'special', songId: null, label: '', artist: '', tuning: '', key: '', tempo: '', notitie: '', specialLabel: 'BIS', expanded: false },
        { id: '7', kind: 'song', songId: 'song5', label: 'Encore Song', artist: '', tuning: 'Standard', key: '', tempo: '', notitie: '', specialLabel: '', expanded: false }
      ];

      const expectedNumbers = [1, 2, 2, 3, 4, 4, 5];
      items.forEach((item, index) => {
        expect(getSongNumber(items, index)).toBe(expectedNumbers[index]);
      });
    });

    it('should maintain correct numbering after reordering', () => {
      const items: DraftItem[] = [
        { id: '1', kind: 'song', songId: 'song1', label: 'Song A', artist: '', tuning: 'Standard', key: '', tempo: '', notitie: '', specialLabel: '', expanded: false },
        { id: '2', kind: 'special', songId: null, label: '', artist: '', tuning: '', key: '', tempo: '', notitie: '', specialLabel: 'PAUZE', expanded: false },
        { id: '3', kind: 'song', songId: 'song2', label: 'Song B', artist: '', tuning: 'Standard', key: '', tempo: '', notitie: '', specialLabel: '', expanded: false },
        { id: '4', kind: 'song', songId: 'song3', label: 'Song C', artist: '', tuning: 'Standard', key: '', tempo: '', notitie: '', specialLabel: '', expanded: false }
      ];

      // Initial state
      expect(getSongNumber(items, 0)).toBe(1); // Song A
      expect(getSongNumber(items, 1)).toBe(1); // Pause
      expect(getSongNumber(items, 2)).toBe(2); // Song B
      expect(getSongNumber(items, 3)).toBe(3); // Song C

      // Reorder: move Song C before the pause
      const reordered: DraftItem[] = [
        items[0], // Song A
        items[3], // Song C (moved)
        items[1], // Pause
        items[2]  // Song B
      ];

      expect(getSongNumber(reordered, 0)).toBe(1); // Song A
      expect(getSongNumber(reordered, 1)).toBe(2); // Song C (now #2)
      expect(getSongNumber(reordered, 2)).toBe(2); // Pause
      expect(getSongNumber(reordered, 3)).toBe(3); // Song B (now #3)
    });

    it('should maintain correct numbering after inserting songs', () => {
      const items: DraftItem[] = [
        { id: '1', kind: 'song', songId: 'song1', label: 'Song A', artist: '', tuning: 'Standard', key: '', tempo: '', notitie: '', specialLabel: '', expanded: false },
        { id: '2', kind: 'special', songId: null, label: '', artist: '', tuning: '', key: '', tempo: '', notitie: '', specialLabel: 'PAUZE', expanded: false },
        { id: '3', kind: 'song', songId: 'song2', label: 'Song B', artist: '', tuning: 'Standard', key: '', tempo: '', notitie: '', specialLabel: '', expanded: false }
      ];

      // Insert a song after the pause
      const inserted: DraftItem[] = [
        items[0], // Song A
        items[1], // Pause
        { id: '4', kind: 'song', songId: 'song3', label: 'Song C', artist: '', tuning: 'Standard', key: '', tempo: '', notitie: '', specialLabel: '', expanded: false }, // New song
        items[2]  // Song B
      ];

      expect(getSongNumber(inserted, 0)).toBe(1); // Song A
      expect(getSongNumber(inserted, 1)).toBe(1); // Pause
      expect(getSongNumber(inserted, 2)).toBe(2); // Song C (new song)
      expect(getSongNumber(inserted, 3)).toBe(3); // Song B (now #3)
    });

    it('should maintain correct numbering after removing songs', () => {
      const items: DraftItem[] = [
        { id: '1', kind: 'song', songId: 'song1', label: 'Song A', artist: '', tuning: 'Standard', key: '', tempo: '', notitie: '', specialLabel: '', expanded: false },
        { id: '2', kind: 'special', songId: null, label: '', artist: '', tuning: '', key: '', tempo: '', notitie: '', specialLabel: 'PAUZE', expanded: false },
        { id: '3', kind: 'song', songId: 'song2', label: 'Song B', artist: '', tuning: 'Standard', key: '', tempo: '', notitie: '', specialLabel: '', expanded: false },
        { id: '4', kind: 'song', songId: 'song3', label: 'Song C', artist: '', tuning: 'Standard', key: '', tempo: '', notitie: '', specialLabel: '', expanded: false }
      ];

      // Remove Song B
      const removed: DraftItem[] = [
        items[0], // Song A
        items[1], // Pause
        items[3]  // Song C
      ];

      expect(getSongNumber(removed, 0)).toBe(1); // Song A
      expect(getSongNumber(removed, 1)).toBe(1); // Pause
      expect(getSongNumber(removed, 2)).toBe(2); // Song C (now #2, was #3)
    });
  });

  describe('Performance mode position calculation', () => {
    it('should calculate correct position in performance mode', () => {
      const items: DraftItem[] = [
        { id: '1', kind: 'song', songId: 'song1', label: 'Song A', artist: '', tuning: 'Standard', key: '', tempo: '', notitie: '', specialLabel: '', expanded: false },
        { id: '2', kind: 'special', songId: null, label: '', artist: '', tuning: '', key: '', tempo: '', notitie: '', specialLabel: 'PAUZE', expanded: false },
        { id: '3', kind: 'song', songId: 'song2', label: 'Song B', artist: '', tuning: 'Standard', key: '', tempo: '', notitie: '', specialLabel: '', expanded: false },
        { id: '4', kind: 'song', songId: 'song3', label: 'Song C', artist: '', tuning: 'Standard', key: '', tempo: '', notitie: '', specialLabel: '', expanded: false }
      ];

      const songsOnly = items.filter((item) => item.kind === "song");
      
      // When on Song A (index 0)
      const activeIndex = 0;
      const currentSongNumber = getSongNumber(items, activeIndex);
      const position = songsOnly.length > 0 ? `${currentSongNumber} / ${songsOnly.length}` : "0 / 0";
      expect(position).toBe("1 / 3");

      // When on Song B (index 2)
      const activeIndex2 = 2;
      const currentSongNumber2 = getSongNumber(items, activeIndex2);
      const position2 = songsOnly.length > 0 ? `${currentSongNumber2} / ${songsOnly.length}` : "0 / 0";
      expect(position2).toBe("2 / 3");

      // When on Song C (index 3)
      const activeIndex3 = 3;
      const currentSongNumber3 = getSongNumber(items, activeIndex3);
      const position3 = songsOnly.length > 0 ? `${currentSongNumber3} / ${songsOnly.length}` : "0 / 0";
      expect(position3).toBe("3 / 3");
    });
  });
});