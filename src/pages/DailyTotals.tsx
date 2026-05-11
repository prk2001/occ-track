import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, ResponsiveContainer, Cell, XAxis, Tooltip } from 'recharts';
import {
  FileText, Send, CheckCircle2, Clock, Lock, Plus, Minus, Trash2, User, Church,
} from 'lucide-react';
import Layout from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import {
  COLLECTION_DAYS,
  COLLECTION_DAY,
  WEEKLY_TOTALS_DEMO,
  SHOEBOX_ENTRIES,
  getLocationById,
} from '@/data/mockData';

interface DailyEntry {
  id: string;
  donorName: string;
  count: number;
  date: string;
  donorType?: 'individual' | 'organization';
  anonymous?: boolean;
}

interface SubmissionLog {
  date: string;
  submittedAt: string;
}

function newId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `t_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

const TODAY = COLLECTION_DAYS[COLLECTION_DAY - 1].date;

export default function DailyTotals() {
  const { user } = useAuth();
  const locationLabel = user?.locationId
    ? getLocationById(user.locationId)?.name ?? 'My Location'
    : 'OCC Drop-off';

  const [entries, updateEntries] = useLocalStorage<DailyEntry[]>('occ:daily-entries', []);
  const [submissions, updateSubmissions] = useLocalStorage<SubmissionLog[]>('occ:daily-submissions', []);
  const [selectedDate, selectDate] = useState<string>(TODAY);
  const [newName, changeName] = useState('');
  const [newCount, changeCount] = useState(1);
  const [newType, changeType] = useState<'individual' | 'organization'>('individual');

  // For "today" (Day 4), entries come from local additions PLUS the live
  // SHOEBOX_ENTRIES seed data. For past days, we synthesize a single totals
  // row so the demo shows a populated week.
  const isToday = selectedDate === TODAY;
  const isPast = COLLECTION_DAYS.findIndex(d => d.date === selectedDate) < COLLECTION_DAY - 1;
  const isFuture = COLLECTION_DAYS.findIndex(d => d.date === selectedDate) > COLLECTION_DAY - 1;
  const isSubmitted = submissions.some((s) => s.date === selectedDate);

  const todaysEntries = useMemo(() => {
    if (!isToday) return [];
    const seeded: DailyEntry[] = SHOEBOX_ENTRIES.map((e) => ({
      id: e.id,
      donorName: e.donorName,
      count: e.count,
      date: e.date,
      donorType: 'individual' as const,
    })).filter((e) => e.date === TODAY);
    return [...entries.filter((e) => e.date === TODAY), ...seeded];
  }, [entries, isToday]);

  const selectedTotal = useMemo(() => {
    if (isToday) return todaysEntries.reduce((s, e) => s + e.count, 0);
    const idx = COLLECTION_DAYS.findIndex((d) => d.date === selectedDate);
    return WEEKLY_TOTALS_DEMO[idx] ?? 0;
  }, [isToday, todaysEntries, selectedDate]);

  const weeklyChart = useMemo(
    () => COLLECTION_DAYS.map((d, i) => ({
      label: d.weekday,
      day: d.monthDay,
      value: i === COLLECTION_DAY - 1
        ? todaysEntries.reduce((s, e) => s + e.count, 0)
        : WEEKLY_TOTALS_DEMO[i] ?? 0,
      isToday: i === COLLECTION_DAY - 1,
    })),
    [todaysEntries],
  );

  const weekTotal = weeklyChart.reduce((s, d) => s + d.value, 0);

  function addEntry() {
    if (!newName.trim() || newCount < 1) return;
    const entry: DailyEntry = {
      id: newId(),
      donorName: newName.trim(),
      count: newCount,
      date: TODAY,
      donorType: newType,
    };
    updateEntries((prev) => [entry, ...prev]);
    changeName('');
    changeCount(1);
  }

  function removeEntry(id: string) {
    updateEntries((prev) => prev.filter((e) => e.id !== id));
  }

  function submitDay() {
    if (isSubmitted) return;
    updateSubmissions((prev) => [...prev, { date: selectedDate, submittedAt: new Date().toISOString() }]);
  }

  const selectedDay = COLLECTION_DAYS.find((d) => d.date === selectedDate)!;

  return (
    <Layout>
      <div className="px-4 py-4 max-w-4xl mx-auto space-y-6 pb-24">
        {/* Editorial hero */}
        <header className="space-y-2 pt-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-sp-red">
            Drop-off Form · Daily Totals
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-medium text-ink leading-tight tracking-tight">
            {selectedDay.weekday}, Nov {selectedDay.monthDay}
            <span className="font-display-italic text-ink-light/70 text-2xl sm:text-3xl"> · Day {selectedDay.index}</span>
          </h1>
          <p className="text-sm text-ink-light italic">{locationLabel}</p>
        </header>

        {/* Day pill selector */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">
          {COLLECTION_DAYS.map((d) => {
            const active = d.date === selectedDate;
            const isTodayPill = d.date === TODAY;
            const submitted = submissions.some((s) => s.date === d.date);
            return (
              <button
                key={d.date}
                onClick={() => selectDate(d.date)}
                className={`flex-shrink-0 flex flex-col items-center justify-center w-14 h-16 rounded-2xl transition-all relative ${
                  active
                    ? 'bg-sp-red text-white shadow-card'
                    : isTodayPill
                    ? 'bg-bg-card border-2 border-sp-red text-ink'
                    : 'bg-bg-card border border-border-custom text-ink-light'
                }`}
              >
                <span className="text-[10px] font-medium uppercase tracking-wider opacity-80">{d.weekday}</span>
                <span className={`text-lg font-bold tabular-nums leading-none mt-0.5 ${active ? 'text-white' : 'text-ink'}`}>{d.monthDay}</span>
                {submitted && (
                  <CheckCircle2 className="absolute -top-1 -right-1 w-4 h-4 text-occ-green bg-bg-primary rounded-full" />
                )}
              </button>
            );
          })}
        </div>

        {/* Big total card */}
        <motion.section
          key={selectedDate}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-bg-card rounded-2xl shadow-card border border-border-custom p-6"
        >
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-light">Day Total</p>
              <p className="font-display text-6xl font-medium text-ink tabular-nums leading-none mt-1">
                {selectedTotal}
              </p>
              <p className="text-sm text-ink-light mt-1.5">
                {selectedTotal === 1 ? 'shoebox' : 'shoeboxes'} for {selectedDay.weekday}, Nov {selectedDay.monthDay}
              </p>
            </div>
            <StatusBadge isFuture={isFuture} isPast={isPast} isToday={isToday} isSubmitted={isSubmitted} />
          </div>
        </motion.section>

        {/* Today: live entries + add */}
        {isToday && !isSubmitted && (
          <>
            <section className="bg-bg-card rounded-2xl shadow-card border border-border-custom p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-medium text-ink">Add an Entry</h2>
                <p className="text-[10px] text-ink-light uppercase tracking-wider">Quick entry</p>
              </div>
              <div className="grid grid-cols-2 gap-2 p-1 bg-bg-primary rounded-2xl">
                <TypeBtn active={newType === 'individual'} onClick={() => changeType('individual')} icon={<User className="w-4 h-4" />} label="Individual" />
                <TypeBtn active={newType === 'organization'} onClick={() => changeType('organization')} icon={<Church className="w-4 h-4" />} label="Organization" />
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <input
                  value={newName}
                  onChange={(e) => changeName(e.target.value)}
                  placeholder={newType === 'organization' ? 'Organization name' : 'Donor name'}
                  className="h-12 px-4 bg-bg-primary border border-border-custom rounded-xl text-base text-ink placeholder:text-ink-light/60 focus:outline-none focus:border-sp-red transition-colors"
                />
                <div className="flex items-center bg-bg-primary border border-border-custom rounded-xl">
                  <button onClick={() => changeCount(Math.max(1, newCount - 1))} className="w-10 h-12 text-ink hover:text-sp-red"><Minus className="w-4 h-4 mx-auto" /></button>
                  <span className="font-display text-xl font-medium text-ink tabular-nums w-10 text-center leading-none">{newCount}</span>
                  <button onClick={() => changeCount(Math.min(999, newCount + 1))} className="w-10 h-12 text-ink hover:text-sp-red"><Plus className="w-4 h-4 mx-auto" /></button>
                </div>
              </div>
              <button
                onClick={addEntry}
                disabled={!newName.trim()}
                className="w-full h-12 bg-sp-red text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-sp-red-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
                Add to Today&apos;s Totals
              </button>
            </section>

            <section className="bg-bg-card rounded-2xl shadow-card border border-border-custom p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display text-lg font-medium text-ink">Donor Log</h2>
                <span className="text-xs text-ink-light tabular-nums">{todaysEntries.length} {todaysEntries.length === 1 ? 'entry' : 'entries'}</span>
              </div>
              {todaysEntries.length === 0 ? (
                <p className="text-sm text-ink-light/70 italic text-center py-8">No entries yet for today.</p>
              ) : (
                <ul className="divide-y divide-border-custom">
                  {todaysEntries.map((entry, i) => (
                    <EntryRow
                      key={entry.id}
                      idx={i + 1}
                      entry={entry}
                      canRemove={entries.some((e) => e.id === entry.id)}
                      onRemove={() => removeEntry(entry.id)}
                    />
                  ))}
                </ul>
              )}
            </section>
          </>
        )}

        {/* Weekly chart */}
        <section className="bg-bg-card rounded-2xl shadow-card border border-border-custom p-5">
          <div className="flex items-baseline justify-between mb-4">
            <div>
              <h2 className="font-display text-lg font-medium text-ink">Collection Week</h2>
              <p className="text-[11px] text-ink-light">Nov 16 → Nov 23, 2026</p>
            </div>
            <div className="text-right">
              <p className="font-display text-3xl font-medium text-ink tabular-nums leading-none">{weekTotal}</p>
              <p className="text-[10px] uppercase tracking-wider text-ink-light mt-1">week total</p>
            </div>
          </div>
          <div className="h-48 -mx-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyChart} margin={{ top: 8, right: 6, bottom: 4, left: 0 }}>
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#3D3530' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E8DFCF', borderRadius: 8, fontSize: 12 }}
                  cursor={{ fill: '#FBF6EC' }}
                  labelFormatter={(label) => `Nov ${weeklyChart.find(w => w.label === label)?.day}`}
                  formatter={(v: number) => [v, 'boxes']}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {weeklyChart.map((d, i) => (
                    <Cell key={i} fill={d.isToday ? '#C8102E' : '#1A6B3C'} opacity={d.value === 0 ? 0.15 : 1} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Submit */}
        {isToday && !isSubmitted && todaysEntries.length > 0 && (
          <button
            onClick={submitDay}
            className="w-full h-14 bg-sp-red text-white text-base font-semibold rounded-2xl flex items-center justify-center gap-2 hover:bg-sp-red-dark transition-colors shadow-card"
          >
            <Send className="w-5 h-5" />
            Submit Today&apos;s Totals to Central
          </button>
        )}
        {isSubmitted && (
          <div className="bg-occ-green-light border border-occ-green/20 rounded-2xl p-4 flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-occ-green shrink-0" />
            <div>
              <p className="text-sm font-semibold text-occ-green">Submitted to Central</p>
              <p className="text-xs text-occ-green/80">Recorded {new Date(submissions.find((s) => s.date === selectedDate)?.submittedAt ?? '').toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</p>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

function StatusBadge({ isFuture, isPast, isToday, isSubmitted }: { isFuture: boolean; isPast: boolean; isToday: boolean; isSubmitted: boolean }) {
  if (isSubmitted) return <Pill icon={<CheckCircle2 className="w-3 h-3" />} label="Submitted" color="text-occ-green" bg="bg-occ-green-light" />;
  if (isFuture) return <Pill icon={<Lock className="w-3 h-3" />} label="Upcoming" color="text-ink-light" bg="bg-bg-primary" />;
  if (isPast) return <Pill icon={<Clock className="w-3 h-3" />} label="Draft" color="text-gold" bg="bg-gold-light" />;
  if (isToday) return <Pill icon={<span className="w-2 h-2 rounded-full bg-sp-red animate-pulse-live" />} label="Today" color="text-sp-red" bg="bg-sp-red-light" />;
  return null;
}

function Pill({ icon, label, color, bg }: { icon: React.ReactNode; label: string; color: string; bg: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${bg} ${color}`}>
      {icon}
      {label}
    </span>
  );
}

function TypeBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
        active ? 'bg-bg-card shadow-card text-ink' : 'text-ink-light'
      }`}
    >
      <span className={active ? 'text-sp-red' : 'text-ink-light'}>{icon}</span>
      {label}
    </button>
  );
}

function EntryRow({ idx, entry, canRemove, onRemove }: { idx: number; entry: DailyEntry; canRemove: boolean; onRemove: () => void }) {
  const isOrg = entry.donorType === 'organization';
  return (
    <li className="flex items-center gap-3 py-3">
      <span className="font-display text-sm font-medium text-ink-light tabular-nums w-8">{String(idx).padStart(3, '0')}</span>
      {isOrg
        ? <Church className="w-7 h-7 text-purple-accent bg-purple-light rounded-full p-1.5" />
        : <User className="w-7 h-7 text-occ-green bg-occ-green-light rounded-full p-1.5" />
      }
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-ink truncate">{entry.donorName}</p>
        {isOrg && <p className="text-[10px] text-purple-accent uppercase tracking-wider font-semibold">Organization</p>}
      </div>
      <span className="font-display text-lg font-medium text-ink tabular-nums">+{entry.count}</span>
      {canRemove && (
        <button onClick={onRemove} className="touch-target text-ink-light hover:text-sp-red" aria-label={`Remove ${entry.donorName}`}>
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </li>
  );
}

// Unused exports prevent dead-import warnings on FileText for future use.
export const _ICON = FileText;
