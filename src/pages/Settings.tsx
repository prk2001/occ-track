import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Settings as SettingsIcon, Bell, Lock, HelpCircle, ChevronRight, LogOut,
  User as UserIcon, MapPin, Volume2, Eye, Database, Pencil,
  FlaskConical, ShieldCheck, AlertTriangle,
} from 'lucide-react';
import Layout from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';
import { useAppMode } from '@/lib/appMode';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { ROLE_CONFIG, getLocationById } from '@/data/mockData';

export default function Settings() {
  const { user, logout, isSuperAdmin } = useAuth();
  const { mode, setMode, isTest, history } = useAppMode();
  const rc = user ? ROLE_CONFIG[user.role] : null;
  const myLocation = user?.locationId ? getLocationById(user.locationId) : null;

  const [notifPushDrops, setNotifPushDrops] = useLocalStorage('occ:notif-push-drops', true);
  const [notifDailyDigest, setNotifDailyDigest] = useLocalStorage('occ:notif-daily-digest', true);
  const [notifMilestones, setNotifMilestones] = useLocalStorage('occ:notif-milestones', true);
  const [notifAlerts, setNotifAlerts] = useLocalStorage('occ:notif-alerts', true);
  const [notifSubmissions, setNotifSubmissions] = useLocalStorage('occ:notif-submissions', false);
  const [notifWeekly, setNotifWeekly] = useLocalStorage('occ:notif-weekly', true);
  const [notifQuietHours, setNotifQuietHours] = useLocalStorage('occ:notif-quiet', true);

  const [soundEnabled, setSoundEnabled] = useLocalStorage('occ:sound', true);
  const [hapticEnabled, setHapticEnabled] = useLocalStorage('occ:haptic', true);
  const [highContrast, setHighContrast] = useLocalStorage('occ:high-contrast', false);
  const [reduceMotion, setReduceMotion] = useLocalStorage('occ:reduce-motion', false);

  const [textSize, setTextSize] = useState<'sm' | 'md' | 'lg'>('md');

  return (
    <Layout>
      <div className="px-4 py-4 max-w-3xl mx-auto space-y-6 pb-24">
        {/* Editorial hero */}
        <header className="space-y-2 pt-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-sp-red">
            Account & Preferences
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-medium text-ink leading-tight tracking-tight">
            Make it <span className="font-display-italic text-sp-red">yours.</span>
          </h1>
        </header>

        {/* Profile card */}
        {user && (
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-bg-card rounded-2xl shadow-card border border-border-custom p-5"
          >
            <div className="flex items-center gap-4">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-display text-2xl font-medium shrink-0"
                style={{ backgroundColor: rc?.color || '#94A3B8' }}
              >
                {user.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-display text-xl font-medium text-ink leading-tight truncate">{user.name}</h2>
                <p className="text-xs text-ink-light truncate">{user.email}</p>
                <span
                  className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full mt-1.5"
                  style={{ backgroundColor: rc?.bgColor, color: rc?.color }}
                >
                  <span className="w-1 h-1 rounded-full" style={{ backgroundColor: rc?.color }} />
                  {rc?.label}
                </span>
              </div>
              <button className="touch-target shrink-0 text-ink-light hover:text-sp-red transition-colors" aria-label="Edit profile">
                <Pencil className="w-4 h-4" />
              </button>
            </div>
            {myLocation && (
              <div className="mt-4 pt-4 border-t border-border-custom flex items-start gap-2 text-xs text-ink-light">
                <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-ink">{myLocation.name}</p>
                  <p>{myLocation.address} · {myLocation.city}, {myLocation.state} {myLocation.zip}</p>
                </div>
              </div>
            )}
          </motion.section>
        )}

        {/* App Mode — Super Admin only. THE critical data-integrity control. */}
        {isSuperAdmin && (
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="bg-bg-card rounded-2xl shadow-card border border-border-custom overflow-hidden"
          >
            <header className="px-5 py-4 border-b border-border-custom flex items-center gap-2">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                isTest ? 'bg-gold-light' : 'bg-occ-green-light'
              }`}>
                {isTest ? (
                  <FlaskConical className="w-5 h-5 text-gold" />
                ) : (
                  <ShieldCheck className="w-5 h-5 text-occ-green" />
                )}
              </div>
              <div>
                <h2 className="font-display text-base text-ink leading-tight">
                  App Mode
                </h2>
                <p className="text-[11px] text-ink-light italic">
                  Production locks shoebox + carton entry. Testing unlocks it for demos and training.
                </p>
              </div>
            </header>
            <div className="p-5 space-y-4">
              {/* Mode selector */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    if (mode === 'production') return;
                    const reason = window.prompt('Why are you switching to PRODUCTION mode?\n\nThis enables real Collection Week tally protection.');
                    setMode('production', user, reason ?? undefined);
                  }}
                  className={`relative p-4 rounded-2xl border-2 text-left transition-all ${
                    mode === 'production'
                      ? 'border-occ-green bg-occ-green-light'
                      : 'border-border-custom bg-bg-primary hover:border-occ-green/40'
                  }`}
                >
                  <ShieldCheck className={`w-5 h-5 mb-1.5 ${
                    mode === 'production' ? 'text-occ-green' : 'text-ink-light'
                  }`} />
                  <p className={`font-display text-base ${
                    mode === 'production' ? 'text-occ-green-dark' : 'text-ink'
                  }`}>
                    Production
                  </p>
                  <p className="text-[10px] text-ink-light italic mt-0.5 leading-relaxed">
                    Shoebox + carton entry locked. Real Collection Week tallies safe.
                  </p>
                  {mode === 'production' && (
                    <span className="absolute top-2 right-2 text-[9px] font-bold uppercase tracking-wider text-occ-green bg-occ-green-light/80 px-1.5 py-0.5 rounded">
                      Active
                    </span>
                  )}
                </button>
                <button
                  onClick={() => {
                    if (mode === 'test') return;
                    const confirmed = window.confirm(
                      'Switch to TESTING MODE?\n\nIn testing mode, all shoebox + carton entry is unlocked. Data entered will NOT be counted toward real Collection Week totals, but a persistent banner will appear at the top of every page to remind staff. The switch itself will be logged with your name + timestamp.\n\nContinue?',
                    );
                    if (!confirmed) return;
                    const reason = window.prompt('Why are you switching to TESTING MODE? (e.g. "Training new greeter", "QA demo")');
                    setMode('test', user, reason ?? undefined);
                  }}
                  className={`relative p-4 rounded-2xl border-2 text-left transition-all ${
                    mode === 'test'
                      ? 'border-gold bg-gold-light'
                      : 'border-border-custom bg-bg-primary hover:border-gold/40'
                  }`}
                >
                  <FlaskConical className={`w-5 h-5 mb-1.5 ${
                    mode === 'test' ? 'text-gold' : 'text-ink-light'
                  }`} />
                  <p className={`font-display text-base ${
                    mode === 'test' ? 'text-gold' : 'text-ink'
                  }`}>
                    Testing
                  </p>
                  <p className="text-[10px] text-ink-light italic mt-0.5 leading-relaxed">
                    Full read/write for training, QA, demos. Entries NOT counted.
                  </p>
                  {mode === 'test' && (
                    <span className="absolute top-2 right-2 text-[9px] font-bold uppercase tracking-wider text-gold bg-white/80 px-1.5 py-0.5 rounded">
                      Active
                    </span>
                  )}
                </button>
              </div>

              {/* Warning callout for test mode */}
              {isTest && (
                <div className="bg-gold-light border border-gold rounded-xl p-3 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-gold shrink-0 mt-0.5" />
                  <p className="text-xs text-ink leading-relaxed">
                    Testing mode is ON. Switch back to production before real Collection Week
                    begins or any data entered today will mingle with real tallies.
                  </p>
                </div>
              )}

              {/* Recent mode-change history */}
              {history.length > 0 && (
                <details className="pt-3 border-t border-border-custom/60">
                  <summary className="text-[11px] font-bold uppercase tracking-wider text-ink-light cursor-pointer hover:text-ink">
                    Mode-change ledger ({history.length} {history.length === 1 ? 'entry' : 'entries'})
                  </summary>
                  <ul className="mt-3 space-y-2 max-h-64 overflow-y-auto">
                    {history.slice(0, 20).map((h) => (
                      <li key={h.id} className="bg-bg-primary rounded-lg p-3 text-xs">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="font-semibold text-ink">
                            {h.from.toUpperCase()} → {h.to.toUpperCase()}
                          </span>
                          <span className="text-[10px] text-ink-light tabular-nums">
                            {new Date(h.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-ink-light mt-1">
                          by <span className="font-medium text-ink">{h.actorName}</span>
                          {h.reason && <span className="italic"> · {h.reason}</span>}
                        </p>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          </motion.section>
        )}

        {/* Notifications */}
        <SettingsSection icon={Bell} title="Notifications">
          <ToggleRow label="Push notifications for drop-offs" sub="When boxes arrive at your CDO" enabled={notifPushDrops} onChange={setNotifPushDrops} />
          <ToggleRow label="Daily digest" sub="Morning summary of yesterday" enabled={notifDailyDigest} onChange={setNotifDailyDigest} />
          <ToggleRow label="Milestone celebrations" sub="500K, 1M, regional wins" enabled={notifMilestones} onChange={setNotifMilestones} />
          <ToggleRow label="Operational alerts" sub="Late drop-offs, transport delays" enabled={notifAlerts} onChange={setNotifAlerts} />
          <ToggleRow label="Submission confirmations" sub="When packets reach Regional" enabled={notifSubmissions} onChange={setNotifSubmissions} />
          <ToggleRow label="Weekly recap" sub="Sent every Sunday evening" enabled={notifWeekly} onChange={setNotifWeekly} />
          <ToggleRow label="Quiet hours (9 PM – 7 AM)" sub="Pause non-urgent alerts overnight" enabled={notifQuietHours} onChange={setNotifQuietHours} />
        </SettingsSection>

        {/* Display */}
        <SettingsSection icon={Eye} title="Display">
          <div className="px-4 py-4 border-b border-border-custom">
            <p className="text-sm font-medium text-ink mb-3">Text size</p>
            <div className="grid grid-cols-3 gap-2 p-1 bg-bg-primary rounded-xl">
              {(['sm', 'md', 'lg'] as const).map((size) => (
                <button
                  key={size}
                  onClick={() => setTextSize(size)}
                  className={`h-9 rounded-lg text-xs font-semibold transition-all ${
                    textSize === size ? 'bg-bg-card shadow-card text-ink' : 'text-ink-light'
                  }`}
                >
                  {size === 'sm' ? 'Small' : size === 'md' ? 'Default' : 'Large'}
                </button>
              ))}
            </div>
          </div>
          <ToggleRow label="High contrast" sub="Stronger borders + bolder colors" enabled={highContrast} onChange={setHighContrast} />
          <ToggleRow label="Reduce motion" sub="Disable card + page animations" enabled={reduceMotion} onChange={setReduceMotion} />
        </SettingsSection>

        {/* Sound & Haptics */}
        <SettingsSection icon={Volume2} title="Sound & Haptics">
          <ToggleRow label="Success sounds" sub="Confirmation tones on check-in" enabled={soundEnabled} onChange={setSoundEnabled} />
          <ToggleRow label="Haptic feedback" sub="Subtle vibrations on tap" enabled={hapticEnabled} onChange={setHapticEnabled} />
        </SettingsSection>

        {/* Privacy + Support */}
        <SettingsSection icon={Lock} title="Privacy & Data">
          <LinkRow icon={Database} label="Export my data" sub="Download a copy of your activity" />
          <LinkRow icon={Lock} label="Security" sub="Password, 2FA, sessions" />
        </SettingsSection>

        <SettingsSection icon={HelpCircle} title="Support">
          <LinkRow icon={HelpCircle} label="Help center" sub="Guides for your role" />
          <LinkRow icon={UserIcon} label="Contact your Regional Coordinator" sub="Available during Collection Week" />
        </SettingsSection>

        {/* About */}
        <section className="bg-bg-card rounded-2xl shadow-card border border-border-custom p-5 text-center">
          <p className="font-display-italic text-xl text-sp-red leading-none mb-2">In Jesus&apos; Name.</p>
          <p className="text-[11px] text-ink-light">OCC Track v0.5 · Build {new Date().toISOString().slice(0, 10).replace(/-/g, '')}</p>
          <p className="text-[10px] text-ink-light/70 mt-1">Samaritan&apos;s Purse · Established 1970 · Boone, NC</p>
        </section>

        {/* Sign out */}
        <button
          onClick={logout}
          className="w-full h-14 bg-bg-card border-2 border-sp-red/30 text-sp-red text-base font-semibold rounded-2xl flex items-center justify-center gap-2 hover:bg-sp-red-light transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </div>
    </Layout>
  );
}

function SettingsSection({ icon: Icon, title, children }: { icon: typeof SettingsIcon; title: string; children: React.ReactNode }) {
  return (
    <section className="bg-bg-card rounded-2xl shadow-card border border-border-custom overflow-hidden">
      <header className="px-4 py-3 border-b border-border-custom flex items-center gap-2">
        <Icon className="w-4 h-4 text-sp-red" />
        <h2 className="font-display text-base font-medium text-ink leading-none">{title}</h2>
      </header>
      <div>{children}</div>
    </section>
  );
}

function ToggleRow({ label, sub, enabled, onChange }: { label: string; sub: string; enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-bg-cream/40 transition-colors border-b border-border-custom/60 last:border-0"
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-ink">{label}</p>
        <p className="text-[11px] text-ink-light">{sub}</p>
      </div>
      <span
        className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
          enabled ? 'bg-occ-green' : 'bg-ink-light/30'
        }`}
      >
        <motion.span
          className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm"
          animate={{ x: enabled ? 20 : 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </span>
    </button>
  );
}

function LinkRow({ icon: Icon, label, sub }: { icon: typeof Bell; label: string; sub: string }) {
  return (
    <button className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-bg-cream/40 transition-colors border-b border-border-custom/60 last:border-0">
      <div className="w-8 h-8 bg-bg-primary rounded-lg flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-ink-light" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-ink">{label}</p>
        <p className="text-[11px] text-ink-light">{sub}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-ink-light/60 shrink-0" />
    </button>
  );
}
