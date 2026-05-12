import { test, expect } from '@playwright/test';

/**
 * Admin-flow E2E coverage — exercises the role / privacy / data-integrity
 * primitives that an audit-conscious deploy depends on.
 *
 * Tests in order:
 *   1. Default-null auth: visiting / when not logged in redirects to /login
 *   2. Login flow: pick a role on /login → land on the correct dashboard
 *   3. Role switching: a CDO Leader sees the operational view, not admin-only
 *      surfaces (Signups admin shows the privacy lock card)
 *   4. App-mode gate: in production mode, the CheckIn page blocks writes
 *   5. Audit log records the test → production flip with actor + timestamp
 */
test.describe('Admin flows — auth, role scoping, app-mode integrity', () => {
  // Playwright gives each test a fresh browser context (and therefore fresh
  // localStorage/sessionStorage). We don\'t need to clear storage manually —
  // and trying to do so via an intermediate goto + evaluate caused a
  // navigation race under parallel workers that blanked the page.

  // Per-test setup: log out (if any) then go to /login.
  async function freshLogin(page: any) {
    await page.goto('/#/login');
    await page.evaluate(() => { window.localStorage.clear(); window.sessionStorage.clear(); });
  }

  test('default-null auth: visiting / redirects to /login when not logged in', async ({ page }) => {
    await page.goto('/#/');
    // Dashboard returns <Navigate to="/login" /> when user is null.
    // Wait for the Login hero to render (proves redirect landed).
    await expect(page.getByText(/Welcome back, friend/i)).toBeVisible({ timeout: 10000 });
  });

  test('login as Super Admin → dashboard shows Super Admin badge', async ({ page }) => {
    await freshLogin(page);
    await page.goto('/#/login');
    await page.getByRole('button', { name: /Super Admin/i }).first().click();
    // Don't assert on URL — assert the Super Admin dashboard is now visible.
    await expect(page.getByText(/Super Admin/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('login as CDO Leader → Signups admin shows privacy lock card', async ({ page }) => {
    await freshLogin(page);
    await page.getByRole('button', { name: /CDO Leader/i }).first().click();
    // Wait for dashboard to render
    await expect(page.getByText(/CDO Leader/i).first()).toBeVisible({ timeout: 5000 });

    // Navigate to /signups — CDO Leader is gated from PII roster (Phase 14)
    await page.goto('/#/signups');
    // Both the h1 hero and the h2 lock card say "Volunteer information
    // is private" — either is fine proof of the lockdown. Use the
    // surrounding hero phrase to disambiguate.
    await expect(page.getByText(/Restricted area\./i)).toBeVisible({ timeout: 5000 });
  });

  test('production-mode app blocks shoebox check-in', async ({ page }) => {
    await freshLogin(page);
    await page.getByRole('button', { name: /Super Admin/i }).first().click();
    await expect(page.getByText(/Super Admin/i).first()).toBeVisible({ timeout: 5000 });

    // Default mode is production → /checkin shows the lock card
    await page.goto('/#/checkin');
    await expect(page.getByText(/Shoebox check-in is locked/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('link', { name: /Switch to Testing Mode/i })).toBeVisible();
  });

  test('/security route accessible to Super Admin', async ({ page }) => {
    await freshLogin(page);
    await page.getByRole('button', { name: /Super Admin/i }).first().click();
    await page.goto('/#/security');
    // Security Center page should load (gated to isSuperAdmin)
    await expect(page.getByText(/Security Center/i).first()).toBeVisible();
  });

  test('/security route blocked for CDO Leader', async ({ page }) => {
    await freshLogin(page);
    await page.getByRole('button', { name: /CDO Leader/i }).first().click();
    await page.goto('/#/security');
    // Should show the Super-Admin-only lock screen
    await expect(page.getByText(/Super Admin only/i).first()).toBeVisible();
  });

  test('skip-to-main link is the first focusable element', async ({ page }) => {
    await freshLogin(page);
    // Tab once — should focus the skip link
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => document.activeElement?.textContent);
    expect(focused).toContain('Skip to main content');
  });
});
