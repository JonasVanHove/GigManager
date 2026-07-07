/**
 * Attachment utility helpers for Concert Mode
 */

import type { Attachment, AttachmentType } from '@/lib/concert-mode';

/**
 * Mock data for attachments (temporary until database integration)
 * In production, these will be fetched from /api/setlist-items/:itemId/attachments
 */
export const MOCK_ATTACHMENTS: Record<string, Attachment[]> = {
  // Example setlist item with attachments
  'item-1': [
    {
      id: 'att-1',
      setlistItemId: 'item-1',
      url: '/images/sheet-music-example.png',
      type: 'score',
      title: 'Sheet Music - Verse A',
      description: 'Main verse section',
      mimeType: 'image/png',
      fileSize: 245000,
      uploadedAt: new Date().toISOString(),
      order: 1,
    },
    {
      id: 'att-2',
      setlistItemId: 'item-1',
      url: '/images/chord-chart.png',
      type: 'chords',
      title: 'Chord Chart',
      description: 'Guitar chord progression',
      mimeType: 'image/png',
      fileSize: 178000,
      uploadedAt: new Date().toISOString(),
      order: 2,
    },
  ],
  'item-2': [
    {
      id: 'att-3',
      setlistItemId: 'item-2',
      url: '/images/lyrics-example.png',
      type: 'lyrics',
      title: 'Lyrics',
      description: 'Full lyrics with notes',
      mimeType: 'image/png',
      fileSize: 234000,
      uploadedAt: new Date().toISOString(),
      order: 1,
    },
  ],
};

/**
 * Fetch attachments for a setlist item
 * In production, calls /api/setlist-items/:itemId/attachments
 */
export async function fetchAttachments(
  itemId: string,
  token: string
): Promise<Attachment[]> {
  try {
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`/api/setlist-items/${itemId}/attachments`, {
      headers,
    });

    if (!res.ok) {
      console.error('fetchAttachments: non-ok response', res.status);
      return [];
    }

    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('Failed to fetch attachments:', err);
    return [];
  }
}

/**
 * Upload attachment for setlist item
 * In production, calls POST /api/setlist-items/:itemId/attachments
 */
export async function uploadAttachment(
  itemId: string,
  file: File,
  type: AttachmentType,
  title: string,
  description?: string,
  token?: string
): Promise<Attachment> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('type', type);
  formData.append('title', title);
  if (description) formData.append('description', description);
  // For now, we POST JSON pointers (actual file upload to storage is handled separately)
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  // If file is a local blob we can't send it as JSON; caller should upload to storage and pass URL.
  // Here we provide a minimal path: reject if File is present.
  if (file) {
    throw new Error('Direct file uploads are not supported by this endpoint yet. Upload to storage and call POST with URL.');
  }

  const res = await fetch(`/api/setlist-items/${itemId}/attachments`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ url: '', type, title, description }),
  });

  if (!res.ok) throw new Error('Failed to upload attachment');
  return res.json();
}

/**
 * Delete attachment
 */
export async function deleteAttachment(
  attachmentId: string,
  token: string
): Promise<void> {
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`/api/attachments/${attachmentId}`, {
    method: 'DELETE',
    headers,
  });

  if (!res.ok) throw new Error('Failed to delete attachment');
}

/**
 * Reorder attachments
 */
export async function reorderAttachments(
  itemId: string,
  attachmentIds: string[],
  token: string
): Promise<void> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`/api/setlist-items/${itemId}/attachments/reorder`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ order: attachmentIds }),
  });

  if (!res.ok) throw new Error('Failed to reorder attachments');
}

/**
 * Group attachments by type
 */
export function groupAttachmentsByType(
  attachments: Attachment[]
): Record<AttachmentType, Attachment[]> {
  const grouped: Record<AttachmentType, Attachment[]> = {
    image: [],
    score: [],
    lyrics: [],
    chords: [],
    pdf: [],
  };

  attachments.forEach(att => {
    if (att.type in grouped) {
      grouped[att.type as AttachmentType].push(att);
    }
  });

  return grouped;
}

/**
 * Sort attachments by order
 */
export function sortAttachmentsByOrder(attachments: Attachment[]): Attachment[] {
  return [...attachments].sort((a, b) => a.order - b.order);
}

/**
 * Filter attachments by type
 */
export function filterAttachmentsByType(
  attachments: Attachment[],
  types: AttachmentType[]
): Attachment[] {
  return attachments.filter(att => types.includes(att.type));
}

/**
 * Get attachment display dimensions (responsive)
 */
export interface ImageDimensions {
  maxWidth: string;
  maxHeight: string;
  width: string;
  height: string;
}

export function getAttachmentDimensions(isTablet: boolean = false): ImageDimensions {
  if (isTablet) {
    return {
      maxWidth: '95vw',
      maxHeight: '95vh',
      width: 'auto',
      height: 'auto',
    };
  }

  return {
    maxWidth: '90vw',
    maxHeight: '90vh',
    width: 'auto',
    height: 'auto',
  };
}

/**
 * Create thumbnail URL for attachment (future: implement actual thumbnails)
 */
export function getAttachmentThumbnailUrl(attachment: Attachment): string {
  // TODO: Implement thumbnail generation
  // For now, return original URL
  return attachment.url;
}

/**
 * Check if attachments can be displayed inline (vs external link)
 */
export function canDisplayInline(attachment: Attachment): boolean {
  const inlineTypes: AttachmentType[] = ['image', 'lyrics', 'chords', 'score'];
  return inlineTypes.includes(attachment.type);
}

/**
 * Estimate attachment loading time (for progress indication)
 */
export function estimateLoadingTime(fileSize: number): number {
  // Assume 5 Mbps connection for mobile-friendly performance
  const mbps = 5;
  const bytes = fileSize;
  const seconds = (bytes * 8) / (mbps * 1000000);
  return Math.max(500, Math.min(seconds * 1000, 5000)); // Between 500ms and 5s
}
