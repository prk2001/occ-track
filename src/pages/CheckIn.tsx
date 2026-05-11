import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PlusCircle, Minus, Plus, CheckCircle2, ChevronLeft, ChevronRight,
  User, UserX, Gift, Trash2, X, Church, Building2,
} from 'lucide-react';
import Layout from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { SHOEBOX_ENTRIES, getLocationById, timeAgo } from '@/data/mockData';

type Step = 'list' | 'donor' | 'count' | 'confirm';
type DonorType = 'individual' | 'organization';

interface SessionEntry {
  id: string;
  donorName: string;
  count: number;
  timestamp: string;
  donorType?: DonorType;
  anonymous?: boolean;
}

const QUICK_ADDS = [1, 5, 10, 25];

// Realistic OCC organization examples used as chip suggestions when the
// greeter selects "Organization" — most real donors are churches running
// drives, with schools, civic groups, and businesses making up the rest.
const ORG_SUGGESTIONS = [
  'First Baptist Church',
  'Sandy Springs Elementary',
  'Boy Scouts Troop 401',
  'Rotary Club of Atlanta',
  'Atlanta Bible Church',
  'Mt. Zion Baptist',
];

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
  const [donorType, changeType] = useState<DonorType>('individual');
  const [donorName, changeDonor] = useState('');
  const [anonymous, toggleAnonRaw] = useState(false);
  const [count, changeCount] = useState(1);

  const recentDonorChips = useMemo(() => {
    const names = new Set<string>();
    if (donorType === 'organization') {
      sessionEntries.slice(0, 30).forEach((e) => e.donorType === 'organization' && names.add(e.donorName));
      ORG_SUGGESTIONS.forEach((n) => names.add(n));
    } else {
      sessionEntries.slice(0, 30).forEach((e) => e.donorType !== 'organization' && !e.anonymous && names.add(e.donorName));
      SHOEBOX_ENTRIES.forEach((e) => names.add(e.donorName));
    }
    return Array.from(names).slice(0, 6);
  }, [sessionEntries, donorType]);

  const todaysStats = useMemo(() => {
    const total = sessionEntries.reduce((sum, e) => sum + e.count, 0);
    const avg = sessionEntries.length > 0 ? total / sessionEntries.length : 0;
    const orgs = sessionEntries.filter((e) => e.donorType === 'organization').length;
    return { donors: sessionEntries.length, boxes: total, avg, orgs };
  }, [sessionEntries]);

  function reset() {
    changeDonor('');
    toggleAnonRaw(false);
    changeCount(1);
    changeType('individual');
  }

  function commitEntry() {
    const isAnon = donorType === 'individual' && (anonymous || !donorName.trim());
    const fallback = donorType === 'organization' ? 'Unnamed Organization' : 'Anonymous Donor';
    const entry: SessionEntry = {
      id: newId(),
      donorName: isAnon ? fallback : donorName.trim() || fallback,
      count,
      timestamp: new Date().toISOString(),
      donorType,
      anonymous: isAnon,
    };
    updateEntries((prev) => [entry, ...prev]);
  }

  function deleteEntry(id: string) {
    updateEntries((prev) => prev.filter((e) => e.id !== id));
  }

  const isOrg = donorType === 'organization';
  const finalDonor = isOrg
    ? donorName.trim() || 'Unnamed Organization'
    : anonymous || !donorName.trim() ? 'Anonymous Donor' : donorName.trim();

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
              donorType={donorType}
              donorName={donorName}
              anonymous={anonymous}
              recentChips={recentDonorChips}
              onChangeType={(t) => { changeType(t); changeDonor(''); toggleAnonRaw(false); }}
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
              donorType={donorType}
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
              donorType={donorType}
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
  stats: { donors: number; boxes: number; avg: number; orgs: number };
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

      <div className="grid grid-cols-4 gap-3">
        <Stat label="Donors" value={String(stats.donors)} tint="bg-blue-light" color="text-blue-accent" />
        <Stat label="Orgs" value={String(stats.orgs)} tint="bg-purple-light" color="text-purple-accent" />
        <Stat label="Boxes" value={String(stats.boxes)} tint="bg-occ-green-light" color="text-occ-green" />
        <Stat label="Avg" value={stats.donors > 0 ? stats.avg.toFixed(1) : '—'} tint="bg-gold-light" color="text-gold" />
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
                <EntryIcon type={e.donorType} anonymous={e.anonymous} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-navy truncate">{e.donorName}</p>
                  <p className="text-[11px] text-slate-light flex items-center gap-1.5">
                    <span>{timeAgo(e.timestamp)}</span>
                    {e.donorType === 'organization' && (
                      <span className="text-purple-accent font-semibold uppercase tracking-wider text-[9px]">Organization</span>
                    )}
                  </p>
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

function EntryIcon({ type, anonymous }: { type?: DonorType; anonymous?: boolean }) {
  if (type === 'organization') {
    return <Church className="w-8 h-8 text-purple-accent bg-purple-light rounded-full p-1.5" />;
  }
  if (anonymous) {
    return <UserX className="w-8 h-8 text-slate-light bg-bg-primary rounded-full p-1.5" />;
  }
  return <User className="w-8 h-8 text-occ-green bg-occ-green-light rounded-full p-1.5" />;
}

function Stat({ label, value, tint, color }: { label: string; value: string; tint: string; color: string }) {
  return (
    <div className={`${tint} rounded-2xl p-3 text-center`}>
      <p className={`text-xl font-bold ${color} tabular-nums`}>{value}</p>
      <p className="text-[10px] text-slate mt-0.5 uppercase tracking-wider">{label}</p>
    </div>
  );
}

function DonorStep({
  donorType, donorName, anonymous, recentChips,
  onChangeType, onChangeName, onToggleAnon, onCancel, onNext,
}: {
  donorType: DonorType;
  donorName: string;
  anonymous: boolean;
  recentChips: string[];
  onChangeType: (t: DonorType) => void;
  onChangeName: (v: string) => void;
  onToggleAnon: () => void;
  onCancel: () => void;
  onNext: () => void;
}) {
  const isOrg = donorType === 'organization';
  const placeholder = isOrg ? 'e.g. First Baptist Church' : 'e.g. Johnson Family';
  const nameLabel = isOrg ? 'Organization name' : 'Donor name';
  const canContinue = isOrg ? donorName.trim().length > 0 : (anonymous || donorName.trim().length > 0);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.25 }}
      className="space-y-5"
    >
      <StepHeader step={1} totalSteps={3} title="Who is donating?" onCancel={onCancel} />

      {/* Donor type segmented toggle */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-bg-primary rounded-2xl">
        <TypeOption
          active={!isOrg}
          icon={<User className="w-4 h-4" />}
          label="Individual"
          sub="Family / person"
          onClick={() => onChangeType('individual')}
        />
        <TypeOption
          active={isOrg}
          icon={<Church className="w-4 h-4" />}
          label="Organization"
          sub="Church, school, group"
          onClick={() => onChangeType('organization')}
        />
      </div>

      <div className="bg-bg-card rounded-2xl shadow-card p-5 space-y-4">
        <label className="block">
          <span className="text-xs font-semibold text-slate uppercase tracking-wider mb-1.5 block">{nameLabel}</span>
          <input
            autoFocus
            value={donorName}
            onChange={(e) => { onChangeName(e.target.value); if (anonymous) onToggleAnon(); }}
            disabled={!isOrg && anonymous}
            placeholder={placeholder}
            className="w-full h-12 px-4 bg-bg-primary border border-border-custom rounded-xl text-base text-navy placeholder:text-slate-light focus:outline-none focus:border-sp-red transition-colors disabled:opacity-50"
          />
        </label>

        {!isOrg && (
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
        )}

        {recentChips.length > 0 && !anonymous && (
          <div>
            <span className="text-[11px] font-semibold text-slate uppercase tracking-wider mb-2 block">
              {isOrg ? 'Suggested organizations' : 'Recent donors'}
            </span>
            <div className="flex flex-wrap gap-2">
              {recentChips.map((name) => (
                <button
                  key={name}
                  onClick={() => onChangeName(name)}
                  className={`px-3 py-1.5 bg-bg-primary border border-border-custom rounded-full text-xs text-navy transition-colors ${
                    isOrg ? 'hover:border-purple-accent' : 'hover:border-occ-green'
                  }`}
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
        disabled={!canContinue}
        className="w-full h-14 bg-sp-red text-white text-base font-semibold rounded-2xl flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-sp-red-dark transition-colors"
      >
        Continue
        <ChevronRight className="w-5 h-5" />
      </button>
    </motion.div>
  );
}

function TypeOption({
  active, icon, label, sub, onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  sub: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-3 rounded-xl text-left transition-all ${
        active ? 'bg-bg-card shadow-card text-navy' : 'text-slate hover:text-navy'
      }`}
    >
      <div className="flex items-center gap-2 mb-0.5">
        <span className={active ? 'text-sp-red' : 'text-slate-light'}>{icon}</span>
        <span className="text-sm font-semibold">{label}</span>
      </div>
      <p className="text-[10px] text-slate-light pl-6">{sub}</p>
    </button>
  );
}

function CountStep({
  donorName, donorType, count, onChange, onBack, onNext,
}: {
  donorName: string;
  donorType: DonorType;
  count: number;
  onChange: (v: number) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const clamp = (n: number) => Math.max(1, Math.min(999, n));
  const visualBoxes = Math.min(count, 12);
  const TypeIcon = donorType === 'organization' ? Church : User;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.25 }}
      className="space-y-5"
    >
      <StepHeader step={2} totalSteps={3} title="" onBack={onBack} />
      <div className="-mt-3 flex items-center gap-2 text-base font-bold text-navy">
        <TypeIcon className={`w-4 h-4 shrink-0 ${donorType === 'organization' ? 'text-purple-accent' : 'text-occ-green'}`} />
        <span className="truncate">Boxes from {donorName}?</span>
      </div>

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
            className="font-display text-7xl font-medium text-ink tabular-nums w-32 text-center leading-none"
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

        {donorType === 'organization' && (
          <div className="grid grid-cols-3 gap-2">
            <button onClick={() => onChange(clamp(count + 50))} className="h-10 bg-purple-light text-purple-accent text-sm font-semibold rounded-xl tabular-nums">+50</button>
            <button onClick={() => onChange(clamp(count + 100))} className="h-10 bg-purple-light text-purple-accent text-sm font-semibold rounded-xl tabular-nums">+100</button>
            <button onClick={() => onChange(clamp(count + 250))} className="h-10 bg-purple-light text-purple-accent text-sm font-semibold rounded-xl tabular-nums">+250</button>
          </div>
        )}

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
  donorName, donorType, count, onAddAnother, onDone,
}: {
  donorName: string;
  donorType: DonorType;
  count: number;
  onAddAnother: () => void;
  onDone: () => void;
}) {
  const TypeIcon = donorType === 'organization' ? Church : User;
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
          <p className="text-sm text-slate flex items-center justify-center gap-1.5 flex-wrap">
            <span className="font-semibold text-navy">{count}</span> {count === 1 ? 'box' : 'boxes'} from
            <TypeIcon className={`w-4 h-4 inline-block ${donorType === 'organization' ? 'text-purple-accent' : 'text-occ-green'}`} />
            <span className="font-semibold text-navy">{donorName}</span>
          </p>
        </div>
        {donorType === 'organization' && count >= 50 && (
          <div className="text-xs text-purple-accent bg-purple-light px-3 py-2 rounded-xl inline-block">
            <Building2 className="w-3 h-3 inline-block mr-1 -mt-0.5" />
            Large organization drop-off logged
          </div>
        )}
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
      {title && <h2 className="text-xl font-bold text-navy">{title}</h2>}
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
