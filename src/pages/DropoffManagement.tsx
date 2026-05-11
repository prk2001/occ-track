import Layout from '@/components/Layout';
import { Truck, MapPin, Phone } from 'lucide-react';
import { LOCATIONS } from '@/data/mockData';

export default function DropoffManagement() {
  const dropoffs = LOCATIONS.filter(l => l.type === 'dropoff');

  return (
    <Layout>
      <div className="px-4 py-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-blue-light rounded-xl flex items-center justify-center">
            <Truck className="w-5 h-5 text-blue-accent" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-navy">Drop-off Management</h2>
            <p className="text-sm text-slate">Manage feeding drop-off locations</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Active', value: dropoffs.filter(d => d.status === 'active').length, color: 'text-occ-green', bg: 'bg-occ-green-light' },
            { label: 'Inactive', value: dropoffs.filter(d => d.status === 'inactive').length, color: 'text-gold', bg: 'bg-gold-light' },
            { label: 'Closed', value: dropoffs.filter(d => d.status === 'closed').length, color: 'text-slate', bg: 'bg-bg-primary' },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-2xl p-4 text-center`}>
              <p className={`text-2xl font-bold ${s.color} tabular-nums`}>{s.value}</p>
              <p className="text-xs text-slate mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="bg-bg-card rounded-2xl shadow-card p-4 space-y-3">
          <h3 className="font-semibold text-navy">Drop-off Locations</h3>
          {dropoffs.map(d => (
            <div key={d.id} className="flex items-start gap-3 p-3 rounded-xl bg-bg-primary">
              <MapPin className="w-4 h-4 text-slate-light mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-navy">{d.name}</p>
                <p className="text-xs text-slate">{d.city}, {d.state}</p>
                <div className="flex items-center gap-1 mt-1">
                  <Phone className="w-3 h-3 text-slate-light" />
                  <span className="text-xs text-slate-light">{d.contactPhone}</span>
                </div>
              </div>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                d.status === 'active' ? 'bg-occ-green-light text-occ-green' :
                d.status === 'inactive' ? 'bg-gold-light text-gold' :
                'bg-bg-primary text-slate'
              }`}>
                {d.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
