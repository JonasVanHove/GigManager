"use client";

import type { CSSProperties } from "react";
import { getBandColorStyles } from "@/lib/preferences";

interface BandTagProps {
  name: string;
  color?: string | null;
  variant?: "solid" | "soft" | "line";
  className?: string;
}

export default function BandTag({ name, color, variant = "soft", className = "" }: BandTagProps) {
  const styles = getBandColorStyles(name, color)[variant] as CSSProperties;

  if (variant === "line") {
    return (
      <span
        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${className}`.trim()}
        style={styles}
      >
        {name}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex min-h-[30px] items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium leading-none ${className}`.trim()}
      style={styles}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {name}
    </span>
  );
}
