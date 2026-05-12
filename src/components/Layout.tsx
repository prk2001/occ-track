import { useLocation } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import type { ReactNode } from 'react';
import Navbar from './Navbar';
import BottomNav from './BottomNav';
import Footer from './Footer';
import LockOverlay from './LockOverlay';
import ModeBanner from './ModeBanner';
import { useIdleLock } from '@/hooks/useIdleLock';
import { useAuth } from '@/hooks/useAuth';

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
  '/signups': 'Signups & Schedule',
  '/states': 'States',
  '/settings': 'Settings',
};

interface LayoutProps {
  children: ReactNode;
  hideNav?: boolean;
  /** Disable idle lock — for public pages that shouldn't time out. */
  noIdleLock?: boolean;
}

// Routes considered "private enough" to enable the idle auto-lock.
// Public routes (signup, my-signup magic-link, welcome-table kiosk) opt out
// because they're either single-purpose forms or self-service devices.
const PRIVATE_ROUTES = [
  '/', '/checkin', '/dropoffs', '/totals', '/cartons', '/summary', '/loading',
  '/live', '/volunteers', '/signups', '/states', '/settings',
  '/audit-log', '/outbox', '/security', '/badges',
];

export default function Layout({ children, hideNav, noIdleLock }: LayoutProps) {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const title = PAGE_TITLES[location.pathname] || 'OCC Track';

  // Idle lock applies when:
  //   - The route is private (admin/leadership pages)
  //   - User is authenticated (no idle lock on the login screen)
  //   - Not explicitly disabled (Welcome Table kiosk, etc.)
  // Public signup form, magic-link self-service, and kiosk pages opt out.
  const idleLockActive =
    !noIdleLock && isAuthenticated && PRIVATE_ROUTES.includes(location.pathname);
  const { locked, warning, dismissLock } = useIdleLock({ disabled: !idleLockActive });

  return (
    <div className="min-h-[100dvh] flex flex-col bg-dotted-grid">
      {/* Skip-to-main link — first focusable element on the page. Lets
          keyboard users (and screen-reader users) bypass the navbar on
          every page load instead of tabbing through 5-7 menu items. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:bg-sp-red focus:text-white focus:px-4 focus:py-2 focus:rounded-md focus:shadow-card focus:font-semibold"
      >
        Skip to main content
      </a>
      <ModeBanner />
      {!hideNav && <Navbar title={title} />}
      <AnimatePresence mode="wait">
        <motion.main
          id="main-content"
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
      {idleLockActive && (
        <LockOverlay visible={locked} warning={warning} onUnlock={dismissLock} />
      )}
    </div>
  );
}
