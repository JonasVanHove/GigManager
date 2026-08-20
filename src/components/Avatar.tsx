"use client";

import Image from "next/image";

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

const SIZE_CONFIG: Record<
  AvatarSize,
  { container: string; pixels: number; text: string; ring: string }
> = {
  xs: { container: "h-6 w-6", pixels: 48, text: "text-[10px]", ring: "ring-1" },
  sm: { container: "h-8 w-8", pixels: 64, text: "text-xs", ring: "ring-1" },
  md: { container: "h-10 w-10", pixels: 80, text: "text-sm", ring: "ring-2" },
  lg: { container: "h-12 w-12", pixels: 96, text: "text-base", ring: "ring-2" },
  xl: { container: "h-20 w-20", pixels: 160, text: "text-xl", ring: "ring-2" },
};

function getInitials(name?: string | null, email?: string | null): string {
  const source = (name || email || "?").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return source.charAt(0).toUpperCase();
}

function isRemoteImageSrc(src: string): boolean {
  return src.startsWith("http://") || src.startsWith("https://");
}

type AvatarProps = {
  src?: string | null;
  name?: string | null;
  email?: string | null;
  alt?: string;
  size?: AvatarSize;
  className?: string;
  priority?: boolean;
};

export default function Avatar({
  src,
  name,
  email,
  alt,
  size = "md",
  className,
  priority = false,
}: AvatarProps) {
  const config = SIZE_CONFIG[size];
  const initials = getInitials(name, email);
  const label = alt || name || email || "Avatar";

  return (
    <div
      className={[
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full",
        "bg-gradient-to-br from-slate-200 via-slate-100 to-slate-300",
        "font-semibold text-slate-700 shadow-sm",
        "ring-slate-200/80 dark:from-slate-600 dark:via-slate-700 dark:to-slate-800 dark:text-slate-100 dark:ring-slate-600/60",
        config.container,
        config.text,
        config.ring,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={label}
    >
      {src ? (
        isRemoteImageSrc(src) ? (
          <Image
            src={src}
            alt={label}
            width={config.pixels}
            height={config.pixels}
            quality={92}
            priority={priority}
            sizes={`${config.pixels}px`}
            className="h-full w-full object-cover object-center [image-rendering:auto]"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={label}
            className="h-full w-full object-cover object-center"
          />
        )
      ) : (
        <span aria-hidden="true">{initials}</span>
      )}
    </div>
  );
}

export { getInitials };
