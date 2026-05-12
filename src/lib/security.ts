// Security + anti-scraping utilities for the OCC Track prototype.
//
// IMPORTANT CONTEXT — frontend-only security is layered theater, not a wall.
// Anyone with devtools can edit localStorage, flip role flags, and bypass
// the role gates we shipped in Phase 14+. These defenses still work against
// the 95% case (drive-by bots, opportunistic scrapers, casual shoulder
// surfers). The 5% (targeted attacker) needs real server-side controls:
//   - Rate limiting at the edge (Cloudflare WAF, Vercel rate-limit middleware)
//   - CAPTCHA on public forms (Turnstile / hCaptcha / reCAPTCHA)
//   - Content Security Policy headers (CSP / nonce)
//   - HSTS, X-Frame-Options, X-Content-Type-Options
//   - Server-side validation of all magic-link token lookups with rate caps
// These are documented in /security as a production-hardening checklist.

export const SECURITY_LOG_KEY = 'occ:security-log';
export const SECURITY_LOG_CAP = 200;
export const SIGNUP_THROTTLE_KEY = 'occ:signup-throttle';
export const TOKEN_ATTEMPTS_KEY = 'occ:token-attempts';

// Minimum elapsed time between form mount and submit. Real humans take longer
// than 3 seconds to fill out a multi-field form. Bots that auto-fill the DOM
// submit nearly instantly.
export const MIN_FILL_SECONDS = 3;

// Minimum interval between signup submissions from this browser. Real
// volunteers don't submit twice in 10 seconds; bots do. This is browser-local
// (per localStorage), so distributed bots defeat it — but they have to be
// distributed, not just curl-in-a-loop.
export const SIGNUP_THROTTLE_SECONDS = 10;

// Magic-link brute-force settings. Most legitimate users try once or twice
// (typo in URL); bots probe thousands. Anything above 5 in 5 minutes is
// suspicious enough to slow them down with a wall.
export const TOKEN_BRUTEFORCE_WINDOW_MS = 5 * 60 * 1000;
export const TOKEN_BRUTEFORCE_THRESHOLD = 5;
export const TOKEN_BRUTEFORCE_LOCKOUT_MS = 15 * 60 * 1000;

// ── Security signal log ───────────────────────────────────────────────────
// Distinct from the audit log: audit records "who did what to volunteer
// data" (compliance). Security signals record "what defenses tripped"
// (operational). Both write to localStorage, both have FIFO caps.

export type SecuritySignalKind =
  | 'honeypot_filled'
  | 'submit_too_fast'
  | 'signup_throttled'
  | 'invalid_token'
  | 'token_bruteforce_lockout'
  | 'pii_reveal'
  | 'pii_blur_restored';

export interface SecuritySignal {
  id: string;
  kind: SecuritySignalKind;
  timestamp: string;     // ISO
  details?: string;      // free-form, e.g. "honeypot field 'website' = 'spam.com'"
  // Best-effort browser fingerprint surrogate. Not a real fingerprint —
  // just a stable random id per browser stored in localStorage. Lets us
  // tell "1 bad bot looping" from "1000 unique scraper origins."
  origin?: string;
}

export function logSecuritySignal(
  kind: SecuritySignalKind,
  details?: string,
): SecuritySignal | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(SECURITY_LOG_KEY);
    const existing: SecuritySignal[] = raw ? JSON.parse(raw) : [];
    const signal: SecuritySignal = {
      id:
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      kind,
      timestamp: new Date().toISOString(),
      details,
      origin: getBrowserOrigin(),
    };
    const next = [signal, ...existing].slice(0, SECURITY_LOG_CAP);
    window.localStorage.setItem(SECURITY_LOG_KEY, JSON.stringify(next));
    return signal;
  } catch {
    return null;
  }
}

export function getSecuritySignals(): SecuritySignal[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(SECURITY_LOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// Stable per-browser id stored in localStorage. NOT a real fingerprint —
// it survives only as long as the user doesn't clear site data. Used to
// roughly tell "1 bot looping" from "many distributed bots" in the
// security signal log.
const BROWSER_ORIGIN_KEY = 'occ:browser-origin';
export function getBrowserOrigin(): string {
  if (typeof window === 'undefined') return 'ssr';
  try {
    let id = window.localStorage.getItem(BROWSER_ORIGIN_KEY);
    if (!id) {
      id =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID().slice(0, 8)
          : `b_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
      window.localStorage.setItem(BROWSER_ORIGIN_KEY, id);
    }
    return id;
  } catch {
    return 'unknown';
  }
}

// ── Signup throttle ───────────────────────────────────────────────────────
// Reject submissions if the last one from this browser was <10 seconds ago.
// Returns null if OK to submit, or the seconds-remaining if throttled.
export function checkSignupThrottle(): number | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(SIGNUP_THROTTLE_KEY);
    if (!raw) return null;
    const last = parseInt(raw, 10);
    if (Number.isNaN(last)) return null;
    const elapsed = (Date.now() - last) / 1000;
    if (elapsed >= SIGNUP_THROTTLE_SECONDS) return null;
    return Math.ceil(SIGNUP_THROTTLE_SECONDS - elapsed);
  } catch {
    return null;
  }
}

export function stampSignupThrottle(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SIGNUP_THROTTLE_KEY, String(Date.now()));
  } catch (e) {
    console.error('[OCC security]', e);
    // Throttle writes are best-effort.
  }
}

// ── Magic link brute-force throttle ───────────────────────────────────────
// Track failed token lookups per browser. After N failures in a window,
// lock out further attempts for a cooldown period.
interface TokenAttempts {
  failures: string[];     // ISO timestamps
  lockedUntil?: string;   // ISO; populated when threshold tripped
}

function readTokenAttempts(): TokenAttempts {
  if (typeof window === 'undefined') return { failures: [] };
  try {
    const raw = window.localStorage.getItem(TOKEN_ATTEMPTS_KEY);
    return raw ? JSON.parse(raw) : { failures: [] };
  } catch {
    return { failures: [] };
  }
}

function writeTokenAttempts(a: TokenAttempts): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(TOKEN_ATTEMPTS_KEY, JSON.stringify(a));
  } catch (e) {
    console.error('[OCC security]', e);
    // best-effort
  }
}

export function isTokenLocked(): { locked: boolean; secondsRemaining: number } {
  const a = readTokenAttempts();
  if (!a.lockedUntil) return { locked: false, secondsRemaining: 0 };
  const remainingMs = new Date(a.lockedUntil).getTime() - Date.now();
  if (remainingMs <= 0) return { locked: false, secondsRemaining: 0 };
  return { locked: true, secondsRemaining: Math.ceil(remainingMs / 1000) };
}

// Record a failed token lookup. If threshold trips, lock the browser out.
// Returns true if the new failure tripped the lockout (so the caller can
// log the security signal).
export function recordTokenFailure(): boolean {
  const a = readTokenAttempts();
  // Drop expired failures outside the rolling window.
  const cutoff = Date.now() - TOKEN_BRUTEFORCE_WINDOW_MS;
  const recent = a.failures.filter((ts) => new Date(ts).getTime() >= cutoff);
  recent.push(new Date().toISOString());

  if (recent.length >= TOKEN_BRUTEFORCE_THRESHOLD) {
    const lockedUntil = new Date(Date.now() + TOKEN_BRUTEFORCE_LOCKOUT_MS).toISOString();
    writeTokenAttempts({ failures: [], lockedUntil });
    return true;
  }
  writeTokenAttempts({ failures: recent, lockedUntil: a.lockedUntil });
  return false;
}

export function resetTokenFailures(): void {
  writeTokenAttempts({ failures: [] });
}

// ── Honeypot field helpers ────────────────────────────────────────────────
// The honeypot is an off-screen DOM input that real users never see (and
// therefore never fill). Bots auto-fill every field. Server (or in our
// case, client) rejects submissions where the honeypot has content.

export const HONEYPOT_FIELD_NAME = 'website_url';

// Class to apply to the honeypot input to keep it visually hidden without
// using `display: none` (some bots skip those). Off-screen positioning +
// aria-hidden + tabindex=-1 prevents keyboard/AT users from hitting it.
export const HONEYPOT_HIDDEN_STYLE: React.CSSProperties = {
  position: 'absolute',
  left: '-9999px',
  top: 'auto',
  width: '1px',
  height: '1px',
  overflow: 'hidden',
  opacity: 0,
};
