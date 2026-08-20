export function buildHighResImageUrl(src: string, size: number): string {
  if (!src) return src;

  try {
    const url = new URL(src);
    const params = new URLSearchParams(url.search);
    params.set("width", String(size));
    params.set("height", String(size));
    params.set("quality", "100");
    url.search = params.toString();
    return url.toString();
  } catch {
    const separator = src.includes("?") ? "&" : "?";
    return `${src}${separator}width=${size}&height=${size}&quality=100`;
  }
}

export function getInitials(name?: string | null, email?: string | null): string {
  const source = (name || email || "?").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return source.charAt(0).toUpperCase();
}
