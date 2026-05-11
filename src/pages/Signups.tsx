import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardList, Calendar, Users, Lock, Unlock, CalendarOff, Plus, X, Phone, Mail,
  CheckCircle2, AlertCircle, Shield, Sparkles, ChevronRight, MessageCircle, Trash2,
  Pencil, Search, Mail as MailIcon, RotateCcw, Printer,
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
import type { DayBlock } from '@/data/mockData';

// Mirrors StoredSignup from VolunteerSignup.tsx. Consumer-only here.
interface StoredSignup {
  id: string;
  name: string;
  email: string;
  phone: string;
  zip?: string;
  firstTime: boolean | null;
  shirtSize: string;
  emergencyName: string;
  emergencyPhone: string;
  notes: string;
  submittedAt: string;
  agree?: boolean;
}

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
  const { user, isCDOLeader } = useAuth();
  const cdoLabel = getLocationById('cdo1')?.name ?? 'Central Drop-off';
  const [signups, setSignups] = useLocalStorage<StoredSignup[]>('occ:signups', []);
  const [blocks, setBlocks] = useLocalStorage<DayBlock[]>('occ:day-blocks', SEED_BLOCKS);
  const [dayTimes, setDayTimes] = useLocalStorage<Record<string, string>>('occ:day-times', DEFAULT_DAY_TIMES);
  const [blockingDate, setBlockingDate] = useState<string | null>(null);
  const [editingTimeDate, setEditingTimeDate] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  function updateDayTime(date: string, value: string) {
    setDayTimes((prev) => ({ ...prev, [date]: value }));
    setEditingTimeDate(null);
  }

  function resetDayTimes() {
    setDayTimes(DEFAULT_DAY_TIMES);
  }

  function clearAllSignups() {
    if (signups.length === 0) return;
    if (confirm(`Remove all ${signups.length} signups? This cannot be undone.`)) {
      setSignups([]);
    }
  }

  function emailAllSignups() {
    const emails = signups.map((s) => s.email).filter(Boolean).join(',');
    if (!emails) return;
    window.location.href = `mailto:?bcc=${encodeURIComponent(emails)}&subject=${encodeURIComponent('Collection Week 2026 — Volunteer Update')}`;
  }

  const filteredSignups = signups.filter((s) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [s.name, s.email, s.phone, s.notes, s.emergencyName].some((f) =>
      f?.toLowerCase().includes(q)
    );
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
  }

  function reopenDay(date: string) {
    setBlocks((prev) => prev.filter((b) => b.date !== date));
  }

  function removeSignup(id: string) {
    setSignups((prev) => prev.filter((s) => s.id !== id));
  }

  const openDays = COLLECTION_DAYS.length - blocks.length;
  const upcomingDays = COLLECTION_DAYS.filter((_, i) => i + 1 >= COLLECTION_DAY).length;
  const upcomingOpenDays = COLLECTION_DAYS.filter((d, i) => i + 1 >= COLLECTION_DAY && !blocksByDate.has(d.date)).length;

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
        {/* Hero */}
        <header className="flex items-start justify-between gap-3">
          <div className="space-y-2 pt-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-sp-red">
              Signups & Schedule
            </p>
            <h1 className="font-display text-3xl sm:text-4xl text-ink leading-[1.05] tracking-tight">
              Plan the week.
              <span className="font-display-italic block text-sp-red mt-1">
                {signups.length} {signups.length === 1 ? 'volunteer' : 'volunteers'} ready.
              </span>
            </h1>
            <p className="text-sm text-ink-light italic">
              {cdoLabel} · {upcomingOpenDays} of {upcomingDays} upcoming days still open for signups
            </p>
          </div>
          <span className="text-[10px] font-bold text-sp-red bg-sp-red-light px-2 py-1 rounded-full uppercase tracking-wider whitespace-nowrap shrink-0 mt-1 print-hide">
            CDO Only
          </span>
        </header>

        {!isCDOLeader && <NotForYourRoleCard role={user?.role ?? null} />}

        {isCDOLeader && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print-hide">
              <StatTile icon={ClipboardList} label="Pending Signups" value={String(signups.length)} bg="bg-sp-red-light" color="text-sp-red" />
              <StatTile icon={Unlock} label="Open Days" value={String(openDays)} bg="bg-occ-green-light" color="text-occ-green" />
              <StatTile icon={Lock} label="Covered Days" value={String(blocks.length)} bg="bg-gold-light" color="text-gold" />
              <StatTile icon={Calendar} label="Total Days" value={String(COLLECTION_DAYS.length)} bg="bg-blue-light" color="text-blue-accent" />
            </div>

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
                    {signups.length} {signups.length === 1 ? 'Signup' : 'Signups'}
                  </h2>
                  <p className="text-xs text-ink-light italic mt-1">
                    Volunteers who said they'd serve this Collection Week.
                  </p>
                </div>
                {signups.length > 0 && (
                  <div className="flex items-center gap-2 print-hide">
                    <button
                      onClick={() => window.print()}
                      className="h-9 px-3 bg-bg-primary border border-border-custom hover:border-occ-green hover:text-occ-green text-ink-light text-xs font-bold rounded-xl flex items-center gap-1.5 uppercase tracking-wider transition-all"
                    >
                      <Printer className="w-3 h-3" />
                      Print
                    </button>
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
                {signups.length === 0 && (
                  <Link
                    to="/signup"
                    className="text-xs font-semibold text-sp-red hover:underline flex items-center gap-1"
                  >
                    Test the signup flow <ChevronRight className="w-3 h-3" />
                  </Link>
                )}
              </header>
              {signups.length > 0 && (
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-light/60 pointer-events-none" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search name, email, phone, or notes…"
                    className="w-full h-10 pl-10 pr-3 bg-bg-card border border-border-custom rounded-xl text-sm focus:outline-none focus:border-sp-red transition-colors"
                  />
                </div>
              )}

              {signups.length === 0 ? (
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
                    <SignupCard key={s.id} signup={s} onRemove={() => removeSignup(s.id)} />
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
function SignupCard({ signup, onRemove }: { signup: StoredSignup; onRemove: () => void }) {
  const initials = signup.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
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
            {signup.firstTime && (
              <span className="text-[9px] font-bold uppercase tracking-wider text-lime-dark bg-lime-light px-2 py-0.5 rounded-full whitespace-nowrap">
                First-Timer
              </span>
            )}
          </div>

          <div className="mt-3 grid grid-cols-1 gap-1.5 text-[11px]">
            <a href={`tel:${signup.phone}`} className="flex items-center gap-1.5 text-ink-light hover:text-sp-red transition-colors tabular-nums">
              <Phone className="w-3 h-3 shrink-0" />
              {signup.phone}
            </a>
            <a href={`mailto:${signup.email}`} className="flex items-center gap-1.5 text-ink-light hover:text-sp-red transition-colors truncate">
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
                <p className="flex items-start gap-1.5">
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
  return (
    <div className="bg-bg-card rounded-2xl border border-border-custom overflow-hidden">
      <div className="bg-gradient-to-br from-sp-red-light to-bg-primary px-5 py-4 flex items-center gap-3 border-b border-border-custom">
        <ClipboardList className="w-6 h-6 text-sp-red" />
        <div>
          <h2 className="font-display text-base text-ink">Signups & Schedule is for Central Drop-off Leaders.</h2>
          <p className="text-[11px] text-ink-light mt-0.5 italic">This step isn't part of your role.</p>
        </div>
      </div>
      <div className="p-5 space-y-3 text-sm text-ink-light leading-relaxed">
        <p>
          The CDO Leader manages who's volunteering for the week and blocks out days
          when a group (like a youth ministry) has the day covered. As a{' '}
          {role === 'do_leader' ? 'Drop-off Leader' : role === 'greeter' ? 'Greeter' : 'volunteer'},
          your role kicks in at the welcome table.
        </p>
        <div className="pt-1">
          <Link
            to={role === 'greeter' ? '/checkin' : '/totals'}
            className="inline-flex h-11 px-5 bg-sp-red text-white text-sm font-semibold rounded-xl items-center justify-center hover:bg-sp-red-dark transition-colors"
          >
            {role === 'greeter' ? 'Back to Check-In' : 'Back to My Totals'}
          </Link>
        </div>
      </div>
    </div>
  );
}

// Unused but exported to prevent dead-import warnings if someone re-imports.
export const _UNUSED_ICONS = { CheckCircle2, Plus };
