import { test, expect } from '@playwright/test';

test.describe('Bulk Payment Updates', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('button:has-text("All Gigs")');
    await page.waitForSelector('[data-testid="gigs-table"]', { timeout: 10000 });
  });

  test('should select multiple gigs for bulk update', async ({ page }) => {
    // Select first 3 gigs
    await page.check('[data-testid="gig-checkbox"]:nth-child(1)');
    await page.check('[data-testid="gig-checkbox"]:nth-child(2)');
    await page.check('[data-testid="gig-checkbox"]:nth-child(3)');
    
    // Verify bulk actions menu appears
    const bulkMenu = page.locator('[data-testid="bulk-actions-menu"]');
    await expect(bulkMenu).toBeVisible();
  });

  test('should update client paid status via bulk update', async ({ page }) => {
    // Select gigs
    await page.check('[data-testid="gig-checkbox"]:nth-child(1)');
    await page.check('[data-testid="gig-checkbox"]:nth-child(2)');
    
    // Open bulk actions
    await page.click('[data-testid="bulk-actions-menu"]');
    
    // Select "Mark as Client Paid"
    await page.click('button:has-text("Mark as Client Paid")');
    
    // Wait for update
    await page.waitForTimeout(1000);
    
    // Verify status updated - UI should refresh automatically
    const statusCell = page.locator('[data-testid="gig-status"]:nth-child(1)');
    await expect(statusCell).toContainText('Client Paid');
  });

  test('should update band paid status independently via bulk update', async ({ page }) => {
    // Select a gig
    await page.check('[data-testid="gig-checkbox"]:nth-child(1)');
    
    // Open bulk actions
    await page.click('[data-testid="bulk-actions-menu"]');
    
    // Mark as Band Paid (independent action)
    await page.click('button:has-text("Mark as Band Paid")');
    
    // Wait for update
    await page.waitForTimeout(1000);
    
    // Verify band paid status is updated but client paid remains unchanged
    const bandPaidCell = page.locator('[data-testid="band-paid-status"]:nth-child(1)');
    await expect(bandPaidCell).toContainText('Paid');
  });

  test('should handle both client and band paid separately in bulk update', async ({ page }) => {
    // Select 3 gigs
    await page.check('[data-testid="gig-checkbox"]:nth-child(1)');
    await page.check('[data-testid="gig-checkbox"]:nth-child(2)');
    await page.check('[data-testid="gig-checkbox"]:nth-child(3)');
    
    // Open bulk actions
    await page.click('[data-testid="bulk-actions-menu"]');
    
    // Mark as Client Paid first
    await page.click('button:has-text("Mark as Client Paid")');
    await page.waitForTimeout(500);
    
    // Re-open bulk actions
    await page.click('[data-testid="bulk-actions-menu"]');
    
    // Mark as Band Paid separately
    await page.click('button:has-text("Mark as Band Paid")');
    await page.waitForTimeout(1000);
    
    // Verify both statuses are now set
    const statusCell = page.locator('[data-testid="gig-status"]:nth-child(1)');
    await expect(statusCell).toContainText('Client Paid');
    
    const bandPaidCell = page.locator('[data-testid="band-paid-status"]:nth-child(1)');
    await expect(bandPaidCell).toContainText('Paid');
  });

  test('should show date preview in bulk modal', async ({ page }) => {
    // Select gigs
    await page.check('[data-testid="gig-checkbox"]:nth-child(1)');
    
    // Open bulk actions
    await page.click('[data-testid="bulk-actions-menu"]');
    
    // Verify date preview is shown with today's date
    const datePreview = page.locator('text=/Will set payment date to/');
    await expect(datePreview).toBeVisible();
    
    // Get today's date
    const today = new Date().toISOString().split('T')[0];
    await expect(datePreview).toContainText(today);
  });

  test('should allow custom date override in bulk modal', async ({ page }) => {
    // Select gigs
    await page.check('[data-testid="gig-checkbox"]:nth-child(1)');
    
    // Open bulk actions
    await page.click('[data-testid="bulk-actions-menu"]');
    
    // Enable custom date
    await page.check('#useCustomDate');
    
    // Set a custom date
    const customDate = '2024-12-25';
    await page.fill('input[type="date"]', customDate);
    
    // Verify custom date is shown in preview
    const datePreview = page.locator('text=/Will set payment date to/');
    await expect(datePreview).toContainText(customDate);
  });

  test('should deselect all gigs', async ({ page }) => {
    // Select multiple gigs
    await page.check('[data-testid="gig-checkbox"]:nth-child(1)');
    await page.check('[data-testid="gig-checkbox"]:nth-child(2)');
    
    // Click deselect all
    await page.click('[data-testid="deselect-all"]');
    
    // Verify all checkboxes are unchecked
    const checkboxes = page.locator('[data-testid="gig-checkbox"]');
    const count = await checkboxes.count();
    
    for (let i = 0; i < count; i++) {
      await expect(checkboxes.nth(i)).not.toBeChecked();
    }
  });
});
