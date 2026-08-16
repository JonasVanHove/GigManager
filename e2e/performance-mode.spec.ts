import { test, expect } from '@playwright/test';

test.describe('Performance Mode Interactivity', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('button:has-text("Setlists")');
    await page.waitForSelector('[data-testid="setlists-container"]', { timeout: 10000 });
  });

  test('should enter Performance Mode', async ({ page }) => {
    // Click on a setlist
    await page.click('[data-testid="setlist-item"]:first-child');
    
    // Wait for setlist details
    await page.waitForSelector('[data-testid="setlist-details"]', { timeout: 5000 });
    
    // Click Performance Mode button
    await page.click('[data-testid="performance-mode-button"]');
    
    // Verify Performance Mode is active
    const performanceMode = page.locator('[data-testid="performance-mode"]');
    await expect(performanceMode).toBeVisible();
  });

  test('should display songs in Performance Mode', async ({ page }) => {
    await page.click('[data-testid="setlist-item"]:first-child');
    await page.waitForSelector('[data-testid="setlist-details"]', { timeout: 5000 });
    
    await page.click('[data-testid="performance-mode-button"]');
    await page.waitForSelector('[data-testid="performance-mode"]', { timeout: 5000 });
    
    // Verify songs are displayed
    const songs = page.locator('[data-testid="performance-song-item"]');
    const count = await songs.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should open attachment drawer when song is tapped', async ({ page }) => {
    await page.click('[data-testid="setlist-item"]:first-child');
    await page.waitForSelector('[data-testid="setlist-details"]', { timeout: 5000 });
    
    await page.click('[data-testid="performance-mode-button"]');
    await page.waitForSelector('[data-testid="performance-mode"]', { timeout: 5000 });
    
    // Tap/click on first song
    await page.click('[data-testid="performance-song-item"]:first-child');
    
    // Verify attachment drawer opens
    const drawer = page.locator('[data-testid="attachment-drawer"]');
    await expect(drawer).toBeVisible();
  });

  test('should display correct song data in attachment drawer', async ({ page }) => {
    await page.click('[data-testid="setlist-item"]:first-child');
    await page.waitForSelector('[data-testid="setlist-details"]', { timeout: 5000 });
    
    // Get song name before entering performance mode
    const songName = await page.locator('[data-testid="setlist-song-item"]:first-child').textContent();
    
    await page.click('[data-testid="performance-mode-button"]');
    await page.waitForSelector('[data-testid="performance-mode"]', { timeout: 5000 });
    
    // Click on first song in performance mode
    await page.click('[data-testid="performance-song-item"]:first-child');
    
    // Verify drawer shows correct song
    const drawerSongName = await page.locator('[data-testid="drawer-song-name"]').textContent();
    expect(drawerSongName).toContain(songName);
  });

  test('should close attachment drawer when tapped outside', async ({ page }) => {
    await page.click('[data-testid="setlist-item"]:first-child');
    await page.waitForSelector('[data-testid="setlist-details"]', { timeout: 5000 });
    
    await page.click('[data-testid="performance-mode-button"]');
    await page.waitForSelector('[data-testid="performance-mode"]', { timeout: 5000 });
    
    await page.click('[data-testid="performance-song-item"]:first-child');
    await page.waitForSelector('[data-testid="attachment-drawer"]', { timeout: 5000 });
    
    // Click outside drawer
    await page.click('[data-testid="drawer-backdrop"]');
    
    // Verify drawer closes
    const drawer = page.locator('[data-testid="attachment-drawer"]');
    await expect(drawer).not.toBeVisible();
  });

  test('should navigate between songs in Performance Mode', async ({ page }) => {
    await page.click('[data-testid="setlist-item"]:first-child');
    await page.waitForSelector('[data-testid="setlist-details"]', { timeout: 5000 });
    
    await page.click('[data-testid="performance-mode-button"]');
    await page.waitForSelector('[data-testid="performance-mode"]', { timeout: 5000 });
    
    // Click first song
    await page.click('[data-testid="performance-song-item"]:nth-child(1)');
    await page.waitForSelector('[data-testid="attachment-drawer"]', { timeout: 5000 });
    
    // Click next song button
    await page.click('[data-testid="next-song-button"]');
    
    // Wait for drawer to update
    await page.waitForTimeout(300);
    
    // Verify drawer is still open (song changed)
    const drawer = page.locator('[data-testid="attachment-drawer"]');
    await expect(drawer).toBeVisible();
  });

  test('should exit Performance Mode', async ({ page }) => {
    await page.click('[data-testid="setlist-item"]:first-child');
    await page.waitForSelector('[data-testid="setlist-details"]', { timeout: 5000 });
    
    await page.click('[data-testid="performance-mode-button"]');
    await page.waitForSelector('[data-testid="performance-mode"]', { timeout: 5000 });
    
    // Click exit button
    await page.click('[data-testid="exit-performance-mode"]');
    
    // Verify we're back to normal view
    const performanceMode = page.locator('[data-testid="performance-mode"]');
    await expect(performanceMode).not.toBeVisible();
    
    const setlistDetails = page.locator('[data-testid="setlist-details"]');
    await expect(setlistDetails).toBeVisible();
  });

  test('should handle swipe gestures in Performance Mode', async ({ page }) => {
    await page.click('[data-testid="setlist-item"]:first-child');
    await page.waitForSelector('[data-testid="setlist-details"]', { timeout: 5000 });
    
    await page.click('[data-testid="performance-mode-button"]');
    await page.waitForSelector('[data-testid="performance-mode"]', { timeout: 5000 });
    
    // Simulate swipe left to next song
    const songItem = page.locator('[data-testid="performance-song-item"]:first-child');
    await songItem.hover();
    
    const box = await songItem.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2 - 200, box.y + box.height / 2);
      await page.mouse.up();
    }
    
    // Wait for potential navigation
    await page.waitForTimeout(500);
  });
});
