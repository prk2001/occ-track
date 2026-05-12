import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardList, Calendar, Users, Lock, Unlock, CalendarOff, Plus, X, Phone, Mail,
  CheckCircle2, AlertCircle, Shield, Sparkles, ChevronRight, MessageCircle, Trash2,
  Pencil, Search, Mail as MailIcon, RotateCcw, Printer, Download, ArrowDownAZ, ArrowDown01,
  UserCheck, UserX, Eye, EyeOff,
} from 'lucide-react';
import Layout from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import {
  COLLECTION_DAYS,
  COLLECTION_DAY,
  DEFAULT_DAY_TIMES,
  getLocationById,
  timeAgo,
} from '@/data/mockData';
import type { DayBlock, StoredSignup } from '@/data/mockData';
import { findDuplicateSignups, signupInScopeForUser, DEFAULT_CDO_ID, LOCATIONS } from '@/data/mockData';
import { logAuditEvent } from '@/lib/auditLog';
import { buildArrivalConfirmation, sendMessage } from '@/lib/outbox';
import { logSecuritySignal } from '@/lib/security';
import { useNoIndex } from '@/hooks/useNoIndex';

// Seed: Saturday is often covered by a youth group. Demos the blocked
// state on first load; user can clear via Reopen.
const SEED_BLOCKS: DayBlock[] = [
  {
    date: '2026-11-21',
    coveredBy: 'First Baptist Youth Group',
    note: '12 students + 3 chaperones',
    blockedAt: '2026-10-15T14:30:00Z',
  },
];

export default function Signups() {
  useNoIndex();
  const { user, isRegionalAdmin } = useAuth();
  const cdoLabel = getLocationById('cdo1')?.name ?? 'Central Drop-off';
  const [signups, setSignups] = useLocalStorage<StoredSignup[]>('occ:signups', []);
  const [blocks, setBlocks] = useLocalStorage<DayBlock[]>('occ:day-blocks', SEED_BLOCKS);
  const [dayTimes, setDayTimes] = useLocalStorage<Record<string, string>>('occ:day-times', DEFAULT_DAY_TIMES);
  const [blockingDate, setBlockingDate] = useState<string | null>(null);
  const [editingTimeDate, setEditingTimeDate] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name'>('newest');
  // PII blur: privacy-by-default. PII (phone, email, emergency contact)
  // is hidden until the admin clicks "Reveal." Per-card reveal state lives
  // here; auto-restores after 30s. Session-only — no localStorage.
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  const [piiBlurredGlobal, setPiiBlurredGlobal] = useState<boolean>(true);

  function toggleRevealRow(id: string) {
    setRevealedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        logSecuritySignal('pii_blur_restored', `signup:${id}`);
      } else {
        next.add(id);
        logSecuritySignal('pii_reveal', `signup:${id}`);
      }
      return next;
    });
    // Auto-restore blur for this row after 30s — limits exposure window.
    setTimeout(() => {
      setRevealedIds((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 30000);
  }

  // Actor context — every audit event needs to know who did it. Memoized so
  // we don't rebuild a new object on every render that would invalidate the
  // effect dependency below.
  const actor = useMemo(
    () =>
      user
        ? { id: user.id, name: user.name, role: user.role }
        : { id: 'anonymous', name: 'Unknown', role: 'greeter' as const },
    [user],
  );

  // Scope filter — Super Admin / SP Admin see everything; Regional sees
  // only their region's CDOs; CDO Leader sees only their own CDO (currently
  // privacy-gated entirely; included for future per-CDO admin views).
  // Computed up here (before the view-log effect) so the effect can read it.
  const scopedSignups = useMemo(
    () => signups.filter((s) => signupInScopeForUser(user, s)),
    [signups, user],
  );

  // Log "viewed signups" once per mount per role — not on every re-render.
  // We use a ref guard rather than an effect dependency on `signups.length`
  // because that would fire again whenever someone removes a signup.
  const viewLogged = useRef(false);
  useEffect(() => {
    if (isRegionalAdmin && !viewLogged.current && user) {
      logAuditEvent(actor, 'view_signups', `signups:count=${scopedSignups.length}`);
      viewLogged.current = true;
    }
  }, [isRegionalAdmin, user, actor, scopedSignups.length]);

  function downloadCSV() {
    if (scopedSignups.length === 0) return;
    const escape = (v: string | number | boolean | null | undefined) => {
      if (v === null || v === undefined) return '';
      const s = String(v).replace(/"/g, '""');
      return /[",\n]/.test(s) ? `"${s}"` : s;
    };
    const cdoCol = (s: StoredSignup) => LOCATIONS.find((l) => l.id === (s.locationId ?? DEFAULT_CDO_ID))?.name ?? '';
    const header = ['Name', 'Email', 'Phone', 'ZIP', 'CDO', 'First Time?', 'Shirt', 'Emergency Name', 'Emergency Phone', 'Notes', 'Submitted'];
    const rows = scopedSignups.map((s) => [
      s.name,
      s.email,
      s.phone,
      s.zip ?? '',
      cdoCol(s),
      s.firstTime === true ? 'Yes' : s.firstTime === false ? 'No' : '',
      s.shirtSize ?? '',
      s.emergencyName ?? '',
      s.emergencyPhone ?? '',
      s.notes ?? '',
      new Date(s.submittedAt).toLocaleString(),
    ].map(escape).join(','));
    const csv = [header.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `occ-signups-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    logAuditEvent(actor, 'export_csv', undefined, `Exported ${signups.length} signup rows`);
  }

  function updateDayTime(date: string, value: string) {
    const prevTime = dayTimes[date] ?? '(unset)';
    setDayTimes((prev) => ({ ...prev, [date]: value }));
    setEditingTimeDate(null);
    logAuditEvent(actor, 'edit_day_time', `day:${date}`, `Changed shift hours from "${prevTime}" to "${value}"`);
  }

  function resetDayTimes() {
    setDayTimes(DEFAULT_DAY_TIMES);
    logAuditEvent(actor, 'reset_day_times', undefined, 'Reset all shift hours to defaults');
  }

  function clearAllSignups() {
    if (scopedSignups.length === 0) return;
    if (confirm(`Remove all ${scopedSignups.length} signups in scope? This cannot be undone.`)) {
      const count = scopedSignups.length;
      // Only remove signups in scope — preserves data from outside the
      // current user's region (e.g. Regional Admin shouldn't be able to
      // nuke another region's volunteers by accident).
      const scopedIds = new Set(scopedSignups.map((s) => s.id));
      setSignups((prev) => prev.filter((s) => !scopedIds.has(s.id)));
      logAuditEvent(actor, 'clear_all_signups', undefined, `Cleared ${count} signups in scope`);
    }
  }

  function emailAllSignups() {
    const emails = scopedSignups.map((s) => s.email).filter(Boolean).join(',');
    if (!emails) return;
    window.location.href = `mailto:?bcc=${encodeURIComponent(emails)}&subject=${encodeURIComponent('Collection Week 2026 — Volunteer Update')}`;
    logAuditEvent(actor, 'email_all', undefined, `Opened mailto: with ${scopedSignups.length} BCC recipients`);
  }

  const filteredSignups = scopedSignups
    .filter((s) => {
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return [s.name, s.email, s.phone, s.notes, s.emergencyName].some((f) =>
        f?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      const ta = new Date(a.submittedAt).getTime();
      const tb = new Date(b.submittedAt).getTime();
      return sortBy === 'newest' ? tb - ta : ta - tb;
    });

  const blocksByDate = useMemo(() => {
    const m = new Map<string, DayBlock>();
    blocks.forEach((b) => m.set(b.date, b));
    return m;
  }, [blocks]);

  function addBlock(date: string, coveredBy: string, note: string) {
    const newBlock: DayBlock = { date, coveredBy: coveredBy.trim(), note: note.trim() || undefined, blockedAt: new Date().toISOString() };
    setBlocks((prev) => [...prev.filter((b) => b.date !== date), newBlock]);
    setBlockingDate(null);
    logAuditEvent(actor, 'block_day', `day:${date}`, `Covered by "${coveredBy.trim()}"${note.trim() ? ` — ${note.trim()}` : ''}`);
  }

  function reopenDay(date: string) {
    const prevBlock = blocks.find((b) => b.date === date);
    setBlocks((prev) => prev.filter((b) => b.date !== date));
    logAuditEvent(actor, 'reopen_day', `day:${date}`, prevBlock ? `Was covered by "${prevBlock.coveredBy}"` : undefined);
  }

  function removeSignup(id: string) {
    const removed = signups.find((s) => s.id === id);
    setSignups((prev) => prev.filter((s) => s.id !== id));
    if (removed) {
      logAuditEvent(actor, 'remove_signup', `signup:${id}`, `Removed ${removed.name} (${removed.email})`);
    }
  }

  function markArrived(id: string) {
    const now = new Date().toISOString();
    const target = signups.find((s) => s.id === id);
    setSignups((prev) =>
      prev.map((s) => (s.id === id ? { ...s, arrivedAt: now } : s)),
    );
    if (target) {
      logAuditEvent(actor, 'mark_arrived', `signup:${id}`, `Marked ${target.name} as arrived at the welcome table`);
      // Mock SMS: real deploy would push this to Telnyx so the volunteer
      // gets a "welcome, find a team lead in a red shirt" text on arrival.
      sendMessage({
        ...buildArrivalConfirmation({
          name: target.name,
          phone: target.phone,
          locationName: cdoLabel,
        }),
        relatedTarget: `signup:${id}`,
      });
    }
  }

  function unmarkArrived(id: string) {
    const target = signups.find((s) => s.id === id);
    setSignups((prev) =>
      prev.map((s) => (s.id === id ? { ...s, arrivedAt: undefined } : s)),
    );
    if (target) {
      logAuditEvent(actor, 'unmark_arrived', `signup:${id}`, `Unmarked ${target.name} arrival`);
    }
  }

  const openDays = COLLECTION_DAYS.length - blocks.length;
  const upcomingDays = COLLECTION_DAYS.filter((_, i) => i + 1 >= COLLECTION_DAY).length;
  const upcomingOpenDays = COLLECTION_DAYS.filter((d, i) => i + 1 >= COLLECTION_DAY && !blocksByDate.has(d.date)).length;

  // Compute which scopedSignups have at least one duplicate match (by
  // email or phone) within the scope. O(n²) is fine — even a large CDO
  // won't push beyond ~200 signups in a season.
  const duplicateIds = useMemo(() => {
    const ids = new Set<string>();
    for (const s of scopedSignups) {
      const others = scopedSignups.filter((o) => o.id !== s.id);
      const matches = findDuplicateSignups(others, { email: s.email, phone: s.phone });
      if (matches.length > 0) ids.add(s.id);
    }
    return ids;
  }, [scopedSignups]);

  // Day-of attendance: how many SCOPED signed-up volunteers have shown up today?
  // The demo treats today as COLLECTION_DAYS[COLLECTION_DAY-1].date (Thu Nov 19).
  const todayISODate = COLLECTION_DAYS[COLLECTION_DAY - 1]?.date ?? new Date().toISOString().slice(0, 10);
  const arrivedToday = scopedSignups.filter(
    (s) => s.arrivedAt && s.arrivedAt.slice(0, 10) === todayISODate,
  ).length;
  const arrivalRate = scopedSignups.length === 0 ? 0 : Math.round((arrivedToday / scopedSignups.length) * 100);

  // Scope label for the hero — tells the admin which slice they're viewing.
  const scopeLabel = (() => {
    if (!user) return cdoLabel;
    if (user.role === 'super_admin' || user.role === 'admin') return 'All CDOs nationwide';
    if (user.role === 'regional') return `${user.regionId === 'all' ? 'All regions' : 'Your region'}`;
    return cdoLabel;
  })();

  return (
    <Layout>
      <div className="px-4 py-4 max-w-5xl mx-auto space-y-6 pb-24">
        {/* Print-only header — clean physical roster heading */}
        <div className="print-only border-b border-ink pb-4 mb-4 hidden">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-ink-light">
            Operation Christmas Child · Samaritan's Purse
          </p>
          <h1 className="text-2xl font-bold text-ink mt-1">{cdoLabel} — Volunteer Roster</h1>
          <p className="text-sm text-ink-light mt-1">
            Collection Week 2026 · November 16–23 · {signups.length} signups
          </p>
        </div>
        {/* Hero — leadership view shows live counts; everyone else gets a
            neutral header so aggregate signup data isn't leaked through
            the page chrome. */}
        <header className="flex items-start justify-between gap-3">
          <div className="space-y-2 pt-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-sp-red">
              Signups & Schedule
            </p>
            {isRegionalAdmin ? (
              <>
                <h1 className="font-display text-3xl sm:text-4xl text-ink leading-[1.05] tracking-tight">
                  Plan the week.
                  <span className="font-display-italic block text-sp-red mt-1">
                    {scopedSignups.length} {scopedSignups.length === 1 ? 'volunteer' : 'volunteers'} ready.
                  </span>
                </h1>
                <p className="text-sm text-ink-light italic">
                  {scopeLabel} · {upcomingOpenDays} of {upcomingDays} upcoming days still open for signups
                </p>
              </>
            ) : (
              <>
                <h1 className="font-display text-3xl sm:text-4xl text-ink leading-[1.05] tracking-tight">
                  Restricted area.
                  <span className="font-display-italic block text-sp-red mt-1">
                    Volunteer information is private.
                  </span>
                </h1>
                <p className="text-sm text-ink-light italic">
                  Only Samaritan&apos;s Purse leadership can see who&apos;s signed up.
                </p>
              </>
            )}
          </div>
          <span className="text-[10px] font-bold text-sp-red bg-sp-red-light px-2 py-1 rounded-full uppercase tracking-wider whitespace-nowrap shrink-0 mt-1 print-hide">
            SP Leadership Only
          </span>
        </header>

        {!isRegionalAdmin && <NotForYourRoleCard role={user?.role ?? null} />}

        {isRegionalAdmin && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print-hide">
              <StatTile icon={ClipboardList} label="Pending Signups" value={String(scopedSignups.length)} bg="bg-sp-red-light" color="text-sp-red" />
              <StatTile icon={UserCheck} label="Arrived Today" value={`${arrivedToday}${scopedSignups.length > 0 ? ` (${arrivalRate}%)` : ''}`} bg="bg-occ-green-light" color="text-occ-green" />
              <StatTile icon={Unlock} label="Open Days" value={String(openDays)} bg="bg-blue-light" color="text-blue-accent" />
              <StatTile icon={Lock} label="Covered Days" value={String(blocks.length)} bg="bg-gold-light" color="text-gold" />
            </div>

            {/* Day-of attendance — only renders during Collection Week when
                signups exist. Lets the Greeter at the welcome table check
                volunteers off as they arrive. Scoped to user's region. */}
            {scopedSignups.length > 0 && (
              <AttendanceSection
                signups={scopedSignups}
                onMarkArrived={markArrived}
                onUnmarkArrived={unmarkArrived}
                todayISODate={todayISODate}
              />
            )}

            {/* Day schedule section */}
            <section className="print-hide">
              <header className="mb-3">
                <h2 className="font-display text-xl text-ink leading-tight">Collection Week Schedule</h2>
                <p className="text-xs text-ink-light italic mt-1">
                  Block out a day when a group has it covered. Volunteers will see the schedule when they sign up.
                </p>
              </header>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {COLLECTION_DAYS.map((d) => {
                  const block = blocksByDate.get(d.date);
                  const isToday = d.index === COLLECTION_DAY;
                  const isPast = d.index < COLLECTION_DAY;
                  return (
                    <DayCard
                      key={d.date}
                      day={d}
                      time={dayTimes[d.date] ?? ''}
                      block={block}
                      isToday={isToday}
                      isPast={isPast}
                      isEditingTime={editingTimeDate === d.date}
                      onBlock={() => setBlockingDate(d.date)}
                      onReopen={() => reopenDay(d.date)}
                      onStartEditTime={() => setEditingTimeDate(d.date)}
                      onSaveTime={(v) => updateDayTime(d.date, v)}
                      onCancelEditTime={() => setEditingTimeDate(null)}
                    />
                  );
                })}
              </div>
              <div className="mt-3 flex items-center justify-between text-[11px] text-ink-light">
                <p className="italic">
                  Tap any time to edit your hours. Volunteers see this schedule when they sign up.
                </p>
                <button
                  onClick={resetDayTimes}
                  className="font-semibold hover:text-sp-red transition-colors flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset to defaults
                </button>
              </div>
            </section>

            {/* Signups list */}
            <section>
              <header className="mb-3 flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="font-display text-xl text-ink leading-tight">
                    {scopedSignups.length} {scopedSignups.length === 1 ? 'Signup' : 'Signups'}
                  </h2>
                  <p className="text-xs text-ink-light italic mt-1">
                    Volunteers who said they'd serve this Collection Week.
                  </p>
                </div>
                {scopedSignups.length > 0 && (
                  <div className="flex items-center gap-2 print-hide flex-wrap">
                    <button
                      onClick={() => {
                        setPiiBlurredGlobal((v) => {
                          // Toggling unhide -> hide also clears any per-row reveals.
                          if (!v) setRevealedIds(new Set());
                          return !v;
                        });
                      }}
                      className={`h-9 px-3 border text-xs font-bold rounded-xl flex items-center gap-1.5 uppercase tracking-wider transition-all ${
                        piiBlurredGlobal
                          ? 'bg-bg-primary border-border-custom text-ink-light hover:border-ink hover:text-ink'
                          : 'bg-ink border-ink text-white hover:bg-ink/90'
                      }`}
                      title={piiBlurredGlobal ? 'PII is hidden. Click to reveal all.' : 'PII is visible. Click to hide.'}
                    >
                      {piiBlurredGlobal ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      {piiBlurredGlobal ? 'PII hidden' : 'PII visible'}
                    </button>
                    <button
                      onClick={downloadCSV}
                      className="h-9 px-3 bg-bg-primary border border-border-custom hover:border-blue-accent hover:text-blue-accent text-ink-light text-xs font-bold rounded-xl flex items-center gap-1.5 uppercase tracking-wider transition-all"
                    >
                      <Download className="w-3 h-3" />
                      CSV
                    </button>
                    <button
                      onClick={() => {
                        logAuditEvent(actor, 'print_roster', undefined, `Printed roster with ${scopedSignups.length} signups`);
                        window.print();
                      }}
                      className="h-9 px-3 bg-bg-primary border border-border-custom hover:border-occ-green hover:text-occ-green text-ink-light text-xs font-bold rounded-xl flex items-center gap-1.5 uppercase tracking-wider transition-all"
                    >
                      <Printer className="w-3 h-3" />
                      Print
                    </button>
                    <Link
                      to="/badges"
                      className="h-9 px-3 bg-bg-primary border border-border-custom hover:border-purple-accent hover:text-purple-accent text-ink-light text-xs font-bold rounded-xl flex items-center gap-1.5 uppercase tracking-wider transition-all"
                    >
                      <Printer className="w-3 h-3" />
                      Badges
                    </Link>
                    <button
                      onClick={emailAllSignups}
                      className="h-9 px-3 bg-lime hover:bg-lime-dark transition-colors text-occ-green-dark hover:text-white text-xs font-bold rounded-xl flex items-center gap-1.5 uppercase tracking-wider"
                    >
                      <MailIcon className="w-3 h-3" />
                      Email all
                    </button>
                    <button
                      onClick={clearAllSignups}
                      className="h-9 px-3 bg-bg-primary border border-border-custom hover:border-sp-red hover:text-sp-red text-ink-light text-xs font-bold rounded-xl flex items-center gap-1.5 uppercase tracking-wider transition-all"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Clear all
                    </button>
                  </div>
                )}
                {scopedSignups.length === 0 && (
                  <Link
                    to="/signup"
                    className="text-xs font-semibold text-sp-red hover:underline flex items-center gap-1"
                  >
                    Test the signup flow <ChevronRight className="w-3 h-3" />
                  </Link>
                )}
              </header>
              {scopedSignups.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 mb-3 print-hide">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-light/60 pointer-events-none" />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search name, email, phone, or notes…"
                      className="w-full h-10 pl-10 pr-3 bg-bg-card border border-border-custom rounded-xl text-sm focus:outline-none focus:border-sp-red transition-colors"
                    />
                  </div>
                  <div className="flex items-center gap-1 bg-bg-card border border-border-custom rounded-xl px-1">
                    <SortChip active={sortBy === 'newest'} onClick={() => setSortBy('newest')} label="Newest" icon={<ArrowDown01 className="w-3 h-3" />} />
                    <SortChip active={sortBy === 'oldest'} onClick={() => setSortBy('oldest')} label="Oldest" icon={<ArrowDown01 className="w-3 h-3 rotate-180" />} />
                    <SortChip active={sortBy === 'name'} onClick={() => setSortBy('name')} label="A–Z" icon={<ArrowDownAZ className="w-3 h-3" />} />
                  </div>
                </div>
              )}

              {scopedSignups.length === 0 ? (
                <div className="bg-bg-card rounded-2xl border border-border-custom p-10 text-center">
                  <ClipboardList className="w-10 h-10 text-ink-light/40 mx-auto mb-3" />
                  <p className="font-display text-base text-ink mb-1">No signups yet.</p>
                  <p className="text-xs text-ink-light italic max-w-sm mx-auto">
                    When volunteers complete the public signup form, they'll show up here with
                    their contact info — ready for you to plan the week.
                  </p>
                  <Link
                    to="/signup"
                    className="inline-flex items-center gap-1.5 mt-4 px-4 h-10 bg-lime text-occ-green-dark font-semibold rounded-xl hover:bg-lime-dark hover:text-white transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Test the signup flow
                  </Link>
                </div>
              ) : (
                <motion.ul
                  initial="hidden"
                  animate="show"
                  variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
                  className="grid grid-cols-1 lg:grid-cols-2 gap-3"
                >
                  {filteredSignups.map((s) => (
                    <SignupCard
                      key={s.id}
                      signup={s}
                      isDuplicate={duplicateIds.has(s.id)}
                      isPiiBlurred={piiBlurredGlobal && !revealedIds.has(s.id)}
                      onToggleReveal={() => toggleRevealRow(s.id)}
                      onRemove={() => removeSignup(s.id)}
                    />
                  ))}
                </motion.ul>
              )}
            </section>
          </>
        )}
      </div>

      <AnimatePresence>
        {blockingDate && (
          <BlockDaySheet
            date={blockingDate}
            time={dayTimes[blockingDate] ?? ''}
            onCancel={() => setBlockingDate(null)}
            onSave={(coveredBy, note) => addBlock(blockingDate, coveredBy, note)}
          />
        )}
      </AnimatePresence>
    </Layout>
  );
}

// ─── Day card ───────────────────────────────────────────────────────────────
function DayCard({
  day, time, block, isToday, isPast, isEditingTime,
  onBlock, onReopen, onStartEditTime, onSaveTime, onCancelEditTime,
}: {
  day: typeof COLLECTION_DAYS[number];
  time: string;
  block?: DayBlock;
  isToday: boolean;
  isPast: boolean;
  isEditingTime: boolean;
  onBlock: () => void;
  onReopen: () => void;
  onStartEditTime: () => void;
  onSaveTime: (value: string) => void;
  onCancelEditTime: () => void;
}) {
  const blocked = !!block;
  const [draftTime, setDraftTime] = useState(time);
  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
      className={`relative bg-bg-card rounded-2xl border p-4 transition-all ${
        blocked ? 'border-gold/40 bg-gold-light/30'
          : isToday ? 'border-sp-red/40'
          : 'border-border-custom hover:border-occ-green/40'
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-ink-light">
            {day.weekday}
          </p>
          <p className="font-display text-3xl text-ink tabular-nums leading-none mt-0.5">
            {day.monthDay}
          </p>
          <p className="text-[10px] text-ink-light mt-0.5 font-medium">Nov 2026</p>
        </div>
        {isToday && (
          <span className="text-[9px] font-bold uppercase tracking-wider text-sp-red bg-white px-2 py-0.5 rounded-full border border-sp-red flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-sp-red animate-pulse-live" />
            Today
          </span>
        )}
        {isPast && !isToday && (
          <span className="text-[9px] font-bold uppercase tracking-wider text-ink-light/60">
            Past
          </span>
        )}
      </div>

      {isEditingTime ? (
        <div className="mb-3 flex items-center gap-1.5">
          <input
            autoFocus
            value={draftTime}
            onChange={(e) => setDraftTime(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSaveTime(draftTime);
              if (e.key === 'Escape') onCancelEditTime();
            }}
            placeholder="e.g. 9 AM – 12 Noon"
            className="flex-1 h-8 px-2 text-xs tabular-nums bg-bg-primary border border-sp-red rounded-lg focus:outline-none text-ink"
          />
          <button
            onClick={() => onSaveTime(draftTime)}
            className="px-2 h-8 bg-occ-green text-white text-[10px] font-bold rounded-lg uppercase tracking-wider"
          >Save</button>
          <button
            onClick={onCancelEditTime}
            className="px-2 h-8 text-[10px] font-bold text-ink-light uppercase tracking-wider"
          >Cancel</button>
        </div>
      ) : (
        <button
          onClick={onStartEditTime}
          disabled={isPast}
          className="text-xs text-ink-light tabular-nums mb-3 hover:text-sp-red transition-colors flex items-center gap-1 group disabled:hover:text-ink-light disabled:cursor-default"
        >
          <span>{time}</span>
          {!isPast && (
            <Pencil className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </button>
      )}

      {blocked ? (
        <>
          <div className="bg-white rounded-xl border border-gold/30 px-3 py-2 mb-3">
            <p className="text-[9px] font-bold uppercase tracking-wider text-gold mb-0.5 flex items-center gap-1">
              <CalendarOff className="w-2.5 h-2.5" />
              Covered by
            </p>
            <p className="text-sm font-semibold text-ink leading-tight">{block.coveredBy}</p>
            {block.note && (
              <p className="text-[10px] text-ink-light italic mt-1">{block.note}</p>
            )}
          </div>
          <button
            onClick={onReopen}
            disabled={isPast}
            className="w-full h-9 text-xs font-semibold text-gold hover:text-sp-red flex items-center justify-center gap-1.5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Unlock className="w-3 h-3" />
            Reopen this day
          </button>
        </>
      ) : (
        <>
          <p className="text-[10px] font-bold uppercase tracking-wider text-occ-green mb-3 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-occ-green" />
            Open for signups
          </p>
          <button
            onClick={onBlock}
            disabled={isPast}
            className="w-full h-9 bg-bg-primary border border-border-custom text-ink text-xs font-semibold rounded-lg hover:bg-gold-light hover:border-gold hover:text-gold transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Lock className="w-3 h-3" />
            Block out this day
          </button>
        </>
      )}
    </motion.div>
  );
}

// ─── Signup card ────────────────────────────────────────────────────────────
function SignupCard({
  signup, isDuplicate, isPiiBlurred, onToggleReveal, onRemove,
}: {
  signup: StoredSignup;
  isDuplicate?: boolean;
  isPiiBlurred?: boolean;
  onToggleReveal?: () => void;
  onRemove: () => void;
}) {
  const initials = signup.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  // Tailwind doesn't easily blur text without affecting layout. We use
  // a CSS filter so the row keeps its dimensions; hover reveals to make
  // the admin's intent explicit (no accidental drive-by reads).
  const blurClass = isPiiBlurred
    ? 'blur-sm select-none hover:blur-none transition-all cursor-pointer'
    : '';
  return (
    <motion.li
      variants={{
        hidden: { opacity: 0, y: 12 },
        show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
      }}
      className="bg-bg-card rounded-2xl border border-border-custom p-4 hover:shadow-card transition-shadow"
    >
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-full bg-sp-red text-white flex items-center justify-center font-display text-lg leading-none shrink-0">
          {initials || '?'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-display text-base text-ink truncate leading-tight">{signup.name}</h3>
              <p className="text-[11px] text-ink-light mt-0.5">Signed up {timeAgo(signup.submittedAt)}</p>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              {signup.firstTime && (
                <span className="text-[9px] font-bold uppercase tracking-wider text-lime-dark bg-lime-light px-2 py-0.5 rounded-full whitespace-nowrap">
                  First-Timer
                </span>
              )}
              {signup.lastEditedBy === 'self' && signup.lastEditedAt && (
                <span
                  className="text-[9px] font-bold uppercase tracking-wider text-occ-green bg-occ-green-light px-2 py-0.5 rounded-full whitespace-nowrap"
                  title={`Volunteer self-edited via magic link · ${new Date(signup.lastEditedAt).toLocaleString()}`}
                >
                  Self-edited · {timeAgo(signup.lastEditedAt)}
                </span>
              )}
              {isDuplicate && (
                <span
                  className="text-[9px] font-bold uppercase tracking-wider text-gold bg-gold-light px-2 py-0.5 rounded-full whitespace-nowrap"
                  title="Email or phone matches another signup — possible duplicate"
                >
                  ⚠ Duplicate
                </span>
              )}
            </div>
          </div>

          <div
            className="mt-3 grid grid-cols-1 gap-1.5 text-[11px]"
            onClick={isPiiBlurred ? onToggleReveal : undefined}
          >
            <a
              href={isPiiBlurred ? undefined : `tel:${signup.phone}`}
              className={`flex items-center gap-1.5 text-ink-light hover:text-sp-red transition-colors tabular-nums ${blurClass}`}
              onClick={(e) => { if (isPiiBlurred) e.preventDefault(); }}
            >
              <Phone className="w-3 h-3 shrink-0 not-blurred" />
              <span>{signup.phone}</span>
            </a>
            <a
              href={isPiiBlurred ? undefined : `mailto:${signup.email}`}
              className={`flex items-center gap-1.5 text-ink-light hover:text-sp-red transition-colors truncate ${blurClass}`}
              onClick={(e) => { if (isPiiBlurred) e.preventDefault(); }}
            >
              <Mail className="w-3 h-3 shrink-0" />
              <span className="truncate">{signup.email}</span>
            </a>
          </div>

          {(signup.shirtSize || signup.emergencyName || signup.notes) && (
            <div className="mt-3 pt-3 border-t border-border-custom/60 space-y-2 text-[11px] text-ink-light">
              {signup.shirtSize && (
                <p><span className="font-semibold text-ink uppercase tracking-wider text-[9px]">Shirt:</span> {signup.shirtSize}</p>
              )}
              {signup.emergencyName && (
                <p
                  className={`flex items-start gap-1.5 ${blurClass}`}
                  onClick={isPiiBlurred ? onToggleReveal : undefined}
                >
                  <Shield className="w-3 h-3 shrink-0 mt-0.5" />
                  <span><span className="font-semibold text-ink">{signup.emergencyName}</span>{signup.emergencyPhone && ` · ${signup.emergencyPhone}`}</span>
                </p>
              )}
              {signup.notes && (
                <p className="flex items-start gap-1.5 italic">
                  <MessageCircle className="w-3 h-3 shrink-0 mt-0.5" />
                  <span>{signup.notes}</span>
                </p>
              )}
            </div>
          )}
        </div>
        <button
          onClick={onRemove}
          className="touch-target text-ink-light/60 hover:text-sp-red transition-colors shrink-0 print-hide"
          aria-label={`Remove ${signup.name}`}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </motion.li>
  );
}

// ─── Sort chip ──────────────────────────────────────────────────────────────
function SortChip({ active, onClick, label, icon }: { active: boolean; onClick: () => void; label: string; icon: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${
        active ? 'bg-ink text-white' : 'text-ink-light hover:text-ink'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

// ─── Stat tile ──────────────────────────────────────────────────────────────
function StatTile({ icon: Icon, label, value, bg, color }: { icon: typeof ClipboardList; label: string; value: string; bg: string; color: string }) {
  return (
    <div className={`${bg} rounded-2xl p-3`}>
      <Icon className={`w-4 h-4 ${color} mb-1`} />
      <p className={`font-display text-2xl ${color} tabular-nums leading-none`}>{value}</p>
      <p className="text-[10px] text-ink-light mt-1 uppercase tracking-wider">{label}</p>
    </div>
  );
}

// ─── Day-of attendance ─────────────────────────────────────────────────────
// Live tally of who's arrived at the welcome table today. The Greeter taps
// each volunteer as they walk in. Default open when nobody has arrived yet
// (i.e., the start of the day); collapsible once a few are marked.
function AttendanceSection({
  signups, onMarkArrived, onUnmarkArrived, todayISODate,
}: {
  signups: StoredSignup[];
  onMarkArrived: (id: string) => void;
  onUnmarkArrived: (id: string) => void;
  todayISODate: string;
}) {
  // Sort: not-yet-arrived first (so greeter can tap quickly), then arrived
  // in descending arrival order (most recent on top).
  const sorted = [...signups].sort((a, b) => {
    const aArrived = !!a.arrivedAt;
    const bArrived = !!b.arrivedAt;
    if (aArrived !== bArrived) return aArrived ? 1 : -1;
    if (aArrived && bArrived) {
      return (b.arrivedAt ?? '').localeCompare(a.arrivedAt ?? '');
    }
    return a.name.localeCompare(b.name);
  });
  const arrivedCount = signups.filter(
    (s) => s.arrivedAt && s.arrivedAt.slice(0, 10) === todayISODate,
  ).length;
  const pendingCount = signups.length - arrivedCount;

  return (
    <section className="print-hide">
      <header className="mb-3 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-display text-xl text-ink leading-tight flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-occ-green" />
            Welcome Table
          </h2>
          <p className="text-xs text-ink-light italic mt-1">
            Tap each volunteer as they arrive. {arrivedCount} of {signups.length} checked in today.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/welcome-table"
            className="text-[10px] font-bold uppercase tracking-wider text-sp-red hover:underline flex items-center gap-1"
          >
            iPad mode
            <ChevronRight className="w-3 h-3" />
          </Link>
          <Link
            to="/clock"
            className="text-[10px] font-bold uppercase tracking-wider text-ink-light hover:text-sp-red flex items-center gap-1"
          >
            Clock kiosk
            <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </header>
      <div className="bg-bg-card rounded-2xl border border-border-custom overflow-hidden">
        {/* Progress bar — visual gauge of attendance rate */}
        <div className="h-1.5 bg-bg-primary w-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${signups.length === 0 ? 0 : (arrivedCount / signups.length) * 100}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="h-full bg-occ-green"
          />
        </div>
        <ul className="divide-y divide-border-custom/60 max-h-96 overflow-y-auto">
          {sorted.map((s) => {
            const arrived = !!s.arrivedAt && s.arrivedAt.slice(0, 10) === todayISODate;
            const arrivedTime = s.arrivedAt
              ? new Date(s.arrivedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
              : null;
            return (
              <li
                key={s.id}
                className={`flex items-center gap-3 px-4 py-2.5 ${
                  arrived ? 'bg-occ-green-light/40' : ''
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-display text-sm leading-none shrink-0 ${
                    arrived ? 'bg-occ-green text-white' : 'bg-sp-red text-white'
                  }`}
                >
                  {arrived ? <CheckCircle2 className="w-4 h-4" /> : s.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink truncate">{s.name}</p>
                  <p className="text-[11px] text-ink-light truncate">
                    {arrived ? (
                      <>
                        Arrived <span className="font-semibold text-occ-green">{arrivedTime}</span>
                      </>
                    ) : (
                      <>
                        <span className="tabular-nums">{s.phone}</span>
                        {s.firstTime ? <span className="text-lime-dark"> · First-Timer</span> : null}
                      </>
                    )}
                  </p>
                </div>
                {arrived ? (
                  <button
                    onClick={() => onUnmarkArrived(s.id)}
                    className="h-9 px-3 bg-bg-primary border border-border-custom hover:border-sp-red hover:text-sp-red text-ink-light text-xs font-bold rounded-lg flex items-center gap-1.5 uppercase tracking-wider transition-all"
                    title="Undo arrival"
                  >
                    <UserX className="w-3 h-3" />
                    Undo
                  </button>
                ) : (
                  <button
                    onClick={() => onMarkArrived(s.id)}
                    className="h-9 px-3 bg-lime hover:bg-lime-dark text-occ-green-dark hover:text-white text-xs font-bold rounded-lg flex items-center gap-1.5 uppercase tracking-wider transition-colors"
                  >
                    <UserCheck className="w-3 h-3" />
                    Arrived
                  </button>
                )}
              </li>
            );
          })}
        </ul>
        {pendingCount === 0 && signups.length > 0 && (
          <div className="p-4 bg-occ-green-light/50 text-center border-t border-border-custom/60">
            <p className="text-sm font-display text-occ-green-dark">
              <CheckCircle2 className="w-4 h-4 inline -mt-0.5 mr-1" />
              Everyone&apos;s here.
            </p>
            <p className="text-[11px] text-ink-light italic mt-0.5">Full house — go pack some boxes.</p>
          </div>
        )}
      </div>
    </section>
  );
}

// ─── Block-day bottom sheet ─────────────────────────────────────────────────
function BlockDaySheet({
  date, time, onCancel, onSave,
}: {
  date: string;
  time: string;
  onCancel: () => void;
  onSave: (coveredBy: string, note: string) => void;
}) {
  const [coveredBy, setCoveredBy] = useState('');
  const [note, setNote] = useState('');
  const day = COLLECTION_DAYS.find((d) => d.date === date);
  const canSave = coveredBy.trim().length > 0;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-navy/50 z-50"
        onClick={onCancel}
      />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'tween', duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="fixed bottom-0 left-0 right-0 z-50 bg-bg-card rounded-t-3xl shadow-card-elevated max-h-[90vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-bg-card border-b border-border-custom px-5 py-4 flex items-center justify-between rounded-t-3xl">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-sp-red">Block out this day</p>
            <p className="font-display text-xl text-ink leading-none mt-1">
              {day?.weekday}, Nov {day?.monthDay}
            </p>
            <p className="text-[11px] text-ink-light tabular-nums mt-0.5">{time}</p>
          </div>
          <button onClick={onCancel} className="touch-target text-ink-light hover:text-sp-red" aria-label="Cancel">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="bg-gold-light rounded-xl p-3 flex items-start gap-2 text-xs text-ink">
            <AlertCircle className="w-4 h-4 text-gold shrink-0 mt-0.5" />
            <p>
              Blocking a day means it's <strong>already covered</strong> by a group, so individual
              volunteers won't be needed. They can still sign up for other days.
            </p>
          </div>

          <label className="block">
            <span className="text-[11px] font-bold text-ink-light uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Users className="w-3 h-3" /> Who's covering this day? <span className="text-sp-red">*</span>
            </span>
            <input
              autoFocus
              value={coveredBy}
              onChange={(e) => setCoveredBy(e.target.value)}
              placeholder="e.g. First Baptist Youth Group"
              className="w-full h-12 px-4 bg-bg-primary border border-border-custom rounded-xl text-base text-ink placeholder:text-ink-light/50 focus:outline-none focus:border-sp-red transition-colors"
            />
          </label>

          <label className="block">
            <span className="text-[11px] font-bold text-ink-light uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <MessageCircle className="w-3 h-3" /> Note (optional)
            </span>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. 12 students + 3 chaperones"
              className="w-full h-12 px-4 bg-bg-primary border border-border-custom rounded-xl text-sm text-ink placeholder:text-ink-light/50 focus:outline-none focus:border-sp-red transition-colors"
            />
          </label>

          <button
            onClick={() => canSave && onSave(coveredBy, note)}
            disabled={!canSave}
            className="w-full h-14 bg-lime hover:bg-lime-dark transition-colors text-occ-green-dark hover:text-white text-base font-display rounded-2xl flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-card"
          >
            <Lock className="w-4 h-4" />
            Block out {day?.weekday} Nov {day?.monthDay}
          </button>
        </div>
      </motion.div>
    </>
  );
}

// ─── Role gate explainer ────────────────────────────────────────────────────
function NotForYourRoleCard({ role }: { role: string | null }) {
  const backTo =
    role === 'greeter' ? '/checkin'
    : role === 'do_leader' ? '/totals'
    : role === 'cdo_leader' ? '/'
    : '/';
  const backLabel =
    role === 'greeter' ? 'Back to Check-In'
    : role === 'do_leader' ? 'Back to My Totals'
    : 'Back to Dashboard';
  return (
    <div className="bg-bg-card rounded-2xl border border-border-custom overflow-hidden">
      <div className="bg-gradient-to-br from-sp-red-light to-bg-primary px-5 py-4 flex items-center gap-3 border-b border-border-custom">
        <ClipboardList className="w-6 h-6 text-sp-red" />
        <div>
          <h2 className="font-display text-base text-ink">Volunteer information is private.</h2>
          <p className="text-[11px] text-ink-light mt-0.5 italic">Restricted to Samaritan's Purse leadership.</p>
        </div>
      </div>
      <div className="p-5 space-y-3 text-sm text-ink-light leading-relaxed">
        <p>
          Individual volunteer contact information — names, phone numbers, emails,
          emergency contacts — is only visible to <strong className="text-ink">Super
          Admin, SP Admin, and Regional Admin</strong> roles. This protects the
          privacy of everyone who signs up to serve.
        </p>
        <p>
          If you need to coordinate volunteers for your location, contact your
          Regional Office. They'll route the right names to your team.
        </p>
        <div className="pt-1">
          <Link
            to={backTo}
            className="inline-flex h-11 px-5 bg-sp-red text-white text-sm font-semibold rounded-xl items-center justify-center hover:bg-sp-red-dark transition-colors"
          >
            {backLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}

// Unused but exported to prevent dead-import warnings if someone re-imports.
export const _UNUSED_ICONS = { CheckCircle2, Plus };
