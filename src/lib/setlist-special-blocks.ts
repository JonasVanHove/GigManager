export const SPECIAL_BLOCK_KEYS = ["PAUZE", "BIS", "BINDTEKST"] as const;
export type SpecialBlockKey = (typeof SPECIAL_BLOCK_KEYS)[number];

export function normalizeSpecialBlockKey(label: string): SpecialBlockKey | null {
  const upper = label.trim().toUpperCase();
  if (upper.includes("PAUZE") || upper.includes("PAUSE")) return "PAUZE";
  if (upper.includes("BIS") || upper.includes("ENCORE")) return "BIS";
  if (upper.includes("BINDTEKST") || upper.includes("STAGE TALK") || upper.includes("INTERLUDE")) {
    return "BINDTEKST";
  }
  return null;
}

export function isKnownSpecialBlock(label: string): boolean {
  return normalizeSpecialBlockKey(label) !== null;
}

const SPECIAL_BLOCK_LABELS: Record<string, Record<SpecialBlockKey, string>> = {
  nl: { PAUZE: "PAUZE", BIS: "BIS", BINDTEKST: "BINDTEKST" },
  en: { PAUZE: "PAUSE", BIS: "ENCORE", BINDTEKST: "STAGE TALK" },
};

export function getSpecialBlockDisplayLabel(label: string, locale = "nl"): string {
  const key = normalizeSpecialBlockKey(label);
  if (!key) return label;
  const localeKey = locale.startsWith("en") ? "en" : "nl";
  return SPECIAL_BLOCK_LABELS[localeKey][key];
}

export function getSpecialBlockTranslationKey(label: string): string | null {
  const key = normalizeSpecialBlockKey(label);
  if (key === "PAUZE") return "setlists.pauseBlock";
  if (key === "BIS") return "setlists.bisBlock";
  if (key === "BINDTEKST") return "setlists.bindtekstBlock";
  return null;
}
