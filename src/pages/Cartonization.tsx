import Layout from '@/components/Layout';
import { Package, Plus } from 'lucide-react';
import { CARTONS, getLocationById } from '@/data/mockData';

export default function Cartonization() {
  return (
    <Layout>
      <div className="px-4 py-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-purple-light rounded-xl flex items-center justify-center">
            <Package className="w-5 h-5 text-purple-accent" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-navy">Cartonization</h2>
            <p className="text-sm text-slate">Pack, label, and track cartons</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Open', value: CARTONS.filter(c => c.status === 'open').length, color: 'text-blue-accent', bg: 'bg-blue-light' },
            { label: 'Sealed', value: CARTONS.filter(c => c.status === 'sealed').length, color: 'text-occ-green', bg: 'bg-occ-green-light' },
            { label: 'Loaded', value: CARTONS.filter(c => c.status === 'loaded').length, color: 'text-purple-accent', bg: 'bg-purple-light' },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-2xl p-4 text-center`}>
              <p className={`text-2xl font-bold ${s.color} tabular-nums`}>{s.value}</p>
              <p className="text-xs text-slate mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        <button className="w-full h-14 bg-sp-red text-white font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-sp-red-dark active:scale-[0.97] transition-all shadow-md">
          <Plus className="w-5 h-5" />
          Create New Carton
        </button>

        <div className="bg-bg-card rounded-2xl shadow-card p-4 space-y-3">
          <h3 className="font-semibold text-navy">Cartons</h3>
          {CARTONS.map(c => {
            const loc = getLocationById(c.locationId);
            return (
              <div key={c.id} className="flex items-center justify-between p-3 rounded-xl bg-bg-primary">
                <div>
                  <p className="text-sm font-semibold text-navy">Carton #{c.cartonNumber}</p>
                  <p className="text-xs text-slate">{loc?.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-navy tabular-nums">{c.boxCount} boxes</p>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    c.status === 'open' ? 'bg-blue-light text-blue-accent' :
                    c.status === 'sealed' ? 'bg-occ-green-light text-occ-green' :
                    'bg-purple-light text-purple-accent'
                  }`}>
                    {c.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
