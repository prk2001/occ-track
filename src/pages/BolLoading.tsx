import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Truck, Package, ChevronRight, ChevronLeft, CheckCircle2, Printer, X, Building2,
  Scale, FileText, Hash,
} from 'lucide-react';
import Layout from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import {
  CARTONS,
  BOLS,
  getLocationById,
  getDropoffsForCDO,
  timeAgo,
} from '@/data/mockData';
import type { Carton, BOL } from '@/data/mockData';

type Tab = 'create' | 'history';
type Step = 1 | 2 | 3 | 4;

interface TrailerForm {
  carrier: string;
  trailerId: string;
  sealNumber: string;
  proNumber: string;
}

interface SessionBOL extends BOL {
  carrier?: string;
  sealNumber?: string;
  proNumber?: string;
  signature?: string;
  weight?: number;
}

const SHOEBOX_WEIGHT_LBS = 3.2;
const CARTON_TARE_LBS = 1.0;
const NMFC = '84260-9';
const FREIGHT_CLASS = '70';

function newId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `b_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function pickCdo(userLocationId: string | undefined): string {
  if (userLocationId) {
    const loc = getLocationById(userLocationId);
    if (loc?.type === 'central') return userLocationId;
    if (loc?.centralDropoffId) return loc.centralDropoffId;
  }
  return 'cdo1';
}

export default function BolLoading() {
  const { user, isCDOLeader } = useAuth();
  const cdoId = pickCdo(user?.locationId);
  const cdo = getLocationById(cdoId)!;

  const [tab, setTab] = useState<Tab>('create');
  const [step, setStep] = useState<Step>(1);
  const [sessionBOLs, updateSessionBOLs] = useLocalStorage<SessionBOL[]>('occ:session-bols', []);
  const [trailer, setTrailer] = useState<TrailerForm>({ carrier: '', trailerId: '', sealNumber: '', proNumber: '' });
  const [selectedCartonIds, setSelectedCartonIds] = useState<string[]>([]);

  // Available cartons: sealed + not already on a BOL, belonging to this CDO
  // (or its feeding drop-offs, since CDOs sometimes pack their feeders' boxes).
  const dropoffIds = useMemo(() => getDropoffsForCDO(cdoId).map((d) => d.id), [cdoId]);
  const availableCartons = useMemo(
    () =>
      CARTONS.filter((c) =>
        c.status === 'sealed' &&
        !c.bolId &&
        (c.locationId === cdoId || dropoffIds.includes(c.locationId)),
      ),
    [cdoId, dropoffIds],
  );

  const selectedCartons = useMemo(
    () => availableCartons.filter((c) => selectedCartonIds.includes(c.id)),
    [availableCartons, selectedCartonIds],
  );

  const totalBoxes = selectedCartons.reduce((s, c) => s + c.boxCount, 0);
  const totalWeight = Math.round(totalBoxes * SHOEBOX_WEIGHT_LBS + selectedCartons.length * CARTON_TARE_LBS);

  const allBols = useMemo<SessionBOL[]>(() => [...sessionBOLs, ...BOLS], [sessionBOLs]);

  const canAdvanceFromStep1 =
    trailer.carrier.trim() && trailer.trailerId.trim() && trailer.sealNumber.trim();
  const canAdvanceFromStep2 = selectedCartonIds.length > 0;

  function toggleCarton(id: string) {
    setSelectedCartonIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  }

  function resetWizard() {
    setStep(1);
    setTrailer({ carrier: '', trailerId: '', sealNumber: '', proNumber: '' });
    setSelectedCartonIds([]);
  }

  function finalizeBOL() {
    const nextNumber = `BOL-${2900 + sessionBOLs.length}`;
    const bol: SessionBOL = {
      id: newId(),
      bolNumber: nextNumber,
      locationId: cdoId,
      trailerId: trailer.trailerId,
      cartonIds: selectedCartonIds,
      totalBoxes,
      status: 'ready',
      createdAt: new Date().toISOString(),
      carrier: trailer.carrier,
      sealNumber: trailer.sealNumber,
      proNumber: trailer.proNumber,
      weight: totalWeight,
    };
    updateSessionBOLs((prev) => [bol, ...prev]);
    setStep(4);
  }

  return (
    <Layout>
      <div className="px-4 py-4 max-w-4xl mx-auto space-y-6 pb-24">
        {/* Editorial hero */}
        <header className="flex items-start justify-between gap-3">
          <div className="space-y-2 pt-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-sp-red">
              Bill of Lading · Truck Loading
            </p>
            <h1 className="font-display text-3xl sm:text-4xl font-medium text-ink leading-tight tracking-tight">
              Seal it. Ship it.
              <span className="font-display-italic text-sp-red"> Send it home.</span>
            </h1>
            <p className="text-sm text-ink-light italic">
              {cdo.name} · {cdo.city}, {cdo.state}
            </p>
          </div>
          <span className="text-[10px] font-bold text-sp-red bg-sp-red-light px-2 py-1 rounded-full uppercase tracking-wider whitespace-nowrap shrink-0 mt-1">
            CDO Only
          </span>
        </header>

        {/* Role gate */}
        {!isCDOLeader && <BolNotForYourRole role={user?.role ?? null} />}

        {isCDOLeader && <>
        {/* Tabs */}
        <div className="flex p-1 bg-bg-card border border-border-custom rounded-2xl">
          <TabBtn active={tab === 'create'} onClick={() => setTab('create')} icon={<Truck className="w-4 h-4" />} label="Create BOL" />
          <TabBtn active={tab === 'history'} onClick={() => setTab('history')} icon={<FileText className="w-4 h-4" />} label={`History (${allBols.length})`} />
        </div>

        {tab === 'create' ? (
          <>
            <StepBar step={step} />
            <AnimatePresence mode="wait">
              {step === 1 && (
                <Step1Trailer
                  key="s1"
                  cdo={cdo}
                  value={trailer}
                  onChange={setTrailer}
                  onNext={() => setStep(2)}
                  canAdvance={!!canAdvanceFromStep1}
                />
              )}
              {step === 2 && (
                <Step2Cartons
                  key="s2"
                  cartons={availableCartons}
                  selectedIds={selectedCartonIds}
                  onToggle={toggleCarton}
                  onSelectAll={() => setSelectedCartonIds(availableCartons.map((c) => c.id))}
                  onClear={() => setSelectedCartonIds([])}
                  onBack={() => setStep(1)}
                  onNext={() => setStep(3)}
                  canAdvance={canAdvanceFromStep2}
                  totalBoxes={totalBoxes}
                />
              )}
              {step === 3 && (
                <Step3Review
                  key="s3"
                  cdo={cdo}
                  trailer={trailer}
                  selectedCartons={selectedCartons}
                  totalBoxes={totalBoxes}
                  totalWeight={totalWeight}
                  onBack={() => setStep(2)}
                  onFinalize={finalizeBOL}
                />
              )}
              {step === 4 && (
                <Step4Complete
                  key="s4"
                  bol={sessionBOLs[0]}
                  cdo={cdo}
                  onNew={resetWizard}
                  onViewHistory={() => { resetWizard(); setTab('history'); }}
                />
              )}
            </AnimatePresence>
          </>
        ) : (
          <BolHistory bols={allBols} />
        )}
        </>}
      </div>
    </Layout>
  );
}

function BolNotForYourRole({ role }: { role: string | null }) {
  return (
    <div className="bg-bg-card rounded-2xl shadow-card border border-border-custom overflow-hidden">
      <div className="bg-gradient-to-br from-sp-red-light to-bg-primary px-5 py-4 flex items-center gap-3 border-b border-border-custom">
        <Truck className="w-6 h-6 text-sp-red" />
        <div>
          <h2 className="font-display text-base font-medium text-ink">Bills of Lading are created at the Central</h2>
          <p className="text-[11px] text-ink-light mt-0.5 italic">This step isn&apos;t part of your role.</p>
        </div>
      </div>
      <div className="p-5 space-y-3 text-sm text-ink-light leading-relaxed">
        <p>
          A <strong className="text-ink">Bill of Lading</strong> is the shipping paperwork that
          accompanies a trailer of sealed cartons heading to the Operation Christmas Child Processing
          Center. The <strong className="text-ink">Central Drop-off Leader</strong> creates the BOL
          after cartons are packed and the trailer is ready to seal.
        </p>
        <p>
          As a {role === 'do_leader' ? 'Drop-off Leader' : role === 'greeter' ? 'Greeter' : 'volunteer'},
          your boxes will roll up onto the Central&apos;s BOL after you transport them on the last day
          of Collection Week.
        </p>
        <div className="pt-2">
          <a href={role === 'greeter' ? '#/checkin' : '#/totals'} className="inline-flex h-11 px-5 bg-sp-red text-white text-sm font-semibold rounded-xl items-center justify-center hover:bg-sp-red-dark transition-colors">
            {role === 'greeter' ? 'Back to Check-In' : 'Back to My Totals'}
          </a>
        </div>
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 h-10 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all ${
        active ? 'bg-sp-red text-white shadow-card' : 'text-ink-light hover:text-ink'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function StepBar({ step }: { step: Step }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-ink-light">
        <span>Step {step} of 4</span>
        <span>{['Trailer Setup', 'Carton Selection', 'Review & Seal', 'BOL Complete'][step - 1]}</span>
      </div>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i <= step ? 'bg-sp-red' : 'bg-border-custom'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function Step1Trailer({
  cdo, value, onChange, onNext, canAdvance,
}: {
  cdo: ReturnType<typeof getLocationById>;
  value: TrailerForm;
  onChange: (v: TrailerForm) => void;
  onNext: () => void;
  canAdvance: boolean;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -16 }}
      transition={{ duration: 0.25 }}
      className="space-y-5"
    >
      <div className="bg-bg-card rounded-2xl shadow-card border border-border-custom p-5 space-y-4">
        <h2 className="font-display text-lg font-medium text-ink">Trailer Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Carrier" value={value.carrier} onChange={(v) => onChange({ ...value, carrier: v })} placeholder="e.g. FedEx Freight" required />
          <Field label="Trailer #" value={value.trailerId} onChange={(v) => onChange({ ...value, trailerId: v })} placeholder="e.g. TR-2849" required mono />
          <Field label="Seal #" value={value.sealNumber} onChange={(v) => onChange({ ...value, sealNumber: v })} placeholder="e.g. 0048291" required mono />
          <Field label="PRO #" value={value.proNumber} onChange={(v) => onChange({ ...value, proNumber: v })} placeholder="e.g. 1234567890" mono />
        </div>
      </div>

      <div className="bg-bg-card rounded-2xl shadow-card border border-border-custom p-5 space-y-3">
        <h2 className="font-display text-lg font-medium text-ink">Shipment Addresses</h2>
        <AddressBlock label="Ship From" name={cdo?.name ?? ''} line={`${cdo?.address ?? ''} · ${cdo?.city}, ${cdo?.state} ${cdo?.zip}`} />
        <AddressBlock
          label="Ship To"
          name="Operation Christmas Child Processing Center"
          line="Regional processing facility"
        />
        <AddressBlock
          label="Bill To"
          name="Samaritan's Purse"
          line="801 Bamboo Road · Boone, NC 28607"
        />
      </div>

      <button
        onClick={onNext}
        disabled={!canAdvance}
        className="w-full h-14 bg-sp-red text-white text-base font-semibold rounded-2xl flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-sp-red-dark transition-colors shadow-card"
      >
        Continue to Cartons
        <ChevronRight className="w-5 h-5" />
      </button>
    </motion.section>
  );
}

function Field({ label, value, onChange, placeholder, required, mono }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean; mono?: boolean }) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold text-ink-light uppercase tracking-wider mb-1 block">
        {label}{required && <span className="text-sp-red ml-1">*</span>}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full h-11 px-3 bg-bg-primary border border-border-custom rounded-xl text-base text-ink placeholder:text-ink-light/50 focus:outline-none focus:border-sp-red transition-colors ${mono ? 'font-mono' : ''}`}
      />
    </label>
  );
}

function AddressBlock({ label, name, line }: { label: string; name: string; line: string }) {
  return (
    <div className="bg-bg-primary rounded-xl px-4 py-3 border border-border-custom/60">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-sp-red mb-1">{label}</p>
      <p className="text-sm font-semibold text-ink">{name}</p>
      <p className="text-[11px] text-ink-light">{line}</p>
    </div>
  );
}

function Step2Cartons({
  cartons, selectedIds, onToggle, onSelectAll, onClear, onBack, onNext, canAdvance, totalBoxes,
}: {
  cartons: Carton[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onSelectAll: () => void;
  onClear: () => void;
  onBack: () => void;
  onNext: () => void;
  canAdvance: boolean;
  totalBoxes: number;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -16 }}
      transition={{ duration: 0.25 }}
      className="space-y-5"
    >
      {/* Running total */}
      <div className="bg-bg-card rounded-2xl shadow-card border border-border-custom p-5 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-light">Selected for this trailer</p>
          <p className="font-display text-4xl font-medium text-ink tabular-nums leading-none mt-1">
            {selectedIds.length} <span className="text-ink-light/50 text-2xl">/ {cartons.length}</span>
          </p>
          <p className="text-xs text-ink-light tabular-nums mt-1">{totalBoxes} boxes total</p>
        </div>
        <div className="flex flex-col gap-2">
          <button onClick={onSelectAll} className="text-xs font-semibold text-sp-red hover:underline">Select all</button>
          <button onClick={onClear} className="text-xs font-medium text-ink-light hover:underline">Clear</button>
        </div>
      </div>

      <div className="bg-bg-card rounded-2xl shadow-card border border-border-custom overflow-hidden">
        <header className="px-5 pt-5 pb-3">
          <h2 className="font-display text-lg font-medium text-ink">Available Sealed Cartons</h2>
          <p className="text-[11px] text-ink-light">Only sealed cartons not already on another BOL are shown.</p>
        </header>
        {cartons.length === 0 ? (
          <p className="text-sm text-ink-light/70 italic text-center py-8 px-5">
            No sealed cartons available. Pack and seal cartons first, then return here.
          </p>
        ) : (
          <ul className="divide-y divide-border-custom px-2 pb-2">
            {cartons.map((c) => {
              const selected = selectedIds.includes(c.id);
              const loc = getLocationById(c.locationId);
              return (
                <li key={c.id}>
                  <button
                    onClick={() => onToggle(c.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
                      selected ? 'bg-sp-red-light' : 'hover:bg-bg-cream/40'
                    }`}
                  >
                    <span className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                      selected ? 'bg-sp-red border-sp-red' : 'border-border-custom'
                    }`}>
                      {selected && <CheckCircle2 className="w-4 h-4 text-white" strokeWidth={3} />}
                    </span>
                    <Package className="w-5 h-5 text-purple-accent" />
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-semibold text-ink tabular-nums">Carton #{c.cartonNumber}</p>
                      <p className="text-[11px] text-ink-light truncate">{loc?.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-display text-lg font-medium text-ink tabular-nums leading-none">{c.boxCount}</p>
                      <p className="text-[10px] text-ink-light">boxes</p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button onClick={onBack} className="h-14 border-2 border-border-custom text-ink text-sm font-semibold rounded-2xl flex items-center justify-center gap-2 hover:border-ink transition-colors">
          <ChevronLeft className="w-5 h-5" /> Back
        </button>
        <button
          onClick={onNext}
          disabled={!canAdvance}
          className="h-14 bg-sp-red text-white text-base font-semibold rounded-2xl flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-sp-red-dark transition-colors"
        >
          Review <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </motion.section>
  );
}

function Step3Review({
  cdo, trailer, selectedCartons, totalBoxes, totalWeight, onBack, onFinalize,
}: {
  cdo: ReturnType<typeof getLocationById>;
  trailer: TrailerForm;
  selectedCartons: Carton[];
  totalBoxes: number;
  totalWeight: number;
  onBack: () => void;
  onFinalize: () => void;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -16 }}
      transition={{ duration: 0.25 }}
      className="space-y-5"
    >
      <div className="bg-bg-card rounded-2xl shadow-card border-2 border-sp-red/20 p-6 space-y-5">
        <div className="flex items-start justify-between border-b border-border-custom pb-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-sp-red mb-1">Bill of Lading · Draft</p>
            <h2 className="font-display text-2xl font-medium text-ink">Review &amp; Seal</h2>
          </div>
          <FileText className="w-7 h-7 text-sp-red" />
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <SummaryItem label="Carrier" value={trailer.carrier} />
          <SummaryItem label="Trailer #" value={trailer.trailerId} mono />
          <SummaryItem label="Seal #" value={trailer.sealNumber} mono />
          <SummaryItem label="PRO #" value={trailer.proNumber || '—'} mono />
        </div>

        <div className="border-t border-border-custom pt-4 grid grid-cols-3 gap-3">
          <BigStat label="Cartons" value={selectedCartons.length.toString()} />
          <BigStat label="Boxes" value={totalBoxes.toString()} />
          <BigStat label="Weight" value={`${totalWeight} lb`} />
        </div>

        <div className="bg-bg-cream/60 rounded-xl px-4 py-3 text-xs text-ink-light space-y-1.5 border border-border-warm">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5"><Hash className="w-3 h-3" /> NMFC</span>
            <span className="font-mono font-semibold text-ink">{NMFC}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5"><Building2 className="w-3 h-3" /> Freight Class</span>
            <span className="font-mono font-semibold text-ink">{FREIGHT_CLASS}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5"><Scale className="w-3 h-3" /> Calculation</span>
            <span className="text-ink-light">{totalBoxes} × {SHOEBOX_WEIGHT_LBS} + {selectedCartons.length} × {CARTON_TARE_LBS} lb tare</span>
          </div>
        </div>

        <div className="border-t border-border-custom pt-4 space-y-2 text-xs">
          <AddressLine label="Ship From" name={cdo?.name ?? ''} line={`${cdo?.city}, ${cdo?.state}`} />
          <AddressLine label="Ship To" name="OCC Processing Center" line="Regional Facility" />
          <AddressLine label="Bill To" name="Samaritan's Purse" line="801 Bamboo Road, Boone NC 28607" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button onClick={onBack} className="h-14 border-2 border-border-custom text-ink text-sm font-semibold rounded-2xl flex items-center justify-center gap-2 hover:border-ink transition-colors">
          <ChevronLeft className="w-5 h-5" /> Back
        </button>
        <button
          onClick={onFinalize}
          className="h-14 bg-sp-red text-white text-base font-semibold rounded-2xl flex items-center justify-center gap-2 hover:bg-sp-red-dark transition-colors shadow-card"
        >
          Seal &amp; Finalize <CheckCircle2 className="w-5 h-5" />
        </button>
      </div>
    </motion.section>
  );
}

function SummaryItem({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-light">{label}</p>
      <p className={`text-sm font-medium text-ink mt-0.5 ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  );
}

function BigStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="font-display text-3xl font-medium text-ink tabular-nums leading-none">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-ink-light mt-1">{label}</p>
    </div>
  );
}

function AddressLine({ label, name, line }: { label: string; name: string; line: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-sp-red w-16 mt-0.5">{label}</span>
      <div className="flex-1">
        <p className="text-xs font-semibold text-ink">{name}</p>
        <p className="text-[11px] text-ink-light">{line}</p>
      </div>
    </div>
  );
}

function Step4Complete({
  bol, cdo, onNew, onViewHistory,
}: {
  bol?: SessionBOL;
  cdo: ReturnType<typeof getLocationById>;
  onNew: () => void;
  onViewHistory: () => void;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-5"
    >
      <div className="bg-bg-card rounded-2xl shadow-card border border-occ-green/30 p-7 text-center space-y-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          className="w-20 h-20 mx-auto rounded-full bg-occ-green-light flex items-center justify-center"
        >
          <CheckCircle2 className="w-12 h-12 text-occ-green" strokeWidth={2.5} />
        </motion.div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-sp-red mb-2">Bill of Lading Sealed</p>
          <p className="font-display text-3xl font-medium text-ink leading-none">{bol?.bolNumber}</p>
          <p className="text-sm text-ink-light italic mt-3">
            {bol?.totalBoxes ?? 0} boxes · {bol?.weight ?? 0} lb · {cdo?.name}
          </p>
        </div>
        <div className="bg-bg-cream/60 rounded-xl px-4 py-3 inline-block text-left border border-border-warm">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-light mb-1">Seal Number</p>
          <p className="font-mono text-lg font-semibold text-ink">{bol?.sealNumber}</p>
        </div>
      </div>

      <button className="w-full h-14 bg-sp-red text-white text-base font-semibold rounded-2xl flex items-center justify-center gap-2 hover:bg-sp-red-dark transition-colors shadow-card">
        <Printer className="w-5 h-5" />
        Print BOL Document
      </button>
      <div className="grid grid-cols-2 gap-3">
        <button onClick={onNew} className="h-12 border-2 border-border-custom text-ink text-sm font-semibold rounded-xl hover:border-ink transition-colors">
          Start Another
        </button>
        <button onClick={onViewHistory} className="h-12 border-2 border-border-custom text-ink text-sm font-semibold rounded-xl hover:border-ink transition-colors">
          View History
        </button>
      </div>
    </motion.section>
  );
}

function BolHistory({ bols }: { bols: SessionBOL[] }) {
  if (bols.length === 0) {
    return (
      <div className="bg-bg-card rounded-2xl shadow-card border border-border-custom p-8 text-center">
        <FileText className="w-10 h-10 text-ink-light/40 mx-auto mb-3" />
        <p className="text-sm text-ink-light italic">No Bills of Lading yet. Create one from the &ldquo;Create BOL&rdquo; tab.</p>
      </div>
    );
  }
  return (
    <ul className="space-y-3">
      {bols.map((b) => (
        <BolHistoryRow key={b.id} bol={b} />
      ))}
    </ul>
  );
}

function BolHistoryRow({ bol }: { bol: SessionBOL }) {
  const loc = getLocationById(bol.locationId);
  const statusCfg =
    bol.status === 'in_transit' ? { label: 'In Transit', color: 'text-occ-green', bg: 'bg-occ-green-light' }
    : bol.status === 'loaded' ? { label: 'Loaded', color: 'text-purple-accent', bg: 'bg-purple-light' }
    : bol.status === 'ready' ? { label: 'Ready', color: 'text-gold', bg: 'bg-gold-light' }
    : { label: 'Draft', color: 'text-ink-light', bg: 'bg-bg-primary' };

  return (
    <li className="bg-bg-card rounded-2xl shadow-card border border-border-custom p-4 flex items-start gap-4">
      <div className="w-12 h-12 rounded-xl bg-sp-red-light flex items-center justify-center shrink-0">
        <Truck className="w-6 h-6 text-sp-red" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <p className="font-display text-lg font-medium text-ink leading-none">{bol.bolNumber}</p>
          <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${statusCfg.bg} ${statusCfg.color}`}>
            {statusCfg.label}
          </span>
        </div>
        <p className="text-xs text-ink-light truncate">{loc?.name}</p>
        <div className="flex items-center gap-3 mt-2 text-[11px] text-ink-light tabular-nums">
          <span>Trailer <span className="font-mono text-ink">{bol.trailerId}</span></span>
          {bol.sealNumber && <span>Seal <span className="font-mono text-ink">{bol.sealNumber}</span></span>}
          <span className="ml-auto">{timeAgo(bol.createdAt)}</span>
        </div>
        <div className="flex items-baseline gap-2 mt-2">
          <span className="font-display text-2xl font-medium text-ink tabular-nums leading-none">{bol.totalBoxes}</span>
          <span className="text-[10px] uppercase tracking-wider text-ink-light">boxes</span>
          {bol.weight && <span className="ml-auto text-[11px] tabular-nums text-ink-light">{bol.weight} lb</span>}
        </div>
      </div>
    </li>
  );
}

// Unused export prevents dead-import warning on X.
export const _ICON = X;
