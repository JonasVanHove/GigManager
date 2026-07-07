/**
 * Concert Mode Types & Utilities
 * 
 * Provides types and helpers for the live performance-focused Concert Mode feature.
 * Supports fullscreen notes, lyrics, chord charts, and score attachments for
 * musicians/bands during performances.
 */

/**
 * Supported attachment types for setlist items
 */
export type AttachmentType = 'image' | 'score' | 'lyrics' | 'chords' | 'pdf';

/**
 * An attachment linked to a setlist item (song/note)
 */
export interface Attachment {
  id: string;
  setlistItemId: string;
  url: string;
  type: AttachmentType;
  title: string | null;
  description: string | null;
  mimeType: string;
  fileSize: number;
  uploadedAt: string;
  order: number;
}

/**
 * Concert Mode preferences
 */
export interface ConcertModeSettings {
  enabled: boolean;
  autoLandscape: boolean; // Hint to enable landscape mode
  keepBrightnessLocked: boolean; // Don't dim screen
  invertColors: boolean; // Invert paper-like media for dark stages
  brightnessBoost: boolean; // Slightly brighten media for low-light rooms
  highContrast: boolean; // Increase contrast for readability
  preloadNextAttachment: boolean; // Load next image in background
  largeTypography: boolean; // Bigger fonts for stage visibility
  hideNonEssentialControls: boolean; // Minimalist UI
  touchTargetSize: 'normal' | 'large' | 'extra-large'; // For tablets
  swipeNavigation: boolean; // Swipe left/right for next/prev
  keyboardNavigation: boolean; // Arrow keys for navigation
}

export const DEFAULT_CONCERT_MODE_SETTINGS: ConcertModeSettings = {
  enabled: false,
  autoLandscape: true,
  keepBrightnessLocked: false,
  invertColors: false,
  brightnessBoost: false,
  highContrast: false,
  preloadNextAttachment: true,
  largeTypography: true,
  hideNonEssentialControls: true,
  touchTargetSize: 'large',
  swipeNavigation: true,
  keyboardNavigation: true,
};

/**
 * State for the fullscreen viewer
 */
export interface FullscreenViewerState {
  isOpen: boolean;
  currentIndex: number;
  attachments: Attachment[];
  isLoading: boolean;
  error: string | null;
  preloadedUrls: Set<string>;
}

export const EMPTY_VIEWER_STATE: FullscreenViewerState = {
  isOpen: false,
  currentIndex: 0,
  attachments: [],
  isLoading: false,
  error: null,
  preloadedUrls: new Set(),
};

/**
 * Concert Mode context data
 */
export interface ConcertModeContext {
  settings: ConcertModeSettings;
  viewer: FullscreenViewerState;
  currentSetlistItemId: string | null;
  currentSongIndex: number;
  totalSongs: number;
}

/**
 * Get CSS class for touch target sizing
 */
export function getTouchTargetClass(size: ConcertModeSettings['touchTargetSize']): string {
  switch (size) {
    case 'normal':
      return 'p-2 text-base';
    case 'large':
      return 'p-3 text-lg';
    case 'extra-large':
      return 'p-4 text-xl';
    default:
      return 'p-3 text-lg';
  }
}

/**
 * Check if running on tablet device
 */
export function isTabletDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent.toLowerCase();
  const isTablet =
    /ipad|android(?!.*mobi)|tablet|kindle/.test(ua) &&
    !/iphone|ipod/.test(ua);
  return isTablet;
}

/**
 * Check if device is mobile
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return /iphone|ipod|android|mobile|webos/.test(navigator.userAgent.toLowerCase());
}

/**
 * Get recommended touch target size for current device
 */
export function getRecommendedTouchTargetSize(): ConcertModeSettings['touchTargetSize'] {
  if (isTabletDevice()) return 'extra-large';
  if (isMobileDevice()) return 'large';
  return 'normal';
}

/**
 * Determine if landscape mode is recommended
 */
export function shouldRecommendLandscape(): boolean {
  return isTabletDevice() || isMobileDevice();
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Get icon for attachment type
 */
export function getAttachmentTypeIcon(type: AttachmentType): string {
  switch (type) {
    case 'image':
    case 'lyrics':
      return '🖼️';
    case 'score':
    case 'chords':
      return '🎵';
    case 'pdf':
      return '📄';
    default:
      return '📎';
  }
}

/**
 * Get label for attachment type
 */
export function getAttachmentTypeLabel(type: AttachmentType): string {
  switch (type) {
    case 'image':
      return 'Image';
    case 'lyrics':
      return 'Lyrics';
    case 'score':
      return 'Score';
    case 'chords':
      return 'Chords';
    case 'pdf':
      return 'PDF';
    default:
      return 'Attachment';
  }
}

/**
 * Check if URL is an image
 */
export function isImageUrl(url: string): boolean {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
  const lowercaseUrl = url.toLowerCase();
  return imageExtensions.some(ext => lowercaseUrl.includes(ext));
}

/**
 * Check if URL is a PDF
 */
export function isPdfUrl(url: string): boolean {
  return url.toLowerCase().includes('.pdf');
}

/**
 * Load and cache image for preloading
 */
export async function preloadImage(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}

/**
 * Request screen orientation (fullscreen hint)
 */
export async function requestLandscapeOrientation(): Promise<void> {
  try {
    if (document.documentElement.requestFullscreen) {
      await document.documentElement.requestFullscreen();
      
      // Try to lock orientation if available (use runtime checks + cast for TS)
      try {
        const orientationAny: any = (screen as any).orientation;
        if (orientationAny && typeof orientationAny.lock === 'function') {
          await orientationAny.lock('landscape');
        }
      } catch (e) {
        console.debug('Could not lock orientation:', e);
      }
    }
  } catch (e) {
    console.debug('Could not request fullscreen:', e);
  }
}

/**
 * Exit fullscreen
 */
export async function exitFullscreen(): Promise<void> {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    }
    
    try {
      const orientationAny: any = (screen as any).orientation;
      if (orientationAny && typeof orientationAny.unlock === 'function') {
        try {
          orientationAny.unlock();
        } catch (e) {
          console.debug('Could not unlock orientation:', e);
        }
      }
    } catch (e) {
      console.debug('Could not access screen.orientation:', e);
    }
  } catch (e) {
    console.debug('Could not exit fullscreen:', e);
  }
}
