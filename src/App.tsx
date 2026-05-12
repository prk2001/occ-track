import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route } from 'react-router';
import ErrorBoundary from '@/components/ErrorBoundary';
import { AuthProvider } from '@/hooks/useAuth';
import { I18nProvider } from '@/lib/i18n';
import { AppModeProvider } from '@/lib/appMode';
import { startTamperWatcher } from '@/lib/tamperDetection';
import { startAnomalyWatcher } from '@/lib/anomalyDetector';

// Eager imports for routes that are part of the critical-path (volunteer
// landing + login + signup wizard + magic link). Public users hit these
// first; bundling them inline keeps first-paint fast.
import Dashboard from '@/pages/Dashboard';
import Login from '@/pages/Login';
import VolunteerSignup from '@/pages/VolunteerSignup';
import MySignup from '@/pages/MySignup';
import WelcomeTable from '@/pages/WelcomeTable';
import NotFound from '@/pages/NotFound';

// Lazy-loaded admin/leadership routes — these add weight a volunteer
// will never need. Audit P1.20: previously the entire 358 KB gzipped bundle
// was downloaded for /signup. Code-splitting moves ~150 KB of admin code
// to a separate chunk that only loads when the admin route is visited.
const CheckIn = lazy(() => import('@/pages/CheckIn'));
const DropoffManagement = lazy(() => import('@/pages/DropoffManagement'));
const DailyTotals = lazy(() => import('@/pages/DailyTotals'));
const Cartonization = lazy(() => import('@/pages/Cartonization'));
const NetworkSummary = lazy(() => import('@/pages/NetworkSummary'));
const BolLoading = lazy(() => import('@/pages/BolLoading'));
const LiveTracker = lazy(() => import('@/pages/LiveTracker'));
const Volunteers = lazy(() => import('@/pages/Volunteers'));
const Clock = lazy(() => import('@/pages/Clock'));
const Signups = lazy(() => import('@/pages/Signups'));
const Badges = lazy(() => import('@/pages/Badges'));
const AuditLog = lazy(() => import('@/pages/AuditLog'));
const SecurityCenter = lazy(() => import('@/pages/SecurityCenter'));
const Outbox = lazy(() => import('@/pages/Outbox'));
const States = lazy(() => import('@/pages/States'));
const Settings = lazy(() => import('@/pages/Settings'));

// Suspense fallback while a lazy route is being fetched. Plain + minimal
// so it doesn't flash a "loading" screen unless the network is genuinely slow.
function RouteFallback() {
  return (
    <div className="min-h-[50dvh] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-sp-red border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function App() {
  // Background tamper-detection watcher: runs auditAllProtectedKeys() every
  // 30 seconds + once on mount. Fires a security signal on any mismatch.
  useEffect(() => {
    const stop = startTamperWatcher();
    return stop;
  }, []);

  // Background anomaly watcher: every 60s, scan the security log for
  // honeypot/throttle/brute-force spikes and dispatch alerts to Super
  // Admin via the outbox. Hardcoded to Franklin Graham (u0) for demo.
  useEffect(() => {
    const stop = startAnomalyWatcher({
      superAdminUserId: 'u0',
      superAdminName: 'Franklin Graham',
      superAdminEmail: 'fgraham@samaritanspurse.org',
    });
    return stop;
  }, []);
  return (
    <ErrorBoundary>
      <I18nProvider>
        <AppModeProvider>
          <AuthProvider>
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/login" element={<Login />} />
                <Route path="/checkin" element={<CheckIn />} />
                <Route path="/dropoffs" element={<DropoffManagement />} />
                <Route path="/totals" element={<DailyTotals />} />
                <Route path="/cartons" element={<Cartonization />} />
                <Route path="/summary" element={<NetworkSummary />} />
                <Route path="/loading" element={<BolLoading />} />
                <Route path="/live" element={<LiveTracker />} />
                <Route path="/volunteers" element={<Volunteers />} />
                <Route path="/clock" element={<Clock />} />
                <Route path="/signup" element={<VolunteerSignup />} />
                <Route path="/signups" element={<Signups />} />
                <Route path="/my-signup" element={<MySignup />} />
                <Route path="/welcome-table" element={<WelcomeTable />} />
                <Route path="/badges" element={<Badges />} />
                <Route path="/audit-log" element={<AuditLog />} />
                <Route path="/outbox" element={<Outbox />} />
                <Route path="/security" element={<SecurityCenter />} />
                <Route path="/states" element={<States />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </AuthProvider>
        </AppModeProvider>
      </I18nProvider>
    </ErrorBoundary>
  );
}
