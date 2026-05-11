import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PlusCircle, Minus, Plus, CheckCircle2, ChevronLeft, ChevronRight,
  User, UserX, Gift, Trash2, X, Church, Building2, Phone, Mail, MapPin, Sparkles,
} from 'lucide-react';
import Layout from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { SHOEBOX_ENTRIES, getLocationById, lookupZip, timeAgo } from '@/data/mockData';

type Step = 'list' | 'donor' | 'count' | 'confirm';
type DonorType = 'individual' | 'organization';

interface POC {
  name?: string;
  phone?: string;
  email?: string;
  sameAddress?: boolean;
  address?: string;
}

interface OrgAddress {
  zip?: string;
  city?: string;
  state?: string;
}

interface SessionEntry {
  id: string;
  donorName: string;
  count: number;
  timestamp: string;
  donorType?: DonorType;
  anonymous?: boolean;
  org?: OrgAddress;
  poc?: POC;
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
  const [donorType, changeType] = useState<DonorType>('individual');
  const [donorName, changeDonor] = useState('');
  const [anonymous, toggleAnonRaw] = useState(false);
  const [count, changeCount] = useState(1);

  // Organization-only fields
  const [zip, changeZip] = useState('');
  const [city, changeCity] = useState('');
  const [stateAbbr, changeState] = useState('');
  const [poc, changePoc] = useState<POC>({ sameAddress: true });
  const [showPoc, setShowPoc] = useState(false);

  const zipInfo = useMemo(() => (zip.length >= 5 ? lookupZip(zip) : undefined), [zip]);
  const isOrg = donorType === 'organization';

  // When a known ZIP resolves, auto-fill city/state (without clobbering user edits).
  useEffect(() => {
    if (zipInfo) {
      changeCity((c) => c || zipInfo.city);
      changeState((s) => s || zipInfo.state);
    }
  }, [zipInfo]);

  const recentDonorChips = useMemo(() => {
    const names = new Set<string>();
    if (isOrg) {
      // ZIP-aware chips: prefer churches at the entered ZIP first, then the
      // greeter's recent organization entries, then a small generic fallback.
      if (zipInfo?.churches) zipInfo.churches.forEach((n) => names.add(n));
      sessionEntries.slice(0, 30).forEach((e) => e.donorType === 'organization' && names.add(e.donorName));
      if (names.size < 6) {
        ['First Baptist Church', 'Boy Scouts Troop 401', 'Rotary Club'].forEach((n) => names.add(n));
      }
    } else {
      sessionEntries.slice(0, 30).forEach((e) => e.donorType !== 'organization' && !e.anonymous && names.add(e.donorName));
      SHOEBOX_ENTRIES.forEach((e) => names.add(e.donorName));
    }
    return Array.from(names).slice(0, 6);
  }, [sessionEntries, isOrg, zipInfo]);

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
    changeZip('');
    changeCity('');
    changeState('');
    changePoc({ sameAddress: true });
    setShowPoc(false);
  }

  function commitEntry() {
    const isAnon = !isOrg && (anonymous || !donorName.trim());
    const fallback = isOrg ? 'Unnamed Organization' : 'Anonymous Donor';
    const entry: SessionEntry = {
      id: newId(),
      donorName: isAnon ? fallback : donorName.trim() || fallback,
      count,
      timestamp: new Date().toISOString(),
      donorType,
      anonymous: isAnon,
      org: isOrg ? { zip: zip || undefined, city: city || undefined, state: stateAbbr || undefined } : undefined,
      poc: isOrg && (poc.name || poc.phone || poc.email) ? poc : undefined,
    };
    updateEntries((prev) => [entry, ...prev]);
  }

  function deleteEntry(id: string) {
    updateEntries((prev) => prev.filter((e) => e.id !== id));
  }

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
              zip={zip}
              city={city}
              stateAbbr={stateAbbr}
              zipInfo={zipInfo}
              poc={poc}
              showPoc={showPoc}
              onChangeType={(t) => {
                changeType(t);
                changeDonor('');
                toggleAnonRaw(false);
                if (t === 'individual') { changeZip(''); changeCity(''); changeState(''); setShowPoc(false); }
              }}
              onChangeZip={changeZip}
              onChangeCity={changeCity}
              onChangeState={changeState}
              onChangeName={changeDonor}
              onChangePoc={changePoc}
              onTogglePoc={() => setShowPoc((s) => !s)}
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
          <h1 className="font-display text-2xl font-medium text-ink leading-tight">Check-In</h1>
          <p className="text-xs text-ink-light italic">{locationLabel}</p>
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

      <div className="bg-bg-card rounded-2xl shadow-card p-4 border border-border-custom">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-base font-medium text-ink">Recent Check-ins</h2>
          <span className="text-xs text-ink-light tabular-nums">{entries.length} today</span>
        </div>
        {entries.length === 0 ? (
          <p className="text-sm text-ink-light/70 italic text-center py-6">
            No check-ins yet. Tap the button above to log the first donor.
          </p>
        ) : (
          <ul className="divide-y divide-border-custom">
            {entries.slice(0, 20).map((e) => (
              <li key={e.id} className="flex items-center gap-3 py-2.5">
                <EntryIcon type={e.donorType} anonymous={e.anonymous} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink truncate">{e.donorName}</p>
                  <p className="text-[11px] text-ink-light flex items-center gap-1.5">
                    <span>{timeAgo(e.timestamp)}</span>
                    {e.donorType === 'organization' && (
                      <span className="text-purple-accent font-semibold uppercase tracking-wider text-[9px]">
                        Organization
                        {e.org?.city && ` · ${e.org.city}, ${e.org.state}`}
                      </span>
                    )}
                  </p>
                </div>
                <span className="font-display text-lg font-medium text-ink tabular-nums">+{e.count}</span>
                <button
                  onClick={() => onDelete(e.id)}
                  className="touch-target text-ink-light hover:text-sp-red transition-colors"
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
    return <UserX className="w-8 h-8 text-ink-light bg-bg-primary rounded-full p-1.5" />;
  }
  return <User className="w-8 h-8 text-occ-green bg-occ-green-light rounded-full p-1.5" />;
}

function Stat({ label, value, tint, color }: { label: string; value: string; tint: string; color: string }) {
  return (
    <div className={`${tint} rounded-2xl p-3 text-center`}>
      <p className={`font-display text-xl font-medium ${color} tabular-nums leading-none`}>{value}</p>
      <p className="text-[10px] text-ink-light mt-1 uppercase tracking-wider">{label}</p>
    </div>
  );
}

function DonorStep({
  donorType, donorName, anonymous, recentChips,
  zip, city, stateAbbr, zipInfo, poc, showPoc,
  onChangeType, onChangeZip, onChangeCity, onChangeState, onChangeName, onChangePoc, onTogglePoc, onToggleAnon, onCancel, onNext,
}: {
  donorType: DonorType;
  donorName: string;
  anonymous: boolean;
  recentChips: string[];
  zip: string;
  city: string;
  stateAbbr: string;
  zipInfo: ReturnType<typeof lookupZip>;
  poc: POC;
  showPoc: boolean;
  onChangeType: (t: DonorType) => void;
  onChangeZip: (v: string) => void;
  onChangeCity: (v: string) => void;
  onChangeState: (v: string) => void;
  onChangeName: (v: string) => void;
  onChangePoc: (p: POC) => void;
  onTogglePoc: () => void;
  onToggleAnon: () => void;
  onCancel: () => void;
  onNext: () => void;
}) {
  const isOrg = donorType === 'organization';
  const placeholder = isOrg ? 'e.g. First Baptist Church' : 'e.g. Johnson Family';
  const nameLabel = isOrg ? 'Organization name' : 'Donor name';
  const canContinue = isOrg ? donorName.trim().length > 0 : (anonymous || donorName.trim().length > 0);
  const nameRef = useRef<HTMLInputElement>(null);

  // When ZIP resolves cleanly, auto-focus the name field so the next tap is
  // typing the org name (or picking a chip). Saves a tap on mobile.
  useEffect(() => {
    if (isOrg && zipInfo && !donorName) nameRef.current?.focus();
  }, [isOrg, zipInfo, donorName]);

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && canContinue) {
      e.preventDefault();
      onNext();
    }
  }

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

      <div className="bg-bg-card rounded-2xl shadow-card border border-border-custom p-5 space-y-4">
        {/* ORG: ZIP-first to speed up address + chip suggestions */}
        {isOrg && (
          <div className="grid grid-cols-[1fr_2fr] gap-3">
            <label className="block">
              <span className="text-[11px] font-semibold text-ink-light uppercase tracking-wider mb-1.5 block">
                ZIP code
                {zipInfo && <Sparkles className="inline w-3 h-3 ml-1 text-sp-red" aria-label="recognized" />}
              </span>
              <input
                autoFocus
                value={zip}
                onChange={(e) => onChangeZip(e.target.value.replace(/[^\d]/g, '').slice(0, 5))}
                onKeyDown={handleKey}
                inputMode="numeric"
                pattern="[0-9]{5}"
                placeholder="30301"
                className="w-full h-12 px-4 bg-bg-primary border border-border-custom rounded-xl text-base font-mono text-ink placeholder:text-ink-light/50 focus:outline-none focus:border-sp-red transition-colors tabular-nums"
              />
            </label>
            <div className="grid grid-cols-[1fr_60px] gap-2">
              <label className="block">
                <span className="text-[11px] font-semibold text-ink-light uppercase tracking-wider mb-1.5 block">City</span>
                <input
                  value={city}
                  onChange={(e) => onChangeCity(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder={zipInfo?.city ?? '—'}
                  className="w-full h-12 px-3 bg-bg-primary border border-border-custom rounded-xl text-sm text-ink placeholder:text-ink-light/50 focus:outline-none focus:border-sp-red transition-colors"
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-semibold text-ink-light uppercase tracking-wider mb-1.5 block">State</span>
                <input
                  value={stateAbbr}
                  onChange={(e) => onChangeState(e.target.value.toUpperCase().slice(0, 2))}
                  onKeyDown={handleKey}
                  placeholder={zipInfo?.state ?? '—'}
                  className="w-full h-12 px-2 bg-bg-primary border border-border-custom rounded-xl text-sm text-center font-mono text-ink placeholder:text-ink-light/50 focus:outline-none focus:border-sp-red transition-colors uppercase"
                />
              </label>
            </div>
          </div>
        )}

        {/* Name field */}
        <label className="block">
          <span className="text-[11px] font-semibold text-ink-light uppercase tracking-wider mb-1.5 block">{nameLabel}</span>
          <input
            ref={nameRef}
            autoFocus={!isOrg}
            value={donorName}
            onChange={(e) => { onChangeName(e.target.value); if (anonymous) onToggleAnon(); }}
            onKeyDown={handleKey}
            disabled={!isOrg && anonymous}
            placeholder={placeholder}
            className="w-full h-12 px-4 bg-bg-primary border border-border-custom rounded-xl text-base text-ink placeholder:text-ink-light/50 focus:outline-none focus:border-sp-red transition-colors disabled:opacity-50"
          />
        </label>

        {!isOrg && (
          <button
            onClick={onToggleAnon}
            className={`w-full h-11 rounded-xl border-2 text-sm font-medium transition-all flex items-center justify-center gap-2 ${
              anonymous
                ? 'border-ink bg-bg-primary text-ink'
                : 'border-border-custom text-ink-light hover:border-ink-light'
            }`}
          >
            <UserX className="w-4 h-4" />
            {anonymous ? 'Anonymous (selected)' : 'Skip Name — Anonymous'}
          </button>
        )}

        {recentChips.length > 0 && !anonymous && (
          <div>
            <span className="text-[11px] font-semibold text-ink-light uppercase tracking-wider mb-2 block">
              {isOrg
                ? zipInfo
                  ? `Churches in ${zipInfo.city}, ${zipInfo.state}`
                  : 'Suggested organizations'
                : 'Recent donors'}
            </span>
            <div className="flex flex-wrap gap-2">
              {recentChips.map((name) => (
                <button
                  key={name}
                  onClick={() => onChangeName(name)}
                  className={`px-3 py-1.5 bg-bg-primary border rounded-full text-xs text-ink transition-colors ${
                    isOrg ? 'border-purple-accent/30 hover:border-purple-accent' : 'border-border-custom hover:border-occ-green'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Optional POC for orgs — collapsed by default to keep the form fast */}
      {isOrg && (
        <div className="bg-bg-card rounded-2xl shadow-card border border-border-custom overflow-hidden">
          <button
            onClick={onTogglePoc}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-bg-cream/40 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <User className="w-4 h-4 text-purple-accent" />
              <div className="text-left">
                <p className="text-sm font-medium text-ink">Add contact (optional)</p>
                <p className="text-[11px] text-ink-light">Pastor, drive coordinator, or admin</p>
              </div>
            </div>
            <ChevronRight className={`w-4 h-4 text-ink-light transition-transform ${showPoc ? 'rotate-90' : ''}`} />
          </button>
          <AnimatePresence initial={false}>
            {showPoc && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                exit={{ height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-5 pb-5 space-y-3 border-t border-border-custom pt-4">
                  <PocField icon={<User className="w-4 h-4" />} label="Name & position" placeholder="e.g. Pastor John Smith"
                    value={poc.name ?? ''} onChange={(v) => onChangePoc({ ...poc, name: v })} />
                  <div className="grid grid-cols-2 gap-3">
                    <PocField icon={<Phone className="w-4 h-4" />} label="Phone" placeholder="(404) 555-0101" type="tel"
                      value={poc.phone ?? ''} onChange={(v) => onChangePoc({ ...poc, phone: v })} />
                    <PocField icon={<Mail className="w-4 h-4" />} label="Email" placeholder="pastor@church.org" type="email"
                      value={poc.email ?? ''} onChange={(v) => onChangePoc({ ...poc, email: v })} />
                  </div>

                  {/* Same-address toggle keeps the form short for the 90% case */}
                  <button
                    onClick={() => onChangePoc({ ...poc, sameAddress: !poc.sameAddress })}
                    className={`w-full h-11 rounded-xl border-2 text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                      poc.sameAddress
                        ? 'border-occ-green bg-occ-green-light text-occ-green'
                        : 'border-border-custom text-ink-light hover:border-ink-light'
                    }`}
                  >
                    <MapPin className="w-4 h-4" />
                    {poc.sameAddress ? 'Same address as organization' : 'Use different address'}
                  </button>

                  {!poc.sameAddress && (
                    <PocField icon={<MapPin className="w-4 h-4" />} label="Contact address" placeholder="Street, city, state, ZIP"
                      value={poc.address ?? ''} onChange={(v) => onChangePoc({ ...poc, address: v })} />
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

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

function PocField({
  icon, label, value, onChange, placeholder, type,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: 'text' | 'tel' | 'email';
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold text-ink-light uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
        <span className="text-ink-light/60">{icon}</span>
        {label}
      </span>
      <input
        type={type ?? 'text'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-11 px-3 bg-bg-primary border border-border-custom rounded-xl text-sm text-ink placeholder:text-ink-light/50 focus:outline-none focus:border-sp-red transition-colors"
      />
    </label>
  );
}

function TypeOption({
  active, onClick, icon, label, sub,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  sub: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-3 rounded-xl text-left transition-all ${
        active ? 'bg-bg-card shadow-card text-ink' : 'text-ink-light hover:text-ink'
      }`}
    >
      <div className="flex items-center gap-2 mb-0.5">
        <span className={active ? 'text-sp-red' : 'text-ink-light'}>{icon}</span>
        <span className="text-sm font-semibold">{label}</span>
      </div>
      <p className="text-[10px] text-ink-light/80 pl-6">{sub}</p>
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
      <div className="-mt-3 flex items-center gap-2 text-base font-bold text-ink">
        <TypeIcon className={`w-4 h-4 shrink-0 ${donorType === 'organization' ? 'text-purple-accent' : 'text-occ-green'}`} />
        <span className="truncate">Boxes from {donorName}?</span>
      </div>

      <div className="bg-bg-card rounded-2xl shadow-card border border-border-custom p-6 space-y-5">
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => onChange(clamp(count - 1))}
            className="w-16 h-16 rounded-2xl bg-bg-primary text-ink hover:bg-sp-red-light hover:text-sp-red transition-colors flex items-center justify-center"
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
              className="h-11 bg-bg-primary text-ink text-sm font-semibold rounded-xl hover:bg-occ-green-light hover:text-occ-green transition-colors tabular-nums"
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
          {count > 12 && <span className="text-xs text-ink-light self-center ml-1 tabular-nums">+{count - 12} more</span>}
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
      <div className="bg-bg-card rounded-2xl shadow-card border border-border-custom p-8 text-center space-y-5">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          className="w-20 h-20 mx-auto rounded-full bg-occ-green-light flex items-center justify-center"
        >
          <CheckCircle2 className="w-12 h-12 text-occ-green" strokeWidth={2.5} />
        </motion.div>
        <div>
          <h2 className="font-display text-2xl font-medium text-ink mb-1">Logged.</h2>
          <p className="text-sm text-ink-light flex items-center justify-center gap-1.5 flex-wrap">
            <span className="font-display text-lg font-medium text-ink">{count}</span> {count === 1 ? 'box' : 'boxes'} from
            <TypeIcon className={`w-4 h-4 inline-block ${donorType === 'organization' ? 'text-purple-accent' : 'text-occ-green'}`} />
            <span className="font-semibold text-ink">{donorName}</span>
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
        className="w-full h-12 bg-bg-card border-2 border-border-custom text-ink text-sm font-semibold rounded-2xl flex items-center justify-center gap-2 hover:border-ink transition-colors"
      >
        Back to Today&apos;s List
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
          <button onClick={onBack} className="touch-target -ml-2 text-ink-light hover:text-ink flex items-center gap-1 text-sm font-medium" aria-label="Back">
            <ChevronLeft className="w-5 h-5" />
            Back
          </button>
        ) : <div />}
        <span className="text-[11px] font-semibold text-ink-light uppercase tracking-wider tabular-nums">Step {step} of {totalSteps}</span>
        {onCancel ? (
          <button onClick={onCancel} className="touch-target -mr-2 text-ink-light hover:text-sp-red" aria-label="Cancel">
            <X className="w-5 h-5" />
          </button>
        ) : <div />}
      </div>
      {title && <h2 className="font-display text-2xl font-medium text-ink">{title}</h2>}
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
