import Layout from '@/components/Layout';
import { Users, UserPlus } from 'lucide-react';
import { USERS, ROLE_CONFIG } from '@/data/mockData';

export default function Volunteers() {
  return (
    <Layout>
      <div className="px-4 py-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-blue-light rounded-xl flex items-center justify-center">
            <Users className="w-5 h-5 text-blue-accent" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-navy">Volunteers</h2>
            <p className="text-sm text-slate">Roster and role management</p>
          </div>
        </div>

        <button className="w-full h-14 bg-sp-red text-white font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-sp-red-dark active:scale-[0.97] transition-all shadow-md">
          <UserPlus className="w-5 h-5" />
          Add Volunteer
        </button>

        <div className="bg-bg-card rounded-2xl shadow-card p-4 space-y-3">
          <h3 className="font-semibold text-navy">Team Members</h3>
          {USERS.map(u => {
            const rc = ROLE_CONFIG[u.role];
            return (
              <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl bg-bg-primary">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                  style={{ backgroundColor: rc.color }}
                >
                  {u.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-navy">{u.name}</p>
                  <p className="text-xs text-slate">{u.email}</p>
                </div>
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
                  style={{ backgroundColor: rc.bgColor, color: rc.color }}
                >
                  {rc.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
