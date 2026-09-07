"use client";

import { useEffect, useState } from "react";
import { AuthProvider } from "./AuthProvider";
import { SettingsProvider } from "./SettingsProvider";
import { ThemeProvider } from "./ThemeProvider";
import { I18nProvider } from "./I18nProvider";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // Use requestAnimationFrame to ensure immediate rendering on mobile pull-to-refresh
    // This prevents blank screen by pushing mount state to next animation frame
    requestAnimationFrame(() => {
      setIsMounted(true);
    });
  }, []);

  // Always render children - don't block on mounting state
  // The providers will handle their own loading states internally
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
