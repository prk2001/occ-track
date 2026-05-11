import { Gift, Warehouse, BarChart3, MapPin, AlertTriangle, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { LOCATIONS, REGION_DATA, formatCount, getShoeboxesForLocation } from '@/data/mockData';
import WelcomeTableWidget from '@/components/dashboard/WelcomeTableWidget';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, x: 20 }, show: { opacity: 1, x: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } } };

export default function RegionalDashboard() {
  const region = REGION_DATA[1]; // Southeast
  const regionCDOs = LOCATIONS.filter(l => l.type === 'central' && l.region === 'Southeast');
  const avgPerCDO = Math.round(region.shoeboxCount / region.cdoActive);

  const kpis = [
    { label: 'Region Total', value: formatCount(region.shoeboxCount), icon: Gift, color: 'text-occ-green', bg: 'bg-occ-green-light' },
    { label: 'CDOs', value: `${region.cdoActive}/${region.cdoCount}`, icon: Warehouse, color: 'text-blue-accent', bg: 'bg-blue-light' },
    { label: 'Avg per CDO', value: formatCount(avgPerCDO), icon: BarChart3, color: 'text-purple-accent', bg: 'bg-purple-light' },
  ];

  return (
    <div className="space-y-5">
      <motion.div variants={container} initial="hidden" animate="show" className="flex gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-1">
        {kpis.map(k => (
          <motion.div key={k.label} variants={item} className={`${k.bg} rounded-2xl p-4 min-w-[130px] flex-shrink-0 snap-start`}>
            <k.icon className={`w-5 h-5 ${k.color} mb-2`} />
            <p className="text-xl font-bold text-navy tabular-nums">{k.value}</p>
            <p className="text-xs text-slate mt-0.5">{k.label}</p>
          </motion.div>
        ))}
      </motion.div>

      <WelcomeTableWidget />

      {/* Alerts */}
      {region.cdoCount - region.cdoActive > 0 && (
        <div className="bg-gold-light border border-gold/20 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-gold shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-navy">{region.cdoCount - region.cdoActive} CDO(s) need attention</p>
            <p className="text-xs text-slate mt-1">Some locations haven&apos;t reported in 24+ hours</p>
          </div>
        </div>
      )}

      {/* CDO List */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.3 }}
        className="bg-bg-card rounded-2xl shadow-card p-5"
      >
        <h2 className="text-lg font-bold text-navy mb-3">Central Drop-offs</h2>
        <div className="space-y-3">
          {regionCDOs.map(cdo => {
            const count = getShoeboxesForLocation(cdo.id);
            return (
              <div key={cdo.id} className="flex items-center justify-between p-3 rounded-xl bg-bg-primary">
                <div className="flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-slate-light" />
                  <div>
                    <p className="text-sm font-medium text-navy">{cdo.name}</p>
                    <p className="text-xs text-slate">{cdo.city}, {cdo.state}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-navy tabular-nums">{count}</p>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    cdo.status === 'active' ? 'bg-occ-green-light text-occ-green' : 'bg-slate-100 text-slate'
                  }`}>
                    {cdo.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
