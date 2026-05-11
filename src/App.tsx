import { Routes, Route } from 'react-router';
import { AuthProvider } from '@/hooks/useAuth';
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
import States from '@/pages/States';
import Settings from '@/pages/Settings';
import NotFound from '@/pages/NotFound';

export default function App() {
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
        <Route path="/states" element={<States />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
  );
}
