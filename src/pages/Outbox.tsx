import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Inbox, Mail, MessageSquare, Bell, ChevronRight, ChevronDown, Search,
  CheckCircle2, AlertCircle, Lock, ArrowLeft, Filter, Send, Zap,
} from 'lucide-react';
import Layout from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import {
  OUTBOX_KEY,
  buildReminder,
  planReminders,
  sendMessage,
} from '@/lib/outbox';
import type { OutboxChannel, OutboxMessage } from '@/lib/outbox';
import { logAuditEvent } from '@/lib/auditLog';
import { COLLECTION_WEEK_START, timeAgo } from '@/data/mockData';
import type { StoredSignup } from '@/data/mockData';
import { useNoIndex } from '@/hooks/useNoIndex';

/**
 * Notification outbox viewer — Super Admin only.
 *
 * Shows every message that *would have been sent* via email/SMS in
 * production. In the prototype the actual wire isn't hooked up; this
 * page exists so leadership can verify "yes, the right templates are
 * triggering at the right moments" without sending real test messages.
 *
 * When the prototype graduates to production:
 *   - `sendMessage()` swaps to call Telnyx (SMS) and Resend (email)
 *   - The outbox becomes a read-only audit of actual sends
 *   - Failed deliveries show up here with their provider error message
 */
export default function Outbox() {
  useNoIndex();
  const { user, isSuperAdmin } = useAuth();
  const [messages] = useLocalStorage<OutboxMessage[]>(OUTBOX_KEY, []);
  const [signups, setSignups] = useLocalStorage<StoredSignup[]>('occ:signups', []);
  const [query, setQuery] = useState('');
  const [channelFilter, setChannelFilter] = useState<OutboxChannel | 'all'>('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [dispatchedCount, setDispatchedCount] = useState<number | null>(null);

  // Dispatch reminder messages that are overdue but haven't been sent.
  // Idempotent — clicking twice doesn't double-send because we mark each
  // signup's reminderState on dispatch. In production this would be a cron.
  function dispatchOverdueReminders() {
    if (!user) return;
    // Force-anchor "now" to the morning of Collection Week Day 1 so the
    // demo shows real reminder dispatches (T-7d, T-1d, day-of all fire).
    // The actual current date is months away, so the planner would return
    // an empty list without this override. In production, "now" = `new Date()`.
    const demoNow = new Date(`${COLLECTION_WEEK_START}T08:00:00Z`);
    const plans = planReminders({
      signups,
      collectionWeekStart: COLLECTION_WEEK_START,
      now: demoNow,
    });
    if (plans.length === 0) {
      setDispatchedCount(0);
      setTimeout(() => setDispatchedCount(null), 2500);
      return;
    }
    // Send each planned reminder and stamp the signup's reminderState.
    const now = new Date().toISOString();
    plans.forEach((plan) => {
      sendMessage({
        ...buildReminder(plan.buildArgs),
        relatedTarget: `signup:${plan.signupId}`,
      });
    });
    setSignups((prev) =>
      prev.map((s) => {
        const planForThis = plans.filter((p) => p.signupId === s.id);
        if (planForThis.length === 0) return s;
        const next = { ...s, reminderState: { ...(s.reminderState ?? {}) } };
        for (const p of planForThis) {
          if (p.kind === 't7') next.reminderState.t7Sent = now;
          if (p.kind === 't1') next.reminderState.t1Sent = now;
          if (p.kind === 'dayOf') next.reminderState.dayOfSent = now;
        }
        return next;
      }),
    );
    logAuditEvent(
      { id: user.id, name: user.name, role: user.role },
      'email_all',
      'outbox',
      `Dispatched ${plans.length} scheduled reminders (T-7/T-1/day-of)`,
    );
    setDispatchedCount(plans.length);
    setTimeout(() => setDispatchedCount(null), 3500);
  }

  // Log when Super Admin opens this page — they're inspecting what got
  // sent to whom, which counts as a privacy-sensitive view.
  const viewLogged = useRef(false);
  useEffect(() => {
    if (isSuperAdmin && !viewLogged.current && user) {
      logAuditEvent(
        { id: user.id, name: user.name, role: user.role },
        'view_signups',
        'outbox',
        `Opened notification outbox (${messages.length} messages on record)`,
      );
      viewLogged.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperAdmin, user]);

  const filtered = useMemo(() => {
    return messages
      .filter((m) => channelFilter === 'all' || m.channel === channelFilter)
      .filter((m) => {
        const q = query.trim().toLowerCase();
        if (!q) return true;
        return [m.to, m.toName, m.subject, m.body, m.kind].some(
          (f) => f?.toLowerCase().includes(q),
        );
      });
  }, [messages, channelFilter, query]);

  const totalsByChannel = useMemo(() => {
    const m = new Map<OutboxChannel, number>();
    messages.forEach((msg) => m.set(msg.channel, (m.get(msg.channel) ?? 0) + 1));
    return m;
  }, [messages]);

  const failedCount = messages.filter((m) => m.status === 'failed').length;

  if (!isSuperAdmin) {
    return (
      <Layout>
        <div className="px-4 py-12 max-w-2xl mx-auto">
          <div className="bg-bg-card rounded-2xl border border-border-custom p-8 text-center">
            <Lock className="w-10 h-10 text-sp-red mx-auto mb-3" />
            <h1 className="font-display text-2xl text-ink">Super Admin only.</h1>
            <p className="text-sm text-ink-light mt-2 italic max-w-md mx-auto">
              The notification outbox shows every email and SMS the platform
              has dispatched. Access is restricted to national HQ.
            </p>
            <Link
              to="/"
              className="inline-flex h-11 px-5 mt-6 bg-sp-red text-white text-sm font-semibold rounded-xl items-center justify-center hover:bg-sp-red-dark transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Back to Dashboard
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="px-4 py-4 max-w-5xl mx-auto space-y-6 pb-24">
        {/* Hero */}
        <header className="flex items-start justify-between gap-3">
          <div className="space-y-2 pt-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-sp-red flex items-center gap-1.5">
              <Inbox className="w-3 h-3" />
              Notification Outbox
            </p>
            <h1 className="font-display text-3xl sm:text-4xl text-ink leading-[1.05] tracking-tight">
              What we sent.
              <span className="font-display-italic block text-sp-red mt-1">
                {messages.length} {messages.length === 1 ? 'message' : 'messages'} dispatched.
              </span>
            </h1>
            <p className="text-sm text-ink-light italic">
              Every confirmation email, arrival SMS, and reminder the platform fired.
              {failedCount > 0 && (
                <span className="text-sp-red font-semibold"> · {failedCount} failed</span>
              )}
            </p>
          </div>
          <span className="text-[10px] font-bold text-sp-red bg-sp-red-light px-2 py-1 rounded-full uppercase tracking-wider whitespace-nowrap shrink-0 mt-1">
            Super Admin Only
          </span>
        </header>

        {/* Mock-mode disclaimer — important to call out so an evaluating
            user knows the messages aren't actually leaving the browser. */}
        <div className="bg-gold-light rounded-xl p-4 flex items-start gap-3 text-xs text-ink">
          <AlertCircle className="w-4 h-4 text-gold shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-ink">Prototype: messages are mocked.</p>
            <p className="text-ink-light italic mt-1">
              In production, signup confirmations would dispatch via Resend (email)
              and arrival SMS via Telnyx. Here we capture the templates so leadership
              can review what would have gone out.
            </p>
          </div>
        </div>

        {/* Dispatch reminders — manual trigger that simulates the T-7/T-1/day-of
            reminder cron a real backend would run on a schedule. Idempotent. */}
        {signups.length > 0 && (
          <div className="bg-bg-card rounded-2xl border border-border-custom p-4 flex items-center justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-gold" />
                Scheduled reminders
              </p>
              <p className="text-[11px] text-ink-light italic mt-0.5">
                In production, T-7d / T-1d / day-of reminders dispatch automatically.
                Click below to simulate the cron run for {signups.length} {signups.length === 1 ? 'signup' : 'signups'}.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {dispatchedCount !== null && (
                <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${
                  dispatchedCount === 0
                    ? 'bg-blue-light text-blue-accent'
                    : 'bg-occ-green-light text-occ-green'
                }`}>
                  {dispatchedCount === 0
                    ? 'Nothing overdue'
                    : `${dispatchedCount} sent`}
                </span>
              )}
              <button
                onClick={dispatchOverdueReminders}
                className="h-10 px-4 bg-gold hover:bg-gold-dark text-white text-xs font-bold rounded-xl flex items-center gap-1.5 uppercase tracking-wider transition-colors shrink-0"
              >
                <Zap className="w-3.5 h-3.5" />
                Run dispatcher
              </button>
            </div>
          </div>
        )}

        {/* Channel breakdown */}
        <div className="grid grid-cols-3 gap-3">
          <StatTile
            icon={Mail}
            label="Email"
            value={String(totalsByChannel.get('email') ?? 0)}
            bg="bg-blue-light"
            color="text-blue-accent"
          />
          <StatTile
            icon={MessageSquare}
            label="SMS"
            value={String(totalsByChannel.get('sms') ?? 0)}
            bg="bg-occ-green-light"
            color="text-occ-green"
          />
          <StatTile
            icon={Bell}
            label="In-app"
            value={String(totalsByChannel.get('in_app') ?? 0)}
            bg="bg-purple-light"
            color="text-purple-accent"
          />
        </div>

        {/* Search + filter chips */}
        <section>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-light/60 pointer-events-none" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by recipient, subject, or body…"
              className="w-full h-10 pl-10 pr-3 bg-bg-card border border-border-custom rounded-xl text-sm focus:outline-none focus:border-sp-red transition-colors"
            />
          </div>
          {messages.length > 0 && (
            <div className="mt-3 flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-ink-light flex items-center gap-1 shrink-0 mr-1">
                <Filter className="w-3 h-3" /> Channel
              </span>
              <FilterChip active={channelFilter === 'all'} onClick={() => setChannelFilter('all')} label={`All (${messages.length})`} />
              <FilterChip active={channelFilter === 'email'} onClick={() => setChannelFilter('email')} label={`Email (${totalsByChannel.get('email') ?? 0})`} />
              <FilterChip active={channelFilter === 'sms'} onClick={() => setChannelFilter('sms')} label={`SMS (${totalsByChannel.get('sms') ?? 0})`} />
              <FilterChip active={channelFilter === 'in_app'} onClick={() => setChannelFilter('in_app')} label={`In-app (${totalsByChannel.get('in_app') ?? 0})`} />
            </div>
          )}
        </section>

        {/* Message list */}
        {messages.length === 0 ? (
          <div className="bg-bg-card rounded-2xl border border-border-custom p-10 text-center">
            <Send className="w-10 h-10 text-ink-light/40 mx-auto mb-3" />
            <p className="font-display text-base text-ink mb-1">No messages dispatched yet.</p>
            <p className="text-xs text-ink-light italic max-w-sm mx-auto">
              Once a volunteer signs up at <Link to="/signup" className="text-sp-red font-semibold">/signup</Link>{' '}
              or a Greeter marks an arrival, the confirmation messages appear here.
            </p>
            <Link
              to="/signup"
              className="inline-flex items-center gap-1.5 mt-4 px-4 h-10 bg-sp-red text-white text-sm font-semibold rounded-xl hover:bg-sp-red-dark transition-colors"
            >
              Try the signup flow
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <motion.ul
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.02 } } }}
            className="space-y-2"
          >
            {filtered.map((msg) => (
              <MessageRow
                key={msg.id}
                message={msg}
                isExpanded={expanded === msg.id}
                onToggle={() => setExpanded((prev) => (prev === msg.id ? null : msg.id))}
              />
            ))}
            {filtered.length === 0 && (
              <li className="bg-bg-card rounded-2xl border border-border-custom p-6 text-center">
                <p className="text-sm text-ink-light italic">No messages match your filter.</p>
              </li>
            )}
          </motion.ul>
        )}
      </div>
    </Layout>
  );
}

// ─── Message row ──────────────────────────────────────────────────────────
function MessageRow({
  message, isExpanded, onToggle,
}: {
  message: OutboxMessage;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const channelMeta = {
    email: { Icon: Mail, color: 'text-blue-accent', bg: 'bg-blue-light', label: 'Email' },
    sms: { Icon: MessageSquare, color: 'text-occ-green', bg: 'bg-occ-green-light', label: 'SMS' },
    in_app: { Icon: Bell, color: 'text-purple-accent', bg: 'bg-purple-light', label: 'In-app' },
  }[message.channel];
  const kindLabel = {
    signup_confirmation: 'Signup confirmation',
    arrival_confirmation: 'Arrival confirmation',
    leadership_broadcast: 'Leadership broadcast',
    reminder: 'Reminder',
  }[message.kind];

  return (
    <motion.li
      variants={{
        hidden: { opacity: 0, y: 6 },
        show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
      }}
      className="bg-bg-card rounded-2xl border border-border-custom overflow-hidden hover:shadow-card transition-shadow"
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-bg-primary/40 transition-colors"
      >
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${channelMeta.bg}`}>
          <channelMeta.Icon className={`w-5 h-5 ${channelMeta.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="min-w-0">
              <h3 className="font-display text-sm text-ink truncate leading-tight">
                {message.toName ?? message.to}
              </h3>
              <p className="text-[11px] text-ink-light truncate">
                <span className={`font-bold uppercase tracking-wider text-[9px] ${channelMeta.color}`}>
                  {channelMeta.label}
                </span>
                <span className="mx-1.5 text-ink-light/40">·</span>
                <span className="font-mono">{message.to}</span>
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-bg-primary text-ink-light whitespace-nowrap">
                {kindLabel}
              </span>
              {message.status === 'sent' ? (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-occ-green-light text-occ-green whitespace-nowrap flex items-center gap-1">
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  Sent
                </span>
              ) : (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-sp-red-light text-sp-red whitespace-nowrap flex items-center gap-1">
                  <AlertCircle className="w-2.5 h-2.5" />
                  Failed
                </span>
              )}
            </div>
          </div>
          {message.subject && (
            <p className="text-xs text-ink mt-1.5 font-semibold truncate">{message.subject}</p>
          )}
          <p className="text-[10px] text-ink-light/60 mt-1 tabular-nums" title={new Date(message.sentAt).toLocaleString()}>
            {timeAgo(message.sentAt)}
          </p>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-ink-light/60 transition-transform shrink-0 ${
            isExpanded ? 'rotate-180' : ''
          }`}
        />
      </button>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-border-custom"
          >
            <div className="p-4 bg-bg-primary/40 space-y-2">
              {message.error && (
                <div className="bg-sp-red-light text-sp-red rounded-xl px-3 py-2 text-xs font-semibold flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {message.error}
                </div>
              )}
              <pre className="text-xs text-ink whitespace-pre-wrap font-sans leading-relaxed bg-bg-card border border-border-custom rounded-xl p-4">
                {message.body}
              </pre>
              {message.relatedTarget && (
                <p className="text-[10px] text-ink-light/60 font-mono pt-1">
                  related: {message.relatedTarget}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
}

// ─── Filter chip ──────────────────────────────────────────────────────────
function FilterChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 h-7 px-3 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
        active
          ? 'bg-ink text-white'
          : 'bg-bg-card border border-border-custom text-ink-light hover:text-ink'
      }`}
    >
      {label}
    </button>
  );
}

// ─── Stat tile ────────────────────────────────────────────────────────────
function StatTile({
  icon: Icon, label, value, bg, color,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
  bg: string;
  color: string;
}) {
  return (
    <div className={`${bg} rounded-2xl p-3`}>
      <Icon className={`w-4 h-4 ${color} mb-1`} />
      <p className={`font-display text-2xl ${color} tabular-nums leading-none`}>{value}</p>
      <p className="text-[10px] text-ink-light mt-1 uppercase tracking-wider">{label}</p>
    </div>
  );
}
