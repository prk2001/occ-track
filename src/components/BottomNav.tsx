import { useLocation } from 'react-router';
import { Home, PlusCircle, Package, FileText, MoreHorizontal, Truck, Radio, Users, MapPin } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/data/mockData';

const ROLE_NAVS: Record<UserRole, { path: string; label: string; icon: React.ElementType }[]> = {
  super_admin: [
    { path: '/', label: 'Home', icon: Home },
    { path: '/states', label: 'States', icon: MapPin },
    { path: '/live', label: 'Live', icon: Radio },
    { path: '/summary', label: 'Reports', icon: FileText },
    { path: '/settings', label: 'More', icon: MoreHorizontal },
  ],
  admin: [
    { path: '/', label: 'Home', icon: Home },
    { path: '/live', label: 'Live', icon: Radio },
    { path: '/summary', label: 'Reports', icon: FileText },
    { path: '/volunteers', label: 'Team', icon: Users },
    { path: '/settings', label: 'More', icon: MoreHorizontal },
  ],
  regional: [
    { path: '/', label: 'Home', icon: Home },
    { path: '/dropoffs', label: 'Drop-offs', icon: Truck },
    { path: '/summary', label: 'Reports', icon: FileText },
    { path: '/states', label: 'States', icon: MapPin },
    { path: '/settings', label: 'More', icon: MoreHorizontal },
  ],
  cdo_leader: [
    { path: '/', label: 'Home', icon: Home },
    { path: '/checkin', label: 'Check-In', icon: PlusCircle },
    { path: '/cartons', label: 'Cartons', icon: Package },
    { path: '/totals', label: 'Totals', icon: FileText },
    { path: '/settings', label: 'More', icon: MoreHorizontal },
  ],
  do_leader: [
    { path: '/', label: 'Home', icon: Home },
    { path: '/checkin', label: 'Check-In', icon: PlusCircle },
    { path: '/totals', label: 'My Totals', icon: FileText },
    { path: '/settings', label: 'More', icon: MoreHorizontal },
  ],
  greeter: [
    { path: '/checkin', label: 'Check-In', icon: PlusCircle },
    { path: '/', label: 'History', icon: FileText },
    { path: '/settings', label: 'More', icon: MoreHorizontal },
  ],
};

export default function BottomNav() {
  const { user } = useAuth();
  const location = useLocation();
  const role: UserRole = user?.role || 'cdo_leader';
  const items = ROLE_NAVS[role] || ROLE_NAVS.cdo_leader;

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname === path;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 h-16 bg-bg-card border-t border-border-custom pb-safe">
      <div className="flex items-center justify-around h-full">
        {items.map((item) => {
          const active = isActive(item.path);
          const Icon = item.icon;
          return (
            <a
              key={item.path}
              href={`#${item.path}`}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 w-16 h-full relative transition-colors',
                active ? 'text-sp-red' : 'text-slate-light'
              )}
            >
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-sp-red rounded-full" />
              )}
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}
