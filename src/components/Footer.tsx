import { Mark } from '@/components/Logo';
import { MapPin } from 'lucide-react';

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-6 mb-20 px-4">
      <div className="max-w-4xl mx-auto bg-bg-card border border-border-custom rounded-2xl p-6 text-center space-y-3 shadow-card">
        <div className="flex items-center justify-center gap-2">
          <Mark size={28} />
          <div className="flex flex-col items-start leading-none">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-sp-red">Operation Christmas Child</span>
            <span className="text-sm font-bold text-navy">A project of Samaritan&apos;s Purse</span>
          </div>
        </div>

        <p className="text-xs text-slate max-w-md mx-auto leading-relaxed">
          OCC Track is the official digital companion for Drop-off Leaders, Central
          Drop-off Leaders, and Greeters during Collection Week.
        </p>

        <p className="font-display-italic text-2xl text-sp-red leading-none my-1">
          In Jesus&apos; Name.
        </p>

        <div className="pt-3 border-t border-border-custom space-y-1">
          <p className="text-[11px] text-slate flex items-center justify-center gap-1.5">
            <MapPin className="w-3 h-3 text-slate-light" />
            Samaritan&apos;s Purse · 801 Bamboo Road · Boone, NC 28607
          </p>
          <p className="text-[10px] text-slate-light">
            © {year} Samaritan&apos;s Purse. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
