import { useState } from 'react';
import { Menu, Bell, X, LogOut, Settings, User, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { ROLE_CONFIG } from '@/data/mockData';
import type { UserRole } from '@/data/mockData';
import Logo, { Mark } from '@/components/Logo';

interface NavbarProps {
  title: string;
}

const DEMO_ROLES: UserRole[] = ['super_admin', 'admin', 'regional', 'cdo_leader', 'do_leader', 'greeter'];

export default function Navbar({ title }: NavbarProps) {
  const { user, logout, switchRole } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const roleConfig = user ? ROLE_CONFIG[user.role] : null;
  const unreadCount = 3;

  const navItems = [
    { label: 'Dashboard', path: '/', icon: 'home' },
    { label: 'States', path: '/states', icon: 'states' },
    { label: 'Check-In', path: '/checkin', icon: 'checkin' },
    { label: 'Cartons', path: '/cartons', icon: 'cartons' },
    { label: 'Daily Totals', path: '/totals', icon: 'totals' },
    { label: 'Drop-offs', path: '/dropoffs', icon: 'dropoffs' },
    { label: 'Network Summary', path: '/summary', icon: 'summary' },
    { label: 'BOL & Loading', path: '/loading', icon: 'loading' },
    { label: 'Live Tracker', path: '/live', icon: 'live' },
    { label: 'Volunteers', path: '/volunteers', icon: 'volunteers' },
    { label: 'Settings', path: '/settings', icon: 'settings' },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 h-14 bg-bg-card border-b border-border-custom flex items-center px-4 justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={() => setMenuOpen(true)}
            className="touch-target flex items-center justify-center -ml-1"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6 text-navy" />
          </button>
          <a href="#/" className="flex items-center" aria-label="OCC Track home">
            <Mark size={26} />
          </a>
          <span className="h-5 w-px bg-border-custom shrink-0" aria-hidden="true" />
          <h1 className="font-display text-lg font-medium text-ink leading-tight truncate tracking-tight">{title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setNotifOpen(true)}
            className="touch-target flex items-center justify-center relative"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5 text-navy" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-sp-red text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold cursor-pointer"
            style={{ backgroundColor: roleConfig?.color || '#94A3B8' }}
          >
            {user?.name.charAt(0) || '?'}
          </div>
        </div>
      </header>

      {/* Side Navigation Drawer */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-navy/50 z-50"
              onClick={() => setMenuOpen(false)}
            />
            <motion.div
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: 'tween', duration: 0.25 }}
              className="fixed left-0 top-0 bottom-0 w-80 max-w-[85vw] bg-bg-card z-50 flex flex-col"
            >
              <div className="p-4 border-b border-border-custom">
                <div className="flex items-center justify-between mb-4">
                  <Logo size={32} />
                  <button onClick={() => setMenuOpen(false)} className="touch-target flex items-center justify-center">
                    <X className="w-5 h-5 text-slate" />
                  </button>
                </div>
                {user && (
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: roleConfig?.color || '#94A3B8' }}
                    >
                      {user.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-navy text-sm">{user.name}</p>
                      <span
                        className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full mt-0.5"
                        style={{ backgroundColor: roleConfig?.bgColor, color: roleConfig?.color }}
                      >
                        {roleConfig?.label}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <nav className="flex-1 overflow-y-auto py-2">
                {navItems.map((item) => (
                  <a
                    key={item.path}
                    href={`#${item.path}`}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-sm text-navy hover:bg-bg-primary transition-colors"
                  >
                    <span className="flex-1">{item.label}</span>
                    <ChevronRight className="w-4 h-4 text-slate-light" />
                  </a>
                ))}
              </nav>

              {/* Demo Role Switcher */}
              <div className="p-4 border-t border-border-custom bg-bg-primary">
                <p className="text-[10px] font-semibold text-slate uppercase tracking-wider mb-2">Demo Mode — Switch Role</p>
                <div className="grid grid-cols-2 gap-2">
                  {DEMO_ROLES.map(role => {
                    const rc = ROLE_CONFIG[role];
                    const isActive = user?.role === role;
                    return (
                      <button
                        key={role}
                        onClick={() => { switchRole(role); setMenuOpen(false); }}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all"
                        style={{
                          backgroundColor: isActive ? rc.bgColor : 'white',
                          color: rc.color,
                          border: `1px solid ${isActive ? rc.color : '#E2E8F0'}`,
                        }}
                      >
                        <User className="w-3 h-3" />
                        {rc.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="p-4 border-t border-border-custom">
                <a href="#/settings" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 py-2 text-sm text-slate hover:text-navy">
                  <Settings className="w-4 h-4" />
                  Settings
                </a>
                <button onClick={logout} className="flex items-center gap-3 py-2 text-sm text-slate hover:text-navy w-full">
                  <LogOut className="w-4 h-4" />
                  Log Out
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Notification Drawer */}
      <AnimatePresence>
        {notifOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-navy/50 z-50"
              onClick={() => setNotifOpen(false)}
            />
            <motion.div
              initial={{ x: 320 }}
              animate={{ x: 0 }}
              exit={{ x: 320 }}
              transition={{ type: 'tween', duration: 0.25 }}
              className="fixed right-0 top-0 bottom-0 w-80 max-w-[85vw] bg-bg-card z-50 flex flex-col"
            >
              <div className="p-4 border-b border-border-custom flex items-center justify-between">
                <span className="font-semibold text-navy">Notifications</span>
                <button onClick={() => setNotifOpen(false)} className="touch-target flex items-center justify-center">
                  <X className="w-5 h-5 text-slate" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <NotificationItem
                  type="warning"
                  title="Living Word Church"
                  message="Hasn't reported in 24+ hours"
                  time="2h ago"
                />
                <NotificationItem
                  type="success"
                  title="Midwest Milestone"
                  message="Region hit 500,000 shoeboxes!"
                  time="3h ago"
                />
                <NotificationItem
                  type="info"
                  title="Collection Week Reminder"
                  message="Next scheduled check-in at 3:00 PM"
                  time="5h ago"
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function NotificationItem({ type, title, message, time }: { type: string; title: string; message: string; time: string }) {
  const colors: Record<string, { bg: string; icon: string }> = {
    success: { bg: 'bg-occ-green-light', icon: 'text-occ-green' },
    warning: { bg: 'bg-gold-light', icon: 'text-gold' },
    info: { bg: 'bg-blue-light', icon: 'text-blue-accent' },
    error: { bg: 'bg-sp-red-light', icon: 'text-sp-red' },
  };
  const c = colors[type] || colors.info;
  return (
    <div className="flex gap-3 p-3 rounded-xl bg-bg-primary">
      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${type === 'success' ? 'bg-occ-green' : type === 'warning' ? 'bg-gold' : 'bg-blue-accent'}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-navy">{title}</p>
        <p className="text-xs text-slate mt-0.5">{message}</p>
        <p className="text-[10px] text-slate-light mt-1">{time}</p>
      </div>
    </div>
  );
}
