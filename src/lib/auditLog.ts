// Audit log — privacy-sensitive action ledger for the OCC Track prototype.
//
// In a real ministry-org production deploy, every read or write of volunteer
// PII (names, emails, phones, emergency contacts) needs to be auditable so
// Samaritan's Purse can answer "who saw this data, when, and what did they
// do with it?" without speculation.
//
// This prototype writes events to localStorage under `occ:audit-log` so the
// /signups admin page can log its own actions and the /audit-log page (Super
// Admin only) can render them as a chronological trail.
//
// FIFO cap at 500 entries — same data shape a backend would use, just bounded
// for the demo. Real backend would be append-only DB rows with no eviction.
import type { UserRole } from '@/data/mockData';

export const AUDIT_LOG_KEY = 'occ:audit-log';
export const AUDIT_LOG_CAP = 500;

// Literal union: TypeScript catches typos at the call site. Add new actions
// here and the viewer page picks them up automatically via getActionLabel().
export type AuditAction =
  | 'view_signups'
  | 'export_csv'
  | 'print_roster'
  | 'email_all'
  | 'clear_all_signups'
  | 'edit_day_time'
  | 'reset_day_times'
  | 'block_day'
  | 'reopen_day'
  | 'remove_signup'
  | 'volunteer_self_edit'
  | 'volunteer_signup_created'
  | 'mark_arrived'
  | 'unmark_arrived';

export interface AuditEvent {
  id: string;
  actorId: string;       // user.id or 'volunteer-self' for magic-link edits
  actorName: string;     // human-readable; what the viewer page shows
  actorRole: UserRole | 'volunteer_self';
  action: AuditAction;
  target?: string;       // e.g. "signup:s_xyz" or "day:2026-11-21"
  details?: string;      // free-form, e.g. "Changed time from 9 AM to 10 AM"
  timestamp: string;     // ISO; renders sortable by string compare
}

interface ActorContext {
  id: string;
  name: string;
  role: UserRole | 'volunteer_self';
}

// Why localStorage.setItem + getItem directly instead of useLocalStorage?
// This module is called from event handlers (button onClick, form submit),
// not from a render path. The /audit-log viewer page uses the existing
// useLocalStorage hook so it re-renders when this writes.
export function logAuditEvent(
  actor: ActorContext,
  action: AuditAction,
  target?: string,
  details?: string,
): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem(AUDIT_LOG_KEY);
    const existing: AuditEvent[] = raw ? JSON.parse(raw) : [];
    const event: AuditEvent = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `e_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action,
      target,
      details,
      timestamp: new Date().toISOString(),
    };
    // Newest first; FIFO-evict the oldest if we'd exceed the cap.
    const next = [event, ...existing].slice(0, AUDIT_LOG_CAP);
    window.localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(next));
  } catch {
    // Audit writes must never break the user flow — silent failure is OK.
  }
}

export function getAuditEvents(): AuditEvent[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(AUDIT_LOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// Human-readable label + tone color for the viewer table.
export function getActionLabel(action: AuditAction): { label: string; tone: 'view' | 'edit' | 'destructive' | 'create' } {
  switch (action) {
    case 'view_signups':            return { label: 'Viewed signup roster', tone: 'view' };
    case 'export_csv':              return { label: 'Exported CSV', tone: 'view' };
    case 'print_roster':            return { label: 'Printed roster', tone: 'view' };
    case 'email_all':               return { label: 'Emailed all volunteers', tone: 'edit' };
    case 'clear_all_signups':       return { label: 'Cleared all signups', tone: 'destructive' };
    case 'edit_day_time':           return { label: 'Edited shift hours', tone: 'edit' };
    case 'reset_day_times':         return { label: 'Reset shift hours', tone: 'edit' };
    case 'block_day':               return { label: 'Blocked a day', tone: 'edit' };
    case 'reopen_day':              return { label: 'Reopened a day', tone: 'edit' };
    case 'remove_signup':           return { label: 'Removed signup', tone: 'destructive' };
    case 'volunteer_self_edit':     return { label: 'Volunteer edited own info', tone: 'edit' };
    case 'volunteer_signup_created':return { label: 'New volunteer signed up', tone: 'create' };
    case 'mark_arrived':            return { label: 'Marked volunteer arrived', tone: 'create' };
    case 'unmark_arrived':          return { label: 'Unmarked arrival', tone: 'edit' };
  }
}
