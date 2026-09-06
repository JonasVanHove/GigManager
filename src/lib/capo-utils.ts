/**
 * Capo notation normalization utilities
 * Handles conversion between Roman numerals (I, II, III, etc.) and Arabic numerals (1, 2, 3, etc.)
 */

const ROMAN_TO_ARABIC: Record<string, number> = {
  'I': 1,
  'II': 2,
  'III': 3,
  'IV': 4,
  'V': 5,
  'VI': 6,
  'VII': 7,
  'VIII': 8,
  'IX': 9,
  'X': 10,
  'XI': 11,
  'XII': 12,
};

const ARABIC_TO_ROMAN: Record<number, string> = {
  1: 'I',
  2: 'II',
  3: 'III',
  4: 'IV',
  5: 'V',
  6: 'VI',
  7: 'VII',
  8: 'VIII',
  9: 'IX',
  10: 'X',
  11: 'XI',
  12: 'XII',
};

/**
 * Normalizes a capo notation to a standard integer value
 * Converts "Capo I", "Capo 1", "Capo III", "Capo 3", etc. to integers
 * Returns null if the string doesn't contain a valid capo notation
 */
export function normalizeCapo(value: string): number | null {
  if (!value || typeof value !== 'string') return null;
  
  const trimmed = value.trim().toLowerCase();
  
  // Check if it contains "capo"
  if (!trimmed.includes('capo')) return null;
  
  // Extract the numeric part (either Roman or Arabic)
  const match = trimmed.match(/capo\s+([ivx]+|\d+)/i);
  if (!match) return null;
  
  const numPart = match[1].toUpperCase();
  
  // Try Roman numeral first
  if (ROMAN_TO_ARABIC[numPart] !== undefined) {
    return ROMAN_TO_ARABIC[numPart];
  }
  
  // Try Arabic numeral
  const arabicNum = parseInt(numPart, 10);
  if (!isNaN(arabicNum) && arabicNum > 0 && arabicNum <= 12) {
    return arabicNum;
  }
  
  return null;
}

/**
 * Converts a normalized capo integer to a standard string format
 * Uses Roman numerals for display (e.g., 1 -> "Capo I", 3 -> "Capo III")
 */
export function formatCapo(capoNum: number): string {
  if (capoNum < 1 || capoNum > 12) return 'Standard';
  const roman = ARABIC_TO_ROMAN[capoNum] || capoNum.toString();
  return `Capo ${roman}`;
}

/**
 * Compares two capo notations for equality
 * Returns true if "Capo I" equals "Capo 1", "Capo III" equals "Capo 3", etc.
 */
export function areCaposEqual(capo1: string, capo2: string): boolean {
  const norm1 = normalizeCapo(capo1);
  const norm2 = normalizeCapo(capo2);
  
  if (norm1 === null && norm2 === null) return true;
  if (norm1 === null || norm2 === null) return false;
  
  return norm1 === norm2;
}

/**
 * Gets the capo difference between two capo notations
 * Returns the number of fret positions difference
 */
export function getCapoDifference(capo1: string, capo2: string): number {
  const norm1 = normalizeCapo(capo1);
  const norm2 = normalizeCapo(capo2);
  
  if (norm1 === null || norm2 === null) return 0;
  return Math.abs(norm1 - norm2);
}
