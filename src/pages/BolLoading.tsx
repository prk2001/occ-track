import Layout from '@/components/Layout';
import { Truck, Package } from 'lucide-react';
import { BOLS, getLocationById } from '@/data/mockData';

export default function BolLoading() {
  return (
    <Layout>
      <div className="px-4 py-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gold-light rounded-xl flex items-center justify-center">
            <Truck className="w-5 h-5 text-gold" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-navy">BOL & Loading</h2>
            <p className="text-sm text-slate">Bill of Lading and truck loading</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Ready', value: BOLS.filter(b => b.status === 'ready').length, color: 'text-gold', bg: 'bg-gold-light' },
            { label: 'In Transit', value: BOLS.filter(b => b.status === 'in_transit').length, color: 'text-occ-green', bg: 'bg-occ-green-light' },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-2xl p-4 text-center`}>
              <p className={`text-2xl font-bold ${s.color} tabular-nums`}>{s.value}</p>
              <p className="text-xs text-slate mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        <button className="w-full h-14 bg-sp-red text-white font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-sp-red-dark active:scale-[0.97] transition-all shadow-md">
          <Truck className="w-5 h-5" />
          Create BOL
        </button>

        <div className="bg-bg-card rounded-2xl shadow-card p-4 space-y-3">
          <h3 className="font-semibold text-navy">Bills of Lading</h3>
          {BOLS.map(bol => {
            const loc = getLocationById(bol.locationId);
            return (
              <div key={bol.id} className="p-3 rounded-xl bg-bg-primary space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-slate" />
                    <span className="text-sm font-semibold text-navy">{bol.bolNumber}</span>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    bol.status === 'ready' ? 'bg-gold-light text-gold' :
                    bol.status === 'in_transit' ? 'bg-occ-green-light text-occ-green' :
                    'bg-blue-light text-blue-accent'
                  }`}>
                    {bol.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate">
                  <span>{loc?.name}</span>
                  <span className="font-semibold text-navy tabular-nums">{bol.totalBoxes} boxes</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-slate">
                  <Truck className="w-3 h-3" />
                  <span>{bol.trailerId}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
