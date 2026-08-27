"use client";

import { APP_VERSION_DISPLAY } from "@/lib/version";

export default function Footer() {
  return (
    <footer className="border-t border-slate-200/60 dark:border-slate-800/80 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl py-8 px-4 mt-16 transition-colors">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col items-center justify-center text-center space-y-2">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Developed with{" "}
            <span className="text-rose-500 dark:text-rose-400 inline-block animate-pulse">♥</span>
            {" "}by Jonas Van Hove
          </p>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>{APP_VERSION_DISPLAY}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
