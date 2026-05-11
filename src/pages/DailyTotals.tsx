import Layout from '@/components/Layout';
import { FileText, TrendingUp } from 'lucide-react';

export default function DailyTotals() {
  return (
    <Layout>
      <div className="px-4 py-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gold-light rounded-xl flex items-center justify-center">
            <FileText className="w-5 h-5 text-gold" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-navy">Daily Totals</h2>
            <p className="text-sm text-slate">Log and review daily shoebox counts</p>
          </div>
        </div>

        <div className="bg-bg-card rounded-2xl shadow-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-navy">Today&apos;s Count</h3>
            <TrendingUp className="w-5 h-5 text-occ-green" />
          </div>
          <p className="text-5xl font-bold text-navy tabular-nums">47</p>
          <p className="text-sm text-slate mt-1">shoeboxes collected today</p>
        </div>

        <div className="bg-bg-card rounded-2xl shadow-card p-4">
          <h3 className="font-semibold text-navy mb-3">Collection Week Progress</h3>
          <div className="space-y-2">
            {['Nov 16', 'Nov 17', 'Nov 18', 'Nov 19', 'Nov 20', 'Nov 21', 'Nov 22', 'Nov 23'].map((date, i) => (
              <div key={date} className="flex items-center gap-3">
                <span className="text-xs text-slate w-14">{date}</span>
                <div className="flex-1 h-6 bg-bg-primary rounded-lg overflow-hidden">
                  <div
                    className="h-full bg-occ-green rounded-lg transition-all"
                    style={{ width: `${[45, 62, 47, 0, 0, 0, 0, 0][i]}%`, opacity: i === 2 ? 1 : 0.6 }}
                  />
                </div>
                <span className="text-xs font-semibold text-navy tabular-nums w-8 text-right">
                  {[45, 62, 47, 0, 0, 0, 0, 0][i]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
