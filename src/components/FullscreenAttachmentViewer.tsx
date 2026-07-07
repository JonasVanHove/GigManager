'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { Attachment } from '@/lib/concert-mode';
import { preloadImage } from '@/lib/concert-mode';
import type { CSSProperties } from 'react';

interface FullscreenAttachmentViewerProps {
  isOpen: boolean;
  attachments: Attachment[];
  currentIndex?: number;
  onClose: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  onIndexChange?: (index: number) => void;
  isLoading?: boolean;
  error?: string | null;
  showControls?: boolean;
  preloadNextAttachment?: boolean;
  className?: string;
  style?: CSSProperties;
}

/**
 * FullscreenAttachmentViewer - Component for displaying notes, lyrics, chords, scores
 * 
 * Features:
 * - Fullscreen display with dark overlay
 * - Touch/tap to close on mobile/tablet
 * - ESC to close on desktop
 * - Arrow key or swipe navigation
 * - Image preloading for smooth transitions
 * - Responsive sizing (95vw/95vh max)
 * - Large typography for stage use
 * - Graceful error handling
 */
export function FullscreenAttachmentViewer({
  isOpen,
  attachments,
  currentIndex = 0,
  onClose,
  onNext,
  onPrev,
  onIndexChange,
  isLoading = false,
  error = null,
  showControls = true,
  preloadNextAttachment = true,
  className = '',
  style,
}: FullscreenAttachmentViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const [displayIndex, setDisplayIndex] = useState(currentIndex);

  // Sync with external index changes
  useEffect(() => {
    setDisplayIndex(currentIndex);
  }, [currentIndex]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        if (onNext) {
          onNext();
          const nextIndex = (displayIndex + 1) % attachments.length;
          setDisplayIndex(nextIndex);
          onIndexChange?.(nextIndex);
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (onPrev) {
          onPrev();
          const prevIndex = (displayIndex - 1 + attachments.length) % attachments.length;
          setDisplayIndex(prevIndex);
          onIndexChange?.(prevIndex);
        }
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [isOpen, displayIndex, attachments.length, onClose, onNext, onPrev, onIndexChange]);

  // Handle touch/swipe navigation
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current || !e.changedTouches.length) return;

    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const diffX = endX - touchStartRef.current.x;
    const diffY = endY - touchStartRef.current.y;

    // Horizontal swipe (> 50px)
    if (Math.abs(diffX) > 50 && Math.abs(diffY) < 50) {
      if (diffX > 0 && onPrev) {
        // Swipe right = prev
        onPrev();
        const prevIndex = (displayIndex - 1 + attachments.length) % attachments.length;
        setDisplayIndex(prevIndex);
        onIndexChange?.(prevIndex);
      } else if (diffX < 0 && onNext) {
        // Swipe left = next
        onNext();
        const nextIndex = (displayIndex + 1) % attachments.length;
        setDisplayIndex(nextIndex);
        onIndexChange?.(nextIndex);
      }
    }

    // Tap to close (small movement)
    if (Math.abs(diffX) < 10 && Math.abs(diffY) < 10) {
      onClose();
    }

    touchStartRef.current = null;
  };

  // Preload next attachment
  useEffect(() => {
    if (!preloadNextAttachment || !isOpen || attachments.length === 0) return;

    const nextIndex = (displayIndex + 1) % attachments.length;
    const nextAttachment = attachments[nextIndex];

    if (nextAttachment?.url) {
      preloadImage(nextAttachment.url).catch(() => {
        // Preload errors are non-critical
      });
    }
  }, [displayIndex, isOpen, attachments, preloadNextAttachment]);

  if (!isOpen || attachments.length === 0) {
    return null;
  }

  const current = attachments[displayIndex];
  if (!current) return null;

  const isImage = current.url.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp|svg)$/i);

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-sm ${className}`.trim()}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={style}
    >
      {/* Header with title and counter */}
      {showControls && (
        <div className="flex items-center justify-between border-b border-white/10 bg-black/50 px-4 py-3 sm:px-6">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-semibold text-white sm:text-xl">
              {current.title || 'Attachment'}
            </h2>
            {current.description && (
              <p className="line-clamp-1 text-sm text-gray-300">{current.description}</p>
            )}
          </div>
          <div className="ml-4 flex-shrink-0 rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-white">
            {displayIndex + 1} / {attachments.length}
          </div>
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex items-center justify-center overflow-hidden p-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-2">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-white" />
            <p className="text-sm text-gray-300">Loading...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="text-4xl">⚠️</div>
            <p className="max-w-sm text-center text-white">{error}</p>
            <button
              onClick={onClose}
              className="mt-4 rounded-lg bg-white/10 px-4 py-2 text-white hover:bg-white/20 transition-colors"
            >
              Close
            </button>
          </div>
        ) : isImage ? (
          <img
            ref={imageRef}
            src={current.url}
            alt={current.title || 'Attachment'}
            className="max-h-[95vh] max-w-[95vw] w-auto h-auto object-contain"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="text-5xl">📄</div>
            <p className="text-lg text-white">{current.title || 'Document'}</p>
            <p className="text-sm text-gray-300">
              {current.description || current.type.toUpperCase()}
            </p>
            <a
              href={current.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 transition-colors"
            >
              Open Document
            </a>
          </div>
        )}
      </div>

      {/* Navigation controls */}
      {showControls && attachments.length > 1 && (
        <div className="flex items-center justify-between border-t border-white/10 bg-black/50 px-4 py-3 sm:px-6">
          <button
            onClick={() => {
              if (onPrev) {
                onPrev();
                const prevIndex = (displayIndex - 1 + attachments.length) % attachments.length;
                setDisplayIndex(prevIndex);
                onIndexChange?.(prevIndex);
              }
            }}
            className="rounded-lg bg-white/10 p-3 text-white hover:bg-white/20 transition-colors active:bg-white/30 disabled:opacity-50"
            aria-label="Previous attachment"
          >
            ← Previous
          </button>

          <button
            onClick={onClose}
            className="rounded-lg bg-white/10 px-4 py-2 text-white hover:bg-white/20 transition-colors active:bg-white/30"
          >
            Close (ESC)
          </button>

          <button
            onClick={() => {
              if (onNext) {
                onNext();
                const nextIndex = (displayIndex + 1) % attachments.length;
                setDisplayIndex(nextIndex);
                onIndexChange?.(nextIndex);
              }
            }}
            className="rounded-lg bg-white/10 p-3 text-white hover:bg-white/20 transition-colors active:bg-white/30 disabled:opacity-50"
            aria-label="Next attachment"
          >
            Next →
          </button>
        </div>
      )}

      {/* Mobile close hint */}
      {!showControls && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center text-xs text-gray-400">
          Tap to close • Swipe to navigate
        </div>
      )}
    </div>
  );
}
