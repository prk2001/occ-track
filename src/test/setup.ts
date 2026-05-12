// Vitest setup — runs before every test file.
//
// We import jest-dom matchers (toBeInTheDocument, toHaveTextContent, etc.)
// so test files can use them without per-file imports. We also wipe
// localStorage between tests because most of our modules use it as their
// backing store — leftover state from one test would silently affect the
// next. The wipe runs in `beforeEach` defined per-test-file if needed,
// but the global hook below catches the common case.
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';

afterEach(() => {
  // Clear localStorage to prevent test-cross-pollination. Our modules
  // (auditLog, outbox, security, appMode) all read/write localStorage.
  try {
    window.localStorage.clear();
    window.sessionStorage.clear();
  } catch {
    // Ignore — jsdom should always allow this.
  }
});
