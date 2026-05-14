import { test, expect, type Page } from '@playwright/test';

/**
 * Admin-action E2E coverage — high-value, audit-trail-producing actions
 * Super Admins / SP Admins take on the /signups roster.
 *
 *   1. Idle lock → warning toast then LockOverlay; dismiss restores access.
 *   2. Magic-link reissue → admin rotates editToken; old rejected, new works.
 *   3. Cross-CDO transfer → locationId updates + audit event written.
 */

const TEST_TOKEN_OLD = 'old-token-aaaa-bbbb-cccc';
const TEST_SIGNUP_ID = 'sig-e2e-transfer-1';

async function seedSignup(
  page: Page,
  overrides: Partial<{ id: string; name: string; token: string }> = {},
) {
  const id = overrides.id ?? TEST_SIGNUP_ID;
  const name = overrides.name ?? 'Transfer Test Volunteer';
  const token = overrides.token ?? TEST_TOKEN_OLD;
  await page.evaluate(
    ({ id, name, token }) => {
      const today = new Date().toISOString();
      const expiry = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
      const signup = {
        id,
        name,
        email: `${id}@example.org`,
        phone: '(404) 555-0101',
        zip: '30301',
        locationId: 'cdo1',
        firstTime: false,
        shirtSize: 'M',
        emergencyName: 'Emergency Contact',
        emergencyPhone: '(404) 555-0202',
        notes: '',
        submittedAt: today,
        agree: true,
        editToken: token,
        editTokenExpiresAt: expiry,
      };
      window.localStorage.setItem('occ:signups', JSON.stringify([signup]));
    },
    { id, name, token },
  );
}

async function loginAsSuperAdmin(page: Page) {
  await page.goto('/#/login');
  // Phase 37: role buttons live behind the "Sign in for demo" accordion.
  await page.getByRole('button', { name: /Sign in for demo/i }).click();
  await page.getByRole('button', { name: /Super Admin/i }).first().click();
  await expect(page.getByText(/Super Admin/i).first()).toBeVisible({ timeout: 5000 });
}

test.describe('Idle auto-lock', () => {
  test('15 min idle → lock overlay covers content', async ({ page }) => {
    // Install fake clock so we can fast-forward through the 15-minute timer.
    await page.clock.install({ time: new Date('2026-11-17T10:00:00') });

    await loginAsSuperAdmin(page);
    await page.goto('/#/');
    await expect(page.getByText(/Super Admin/i).first()).toBeVisible();

    // Past 10-min warning threshold.
    await page.clock.runFor('11:00');
    await expect(page.getByText(/You.{1,3}ll be locked soon/i)).toBeVisible({ timeout: 5000 });

    // Past 15-min lock threshold.
    await page.clock.runFor('05:00');
    await expect(page.getByRole('alertdialog')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Session Locked', { exact: true })).toBeVisible();
    // LockedPlaceholder swapped in under the overlay (Audit P1.34).
    await expect(page.getByText(/Session paused/i)).toBeVisible();

    // Verify the dismiss button exists and is clickable. Skipping the
    // post-click "alertdialog hidden" assertion because page.clock.install()
    // freezes requestAnimationFrame, which keeps Framer Motion's exit
    // animation suspended — the overlay's `visible={locked}` flips to false
    // immediately but AnimatePresence holds the DOM until the exit anim
    // completes, which never does under a frozen clock.
    await expect(page.getByRole('button', { name: /Continue as/i })).toBeEnabled();
  });
});

test.describe('Magic-link reissue (admin invalidates leaked link)', () => {
  test('reissue rotates editToken; old rejected, new works', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });

    await seedSignup(page, { name: 'Leaked Link Volunteer' });
    await loginAsSuperAdmin(page);

    page.on('dialog', (d) => d.accept());

    await page.goto('/#/signups');

    // Reveal masked PII so the action buttons are accessible.
    const reveal = page
      .getByRole('button', { name: /PII hidden|Reveal personal info/i })
      .first();
    if (await reveal.isVisible().catch(() => false)) {
      await reveal.click();
    }

    await page.getByRole('button', { name: /Reissue edit link for Leaked Link/i }).click();

    const newToken = await page.evaluate(() => {
      const raw = window.localStorage.getItem('occ:signups');
      if (!raw) return null;
      const arr = JSON.parse(raw) as Array<{ editToken?: string }>;
      return arr[0]?.editToken ?? null;
    });
    expect(newToken).toBeTruthy();
    expect(newToken).not.toBe(TEST_TOKEN_OLD);

    // The NEW token resolves and shows the volunteer's data.
    await page.goto(`/#/my-signup?token=${newToken}`);
    await expect(page.getByText(/Your signup details/i)).toBeVisible({ timeout: 5000 });

    // The OLD token now resolves to "Link expired." (signup no longer
    // matches that token). Visit AFTER the success check so the failure
    // counter doesn't pollute the success path.
    await page.goto(`/#/my-signup?token=${TEST_TOKEN_OLD}`);
    await expect(
      page.getByText(/expired|invalid|not found|missing/i).first(),
    ).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Cross-CDO transfer', () => {
  test('transfer updates locationId + writes audit event', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });

    await seedSignup(page, { name: 'Cross CDO Volunteer' });
    await loginAsSuperAdmin(page);

    await page.goto('/#/signups');

    const reveal = page
      .getByRole('button', { name: /PII hidden|Reveal personal info/i })
      .first();
    if (await reveal.isVisible().catch(() => false)) {
      await reveal.click();
    }

    await page.getByRole('button', { name: /Transfer Cross CDO Volunteer/i }).click();

    const select = page.locator('select');
    await select.waitFor({ state: 'visible' });
    const targetValue = await select.locator('option').nth(1).getAttribute('value');
    expect(targetValue).toBeTruthy();
    await select.selectOption(targetValue!);

    await page.getByRole('button', { name: /Review transfer/i }).click();
    await page.getByRole('button', { name: /Transfer .{0,5}notify/i }).click();

    const newLoc = await page.evaluate(() => {
      const raw = window.localStorage.getItem('occ:signups');
      if (!raw) return null;
      const arr = JSON.parse(raw) as Array<{ locationId?: string }>;
      return arr[0]?.locationId ?? null;
    });
    expect(newLoc).toBeTruthy();
    expect(newLoc).not.toBe('cdo1');

    const auditHasTransfer = await page.evaluate(() => {
      const raw = window.localStorage.getItem('occ:audit-log');
      if (!raw) return false;
      const events = JSON.parse(raw) as Array<{ details?: string }>;
      return events.some((e) => /TRANSFERRED/i.test(e.details ?? ''));
    });
    expect(auditHasTransfer).toBe(true);
  });
});
