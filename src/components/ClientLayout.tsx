"use client";

import { useState, useEffect } from "react";
import { AuthProvider } from "./AuthProvider";
import { SettingsProvider } from "./SettingsProvider";
import { ThemeProvider } from "./ThemeProvider";
import { I18nProvider } from "./I18nProvider";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fail-safe fallback timer (3 seconds) to guarantee the app clears the initial loading screen
  // even if dynamic hydration, layout effects, or async checks stall on mobile touch devices
  useEffect(() => {
    if (mounted) return;

    const timer = setTimeout(() => {
      console.warn("[ClientLayout] Safety timer triggered: clearing loading screen after 3s");
      setMounted(true);
    }, 3000);

    const unlock = () => {
      setMounted(true);
    };

    window.addEventListener("touchstart", unlock, { once: true, passive: true });
    window.addEventListener("pointerdown", unlock, { once: true, passive: true });
    document.addEventListener("visibilitychange", unlock, { once: true });

    return () => {
      clearTimeout(timer);
      window.removeEventListener("touchstart", unlock);
      window.removeEventListener("pointerdown", unlock);
      document.removeEventListener("visibilitychange", unlock);
    };
  }, [mounted]);

  if (!mounted) {
    return (
      <div
        className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 cursor-pointer select-none"
        onClick={() => setMounted(true)}
        role="status"
        aria-label="Loading application"
      >
        <div className="flex flex-col items-center gap-4">
          <div className="relative flex items-center justify-center" style={{ width: 48, height: 48 }}>
            <div className="absolute inset-0 rounded-full border-4 border-slate-200 dark:border-slate-700"></div>
            <div className="absolute inset-0 rounded-full border-4 border-t-brand-500 border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">Loading application...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthProvider>
      <SettingsProvider>
        <I18nProvider>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </I18nProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}
