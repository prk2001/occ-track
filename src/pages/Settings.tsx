import Layout from '@/components/Layout';
import { Settings as SettingsIcon, Bell, Lock, HelpCircle, ChevronRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { ROLE_CONFIG } from '@/data/mockData';

export default function Settings() {
  const { user } = useAuth();
  const rc = user ? ROLE_CONFIG[user.role] : null;

  const sections = [
    {
      title: 'Account',
      items: [
        { icon: SettingsIcon, label: 'Profile', desc: user?.name || 'Your profile' },
        { icon: Bell, label: 'Notifications', desc: 'Push, email alerts' },
        { icon: Lock, label: 'Security', desc: 'Password, 2FA' },
      ],
    },
    {
      title: 'Support',
      items: [
        { icon: HelpCircle, label: 'Help & FAQ', desc: 'Guides and support' },
      ],
    },
  ];

  return (
    <Layout>
      <div className="px-4 py-6 max-w-4xl mx-auto space-y-6">
        {user && (
          <div className="bg-bg-card rounded-2xl shadow-card p-6 flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0"
              style={{ backgroundColor: rc?.color || '#94A3B8' }}
            >
              {user.name.charAt(0)}
            </div>
            <div>
              <p className="font-semibold text-navy text-lg">{user.name}</p>
              <p className="text-sm text-slate">{user.email}</p>
              <span
                className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1"
                style={{ backgroundColor: rc?.bgColor, color: rc?.color }}
              >
                {rc?.label}
              </span>
            </div>
          </div>
        )}

        {sections.map(section => (
          <div key={section.title} className="bg-bg-card rounded-2xl shadow-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border-custom">
              <h3 className="text-xs font-semibold text-slate uppercase tracking-wider">{section.title}</h3>
            </div>
            {section.items.map(item => (
              <button
                key={item.label}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-bg-primary transition-colors border-b border-border-custom last:border-0"
              >
                <div className="w-9 h-9 bg-bg-primary rounded-lg flex items-center justify-center shrink-0">
                  <item.icon className="w-4 h-4 text-slate" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-navy">{item.label}</p>
                  <p className="text-xs text-slate">{item.desc}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-light shrink-0" />
              </button>
            ))}
          </div>
        ))}
      </div>
    </Layout>
  );
}
