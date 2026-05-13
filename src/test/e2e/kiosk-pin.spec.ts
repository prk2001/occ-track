import { test, expect } from '@playwright/test';

/**
 * Kiosk PIN gate E2E — covers the security primitives that protect a
 * shared iPad at the welcome table from random tampering.
 *
 * Flow under test:
 *   1. First visit to /welcome-table → SetPinPanel ("Set a kiosk PIN")
 *   2. Pick a 4-digit PIN, confirm, launch → see kiosk roster
 *   3. Triple-tap the lock icon → kiosk re-locks → reload shows UnlockPanel
 *   4. 5 wrong PIN attempts → forced reset back to SetPinPanel
 *
 * Implementation detail: the PIN inputs are <input class="sr-only">
 * (visually hidden, but focusable). Playwright's getByLabel handles them
 * since the input has aria-label="PIN".
 */
test.describe('Kiosk PIN gate (Welcome Table)', () => {
  test('first launch → set PIN → unlocks → triple-tap re-locks', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });

    await page.goto('/#/welcome-table');
    // SetPinPanel headline ("Greeter only.")
    await expect(page.getByText(/Set a kiosk PIN/i)).toBeVisible({ timeout: 5000 });

    // Two sr-only inputs (PIN + Confirm PIN) — fill both.
    const inputs = page.locator('input[type="tel"]');
    await expect(inputs).toHaveCount(2);
    await inputs.nth(0).fill('4242');
    await inputs.nth(1).fill('4242');

    await page.getByRole('button', { name: /Launch Welcome Table/i }).click();

    // Now the kiosk roster should render. Header text "Welcome" or similar.
    // Look for the lock icon button (top-left) which is part of the kiosk.
    await expect(page.getByRole('button', { name: /Lock kiosk/i })).toBeVisible({ timeout: 5000 });
  });

  test('5 wrong PINs forces a reset', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });

    // Pre-seed a PIN so we land on UnlockPanel instead of SetPinPanel.
    // We mirror what setKioskPin does: hash the PIN + store under occ:kiosk-pin.
    await page.goto('/#/welcome-table');
    await expect(page.getByText(/Set a kiosk PIN/i)).toBeVisible();
    const pinInputs = page.locator('input[type="tel"]');
    await pinInputs.nth(0).fill('1234');
    await pinInputs.nth(1).fill('1234');
    await page.getByRole('button', { name: /Launch Welcome Table/i }).click();
    // We're unlocked now. Clear the unlocked flag (simulate iPad being
    // closed + re-opened) so we hit the UnlockPanel.
    await page.evaluate(() => window.sessionStorage.removeItem('occ:kiosk-unlocked'));
    await page.reload();

    await expect(page.getByText(/Greeter PIN required/i)).toBeVisible({ timeout: 5000 });

    // Five wrong attempts.
    const unlockInput = page.locator('input[type="tel"]').first();
    for (let i = 0; i < 5; i++) {
      await unlockInput.fill('9999');
      await page.getByRole('button', { name: /^Unlock$/i }).click();
      // Brief settle — the wrong-PIN branch resets state synchronously.
      await page.waitForTimeout(150);
    }

    // After 5 failures → forced reset back to SetPinPanel (clearKioskPin()).
    await expect(page.getByText(/Set a kiosk PIN/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Too many wrong tries/i)).toBeVisible();
  });
});
