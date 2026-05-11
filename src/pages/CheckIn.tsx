import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PlusCircle, Minus, Plus, CheckCircle2, ChevronLeft, ChevronRight,
  User, UserX, Gift, Trash2, X,
} from 'lucide-react';
import Layout from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { SHOEBOX_ENTRIES, getLocationById, timeAgo } from '@/data/mockData';

type Step = 'list' | 'donor' | 'count' | 'confirm';

interface SessionEntry {
  id: string;
  donorName: string;
  count: number;
  timestamp: string;
  anonymous?: boolean;
}

const QUICK_ADDS = [1, 5, 10, 25];

function newId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `e_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export default function CheckIn() {
  const { user } = useAuth();
  const locationLabel = user?.locationId
    ? getLocationById(user.locationId)?.name ?? 'My Location'
    : 'OCC Drop-off';

  const [sessionEntries, updateEntries] = useLocalStorage<SessionEntry[]>('occ:session-entries', []);

  const [step, goToStep] = useState<Step>('list');
  const [donorName, changeDonor] = useState('');
  const [anonymous, toggleAnonRaw] = useState(false);
  const [count, changeCount] = useState(1);

  const recentDonorChips = useMemo(() => {
    const names = new Set<string>();
    sessionEntries.slice(0, 30).forEach((e) => !e.anonymous && names.add(e.donorName));
    SHOEBOX_ENTRIES.forEach((e) => names.add(e.donorName));
    return Array.from(names).slice(0, 6);
  }, [sessionEntries]);

  const todaysStats = useMemo(() => {
    const total = sessionEntries.reduce((sum, e) => sum + e.count, 0);
    const avg = sessionEntries.length > 0 ? total / sessionEntries.length : 0;
    return { donors: sessionEntries.length, boxes: total, avg };
  }, [sessionEntries]);

  function reset() {
    changeDonor('');
    toggleAnonRaw(false);
    changeCount(1);
  }

  function commitEntry() {
    const finalName = anonymous || !donorName.trim() ? 'Anonymous Donor' : donorName.trim();
    const entry: SessionEntry = {
      id: newId(),
      donorName: finalName,
      count,
      timestamp: new Date().toISOString(),
      anonymous: anonymous || !donorName.trim(),
    };
    updateEntries((prev) => [entry, ...prev]);
  }

  function deleteEntry(id: string) {
    updateEntries((prev) => prev.filter((e) => e.id !== id));
  }

  const finalDonor = anonymous || !donorName.trim() ? 'Anonymous Donor' : donorName.trim();

  return (
    <Layout>
      <div className="px-4 py-4 max-w-2xl mx-auto pb-24">
        <AnimatePresence mode="wait">
          {step === 'list' && (
            <ListView
              key="list"
              locationLabel={locationLabel}
              stats={todaysStats}
              entries={sessionEntries}
              onStart={() => { reset(); goToStep('donor'); }}
              onDelete={deleteEntry}
            />
          )}
          {step === 'donor' && (
            <DonorStep
              key="donor"
              donorName={donorName}
              anonymous={anonymous}
              recentChips={recentDonorChips}
              onChangeName={changeDonor}
              onToggleAnon={() => toggleAnonRaw((a) => !a)}
              onCancel={() => goToStep('list')}
              onNext={() => goToStep('count')}
            />
          )}
          {step === 'count' && (
            <CountStep
              key="count"
              donorName={finalDonor}
              count={count}
              onChange={changeCount}
              onBack={() => goToStep('donor')}
              onNext={() => { commitEntry(); goToStep('confirm'); }}
            />
          )}
          {step === 'confirm' && (
            <ConfirmStep
              key="confirm"
              donorName={finalDonor}
              count={count}
              onAddAnother={() => { reset(); goToStep('donor'); }}
              onDone={() => { reset(); goToStep('list'); }}
            />
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}

function ListView({
  locationLabel, stats, entries, onStart, onDelete,
}: {
  locationLabel: string;
  stats: { donors: number; boxes: number; avg: number };
  entries: SessionEntry[];
  onStart: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
      className="space-y-5"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-occ-green-light flex items-center justify-center">
          <PlusCircle className="w-5 h-5 text-occ-green" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-navy leading-tight">Check-In</h1>
          <p className="text-xs text-slate">{locationLabel}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Donors" value={String(stats.donors)} tint="bg-blue-light" color="text-blue-accent" />
        <Stat label="Boxes Today" value={String(stats.boxes)} tint="bg-occ-green-light" color="text-occ-green" />
        <Stat label="Avg / Donor" value={stats.donors > 0 ? stats.avg.toFixed(1) : '—'} tint="bg-gold-light" color="text-gold" />
      </div>

      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={onStart}
        className="w-full h-16 bg-sp-red text-white text-lg font-semibold rounded-2xl flex items-center justify-center gap-3 shadow-card hover:bg-sp-red-dark transition-colors"
      >
        <PlusCircle className="w-6 h-6" />
        Check In Donor
      </motion.button>

      <div className="bg-bg-card rounded-2xl shadow-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-navy">Recent Check-ins</h2>
          <span className="text-xs text-slate tabular-nums">{entries.length} today</span>
        </div>
        {entries.length === 0 ? (
          <p className="text-sm text-slate-light text-center py-6">
            No check-ins yet. Tap the button above to log the first donor.
          </p>
        ) : (
          <ul className="divide-y divide-border-custom">
            {entries.slice(0, 20).map((e) => (
              <li key={e.id} className="flex items-center gap-3 py-2.5">
                {e.anonymous
                  ? <UserX className="w-8 h-8 text-slate-light bg-bg-primary rounded-full p-1.5" />
                  : <User className="w-8 h-8 text-occ-green bg-occ-green-light rounded-full p-1.5" />
                }
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-navy truncate">{e.donorName}</p>
                  <p className="text-[11px] text-slate-light">{timeAgo(e.timestamp)}</p>
                </div>
                <span className="text-base font-bold text-navy tabular-nums">+{e.count}</span>
                <button
                  onClick={() => onDelete(e.id)}
                  className="touch-target text-slate-light hover:text-sp-red transition-colors"
                  aria-label={`Delete entry for ${e.donorName}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </motion.div>
  );
}

function Stat({ label, value, tint, color }: { label: string; value: string; tint: string; color: string }) {
  return (
    <div className={`${tint} rounded-2xl p-3 text-center`}>
      <p className={`text-2xl font-bold ${color} tabular-nums`}>{value}</p>
      <p className="text-[10px] text-slate mt-0.5 uppercase tracking-wider">{label}</p>
    </div>
  );
}

function DonorStep({
  donorName, anonymous, recentChips, onChangeName, onToggleAnon, onCancel, onNext,
}: {
  donorName: string;
  anonymous: boolean;
  recentChips: string[];
  onChangeName: (v: string) => void;
  onToggleAnon: () => void;
  onCancel: () => void;
  onNext: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.25 }}
      className="space-y-5"
    >
      <StepHeader step={1} totalSteps={3} title="Who is donating?" onCancel={onCancel} />

      <div className="bg-bg-card rounded-2xl shadow-card p-5 space-y-4">
        <label className="block">
          <span className="text-xs font-semibold text-slate uppercase tracking-wider mb-1.5 block">Donor name</span>
          <input
            autoFocus
            value={donorName}
            onChange={(e) => { onChangeName(e.target.value); if (anonymous) onToggleAnon(); }}
            disabled={anonymous}
            placeholder="e.g. Johnson Family"
            className="w-full h-12 px-4 bg-bg-primary border border-border-custom rounded-xl text-base text-navy placeholder:text-slate-light focus:outline-none focus:border-sp-red transition-colors disabled:opacity-50"
          />
        </label>

        <button
          onClick={onToggleAnon}
          className={`w-full h-11 rounded-xl border-2 text-sm font-medium transition-all flex items-center justify-center gap-2 ${
            anonymous
              ? 'border-slate bg-bg-primary text-navy'
              : 'border-border-custom text-slate hover:border-slate'
          }`}
        >
          <UserX className="w-4 h-4" />
          {anonymous ? 'Anonymous (selected)' : 'Skip Name — Anonymous'}
        </button>

        {recentChips.length > 0 && !anonymous && (
          <div>
            <span className="text-[11px] font-semibold text-slate uppercase tracking-wider mb-2 block">Recent donors</span>
            <div className="flex flex-wrap gap-2">
              {recentChips.map((name) => (
                <button
                  key={name}
                  onClick={() => onChangeName(name)}
                  className="px-3 py-1.5 bg-bg-primary border border-border-custom rounded-full text-xs text-navy hover:border-occ-green transition-colors"
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <button
        onClick={onNext}
        disabled={!anonymous && !donorName.trim()}
        className="w-full h-14 bg-sp-red text-white text-base font-semibold rounded-2xl flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-sp-red-dark transition-colors"
      >
        Continue
        <ChevronRight className="w-5 h-5" />
      </button>
    </motion.div>
  );
}

function CountStep({
  donorName, count, onChange, onBack, onNext,
}: {
  donorName: string;
  count: number;
  onChange: (v: number) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const clamp = (n: number) => Math.max(1, Math.min(999, n));
  const visualBoxes = Math.min(count, 12);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.25 }}
      className="space-y-5"
    >
      <StepHeader step={2} totalSteps={3} title={`Boxes from ${donorName}?`} onBack={onBack} />

      <div className="bg-bg-card rounded-2xl shadow-card p-6 space-y-5">
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => onChange(clamp(count - 1))}
            className="w-16 h-16 rounded-2xl bg-bg-primary text-navy hover:bg-sp-red-light hover:text-sp-red transition-colors flex items-center justify-center"
            aria-label="Decrease count"
          >
            <Minus className="w-7 h-7" />
          </button>
          <motion.div
            key={count}
            initial={{ scale: 0.85 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 380, damping: 22 }}
            className="text-6xl font-bold text-navy tabular-nums w-32 text-center"
          >
            {count}
          </motion.div>
          <button
            onClick={() => onChange(clamp(count + 1))}
            className="w-16 h-16 rounded-2xl bg-sp-red text-white hover:bg-sp-red-dark transition-colors flex items-center justify-center"
            aria-label="Increase count"
          >
            <Plus className="w-7 h-7" />
          </button>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {QUICK_ADDS.map((n) => (
            <button
              key={n}
              onClick={() => onChange(clamp(count + n))}
              className="h-11 bg-bg-primary text-navy text-sm font-semibold rounded-xl hover:bg-occ-green-light hover:text-occ-green transition-colors tabular-nums"
            >
              +{n}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap justify-center gap-1.5 pt-2 border-t border-border-custom">
          {Array.from({ length: visualBoxes }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: i * 0.03, type: 'spring', stiffness: 300 }}
            >
              <Gift className="w-5 h-5 text-sp-red" />
            </motion.div>
          ))}
          {count > 12 && <span className="text-xs text-slate self-center ml-1 tabular-nums">+{count - 12} more</span>}
        </div>
      </div>

      <button
        onClick={onNext}
        className="w-full h-14 bg-sp-red text-white text-base font-semibold rounded-2xl flex items-center justify-center gap-2 hover:bg-sp-red-dark transition-colors"
      >
        Log {count} {count === 1 ? 'Box' : 'Boxes'}
        <ChevronRight className="w-5 h-5" />
      </button>
    </motion.div>
  );
}

function ConfirmStep({
  donorName, count, onAddAnother, onDone,
}: {
  donorName: string;
  count: number;
  onAddAnother: () => void;
  onDone: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25 }}
      className="space-y-5"
    >
      <div className="bg-bg-card rounded-2xl shadow-card p-8 text-center space-y-5">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          className="w-20 h-20 mx-auto rounded-full bg-occ-green-light flex items-center justify-center"
        >
          <CheckCircle2 className="w-12 h-12 text-occ-green" strokeWidth={2.5} />
        </motion.div>
        <div>
          <h2 className="text-xl font-bold text-navy mb-1">Logged!</h2>
          <p className="text-sm text-slate">
            <span className="font-semibold text-navy">{count}</span> {count === 1 ? 'box' : 'boxes'} from <span className="font-semibold text-navy">{donorName}</span>
          </p>
        </div>
      </div>

      <button
        onClick={onAddAnother}
        className="w-full h-14 bg-sp-red text-white text-base font-semibold rounded-2xl flex items-center justify-center gap-2 hover:bg-sp-red-dark transition-colors"
      >
        <PlusCircle className="w-5 h-5" />
        Add Another Donor
      </button>
      <button
        onClick={onDone}
        className="w-full h-12 bg-bg-card border-2 border-border-custom text-navy text-sm font-semibold rounded-2xl flex items-center justify-center gap-2 hover:border-navy transition-colors"
      >
        Back to Today's List
      </button>
    </motion.div>
  );
}

function StepHeader({
  step, totalSteps, title, onBack, onCancel,
}: {
  step: number;
  totalSteps: number;
  title: string;
  onBack?: () => void;
  onCancel?: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        {onBack ? (
          <button onClick={onBack} className="touch-target -ml-2 text-slate hover:text-navy flex items-center gap-1 text-sm font-medium" aria-label="Back">
            <ChevronLeft className="w-5 h-5" />
            Back
          </button>
        ) : <div />}
        <span className="text-[11px] font-semibold text-slate uppercase tracking-wider tabular-nums">Step {step} of {totalSteps}</span>
        {onCancel ? (
          <button onClick={onCancel} className="touch-target -mr-2 text-slate hover:text-sp-red" aria-label="Cancel">
            <X className="w-5 h-5" />
          </button>
        ) : <div />}
      </div>
      <h2 className="text-xl font-bold text-navy">{title}</h2>
      <div className="flex gap-1.5">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <span
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i < step ? 'bg-sp-red' : 'bg-border-custom'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
