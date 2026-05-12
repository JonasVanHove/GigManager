# v1.12.0 Manual Test Scenarios

## Test Environment Setup
- **Browser**: Chrome/Edge (latest)
- **Device**: Desktop + Mobile/Tablet
- **Network**: Test both online and offline scenarios
- **Database**: Fresh seed data
- **Clear Cache**: Ctrl+Shift+Del (Chrome DevTools > Application > Clear storage)

---

## 1. Photo Notes Feature End-to-End

### Scenario 1.1: Upload Photo & Add Note
**Steps:**
1. Navigate to a gig detail page
2. Click "Add Photo Annotation" button
3. Upload a photo using camera/file upload
4. Add text note: "Great sound during this set"
5. Click "Save" button

**Expected Results:**
- Photo displays correctly in editor
- Text note appears in notes section
- Save button shows "Saving..." state briefly
- Toast notification confirms: "Note saved successfully"
- Note persists after page refresh ✓

**Edge Cases:**
- Upload 0MB file → Should show error
- Upload 500MB+ file → Should show warning
- Upload unsupported format (e.g., .txt) → Should reject

---

### Scenario 1.2: Fullscreen Drawing Mode
**Steps:**
1. Open photo annotation editor
2. Click "Full-screen draw" button
3. Draw on canvas with mouse/touch
4. Change ink color using color picker
5. Adjust line width slider (test min/max values)
6. Click "Undo" 3 times
7. Click "Clear" to erase all
8. Draw new strokes
9. Click "Done"

**Expected Results:**
- Fullscreen overlay appears with dark background
- Drawing renders smoothly (60fps) on canvas
- Color changes apply to new strokes
- Line width changes visible immediately
- Undo removes last stroke one-by-one
- Clear wipes entire canvas
- "Done" button closes fullscreen, preserves drawing
- Drawing persists in main editor ✓

**Edge Cases:**
- Draw with pressure sensitivity (stylus) → Should render smoothly
- Touch + mouse simultaneously → Should handle gracefully
- Undo when no strokes exist → Should do nothing
- Clear then undo → Should restore previous drawing

---

### Scenario 1.3: Band Linking
**Steps:**
1. Open photo annotation for a gig
2. Locate "Link to band" dropdown
3. Select different bands from list
4. Save note
5. Close and reopen same note

**Expected Results:**
- Dropdown shows all available bands
- Selected band persists after save
- Band name displays correctly on reopened note
- Can change band multiple times ✓
- null/unselected state works correctly

**Edge Cases:**
- No bands available → Dropdown shows empty/placeholder
- Band name contains special characters → Displays correctly
- Select same band multiple times → No duplicate issues

---

### Scenario 1.4: Offline Sync
**Steps:**
1. Open photo annotation
2. Add photo + note + drawing
3. Go offline (DevTools > Network > Offline)
4. Click "Save"
5. Verify toast shows offline message
6. Go back online
7. Click "Save" again
8. Verify sync completes

**Expected Results:**
- Offline: Note saved to IndexedDB, "Offline" indicator shown
- Offline: Can close and reopen app, note still there
- Online: Data syncs to server automatically
- Toast confirms: "Synced successfully"
- Server database shows note ✓

---

## 2. Filter Functionality

### Scenario 2.1: AllGigsTab - Charity Only
**Steps:**
1. Navigate to "All Gigs" tab
2. Uncheck "Tentative" filter
3. Check "Charity" filter
4. Observe results

**Expected Results:**
- Only charity gigs (💕 badge) display
- Regular and tentative gigs hidden
- Count reflects filtered results ✓

**Test Data Needed:**
- 5 regular gigs
- 3 charity gigs
- 2 tentative gigs

---

### Scenario 2.2: AllGigsTab - Tentative Only
**Steps:**
1. Uncheck "Charity" filter
2. Check "Tentative" filter

**Expected Results:**
- Only tentative gigs (⏳ badge) display
- Regular and charity gigs hidden ✓

---

### Scenario 2.3: AllGigsTab - Both Unchecked
**Steps:**
1. Uncheck both "Charity" and "Tentative"

**Expected Results:**
- Only regular gigs (no badge) display
- Charity and tentative gigs hidden ✓

---

### Scenario 2.4: AllGigsTab - Both Checked
**Steps:**
1. Check both "Charity" and "Tentative"

**Expected Results:**
- All gigs display (regular + charity + tentative)
- Filters show correct count ✓

---

### Scenario 2.5: CalendarView - Same Filter Logic
**Steps:**
1. Navigate to Calendar View
2. Repeat scenarios 2.1-2.4

**Expected Results:**
- Identical filter behavior as AllGigsTab
- Calendar events update correctly ✓

---

### Scenario 2.6: Payment Status + Charity/Tentative
**Steps:**
1. Check "Charity" + "Paid" filters only
2. Observe calendar/list

**Expected Results:**
- Only shows paid charity gigs
- Filters combine correctly (AND logic) ✓

---

## 3. Calendar Navigation

### Scenario 3.1: Today Button
**Steps:**
1. Navigate calendar to previous month
2. Click "Today" button

**Expected Results:**
- Calendar jumps to current date
- Current month/year selected in dropdowns ✓

---

### Scenario 3.2: Month Dropdown Navigation
**Steps:**
1. Select "December 2026" from month dropdown
2. Select "January 2025" from month dropdown

**Expected Results:**
- Calendar updates to selected month/year
- Navigation is smooth (no reload)
- Events appear for selected month ✓

---

### Scenario 3.3: Month Arrows
**Steps:**
1. Start on May 2026
2. Click left arrow 5 times
3. Click right arrow 3 times

**Expected Results:**
- Each click moves calendar by exactly 1 month
- Dropdown updates to match
- Calendar displays events for each month ✓

---

### Scenario 3.4: Year Dropdown
**Steps:**
1. Select "2024" from year dropdown
2. Select "2028" from year dropdown

**Expected Results:**
- Calendar jumps to selected year
- Month dropdown updates if needed
- Events display correctly ✓

---

## 4. Mobile/Responsive Testing

### Scenario 4.1: Mobile Fullscreen Drawing
**Steps on tablet/mobile:**
1. Open gig detail
2. Add photo
3. Tap "Full-screen draw"
4. Draw using touch
5. Use fingers to draw curved lines
6. Tap "Done"

**Expected Results:**
- Fullscreen canvas uses full viewport
- Touch drawing renders smoothly
- All controls (color, width, undo, clear) accessible
- No layout issues ✓

---

### Scenario 4.2: Mobile Filters
**Steps on phone:**
1. Open "All Gigs" tab
2. Toggle filters (charity, tentative, payment)
3. Check that list updates correctly

**Expected Results:**
- Filter controls accessible and responsive
- List updates instantly
- No horizontal scroll ✓

---

### Scenario 4.3: Mobile Calendar Navigation
**Steps on phone:**
1. Open Calendar View
2. Use month dropdown
3. Use arrows to navigate
4. Tap event to open details

**Expected Results:**
- Dropdowns work on mobile
- Arrows functional
- Modal displays correctly ✓

---

## 5. Edge Cases & Error Handling

### Scenario 5.1: Large Photo Upload
**Steps:**
1. Attempt to upload 50MB photo
2. Attempt to upload 100x100px tiny photo

**Expected Results:**
- 50MB: Shows error/warning
- 100x100px: Either accepts or shows minimum size warning
- No browser crash ✓

---

### Scenario 5.2: Empty States
**Steps:**
1. Create new gig (no photos/notes yet)
2. Open All Gigs with no data
3. Open Calendar with no gigs

**Expected Results:**
- Helpful empty state messages displayed
- No console errors ✓

---

### Scenario 5.3: Network Error Handling
**Steps:**
1. Open photo editor
2. Disable network
3. Try to save
4. Re-enable network
5. Try to save again

**Expected Results:**
- Graceful offline handling
- Retry succeeds when online
- No data loss ✓

---

### Scenario 5.4: Rapid Filter Toggling
**Steps:**
1. Rapidly toggle charity/tentative filters on/off 10 times
2. Check performance

**Expected Results:**
- Filters respond instantly
- No lag or stuttering
- List updates correctly throughout ✓

---

## 6. Dark Mode Testing

### Scenario 6.1: All Features in Dark Mode
**Steps:**
1. Enable dark mode (system or app toggle)
2. Test all features from sections 1-4

**Expected Results:**
- All text readable (sufficient contrast)
- All buttons visible and functional
- No color bleeding or visual artifacts
- Animations smooth ✓

---

## 7. Performance Testing

### Scenario 7.1: Large List Performance
**Steps:**
1. View All Gigs with 100+ gigs
2. Scroll through entire list
3. Toggle filters multiple times

**Expected Results:**
- List renders smoothly (60fps)
- Scroll is responsive
- No jank or stuttering ✓

---

### Scenario 7.2: Complex Drawing Performance
**Steps:**
1. Draw for 2 minutes continuously
2. Draw with maximum brush width
3. Create 50+ strokes

**Expected Results:**
- Canvas renders smoothly throughout
- No lag or dropped frames
- Undo/Clear remain responsive ✓

---

## Bugs Found During Testing

| # | Component | Issue | Severity | Status |
|---|-----------|-------|----------|--------|
|   |           |       |          |        |

---

## Sign-Off Checklist

- [ ] All manual scenarios completed
- [ ] All tests passed (automated)
- [ ] No console errors
- [ ] No network errors (503, 500, etc)
- [ ] Offline mode works correctly
- [ ] Mobile/tablet responsive
- [ ] Dark mode functional
- [ ] Performance acceptable
- [ ] Build succeeds with 0 errors
- [ ] Deploy to staging verified
- [ ] Database migrations applied
- [ ] Environment variables correct
- [ ] Ready for v1.12.0 release

**Tested By:** _______________  
**Date:** _______________  
**Sign-off:** ✓
