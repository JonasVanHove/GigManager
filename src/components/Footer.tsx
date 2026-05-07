"use client";

import { APP_VERSION_DISPLAY } from "@/lib/version";

export default function Footer() {
  return (
    <footer className="border-t border-slate-200/50 dark:border-slate-700/50 bg-gradient-to-r from-slate-50/80 to-slate-100/80 dark:from-slate-900/50 dark:to-slate-900/30 backdrop-blur py-8 px-4 mt-16">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col items-center justify-center text-center space-y-3">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Developed with{" "}
            <span className="text-red-500 dark:text-red-400 inline-block animate-pulse">♥</span>
            {" "}by Jonas Van Hove
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {APP_VERSION_DISPLAY}
          </p>
        </div>
      </div>
    </footer>
  );
}
