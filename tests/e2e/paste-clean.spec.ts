import { test, expect } from '@playwright/test';

test('app launches', async ({ page }) => {
  await page.goto('http://localhost:5173');
  await expect(page).toHaveTitle(/Smart Paste Hub/);
});
