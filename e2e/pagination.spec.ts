import { test, expect } from '@playwright/test';

test.describe('Pagination', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to a page with pagination (e.g., All Gigs tab)
    await page.goto('/');
    // Assuming user is logged in - in real scenario, we'd handle auth
    await page.click('button:has-text("All Gigs")');
  });

  test('should display pagination controls', async ({ page }) => {
    // Wait for table to load
    await page.waitForSelector('[data-testid="gigs-table"]', { timeout: 10000 });
    
    // Check for pagination controls
    const pagination = page.locator('[data-testid="pagination"]');
    await expect(pagination).toBeVisible();
  });

  test('should navigate between pages', async ({ page }) => {
    await page.waitForSelector('[data-testid="gigs-table"]', { timeout: 10000 });
    
    // Get initial page number
    const currentPage = page.locator('[data-testid="current-page"]');
    const initialPage = await currentPage.textContent();
    
    // Click next page button
    await page.click('[data-testid="next-page"]');
    
    // Wait for content to update
    await page.waitForTimeout(500);
    
    // Verify page changed
    const newPage = await currentPage.textContent();
    expect(newPage).not.toBe(initialPage);
  });

  test('should change items per page', async ({ page }) => {
    await page.waitForSelector('[data-testid="gigs-table"]', { timeout: 10000 });
    
    // Open items per page dropdown
    await page.click('[data-testid="items-per-page-select"]');
    
    // Select different value (e.g., 50 instead of 25)
    await page.click('option:has-text("50")');
    
    // Wait for content to update
    await page.waitForTimeout(500);
    
    // Verify the selection changed
    const select = page.locator('[data-testid="items-per-page-select"]');
    const value = await select.inputValue();
    expect(value).toBe('50');
  });

  test('should disable previous button on first page', async ({ page }) => {
    await page.waitForSelector('[data-testid="gigs-table"]', { timeout: 10000 });
    
    const prevButton = page.locator('[data-testid="prev-page"]');
    await expect(prevButton).toBeDisabled();
  });

  test('should navigate to specific page', async ({ page }) => {
    await page.waitForSelector('[data-testid="gigs-table"]', { timeout: 10000 });
    
    // Click on page number 3
    await page.click('[data-testid="page-number"]:has-text("3")');
    
    // Wait for content to update
    await page.waitForTimeout(500);
    
    // Verify we're on page 3
    const currentPage = page.locator('[data-testid="current-page"]');
    await expect(currentPage).toHaveText('3');
  });
});
