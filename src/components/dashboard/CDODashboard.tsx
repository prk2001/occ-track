import { Gift, Package, FileText, Truck, PlusCircle, TrendingUp, Clock, UserCheck, QrCode } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  getDropoffsForCDO, getShoeboxesForCDO,
  getShoeboxesForLocation, getCartonsForLocation, getRecentCheckins, formatCount,
} from '@/data/mockData';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, x: 20 }, show: { opacity: 1, x: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } } };

export default function CDODashboard() {
  const cdoId = 'cdo1';
  const myTotal = getShoeboxesForCDO(cdoId);
  const checkedInHere = getShoeboxesForLocation(cdoId);
  const dropoffs = getDropoffsForCDO(cdoId);
  const fromDropoffs = dropoffs.reduce((s, d) => s + getShoeboxesForLocation(d.id), 0);
  const myCartons = getCartonsForLocation(cdoId);
  const cartonsPacked = myCartons.reduce((s, c) => s + c.boxCount, 0);
  const recentCheckins = getRecentCheckins(cdoId, 5);

  const kpis = [
    { label: 'My Total', value: myTotal, icon: Gift, color: 'text-sp-red', bg: 'bg-sp-red-light' },
    { label: 'Checked In', value: checkedInHere, icon: PlusCircle, color: 'text-occ-green', bg: 'bg-occ-green-light' },
    { label: 'From D/O', value: fromDropoffs, icon: TrendingUp, color: 'text-blue-accent', bg: 'bg-blue-light' },
    { label: 'Cartons', value: cartonsPacked, icon: Package, color: 'text-purple-accent', bg: 'bg-purple-light' },
  ];

  const actions = [
    { label: 'Check In', sub: 'Log boxes', icon: PlusCircle, color: 'border-occ-green text-occ-green', bg: 'bg-occ-green-light', href: '/checkin' },
    { label: 'Cartonize', sub: 'Pack cartons', icon: Package, color: 'border-sp-red text-sp-red', bg: 'bg-sp-red-light', href: '/cartons' },
    { label: 'Summary', sub: 'View totals', icon: FileText, color: 'border-blue-accent text-blue-accent', bg: 'bg-blue-light', href: '/summary' },
    { label: 'Load Truck', sub: 'BOL & ship', icon: Truck, color: 'border-gold text-gold', bg: 'bg-gold-light', href: '/loading' },
  ];

  return (
    <div className="space-y-5">
      {/* GO Mode Banner */}
      <div className="bg-occ-green-light border border-occ-green/20 rounded-2xl p-4 flex items-center gap-3">
        <div className="w-3 h-3 rounded-full bg-occ-green animate-pulse-live shrink-0" />
        <div>
          <p className="text-sm font-semibold text-occ-green-dark">GO Mode Active</p>
          <p className="text-xs text-occ-green-dark/70">Collection Week in Progress!</p>
        </div>
      </div>

      {/* KPI Cards */}
      <motion.div variants={container} initial="hidden" animate="show" className="flex gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-1">
        {kpis.map(k => (
          <motion.div key={k.label} variants={item} className={`${k.bg} rounded-2xl p-4 min-w-[130px] flex-shrink-0 snap-start`}>
            <k.icon className={`w-5 h-5 ${k.color} mb-2`} />
            <p className="text-xl font-bold text-navy tabular-nums">{formatCount(k.value)}</p>
            <p className="text-xs text-slate mt-0.5">{k.label}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.3 }}
        className="grid grid-cols-2 gap-3"
      >
        {actions.map(a => (
          <a
            key={a.label}
            href={`#${a.href}`}
            className={`${a.bg} border-2 ${a.color} rounded-2xl p-4 flex flex-col items-center text-center gap-1 hover:scale-[1.02] active:scale-[0.97] transition-transform`}
          >
            <a.icon className="w-6 h-6" />
            <span className="text-sm font-semibold">{a.label}</span>
            <span className="text-[10px] opacity-70">{a.sub}</span>
          </a>
        ))}
      </motion.div>

      {/* Welcome Table operational card. CDO Leader is privacy-gated from
          signup counts (see Phase 15a), but they're the host on Day 1 — so
          we give them the *verb* they need: open the kiosk for greeters.
          Counts and names live behind the leadership gate; the kiosk does. */}
      <motion.a
        href={`#/welcome-table?loc=${cdoId}`}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.3 }}
        className="bg-occ-green text-white rounded-2xl p-5 flex items-center gap-4 hover:bg-occ-green-dark transition-colors group"
      >
        <div className="w-14 h-14 bg-white/15 rounded-2xl flex items-center justify-center shrink-0">
          <UserCheck className="w-7 h-7" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display text-lg font-medium leading-tight">Open the Welcome Table</p>
          <p className="text-xs text-white/80 italic mt-0.5 leading-relaxed">
            Hand a greeter the tablet — they&apos;ll check off volunteers as they arrive.
          </p>
        </div>
        <div className="flex flex-col items-center gap-1 text-white/80 group-hover:text-white transition-colors">
          <QrCode className="w-5 h-5" />
          <span className="text-[9px] font-bold uppercase tracking-wider">Kiosk</span>
        </div>
      </motion.a>

      {/* My Drop-offs */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.3 }}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-navy">My Drop-offs</h2>
          <a href="#/dropoffs" className="text-xs font-semibold text-sp-red">Manage</a>
        </div>
        <div className="flex gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-1">
          {dropoffs.map(d => {
            const count = getShoeboxesForLocation(d.id);
            return (
              <div key={d.id} className="bg-bg-card rounded-2xl shadow-card p-4 min-w-[260px] flex-shrink-0 snap-start">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-navy">{d.name}</p>
                  <span className={`w-2 h-2 rounded-full ${
                    d.status === 'active' ? 'bg-occ-green' : d.status === 'inactive' ? 'bg-gold' : 'bg-slate-light'
                  }`} />
                </div>
                <p className="text-xs text-slate">{d.city}, {d.state}</p>
                <p className="text-lg font-bold text-navy tabular-nums mt-2">{count} boxes</p>
                <div className="flex items-center gap-1 mt-1">
                  <Clock className="w-3 h-3 text-slate-light" />
                  <span className="text-[10px] text-slate-light">Updated 2h ago</span>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Today's Activity */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.3 }}
        className="bg-bg-card rounded-2xl shadow-card p-5"
      >
        <h2 className="text-lg font-bold text-navy mb-3">Today&apos;s Activity</h2>
        <div className="space-y-2">
          {recentCheckins.map(e => (
            <div key={e.id} className="flex items-center justify-between py-2 border-b border-border-custom last:border-0">
              <div>
                <p className="text-sm font-medium text-navy">{e.donorName}</p>
                <p className="text-[11px] text-slate">by {e.greeterName}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-navy tabular-nums">+{e.count}</p>
                <p className="text-[10px] text-slate-light">{new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-border-custom flex items-center justify-between">
          <span className="text-sm font-semibold text-navy">Today&apos;s Total</span>
          <span className="text-lg font-bold text-occ-green tabular-nums">
            {recentCheckins.reduce((s, e) => s + e.count, 0)} boxes
          </span>
        </div>
      </motion.div>
    </div>
  );
}
