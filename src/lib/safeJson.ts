/**
 * safeJsonParse — JSON.parse that NEVER throws.
 *
 * Returns the fallback when the input is null/undefined/invalid JSON.
 * Used wherever we read from localStorage where a corrupted payload
 * (multi-tab race, manual devtools edit, extension rewrite) would
 * otherwise crash the page.
 *
 * Always pair this with a sensible fallback that matches the expected
 * shape — a corrupted user record yields an empty record, not a stale
 * one from a previous session.
 */
export function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (raw == null) return fallback;
  try {
    const parsed = JSON.parse(raw);
    if (parsed === null || parsed === undefined) return fallback;
    return parsed as T;
  } catch (e) {
    console.warn('[OCC safeJsonParse] corrupted JSON, falling back to default:', e);
    return fallback;
  }
}
