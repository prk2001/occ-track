import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package, Plus, Minus, X, CheckCircle2, Info, Layers, MapPin, Truck,
} from 'lucide-react';
import Layout from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import {
  CARTONS,
  TYPICAL_BOXES_PER_CARTON,
  CARTON_RANGE_TYPICAL,
  getLocationById,
  timeAgo,
} from '@/data/mockData';
import { useAppMode } from '@/lib/appMode';
import ModeLockedCard from '@/components/ModeLockedCard';
import { logAuditEvent } from '@/lib/auditLog';
import type { Carton } from '@/data/mockData';

type CartonType = 'regular' | 'filler';

interface SessionCarton extends Carton {
  cartonType?: CartonType;
  note?: string;
}

function newId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export default function Cartonization() {
  const { isProduction } = useAppMode();
  const { user, isCDOLeader } = useAuth();
  const myCdoId = user?.locationId && getLocationById(user.locationId)?.type === 'central'
    ? user.locationId
    : undefined;

  const [sessionCartons, updateCartons] = useLocalStorage<SessionCarton[]>('occ:session-cartons', []);
  const [packOpen, setPackOpen] = useState(false);

  const allCartons: SessionCarton[] = useMemo(
    () => [...sessionCartons, ...CARTONS],
    [sessionCartons],
  );

  // For CDO Leader, scope to their CDO; for higher roles, show everything.
  const scoped = useMemo(() => {
    if (user?.role === 'cdo_leader' && myCdoId) return allCartons.filter((c) => c.locationId === myCdoId);
    return allCartons;
  }, [allCartons, user, myCdoId]);

  const stats = useMemo(() => {
    const total = scoped.length;
    const open = scoped.filter((c) => c.status === 'open').length;
    const sealed = scoped.filter((c) => c.status === 'sealed').length;
    const loaded = scoped.filter((c) => c.status === 'loaded').length;
    const totalBoxes = scoped.reduce((s, c) => s + c.boxCount, 0);
    const avg = total > 0 ? totalBoxes / total : 0;
    return { total, open, sealed, loaded, totalBoxes, avg };
  }, [scoped]);

  function nextCartonNumber(): number {
    const max = Math.max(0, ...scoped.map((c) => c.cartonNumber));
    return max + 1;
  }

  function addCarton(c: { boxCount: number; cartonType: CartonType; note?: string }) {
    // Data-integrity gate: in production mode, carton entry is locked
    // to protect real Collection Week tallies.
    if (isProduction) {
      if (user) {
        logAuditEvent(
          { id: user.id, name: user.name, role: user.role },
          'clear_all_signups',
          'cartonization',
          `BLOCKED carton entry: ${c.boxCount} boxes (${c.cartonType}) — app in production mode`,
        );
      }
      return;
    }
    const locationId = myCdoId || 'cdo1';
    const carton: SessionCarton = {
      id: newId(),
      cartonNumber: nextCartonNumber(),
      locationId,
      boxCount: c.boxCount,
      status: 'sealed',
      createdAt: new Date().toISOString(),
      cartonType: c.cartonType,
      note: c.note,
    };
    updateCartons((prev) => [carton, ...prev]);
  }

  function removeSessionCarton(id: string) {
    updateCartons((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <Layout>
      <div className="px-4 py-4 max-w-4xl mx-auto pb-24 space-y-5">
        {isProduction && (
          <ModeLockedCard
            feature="Cartonization"
            description="Production mode keeps real Collection Week carton tallies safe from test data. Switch to testing mode to pack sample cartons, then back to production before real Collection Week."
          />
        )}
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-light flex items-center justify-center">
              <Package className="w-5 h-5 text-purple-accent" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-navy leading-tight">Cartonization</h1>
              <p className="text-xs text-slate">Pack, label, and seal shipping cartons</p>
            </div>
          </div>
          <span className="text-[10px] font-bold text-sp-red bg-sp-red-light px-2 py-1 rounded-full uppercase tracking-wider whitespace-nowrap">
            CDO Only
          </span>
        </div>

        {/* Role gate for DO Leaders + Greeters */}
        {!isCDOLeader && (
          <NotForYourRoleCard role={user?.role ?? null} />
        )}

        {isCDOLeader && (
          <>
            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatTile label="Open" value={String(stats.open)} icon={Package} color="text-blue-accent" bg="bg-blue-light" />
              <StatTile label="Sealed" value={String(stats.sealed)} icon={CheckCircle2} color="text-occ-green" bg="bg-occ-green-light" />
              <StatTile label="Loaded" value={String(stats.loaded)} icon={Truck} color="text-purple-accent" bg="bg-purple-light" />
              <StatTile label="Avg / Carton" value={stats.total > 0 ? stats.avg.toFixed(1) : '—'} icon={Layers} color="text-gold" bg="bg-gold-light" sub="boxes" />
            </div>

            {/* Typical-range hint */}
            <div className="flex items-start gap-2 text-xs text-slate bg-bg-card border border-border-custom rounded-xl px-3 py-2">
              <Info className="w-4 h-4 text-blue-accent shrink-0 mt-0.5" />
              <span>
                OCC cartons typically hold <span className="tabular-nums font-semibold text-navy">{CARTON_RANGE_TYPICAL.min}–{CARTON_RANGE_TYPICAL.max}</span> shoeboxes (target average <span className="tabular-nums font-semibold text-navy">{TYPICAL_BOXES_PER_CARTON}</span>). Cartons are <em>not</em> tied to individual donors — they aggregate boxes from across the whole collection.
              </span>
            </div>

            {/* Pack new */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => setPackOpen(true)}
              className="w-full h-14 bg-sp-red text-white text-base font-semibold rounded-2xl flex items-center justify-center gap-2 shadow-card hover:bg-sp-red-dark transition-colors"
            >
              <Plus className="w-5 h-5" />
              Pack New Carton
            </motion.button>

            {/* Carton list */}
            <div className="bg-bg-card rounded-2xl shadow-card p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-navy">Cartons</h2>
                <span className="text-xs text-slate tabular-nums">{stats.total} cartons · {stats.totalBoxes} boxes</span>
              </div>
              {scoped.length === 0 ? (
                <p className="text-sm text-slate-light text-center py-6">
                  No cartons packed yet. Tap "Pack New Carton" to log the first one.
                </p>
              ) : (
                <ul className="divide-y divide-border-custom">
                  {scoped.slice(0, 30).map((c) => (
                    <CartonRow
                      key={c.id}
                      carton={c}
                      canDelete={sessionCartons.some((s) => s.id === c.id)}
                      onDelete={() => removeSessionCarton(c.id)}
                    />
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>

      <AnimatePresence>
        {packOpen && (
          <PackCartonSheet
            nextNumber={nextCartonNumber()}
            onClose={() => setPackOpen(false)}
            onPack={(c) => { addCarton(c); setPackOpen(false); }}
          />
        )}
      </AnimatePresence>
    </Layout>
  );
}

function StatTile({
  label, value, icon: Icon, color, bg, sub,
}: {
  label: string;
  value: string;
  icon: typeof Package;
  color: string;
  bg: string;
  sub?: string;
}) {
  return (
    <div className={`${bg} rounded-2xl p-3 text-center`}>
      <Icon className={`w-4 h-4 ${color} mx-auto mb-1`} />
      <p className={`text-2xl font-bold ${color} tabular-nums leading-none`}>{value}</p>
      <p className="text-[10px] text-slate mt-1 uppercase tracking-wider">{label}{sub && <span className="text-slate-light"> · {sub}</span>}</p>
    </div>
  );
}

function CartonRow({ carton, canDelete, onDelete }: { carton: SessionCarton; canDelete: boolean; onDelete: () => void }) {
  const loc = getLocationById(carton.locationId);
  const isFiller = carton.cartonType === 'filler';
  const statusCfg =
    carton.status === 'open' ? { label: 'Open', color: 'text-blue-accent', bg: 'bg-blue-light' }
    : carton.status === 'sealed' ? { label: 'Sealed', color: 'text-occ-green', bg: 'bg-occ-green-light' }
    : { label: 'Loaded', color: 'text-purple-accent', bg: 'bg-purple-light' };

  return (
    <li className="flex items-center gap-3 py-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isFiller ? 'bg-gold-light' : 'bg-purple-light'}`}>
        {isFiller
          ? <Layers className="w-5 h-5 text-gold" />
          : <Package className="w-5 h-5 text-purple-accent" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-navy tabular-nums">#{carton.cartonNumber}</span>
          {isFiller && <span className="text-[9px] font-bold text-gold bg-gold-light px-1.5 py-0.5 rounded uppercase tracking-wider">Filler</span>}
        </div>
        <p className="text-[11px] text-slate-light flex items-center gap-1 truncate">
          {loc && <><MapPin className="w-3 h-3 shrink-0" /><span className="truncate">{loc.name}</span><span>·</span></>}
          <span>{timeAgo(carton.createdAt)}</span>
        </p>
      </div>
      <div className="text-right">
        <p className="text-base font-bold text-navy tabular-nums">{carton.boxCount}</p>
        <p className="text-[10px] text-slate-light -mt-0.5">boxes</p>
      </div>
      <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${statusCfg.bg} ${statusCfg.color}`}>
        {statusCfg.label}
      </span>
      {canDelete && (
        <button onClick={onDelete} className="touch-target text-slate-light hover:text-sp-red transition-colors" aria-label={`Remove carton ${carton.cartonNumber}`}>
          <X className="w-4 h-4" />
        </button>
      )}
    </li>
  );
}

function PackCartonSheet({
  nextNumber, onClose, onPack,
}: {
  nextNumber: number;
  onClose: () => void;
  onPack: (c: { boxCount: number; cartonType: CartonType; note?: string }) => void;
}) {
  const [boxCount, changeBoxCount] = useState(TYPICAL_BOXES_PER_CARTON);
  const [cartonType, changeType] = useState<CartonType>('regular');
  const [note, changeNote] = useState('');
  const clamp = (n: number) => Math.max(1, Math.min(99, n));
  const inRange = boxCount >= CARTON_RANGE_TYPICAL.min && boxCount <= CARTON_RANGE_TYPICAL.max;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-navy/50 z-50"
        onClick={onClose}
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
            <p className="text-[10px] font-semibold text-slate uppercase tracking-wider">Pack New Carton</p>
            <p className="text-lg font-bold text-navy tabular-nums">#{nextNumber}</p>
          </div>
          <button onClick={onClose} className="touch-target text-slate hover:text-sp-red" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Type segmented control */}
          <div>
            <label className="text-[11px] font-semibold text-slate uppercase tracking-wider mb-2 block">Carton Type</label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-bg-primary rounded-2xl">
              <button
                onClick={() => changeType('regular')}
                className={`px-3 py-3 rounded-xl text-left transition-all ${cartonType === 'regular' ? 'bg-bg-card shadow-card text-navy' : 'text-slate'}`}
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <Package className={`w-4 h-4 ${cartonType === 'regular' ? 'text-purple-accent' : 'text-slate-light'}`} />
                  <span className="text-sm font-semibold">Regular</span>
                </div>
                <p className="text-[10px] text-slate-light pl-6">Standard shoeboxes</p>
              </button>
              <button
                onClick={() => changeType('filler')}
                className={`px-3 py-3 rounded-xl text-left transition-all ${cartonType === 'filler' ? 'bg-bg-card shadow-card text-navy' : 'text-slate'}`}
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <Layers className={`w-4 h-4 ${cartonType === 'filler' ? 'text-gold' : 'text-slate-light'}`} />
                  <span className="text-sm font-semibold">Filler</span>
                </div>
                <p className="text-[10px] text-slate-light pl-6">Loose items, supplies</p>
              </button>
            </div>
          </div>

          {/* Box count */}
          <div>
            <div className="flex items-end justify-between mb-2">
              <label className="text-[11px] font-semibold text-slate uppercase tracking-wider">Boxes in Carton</label>
              <span className="text-[10px] text-slate-light tabular-nums">
                Target {TYPICAL_BOXES_PER_CARTON} · typical {CARTON_RANGE_TYPICAL.min}–{CARTON_RANGE_TYPICAL.max}
              </span>
            </div>
            <div className="flex items-center justify-center gap-4 bg-bg-card border border-border-custom rounded-2xl p-5">
              <button
                onClick={() => changeBoxCount(clamp(boxCount - 1))}
                className="w-14 h-14 rounded-2xl bg-bg-primary text-navy hover:bg-sp-red-light hover:text-sp-red transition-colors flex items-center justify-center"
                aria-label="Decrease"
              >
                <Minus className="w-6 h-6" />
              </button>
              <motion.div
                key={boxCount}
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 380, damping: 22 }}
                className="text-5xl font-bold text-navy tabular-nums w-24 text-center"
              >
                {boxCount}
              </motion.div>
              <button
                onClick={() => changeBoxCount(clamp(boxCount + 1))}
                className="w-14 h-14 rounded-2xl bg-sp-red text-white hover:bg-sp-red-dark transition-colors flex items-center justify-center"
                aria-label="Increase"
              >
                <Plus className="w-6 h-6" />
              </button>
            </div>
            {!inRange && (
              <p className="text-[11px] text-gold mt-2 flex items-center gap-1">
                <Info className="w-3 h-3" />
                {boxCount < CARTON_RANGE_TYPICAL.min ? 'Below typical range — verify before sealing.' : 'Above typical range — confirm carton isn\'t over-packed.'}
              </p>
            )}
          </div>

          {/* Note */}
          <div>
            <label className="text-[11px] font-semibold text-slate uppercase tracking-wider mb-1 block">Note (optional)</label>
            <input
              value={note}
              onChange={(e) => changeNote(e.target.value)}
              placeholder="e.g. Mixed sizes, mostly boys 5-9"
              className="w-full h-11 px-3 bg-bg-primary border border-border-custom rounded-xl text-sm text-navy placeholder:text-slate-light focus:outline-none focus:border-sp-red transition-colors"
            />
          </div>

          <button
            onClick={() => onPack({ boxCount, cartonType, note: note.trim() || undefined })}
            className="w-full h-14 bg-sp-red text-white text-base font-semibold rounded-2xl flex items-center justify-center gap-2 hover:bg-sp-red-dark transition-colors"
          >
            <CheckCircle2 className="w-5 h-5" />
            Seal Carton #{nextNumber}
          </button>
        </div>
      </motion.div>
    </>
  );
}

function NotForYourRoleCard({ role }: { role: string | null }) {
  return (
    <div className="bg-bg-card rounded-2xl shadow-card border border-border-custom overflow-hidden">
      <div className="bg-gradient-to-br from-sp-red-light to-bg-primary px-5 py-4 flex items-center gap-3 border-b border-border-custom">
        <Package className="w-6 h-6 text-sp-red" />
        <div>
          <h2 className="text-base font-bold text-navy">Cartonization happens at Central Drop-offs</h2>
          <p className="text-[11px] text-slate mt-0.5">This step isn't part of your role.</p>
        </div>
      </div>
      <div className="p-5 space-y-3 text-sm text-slate leading-relaxed">
        <p>
          During Collection Week, shoeboxes move from <strong className="text-navy">Donors → Drop-off locations → Central Drop-offs (CDOs)</strong>.
          The Central is where boxes get packed into shipping cartons, labeled, and loaded onto trailers heading to the Processing Center.
        </p>
        <p>
          As a {role === 'do_leader' ? 'Drop-off Leader' : role === 'greeter' ? 'Greeter' : 'volunteer'}, your job is to{' '}
          {role === 'do_leader'
            ? 'collect boxes daily and transport them to your Central by the last day of Collection Week.'
            : 'check in donors as they arrive and count the boxes they bring.'}
        </p>
        <div className="pt-2 flex gap-2">
          <a href={role === 'greeter' ? '#/checkin' : '#/totals'} className="flex-1 h-11 bg-sp-red text-white text-sm font-semibold rounded-xl flex items-center justify-center hover:bg-sp-red-dark transition-colors">
            {role === 'greeter' ? 'Back to Check-In' : 'Back to My Totals'}
          </a>
        </div>
      </div>
    </div>
  );
}
