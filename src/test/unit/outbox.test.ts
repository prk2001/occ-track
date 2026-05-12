import { beforeEach, describe, expect, it } from 'vitest';
import {
  OUTBOX_CAP,
  OUTBOX_KEY,
  buildArrivalConfirmation,
  buildCdoSignupAlert,
  buildReminder,
  buildSelfEditAlert,
  buildSignupConfirmation,
  getOutbox,
  inboxForRecipient,
  markAllReadForRecipient,
  markRead,
  planReminders,
  sendMessage,
} from '@/lib/outbox';

describe('outbox', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  describe('sendMessage', () => {
    it('persists a message with status sent', () => {
      const sent = sendMessage({
        kind: 'signup_confirmation',
        channel: 'email',
        to: 'jane@example.com',
        body: 'Welcome!',
      });
      expect(sent.status).toBe('sent');
      expect(sent.id).toBeTruthy();
      expect(sent.sentAt).toBeTruthy();
      const all = getOutbox();
      expect(all).toHaveLength(1);
      expect(all[0].to).toBe('jane@example.com');
    });

    it('simulateFailure marks status failed + populates error', () => {
      const sent = sendMessage({
        kind: 'signup_confirmation',
        channel: 'email',
        to: 'jane@example.com',
        body: 'oops',
        simulateFailure: true,
      });
      expect(sent.status).toBe('failed');
      expect(sent.error).toBeTruthy();
    });

    it('FIFO-evicts oldest message past OUTBOX_CAP', () => {
      for (let i = 0; i < OUTBOX_CAP + 3; i++) {
        sendMessage({ kind: 'signup_confirmation', channel: 'email', to: `u${i}@example.com`, body: String(i) });
      }
      const all = getOutbox();
      expect(all).toHaveLength(OUTBOX_CAP);
      // Latest message comes first
      expect(all[0].to).toBe(`u${OUTBOX_CAP + 2}@example.com`);
      // u0/u1/u2 should be evicted
      expect(all.find((m) => m.to === 'u0@example.com')).toBeUndefined();
    });
  });

  describe('compose helpers', () => {
    it('buildSignupConfirmation email includes magic link + greeting', () => {
      const msg = buildSignupConfirmation({
        name: 'Maria Rodriguez',
        email: 'maria@example.org',
        magicLinkUrl: 'https://example.com/my-signup?token=abc',
        channel: 'email',
      });
      expect(msg.channel).toBe('email');
      expect(msg.subject).toContain('Operation Christmas Child');
      expect(msg.body).toContain('Maria'); // first name only
      expect(msg.body).toContain('https://example.com/my-signup?token=abc');
    });

    it('buildArrivalConfirmation produces an SMS to the phone', () => {
      const msg = buildArrivalConfirmation({
        name: 'James Henderson',
        phone: '(404) 555-0212',
        locationName: 'First Baptist Church',
      });
      expect(msg.channel).toBe('sms');
      expect(msg.to).toBe('(404) 555-0212');
      expect(msg.body).toContain('James');
      expect(msg.body).toContain('First Baptist Church');
    });

    it('buildCdoSignupAlert routes in-app to recipient userId', () => {
      const msg = buildCdoSignupAlert({
        cdoUserId: 'u3',
        cdoUserName: 'Maria',
        volunteerName: 'Sarah',
        signupId: 's_xyz',
      });
      expect(msg.channel).toBe('in_app');
      expect(msg.to).toBe('u3');
      expect(msg.link).toBe('/signups');
      expect(msg.relatedTarget).toBe('signup:s_xyz');
    });

    it('buildSelfEditAlert summarizes changed fields', () => {
      const msg = buildSelfEditAlert({
        recipientUserId: 'u2',
        recipientName: 'David Chen',
        volunteerName: 'Sarah',
        signupId: 's_xyz',
        changedFields: ['phone', 'shirt'],
      });
      expect(msg.body).toContain('phone');
      expect(msg.body).toContain('shirt');
    });

    it('buildReminder produces email AND sms variants for the same kind', () => {
      const args = {
        name: 'Anna Martinez',
        email: 'anna@example.org',
        phone: '(770) 555-0367',
        collectionWeekStart: '2026-11-16',
        kind: 't1' as const,
      };
      const email = buildReminder({ ...args, channel: 'email' });
      const sms = buildReminder({ ...args, channel: 'sms' });
      expect(email.channel).toBe('email');
      expect(sms.channel).toBe('sms');
      expect(sms.body.length).toBeLessThan(email.body.length); // SMS is shorter
    });
  });

  describe('planReminders', () => {
    it('returns empty when nothing is overdue (event far in the future)', () => {
      const plans = planReminders({
        signups: [
          { id: 's1', name: 'Jane', email: 'j@x.com', phone: '555' },
        ],
        collectionWeekStart: '2099-11-16',
        now: new Date('2026-01-01T00:00:00Z'),
      });
      expect(plans).toEqual([]);
    });

    it('queues T-7, T-1, and day-of when anchored to morning of event', () => {
      const plans = planReminders({
        signups: [
          { id: 's1', name: 'Jane', email: 'j@x.com', phone: '555' },
        ],
        collectionWeekStart: '2026-11-16',
        now: new Date('2026-11-16T08:00:00Z'),
      });
      const kinds = plans.map((p) => p.kind);
      expect(kinds).toContain('t7');
      expect(kinds).toContain('t1');
      expect(kinds).toContain('dayOf');
    });

    it('skips kinds already marked in reminderState (idempotency)', () => {
      const plans = planReminders({
        signups: [
          { id: 's1', name: 'Jane', email: 'j@x.com', phone: '555', reminderState: { t7Sent: '2026-11-09', t1Sent: '2026-11-15' } },
        ],
        collectionWeekStart: '2026-11-16',
        now: new Date('2026-11-16T08:00:00Z'),
      });
      const kinds = plans.map((p) => p.kind);
      expect(kinds).not.toContain('t7');
      expect(kinds).not.toContain('t1');
      expect(kinds).toContain('dayOf');
    });
  });

  describe('in-app read receipts', () => {
    it('markRead flags the one message as read', () => {
      const msg = sendMessage({
        kind: 'signup_confirmation',
        channel: 'in_app',
        to: 'u3',
        body: 'Hi',
      });
      const after = markRead(msg.id);
      const updated = after.find((m) => m.id === msg.id);
      expect(updated?.readAt).toBeTruthy();
    });

    it('markAllReadForRecipient marks every in-app message for that user', () => {
      sendMessage({ kind: 'signup_confirmation', channel: 'in_app', to: 'u3', body: 'a' });
      sendMessage({ kind: 'signup_confirmation', channel: 'in_app', to: 'u3', body: 'b' });
      sendMessage({ kind: 'signup_confirmation', channel: 'in_app', to: 'u2', body: 'c' });
      const after = markAllReadForRecipient('u3');
      const u3 = after.filter((m) => m.to === 'u3');
      const u2 = after.filter((m) => m.to === 'u2');
      expect(u3.every((m) => !!m.readAt)).toBe(true);
      expect(u2.every((m) => !m.readAt)).toBe(true);
    });

    it('inboxForRecipient filters to in_app + matching recipient', () => {
      sendMessage({ kind: 'signup_confirmation', channel: 'in_app', to: 'u3', body: 'a' });
      sendMessage({ kind: 'signup_confirmation', channel: 'email', to: 'u3@example.com', body: 'b' });
      sendMessage({ kind: 'signup_confirmation', channel: 'in_app', to: 'u2', body: 'c' });
      const all = getOutbox();
      const inbox = inboxForRecipient(all, 'u3');
      expect(inbox).toHaveLength(1);
      expect(inbox[0].channel).toBe('in_app');
      expect(inbox[0].to).toBe('u3');
    });
  });

  it('OUTBOX_KEY is what consumers expect', () => {
    expect(OUTBOX_KEY).toBe('occ:outbox');
  });
});
