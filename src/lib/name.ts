/**
 * Name utilities.
 *
 * Real volunteer rosters contain edge cases that naive `name.split(' ')[0]`
 * butchers:
 *   - Honorifics:  "Dr. María Rodriguez"   → "Dr." (wrong) vs "María" (right)
 *   - Compound:    "María José García"     → "María" (loses given middle)
 *   - Hispanic:    "José Antonio Pérez"    → "José" (loses given middle name)
 *   - Single name: "Madonna"               → "Madonna" (no split — fine)
 *   - Empty/null:  ""                      → "" (safe fallback)
 *
 * `getFirstName` strips an honorific if present and returns the first
 * given name. For 3+ part names where the second token looks like a
 * given name (not a surname), it returns the first two tokens — handles
 * the common Hispanic/Latino convention of using both given names.
 *
 * This matches the heuristic Real OCC uses in printed badges and emails.
 */

const HONORIFICS = /^(dr\.?|mr\.?|mrs\.?|ms\.?|miss|prof\.?|rev\.?|sr\.?|sra\.?|srta\.?)\s+/i;

// Names that follow a first name as part of a compound given name.
// (Heuristic — real i18n name parsing is hard; this catches the common
// Hispanic two-given-name pattern without flagging actual surnames.)
const COMPOUND_GIVEN_NAMES = new Set([
  // Spanish/Portuguese compound first-name patterns
  'maría', 'maria', 'josé', 'jose', 'juan', 'ana', 'luz', 'antonio',
  'antonia', 'carlos', 'isabel', 'francisco', 'francisca',
  // English/biblical compound patterns
  'mary', 'jean', 'anne', 'ann',
]);

export function getFirstName(fullName: string | null | undefined): string {
  if (!fullName) return '';
  const cleaned = fullName.trim().replace(HONORIFICS, '');
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fullName.trim();
  if (parts.length === 1) return parts[0];
  // Two given names: "María José García" → "María José"
  // We only join the first two if the SECOND is a known compound-given-name token.
  if (parts.length >= 3 && COMPOUND_GIVEN_NAMES.has(parts[1].toLowerCase())) {
    return `${parts[0]} ${parts[1]}`;
  }
  return parts[0];
}

/** Initials for avatar fallbacks. "María José García" → "MG". */
export function getInitials(fullName: string | null | undefined): string {
  if (!fullName) return '?';
  const cleaned = fullName.trim().replace(HONORIFICS, '');
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}
