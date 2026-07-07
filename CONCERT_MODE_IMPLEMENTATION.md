# Concert Mode Implementation Guide

## Overview

Concert Mode is a performance-focused feature for GigManager that enables musicians and bands to quickly access and display setlists, chord charts, lyrics, and score sheets during rehearsals or live performances on tablets and laptops.

## Features

### 1. **Concert Mode Toggle**
- Minimalist, fullscreen-optimized UI
- Single checkbox/toggle switch to enable/disable
- Auto-saves settings to localStorage
- Device-aware: Automatically adjusts touch target sizes for tablets

### 2. **Fullscreen Attachment Viewer**
- Tap-to-open fullscreen display for any attachment
- Supports multiple attachment types:
  - Images (PNG, JPG, WebP, etc.)
  - Score sheets
  - Chord charts
  - Lyrics screenshots
  - PDFs (via link)
- Navigation:
  - **Arrow keys** or **Space** for next (desktop)
  - **Swipe left/right** for next/prev (mobile/tablet)
  - **Tap outside image** or **ESC** to close
- Image preloading for smooth transitions
- Responsive sizing (95vw/95vh max)

### 3. **Large Typography & Touch Targets**
- Larger text for stage visibility
- Extra-large touch targets on tablets
- High contrast on dark background
- Optimized for 10+ meter viewing distance

### 4. **Integration with Setlists**
- Click song number in setlist to open attachments
- Navigate through setlist items during performance
- Persistent last-viewed item per setlist

### 5. **Integration with Performance Mode**
- Keyboard navigation (Arrow keys, Space)
- Song-by-song progression
- Display chords and tuning info
- Quick access to attachments

## Architecture

### Files Created

```
src/
├── lib/
│   ├── concert-mode.ts                    # Types & utilities
│   └── attachment-utils.ts                # Attachment helpers
├── hooks/
│   └── useConcertMode.ts                  # State management hook
└── components/
    └── FullscreenAttachmentViewer.tsx     # Fullscreen viewer component
```

### Files Modified

```
src/
├── components/
│   ├── SetlistsTab.tsx                    # Concert Mode toggle + tap-to-open
│   ├── PerformanceMode.tsx                # Song navigation + Concert Mode UI
│   └── FullscreenAttachmentViewer.tsx     # New component
└── types/
    └── index.ts                           # Added Concert Mode types
```

## Usage

### For End Users

#### Enabling Concert Mode

1. Open SetlistsTab
2. Check "Concert Mode" checkbox in left panel
3. UI adjusts for large touch targets and minimalist display

#### Using During Performance

1. **SetlistsTab**: Click song number to open attachments
2. **PerformanceMode**: 
   - Enable Concert Mode toggle
   - Large song title displayed
   - Navigate with arrow keys or ← Previous / Next → buttons
   - Press Space or click "📄 Sheet" to open attachments
   - Swipe or use arrow keys to navigate attachments

#### Mobile/Tablet

- Larger touch targets automatically enabled
- Tap to close viewer
- Swipe left/right to navigate attachments
- Tap "← Previous" / "Next →" for setlist navigation

### For Developers

#### Using `useConcertMode` Hook

```typescript
const concert = useConcertMode({ 
  persistSettings: true, 
  setlistId: 'setlist-123' 
});

// Settings management
concert.toggleConcertMode();
concert.updateSettings({ largeTypography: true });

// Viewer control
concert.openViewer(attachments);
concert.closeViewer();
concert.goToNextAttachment();
concert.goToPrevAttachment();

// Current state
console.log(concert.settings.enabled);
console.log(concert.viewerState.isOpen);
console.log(concert.currentItemAttachments);
```

#### Rendering Fullscreen Viewer

```typescript
<FullscreenAttachmentViewer
  isOpen={concert.viewerState.isOpen}
  attachments={concert.currentItemAttachments}
  currentIndex={concert.viewerState.currentIndex}
  onClose={concert.closeViewer}
  onNext={concert.goToNextAttachment}
  onPrev={concert.goToPrevAttachment}
  onIndexChange={concert.goToAttachment}
  isLoading={concert.isLoadingAttachments}
  error={concert.attachmentsError}
  showControls={true}
  preloadNextAttachment={concert.settings.preloadNextAttachment}
/>
```

#### Working with Attachments

```typescript
import { 
  fetchAttachments, 
  sortAttachmentsByOrder, 
  groupAttachmentsByType 
} from '@/lib/attachment-utils';

// Load attachments for setlist item
const attachments = await fetchAttachments(itemId, token);
const sorted = sortAttachmentsByOrder(attachments);
const grouped = groupAttachmentsByType(attachments);
```

## API Integration (Future)

### Planned Endpoints

```
GET /api/setlist-items/:itemId/attachments
  - Fetch all attachments for a setlist item
  - Returns: Attachment[]

POST /api/setlist-items/:itemId/attachments
  - Upload new attachment
  - Body: FormData with file, type, title, description
  - Returns: Attachment

DELETE /api/attachments/:attachmentId
  - Remove attachment
  - Returns: 204 No Content

POST /api/setlist-items/:itemId/attachments/reorder
  - Reorder attachments
  - Body: { order: [id1, id2, id3] }
  - Returns: Attachment[]
```

### Mock Data (Current)

Currently using `MOCK_ATTACHMENTS` in `attachment-utils.ts`:

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
    // ...
  ],
};
```

To test with mock data:
1. Create image files in `public/images/`
2. Update `MOCK_ATTACHMENTS` with correct URLs
3. Click setlist item numbers to view

## Data Model

### SetlistItem Relationships

```
Setlist
  ├── items: SetlistItem[]
  │   ├── id
  │   ├── title
  │   ├── notes
  │   ├── chords
  │   ├── tuning
  │   ├── order
  │   └── attachments?: SetlistItemAttachment[] (future)
  └── gigs: Gig[]

SetlistItemAttachment (future database model)
  ├── id
  ├── setlistItemId (FK)
  ├── url
  ├── type: 'image' | 'score' | 'lyrics' | 'chords' | 'pdf'
  ├── title
  ├── description
  ├── mimeType
  ├── fileSize
  ├── uploadedAt
  └── order
```

## Styling & Responsive Design

### Touch Targets

```
Device Type        | Target Size | Touch Target CSS
===============================================
Desktop            | normal       | p-2 text-base
Mobile (< 768px)   | large        | p-3 text-lg
Tablet (>= 768px)  | extra-large  | p-4 text-xl
```

### Fullscreen Viewer Dimensions

- Max width: 95vw
- Max height: 95vh
- Object-fit: contain
- Dark background: bg-black/95 backdrop-blur-sm
- Smooth animations: transition-opacity duration-300

## Performance Optimization

### Preloading Strategy

1. **Image Preloading**: Next attachment preloaded in background
2. **Lazy Loading**: Images only load when viewer opens
3. **Caching**: Preloaded URLs stored in Set
4. **Error Handling**: Graceful fallback if preload fails

### Best Practices

- Keep images under 2MB for tablet performance
- Use WebP format where possible
- Compress score sheets to minimize file size
- Limit preload to next item (not all items)

## Accessibility

### Keyboard Navigation

- **ESC**: Close fullscreen viewer
- **Arrow Right** / **Space**: Next attachment
- **Arrow Left**: Previous attachment
- **Arrow Right/Left**: Navigate setlist in Performance Mode

### Touch Support

- Tap to close viewer (mobile)
- Swipe left/right to navigate
- Large tap targets (min 44px on mobile, 60px on tablet)

### Screen Reader

Currently not fully accessible to screen readers. Future improvements:
- Add aria-labels to all interactive elements
- Provide text alternatives for image attachments
- Support keyboard-only navigation

## Backward Compatibility

✅ **Fully backward compatible**

- Concert Mode is opt-in via toggle
- Existing setlist workflows unaffected when disabled
- All existing setlist/gig functionality preserved
- No breaking changes to API or data models

## Troubleshooting

### Attachments Not Loading

1. Check that mock images exist in `public/images/`
2. Verify URLs in `MOCK_ATTACHMENTS`
3. Check browser console for errors
4. Ensure localStorage is enabled

### Touch Targets Too Small

1. Check device detection (tablet vs mobile)
2. Verify `touchTargetSize` setting: `concert.settings.touchTargetSize`
3. Manually update via `concert.updateSettings({ touchTargetSize: 'extra-large' })`

### Performance Issues on Old Tablets

1. Disable `preloadNextAttachment`: `concert.updateSettings({ preloadNextAttachment: false })`
2. Reduce image resolution (max 1920x1080)
3. Clear browser cache
4. Use WebP format instead of PNG/JPG

## Future Enhancements

1. **Database Integration**
   - Create SetlistItemAttachment model
   - Implement upload endpoints
   - Add attachment ordering

2. **Advanced Features**
   - Swipe-to-navigate for desktop (touch events)
   - Annotation tools (draw on sheets)
   - Page turner (for PDF scores)
   - Setlist auto-advance based on time

3. **Performance**
   - Service Worker caching for attachments
   - Offline mode support
   - Thumbnail generation
   - Progressive image loading

4. **Collaboration**
   - Share setlists with band members
   - Annotation sync across devices
   - Real-time status updates

## Testing Checklist

- [ ] Concert Mode toggle works
- [ ] Settings persist to localStorage
- [ ] Tap setlist item opens attachments
- [ ] Fullscreen viewer renders correctly
- [ ] Arrow keys navigate attachments
- [ ] ESC closes viewer
- [ ] Swipe navigation works on mobile
- [ ] Touch targets sized correctly for device
- [ ] Large typography enabled when setting active
- [ ] Preload next image works
- [ ] Error handling for missing images
- [ ] Works on tablets (iPad, Android)
- [ ] Works on mobile phones
- [ ] Works on desktop browsers
- [ ] Performance Mode integration works
- [ ] All existing features still work with Concert Mode disabled

## Reference

### Type Interfaces

See `src/lib/concert-mode.ts` and `src/types/index.ts` for:
- `ConcertModeSettings`
- `Attachment`
- `FullscreenViewerState`
- `ConcertModeContext`
- `AttachmentType`
