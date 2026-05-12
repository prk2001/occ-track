import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { motion } from 'framer-motion';
import {
  Shield, ChevronRight, Eye, Edit3, Trash2, Plus, Download, Search,
  Lock, Filter, ArrowLeft, AlertTriangle, Archive,
} from 'lucide-react';
import Layout from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import {
  AUDIT_LOG_KEY,
  getActionLabel,
  logAuditEvent,
  purgeEventsOlderThanDays,
  purgeAllEvents,
} from '@/lib/auditLog';
import type { AuditAction, AuditEvent } from '@/lib/auditLog';
import { ROLE_CONFIG, timeAgo } from '@/data/mockData';
import type { UserRole } from '@/data/mockData';
import { useNoIndex } from '@/hooks/useNoIndex';

/**
 * Audit Log viewer — Super Admin only.
 *
 * Renders the chronological trail of every privacy-sensitive action taken
 * on volunteer data. Built so a real ministry compliance officer could
 * answer "who saw what, when, and what did they do with it?" without
 * having to dig through server logs.
 *
 * Hooked into localStorage via useLocalStorage so it auto-refreshes when
 * a leader takes a new action in another tab.
 */
export default function AuditLog() {
  useNoIndex();
  const { user, isSuperAdmin } = useAuth();
  // Read live: this re-renders whenever the underlying storage changes
  // through this hook (other tabs require manual refresh — fine for demo).
  const [events] = useLocalStorage<AuditEvent[]>(AUDIT_LOG_KEY, []);
  const [query, setQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<AuditAction | 'all'>('all');
  const [showRetention, setShowRetention] = useState(false);
  const [purgeResult, setPurgeResult] = useState<string | null>(null);

  function runPurge(days: number | 'all') {
    if (!user) return;
    const actor = { id: user.id, name: user.name, role: user.role };
    const label = days === 'all' ? 'ALL audit events' : `events older than ${days} days`;
    if (!confirm(`Permanently delete ${label}? This cannot be undone.`)) return;
    const removed = days === 'all'
      ? purgeAllEvents(actor)
      : purgeEventsOlderThanDays(days, actor);
    setPurgeResult(removed > 0 ? `Purged ${removed} ${removed === 1 ? 'event' : 'events'}.` : 'Nothing matched the retention window.');
    setTimeout(() => setPurgeResult(null), 4000);
    setShowRetention(false);
  }

  // View-once-per-mount: log that Super Admin opened the audit log.
  // This is recursive on purpose — looking at the audit log IS itself
  // an audit-worthy event ("who's been watching the watchers?").
  const viewLogged = useRef(false);
  useEffect(() => {
    if (isSuperAdmin && !viewLogged.current && user) {
      logAuditEvent(
        { id: user.id, name: user.name, role: user.role },
        'view_signups',
        'audit-log',
        `Opened audit log viewer (${events.length} events on record)`,
      );
      viewLogged.current = true;
    }
    // events.length intentionally omitted — we don't want to re-log
    // every time someone takes an action in another tab.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperAdmin, user]);

  const filtered = useMemo(() => {
    return events
      .filter((e) => actionFilter === 'all' || e.action === actionFilter)
      .filter((e) => {
        const q = query.trim().toLowerCase();
        if (!q) return true;
        return [e.actorName, e.actorRole, e.action, e.target, e.details].some(
          (f) => f?.toLowerCase().includes(q),
        );
      });
  }, [events, actionFilter, query]);

  function downloadAuditCSV() {
    if (events.length === 0) return;
    const escape = (v: string | undefined) => {
      if (v === undefined) return '';
      const s = String(v).replace(/"/g, '""');
      return /[",\n]/.test(s) ? `"${s}"` : s;
    };
    const header = ['Timestamp', 'Actor', 'Role', 'Action', 'Target', 'Details'];
    const rows = events.map((e) =>
      [e.timestamp, e.actorName, e.actorRole, e.action, e.target, e.details]
        .map(escape)
        .join(','),
    );
    const csv = [header.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `occ-audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    if (user) {
      logAuditEvent(
        { id: user.id, name: user.name, role: user.role },
        'export_csv',
        'audit-log',
        `Exported ${events.length} audit events`,
      );
    }
  }

  if (!isSuperAdmin) {
    return (
      <Layout>
        <div className="px-4 py-12 max-w-2xl mx-auto">
          <div className="bg-bg-card rounded-2xl border border-border-custom p-8 text-center">
            <Lock className="w-10 h-10 text-sp-red mx-auto mb-3" />
            <h1 className="font-display text-2xl text-ink">Super Admin only.</h1>
            <p className="text-sm text-ink-light mt-2 italic max-w-md mx-auto">
              The audit log shows who has accessed volunteer information across
              the platform. Access is restricted to national HQ — Samaritan&apos;s Purse.
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

  const totalsByAction = useMemo(() => {
    const m = new Map<AuditAction, number>();
    events.forEach((e) => m.set(e.action, (m.get(e.action) ?? 0) + 1));
    return m;
  }, [events]);

  const uniqueActors = useMemo(
    () => new Set(events.map((e) => e.actorId)).size,
    [events],
  );

  return (
    <Layout>
      <div className="px-4 py-4 max-w-5xl mx-auto space-y-6 pb-24">
        {/* Hero */}
        <header className="flex items-start justify-between gap-3">
          <div className="space-y-2 pt-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-sp-red flex items-center gap-1.5">
              <Shield className="w-3 h-3" />
              Audit Log
            </p>
            <h1 className="font-display text-3xl sm:text-4xl text-ink leading-[1.05] tracking-tight">
              Who saw what.
              <span className="font-display-italic block text-sp-red mt-1">
                {events.length} {events.length === 1 ? 'event' : 'events'} on record.
              </span>
            </h1>
            <p className="text-sm text-ink-light italic">
              Every action that touched volunteer information — across {uniqueActors} {uniqueActors === 1 ? 'staffer' : 'staffers'}.
            </p>
          </div>
          <span className="text-[10px] font-bold text-sp-red bg-sp-red-light px-2 py-1 rounded-full uppercase tracking-wider whitespace-nowrap shrink-0 mt-1">
            Super Admin Only
          </span>
        </header>

        {/* Stats — quick scan of what's been happening */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatTile
            icon={Eye}
            label="Views"
            value={String(totalsByAction.get('view_signups') ?? 0)}
            bg="bg-blue-light"
            color="text-blue-accent"
          />
          <StatTile
            icon={Edit3}
            label="Edits"
            value={String(
              (totalsByAction.get('edit_day_time') ?? 0) +
              (totalsByAction.get('block_day') ?? 0) +
              (totalsByAction.get('reopen_day') ?? 0) +
              (totalsByAction.get('reset_day_times') ?? 0) +
              (totalsByAction.get('volunteer_self_edit') ?? 0),
            )}
            bg="bg-occ-green-light"
            color="text-occ-green"
          />
          <StatTile
            icon={Plus}
            label="New signups"
            value={String(totalsByAction.get('volunteer_signup_created') ?? 0)}
            bg="bg-lime-light"
            color="text-lime-dark"
          />
          <StatTile
            icon={Trash2}
            label="Destructive"
            value={String(
              (totalsByAction.get('remove_signup') ?? 0) +
              (totalsByAction.get('clear_all_signups') ?? 0),
            )}
            bg="bg-sp-red-light"
            color="text-sp-red"
          />
        </div>

        {/* Retention controls — Super Admin can purge events older than a
            cutoff window or wipe the whole log. Each purge itself records
            an event so destroying evidence completely isn't possible. */}
        <section className="bg-bg-card rounded-2xl border border-border-custom overflow-hidden">
          <button
            onClick={() => setShowRetention((v) => !v)}
            className="w-full px-5 py-4 flex items-center justify-between hover:bg-bg-primary/40 transition-colors"
          >
            <div className="flex items-center gap-3 text-left">
              <div className="w-10 h-10 bg-gold-light rounded-xl flex items-center justify-center shrink-0">
                <Archive className="w-5 h-5 text-gold" />
              </div>
              <div>
                <p className="text-sm font-semibold text-ink">Retention &amp; purge</p>
                <p className="text-[11px] text-ink-light italic mt-0.5">
                  Clear old events to comply with minimum-necessary retention.
                </p>
              </div>
            </div>
            <ChevronRight className={`w-4 h-4 text-ink-light transition-transform ${showRetention ? 'rotate-90' : ''}`} />
          </button>
          {showRetention && (
            <div className="border-t border-border-custom p-5 bg-bg-primary/40 space-y-3">
              <div className="flex items-start gap-2 text-xs text-ink-light">
                <AlertTriangle className="w-4 h-4 text-gold shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Purges are <strong>permanent</strong>. The retention action itself
                  is logged immediately afterwards (forensic breadcrumb), so a wipe
                  doesn&apos;t leave an empty log behind.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <PurgeOption days={90} onClick={() => runPurge(90)} />
                <PurgeOption days={180} onClick={() => runPurge(180)} />
                <PurgeOption days={365} onClick={() => runPurge(365)} />
              </div>
              <button
                onClick={() => runPurge('all')}
                className="w-full h-11 bg-sp-red text-white text-xs font-bold rounded-xl uppercase tracking-wider hover:bg-sp-red-dark transition-colors flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Wipe entire audit log
              </button>
              {purgeResult && (
                <p className="text-xs text-occ-green font-semibold text-center pt-2">{purgeResult}</p>
              )}
            </div>
          )}
        </section>

        {/* Filter chips + actions */}
        <section>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-light/60 pointer-events-none" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by person, action, or target…"
                className="w-full h-10 pl-10 pr-3 bg-bg-card border border-border-custom rounded-xl text-sm focus:outline-none focus:border-sp-red transition-colors"
              />
            </div>
            <div className="flex items-center gap-2">
              {events.length > 0 && (
                <button
                  onClick={downloadAuditCSV}
                  className="h-10 px-3 bg-bg-card border border-border-custom hover:border-blue-accent hover:text-blue-accent text-ink-light text-xs font-bold rounded-xl flex items-center gap-1.5 uppercase tracking-wider transition-all"
                >
                  <Download className="w-3 h-3" />
                  CSV
                </button>
              )}
            </div>
          </div>
          {events.length > 0 && (
            <div className="mt-3 flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-ink-light flex items-center gap-1 shrink-0 mr-1">
                <Filter className="w-3 h-3" /> Action
              </span>
              <FilterChip active={actionFilter === 'all'} onClick={() => setActionFilter('all')} label={`All (${events.length})`} />
              {Array.from(totalsByAction.entries())
                .sort((a, b) => b[1] - a[1])
                .map(([action, count]) => (
                  <FilterChip
                    key={action}
                    active={actionFilter === action}
                    onClick={() => setActionFilter(action)}
                    label={`${getActionLabel(action).label} (${count})`}
                  />
                ))}
            </div>
          )}
        </section>

        {/* Event list */}
        {events.length === 0 ? (
          <div className="bg-bg-card rounded-2xl border border-border-custom p-10 text-center">
            <Shield className="w-10 h-10 text-ink-light/40 mx-auto mb-3" />
            <p className="font-display text-base text-ink mb-1">No events yet.</p>
            <p className="text-xs text-ink-light italic max-w-sm mx-auto">
              The audit log starts empty. Once leaders begin viewing,
              exporting, or editing signup data, the trail will appear here.
            </p>
            <Link
              to="/signups"
              className="inline-flex items-center gap-1.5 mt-4 px-4 h-10 bg-sp-red text-white text-sm font-semibold rounded-xl hover:bg-sp-red-dark transition-colors"
            >
              Open Signups & Schedule
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
            {filtered.map((event) => (
              <EventRow key={event.id} event={event} />
            ))}
            {filtered.length === 0 && (
              <li className="bg-bg-card rounded-2xl border border-border-custom p-6 text-center">
                <p className="text-sm text-ink-light italic">No events match your filter.</p>
              </li>
            )}
          </motion.ul>
        )}
      </div>
    </Layout>
  );
}

// ─── Event row ─────────────────────────────────────────────────────────────
function EventRow({ event }: { event: AuditEvent }) {
  const { label, tone } = getActionLabel(event.action);
  const toneClasses = {
    view: 'bg-blue-light text-blue-accent',
    edit: 'bg-gold-light text-gold',
    destructive: 'bg-sp-red-light text-sp-red',
    create: 'bg-occ-green-light text-occ-green',
  }[tone];

  const isVolunteerSelf = event.actorRole === 'volunteer_self';
  const roleConfig = !isVolunteerSelf
    ? ROLE_CONFIG[event.actorRole as UserRole]
    : null;
  const roleColor = isVolunteerSelf ? '#84CC16' : (roleConfig?.color ?? '#94A3B8');
  const roleBg = isVolunteerSelf ? '#ECFCCB' : (roleConfig?.bgColor ?? '#F1F5F9');
  const roleLabel = isVolunteerSelf ? 'Volunteer (self)' : (roleConfig?.label ?? 'Unknown');

  const fullTime = new Date(event.timestamp).toLocaleString();

  return (
    <motion.li
      variants={{
        hidden: { opacity: 0, y: 6 },
        show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
      }}
      className="bg-bg-card rounded-2xl border border-border-custom p-4 hover:shadow-card transition-shadow"
    >
      <div className="flex items-start gap-3">
        {/* Actor avatar */}
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-display text-base leading-none shrink-0"
          style={{ backgroundColor: roleColor }}
        >
          {event.actorName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="min-w-0">
              <h3 className="font-display text-sm text-ink truncate leading-tight">
                {event.actorName}
              </h3>
              <span
                className="inline-block text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded mt-0.5"
                style={{ color: roleColor, backgroundColor: roleBg }}
              >
                {roleLabel}
              </span>
            </div>
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full whitespace-nowrap ${toneClasses}`}
            >
              {label}
            </span>
          </div>
          {event.target && (
            <p className="text-[11px] text-ink-light/80 mt-2 font-mono">
              <span className="text-ink-light/60">target:</span> {event.target}
            </p>
          )}
          {event.details && (
            <p className="text-xs text-ink-light mt-1.5 italic leading-relaxed">{event.details}</p>
          )}
          <p className="text-[10px] text-ink-light/60 mt-2 tabular-nums" title={fullTime}>
            {timeAgo(event.timestamp)} · {fullTime}
          </p>
        </div>
      </div>
    </motion.li>
  );
}

// ─── Retention purge option ───────────────────────────────────────────────
function PurgeOption({ days, onClick }: { days: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="h-11 px-3 bg-bg-card border border-border-custom hover:border-gold hover:bg-gold-light/50 text-ink-light hover:text-gold text-xs font-bold rounded-xl uppercase tracking-wider transition-all"
    >
      Older than {days}d
    </button>
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

// ─── Stat tile (reused pattern from Signups.tsx) ──────────────────────────
function StatTile({
  icon: Icon, label, value, bg, color,
}: {
  icon: typeof Eye;
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
