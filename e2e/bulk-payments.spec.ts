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
    
    // Confirm action
    await page.click('button:has-text("Confirm")');
    
    // Wait for update
    await page.waitForTimeout(1000);
    
    // Verify status updated
    const statusCell = page.locator('[data-testid="gig-status"]:nth-child(1)');
    await expect(statusCell).toContainText('Client Paid');
  });

  test('should sync band paid status when client paid is updated', async ({ page }) => {
    // Select a gig
    await page.check('[data-testid="gig-checkbox"]:nth-child(1)');
    
    // Open bulk actions
    await page.click('[data-testid="bulk-actions-menu"]');
    
    // Mark as Client Paid
    await page.click('button:has-text("Mark as Client Paid")');
    await page.click('button:has-text("Confirm")');
    
    // Wait for sync
    await page.waitForTimeout(1500);
    
    // Verify band paid status is also updated
    const bandPaidCell = page.locator('[data-testid="band-paid-status"]:nth-child(1)');
    await expect(bandPaidCell).toContainText('Paid');
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

  test('should show bulk update confirmation dialog', async ({ page }) => {
    // Select gigs
    await page.check('[data-testid="gig-checkbox"]:nth-child(1)');
    
    // Open bulk actions
    await page.click('[data-testid="bulk-actions-menu"]');
    
    // Trigger bulk update
    await page.click('button:has-text("Mark as Client Paid")');
    
    // Verify confirmation dialog appears
    const dialog = page.locator('[data-testid="confirmation-dialog"]');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('Are you sure');
  });
});
