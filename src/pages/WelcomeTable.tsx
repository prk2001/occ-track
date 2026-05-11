import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserCheck, CheckCircle2, X, ArrowLeft, MapPin, Sparkles, Clock as ClockIcon,
} from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Mark } from '@/components/Logo';
import {
  COLLECTION_DAY,
  COLLECTION_DAYS,
  DEFAULT_CDO_ID,
  getLocationById,
} from '@/data/mockData';
import type { StoredSignup } from '@/data/mockData';
import { logAuditEvent } from '@/lib/auditLog';
import { buildArrivalConfirmation, sendMessage } from '@/lib/outbox';

/**
 * Welcome Table — fullscreen kiosk for a tablet at the front door.
 *
 * Designed for a stationary iPad mounted at the welcome table during
 * Collection Week. A volunteer walks up; the greeter (or the volunteer
 * themselves) taps their name; they're checked in.
 *
 * Differences from /signups attendance section:
 *   - No navbar, no padding, no role chrome — every pixel is for the names
 *   - Giant tap targets (min 80px tall) — works with cold fingers + gloves
 *   - Big "ALREADY HERE" stamp confirmation
 *   - Live tick clock + arrival rate progress bar
 *   - Optional ?loc=cdo1 query param scopes to a specific CDO
 *   - No back button (it's a kiosk; greeter exits via the corner X)
 */
export default function WelcomeTable() {
  const [params] = useSearchParams();
  const locationId = params.get('loc') || DEFAULT_CDO_ID;
  const location = getLocationById(locationId);
  const [signups, setSignups] = useLocalStorage<StoredSignup[]>('occ:signups', []);
  const [justCheckedIn, setJustCheckedIn] = useState<{ name: string; firstTime: boolean | null } | null>(null);
  const [tick, setTick] = useState(0);

  // Tick every second so the "live" pulse + time-of-day stay current.
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const todayISODate =
    COLLECTION_DAYS[COLLECTION_DAY - 1]?.date ?? new Date().toISOString().slice(0, 10);

  // Scope to the active CDO + sort: not-yet-arrived first, sorted A→Z by
  // first name (more natural for greeters scanning a roster).
  const scopedSignups = useMemo(
    () => signups.filter((s) => (s.locationId ?? DEFAULT_CDO_ID) === locationId),
    [signups, locationId],
  );
  const sorted = useMemo(() => {
    return [...scopedSignups].sort((a, b) => {
      const aArrived = !!(a.arrivedAt && a.arrivedAt.slice(0, 10) === todayISODate);
      const bArrived = !!(b.arrivedAt && b.arrivedAt.slice(0, 10) === todayISODate);
      if (aArrived !== bArrived) return aArrived ? 1 : -1;
      return a.name.localeCompare(b.name);
    });
  }, [scopedSignups, todayISODate]);

  const arrivedCount = scopedSignups.filter(
    (s) => s.arrivedAt && s.arrivedAt.slice(0, 10) === todayISODate,
  ).length;
  const arrivalRate =
    scopedSignups.length === 0 ? 0 : Math.round((arrivedCount / scopedSignups.length) * 100);

  function markArrived(signup: StoredSignup) {
    const now = new Date().toISOString();
    setSignups((prev) =>
      prev.map((s) => (s.id === signup.id ? { ...s, arrivedAt: now } : s)),
    );
    // Audit + outbox SMS, same as /signups attendance flow.
    logAuditEvent(
      { id: 'kiosk', name: 'Welcome Table Kiosk', role: 'volunteer_self' },
      'mark_arrived',
      `signup:${signup.id}`,
      `Tablet check-in at ${location?.name ?? 'welcome table'}`,
    );
    sendMessage({
      ...buildArrivalConfirmation({
        name: signup.name,
        phone: signup.phone,
        locationName: location?.name ?? 'the welcome table',
      }),
      relatedTarget: `signup:${signup.id}`,
    });
    setJustCheckedIn({ name: signup.name, firstTime: signup.firstTime });
    setTimeout(() => setJustCheckedIn(null), 3500);
  }

  // Track tick so time updates each second — same dep keeps re-render light.
  const nowTime = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  void tick;

  return (
    <div className="fixed inset-0 bg-bg-cream overflow-hidden flex flex-col">
      {/* Top bar — minimal: logo + location + exit. No navbar. */}
      <header className="shrink-0 bg-bg-card border-b border-border-custom px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Mark size={36} />
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-sp-red flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-occ-green animate-pulse-live" />
              Welcome Table · Live
            </p>
            <p className="font-display text-xl text-ink leading-tight">
              {location?.name ?? 'Central Drop-off'} · {location?.city}, {location?.state}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="font-display text-2xl text-ink tabular-nums leading-none">{nowTime}</p>
            <p className="text-[10px] text-ink-light uppercase tracking-wider mt-1">
              Day {COLLECTION_DAY} of Collection Week
            </p>
          </div>
          <Link
            to="/"
            className="touch-target-lg w-12 h-12 rounded-full bg-bg-primary hover:bg-sp-red-light flex items-center justify-center text-ink-light hover:text-sp-red transition-colors"
            aria-label="Exit kiosk"
          >
            <X className="w-6 h-6" />
          </Link>
        </div>
      </header>

      {/* Arrival counter strip */}
      <div className="shrink-0 bg-bg-card border-b border-border-custom px-8 py-4">
        <div className="flex items-baseline gap-6 mb-3">
          <p className="font-display text-5xl text-occ-green tabular-nums leading-none">
            {arrivedCount}
            <span className="text-ink-light/40 text-3xl ml-2">/ {scopedSignups.length}</span>
          </p>
          <p className="text-base text-ink-light italic">
            {scopedSignups.length === 0
              ? 'No signups yet at this location'
              : arrivalRate === 100
              ? 'Everyone’s here. Full house.'
              : `${arrivalRate}% checked in · ${scopedSignups.length - arrivedCount} pending`}
          </p>
        </div>
        <div className="h-2 bg-bg-primary rounded-full overflow-hidden">
          <motion.div
            animate={{ width: `${arrivalRate}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className={`h-full rounded-full ${
              arrivalRate >= 80 ? 'bg-occ-green' : arrivalRate >= 40 ? 'bg-lime' : 'bg-gold'
            }`}
          />
        </div>
      </div>

      {/* Roster — giant tap targets, scrollable. Pending up top, arrived below. */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {scopedSignups.length === 0 ? (
          <EmptyKioskState location={location?.name ?? 'this location'} />
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-5xl mx-auto">
            {sorted.map((s) => {
              const arrived = !!(s.arrivedAt && s.arrivedAt.slice(0, 10) === todayISODate);
              const arrivedTime = s.arrivedAt
                ? new Date(s.arrivedAt).toLocaleTimeString([], {
                    hour: 'numeric',
                    minute: '2-digit',
                  })
                : null;
              return (
                <li key={s.id}>
                  <button
                    onClick={() => !arrived && markArrived(s)}
                    disabled={arrived}
                    className={`w-full min-h-[80px] px-5 py-4 rounded-2xl border-2 flex items-center gap-4 text-left transition-all ${
                      arrived
                        ? 'bg-occ-green-light/60 border-occ-green/30 cursor-default'
                        : 'bg-bg-card border-border-custom hover:border-occ-green hover:shadow-card active:scale-[0.98]'
                    }`}
                  >
                    <div
                      className={`w-14 h-14 rounded-full flex items-center justify-center font-display text-2xl shrink-0 ${
                        arrived ? 'bg-occ-green text-white' : 'bg-sp-red text-white'
                      }`}
                    >
                      {arrived ? <CheckCircle2 className="w-7 h-7" /> : s.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-display text-2xl text-ink truncate leading-tight">
                        {s.name}
                      </p>
                      <p className={`text-sm font-semibold mt-1 ${arrived ? 'text-occ-green' : 'text-ink-light'}`}>
                        {arrived ? (
                          <>
                            <ClockIcon className="w-3.5 h-3.5 inline -mt-0.5 mr-1" />
                            Checked in at {arrivedTime}
                          </>
                        ) : (
                          'Tap to check in'
                        )}
                      </p>
                    </div>
                    {!arrived && s.firstTime && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-lime-dark bg-lime-light px-2.5 py-1 rounded-full whitespace-nowrap">
                        First-Timer
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Big celebratory check-in overlay — full-screen for visibility from
          across the room. Auto-dismisses after 3.5s. */}
      <AnimatePresence>
        {justCheckedIn && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-occ-green/95 flex flex-col items-center justify-center z-50 pointer-events-none"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 18 }}
              className="text-center text-white"
            >
              <div className="w-32 h-32 mx-auto bg-white/15 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 className="w-20 h-20" strokeWidth={2} />
              </div>
              <p className="font-display text-2xl uppercase tracking-[0.3em] mb-2">Welcome</p>
              <h1 className="font-display text-6xl sm:text-7xl leading-tight mb-4">
                {justCheckedIn.name.split(' ')[0]}
              </h1>
              <p className="font-display-italic text-xl opacity-90 max-w-md mx-auto">
                {justCheckedIn.firstTime
                  ? 'First-Timer — find a red-shirt team lead to get started.'
                  : 'Welcome back! Find your team lead in a red shirt.'}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function EmptyKioskState({ location }: { location: string }) {
  return (
    <div className="max-w-md mx-auto text-center py-20">
      <div className="w-20 h-20 bg-occ-green-light rounded-full flex items-center justify-center mx-auto mb-6">
        <Sparkles className="w-10 h-10 text-occ-green" />
      </div>
      <h2 className="font-display text-3xl text-ink mb-2 leading-tight">
        Nobody signed up here yet.
      </h2>
      <p className="text-base text-ink-light italic mb-6">
        Once volunteers complete the signup form for {location}, they&apos;ll appear here
        for greeters to check off on arrival.
      </p>
      <Link
        to="/signups"
        className="inline-flex h-12 px-5 bg-sp-red text-white text-sm font-semibold rounded-xl items-center justify-center hover:bg-sp-red-dark transition-colors gap-1.5"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to admin
      </Link>
    </div>
  );
}
