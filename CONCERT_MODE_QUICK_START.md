# Concert Mode - Quick Start Guide

## What's New?

GigManager now includes **Concert Mode** - a performance-focused feature designed for musicians and bands to quickly access setlists, chord charts, lyrics, and scores during rehearsals or live performances.

## Key Files

### Core Components
- **FullscreenAttachmentViewer.tsx** - Fullscreen viewer for sheet music, lyrics, etc.
- **useConcertMode.ts** - State management hook for Concert Mode
- **concert-mode.ts** - Types, utilities, and device detection

### Integration Points
- **SetlistsTab.tsx** - Concert Mode toggle + tap-to-open attachments
- **PerformanceMode.tsx** - Song navigation + Concert Mode UI
- **types/index.ts** - Concert Mode type definitions

## Quick Start (Testing)

### 1. Enable Concert Mode in SetlistsTab

```
✓ Open "Setlists" tab
✓ Click checkbox: "Concert Mode" 
✓ UI becomes minimalist with larger touch targets
```

### 2. Tap Setlist Items to Open Attachments

```
✓ Create a setlist with songs
✓ Expand setlist to see song list
✓ Click on song number (1, 2, 3, etc.)
✓ Fullscreen viewer opens with mock attachments
```

### 3. Navigate in Fullscreen Viewer

**Desktop:**
- Arrow keys → Previous/Next
- ESC → Close

**Mobile/Tablet:**
- Swipe left/right → Previous/Next
- Tap outside image → Close
- Tap button → Navigation

### 4. Test Performance Mode Concert Mode

```
✓ SetlistsTab → Select a setlist
✓ Click "Open in Performance Mode"
✓ Concert Mode UI shows song info + navigation
✓ Click "📄 Sheet" to view attachments
```

## Setting Up Mock Attachments

Mock attachments are in `src/lib/attachment-utils.ts` under `MOCK_ATTACHMENTS`:

```typescript
export const MOCK_ATTACHMENTS: Record<string, Attachment[]> = {
  'item-1': [
    {
      id: 'att-1',
      setlistItemId: 'item-1',
      url: '/images/sheet-music-example.png',
      type: 'score',
      title: 'Sheet Music - Verse A',
      // ...
    },
  ],
};
```

**To test with your own images:**

1. Add images to `public/images/` (e.g., `public/images/my-sheet.png`)
2. Update `MOCK_ATTACHMENTS` URLs to point to your images
3. Reload page

**Example:**
```javascript
const MOCK_ATTACHMENTS = {
  'item-1': [
    {
      id: 'att-1',
      setlistItemId: 'item-1',
      url: '/images/my-sheet.png',  // ← Use your image
      type: 'score',
      title: 'My Sheet Music',
      description: 'Verse section',
      mimeType: 'image/png',
      fileSize: 245000,
      uploadedAt: new Date().toISOString(),
      order: 1,
    },
  ],
};
```

## Features Overview

### ✅ Implemented

- [x] Concert Mode toggle in SetlistsTab
- [x] Fullscreen attachment viewer
- [x] Tap-to-open for setlist items
- [x] Keyboard navigation (arrows, ESC)
- [x] Swipe navigation on mobile
- [x] Large typography option
- [x] Auto-detect tablet vs mobile vs desktop
- [x] Large touch targets for tablets
- [x] Image preloading
- [x] Graceful error handling
- [x] localStorage persistence
- [x] Integration with PerformanceMode
- [x] Fully backward compatible

### 🔄 Next Steps (Database Integration)

After testing mock attachments:

1. **Create Database Model**
```prisma
model SetlistItemAttachment {
  id              String  @id @default(cuid())
  setlistItemId   String
  url             String  @db.Text
  type            String  // 'image' | 'score' | 'lyrics' | 'chords' | 'pdf'
  title           String?
  description     String?
  mimeType        String
  fileSize        Int
  order           Int
  uploadedAt      DateTime @default(now())
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  setlistItem     SetlistItem @relation(fields: [setlistItemId], references: [id], onDelete: Cascade)
  
  @@index([setlistItemId])
  @@unique([setlistItemId, order])
}
```

2. **Add API Endpoints**
```
GET    /api/setlist-items/:itemId/attachments
POST   /api/setlist-items/:itemId/attachments
DELETE /api/attachments/:attachmentId
POST   /api/setlist-items/:itemId/attachments/reorder
```

3. **Update attachment-utils.ts**
Replace mock `fetchAttachments()` with real API call

4. **Enable Upload UI**
Add file upload component to SetlistsTab

## Usage Examples

### Enable Concert Mode Programmatically

```typescript
import { useConcertMode } from '@/hooks/useConcertMode';

function MyComponent() {
  const concert = useConcertMode();
  
  return (
    <button onClick={() => concert.toggleConcertMode()}>
      {concert.settings.enabled ? 'Exit' : 'Enter'} Concert Mode
    </button>
  );
}
```

### Open Attachments

```typescript
const handleOpenSheet = async () => {
  const token = await getAccessToken();
  await concert.loadAttachmentsForItem(itemId, token);
  // Automatically opens viewer if Concert Mode enabled
};
```

### Customize Touch Target Size

```typescript
concert.updateSettings({
  touchTargetSize: 'extra-large',  // 'normal' | 'large' | 'extra-large'
  largeTypography: true,
  preloadNextAttachment: false,    // For slower devices
});
```

## Troubleshooting

### Problem: Mock attachments not showing

**Solution:**
1. Verify URLs in `MOCK_ATTACHMENTS` are correct
2. Check browser console for errors
3. Ensure images exist in `public/images/`

### Problem: Touch targets too small on tablet

**Solution:**
```typescript
concert.updateSettings({ touchTargetSize: 'extra-large' });
```

### Problem: Slow performance on old tablet

**Solution:**
```typescript
concert.updateSettings({ preloadNextAttachment: false });
```

### Problem: Viewer doesn't open on tap

**Solution:**
- Ensure Concert Mode is enabled
- Check browser console for errors
- Verify setlist item has attachments

## Browser Support

- ✅ Chrome/Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)
- ✅ Tablets (iPad, Android tablets)

## Keyboard Shortcuts

When viewer is open:
- **→** or **Space** - Next attachment
- **←** - Previous attachment
- **ESC** - Close viewer

In Performance Mode with Concert Mode enabled:
- **→** or **Space** - Next song
- **←** - Previous song
- **ESC** - Exit Performance Mode

## Support

For issues or questions:
1. Check browser console for errors
2. Review `CONCERT_MODE_IMPLEMENTATION.md` for architecture details
3. Check TypeScript types in `src/lib/concert-mode.ts`
4. Test with mock attachments first

## See Also

- `CONCERT_MODE_IMPLEMENTATION.md` - Full architecture & API docs
- `src/lib/concert-mode.ts` - Types & utilities
- `src/hooks/useConcertMode.ts` - State management
- `src/components/FullscreenAttachmentViewer.tsx` - Viewer component
