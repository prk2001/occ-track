import { useLocation } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import type { ReactNode } from 'react';
import Navbar from './Navbar';
import BottomNav from './BottomNav';
import Footer from './Footer';

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/login': 'Sign In',
  '/checkin': 'Check-In',
  '/dropoffs': 'Drop-offs',
  '/totals': 'Daily Totals',
  '/cartons': 'Cartons',
  '/summary': 'Network Summary',
  '/loading': 'BOL & Loading',
  '/live': 'Live Tracker',
  '/volunteers': 'Volunteers',
  '/clock': 'Clock In / Out',
  '/signup': 'Volunteer Sign-up',
  '/states': 'States',
  '/settings': 'Settings',
};

interface LayoutProps {
  children: ReactNode;
  hideNav?: boolean;
}

export default function Layout({ children, hideNav }: LayoutProps) {
  const location = useLocation();
  const title = PAGE_TITLES[location.pathname] || 'OCC Track';

  return (
    <div className="min-h-[100dvh] flex flex-col bg-dotted-grid">
      {!hideNav && <Navbar title={title} />}
      <AnimatePresence mode="wait">
        <motion.main
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
          className="flex-1 pb-20 lg:pb-6"
        >
          {children}
        </motion.main>
      </AnimatePresence>
      <Footer />
      {!hideNav && <BottomNav />}
    </div>
  );
}
