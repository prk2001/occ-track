import { Gift, PlusCircle, TrendingUp, FileText, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { SHOEBOX_ENTRIES, LOCATIONS } from '@/data/mockData';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, x: 20 }, show: { opacity: 1, x: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } } };

export default function DODashboard() {
  const doId = 'do1';
  const location = LOCATIONS.find(l => l.id === doId);
  const myEntries = SHOEBOX_ENTRIES.filter(e => e.locationId === doId);
  const totalCollected = myEntries.reduce((s, e) => s + e.count, 0);
  const todayEntries = myEntries.filter(e => e.date === '2024-11-18');
  const todayCount = todayEntries.reduce((s, e) => s + e.count, 0);

  const kpis = [
    { label: 'Total Collected', value: totalCollected, icon: Gift, color: 'text-occ-green', bg: 'bg-occ-green-light' },
    { label: 'Today', value: todayCount, icon: TrendingUp, color: 'text-sp-red', bg: 'bg-sp-red-light' },
  ];

  const dates = ['Nov 16', 'Nov 17', 'Nov 18', 'Nov 19', 'Nov 20', 'Nov 21', 'Nov 22', 'Nov 23'];
  const submitted = [true, true, true, false, false, false, false, false];

  return (
    <div className="space-y-5">
      {/* Status Toggle */}
      <div className="flex items-center justify-between bg-bg-card rounded-2xl shadow-card p-4">
        <div>
          <p className="text-sm font-semibold text-navy">{location?.name}</p>
          <p className="text-xs text-slate">{location?.city}, {location?.state}</p>
        </div>
        <span className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full bg-occ-green-light text-occ-green">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Open
        </span>
      </div>

      {/* KPI Cards */}
      <motion.div variants={container} initial="hidden" animate="show" className="flex gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-1">
        {kpis.map(k => (
          <motion.div key={k.label} variants={item} className={`${k.bg} rounded-2xl p-4 min-w-[130px] flex-1 snap-start`}>
            <k.icon className={`w-5 h-5 ${k.color} mb-2`} />
            <p className="text-3xl font-bold text-navy tabular-nums">{k.value}</p>
            <p className="text-xs text-slate mt-0.5">{k.label}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Date Selector */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {dates.map((d, i) => (
          <button
            key={d}
            className={`px-4 py-2 rounded-full text-xs font-semibold shrink-0 transition-colors ${
              i === 2 ? 'bg-sp-red text-white' : submitted[i] ? 'bg-occ-green-light text-occ-green' : 'bg-bg-card text-slate border border-border-custom'
            }`}
          >
            {d}
          </button>
        ))}
      </div>

      {/* Today's Count */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.3 }}
        className="bg-bg-card rounded-2xl shadow-card p-6 text-center"
      >
        <p className="text-xs text-slate uppercase tracking-wider mb-2">Today&apos;s Count</p>
        <p className="text-6xl font-bold text-navy tabular-nums">{todayCount}</p>
        <p className="text-sm text-slate mt-1">shoeboxes</p>
        <div className="flex items-center justify-center gap-3 mt-4">
          <button className="w-12 h-12 rounded-full bg-sp-red-light text-sp-red font-bold text-lg hover:bg-sp-red hover:text-white transition-colors">-</button>
          <a href="#/checkin" className="h-12 px-6 bg-sp-red text-white font-semibold rounded-xl flex items-center gap-2 hover:bg-sp-red-dark active:scale-[0.97] transition-all">
            <PlusCircle className="w-4 h-4" />
            Log Donors
          </a>
          <button className="w-12 h-12 rounded-full bg-occ-green-light text-occ-green font-bold text-lg hover:bg-occ-green hover:text-white transition-colors">+</button>
        </div>
      </motion.div>

      {/* Donor List */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.3 }}
        className="bg-bg-card rounded-2xl shadow-card p-5"
      >
        <h2 className="text-base font-bold text-navy mb-3">Today&apos;s Donors</h2>
        <div className="space-y-2">
          {todayEntries.map(e => (
            <div key={e.id} className="flex items-center justify-between py-2 border-b border-border-custom last:border-0">
              <p className="text-sm text-navy">{e.donorName}</p>
              <span className="text-sm font-bold text-navy tabular-nums">+{e.count}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Submission Status */}
      <div className="bg-bg-card rounded-2xl shadow-card p-5">
        <h2 className="text-base font-bold text-navy mb-3">Submission Progress</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate">Daily totals logged</span>
            <span className="text-sm font-semibold text-navy">3 of 8 days</span>
          </div>
          <div className="w-full h-2 bg-bg-primary rounded-full overflow-hidden">
            <div className="h-full bg-occ-green rounded-full" style={{ width: '37.5%' }} />
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate">Transferred to central</span>
            <span className="font-semibold text-slate-light">No</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3">
        <a href="#/checkin" className="flex-1 h-12 bg-occ-green text-white text-sm font-semibold rounded-xl flex items-center justify-center hover:bg-occ-green-dark active:scale-[0.97] transition-all">
          <PlusCircle className="w-4 h-4 mr-1.5" />
          Log Donors
        </a>
        <a href="#/totals" className="flex-1 h-12 border-2 border-sp-red text-sp-red text-sm font-semibold rounded-xl flex items-center justify-center hover:bg-sp-red-light active:scale-[0.97] transition-all">
          <FileText className="w-4 h-4 mr-1.5" />
          My Totals
        </a>
      </div>
    </div>
  );
}
