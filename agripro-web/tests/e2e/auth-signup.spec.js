import { test, expect } from '@playwright/test';

// Network is mocked so these never create real Supabase accounts.
const openSignUp = async (page) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Get Started/i }).first().click();
  await page.getByRole('button', { name: /Sign up/i }).click();
  await page.getByLabel(/Full Name/i).fill('Test Farmer');
  await page.getByLabel(/Email Address/i).fill('newuser@example.com');
  await page.getByLabel(/Password/i).fill('supersecret123');
};

test('sign-up shows a confirmation message instead of silently doing nothing', async ({ page }) => {
  await page.route('**/auth/v1/signup**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      // Confirmation required: no session, user has identities.
      body: JSON.stringify({
        id: 'abc', email: 'newuser@example.com',
        identities: [{ id: 'i1' }], session: null,
      }),
    })
  );

  await openSignUp(page);
  await page.getByRole('button', { name: /Get Started/i }).last().click();

  await expect(page.locator('form').getByRole('status')).toContainText(/confirmation link to newuser@example\.com/i);
});

test('already-registered email says so rather than pointing at an empty inbox', async ({ page }) => {
  await page.route('**/auth/v1/signup**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      // Supabase obfuscates existing accounts: user returned with NO identities.
      body: JSON.stringify({
        id: 'abc', email: 'newuser@example.com',
        identities: [], session: null,
      }),
    })
  );

  await openSignUp(page);
  await page.getByRole('button', { name: /Get Started/i }).last().click();

  await expect(page.locator('form').getByRole('status')).toContainText(/already exists/i);
});

test('unconfirmed sign-in explains what to do', async ({ page }) => {
  await page.route('**/auth/v1/token**', (route) =>
    route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'invalid_grant', error_description: 'Email not confirmed' }),
    })
  );

  await page.goto('/');
  await page.getByRole('button', { name: /Get Started/i }).first().click();
  await page.getByLabel(/Email Address/i).fill('unconfirmed@example.com');
  await page.getByLabel(/Password/i).fill('supersecret123');
  await page.getByRole('button', { name: /^Sign In$/i }).click();

  await expect(page.locator('form').getByRole('alert')).toContainText(/has not been confirmed/i);
});
