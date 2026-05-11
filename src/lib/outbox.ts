// Notification outbox — mock email/SMS delivery for the OCC Track prototype.
//
// In a real ministry-org deploy, every "we'll send you a link" promise on
// the signup page is backed by a Telnyx SMS or a Resend/SendGrid email.
// For the prototype we mock the wire: messages get written to localStorage
// under `occ:outbox` so the /outbox viewer (Super Admin only) can show
// what *would have been sent* in production.
//
// Design contract: the call sites use `sendMessage()` exactly like they
// would in production. When you swap mock → real (e.g. wiring up Telnyx),
// only this file changes. Every consumer keeps the same interface.

export const OUTBOX_KEY = 'occ:outbox';
export const OUTBOX_CAP = 200;

export type OutboxChannel = 'email' | 'sms' | 'in_app';

export type OutboxStatus = 'sent' | 'failed';

export interface OutboxMessage {
  id: string;
  channel: OutboxChannel;
  to: string;            // email address or phone number
  toName?: string;       // human-readable, for the viewer
  subject?: string;      // email subject; ignored for SMS
  body: string;          // plain-text body — magic link inlined
  status: OutboxStatus;
  sentAt: string;        // ISO timestamp
  error?: string;        // populated when status === 'failed'
  // What kind of message this is — lets the viewer page color-code them
  // and lets the call site categorize without parsing the body.
  kind:
    | 'signup_confirmation'
    | 'arrival_confirmation'
    | 'leadership_broadcast'
    | 'reminder';
  // Related entity (e.g. "signup:s_xyz") for cross-reference with audit log.
  relatedTarget?: string;
  // In-app channel only: when the recipient opened the notifications drawer
  // and dismissed this. Used to compute unread badge counts in the navbar.
  readAt?: string;
  // In-app channel only: deep-link URL to take the user when they tap.
  link?: string;
}

// Why localStorage.setItem + getItem directly? Same reasoning as auditLog.ts —
// this gets called from event handlers, not render paths. The /outbox viewer
// reads via useLocalStorage so it re-renders on writes.
export function sendMessage(msg: Omit<OutboxMessage, 'id' | 'sentAt' | 'status'> & { simulateFailure?: boolean }): OutboxMessage {
  if (typeof window === 'undefined') {
    return { ...msg, id: 'noop', sentAt: new Date().toISOString(), status: 'sent' };
  }
  const sent: OutboxMessage = {
    ...msg,
    id:
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `m_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    sentAt: new Date().toISOString(),
    // For the prototype we never actually fail; the flag exists so a
    // future test harness can force a failure to verify error UI.
    status: msg.simulateFailure ? 'failed' : 'sent',
    error: msg.simulateFailure ? 'Mock provider rejected the send' : undefined,
  };
  try {
    const raw = window.localStorage.getItem(OUTBOX_KEY);
    const existing: OutboxMessage[] = raw ? JSON.parse(raw) : [];
    const next = [sent, ...existing].slice(0, OUTBOX_CAP);
    window.localStorage.setItem(OUTBOX_KEY, JSON.stringify(next));
  } catch {
    // Outbox writes must never break the user flow.
  }
  return sent;
}

export function getOutbox(): OutboxMessage[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(OUTBOX_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// Compose-helpers — keep the body templates here so the call sites don't
// have to know the exact wording. Real deploy would use a template engine
// (Handlebars, MJML, etc.); for the prototype, plain string interpolation
// is plenty.

export function buildSignupConfirmation(args: {
  name: string;
  email: string;
  magicLinkUrl: string;
  channel: 'email' | 'sms';
}): Omit<OutboxMessage, 'id' | 'sentAt' | 'status'> {
  if (args.channel === 'email') {
    return {
      kind: 'signup_confirmation',
      channel: 'email',
      to: args.email,
      toName: args.name,
      subject: 'You\'re on the team — Operation Christmas Child',
      body:
`Hi ${args.name.split(' ')[0]},

Thank you for signing up to serve during Operation Christmas Child Collection Week 2026 (Nov 16–23). Your team lead at the closest Central Drop-off will be in touch the week before with check-in details, parking, and what to wear.

If you need to update your information (phone, shirt size, emergency contact, or notes), use your personal edit link below — no login required:

${args.magicLinkUrl}

Keep this link private — anyone with it can edit your signup. Bookmark it for the next time something changes.

Looking forward to serving alongside you,
Samaritan's Purse · Operation Christmas Child`,
    };
  }
  return {
    kind: 'signup_confirmation',
    channel: 'sms',
    to: args.email, // for SMS this would be the phone, but we don't have it cleanly typed here
    toName: args.name,
    body: `OCC: You're on the team for Collection Week 2026. Update your info anytime: ${args.magicLinkUrl} — Samaritan's Purse`,
  };
}

// In-app notification to the CDO Leader when a volunteer signs up at
// their location. They see a live count + drawer entry in the navbar.
export function buildCdoSignupAlert(args: {
  cdoUserId: string;
  cdoUserName: string;
  volunteerName: string;
  signupId: string;
}): Omit<OutboxMessage, 'id' | 'sentAt' | 'status'> {
  return {
    kind: 'signup_confirmation',
    channel: 'in_app',
    to: args.cdoUserId,
    toName: args.cdoUserName,
    subject: 'New volunteer signup',
    body: `${args.volunteerName} just signed up to serve during Collection Week. Your roster grows.`,
    relatedTarget: `signup:${args.signupId}`,
    link: '/signups',
  };
}

// In-app notification to leadership when a self-edit happens — surfaces
// the change without admin having to refresh /signups manually.
export function buildSelfEditAlert(args: {
  recipientUserId: string;
  recipientName: string;
  volunteerName: string;
  signupId: string;
  changedFields: string[];
}): Omit<OutboxMessage, 'id' | 'sentAt' | 'status'> {
  return {
    kind: 'signup_confirmation',
    channel: 'in_app',
    to: args.recipientUserId,
    toName: args.recipientName,
    subject: 'Volunteer updated their info',
    body:
      args.changedFields.length === 0
        ? `${args.volunteerName} opened their edit link.`
        : `${args.volunteerName} updated: ${args.changedFields.join(', ')}.`,
    relatedTarget: `signup:${args.signupId}`,
    link: '/signups',
  };
}

// Mark a single in-app message as read. Returns the updated full list.
export function markRead(messageId: string): OutboxMessage[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(OUTBOX_KEY);
    const existing: OutboxMessage[] = raw ? JSON.parse(raw) : [];
    const now = new Date().toISOString();
    const next = existing.map((m) =>
      m.id === messageId && m.channel === 'in_app' && !m.readAt
        ? { ...m, readAt: now }
        : m,
    );
    window.localStorage.setItem(OUTBOX_KEY, JSON.stringify(next));
    return next;
  } catch {
    return [];
  }
}

// Mark all in-app messages addressed to a given recipient as read.
// Called when the user opens the notifications drawer.
export function markAllReadForRecipient(recipientId: string): OutboxMessage[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(OUTBOX_KEY);
    const existing: OutboxMessage[] = raw ? JSON.parse(raw) : [];
    const now = new Date().toISOString();
    const next = existing.map((m) =>
      m.channel === 'in_app' && m.to === recipientId && !m.readAt
        ? { ...m, readAt: now }
        : m,
    );
    window.localStorage.setItem(OUTBOX_KEY, JSON.stringify(next));
    return next;
  } catch {
    return [];
  }
}

// Filter messages for the in-app inbox view: only in_app channel,
// only addressed to the given recipient.
export function inboxForRecipient(messages: OutboxMessage[], recipientId: string): OutboxMessage[] {
  return messages.filter((m) => m.channel === 'in_app' && m.to === recipientId);
}

export function buildArrivalConfirmation(args: {
  name: string;
  phone: string;
  locationName: string;
}): Omit<OutboxMessage, 'id' | 'sentAt' | 'status'> {
  return {
    kind: 'arrival_confirmation',
    channel: 'sms',
    to: args.phone,
    toName: args.name,
    body: `OCC: Welcome, ${args.name.split(' ')[0]}! You're checked in at ${args.locationName}. Find a team lead in a red shirt for your assignment. — Samaritan's Purse`,
  };
}

// ── Scheduled reminders ──────────────────────────────────────────────────
// In a real deploy, these would be queued by a job runner (Bull, Temporal,
// AWS EventBridge) and fired on a schedule. Here we expose a manual
// "dispatch reminders now" function that backfills whatever's overdue —
// the prototype demonstrates *what would have been sent* without needing
// a scheduler.
export type ReminderKind = 't7' | 't1' | 'dayOf';

export function buildReminder(args: {
  name: string;
  phone: string;
  email: string;
  collectionWeekStart: string;
  kind: ReminderKind;
  channel: 'email' | 'sms';
}): Omit<OutboxMessage, 'id' | 'sentAt' | 'status'> {
  const firstName = args.name.split(' ')[0];
  const subjectByKind: Record<ReminderKind, string> = {
    t7: 'One week to Collection Week — Operation Christmas Child',
    t1: 'Tomorrow: your Collection Week shift',
    dayOf: 'Today is the day — Operation Christmas Child',
  };
  const emailBodyByKind: Record<ReminderKind, string> = {
    t7:
`Hi ${firstName},

One week from today, Collection Week 2026 begins! You signed up to serve, and we're so glad you'll be there.

A few quick reminders:
- Wear comfortable shoes — you'll be on your feet
- Park in the back lot (signs will direct you)
- Your team lead in a red shirt will assign you a role on arrival
- Bring water; coffee + snacks are provided

If anything has changed (you can't make it, want to change days, etc.), update your signup at your edit link.

See you soon,
Samaritan's Purse · Operation Christmas Child`,
    t1:
`Hi ${firstName},

Tomorrow's the day! Collection Week 2026 starts and your team is ready.

- Arrive 15 minutes before your shift starts
- Welcome table is right inside the main entrance
- Find a team lead in a red shirt — they'll get you started

Excited to serve alongside you,
Samaritan's Purse · Operation Christmas Child`,
    dayOf:
`Hi ${firstName},

Today's the day. Look for the welcome table inside the main entrance — your team lead in a red shirt will get you situated.

If you're running late or need anything, just text the CDO Leader.

Thank you for showing up.
Samaritan's Purse · Operation Christmas Child`,
  };
  const smsBodyByKind: Record<ReminderKind, string> = {
    t7: `OCC: One week until Collection Week, ${firstName}! Comfortable shoes, back lot parking, red-shirt team lead on arrival. See you soon. — Samaritan's Purse`,
    t1: `OCC: Tomorrow's the day, ${firstName}! Arrive 15min early. Welcome table at the main entrance. — Samaritan's Purse`,
    dayOf: `OCC: Today's the day, ${firstName}! Welcome table at main entrance. Red-shirt team lead will get you started. — Samaritan's Purse`,
  };
  if (args.channel === 'email') {
    return {
      kind: 'reminder',
      channel: 'email',
      to: args.email,
      toName: args.name,
      subject: subjectByKind[args.kind],
      body: emailBodyByKind[args.kind],
    };
  }
  return {
    kind: 'reminder',
    channel: 'sms',
    to: args.phone,
    toName: args.name,
    body: smsBodyByKind[args.kind],
  };
}

// Given a list of signups + today's date + Collection Week start, figure
// out which reminders are overdue (i.e., the cutoff window has passed and
// we haven't sent the reminder yet). Returns the set of dispatches to
// perform — caller is responsible for actually sending and updating
// reminderState on each signup.
export interface ReminderPlan {
  signupId: string;
  kind: ReminderKind;
  // Build args ready to pass to buildReminder + sendMessage.
  buildArgs: Parameters<typeof buildReminder>[0];
}

export function planReminders(args: {
  signups: Array<{
    id: string;
    name: string;
    email: string;
    phone: string;
    reminderState?: { t7Sent?: string; t1Sent?: string; dayOfSent?: string };
  }>;
  collectionWeekStart: string;
  now?: Date;
}): ReminderPlan[] {
  const now = (args.now ?? new Date()).getTime();
  const startTs = new Date(`${args.collectionWeekStart}T00:00:00Z`).getTime();
  const daysUntilStart = (startTs - now) / (24 * 60 * 60 * 1000);
  const plans: ReminderPlan[] = [];
  for (const s of args.signups) {
    const state = s.reminderState ?? {};
    // T-7 days reminder: fire when <=7 days remain AND not already sent.
    if (daysUntilStart <= 7 && !state.t7Sent) {
      plans.push({
        signupId: s.id,
        kind: 't7',
        buildArgs: {
          name: s.name,
          email: s.email,
          phone: s.phone,
          collectionWeekStart: args.collectionWeekStart,
          kind: 't7',
          channel: 'email',
        },
      });
    }
    // T-1 day reminder: fire when <=1 day remains AND not already sent.
    if (daysUntilStart <= 1 && !state.t1Sent) {
      plans.push({
        signupId: s.id,
        kind: 't1',
        buildArgs: {
          name: s.name,
          email: s.email,
          phone: s.phone,
          collectionWeekStart: args.collectionWeekStart,
          kind: 't1',
          channel: 'sms',
        },
      });
    }
    // Day-of reminder: fire on the morning of Day 1 AND not already sent.
    if (daysUntilStart <= 0 && daysUntilStart > -1 && !state.dayOfSent) {
      plans.push({
        signupId: s.id,
        kind: 'dayOf',
        buildArgs: {
          name: s.name,
          email: s.email,
          phone: s.phone,
          collectionWeekStart: args.collectionWeekStart,
          kind: 'dayOf',
          channel: 'sms',
        },
      });
    }
  }
  return plans;
}
