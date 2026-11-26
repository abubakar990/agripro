import { test, expect } from '@playwright/test';

// These run without a Supabase session, so they cover the signed-out surface:
// the landing page, the auth screen, and the SPA fallback for unknown URLs.

/** Collects console errors and uncaught exceptions for the duration of a test. */
const watchForErrors = (page) => {
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(`Uncaught: ${err.message}`));
  return errors;
};

test.describe('Routing & Hydration', () => {
  test('App loads and shows login/landing page without session', async ({ page }) => {
    await page.goto('/');

    const getStartedButton = page.locator('button', { hasText: /Get Started|Log In|Sign In/i }).first();
    await expect(getStartedButton).toBeVisible({ timeout: 15000 });
  });

  test('Catch-all route handles unknown URLs gracefully', async ({ page }) => {
    await page.goto('/some-unknown-route-that-does-not-exist');

    // The dev/preview server serves index.html for unknown paths and React mounts into an
    // initially empty <body>. Assert with a web-first expectation so we wait for the app to
    // render instead of racing it — reading innerText immediately returns "" and is flaky.
    await expect(page.locator('#root')).not.toBeEmpty();
    await expect(page.locator('body')).toContainText(/AgriPro/i);
  });

  test('Landing page renders without console errors', async ({ page }) => {
    const errors = watchForErrors(page);
    await page.goto('/');

    await expect(page.getByRole('button', { name: /Get Started/i }).first()).toBeVisible();
    expect(errors, `Console errors on landing page:\n${errors.join('\n')}`).toEqual([]);
  });

  test('Get Started opens the sign-in form', async ({ page }) => {
    const errors = watchForErrors(page);
    await page.goto('/');

    await page.getByRole('button', { name: /Get Started/i }).first().click();

    await expect(page.getByText(/Welcome back/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /^Sign In$/i })).toBeVisible();
    expect(errors, `Console errors on auth screen:\n${errors.join('\n')}`).toEqual([]);
  });

  test('Sign-in form can be dismissed back to the landing page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Get Started/i }).first().click();
    await expect(page.getByText(/Welcome back/i)).toBeVisible();

    await page.getByRole('button', { name: /Back to Home/i }).click();

    await expect(page.getByRole('button', { name: /Get Started/i }).first()).toBeVisible();
    await expect(page.getByText(/Welcome back/i)).toHaveCount(0);
  });

  test('Signed-out users never reach an app route', async ({ page }) => {
    // Protected routes live inside the <Router> that only mounts with a session, so any
    // deep link must land on the landing page rather than a blank screen.
    for (const path of ['/reports', '/loans', '/credit', '/inventory']) {
      await page.goto(path);
      await expect(page.locator('#root')).not.toBeEmpty();
      await expect(page.getByRole('button', { name: /Get Started/i }).first()).toBeVisible();
    }
  });
});
