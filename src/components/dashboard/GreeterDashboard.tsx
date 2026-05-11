import { PlusCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { SHOEBOX_ENTRIES, LOCATIONS, formatCount } from '@/data/mockData';

export default function GreeterDashboard() {
  const locationId = 'cdo1';
  const location = LOCATIONS.find(l => l.id === locationId);
  const todayEntries = SHOEBOX_ENTRIES.filter(e => e.locationId === locationId && e.date === '2024-11-18');
  const todayTotal = todayEntries.reduce((s, e) => s + e.count, 0);
  const allLocationEntries = SHOEBOX_ENTRIES.filter(e => e.locationId === locationId && e.date === '2024-11-18');
  const locationTotal = allLocationEntries.reduce((s, e) => s + e.count, 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-navy">{location?.name}</h2>
        <p className="text-xs text-slate">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* Big Number */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
        className="bg-bg-card rounded-2xl shadow-card p-8 text-center"
      >
        <p className="text-xs text-slate uppercase tracking-wider mb-3">Boxes Today</p>
        <motion.p
          className="text-7xl font-bold text-navy tabular-nums"
          key={todayTotal}
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          {todayTotal}
        </motion.p>
        <p className="text-sm text-slate mt-2">shoeboxes checked in</p>
      </motion.div>

      {/* Primary Action */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.3 }}
      >
        <a
          href="#/checkin"
          className="w-full h-[72px] bg-sp-red text-white text-lg font-bold rounded-2xl flex items-center justify-center gap-3 shadow-lg hover:bg-sp-red-dark active:scale-[0.97] transition-all"
        >
          <PlusCircle className="w-6 h-6" />
          Check In Donor
        </a>
      </motion.div>

      {/* Quick Stats */}
      <div className="flex justify-center gap-8 text-center">
        <div>
          <p className="text-xs text-slate">My check-ins today</p>
          <p className="text-lg font-bold text-navy tabular-nums">{todayEntries.length}</p>
        </div>
        <div className="w-px bg-border-custom" />
        <div>
          <p className="text-xs text-slate">Total at this location</p>
          <p className="text-lg font-bold text-navy tabular-nums">{locationTotal}</p>
        </div>
      </div>

      {/* Recent Check-ins */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.3 }}
        className="bg-bg-card rounded-2xl shadow-card p-5"
      >
        <h2 className="text-base font-bold text-navy mb-3">Recent Check-ins</h2>
        <div className="space-y-2">
          {todayEntries.slice(0, 5).map(e => (
            <div key={e.id} className="flex items-center justify-between py-2 border-b border-border-custom last:border-0">
              <div>
                <p className="text-sm text-navy">{e.donorName}</p>
                <p className="text-[11px] text-slate-light">
                  {new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <span className="text-sm font-bold text-occ-green tabular-nums">+{e.count}</span>
            </div>
          ))}
        </div>
        <a href="#" className="block text-center text-xs font-semibold text-sp-red mt-3">View All</a>
      </motion.div>
    </div>
  );
}
