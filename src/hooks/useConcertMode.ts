/**
 * useConcertMode Hook
 * 
 * Manages Concert Mode state including:
 * - Toggle Concert Mode on/off
 * - Handle fullscreen attachments
 * - Navigate between items in setlist
 * - Persist settings to localStorage
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import type { ConcertModeSettings, Attachment, FullscreenViewerState } from '@/lib/concert-mode';
import {
  DEFAULT_CONCERT_MODE_SETTINGS,
  EMPTY_VIEWER_STATE,
  getRecommendedTouchTargetSize,
} from '@/lib/concert-mode';
import { fetchAttachments, sortAttachmentsByOrder } from '@/lib/attachment-utils';

const CONCERT_MODE_STORAGE_KEY = 'gigmanager_concert_mode_settings';
const CONCERT_MODE_LAST_ITEM_KEY = 'gigmanager_concert_mode_last_item';

interface UseConcertModeOptions {
  persistSettings?: boolean;
  setlistId?: string;
}

export interface UseConcertModeReturn {
  // Settings
  settings: ConcertModeSettings;
  updateSettings: (patch: Partial<ConcertModeSettings>) => void;
  toggleConcertMode: () => void;

  // Viewer state
  viewerState: FullscreenViewerState;
  openViewer: (attachments: Attachment[], startIndex?: number) => void;
  closeViewer: () => void;
  goToNextAttachment: () => void;
  goToPrevAttachment: () => void;
  goToAttachment: (index: number) => void;

  // Setlist navigation
  currentSetlistItemId: string | null;
  setCurrentSetlistItemId: (itemId: string | null) => void;
  currentItemAttachments: Attachment[];
  isLoadingAttachments: boolean;
  attachmentsError: string | null;

  // Helpers
  loadAttachmentsForItem: (itemId: string, token: string) => Promise<void>;
}

export function useConcertMode(options: UseConcertModeOptions = {}): UseConcertModeReturn {
  const { persistSettings = true, setlistId } = options;

  // Settings state
  const [settings, setSettingsState] = useState<ConcertModeSettings>(
    DEFAULT_CONCERT_MODE_SETTINGS
  );

  // Viewer state
  const [viewerState, setViewerState] = useState<FullscreenViewerState>(
    EMPTY_VIEWER_STATE
  );

  // Current setlist item
  const [currentSetlistItemId, setCurrentSetlistItemId] = useState<string | null>(null);
  const [currentItemAttachments, setCurrentItemAttachments] = useState<Attachment[]>([]);
  const [isLoadingAttachments, setIsLoadingAttachments] = useState(false);
  const [attachmentsError, setAttachmentsError] = useState<string | null>(null);

  // Load settings from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined' || !persistSettings) return;

    try {
      // Load Concert Mode settings
      const savedSettings = localStorage.getItem(CONCERT_MODE_STORAGE_KEY);
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        setSettingsState(prev => ({
          ...prev,
          ...parsed,
        }));
      }

      // Restore last viewed item for this setlist
      if (setlistId) {
        const lastItemKey = `${CONCERT_MODE_LAST_ITEM_KEY}:${setlistId}`;
        const lastItemId = localStorage.getItem(lastItemKey);
        if (lastItemId) {
          setCurrentSetlistItemId(lastItemId);
        }
      }
    } catch (e) {
      console.debug('Failed to load Concert Mode settings from localStorage:', e);
    }
  }, [persistSettings, setlistId]);

  // Persist settings to localStorage whenever they change
  useEffect(() => {
    if (typeof window === 'undefined' || !persistSettings) return;

    try {
      localStorage.setItem(CONCERT_MODE_STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
      console.debug('Failed to save Concert Mode settings to localStorage:', e);
    }
  }, [settings, persistSettings]);

  // Persist current item to localStorage
  useEffect(() => {
    if (typeof window === 'undefined' || !persistSettings || !setlistId) return;

    try {
      if (currentSetlistItemId) {
        const lastItemKey = `${CONCERT_MODE_LAST_ITEM_KEY}:${setlistId}`;
        localStorage.setItem(lastItemKey, currentSetlistItemId);
      }
    } catch (e) {
      console.debug('Failed to persist last item:', e);
    }
  }, [currentSetlistItemId, setlistId, persistSettings]);

  // Auto-adjust touch target size for device on mount
  useEffect(() => {
    if (!settings.enabled) return;
    
    const recommendedSize = getRecommendedTouchTargetSize();
    if (recommendedSize !== settings.touchTargetSize) {
      setSettingsState(prev => ({
        ...prev,
        touchTargetSize: recommendedSize,
      }));
    }
  }, [settings.enabled]);

  // Update settings
  const updateSettings = useCallback((patch: Partial<ConcertModeSettings>) => {
    setSettingsState(prev => ({
      ...prev,
      ...patch,
    }));
  }, []);

  // Toggle Concert Mode on/off
  const toggleConcertMode = useCallback(() => {
    updateSettings({ enabled: !settings.enabled });
  }, [settings.enabled, updateSettings]);

  // Open viewer with attachments
  const openViewer = useCallback((attachments: Attachment[], startIndex: number = 0) => {
    const sorted = sortAttachmentsByOrder(attachments);
    setViewerState(prev => ({
      ...prev,
      isOpen: true,
      currentIndex: Math.min(startIndex, sorted.length - 1),
      attachments: sorted,
      error: null,
    }));
  }, []);

  // Close viewer
  const closeViewer = useCallback(() => {
    setViewerState(prev => ({
      ...prev,
      isOpen: false,
    }));
  }, []);

  // Navigate to next attachment
  const goToNextAttachment = useCallback(() => {
    setViewerState(prev => {
      if (!prev.isOpen || prev.attachments.length === 0) return prev;
      return {
        ...prev,
        currentIndex: (prev.currentIndex + 1) % prev.attachments.length,
      };
    });
  }, []);

  // Navigate to previous attachment
  const goToPrevAttachment = useCallback(() => {
    setViewerState(prev => {
      if (!prev.isOpen || prev.attachments.length === 0) return prev;
      return {
        ...prev,
        currentIndex: (prev.currentIndex - 1 + prev.attachments.length) % prev.attachments.length,
      };
    });
  }, []);

  // Go to specific attachment
  const goToAttachment = useCallback((index: number) => {
    setViewerState(prev => {
      if (!prev.isOpen || index < 0 || index >= prev.attachments.length) return prev;
      return {
        ...prev,
        currentIndex: index,
      };
    });
  }, []);

  // Load attachments for a setlist item
  const loadAttachmentsForItem = useCallback(
    async (itemId: string, token: string) => {
      setIsLoadingAttachments(true);
      setAttachmentsError(null);

      try {
        const attachments = await fetchAttachments(itemId, token);
        setCurrentItemAttachments(attachments);
        setCurrentSetlistItemId(itemId);

        // Auto-open viewer if attachments exist and Concert Mode is enabled
        if (settings.enabled && attachments.length > 0) {
          openViewer(attachments);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load attachments';
        setAttachmentsError(message);
        console.error('Failed to load attachments for item:', err);
      } finally {
        setIsLoadingAttachments(false);
      }
    },
    [settings.enabled, openViewer]
  );

  return {
    // Settings
    settings,
    updateSettings,
    toggleConcertMode,

    // Viewer state
    viewerState,
    openViewer,
    closeViewer,
    goToNextAttachment,
    goToPrevAttachment,
    goToAttachment,

    // Setlist navigation
    currentSetlistItemId,
    setCurrentSetlistItemId,
    currentItemAttachments,
    isLoadingAttachments,
    attachmentsError,

    // Helpers
    loadAttachmentsForItem,
  };
}
