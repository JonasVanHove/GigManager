"use client";

export type BandLogoSize = "sm" | "md" | "lg";

const SIZE_CLASSES: Record<BandLogoSize, string> = {
  sm: "h-8 w-8",
  md: "h-12 w-12",
  lg: "h-16 w-16",
};

type BandLogoFrameProps = {
  src: string;
  alt: string;
  size?: BandLogoSize;
  className?: string;
};

export default function BandLogoFrame({
  src,
  alt,
  size = "md",
  className = "",
}: BandLogoFrameProps) {
  return (
    <div
      className={[
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg",
        "border border-slate-200/90 bg-gradient-to-br from-white via-slate-50 to-slate-100",
        "p-1.5 shadow-sm ring-1 ring-inset ring-black/[0.04]",
        "dark:border-slate-500/50 dark:from-slate-700 dark:via-slate-800 dark:to-slate-900 dark:ring-white/10",
        SIZE_CLASSES[size],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div
        aria-hidden
        className="absolute inset-1 rounded-[4px] bg-[length:8px_8px] opacity-25 dark:opacity-20"
        style={{
          backgroundImage:
            "linear-gradient(45deg, #cbd5e1 25%, transparent 25%), linear-gradient(-45deg, #cbd5e1 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #cbd5e1 75%), linear-gradient(-45deg, transparent 75%, #cbd5e1 75%)",
          backgroundPosition: "0 0, 0 4px, 4px -4px, -4px 0px",
        }}
      />
      <div className="absolute inset-1 rounded-[4px] bg-white/70 dark:bg-slate-900/40" aria-hidden />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="relative z-10 max-h-full max-w-full object-contain drop-shadow-[0_1px_2px_rgba(0,0,0,0.18)] dark:drop-shadow-[0_1px_3px_rgba(0,0,0,0.45)]"
        loading="lazy"
      />
    </div>
  );
}
