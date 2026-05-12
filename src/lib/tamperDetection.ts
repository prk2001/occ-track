// localStorage tamper detection — HMAC-style checksums on critical keys.
//
// HONEST DISCLAIMER: This is layered theater. The signing secret lives in
// the bundle, so anyone reading client code can forge a valid checksum.
// What this DOES catch:
//   - Browser extensions auto-rewriting localStorage
//   - Multi-tab race conditions producing inconsistent state
//   - Stale tabs holding pre-migration data after a key rename
//   - Casual "edit JSON in devtools" tampering by non-experts
// What this DOES NOT catch:
//   - Sophisticated attacker who reads the client + recomputes the checksum
//   - Server-side data integrity (we have no server)
//
// Production needs canonical state on a backend with signed payloads and
// server-side verification. This module is one layer of many.

import { logSecuritySignal } from './security';

// The signing "secret." Embedded in the bundle (necessarily). Rotate by
// bumping the version, which invalidates all existing checksums — useful
// for forcing a state migration after a breaking change.
const TAMPER_KEY_V1 = 'occ-track-tamper-v1-do-not-reuse-this-secret-anywhere-else';
const CHECKSUM_PREFIX = 'occ:checksum:';

// FNV-1a 32-bit hash, salted with the secret. Faster than SHA-256, good
// enough for tamper detection (not a security hash, a fingerprint).
function fnv1a(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function checksumFor(key: string, value: string): string {
  return fnv1a(`${TAMPER_KEY_V1}|${key}|${value}`);
}

// Keys we want to verify integrity for. Everything else (UI prefs, etc.)
// is fine to be edited or stale. PII-bearing or audit-trail data only.
export const PROTECTED_KEYS = [
  'occ:signups',
  'occ:audit-log',
  'occ:outbox',
  'occ:day-blocks',
  'occ:day-times',
  'occ:security-log',
];

// Write a value to localStorage + its checksum atomically (as atomic
// as localStorage gets — there's no real txn but two setItem calls is
// the best we have). Replaces direct setItem for protected keys.
export function setProtected(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    const cs = checksumFor(key, value);
    window.localStorage.setItem(key, value);
    window.localStorage.setItem(CHECKSUM_PREFIX + key, cs);
  } catch {
    // localStorage full or disabled — swallow.
  }
}

// Read a value AND verify its checksum. If the checksum is missing or
// mismatched, returns null and logs a security signal. Caller decides
// how to recover (the default is "reset to empty/initial").
export function readProtected(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = window.localStorage.getItem(key);
    if (value === null) return null;
    const expected = window.localStorage.getItem(CHECKSUM_PREFIX + key);
    if (expected === null) {
      // No checksum yet — first write. Stamp it now.
      window.localStorage.setItem(CHECKSUM_PREFIX + key, checksumFor(key, value));
      return value;
    }
    const actual = checksumFor(key, value);
    if (actual !== expected) {
      logSecuritySignal('invalid_token', `Tamper detected on ${key}: expected ${expected}, got ${actual}`);
      return null;
    }
    return value;
  } catch {
    return null;
  }
}

// Run a full audit of all protected keys. Returns the list of keys that
// failed verification. Useful for the Security Center page or scheduled
// background checks.
export function auditAllProtectedKeys(): string[] {
  if (typeof window === 'undefined') return [];
  const failures: string[] = [];
  for (const key of PROTECTED_KEYS) {
    const value = window.localStorage.getItem(key);
    if (value === null) continue;
    const expected = window.localStorage.getItem(CHECKSUM_PREFIX + key);
    if (expected === null) continue;
    if (checksumFor(key, value) !== expected) failures.push(key);
  }
  if (failures.length > 0) {
    logSecuritySignal('invalid_token', `Tamper audit found ${failures.length} corrupted key(s): ${failures.join(', ')}`);
  }
  return failures;
}

// Background watcher — runs auditAllProtectedKeys every 30s. Returns
// a cleanup function the caller (App root) should call on unmount.
export function startTamperWatcher(): () => void {
  if (typeof window === 'undefined') return () => {};
  const id = setInterval(() => auditAllProtectedKeys(), 30_000);
  // Also audit immediately on first call.
  auditAllProtectedKeys();
  return () => clearInterval(id);
}
