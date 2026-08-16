# E2E Test Suite

This directory contains end-to-end (E2E) tests for the Gig Manager application using Playwright.

## Setup

Playwright is already installed and configured. The browsers are installed as well.

## Running Tests

### Run all E2E tests
```bash
npm run test:e2e
```

### Run specific test file
```bash
npm run test:e2e smoke.spec.ts
```

### Run tests in headed mode (with browser window)
```bash
npm run test:e2e:headed
```

### Run tests with UI mode (interactive)
```bash
npm run test:e2e:ui
```

### Run tests on specific browser
```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

## Test Files

### Smoke Tests (`smoke.spec.ts`)
Basic sanity checks to ensure the application loads correctly:
- Application loads with correct title
- Page has interactive elements
- Responsive on mobile (375x667)
- Responsive on desktop (1920x1080)

### i18n Tests (`i18n.spec.ts`)
Tests for internationalization (Dutch/English):
- Language setting in settings modal
- Switch between English and Dutch
- Update dashboard tab labels when language changes
- Update settings modal strings when language changes
- Persist language preference across page reloads
- Update Songs tab when language changes
- Update Bands tab when language changes
- Handle system language option

### Pagination Tests (`pagination.spec.ts`)
Tests for pagination functionality (requires data-testid attributes):
- Display pagination controls
- Navigate between pages
- Change items per page
- Disable previous button on first page
- Navigate to specific page

### Bulk Payment Tests (`bulk-payments.spec.ts`)
Tests for bulk payment updates (requires data-testid attributes):
- Select multiple gigs for bulk update
- Update client paid status via bulk update
- Sync band paid status when client paid is updated
- Deselect all gigs
- Show bulk update confirmation dialog

### Setlist Attachments Tests (`setlist-attachments.spec.ts`)
Tests for setlist attachments and performance (requires data-testid attributes):
- Load setlists quickly
- Load songs quickly
- Attach file to setlist item
- View attachment
- Fetch most up-to-date attachment
- Delete attachment
- Handle large attachment upload

### Performance Mode Tests (`performance-mode.spec.ts`)
Tests for Performance Mode interactivity (requires data-testid attributes):
- Enter Performance Mode
- Display songs in Performance Mode
- Open attachment drawer when song is tapped
- Display correct song data in attachment drawer
- Close attachment drawer when tapped outside
- Navigate between songs in Performance Mode
- Exit Performance Mode
- Handle swipe gestures in Performance Mode

### Responsive Layout Tests (`responsive-layout.spec.ts`)
Tests for responsive design across breakpoints:
- Display correctly on mobile (375x667)
- Display correctly on tablet (768x1024)
- Display correctly on desktop (1920x1080)
- Handle mobile menu toggle
- No overlapping UI elements on setlist page
- Adapt setlist card layout on mobile
- Adapt setlist card layout on desktop
- Handle orientation change
- No horizontal scroll on any breakpoint

## Test Status

### Currently Passing
- ✅ Smoke tests (4 tests)

### Require Implementation
The following tests are written but require `data-testid` attributes to be added to the components:
- ⏳ Pagination tests (5 tests)
- ⏳ Bulk payment tests (5 tests)
- ⏳ Setlist attachments tests (7 tests)
- ⏳ Performance mode tests (8 tests)
- ⏳ Responsive layout tests (9 tests)

### Partially Working
- ⏳ i18n tests (9 tests) - Some tests may pass depending on authentication state

## Adding data-testid Attributes

To make the tests fully functional, add `data-testid` attributes to key UI elements:

### Dashboard Component
- `data-testid="dashboard-container"` - Main dashboard container
- `data-testid="settings-button"` - Settings/profile button
- `data-testid="mobile-menu-button"` - Mobile menu toggle

### All Gigs Tab
- `data-testid="gigs-table"` - Gigs table container
- `data-testid="gig-checkbox"` - Gig selection checkbox
- `data-testid="bulk-actions-menu"` - Bulk actions menu
- `data-testid="gig-status"` - Gig status cell
- `data-testid="band-paid-status"` - Band paid status cell
- `data-testid="pagination"` - Pagination container
- `data-testid="current-page"` - Current page indicator
- `data-testid="next-page"` - Next page button
- `data-testid="prev-page"` - Previous page button
- `data-testid="page-number"` - Page number buttons
- `data-testid="items-per-page-select"` - Items per page dropdown
- `data-testid="deselect-all"` - Deselect all button
- `data-testid="confirmation-dialog"` - Confirmation dialog

### Setlists Tab
- `data-testid="setlists-container"` - Setlists container
- `data-testid="setlists-grid"` - Setlists grid
- `data-testid="setlist-item"` - Individual setlist card
- `data-testid="setlist-details"` - Setlist details view
- `data-testid="setlist-songs"` - Songs list in setlist
- `data-testid="setlist-song-item"` - Individual song in setlist
- `data-testid="attach-file-button"` - Attach file button
- `data-testid="attachment-success"` - Upload success indicator
- `data-testid="attachment-item"` - Attachment item
- `data-testid="attachment-viewer"` - Attachment viewer modal
- `data-testid="delete-attachment"` - Delete attachment button

### Performance Mode
- `data-testid="performance-mode-button"` - Enter performance mode button
- `data-testid="performance-mode"` - Performance mode container
- `data-testid="performance-song-item"` - Song in performance mode
- `data-testid="attachment-drawer"` - Attachment drawer
- `data-testid="drawer-backdrop"` - Drawer backdrop
- `data-testid="drawer-song-name"` - Song name in drawer
- `data-testid="next-song-button"` - Next song button
- `data-testid="exit-performance-mode"` - Exit button

### Settings Modal
- `data-testid="settings-modal"` - Settings modal container
- `data-testid="close-settings"` - Close button

### Songs/Bands Tabs
- `data-testid="songs-container"` - Songs container
- `data-testid="bands-container"` - Bands container
- `data-testid="add-band-button"` - Add band button
- `data-testid="error-message"` - Error message display

## Fixtures

Test fixtures are located in `e2e/fixtures/`:
- `test-attachment.pdf` - Sample PDF for attachment upload tests

## Configuration

Playwright is configured in `playwright.config.ts`:
- Base URL: `http://localhost:3000`
- Browsers: Chromium, Firefox, WebKit
- Mobile viewports: Pixel 5, iPhone 12
- Auto-starts dev server before tests
- Takes screenshots on failure
- Records traces on retry

## CI/CD Integration

To run tests in CI:
```bash
npm run test:e2e
```

The tests will run in headless mode automatically in CI environments.

## Troubleshooting

### Tests fail with "Element not found"
- Ensure the dev server is running on port 3000
- Check that the application loads without errors
- Verify selectors match the actual DOM structure

### Tests timeout
- Increase timeout in `playwright.config.ts`
- Check if the application is slow to load
- Verify network requests are completing

### Browser-specific failures
- Some tests may behave differently across browsers
- Use `--project` flag to test specific browsers
- Check browser console for errors
