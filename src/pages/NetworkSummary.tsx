import Layout from '@/components/Layout';
import { FileText, TrendingUp } from 'lucide-react';
import { REGION_DATA, NATIONAL_GOAL, formatCount } from '@/data/mockData';

export default function NetworkSummary() {
  const total = REGION_DATA.reduce((s, r) => s + r.shoeboxCount, 0);

  return (
    <Layout>
      <div className="px-4 py-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-blue-light rounded-xl flex items-center justify-center">
            <FileText className="w-5 h-5 text-blue-accent" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-navy">Network Summary</h2>
            <p className="text-sm text-slate">Collection network totals compilation</p>
          </div>
        </div>

        <div className="bg-bg-card rounded-2xl shadow-card p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-navy">National Progress</h3>
            <TrendingUp className="w-5 h-5 text-occ-green" />
          </div>
          <div className="flex items-end gap-2 mb-2">
            <span className="text-4xl font-bold text-navy tabular-nums">{formatCount(total)}</span>
            <span className="text-sm text-slate mb-1">/ {formatCount(NATIONAL_GOAL)} goal</span>
          </div>
          <div className="w-full h-3 bg-bg-primary rounded-full overflow-hidden">
            <div
              className="h-full bg-occ-green rounded-full transition-all"
              style={{ width: `${Math.min((total / NATIONAL_GOAL) * 100, 100)}%` }}
            />
          </div>
          <p className="text-xs text-slate mt-2">{((total / NATIONAL_GOAL) * 100).toFixed(1)}% of national goal</p>
        </div>

        <div className="bg-bg-card rounded-2xl shadow-card p-4 space-y-3">
          <h3 className="font-semibold text-navy">By Region</h3>
          {REGION_DATA.sort((a, b) => b.shoeboxCount - a.shoeboxCount).map(r => (
            <div key={r.id} className="flex items-center gap-3">
              <span className="text-sm font-medium text-navy w-24">{r.name}</span>
              <div className="flex-1 h-5 bg-bg-primary rounded-lg overflow-hidden">
                <div
                  className="h-full bg-occ-green rounded-lg transition-all"
                  style={{ width: `${(r.shoeboxCount / r.goal) * 100}%` }}
                />
              </div>
              <span className="text-xs font-semibold text-navy tabular-nums w-16 text-right">{formatCount(r.shoeboxCount)}</span>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
