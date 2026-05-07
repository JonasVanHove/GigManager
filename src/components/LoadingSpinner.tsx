"use client";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  message?: string;
  fullScreen?: boolean;
}

export default function LoadingSpinner({ size = "md", message, fullScreen = false }: LoadingSpinnerProps) {
  const sizes = {
    sm: "h-5 w-5",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  };

  const spinner = (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="relative h-20 w-20 flex items-center justify-center" role="status" aria-label="Loading">
        {/* Outer rotating ring */}
        <div
          className="absolute inset-0 rounded-full border-2 border-transparent animate-spin"
          style={{
            animationDuration: "2s",
            borderTopColor: "#60a5fa",
            borderRightColor: "#38bdf8",
          }}
        />

        {/* Middle pulsing ring */}
        <div
          className="absolute inset-2 rounded-full border-2 animate-pulse"
          style={{
            borderColor: "rgba(96, 165, 250, 0.5)",
          }}
        />

        {/* Inner rotating ring (reverse) */}
        <div
          className="absolute inset-4 rounded-full border-2 border-transparent animate-spin"
          style={{
            animationDuration: "3s",
            animationDirection: "reverse",
            borderBottomColor: "#38bdf8",
            borderLeftColor: "#60a5fa",
          }}
        />

        {/* Center dot with gradient */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="h-2 w-2 rounded-full"
            style={{
              background: "linear-gradient(135deg, #3b82f6, #f97316)",
            }}
          />
        </div>

        {/* Floating accent circles */}
        <div
          className="absolute h-3 w-3 rounded-full animate-bounce"
          style={{
            top: "-8px",
            backgroundColor: "rgba(96, 165, 250, 0.6)",
            animationDelay: "0s",
          }}
        />
        <div
          className="absolute h-2 w-2 rounded-full animate-bounce"
          style={{
            bottom: "-6px",
            backgroundColor: "rgba(249, 115, 22, 0.6)",
            animationDelay: "0.2s",
          }}
        />
      </div>

      {message && (
        <div className="text-center space-y-2">
          <p className="text-sm font-medium text-slate-200">{message}</p>
          <div className="flex items-center justify-center gap-1">
            <span
              className="inline-block h-2 w-2 rounded-full animate-bounce"
              style={{
                backgroundColor: "#60a5fa",
                animationDelay: "0s",
              }}
            />
            <span
              className="inline-block h-2 w-2 rounded-full animate-bounce"
              style={{
                backgroundColor: "#60a5fa",
                animationDelay: "0.2s",
              }}
            />
            <span
              className="inline-block h-2 w-2 rounded-full animate-bounce"
              style={{
                backgroundColor: "#60a5fa",
                animationDelay: "0.4s",
              }}
            />
          </div>
        </div>
      )}
      <span className="sr-only">Loading...</span>
    </div>
  );

  if (fullScreen) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
        style={{
          backgroundColor: "#0f172a",
        }}
      >
        {/* Animated background gradient layers */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Top-left gradient */}
          <div
            className="absolute -top-1/3 -left-1/3 w-2/3 h-2/3 rounded-full blur-3xl opacity-20"
            style={{
              background: "radial-gradient(circle, #3b82f6 0%, transparent 70%)",
              animation: "float 6s ease-in-out infinite",
            }}
          />
          {/* Bottom-right gradient */}
          <div
            className="absolute -bottom-1/3 -right-1/3 w-2/3 h-2/3 rounded-full blur-3xl opacity-20"
            style={{
              background: "radial-gradient(circle, #f97316 0%, transparent 70%)",
              animation: "float 8s ease-in-out infinite reverse",
            }}
          />
        </div>

        {/* Add animation keyframes */}
        <style>{`
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-20px); }
          }
          @keyframes shimmer {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.8; }
          }
        `}</style>

        {/* Content container */}
        <div className="relative z-10 flex flex-col items-center justify-center gap-12 px-6 max-w-md">
          {/* Logo/Branding - Elegantly centered */}
          <div className="flex flex-col items-center gap-4">
            {/* Logo with glow effect */}
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-brand-500 to-orange-500 blur-xl opacity-50" />
              <div className="relative h-20 w-20 flex items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-orange-500 shadow-2xl">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/30 to-transparent" />
                <svg className="h-10 w-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
            
            {/* Brand name */}
            <div className="text-center space-y-1">
              <h2 className="text-2xl font-bold tracking-tight text-white">GigsManager</h2>
              <p className="text-sm font-light text-slate-400 tracking-wide">Performance Management</p>
            </div>
          </div>

          {/* Elegant spinner */}
          <div className="relative h-20 w-20 flex items-center justify-center">
            {/* Outer rotating ring - thinner, more elegant */}
            <div
              className="absolute inset-0 rounded-full border border-transparent animate-spin"
              style={{
                animationDuration: "3s",
                borderTopColor: "#60a5fa",
                borderRightColor: "transparent",
                borderBottomColor: "transparent",
                borderLeftColor: "#38bdf8",
              }}
            />

            {/* Middle ring - subtle */}
            <div
              className="absolute inset-3 rounded-full border border-slate-700/50"
              style={{
                borderTopColor: "#38bdf8",
                opacity: 0.3,
              }}
            />

            {/* Inner rotating ring (reverse) */}
            <div
              className="absolute inset-6 rounded-full border border-transparent animate-spin"
              style={{
                animationDuration: "4s",
                animationDirection: "reverse",
                borderTopColor: "#f97316",
              }}
            />

            {/* Center accent */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="h-1.5 w-1.5 rounded-full"
                style={{
                  background: "linear-gradient(135deg, #60a5fa, #f97316)",
                  boxShadow: "0 0 12px rgba(96, 165, 250, 0.5)",
                }}
              />
            </div>
          </div>

          {/* Loading text - Clear hierarchy */}
          <div className="text-center space-y-4 w-full">
            <p className="text-lg font-semibold text-slate-50 tracking-tight">
              {message || "Preparing your gigs..."}
            </p>
            
            {/* Elegant progress dots */}
            <div className="flex items-center justify-center gap-2">
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{
                  backgroundColor: "#60a5fa",
                  animation: "shimmer 1.4s ease-in-out infinite",
                }}
              />
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{
                  backgroundColor: "#38bdf8",
                  animation: "shimmer 1.4s ease-in-out infinite 0.2s",
                }}
              />
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{
                  backgroundColor: "#f97316",
                  animation: "shimmer 1.4s ease-in-out infinite 0.4s",
                }}
              />
            </div>
          </div>

          {/* Subtle status text */}
          <p className="text-xs text-slate-500 font-light tracking-wide">Just a moment...</p>
        </div>
      </div>
    );
  }

  return spinner;
}

export function SkeletonLoader({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700 ${className}`} />
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-3">
          <SkeletonLoader className="h-6 w-3/4" />
          <SkeletonLoader className="h-4 w-1/2" />
        </div>
        <SkeletonLoader className="h-8 w-20" />
      </div>
      <div className="mt-4 space-y-2">
        <SkeletonLoader className="h-4 w-full" />
        <SkeletonLoader className="h-4 w-5/6" />
      </div>
    </div>
  );
}
