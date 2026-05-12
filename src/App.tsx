import { useEffect } from 'react';
import { Routes, Route } from 'react-router';
import { AuthProvider } from '@/hooks/useAuth';
import { startTamperWatcher } from '@/lib/tamperDetection';
import Dashboard from '@/pages/Dashboard';
import Login from '@/pages/Login';
import CheckIn from '@/pages/CheckIn';
import DropoffManagement from '@/pages/DropoffManagement';
import DailyTotals from '@/pages/DailyTotals';
import Cartonization from '@/pages/Cartonization';
import NetworkSummary from '@/pages/NetworkSummary';
import BolLoading from '@/pages/BolLoading';
import LiveTracker from '@/pages/LiveTracker';
import Volunteers from '@/pages/Volunteers';
import Clock from '@/pages/Clock';
import VolunteerSignup from '@/pages/VolunteerSignup';
import Signups from '@/pages/Signups';
import MySignup from '@/pages/MySignup';
import WelcomeTable from '@/pages/WelcomeTable';
import Badges from '@/pages/Badges';
import AuditLog from '@/pages/AuditLog';
import SecurityCenter from '@/pages/SecurityCenter';
import Outbox from '@/pages/Outbox';
import States from '@/pages/States';
import Settings from '@/pages/Settings';
import NotFound from '@/pages/NotFound';

export default function App() {
  // Background tamper-detection watcher: runs auditAllProtectedKeys() every
  // 30 seconds + once on mount. Fires a security signal on any mismatch.
  useEffect(() => {
    const stop = startTamperWatcher();
    return stop;
  }, []);
  return (
    <AuthProvider>
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
    </AuthProvider>
  );
}
