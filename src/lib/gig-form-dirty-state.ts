import type { GigFormData } from "@/types";

export function hasGigFormChanges(
  initial: Partial<GigFormData> | null | undefined,
  current: Partial<GigFormData> | null | undefined,
  selectedMemberIds?: string[]
): boolean {
  if (!initial && !current) return false;
  if (!initial || !current) return true;

  const normalise = (value: unknown) => {
    if (Array.isArray(value)) return value.map((item) => String(item)).sort();
    if (typeof value === "string") return value.trim();
    return value;
  };

  const keys = new Set<string>([
    ...Object.keys(initial),
    ...Object.keys(current),
  ]);

  for (const key of keys) {
    if (key === "bandMemberIds") continue;
    const before = normalise((initial as Record<string, unknown>)[key]);
    const after = normalise((current as Record<string, unknown>)[key]);
    if (JSON.stringify(before) !== JSON.stringify(after)) return true;
  }

  const beforeMemberIds = [...(initial.bandMemberIds ?? [])].map(String).sort();
  const afterMemberIds = [...(selectedMemberIds ?? current.bandMemberIds ?? [])].map(String).sort();

  return JSON.stringify(beforeMemberIds) !== JSON.stringify(afterMemberIds);
}
