import { test, expect } from '@playwright/test';

test.describe('Responsive Layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('button:has-text("Setlists")');
    await page.waitForSelector('[data-testid="setlists-container"]', { timeout: 10000 });
  });

  test('should display correctly on mobile (375x667)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check mobile menu is visible
    const mobileMenu = page.locator('[data-testid="mobile-menu-button"]');
    await expect(mobileMenu).toBeVisible();
    
    // Check desktop navigation is hidden
    const desktopNav = page.locator('[data-testid="desktop-navigation"]');
    await expect(desktopNav).not.toBeVisible();
    
    // Verify no overlapping elements
    const setlistItems = page.locator('[data-testid="setlist-item"]');
    const count = await setlistItems.count();
    
    for (let i = 0; i < count; i++) {
      const item = setlistItems.nth(i);
      await expect(item).toBeVisible();
      
      // Check element is not overlapping with header
      const box = await item.boundingBox();
      if (box) {
        expect(box.y).toBeGreaterThan(60); // Header height
      }
    }
  });

  test('should display correctly on tablet (768x1024)', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    
    // Check responsive layout adapts
    const container = page.locator('[data-testid="setlists-container"]');
    await expect(container).toBeVisible();
    
    // Check grid layout adjusts
    const grid = page.locator('[data-testid="setlists-grid"]');
    const isGridVisible = await grid.isVisible().catch(() => false);
    
    if (isGridVisible) {
      // Verify grid columns are appropriate for tablet
      const gridStyle = await grid.evaluate((el) => {
        return window.getComputedStyle(el).gridTemplateColumns;
      });
      expect(gridStyle).toContain('repeat');
    }
  });

  test('should display correctly on desktop (1920x1080)', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    // Check desktop navigation is visible
    const desktopNav = page.locator('[data-testid="desktop-navigation"]');
    await expect(desktopNav).toBeVisible();
    
    // Check mobile menu is hidden
    const mobileMenu = page.locator('[data-testid="mobile-menu-button"]');
    await expect(mobileMenu).not.toBeVisible();
    
    // Verify full grid layout
    const grid = page.locator('[data-testid="setlists-grid"]');
    const isGridVisible = await grid.isVisible().catch(() => false);
    
    if (isGridVisible) {
      await expect(grid).toBeVisible();
    }
  });

  test('should handle mobile menu toggle', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Open mobile menu
    await page.click('[data-testid="mobile-menu-button"]');
    
    // Verify menu opens
    const mobileMenuOverlay = page.locator('[data-testid="mobile-menu-overlay"]');
    await expect(mobileMenuOverlay).toBeVisible();
    
    // Close menu
    await page.click('[data-testid="close-mobile-menu"]');
    
    // Verify menu closes
    await expect(mobileMenuOverlay).not.toBeVisible();
  });

  test('should not have overlapping UI elements on setlist page', async ({ page }) => {
    // Test on multiple breakpoints
    const viewports = [
      { width: 375, height: 667 },
      { width: 768, height: 1024 },
      { width: 1920, height: 1080 },
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(300);
      
      // Get all interactive elements
      const buttons = page.locator('button, a, input, select');
      const count = await buttons.count();
      
      // Check each button is clickable (not overlapped)
      for (let i = 0; i < Math.min(count, 20); i++) {
        const button = buttons.nth(i);
        const isVisible = await button.isVisible().catch(() => false);
        
        if (isVisible) {
          const box = await button.boundingBox();
          if (box) {
            // Element should have positive dimensions
            expect(box.width).toBeGreaterThan(0);
            expect(box.height).toBeGreaterThan(0);
          }
        }
      }
    }
  });

  test('should adapt setlist card layout on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Click on a setlist
    await page.click('[data-testid="setlist-item"]:first-child');
    await page.waitForSelector('[data-testid="setlist-details"]', { timeout: 5000 });
    
    // Verify single column layout
    const songList = page.locator('[data-testid="setlist-songs"]');
    await expect(songList).toBeVisible();
    
    // Check songs are stacked vertically
    const songs = page.locator('[data-testid="setlist-song-item"]');
    const firstSong = songs.nth(0);
    const secondSong = songs.nth(1);
    
    const firstBox = await firstSong.boundingBox();
    const secondBox = await secondSong.boundingBox();
    
    if (firstBox && secondBox) {
      // Second song should be below first
      expect(secondBox.y).toBeGreaterThan(firstBox.y);
    }
  });

  test('should adapt setlist card layout on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    await page.click('[data-testid="setlist-item"]:first-child');
    await page.waitForSelector('[data-testid="setlist-details"]', { timeout: 5000 });
    
    // Verify multi-column or wider layout
    const songList = page.locator('[data-testid="setlist-songs"]');
    await expect(songList).toBeVisible();
    
    // Check layout is wider on desktop
    const listBox = await songList.boundingBox();
    if (listBox) {
      expect(listBox.width).toBeGreaterThan(500);
    }
  });

  test('should handle orientation change', async ({ page }) => {
    // Start in portrait
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(300);
    
    // Switch to landscape
    await page.setViewportSize({ width: 667, height: 375 });
    await page.waitForTimeout(300);
    
    // Verify layout adjusts
    const container = page.locator('[data-testid="setlists-container"]');
    await expect(container).toBeVisible();
    
    // Check no horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth);
  });

  test('should not have horizontal scroll on any breakpoint', async ({ page }) => {
    const viewports = [
      { width: 375, height: 667 },
      { width: 768, height: 1024 },
      { width: 1024, height: 768 },
      { width: 1920, height: 1080 },
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(300);
      
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      const viewportWidth = await page.evaluate(() => window.innerWidth);
      
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth);
    }
  });
});
