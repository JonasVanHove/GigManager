'use client';

import { useImmersiveMode } from '@/lib/use-immersive-mode';
import { Icons } from './Icons';

export function ImmersiveButton() {
  const { isFullscreen, canRequestFullscreen, toggleFullscreen } = useImmersiveMode();

  if (!canRequestFullscreen) {
    return null;
  }

  return (
    <button
      onClick={toggleFullscreen}
      className={`hidden sm:inline-flex items-center gap-1.5 md:gap-2 rounded-lg border px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm font-medium transition ${
        isFullscreen
          ? 'border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-400 dark:bg-brand-950/30 dark:text-brand-300'
          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
      }`}
      title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
    >
      {isFullscreen ? (
        <>
          <svg className="h-4 w-4 md:h-4 md:w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
          </svg>
          <span className="hidden lg:inline whitespace-nowrap">Exit</span>
        </>
      ) : (
        <>
          <svg className="h-4 w-4 md:h-4 md:w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
          </svg>
          <span className="hidden lg:inline whitespace-nowrap">Fullscreen</span>
        </>
      )}
    </button>
  );
}

// Mobile icon-only version
export function ImmersiveButtonMobile() {
  const { isFullscreen, canRequestFullscreen, toggleFullscreen } = useImmersiveMode();

  if (!canRequestFullscreen) {
    return null;
  }

  return (
    <button
      onClick={toggleFullscreen}
      className={`sm:hidden p-1.5 rounded-lg border transition flex-shrink-0 ${
        isFullscreen
          ? 'border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-400 dark:bg-brand-950/30 dark:text-brand-300'
          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
      }`}
      title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen mode'}
    >
      <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
      </svg>
    </button>
  );
}
