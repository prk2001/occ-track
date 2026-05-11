import Layout from '@/components/Layout';
import { PlusCircle, User } from 'lucide-react';

export default function CheckIn() {
  return (
    <Layout>
      <div className="px-4 py-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-occ-green-light rounded-xl flex items-center justify-center">
            <PlusCircle className="w-5 h-5 text-occ-green" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-navy">Greeter Check-In</h2>
            <p className="text-sm text-slate">Log shoeboxes from arriving donors</p>
          </div>
        </div>

        <div className="bg-bg-card rounded-2xl shadow-card p-6 text-center space-y-4">
          <p className="text-sm text-slate">This page will provide the greeter interface for quickly logging shoebox donations from donors.</p>
          <div className="flex items-center justify-center gap-4 py-4">
            <div className="flex flex-col items-center">
              <span className="text-4xl font-bold text-navy tabular-nums">0</span>
              <span className="text-xs text-slate mt-1">Boxes Today</span>
            </div>
          </div>
          <button className="w-full h-14 bg-sp-red text-white font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-sp-red-dark active:scale-[0.97] transition-all">
            <PlusCircle className="w-5 h-5" />
            Check In Donor
          </button>
        </div>

        <div className="bg-bg-card rounded-2xl shadow-card p-4">
          <h3 className="font-semibold text-navy mb-3">Recent Check-ins</h3>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-border-custom last:border-0">
                <User className="w-8 h-8 text-slate-light bg-bg-primary rounded-full p-1.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-navy">Donor {i}</p>
                  <p className="text-xs text-slate">Just now</p>
                </div>
                <span className="text-sm font-bold text-navy tabular-nums">{5 - i + 2}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
