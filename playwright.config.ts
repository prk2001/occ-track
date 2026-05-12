import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config — minimal E2E setup.
 *
 * - Runs Chromium only (we don\'t fan out to Firefox/Webkit in CI to keep
 *   the test budget tight; one engine catches the DOM/JS logic bugs E2E
 *   is meant to catch).
 * - webServer auto-starts `npm run dev` and waits for it. Tests run
 *   against http://localhost:3000.
 * - testDir is src/test/e2e (alongside our unit + component tests).
 *
 * For local development run: `npx playwright test`.
 * For CI add `--reporter=github`.
 */
export default defineConfig({
  testDir: './src/test/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 60 * 1000,
  },
});
