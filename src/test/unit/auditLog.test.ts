import { beforeEach, describe, expect, it } from 'vitest';
import {
  AUDIT_LOG_CAP,
  AUDIT_LOG_KEY,
  getActionLabel,
  getAuditEvents,
  logAuditEvent,
  purgeAllEvents,
  purgeEventsOlderThanDays,
} from '@/lib/auditLog';

const actor = { id: 'u0', name: 'Franklin Graham', role: 'super_admin' as const };

describe('auditLog', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  describe('logAuditEvent', () => {
    it('writes an event with actor + action + timestamp', () => {
      logAuditEvent(actor, 'view_signups', 'signups:5', 'Opened roster');
      const events = getAuditEvents();
      expect(events).toHaveLength(1);
      const e = events[0];
      expect(e.actorId).toBe('u0');
      expect(e.actorName).toBe('Franklin Graham');
      expect(e.actorRole).toBe('super_admin');
      expect(e.action).toBe('view_signups');
      expect(e.target).toBe('signups:5');
      expect(e.details).toBe('Opened roster');
      expect(e.id).toBeTruthy();
      expect(e.timestamp).toBeTruthy();
    });

    it('stores newest-first', () => {
      logAuditEvent(actor, 'view_signups');
      logAuditEvent(actor, 'export_csv');
      logAuditEvent(actor, 'print_roster');
      const events = getAuditEvents();
      expect(events.map((e) => e.action)).toEqual(['print_roster', 'export_csv', 'view_signups']);
    });

    it('FIFO-evicts oldest event past the cap', () => {
      for (let i = 0; i < AUDIT_LOG_CAP + 5; i++) {
        logAuditEvent(actor, 'view_signups', `target:${i}`);
      }
      const events = getAuditEvents();
      expect(events).toHaveLength(AUDIT_LOG_CAP);
      // The newest entries should remain (target:504, 503, ...)
      expect(events[0].target).toBe(`target:${AUDIT_LOG_CAP + 4}`);
      // The oldest target:0..4 should have been evicted
      expect(events.find((e) => e.target === 'target:0')).toBeUndefined();
    });

    it('survives a corrupted localStorage entry', () => {
      window.localStorage.setItem(AUDIT_LOG_KEY, 'not-json{{{');
      // First write after corruption should reset to [event]
      logAuditEvent(actor, 'view_signups');
      // Either it recovers or it silently fails — both are acceptable as
      // long as it doesn\'t throw.
      expect(() => getAuditEvents()).not.toThrow();
    });
  });

  describe('purgeEventsOlderThanDays', () => {
    it('keeps newer events, removes older ones, AND records the purge itself', () => {
      // Two old events (>30 days ago) + two recent ones
      const oldTs1 = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
      const oldTs2 = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString();
      const recentTs = new Date().toISOString();
      window.localStorage.setItem(
        AUDIT_LOG_KEY,
        JSON.stringify([
          { id: 'a', actorId: 'u0', actorName: 'X', actorRole: 'super_admin', action: 'view_signups', timestamp: oldTs1 },
          { id: 'b', actorId: 'u0', actorName: 'X', actorRole: 'super_admin', action: 'view_signups', timestamp: oldTs2 },
          { id: 'c', actorId: 'u0', actorName: 'X', actorRole: 'super_admin', action: 'view_signups', timestamp: recentTs },
        ]),
      );
      const removed = purgeEventsOlderThanDays(30, actor);
      expect(removed).toBe(2);
      const remaining = getAuditEvents();
      // Recent event + the purge-itself record = 2 events
      expect(remaining).toHaveLength(2);
      // The purge record should be top of the log
      expect(remaining[0].details).toContain('Purged 2 audit events');
    });

    it('returns 0 + does not write a purge record when nothing matches', () => {
      logAuditEvent(actor, 'view_signups');
      const removed = purgeEventsOlderThanDays(30, actor);
      expect(removed).toBe(0);
      // Only the original event should remain (no spurious purge entry)
      expect(getAuditEvents()).toHaveLength(1);
    });
  });

  describe('purgeAllEvents', () => {
    it('wipes the log and immediately records the wipe', () => {
      logAuditEvent(actor, 'view_signups');
      logAuditEvent(actor, 'export_csv');
      const removed = purgeAllEvents(actor);
      expect(removed).toBe(2);
      const events = getAuditEvents();
      // Should be just the wipe record
      expect(events).toHaveLength(1);
      expect(events[0].details).toContain('Purged ALL 2 audit events');
    });
  });

  describe('getActionLabel', () => {
    it('returns a label + tone for every known action', () => {
      const all = [
        'view_signups', 'export_csv', 'print_roster', 'email_all',
        'clear_all_signups', 'edit_day_time', 'reset_day_times',
        'block_day', 'reopen_day', 'remove_signup', 'volunteer_self_edit',
        'volunteer_signup_created', 'mark_arrived', 'unmark_arrived',
      ] as const;
      for (const action of all) {
        const { label, tone } = getActionLabel(action);
        expect(label).toBeTruthy();
        expect(['view', 'edit', 'destructive', 'create']).toContain(tone);
      }
    });
  });
});
