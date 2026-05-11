import { useAuth } from '@/hooks/useAuth';
import { ROLE_CONFIG } from '@/data/mockData';
import type { UserRole } from '@/data/mockData';
import Layout from '@/components/Layout';
import AdminDashboard from '@/components/dashboard/AdminDashboard';
import RegionalDashboard from '@/components/dashboard/RegionalDashboard';
import CDODashboard from '@/components/dashboard/CDODashboard';
import DODashboard from '@/components/dashboard/DODashboard';
import GreeterDashboard from '@/components/dashboard/GreeterDashboard';

export default function Dashboard() {
  const { user } = useAuth();
  const role = user?.role || 'cdo_leader';

  const renderDashboard = (r: UserRole) => {
    switch (r) {
      // Super Admin and SP Admin share the national-view layout; the role pill
      // above differentiates them visually until a dedicated SuperAdmin layout ships.
      case 'super_admin':
      case 'admin':
        return <AdminDashboard />;
      case 'regional': return <RegionalDashboard />;
      case 'cdo_leader': return <CDODashboard />;
      case 'do_leader': return <DODashboard />;
      case 'greeter': return <GreeterDashboard />;
      default: return <CDODashboard />;
    }
  };

  const rc = ROLE_CONFIG[role];
  const isNational = role === 'super_admin' || role === 'admin';

  return (
    <Layout>
      <div className="px-4 py-4 max-w-5xl mx-auto space-y-6 pb-24">
        {/* Role indicator — editorial badge bar */}
        <div className="flex items-center gap-2 flex-wrap pt-1">
          <span
            className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-3 py-1 rounded-full tracking-wider uppercase"
            style={{ backgroundColor: rc.bgColor, color: rc.color }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: rc.color }} />
            {rc.label}
          </span>
          {isNational && (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-sp-red bg-sp-red-light px-2 py-1 rounded-full uppercase tracking-[0.18em]">
              National View
            </span>
          )}
          <span className="text-xs text-ink-light italic">{rc.description}</span>
        </div>

        {renderDashboard(role)}
      </div>
    </Layout>
  );
}
