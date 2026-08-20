export function getBandMemberInitial(name?: string | null): string {
  const trimmed = name?.trim();
  if (!trimmed) {
    return "?";
  }

  return trimmed.charAt(0).toUpperCase();
}

export function getBandMemberAvatarUrl(
  name?: string | null,
  avatarUrl?: string | null,
  fallbackAvatarUrl?: string | null
): string | null {
  const normalizedName = name?.trim().toLowerCase();

  if (normalizedName === "jonas") {
    return fallbackAvatarUrl || avatarUrl || null;
  }

  return null;
}