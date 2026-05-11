import { Gift, Warehouse, Package, Truck, Radio, TrendingUp, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import {
  REGION_DATA, SPARKLINE_DATA, NATIONAL_GOAL, ACTIVITY_FEED,
  formatCount, timeAgo, CARTONS, BOLS, LOCATIONS, COLLECTION_DAY, COLLECTION_TOTAL_DAYS,
} from '@/data/mockData';
import { useAuth } from '@/hooks/useAuth';
import HeritageStrip from '@/components/HeritageStrip';
import BibleVerse from '@/components/BibleVerse';
import WarmGreeting from '@/components/WarmGreeting';
import ImpactCallout from '@/components/ImpactCallout';
import HappyChild from '@/components/illustrations/HappyChild';
import ChristmasStar from '@/components/illustrations/ChristmasStar';
import WelcomeTableWidget from '@/components/dashboard/WelcomeTableWidget';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, x: 20 }, show: { opacity: 1, x: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } } };
const listItem = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

export default function AdminDashboard() {
  const { user } = useAuth();
  const total = REGION_DATA.reduce((s, r) => s + r.shoeboxCount, 0);
  const activeCDOs = LOCATIONS.filter(l => l.type === 'central' && l.status === 'active').length;
  const totalCDOs = LOCATIONS.filter(l => l.type === 'central').length;
  const totalCartons = CARTONS.length;
  const inTransitTrailers = BOLS.filter(b => b.status === 'in_transit').length;

  const kpis = [
    { label: 'Shoeboxes', value: formatCount(total), sub: 'nationwide', icon: Gift, color: 'text-occ-green', bg: 'bg-occ-green-light' },
    { label: 'CDOs Active', value: `${activeCDOs}/${totalCDOs}`, sub: 'central drop-offs', icon: Warehouse, color: 'text-blue-accent', bg: 'bg-blue-light' },
    { label: 'Cartons', value: String(totalCartons), sub: 'packed', icon: Package, color: 'text-purple-accent', bg: 'bg-purple-light' },
    { label: 'Trailers', value: String(inTransitTrailers), sub: 'in transit', icon: Truck, color: 'text-gold', bg: 'bg-gold-light' },
  ];

  return (
    <div className="space-y-6">
      {/* Warm personal hero — people first, numbers second */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative pt-2 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-6 items-center"
      >
        <ChristmasStar className="hidden sm:block absolute -top-4 right-32 opacity-60 pointer-events-none" size={56} />
        <div className="relative">
          <WarmGreeting
            name={user?.name}
            subtitle={`Collection Week 2026 · Day ${COLLECTION_DAY} of ${COLLECTION_TOTAL_DAYS}.`}
          />
          <h1 className="font-display text-[clamp(1.75rem,4.5vw,2.75rem)] leading-[1.05] text-ink tracking-tight mt-3">
            {total.toLocaleString()}
            <span className="block font-display-italic text-sp-red text-[clamp(1.5rem,3.5vw,2.25rem)] mt-1">
              Gospel Opportunities
            </span>
            <span className="block text-base font-normal text-ink-light mt-1">wrapped so far this week.</span>
          </h1>
          <ImpactCallout count={total} size="lg" className="mt-3 max-w-xl" />
        </div>
        <HappyChild className="hidden sm:block shrink-0" size={140} />
      </motion.section>

      <HeritageStrip />

      {/* KPI Cards */}
      <motion.div variants={container} initial="hidden" animate="show" className="flex gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-1">
        {kpis.map((k) => (
          <motion.div
            key={k.label}
            variants={item}
            className={`${k.bg} rounded-2xl p-4 min-w-[150px] flex-shrink-0 snap-start border border-white/40`}
          >
            <k.icon className={`w-5 h-5 ${k.color} mb-2`} />
            <p className="font-display text-3xl font-medium text-ink tabular-nums leading-none">{k.value}</p>
            <p className="text-xs text-ink-light mt-1.5 font-medium">{k.sub}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* National Progress */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.3, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
        className="bg-bg-card rounded-2xl shadow-card p-5"
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-navy">Collection Progress</h2>
          <a href="#/live" className="text-xs font-semibold text-sp-red flex items-center gap-0.5">
            View Map <ChevronRight className="w-3 h-3" />
          </a>
        </div>
        <div className="w-full h-4 bg-bg-primary rounded-full overflow-hidden mb-3">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min((total / NATIONAL_GOAL) * 100, 100)}%` }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
            className="h-full rounded-full bg-occ-green"
          />
        </div>
        <div className="flex items-end gap-2 mb-3">
          <span className="font-display text-4xl sm:text-5xl font-medium text-ink tabular-nums leading-none">{total.toLocaleString()}</span>
          <span className="text-sm text-ink-light mb-1 tabular-nums">of {NATIONAL_GOAL.toLocaleString()} goal</span>
        </div>
        <div className="h-20 -mx-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={SPARKLINE_DATA}>
              <Area type="monotone" dataKey="value" stroke="#1A6B3C" fill="#E6F5EC" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Regional Breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.3, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
        className="bg-bg-card rounded-2xl shadow-card p-5"
      >
        <h2 className="text-lg font-bold text-navy mb-3">By Region</h2>
        <div className="space-y-3">
          {REGION_DATA.sort((a, b) => b.shoeboxCount - a.shoeboxCount).map(r => (
            <div key={r.id} className="flex items-center gap-3">
              <span className="text-sm font-medium text-navy w-20">{r.name}</span>
              <div className="flex-1 h-5 bg-bg-primary rounded-lg overflow-hidden">
                <div className="h-full bg-occ-green rounded-lg" style={{ width: `${(r.shoeboxCount / r.goal) * 100}%` }} />
              </div>
              <span className="text-xs font-bold text-navy tabular-nums w-16 text-right">{formatCount(r.shoeboxCount)}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Live Activity Feed */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.3, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
        className="bg-bg-card rounded-2xl shadow-card p-5"
      >
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-lg font-bold text-navy">Live Activity</h2>
          <span className="flex items-center gap-1 text-[10px] font-bold text-occ-green bg-occ-green-light px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-occ-green animate-pulse-live" />
            LIVE
          </span>
        </div>
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-3">
          {ACTIVITY_FEED.map(a => (
            <motion.div key={a.id} variants={listItem} className="flex items-start gap-3 py-2 border-b border-border-custom last:border-0">
              <ActivityIcon type={a.type} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-navy">{a.message}</p>
                <p className="text-[11px] text-slate-light mt-0.5">{timeAgo(a.timestamp)}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>

      <WelcomeTableWidget />

      <BibleVerse />

      {/* Quick Actions */}
      <div className="hidden lg:grid grid-cols-3 gap-3">
        <button className="h-12 bg-navy text-white text-sm font-semibold rounded-xl hover:bg-navy/90 transition-colors">
          Export Report
        </button>
        <button className="h-12 border-2 border-sp-red text-sp-red text-sm font-semibold rounded-xl hover:bg-sp-red-light transition-colors">
          Send Broadcast
        </button>
        <button className="h-12 border-2 border-gold text-gold text-sm font-semibold rounded-xl hover:bg-gold-light transition-colors">
          View Discrepancies
        </button>
      </div>
    </div>
  );
}

function ActivityIcon({ type }: { type: string }) {
  const map: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
    checkin: { icon: Gift, color: 'text-occ-green', bg: 'bg-occ-green-light' },
    carton: { icon: Package, color: 'text-purple-accent', bg: 'bg-purple-light' },
    truck: { icon: Truck, color: 'text-gold', bg: 'bg-gold-light' },
    alert: { icon: TrendingUp, color: 'text-sp-red', bg: 'bg-sp-red-light' },
    milestone: { icon: Radio, color: 'text-blue-accent', bg: 'bg-blue-light' },
  };
  const m = map[type] || map.checkin;
  const Icon = m.icon;
  return (
    <div className={`w-8 h-8 ${m.bg} rounded-lg flex items-center justify-center shrink-0 mt-0.5`}>
      <Icon className={`w-4 h-4 ${m.color}`} />
    </div>
  );
}
