/**
 * Crypto-quality ID generator.
 *
 * Multiple call sites previously used `Math.random()` as a fallback when
 * `crypto.randomUUID` was missing. `Math.random()` is NOT cryptographically
 * secure and has documented collisions under load. This helper uses the
 * proper Web Crypto API (`crypto.getRandomValues`) so even the fallback
 * path is collision-resistant.
 *
 * Prefix is encoded in the output so log greps can quickly distinguish
 * "s_..." (signup) from "tok_..." (token) from "m_..." (message), etc.
 */
export function generateId(prefix: string = ''): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    const uuid = crypto.randomUUID();
    return prefix ? `${prefix}_${uuid}` : uuid;
  }
  // Fallback: 16 random bytes via crypto.getRandomValues (still strong).
  // Math.random fallback is intentionally last-resort + only for environments
  // missing both APIs (essentially impossible in real browsers).
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    console.warn('[OCC id] crypto.getRandomValues unavailable; falling back to Math.random');
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return prefix ? `${prefix}_${hex}` : hex;
}

/** Convenience: shorter id (8 hex chars) for non-uniqueness-critical uses. */
export function generateShortId(prefix: string = ''): string {
  const full = generateId(prefix);
  // Take prefix + first 8 chars of the random part
  const sepIdx = full.indexOf('_');
  if (sepIdx === -1) return full.slice(0, 8);
  return full.slice(0, sepIdx + 1 + 8);
}
