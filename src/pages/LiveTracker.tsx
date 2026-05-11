import Layout from '@/components/Layout';
import { Radio, Activity } from 'lucide-react';
import { REGION_DATA, formatCount } from '@/data/mockData';

export default function LiveTracker() {
  const total = REGION_DATA.reduce((s, r) => s + r.shoeboxCount, 0);

  return (
    <Layout>
      <div className="px-4 py-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-purple-light rounded-xl flex items-center justify-center">
            <Radio className="w-5 h-5 text-purple-accent" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-navy">Live Tracker</h2>
            <p className="text-sm text-slate">National real-time collection tracking</p>
          </div>
        </div>

        <div className="bg-bg-navy rounded-2xl p-6 text-white">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-occ-green" />
            <span className="text-sm font-semibold text-occ-green">LIVE</span>
          </div>
          <p className="text-5xl font-bold tabular-nums">{formatCount(total)}</p>
          <p className="text-sm text-white/70 mt-1">shoeboxes collected nationwide</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {REGION_DATA.map(r => (
            <div key={r.id} className="bg-bg-card rounded-2xl shadow-card p-4">
              <p className="text-xs text-slate mb-1">{r.name}</p>
              <p className="text-xl font-bold text-navy tabular-nums">{formatCount(r.shoeboxCount)}</p>
              <div className="w-full h-1.5 bg-bg-primary rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-occ-green rounded-full" style={{ width: `${(r.shoeboxCount / r.goal) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
