import { test, expect } from '@playwright/test';

/**
 * Volunteer signup happy path — the primary use case of the entire app.
 * If this passes, the framework is healthy.
 *
 * Walks through:
 *   1. Public /signup intro
 *   2. Contact step → fill name/email/phone
 *   3. Details step → first-time toggle, T-shirt size, CAPTCHA, agree
 *   4. Submit → see Done step with magic link
 *   5. Extract the magic link from the input
 *   6. Visit /my-signup?token=... → confirm volunteer\'s data is editable
 *
 * Note: HashRouter means URLs are /#/signup etc. Playwright handles them
 * fine but expect() URL assertions must include the hash.
 */
test.describe('Volunteer signup → magic link → self-edit', () => {
  test('complete the public signup wizard and use the magic link', async ({ page }) => {
    // Wipe state so we start with a fresh app.
    await page.goto('/');
    await page.evaluate(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });

    // 1. Intro
    await page.goto('/#/signup');
    await expect(page.getByText(/Yes, we[\'’]d love your help/i)).toBeVisible();
    await page.getByRole('button', { name: /Sign me up/i }).click();

    // 2. Contact
    await expect(page.getByText(/Let[\'’]s start with you/i)).toBeVisible();
    await page.getByPlaceholder(/First and last/i).fill('E2E Test Volunteer');
    await page.getByPlaceholder(/you@email\.com/i).fill('e2e-test@example.org');
    await page.getByPlaceholder(/\(404\) 555-0101/i).first().fill('(404) 555-9999');
    await page.getByPlaceholder(/30301/i).fill('30301');
    await page.getByRole('button', { name: /Continue|Next/i }).click();

    // 3. Details
    await expect(page.getByText(/Almost done/i)).toBeVisible();
    await page.getByRole('radio', { name: /Yes, first time/i }).click();
    await page.getByRole('button', { name: /T-shirt size M/i }).click();
    // CAPTCHA stub
    await page.getByRole('button', { name: /I[\'’]m not a robot/i }).click();
    await expect(page.getByText(/Verified\./i)).toBeVisible({ timeout: 5000 });
    // Agree
    await page.locator('input[type="checkbox"]').first().check();
    // Submit
    await page.getByRole('button', { name: /Submit my sign-up|Sign me up/i }).click();

    // 4. Done page
    await expect(page.getByText(/Your personal edit link/i)).toBeVisible({ timeout: 5000 });
    // The Done summary should show the email we just submitted
    await expect(page.getByText('e2e-test@example.org').first()).toBeVisible();

    // 5. Extract the magic link URL from the input
    const magicLinkValue = await page.locator('#magic-link-input').inputValue();
    expect(magicLinkValue).toContain('#/my-signup?token=');

    // 6. Navigate to the magic link
    const tokenMatch = magicLinkValue.match(/token=([^&]+)/);
    expect(tokenMatch).not.toBeNull();
    const token = tokenMatch![1];
    await page.goto(`/#/my-signup?token=${token}`);

    // 7. Confirm the self-edit page shows our data
    await expect(page.getByText(/Your signup details/i)).toBeVisible({ timeout: 5000 });
    // The name input should be pre-filled with our submitted name
    const nameInput = page.locator('input').first();
    await expect(nameInput).toHaveValue('E2E Test Volunteer', { timeout: 5000 });
  });

  test('/my-signup with no token shows the email recovery flow', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => window.localStorage.clear());
    // No-token reason renders the recovery email form.
    await page.goto('/#/my-signup');
    await expect(page.getByText(/Link missing/i)).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test('language toggle switches the intro to Spanish', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => window.localStorage.clear());
    await page.goto('/#/signup');
    // Click ES in the hero language toggle
    await page.getByRole('button', { name: /Español/i }).click();
    // Spanish intro headline
    await expect(page.getByText(/nos encantaría tu ayuda/i)).toBeVisible();
  });
});
