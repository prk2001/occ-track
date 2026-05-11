import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Radio, Truck, Package, Gift, Trophy, Medal, TrendingUp, AlertTriangle } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import Layout from '@/components/Layout';
import {
  REGION_DATA,
  ACTIVITY_FEED,
  SPARKLINE_DATA,
  NATIONAL_GOAL,
  STATE_STATUS_CONFIG,
  getNationalTotal,
  getTopStates,
  getStateStatus,
  formatCount,
  timeAgo,
} from '@/data/mockData';
import type { ActivityItem, StateData } from '@/data/mockData';

// Smooth count-up using ease-out-cubic. Re-runs only when `target` changes.
function useCountUp(target: number, duration = 1500) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const elapsed = t - start;
      const p = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.floor(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

const REGION_COLOR: Record<string, string> = {
  Northeast: '#0EA5E9',
  Southeast: '#C8102E',
  Midwest: '#1A6B3C',
  Southwest: '#D97706',
  Northwest: '#7C3AED',
};

export default function LiveTracker() {
  const target = getNationalTotal();
  const animated = useCountUp(target);
  const goalPct = Math.min((target / NATIONAL_GOAL) * 100, 100);
  const top10 = getTopStates(10);

  return (
    <Layout>
      {/* Dark theme wrapper covers the standard page padding so the entire
          LiveTracker reads as a single dark monitoring view. */}
      <div className="bg-navy-dark min-h-screen -mt-1 pb-24">
        <div className="px-4 py-6 max-w-5xl mx-auto space-y-6 text-white">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sp-red/20 border border-sp-red/30 flex items-center justify-center">
                <Radio className="w-5 h-5 text-sp-red" />
              </div>
              <div>
                <h1 className="text-xl font-bold leading-tight">National Live Tracker</h1>
                <p className="text-xs text-white/60">Real-time collection across all 50 states</p>
              </div>
            </div>
            <span className="flex items-center gap-1.5 text-[11px] font-bold text-occ-green bg-occ-green/15 border border-occ-green/30 px-3 py-1.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-occ-green animate-pulse-live" />
              LIVE
            </span>
          </div>

          {/* National Counter */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-white/[0.04] border border-white/10 rounded-2xl p-6"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/50 mb-2">Shoeboxes Collected Nationwide</p>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-3">
              <span className="font-display text-[clamp(2.75rem,12vw,5rem)] font-medium tabular-nums leading-[0.95]">
                {animated.toLocaleString()}
              </span>
              <span className="text-base text-white/60 tabular-nums">/ {formatCount(NATIONAL_GOAL)}</span>
            </div>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mb-2">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${goalPct}%` }}
                transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
                className="h-full bg-gradient-to-r from-occ-green to-blue-accent"
              />
            </div>
            <p className="text-xs text-white/50 tabular-nums">{goalPct.toFixed(1)}% of National Goal · Day 4 of Collection Week 2026</p>
          </motion.div>

          {/* Regional cards */}
          <div>
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/50 mb-3">By Region</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {REGION_DATA.map((r) => {
                const color = REGION_COLOR[r.name];
                const pct = Math.min((r.shoeboxCount / r.goal) * 100, 100);
                return (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: REGION_DATA.indexOf(r) * 0.05 }}
                    className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 relative overflow-hidden"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-white/80">{r.name}</span>
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                    </div>
                    <p className="font-display text-3xl font-medium tabular-nums leading-none">{formatCount(r.shoeboxCount)}</p>
                    <p className="text-[10px] text-white/40 tabular-nums">{pct.toFixed(0)}% of goal</p>
                    <div className="h-10 -mx-2 mt-2 opacity-90">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={SPARKLINE_DATA}>
                          <Area type="monotone" dataKey="value" stroke={color} fill={color} fillOpacity={0.2} strokeWidth={1.5} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Leaderboard + Activity in two cols on desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Top 10 Leaderboard */}
            <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-gold" /> Top 10 States
                </h2>
                <span className="text-[10px] text-white/40 uppercase tracking-wider">by shoeboxes</span>
              </div>
              <ul className="space-y-1">
                {top10.map((s, idx) => (
                  <LeaderboardRow key={s.id} state={s} rank={idx + 1} />
                ))}
              </ul>
            </div>

            {/* Live Activity */}
            <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-occ-green" /> Live Activity
                </h2>
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-occ-green">
                  <span className="w-1.5 h-1.5 rounded-full bg-occ-green animate-pulse-live" />
                  REAL-TIME
                </span>
              </div>
              <ul className="space-y-3 max-h-[400px] overflow-y-auto">
                {ACTIVITY_FEED.map((a) => (
                  <ActivityRow key={a.id} item={a} />
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function LeaderboardRow({ state, rank }: { state: StateData; rank: number }) {
  const status = getStateStatus(state);
  const statusCfg = STATE_STATUS_CONFIG[status];
  const medalBg =
    rank === 1 ? 'bg-gold/20 text-gold border-gold/30' :
    rank === 2 ? 'bg-white/20 text-white border-white/30' :
    rank === 3 ? 'bg-orange-500/20 text-orange-300 border-orange-500/30' :
    'bg-white/5 text-white/60 border-white/10';

  return (
    <motion.li
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: rank * 0.03 }}
      className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0"
    >
      <span className={`w-8 h-8 rounded-lg border flex items-center justify-center text-xs font-bold tabular-nums ${medalBg}`}>
        {rank <= 3 ? <Medal className="w-4 h-4" /> : rank}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{state.name}</p>
        <p className="text-[10px] text-white/40">{state.region} · {state.cdoActive}/{state.cdoCount} CDOs active</p>
      </div>
      <div className="text-right">
        <p className="text-sm font-bold tabular-nums">{formatCount(state.shoeboxCount)}</p>
        <span
          className="inline-block text-[9px] font-semibold px-1.5 py-0.5 rounded mt-0.5"
          style={{ backgroundColor: statusCfg.bgColor, color: statusCfg.color }}
        >
          {statusCfg.label}
        </span>
      </div>
    </motion.li>
  );
}

function ActivityRow({ item }: { item: ActivityItem }) {
  const cfg = ACTIVITY_ICON[item.type];
  const Icon = cfg.icon;
  return (
    <li className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${cfg.color}22` }}>
        <Icon className="w-4 h-4" style={{ color: cfg.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-white/90 leading-snug">{item.message}</p>
        <p className="text-[10px] text-white/40 mt-0.5">{timeAgo(item.timestamp)}{item.region ? ` · ${item.region}` : ''}</p>
      </div>
    </li>
  );
}

const ACTIVITY_ICON: Record<ActivityItem['type'], { icon: typeof Gift; color: string }> = {
  checkin: { icon: Gift, color: '#1A6B3C' },
  carton: { icon: Package, color: '#7C3AED' },
  truck: { icon: Truck, color: '#D97706' },
  alert: { icon: AlertTriangle, color: '#C8102E' },
  milestone: { icon: Trophy, color: '#D97706' },
};
