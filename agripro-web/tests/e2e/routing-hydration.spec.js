import { test, expect } from '@playwright/test';

test.describe('Routing & Hydration', () => {
  test('App loads and shows login/landing page without session', async ({ page }) => {
    await page.goto('/');
    
    // Should show the landing page or auth
    // Look for a heading or a button that indicates landing page
    const getStartedButton = page.locator('button', { hasText: /Get Started|Log In|Sign In/i }).first();
    await expect(getStartedButton).toBeVisible({ timeout: 15000 });
  });

  // Since we don't want to hardcode credentials for a real DB in the test,
  // we will check if the routing handles unknown URLs gracefully (our catch-all route).
  test('Catch-all route handles unknown URLs gracefully', async ({ page }) => {
    await page.goto('/some-unknown-route-that-does-not-exist');
    
    // Should show either Auth (if guarded) or the "Module Not Found" page (if logged in or unprotected)
    // If we're not logged in, we expect to be redirected to home or auth
    const url = page.url();
    // It shouldn't be a blank page. We can check if the body has content.
    const bodyContent = await page.locator('body').innerText();
    expect(bodyContent.length).toBeGreaterThan(0);
  });
});
