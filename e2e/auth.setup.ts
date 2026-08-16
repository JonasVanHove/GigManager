import { test as base } from '@playwright/test';

type AuthFixtures = {
  authenticatedPage: void;
};

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // In a real scenario, this would handle authentication
    // For now, we'll skip auth and assume the user is logged in
    // or use test credentials
    await use();
  },
});

export const expect = base.expect;
