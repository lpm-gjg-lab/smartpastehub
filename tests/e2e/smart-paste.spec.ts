import { test, expect } from '@playwright/test';

test.describe('Smart Paste Assistant', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('landing page is Smart Paste Area', async ({ page }) => {
    // Assert title
    await expect(page).toHaveTitle(/Smart Paste Hub/);
    
    // Assert textarea presence
    const textarea = page.getByPlaceholder(/Paste anything here/i);
    await expect(textarea).toBeVisible();

    // Assert shortcut hint
    await expect(page.getByText('Ctrl+Shift+V')).toBeVisible();
    
    // Assert "Clean Now" button is disabled initially
    const cleanBtn = page.getByRole('button', { name: 'Clean Now' });
    await expect(cleanBtn).toBeDisabled();
  });

  test('tab navigation via clicks', async ({ page }) => {
    // Click History tab
    await page.getByRole('menuitem', { name: /History/i }).click();
    await expect(page.getByRole('heading', { name: 'History' })).toBeVisible();

    // Click Settings tab
    await page.getByRole('menuitem', { name: /Settings/i }).click();
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();

    // Verify enterprise features are hidden
    await expect(page.getByText('License')).toBeHidden();
    await expect(page.getByText('Plugin')).toBeHidden();
  });

  test('tab navigation via keyboard', async ({ page }) => {
    // Focus the page body to ensure keyboard events are caught
    await page.locator('body').click();
    
    // Ctrl+2 goes to History
    await page.keyboard.press('Control+2');
    await expect(page.getByRole('heading', { name: 'History' })).toBeVisible();

    // Ctrl+3 goes to Settings
    await page.keyboard.press('Control+3');
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();

    // Ctrl+1 goes back to Paste
    await page.keyboard.press('Control+1');
    await expect(page.getByPlaceholder(/Paste anything here/i)).toBeVisible();
  });
  
  test('paste and clean workflow', async ({ page }) => {
    // Note: in a real environment we'd test the actual IPC response.
    // For this UI test we'll just check that typing enables the button.
    const textarea = page.getByPlaceholder(/Paste anything here/i);
    await textarea.fill('https://example.com?utm_source=twitter');
    
    const cleanBtn = page.getByRole('button', { name: 'Clean Now' });
    await expect(cleanBtn).toBeEnabled();
    
    // We don't click it here because Playwright might timeout waiting for the real IPC 
    // without mocked backend or electron running fully.
  });
});
