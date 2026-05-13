import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * WCAG 2.1 AA accessibility audit.
 *
 * @axe-core/playwright runs the same rule engine as the axe DevTools
 * extension. We hit every key public route + a few private ones, and
 * report any "critical" or "serious" violations.
 *
 * Why log-only (not failure) for now: the first run catches a baseline
 * of issues (decorative SVGs missing aria-hidden, etc.). Once we fix
 * the obvious ones, flip the soft-assert below to expect(violations).
 * toEqual([]) for strict CI enforcement.
 */
const ROUTES_TO_AUDIT = [
  { name: 'Login', url: '/#/login' },
  { name: 'Volunteer signup intro', url: '/#/signup' },
  { name: 'My signup (no token = recovery flow)', url: '/#/my-signup' },
];

for (const { name, url } of ROUTES_TO_AUDIT) {
  test(`a11y: ${name}`, async ({ page }) => {
    await page.goto(url);
    // Wait for primary content to render. Login + Signup both have a hero h1.
    await page.waitForSelector('h1', { timeout: 5000 });

    // Wait for Framer Motion entry animations to fully settle before
    // scanning — axe scanning mid-fade sees partially-transparent text
    // and reports phantom contrast failures (e.g. #C8102E at 50% opacity
    // blends to #E08896 against white, which fails AA even though the
    // resting state passes). 1200ms covers our longest stagger chain
    // (0.3s delayChildren + 0.3s stagger + 0.4s child transition + buffer).
    await page.waitForTimeout(1200);

    const results = await new AxeBuilder({ page })
      // WCAG 2.1 AA is the typical compliance bar for ministry/non-profit sites.
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    // Surface violations even when the test passes — helpful in CI logs.
    if (results.violations.length > 0) {
      console.log(`\na11y violations on ${name}:`);
      for (const v of results.violations) {
        console.log(`  [${v.impact}] ${v.id}: ${v.help}`);
        for (const node of v.nodes.slice(0, 3)) {
          console.log(`    → ${node.html.slice(0, 140)} || ${(node.failureSummary || '').split('\n')[1] || ''}`);
        }
      }
    }

    // Strict: critical + serious WCAG 2.1 AA violations must be zero.
    // Phase 34b cleaned the baseline; new commits should not regress.
    // (Minor/moderate violations still log but don't fail the build —
    // those are typically axe heuristics that need human review.)
    const critical = results.violations.filter((v) =>
      v.impact === 'critical' || v.impact === 'serious',
    );
    expect(critical).toEqual([]);
  });
}
