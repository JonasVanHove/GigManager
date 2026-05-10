import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClientLayout } from "@/components/ClientLayout";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
  fallback: ["system-ui", "arial"],
});

export const metadata: Metadata = {
  title: "GigsManager - Track Your Performances",
  description:
    "Manage live music performances, track payments, and calculate musician earnings.",
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-64x64.png", sizes: "64x64", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    other: [
      {
        rel: "manifest",
        url: "/manifest.json",
      },
    ],
  },
};


export const viewport: Viewport = {
  colorScheme: "light dark",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  minimumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://supabase.co" />
          <link rel="icon" href="/favicon.png" type="image/png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="GigsManager" />
        <meta name="msapplication-TileColor" content="#0f172a" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        <meta name="viewport" content="viewport-fit=cover, width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, minimal-ui" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('theme') || 'system';
                if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                }
              } catch (e) {}
            `,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html:
              process.env.NODE_ENV === "production"
                ? `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
                  if (isLocalhost) {
                    navigator.serviceWorker.getRegistrations().then((regs) => {
                      regs.forEach((reg) => reg.unregister());
                    });
                    if ('caches' in window) {
                      caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
                    }
                    return;
                  }

                  navigator.serviceWorker
                    .register('/sw.js', { updateViaCache: 'none' })
                    .then((registration) => {
                      console.log('Service Worker registered');
                      registration.update();

                      if (registration.waiting) {
                        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                      }

                      registration.addEventListener('updatefound', () => {
                        const newWorker = registration.installing;
                        if (!newWorker) return;
                        newWorker.addEventListener('statechange', () => {
                          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            newWorker.postMessage({ type: 'SKIP_WAITING' });
                          }
                        });
                      });
                    })
                    .catch((err) => {
                      console.log('Service Worker registration failed:', err);
                    });

                  navigator.serviceWorker.addEventListener('controllerchange', () => {
                    if (window.__swRefreshing) return;
                    window.__swRefreshing = true;
                    window.location.reload();
                  });
                });
              }
            `
                : `
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then((regs) => {
                  regs.forEach((reg) => reg.unregister());
                });
                if ('caches' in window) {
                  caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
                }
              }
            `,
          }}
        />
      </head>
      <body className={`${inter.className} ${inter.variable}`} suppressHydrationWarning>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
