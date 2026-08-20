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
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl",
        "border border-slate-200/80 bg-gradient-to-br from-white/90 via-slate-50/90 to-slate-100/90",
        "p-1.5 shadow-[0_6px_18px_rgba(15,23,42,0.08)] ring-1 ring-inset ring-slate-200/70",
        "backdrop-blur-sm dark:border-slate-600/80 dark:from-slate-800/90 dark:via-slate-900/90 dark:to-slate-950/90 dark:ring-white/10",
        SIZE_CLASSES[size],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div
        aria-hidden
        className="absolute inset-0 rounded-[10px] bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.9),_rgba(148,163,184,0.12)_32%,_rgba(15,23,42,0.04)_100%)] dark:bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_rgba(15,23,42,0.28)_38%,_rgba(2,6,23,0.42)_100%)]"
      />
      <div
        aria-hidden
        className="absolute inset-1.5 rounded-[7px] bg-white/70 backdrop-blur-[2px] dark:bg-slate-950/35"
      />
      <div
        aria-hidden
        className="absolute inset-1.5 rounded-[7px] border border-slate-200/60 dark:border-slate-700/60"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="relative z-10 max-h-full max-w-full object-contain drop-shadow-[0_1px_2px_rgba(15,23,42,0.24)] dark:drop-shadow-[0_1px_4px_rgba(15,23,42,0.55)]"
        loading="lazy"
      />
    </div>
  );
}
