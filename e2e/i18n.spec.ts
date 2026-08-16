import { test, expect } from '@playwright/test';

test.describe('i18n Language Switching (NL/EN)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for app to load
    await page.waitForSelector('button', { timeout: 10000 });
  });

  test('should have language setting in settings modal', async ({ page }) => {
    // Open settings modal - look for settings button in profile menu
    await page.click('button[title="Profile & Settings"]');
    
    // Wait for settings modal
    await page.waitForSelector('text=Settings', { timeout: 5000 });
    
    // Verify language dropdown exists
    const languageSelect = page.locator('select').filter({ hasText: /System language|English|Nederlands/ });
    await expect(languageSelect).toBeVisible();
  });

  test('should switch from English to Dutch', async ({ page }) => {
    // Open settings
    await page.click('button[title="Profile & Settings"]');
    await page.waitForSelector('text=Settings', { timeout: 5000 });
    
    // Select Dutch
    const languageSelect = page.locator('select').filter({ hasText: /System language|English|Nederlands/ });
    await languageSelect.selectOption('nl');
    
    // Save settings
    await page.click('button:has-text("Save")');
    
    // Wait for save to complete
    await page.waitForTimeout(1000);
    
    // Verify UI strings are in Dutch
    const overviewTab = page.locator('button:has-text("Overzicht")');
    await expect(overviewTab).toBeVisible();
  });

  test('should switch from Dutch to English', async ({ page }) => {
    // First switch to Dutch
    await page.click('button[title="Profile & Settings"]');
    await page.waitForSelector('text=Settings', { timeout: 5000 });
    
    const languageSelect = page.locator('select').filter({ hasText: /System language|English|Nederlands/ });
    await languageSelect.selectOption('nl');
    await page.click('button:has-text("Save")');
    await page.waitForTimeout(1000);
    
    // Reopen settings and switch back to English
    await page.click('button[title="Profile & Settings"]');
    await page.waitForSelector('text=Settings', { timeout: 5000 });
    
    await languageSelect.selectOption('en');
    await page.click('button:has-text("Save")');
    await page.waitForTimeout(1000);
    
    // Verify UI strings are in English
    const overviewTab = page.locator('button:has-text("Overview")');
    await expect(overviewTab).toBeVisible();
  });

  test('should update dashboard tab labels when language changes', async ({ page }) => {
    // Get initial English labels
    const allGigsEn = page.locator('button:has-text("All Gigs")');
    const isEnVisible = await allGigsEn.isVisible().catch(() => false);
    
    // Switch to Dutch
    await page.click('button[title="Profile & Settings"]');
    await page.waitForSelector('text=Settings', { timeout: 5000 });
    
    const languageSelect = page.locator('select').filter({ hasText: /System language|English|Nederlands/ });
    await languageSelect.selectOption('nl');
    await page.click('button:has-text("Save")');
    await page.waitForTimeout(1000);
    
    // Verify Dutch labels
    const allGigsNl = page.locator('button:has-text("Alle Optredens")');
    await expect(allGigsNl).toBeVisible();
    
    // English label should not be visible (if it was before)
    if (isEnVisible) {
      await expect(allGigsEn).not.toBeVisible();
    }
  });

  test('should update settings modal strings when language changes', async ({ page }) => {
    // Switch to Dutch first
    await page.click('button[title="Profile & Settings"]');
    await page.waitForSelector('text=Settings', { timeout: 5000 });
    
    const languageSelect = page.locator('select').filter({ hasText: /System language|English|Nederlands/ });
    await languageSelect.selectOption('nl');
    await page.click('button:has-text("Save")');
    await page.waitForTimeout(1000);
    
    // Reopen settings
    await page.click('button[title="Profile & Settings"]');
    await page.waitForSelector('text=Instellingen', { timeout: 5000 });
    
    // Verify Dutch strings in settings
    const profileLabel = page.locator('label:has-text("Profiel")');
    await expect(profileLabel).toBeVisible();
    
    const currencyLabel = page.locator('label:has-text("Valuta")');
    await expect(currencyLabel).toBeVisible();
  });

  test('should persist language preference across page reloads', async ({ page }) => {
    // Switch to Dutch
    await page.click('button[title="Profile & Settings"]');
    await page.waitForSelector('text=Settings', { timeout: 5000 });
    
    const languageSelect = page.locator('select').filter({ hasText: /System language|English|Nederlands/ });
    await languageSelect.selectOption('nl');
    await page.click('button:has-text("Save")');
    await page.waitForTimeout(1000);
    
    // Reload page
    await page.reload();
    await page.waitForSelector('button', { timeout: 10000 });
    
    // Verify language is still Dutch
    const overviewTab = page.locator('button:has-text("Overzicht")');
    await expect(overviewTab).toBeVisible();
  });

  test('should update Songs tab when language changes', async ({ page }) => {
    // Navigate to Songs tab
    await page.click('button:has-text("Songs")');
    await page.waitForTimeout(500);
    
    // Switch to Dutch
    await page.click('button[title="Profile & Settings"]');
    await page.waitForSelector('text=Settings', { timeout: 5000 });
    
    const languageSelect = page.locator('select').filter({ hasText: /System language|English|Nederlands/ });
    await languageSelect.selectOption('nl');
    await page.click('button:has-text("Save")');
    await page.waitForTimeout(1000);
    
    // Close settings
    await page.click('button[aria-label="Close"]');
    
    // Verify Songs tab has Dutch strings
    const newSongButton = page.locator('button:has-text("+ Nieuw nummer")');
    await expect(newSongButton).toBeVisible();
  });

  test('should update Bands tab when language changes', async ({ page }) => {
    // Navigate to Bands tab
    await page.click('button:has-text("Bands")');
    await page.waitForTimeout(500);
    
    // Switch to Dutch
    await page.click('button[title="Profile & Settings"]');
    await page.waitForSelector('text=Settings', { timeout: 5000 });
    
    const languageSelect = page.locator('select').filter({ hasText: /System language|English|Nederlands/ });
    await languageSelect.selectOption('nl');
    await page.click('button:has-text("Save")');
    await page.waitForTimeout(1000);
    
    // Close settings
    await page.click('button[aria-label="Close"]');
    
    // Verify Bands tab has Dutch strings
    const bandsTitle = page.locator('h1:has-text("Bands")');
    await expect(bandsTitle).toBeVisible();
  });

  test('should handle system language option', async ({ page }) => {
    await page.click('button[title="Profile & Settings"]');
    await page.waitForSelector('text=Settings', { timeout: 5000 });
    
    // Select system language
    const languageSelect = page.locator('select').filter({ hasText: /System language|English|Nederlands/ });
    await languageSelect.selectOption('system');
    
    // Save
    await page.click('button:has-text("Save")');
    await page.waitForTimeout(1000);
    
    // Verify it saves without error
    const settingsModal = page.locator('text=Settings');
    await expect(settingsModal).not.toBeVisible();
  });
});

