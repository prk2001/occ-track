import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Truck, MapPin, Phone, Search, Plus, Building2, Gift, Clock, AlertCircle,
} from 'lucide-react';
import Layout from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';
import {
  LOCATIONS,
  getLocationById,
  getDropoffsForCDO,
  getShoeboxesForLocation,
  formatCount,
} from '@/data/mockData';
import type { Location } from '@/data/mockData';

type StatusFilter = 'all' | 'active' | 'inactive';

function pickCdoForView(userLocationId: string | undefined): string {
  if (userLocationId) {
    const loc = getLocationById(userLocationId);
    if (loc?.type === 'central') return userLocationId;
    if (loc?.centralDropoffId) return loc.centralDropoffId;
  }
  return 'cdo1';
}

export default function DropoffManagement() {
  const { user, isAdmin } = useAuth();
  const cdoId = pickCdoForView(user?.locationId);
  const cdo = getLocationById(cdoId)!;

  // Admins/Super Admins see all drop-offs; CDO leaders see only their own feeders.
  const dropoffs = useMemo(() => {
    if (isAdmin) return LOCATIONS.filter((l) => l.type === 'dropoff');
    return getDropoffsForCDO(cdoId);
  }, [isAdmin, cdoId]);

  const [filter, setFilter] = useState<StatusFilter>('all');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return dropoffs.filter((d) => {
      if (filter === 'active' && d.status !== 'active') return false;
      if (filter === 'inactive' && d.status === 'active') return false;
      if (!q) return true;
      return (
        d.name.toLowerCase().includes(q) ||
        d.city.toLowerCase().includes(q) ||
        d.contactName.toLowerCase().includes(q)
      );
    });
  }, [dropoffs, filter, query]);

  // Synthetic per-drop-off totals for the demo (real seeds are sparse).
  const synthMap = useMemo(() => {
    const m = new Map<string, { boxes: number; goal: number; pendingTransfer: boolean }>();
    dropoffs.forEach((d, i) => {
      m.set(d.id, {
        boxes: getShoeboxesForLocation(d.id) + [128, 96, 64, 48, 32, 84, 112, 38][i % 8],
        goal: [180, 150, 120, 100, 80, 140, 160, 70][i % 8],
        pendingTransfer: d.status === 'active' && i % 3 === 2,
      });
    });
    return m;
  }, [dropoffs]);

  const stats = useMemo(() => {
    const total = dropoffs.length;
    const active = dropoffs.filter((d) => d.status === 'active').length;
    const boxes = dropoffs.reduce((s, d) => s + (synthMap.get(d.id)?.boxes ?? 0), 0);
    const pending = dropoffs.filter((d) => synthMap.get(d.id)?.pendingTransfer).length;
    return { total, active, boxes, pending };
  }, [dropoffs, synthMap]);

  return (
    <Layout>
      <div className="px-4 py-4 max-w-4xl mx-auto space-y-6 pb-24">
        {/* Editorial hero */}
        <header className="space-y-2 pt-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-sp-red">
            Drop-off Management {!isAdmin && '· My Network'}
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-medium text-ink leading-tight tracking-tight">
            {isAdmin ? 'Every drop-off,' : 'Your drop-offs,'}
            <span className="font-display-italic text-sp-red"> one screen.</span>
          </h1>
          <p className="text-sm text-ink-light italic">
            {isAdmin ? 'All feeding drop-offs across the network' : `Feeding ${cdo.name} in ${cdo.city}, ${cdo.state}`}
          </p>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatTile icon={Building2} label="Total" value={String(stats.total)} bg="bg-blue-light" color="text-blue-accent" />
          <StatTile icon={Truck} label="Active" value={String(stats.active)} bg="bg-occ-green-light" color="text-occ-green" />
          <StatTile icon={Gift} label="Boxes" value={formatCount(stats.boxes)} bg="bg-sp-red-light" color="text-sp-red" />
          <StatTile icon={Clock} label="Pending Transfer" value={String(stats.pending)} bg="bg-gold-light" color="text-gold" />
        </div>

        {/* Search + filter */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-light/60" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, city, or contact"
              className="w-full h-11 pl-10 pr-3 bg-bg-card border border-border-custom rounded-xl text-sm text-ink placeholder:text-ink-light/60 focus:outline-none focus:border-sp-red transition-colors"
            />
          </div>
          <button className="h-11 px-4 bg-sp-red text-white text-sm font-semibold rounded-xl flex items-center gap-1.5 hover:bg-sp-red-dark transition-colors shadow-card">
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>

        <div className="flex gap-2">
          {(['all', 'active', 'inactive'] as StatusFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 h-9 rounded-full text-xs font-semibold capitalize transition-all ${
                filter === f
                  ? 'bg-ink text-bg-card'
                  : 'bg-bg-card border border-border-custom text-ink-light'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <div className="bg-bg-card rounded-2xl shadow-card border border-border-custom p-8 text-center">
            <AlertCircle className="w-8 h-8 text-ink-light/40 mx-auto mb-2" />
            <p className="text-sm text-ink-light italic">No drop-offs match your filters.</p>
          </div>
        ) : (
          <motion.ul
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
            className="space-y-3"
          >
            {filtered.map((d) => (
              <DropoffCard key={d.id} location={d} synth={synthMap.get(d.id)!} />
            ))}
          </motion.ul>
        )}
      </div>
    </Layout>
  );
}

function StatTile({ icon: Icon, label, value, bg, color }: { icon: typeof Building2; label: string; value: string; bg: string; color: string }) {
  return (
    <div className={`${bg} rounded-2xl p-3`}>
      <Icon className={`w-4 h-4 ${color} mb-1`} />
      <p className={`font-display text-2xl font-medium ${color} tabular-nums leading-none`}>{value}</p>
      <p className="text-[10px] text-ink-light mt-1 uppercase tracking-wider">{label}</p>
    </div>
  );
}

function DropoffCard({ location, synth }: { location: Location; synth: { boxes: number; goal: number; pendingTransfer: boolean } }) {
  const pct = Math.min((synth.boxes / synth.goal) * 100, 100);
  const statusCfg =
    location.status === 'active' ? { label: 'Active', dot: 'bg-occ-green', text: 'text-occ-green', bg: 'bg-occ-green-light' }
    : location.status === 'inactive' ? { label: 'Inactive', dot: 'bg-gold', text: 'text-gold', bg: 'bg-gold-light' }
    : { label: 'Closed', dot: 'bg-ink-light', text: 'text-ink-light', bg: 'bg-bg-primary' };

  return (
    <motion.li
      variants={{
        hidden: { opacity: 0, y: 12 },
        show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
      }}
      className="bg-bg-card rounded-2xl shadow-card border border-border-custom p-4 hover:shadow-card-elevated transition-shadow"
    >
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-bg-cream flex items-center justify-center shrink-0 border border-border-warm">
          <Truck className="w-5 h-5 text-sp-red" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-display text-base font-medium text-ink truncate leading-tight">{location.name}</h3>
              <p className="text-[11px] text-ink-light flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 shrink-0" />
                <span className="truncate">{location.city}, {location.state}</span>
              </p>
            </div>
            <span className={`flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${statusCfg.bg} ${statusCfg.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
              {statusCfg.label}
            </span>
          </div>

          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-display text-3xl font-medium text-ink tabular-nums leading-none">{synth.boxes}</span>
            <span className="text-xs text-ink-light tabular-nums">of {synth.goal} goal · {pct.toFixed(0)}%</span>
          </div>

          <div className="mt-2 w-full h-1.5 bg-bg-primary rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
              className="h-full bg-occ-green rounded-full"
            />
          </div>

          <div className="mt-3 pt-3 border-t border-border-custom flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1.5 text-ink-light truncate">
              <Phone className="w-3 h-3 shrink-0" />
              <a href={`tel:${location.contactPhone}`} className="hover:text-sp-red transition-colors tabular-nums truncate">
                {location.contactName} · {location.contactPhone}
              </a>
            </div>
            {synth.pendingTransfer && (
              <span className="text-gold font-semibold uppercase tracking-wider text-[9px] shrink-0">
                Transfer due
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.li>
  );
}
