// Constant-time string compare. For a 4-digit PIN, early-exit timing
// attacks are basically impossible to exploit in a browser anyway —
// network jitter dwarfs microsecond timing differences. But this is the
// pattern security-conscious code uses, and the user asked for max layers.
export function constantTimeEqual(a: string, b: string): boolean {
  // Length difference itself is a timing leak — pad to the longer string.
  const max = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < max; i++) {
    const ac = i < a.length ? a.charCodeAt(i) : 0;
    const bc = i < b.length ? b.charCodeAt(i) : 0;
    diff |= ac ^ bc;
  }
  return diff === 0;
}

// Hash a PIN with the Web Crypto API. SHA-256 with a fixed salt. In
// production this would use Argon2/bcrypt with a per-installation salt
// stored server-side. For a kiosk session PIN, SHA-256 is sufficient
// because the PIN only lives in sessionStorage and is gone on tab close.
const KIOSK_PIN_SALT = 'occ-track-kiosk-v1';

export async function hashPin(pin: string): Promise<string> {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    // Fallback for environments without WebCrypto (very old browsers).
    // Not cryptographically strong but better than plaintext.
    let h = 0;
    const s = pin + KIOSK_PIN_SALT;
    for (let i = 0; i < s.length; i++) h = ((h << 5) - h) + s.charCodeAt(i);
    return Math.abs(h).toString(16);
  }
  const data = new TextEncoder().encode(pin + KIOSK_PIN_SALT);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Kiosk PIN lives in sessionStorage so closing the tab clears it.
// Real production would also expire the kiosk session after N hours.
export const KIOSK_PIN_KEY = 'occ:kiosk-pin-hash';
export const KIOSK_UNLOCKED_KEY = 'occ:kiosk-unlocked';

export async function setKioskPin(pin: string): Promise<void> {
  if (typeof window === 'undefined') return;
  const hash = await hashPin(pin);
  window.sessionStorage.setItem(KIOSK_PIN_KEY, hash);
  window.sessionStorage.setItem(KIOSK_UNLOCKED_KEY, '1');
}

export function isKioskPinSet(): boolean {
  if (typeof window === 'undefined') return false;
  return !!window.sessionStorage.getItem(KIOSK_PIN_KEY);
}

export function isKioskUnlocked(): boolean {
  if (typeof window === 'undefined') return false;
  return window.sessionStorage.getItem(KIOSK_UNLOCKED_KEY) === '1';
}

export function lockKiosk(): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(KIOSK_UNLOCKED_KEY);
}

export function clearKioskPin(): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(KIOSK_PIN_KEY);
  window.sessionStorage.removeItem(KIOSK_UNLOCKED_KEY);
}

export async function verifyKioskPin(attempt: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  const stored = window.sessionStorage.getItem(KIOSK_PIN_KEY);
  if (!stored) return false;
  const attemptHash = await hashPin(attempt);
  return constantTimeEqual(stored, attemptHash);
}
