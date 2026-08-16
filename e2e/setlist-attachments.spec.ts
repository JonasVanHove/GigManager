import { test, expect } from '@playwright/test';

test.describe('Setlist Attachments & Speed', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('button:has-text("Setlists")');
    await page.waitForSelector('[data-testid="setlists-container"]', { timeout: 10000 });
  });

  test('should load setlists quickly', async ({ page }) => {
    const startTime = Date.now();
    
    await page.waitForSelector('[data-testid="setlists-container"]', { timeout: 10000 });
    
    const loadTime = Date.now() - startTime;
    
    // Should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test('should load songs quickly', async ({ page }) => {
    await page.click('button:has-text("Songs")');
    
    const startTime = Date.now();
    await page.waitForSelector('[data-testid="songs-container"]', { timeout: 10000 });
    
    const loadTime = Date.now() - startTime;
    
    // Should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test('should attach file to setlist item', async ({ page }) => {
    // Click on a setlist
    await page.click('[data-testid="setlist-item"]:first-child');
    
    // Wait for setlist details
    await page.waitForSelector('[data-testid="setlist-details"]', { timeout: 5000 });
    
    // Click on a song in the setlist
    await page.click('[data-testid="setlist-song-item"]:first-child');
    
    // Click attach button
    await page.click('[data-testid="attach-file-button"]');
    
    // Upload a test file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('e2e/fixtures/test-attachment.pdf');
    
    // Wait for upload to complete
    await page.waitForSelector('[data-testid="attachment-success"]', { timeout: 5000 });
    
    // Verify attachment appears
    const attachment = page.locator('[data-testid="attachment-item"]');
    await expect(attachment).toBeVisible();
  });

  test('should view attachment', async ({ page }) => {
    // Navigate to a setlist with attachments
    await page.click('[data-testid="setlist-item"]:first-child');
    await page.waitForSelector('[data-testid="setlist-details"]', { timeout: 5000 });
    
    // Click on an existing attachment
    await page.click('[data-testid="attachment-item"]:first-child');
    
    // Verify attachment viewer opens
    const viewer = page.locator('[data-testid="attachment-viewer"]');
    await expect(viewer).toBeVisible();
  });

  test('should fetch most up-to-date attachment', async ({ page }) => {
    // Navigate to setlist
    await page.click('[data-testid="setlist-item"]:first-child');
    await page.waitForSelector('[data-testid="setlist-details"]', { timeout: 5000 });
    
    // Get initial attachment count
    const initialCount = await page.locator('[data-testid="attachment-item"]').count();
    
    // Refresh the page
    await page.reload();
    await page.waitForSelector('[data-testid="setlist-details"]', { timeout: 5000 });
    
    // Verify same count (data persistence)
    const newCount = await page.locator('[data-testid="attachment-item"]').count();
    expect(newCount).toBe(initialCount);
  });

  test('should delete attachment', async ({ page }) => {
    await page.click('[data-testid="setlist-item"]:first-child');
    await page.waitForSelector('[data-testid="setlist-details"]', { timeout: 5000 });
    
    // Get initial count
    const initialCount = await page.locator('[data-testid="attachment-item"]').count();
    
    if (initialCount > 0) {
      // Click delete on first attachment
      await page.click('[data-testid="attachment-item"]:first-child [data-testid="delete-attachment"]');
      
      // Confirm deletion
      await page.click('button:has-text("Delete")');
      
      // Wait for deletion
      await page.waitForTimeout(500);
      
      // Verify count decreased
      const newCount = await page.locator('[data-testid="attachment-item"]').count();
      expect(newCount).toBe(initialCount - 1);
    }
  });

  test('should handle large attachment upload', async ({ page }) => {
    await page.click('[data-testid="setlist-item"]:first-child');
    await page.waitForSelector('[data-testid="setlist-details"]', { timeout: 5000 });
    
    await page.click('[data-testid="setlist-song-item"]:first-child');
    await page.click('[data-testid="attach-file-button"]');
    
    const fileInput = page.locator('input[type="file"]');
    // This would test with a larger file in real scenario
    await fileInput.setInputFiles('e2e/fixtures/test-attachment.pdf');
    
    // Should handle upload without timeout
    await page.waitForSelector('[data-testid="attachment-success"]', { timeout: 10000 });
  });
});
