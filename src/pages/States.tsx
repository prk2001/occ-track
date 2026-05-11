import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, TrendingUp, TrendingDown, Minus, ArrowUpDown, MapPin } from 'lucide-react';
import Layout from '@/components/Layout';
import {
  STATES,
  REGIONS,
  STATE_STATUS_CONFIG,
  NATIONAL_GOAL,
  getStateStatus,
  getNationalTotal,
  formatCount,
} from '@/data/mockData';
import type { Region, StateData, StateStatus, Trend } from '@/data/mockData';

type SortKey = 'boxes_desc' | 'boxes_asc' | 'goal_pct' | 'name' | 'status';
type RegionFilter = Region | 'All';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'boxes_desc', label: 'Most boxes' },
  { value: 'boxes_asc', label: 'Fewest boxes' },
  { value: 'goal_pct', label: 'Goal % (lowest first)' },
  { value: 'name', label: 'Name (A→Z)' },
  { value: 'status', label: 'Status (worst first)' },
];

const STATUS_ORDER: Record<StateStatus, number> = {
  behind: 0,
  caution: 1,
  on_track: 2,
};

const container = { hidden: {}, show: { transition: { staggerChildren: 0.03 } } };
const card = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
};

export default function States() {
  const [region, setRegion] = useState<RegionFilter>('All');
  const [sort, setSort] = useState<SortKey>('boxes_desc');
  const [query, setQuery] = useState('');

  const nationalTotal = getNationalTotal();
  const nationalPct = Math.min((nationalTotal / NATIONAL_GOAL) * 100, 100);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let result = STATES.filter((s) => {
      if (region !== 'All' && s.region !== region) return false;
      if (!q) return true;
      return s.name.toLowerCase().includes(q) || s.abbreviation.toLowerCase().includes(q);
    });

    result = [...result].sort((a, b) => {
      switch (sort) {
        case 'boxes_desc': return b.shoeboxCount - a.shoeboxCount;
        case 'boxes_asc': return a.shoeboxCount - b.shoeboxCount;
        case 'goal_pct': return (a.shoeboxCount / a.goal) - (b.shoeboxCount / b.goal);
        case 'name': return a.name.localeCompare(b.name);
        case 'status': {
          const sa = STATUS_ORDER[getStateStatus(a)];
          const sb = STATUS_ORDER[getStateStatus(b)];
          if (sa !== sb) return sa - sb;
          return b.shoeboxCount - a.shoeboxCount;
        }
      }
    });

    return result;
  }, [region, sort, query]);

  const statusCounts = useMemo(() => {
    const counts: Record<StateStatus, number> = { on_track: 0, caution: 0, behind: 0 };
    for (const s of STATES) counts[getStateStatus(s)] += 1;
    return counts;
  }, []);

  return (
    <Layout>
      <div className="px-4 py-4 max-w-5xl mx-auto space-y-5 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sp-red-light flex items-center justify-center">
            <MapPin className="w-5 h-5 text-sp-red" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-medium text-ink leading-none tracking-tight">50 States</h1>
            <p className="text-xs text-ink-light italic mt-1">Live collection status across every US state</p>
          </div>
        </div>

        {/* National roll-up */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
          className="bg-bg-card rounded-2xl shadow-card p-5"
        >
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-xs font-semibold text-slate uppercase tracking-wider">National Total</span>
            <span className="text-xs text-slate-light tabular-nums">{nationalPct.toFixed(1)}% of goal</span>
          </div>
          <div className="flex items-end gap-2 mb-3">
            <span className="font-display text-5xl font-medium text-ink tabular-nums leading-none">{nationalTotal.toLocaleString()}</span>
            <span className="text-sm text-ink-light mb-1 tabular-nums">/ {formatCount(NATIONAL_GOAL)}</span>
          </div>
          <div className="w-full h-3 bg-bg-primary rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${nationalPct}%` }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
              className="h-full bg-occ-green rounded-full"
            />
          </div>
          <div className="flex items-center gap-3 mt-4 text-xs">
            <StatusBadge status="on_track" count={statusCounts.on_track} />
            <StatusBadge status="caution" count={statusCounts.caution} />
            <StatusBadge status="behind" count={statusCounts.behind} />
          </div>
        </motion.div>

        {/* Region filter tabs */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">
          {(['All', ...REGIONS] as RegionFilter[]).map((r) => {
            const active = region === r;
            return (
              <button
                key={r}
                onClick={() => setRegion(r)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  active
                    ? 'bg-sp-red text-white shadow-sm'
                    : 'bg-bg-card text-slate border border-border-custom hover:border-sp-red/40'
                }`}
              >
                {r}
              </button>
            );
          })}
        </div>

        {/* Search + Sort */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-light" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search state…"
              className="w-full h-11 pl-10 pr-3 bg-bg-card border border-border-custom rounded-xl text-sm text-navy placeholder:text-slate-light focus:outline-none focus:border-sp-red transition-colors"
            />
          </div>
          <div className="relative">
            <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-light pointer-events-none" />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="h-11 pl-10 pr-8 bg-bg-card border border-border-custom rounded-xl text-sm text-navy focus:outline-none focus:border-sp-red transition-colors appearance-none cursor-pointer"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between -mb-2">
          <span className="text-xs text-slate tabular-nums">
            {filtered.length} {filtered.length === 1 ? 'state' : 'states'}
          </span>
        </div>

        {/* State cards */}
        {filtered.length === 0 ? (
          <div className="bg-bg-card rounded-2xl shadow-card p-8 text-center">
            <p className="text-sm text-slate">No states match those filters.</p>
          </div>
        ) : (
          <motion.div
            key={`${region}-${sort}-${query}`}
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 gap-3"
          >
            {filtered.map((state) => (
              <motion.div key={state.id} variants={card}>
                <StateCard state={state} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </Layout>
  );
}

function StateCard({ state }: { state: StateData }) {
  const status = getStateStatus(state);
  const statusCfg = STATE_STATUS_CONFIG[status];
  const pct = Math.min((state.shoeboxCount / state.goal) * 100, 100);

  return (
    <div className="bg-bg-card rounded-2xl shadow-card p-4 hover:shadow-card-elevated transition-shadow">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-12 h-12 rounded-xl bg-bg-primary flex items-center justify-center shrink-0">
          <span className="text-base font-bold text-navy tabular-nums">{state.abbreviation}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h3 className="font-semibold text-navy text-sm truncate">{state.name}</h3>
            <TrendIcon trend={state.trend} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-light">{state.region}</span>
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: statusCfg.bgColor, color: statusCfg.color }}
            >
              {statusCfg.label}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-baseline justify-between mb-2">
        <span className="text-2xl font-bold text-navy tabular-nums">{formatCount(state.shoeboxCount)}</span>
        <span className="text-xs text-slate tabular-nums">{pct.toFixed(0)}% of {formatCount(state.goal)}</span>
      </div>

      <div className="w-full h-2 bg-bg-primary rounded-full overflow-hidden mb-3">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
          className="h-full rounded-full"
          style={{ backgroundColor: statusCfg.color }}
        />
      </div>

      <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-border-custom">
        <SubStat label="CDOs" value={`${state.cdoActive}/${state.cdoCount}`} />
        <SubStat label="Drop-offs" value={String(state.dropoffCount)} />
        <SubStat label="Donors" value={formatCount(state.donors)} />
      </div>
    </div>
  );
}

function SubStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm font-semibold text-navy tabular-nums">{value}</p>
      <p className="text-[10px] text-slate-light uppercase tracking-wider mt-0.5">{label}</p>
    </div>
  );
}

function TrendIcon({ trend }: { trend: Trend }) {
  if (trend === 'up') return <TrendingUp className="w-4 h-4 text-occ-green shrink-0" aria-label="trending up" />;
  if (trend === 'down') return <TrendingDown className="w-4 h-4 text-sp-red shrink-0" aria-label="trending down" />;
  return <Minus className="w-4 h-4 text-slate-light shrink-0" aria-label="flat" />;
}

function StatusBadge({ status, count }: { status: StateStatus; count: number }) {
  const cfg = STATE_STATUS_CONFIG[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full font-semibold"
      style={{ backgroundColor: cfg.bgColor, color: cfg.color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cfg.color }} />
      <span className="tabular-nums">{count}</span> {cfg.label}
    </span>
  );
}
