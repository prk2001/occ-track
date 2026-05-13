import { test, expect } from '@playwright/test';

// /privacy + /terms — small public surface added in Phase 35a.
test.describe('Legal pages', () => {
  test('Privacy renders with all 5 sections', async ({ page }) => {
    await page.goto('/#/privacy');
    const main = page.getByRole('main');
    await expect(
      main.getByRole('heading', { name: /Your trust/i, level: 1 }),
    ).toBeVisible();
    await expect(main.getByRole('heading', { name: /What we collect/i })).toBeVisible();
    await expect(main.getByRole('heading', { name: /How we use it/i })).toBeVisible();
    await expect(main.getByRole('heading', { name: /Who we share it with/i })).toBeVisible();
    await expect(main.getByRole('heading', { name: /How long we keep it/i })).toBeVisible();
    await expect(main.getByRole('heading', { name: /Your rights/i })).toBeVisible();
    await expect(
      main.getByRole('link', { name: /privacy@samaritanspurse\.org/ }),
    ).toBeVisible();
  });

  test('Terms renders with the 4 main sections', async ({ page }) => {
    await page.goto('/#/terms');
    const main = page.getByRole('main');
    await expect(
      main.getByRole('heading', { name: /Serving/i, level: 1 }),
    ).toBeVisible();
    // Scope to <main> to avoid matching the Footer's "In Jesus' Name." tagline.
    await expect(main.getByRole('heading', { name: /In Jesus.{1,3} Name/i })).toBeVisible();
    await expect(main.getByRole('heading', { name: /Your account/i })).toBeVisible();
    await expect(main.getByRole('heading', { name: /Volunteer activity/i })).toBeVisible();
    await expect(main.getByRole('heading', { name: /Changes to this agreement/i })).toBeVisible();
  });

  test('Footer Privacy + Terms links navigate correctly', async ({ page }) => {
    await page.goto('/#/login');
    const footer = page.getByRole('contentinfo');
    await footer.getByRole('link', { name: /^Privacy$/i }).click();
    await expect(page).toHaveURL(/#\/privacy$/);
    await page.goto('/#/login');
    await footer.getByRole('link', { name: /^Terms$/i }).click();
    await expect(page).toHaveURL(/#\/terms$/);
  });
});
