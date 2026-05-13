import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ClipboardList, Lock, Unlock, Sparkles, ChevronRight,
  Search, Mail as MailIcon, RotateCcw, Printer, Download, ArrowDownAZ, ArrowDown01,
  UserCheck, Eye, EyeOff, Upload,
} from 'lucide-react';
import Layout from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import {
  COLLECTION_DAYS,
  COLLECTION_DAY,
  DEFAULT_DAY_TIMES,
  getLocationById,
} from '@/data/mockData';
import type { DayBlock, StoredSignup } from '@/data/mockData';
import { findDuplicateSignups, signupInScopeForUser, DEFAULT_CDO_ID, LOCATIONS, defaultTokenExpiry } from '@/data/mockData';
import { logAuditEvent } from '@/lib/auditLog';
import { sendMessage, buildArrivalConfirmation } from '@/lib/outbox';
import BulkImportDialog from '@/components/BulkImportDialog';
import TransferDialog from '@/components/TransferDialog';
import { logSecuritySignal } from '@/lib/security';
import { useNoIndex } from '@/hooks/useNoIndex';
import { getFirstName } from '@/lib/name';
import { useTranslation } from '@/lib/i18n';

// Extracted sub-components (Phase 34a refactor).
import { DayCard } from '@/pages/Signups/DayCard';
import { SignupCard } from '@/pages/Signups/SignupCard';
import { AttendanceSection } from '@/pages/Signups/AttendanceSection';
import { BlockDaySheet } from '@/pages/Signups/BlockDaySheet';
import { NotForYourRoleCard } from '@/pages/Signups/NotForYourRoleCard';

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
  const { t } = useTranslation();
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
  const [importOpen, setImportOpen] = useState<boolean>(false);
  const [transferTarget, setTransferTarget] = useState<StoredSignup | null>(null);

  function handleBulkImport(imported: StoredSignup[], filename: string) {
    setSignups((prev) => [...imported, ...prev]);
    logAuditEvent(actor, 'volunteer_signup_created', `bulk-import:${filename}`, `Bulk imported ${imported.length} signups`);
  }

  function handleTransfer(signupId: string, _fromId: string, toId: string) {
    setSignups((prev) =>
      prev.map((s) => (s.id === signupId ? { ...s, locationId: toId } : s)),
    );
  }

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
      let s = String(v).replace(/"/g, '""');
      // Defuse Excel/Sheets formula injection — if the value starts with
      // = + - @ TAB or CR, prefix with an apostrophe so spreadsheets render
      // it as text instead of evaluating it. Audit P1.30.
      if (/^[=+\-@\t\r]/.test(s)) s = `\'${s}`;
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

  // Resend: keep the existing editToken, just send a fresh email with the
  // same link. Used when the volunteer says "I can't find my link."
  function resendMagicLink(id: string) {
    const target = signups.find((s) => s.id === id);
    if (!target || !target.editToken) return;
    const origin = typeof window !== 'undefined'
      ? window.location.origin + window.location.pathname.replace(/\/$/, '')
      : '';
    const url = `${origin}#/my-signup?token=${target.editToken}`;
    sendMessage({
      kind: 'signup_confirmation',
      channel: 'email',
      to: target.email,
      toName: target.name,
      subject: 'Your edit link (resent) — Operation Christmas Child',
      body: `Hi ${getFirstName(target.name)},\n\nHere\'s your edit link, resent at your request:\n\n${url}\n\nThis link is private — anyone with it can edit your signup. Bookmark it.\n\nSamaritan\'s Purse · Operation Christmas Child`,
      relatedTarget: `signup:${id}`,
    });
    logAuditEvent(actor, 'email_all', `signup:${id}`, `Resent existing magic link to ${target.name} (${target.email})`);
  }

  // Reissue: mint a NEW editToken, invalidating the old. Used when the
  // volunteer suspects their link was compromised (e.g. forwarded by
  // accident, shared with a stranger). Old link immediately stops working.
  function reissueMagicLink(id: string) {
    const target = signups.find((s) => s.id === id);
    if (!target) return;
    const confirmed = window.confirm(
      `Reissue magic link for ${target.name}?\n\nThe OLD link will stop working immediately. The volunteer must use the NEW link from the email we send them.\n\nUse this only if you suspect their link was leaked or shared. For a routine "I lost my link" — use Resend instead.\n\nContinue?`,
    );
    if (!confirmed) return;
    const newToken =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `tok_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
    const now = new Date().toISOString();
    setSignups((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...s, editToken: newToken, editTokenExpiresAt: defaultTokenExpiry(now) }
          : s,
      ),
    );
    const origin = typeof window !== 'undefined'
      ? window.location.origin + window.location.pathname.replace(/\/$/, '')
      : '';
    const url = `${origin}#/my-signup?token=${newToken}`;
    sendMessage({
      kind: 'signup_confirmation',
      channel: 'email',
      to: target.email,
      toName: target.name,
      subject: 'NEW edit link (security reissue) — Operation Christmas Child',
      body: `Hi ${getFirstName(target.name)},\n\nYour Central Drop-off Leader has issued you a fresh edit link. The OLD link no longer works.\n\nHere is your NEW link:\n\n${url}\n\nIf you did not request this, please contact your Central Drop-off Leader immediately.\n\nSamaritan\'s Purse · Operation Christmas Child`,
      relatedTarget: `signup:${id}`,
    });
    logAuditEvent(actor, 'volunteer_self_edit', `signup:${id}`, `REISSUED magic link for ${target.name} — old token revoked`);
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
              {t('signupsAdmin.kicker')}
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
                  {t('signupsAdmin.locked.title')}
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
                      onClick={() => setImportOpen(true)}
                      className="h-9 px-3 bg-bg-primary border border-border-custom hover:border-purple-accent hover:text-purple-accent text-ink-light text-xs font-bold rounded-xl flex items-center gap-1.5 uppercase tracking-wider transition-all"
                    >
                      <Upload className="w-3 h-3" />
                      Import
                    </button>
                    <button
                      onClick={downloadCSV}
                      className="h-9 px-3 bg-bg-primary border border-border-custom hover:border-blue-accent hover:text-blue-accent text-ink-light text-xs font-bold rounded-xl flex items-center gap-1.5 uppercase tracking-wider transition-all"
                    >
                      <Download className="w-3 h-3" />
                      Export
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
                  <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
                    <Link
                      to="/signup"
                      className="inline-flex items-center gap-1.5 px-4 h-10 bg-lime text-occ-green-dark font-semibold rounded-xl hover:bg-lime-dark hover:text-white transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Test the signup flow
                    </Link>
                    <button
                      onClick={() => setImportOpen(true)}
                      className="inline-flex items-center gap-1.5 px-4 h-10 bg-purple-light text-purple-accent font-semibold rounded-xl hover:bg-purple-accent hover:text-white transition-colors"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Import from CSV
                    </button>
                  </div>
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
                      onResendLink={() => resendMagicLink(s.id)}
                      onReissueLink={() => reissueMagicLink(s.id)}
                      onTransfer={() => setTransferTarget(s)}
                      onRemove={() => removeSignup(s.id)}
                    />
                  ))}
                </motion.ul>
              )}
            </section>
          </>
        )}
      </div>

      <BulkImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={handleBulkImport}
        existingSignups={signups}
        actor={user}
      />

      <TransferDialog
        open={!!transferTarget}
        signup={transferTarget}
        onClose={() => setTransferTarget(null)}
        onTransfer={handleTransfer}
        actor={user}
      />

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
