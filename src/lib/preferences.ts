export type AppLanguage = "system" | "en" | "nl";

const LANGUAGE_TO_LOCALE: Record<Exclude<AppLanguage, "system">, string> = {
  en: "en-US",
  nl: "nl-BE",
};

// Default Belgian locale for all formatting
const DEFAULT_LOCALE = "nl-BE";

function getNavigatorLocale() {
  if (typeof navigator !== "undefined" && navigator.language) {
    return navigator.language;
  }

  if (typeof document !== "undefined") {
    const lang = document.documentElement.lang?.trim();
    if (lang) return lang;
  }

  return DEFAULT_LOCALE;
}

export function resolveLocale(language?: AppLanguage) {
  if (!language || language === "system") {
    return getNavigatorLocale();
  }

  return LANGUAGE_TO_LOCALE[language];
}

export function formatDate(value: string | Date, locale?: string) {
  return new Intl.DateTimeFormat(locale || DEFAULT_LOCALE, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(value instanceof Date ? value : new Date(value));
}

export function formatDateTime(value: string | Date, locale?: string) {
  return new Intl.DateTimeFormat(locale || DEFAULT_LOCALE, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(value instanceof Date ? value : new Date(value));
}

function hashString(input: string) {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getBandHue(bandName: string) {
  return hashString(bandName.trim().toLowerCase()) % 360;
}

export function getBandColorStyles(bandName: string, bandColor?: string | null) {
  // Use the custom band color if provided, otherwise fall back to hash-based color
  if (bandColor) {
    return {
      solid: {
        backgroundColor: bandColor,
        borderColor: adjustColor(bandColor, -20),
        color: getContrastColor(bandColor),
      },
      soft: {
        backgroundColor: adjustColor(bandColor, 85),
        borderColor: adjustColor(bandColor, -15),
        color: adjustColor(bandColor, -50),
      },
      line: {
        borderColor: bandColor,
        color: adjustColor(bandColor, -35),
      },
    } as const;
  }

  const hue = getBandHue(bandName);
  return {
    solid: {
      backgroundColor: `hsl(${hue} 68% 42%)`,
      borderColor: `hsl(${hue} 68% 34%)`,
      color: "#ffffff",
    },
    soft: {
      backgroundColor: `hsl(${hue} 85% 94%)`,
      borderColor: `hsl(${hue} 70% 78%)`,
      color: `hsl(${hue} 58% 28%)`,
    },
    line: {
      borderColor: `hsl(${hue} 68% 42%)`,
      color: `hsl(${hue} 58% 28%)`,
    },
  } as const;
}

function getContrastColor(hex: string): string {
  const color = hex.replace('#', '');
  const num = parseInt(color, 16);
  const r = (num >> 16) & 0xFF;
  const g = (num >> 8) & 0xFF;
  const b = num & 0xFF;
  
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Return white for dark colors, black for light colors
  return luminance > 0.5 ? '#1f2937' : '#ffffff';
}

function adjustColor(hex: string, amount: number): string {
  const color = hex.replace('#', '');
  const num = parseInt(color, 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
  const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}
