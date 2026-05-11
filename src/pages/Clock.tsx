import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import {
  QrCode, MapPin, LogIn, LogOut, CheckCircle2, ChevronLeft, ChevronRight, Clock as ClockIcon, X,
} from 'lucide-react';
import Layout from '@/components/Layout';
import { Mark } from '@/components/Logo';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import {
  LOCATIONS,
  VOLUNTEERS,
  VOLUNTEER_ROLE_CONFIG,
  getLocationById,
  getVolunteersForLocation,
} from '@/data/mockData';
import type { Volunteer } from '@/data/mockData';

type Step = 'location' | 'volunteer' | 'action' | 'done';
type Action = 'in' | 'out';

interface ClockEvent {
  volunteerId: string;
  locationId: string;
  action: Action;
  at: string;
}

/**
 * Self-service volunteer clock — scan a QR at the location and tap your name.
 * Reachable directly via `/clock` or `/clock?loc=cdo1`. Designed for a phone
 * held in a parking lot AND for a tablet kiosk at the welcome table.
 */
export default function Clock() {
  const navigate = useNavigate();
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const queryLoc = params.get('loc') || '';

  const [step, setStep] = useState<Step>(queryLoc ? 'volunteer' : 'location');
  const [locationId, setLocationId] = useState<string>(queryLoc);
  const [volunteer, setVolunteer] = useState<Volunteer | null>(null);
  const [action, setAction] = useState<Action>('in');

  const [checkedIn, setCheckedIn] = useLocalStorage<string[]>('occ:volunteer-checkins', ['v1', 'v3', 'v5', 'v7', 'v11']);
  const [history, setHistory] = useLocalStorage<ClockEvent[]>('occ:clock-history', []);
  const [doneAt, setDoneAt] = useState<string>('');

  const location = locationId ? getLocationById(locationId) : null;
  const volunteers = useMemo(
    () => (locationId ? getVolunteersForLocation(locationId) : []),
    [locationId],
  );

  // If a query param sets the location, fast-forward state.
  useEffect(() => {
    if (queryLoc && getLocationById(queryLoc)) {
      setLocationId(queryLoc);
      setStep('volunteer');
    }
  }, [queryLoc]);

  function commit(v: Volunteer, a: Action) {
    const at = new Date().toISOString();
    setDoneAt(at);
    setHistory((prev) => [{ volunteerId: v.id, locationId, action: a, at }, ...prev].slice(0, 200));
    setCheckedIn((prev) => a === 'in' ? Array.from(new Set([...prev, v.id])) : prev.filter((id) => id !== v.id));
    setStep('done');
  }

  function reset() {
    setStep(queryLoc ? 'volunteer' : 'location');
    setVolunteer(null);
    setDoneAt('');
  }

  function exitToMain() {
    navigate('/volunteers');
  }

  return (
    <Layout hideNav>
      <div className="relative min-h-[100dvh] overflow-hidden">
        {/* Atmospheric backgrounds */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-40 -left-40 w-[420px] h-[420px] rounded-full bg-occ-green/10 blur-[120px]" />
          <div className="absolute bottom-0 right-0 w-[440px] h-[440px] rounded-full bg-sp-red/8 blur-[120px]" />
        </div>

        <div className="relative px-5 pt-6 pb-10 max-w-xl mx-auto">
          {/* Top bar */}
          <header className="flex items-center justify-between mb-6">
            <Mark size={32} />
            <button
              onClick={exitToMain}
              className="text-xs text-ink-light hover:text-sp-red flex items-center gap-1 transition-colors"
            >
              <X className="w-4 h-4" />
              Exit
            </button>
          </header>

          <AnimatePresence mode="wait">
            {step === 'location' && (
              <LocationStep
                key="location"
                onPick={(id) => { setLocationId(id); setStep('volunteer'); }}
              />
            )}
            {step === 'volunteer' && location && (
              <VolunteerStep
                key="volunteer"
                location={location}
                volunteers={volunteers}
                checkedIn={checkedIn}
                onPick={(v) => {
                  setVolunteer(v);
                  setAction(checkedIn.includes(v.id) ? 'out' : 'in');
                  setStep('action');
                }}
                onBack={() => setStep('location')}
                allowBack={!queryLoc}
              />
            )}
            {step === 'action' && volunteer && location && (
              <ActionStep
                key="action"
                volunteer={volunteer}
                location={location}
                isCheckedIn={checkedIn.includes(volunteer.id)}
                action={action}
                onChangeAction={setAction}
                onConfirm={() => commit(volunteer, action)}
                onBack={() => setStep('volunteer')}
              />
            )}
            {step === 'done' && volunteer && location && (
              <DoneStep
                key="done"
                volunteer={volunteer}
                location={location}
                action={action}
                at={doneAt}
                onAnother={reset}
                onExit={exitToMain}
              />
            )}
          </AnimatePresence>

          {/* Recent activity footnote */}
          {step === 'location' && history.length > 0 && (
            <RecentActivity history={history.slice(0, 5)} />
          )}
        </div>
      </div>
    </Layout>
  );
}

// ─── Step 1: Pick / scan a location ───────────────────────────────────────────
function LocationStep({ onPick }: { onPick: (id: string) => void }) {
  const [manual, setManual] = useState(false);
  const cdos = LOCATIONS.filter((l) => l.type === 'central');

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-sp-red">Volunteer Clock</p>
        <h1 className="font-display text-4xl font-medium text-ink leading-tight tracking-tight">
          Welcome.
          <span className="font-display-italic block text-sp-red mt-1">Where are you serving?</span>
        </h1>
      </div>

      {!manual ? (
        <>
          {/* QR Scan area */}
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 24 }}
            className="bg-bg-card rounded-3xl shadow-card border-2 border-dashed border-sp-red/30 p-8 text-center space-y-4"
          >
            <FakeQR />
            <div>
              <p className="font-display text-xl font-medium text-ink">Point your camera at the QR</p>
              <p className="text-sm text-ink-light mt-1">It&apos;s posted at the welcome table</p>
            </div>
            <button
              onClick={() => onPick('cdo1')}
              className="w-full h-12 bg-sp-red text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-sp-red-dark transition-colors"
            >
              <QrCode className="w-4 h-4" />
              Demo: Simulate scan
            </button>
          </motion.div>

          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-border-warm" />
            <span className="text-[10px] uppercase tracking-[0.25em] text-ink-light">or</span>
            <span className="h-px flex-1 bg-border-warm" />
          </div>

          <button
            onClick={() => setManual(true)}
            className="w-full h-14 bg-bg-card border-2 border-border-custom text-ink text-sm font-semibold rounded-2xl flex items-center justify-center gap-2 hover:border-ink transition-colors"
          >
            <MapPin className="w-4 h-4" />
            Pick my location manually
          </button>
        </>
      ) : (
        <div className="bg-bg-card rounded-2xl shadow-card border border-border-custom overflow-hidden">
          <header className="px-5 py-4 border-b border-border-custom flex items-center justify-between">
            <div>
              <p className="font-display text-lg font-medium text-ink">Choose your Central</p>
              <p className="text-[11px] text-ink-light">Tap to clock in</p>
            </div>
            <button onClick={() => setManual(false)} className="text-xs text-ink-light hover:text-sp-red">Back</button>
          </header>
          <ul className="divide-y divide-border-custom">
            {cdos.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => onPick(c.id)}
                  className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-bg-cream/40 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-sp-red-light flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5 text-sp-red" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink truncate">{c.name}</p>
                    <p className="text-[11px] text-ink-light truncate">{c.city}, {c.state}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-ink-light/60" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </motion.section>
  );
}

function FakeQR() {
  // Decorative QR-like grid (not a real scannable code). A production app
  // would render an actual QR pointing at `/clock?loc=<cdoId>` via a lib
  // such as react-qr-code; this is purely visual until we wire that up.
  const cells = useMemo(() => {
    const seed = 42;
    let s = seed;
    const rand = () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
    return Array.from({ length: 21 * 21 }).map(() => rand() > 0.45);
  }, []);
  return (
    <div className="inline-block p-3 bg-white rounded-2xl border border-border-warm">
      <div className="grid grid-cols-[repeat(21,1fr)] gap-px w-44 h-44">
        {cells.map((on, i) => (
          <div key={i} className={on ? 'bg-ink' : 'bg-white'} />
        ))}
      </div>
    </div>
  );
}

// ─── Step 2: Pick the volunteer ───────────────────────────────────────────────
function VolunteerStep({
  location, volunteers, checkedIn, onPick, onBack, allowBack,
}: {
  location: NonNullable<ReturnType<typeof getLocationById>>;
  volunteers: Volunteer[];
  checkedIn: string[];
  onPick: (v: Volunteer) => void;
  onBack: () => void;
  allowBack: boolean;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="space-y-5"
    >
      <div className="bg-bg-cream rounded-2xl border border-border-warm px-4 py-3 flex items-center gap-3">
        <MapPin className="w-4 h-4 text-sp-red shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-ink truncate">{location.name}</p>
          <p className="text-[11px] text-ink-light truncate">{location.city}, {location.state}</p>
        </div>
        {allowBack && (
          <button onClick={onBack} className="text-xs text-ink-light hover:text-sp-red">Change</button>
        )}
      </div>

      <div className="space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-sp-red">Step 2 of 3</p>
        <h2 className="font-display text-2xl font-medium text-ink">Tap your name</h2>
      </div>

      {volunteers.length === 0 ? (
        <div className="bg-bg-card rounded-2xl border border-border-custom p-6 text-center">
          <p className="text-sm text-ink-light italic">No volunteers registered at this location yet.</p>
        </div>
      ) : (
        <motion.ul
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.025 } } }}
          className="grid grid-cols-2 sm:grid-cols-3 gap-2"
        >
          {volunteers.map((v) => {
            const cfg = VOLUNTEER_ROLE_CONFIG[v.role];
            const on = checkedIn.includes(v.id);
            return (
              <motion.li
                key={v.id}
                variants={{ hidden: { opacity: 0, scale: 0.9 }, show: { opacity: 1, scale: 1 } }}
              >
                <button
                  onClick={() => onPick(v)}
                  className="w-full text-center bg-bg-card rounded-2xl border border-border-custom p-4 hover:border-sp-red hover:shadow-card transition-all group"
                >
                  <div className="relative w-14 h-14 mx-auto rounded-full flex items-center justify-center font-display text-2xl font-medium text-white" style={{ backgroundColor: cfg.color }}>
                    {v.name.charAt(0)}
                    <span className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-bg-card ${on ? 'bg-occ-green' : 'bg-ink-light/30'}`} />
                  </div>
                  <p className="font-display text-sm font-medium text-ink leading-tight mt-2 truncate">{v.name}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mt-0.5" style={{ color: cfg.color }}>
                    {cfg.label}
                  </p>
                  <p className="text-[10px] text-ink-light mt-1">{on ? 'On site' : 'Tap to clock in'}</p>
                </button>
              </motion.li>
            );
          })}
        </motion.ul>
      )}
    </motion.section>
  );
}

// ─── Step 3: Confirm action ───────────────────────────────────────────────────
function ActionStep({
  volunteer, location, isCheckedIn, action, onChangeAction, onConfirm, onBack,
}: {
  volunteer: Volunteer;
  location: NonNullable<ReturnType<typeof getLocationById>>;
  isCheckedIn: boolean;
  action: Action;
  onChangeAction: (a: Action) => void;
  onConfirm: () => void;
  onBack: () => void;
}) {
  const cfg = VOLUNTEER_ROLE_CONFIG[volunteer.role];
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="space-y-5"
    >
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-ink-light hover:text-ink">
        <ChevronLeft className="w-4 h-4" />
        Not me
      </button>

      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 220, damping: 20 }}
        className="bg-bg-card rounded-3xl border border-border-custom shadow-card p-8 text-center space-y-3"
      >
        <div
          className="w-24 h-24 mx-auto rounded-full flex items-center justify-center font-display text-5xl font-medium text-white"
          style={{ backgroundColor: cfg.color }}
        >
          {volunteer.name.charAt(0)}
        </div>
        <h2 className="font-display text-3xl font-medium text-ink leading-none">{volunteer.name}</h2>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: cfg.color }}>
          {cfg.label} · {cfg.description}
        </p>
        <p className="text-xs text-ink-light italic">{location.name}</p>
      </motion.div>

      {isCheckedIn && (
        <div className="grid grid-cols-2 gap-2 p-1 bg-bg-primary rounded-2xl">
          <button
            onClick={() => onChangeAction('out')}
            className={`px-3 py-3 rounded-xl text-sm font-semibold transition-all ${
              action === 'out' ? 'bg-bg-card text-ink shadow-card' : 'text-ink-light'
            }`}
          >
            Clock OUT
          </button>
          <button
            onClick={() => onChangeAction('in')}
            className={`px-3 py-3 rounded-xl text-sm font-semibold transition-all ${
              action === 'in' ? 'bg-bg-card text-ink shadow-card' : 'text-ink-light'
            }`}
          >
            Stay clocked IN
          </button>
        </div>
      )}

      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={onConfirm}
        className={`w-full h-20 text-white text-xl font-semibold rounded-3xl flex items-center justify-center gap-3 shadow-card-elevated transition-colors ${
          action === 'in' ? 'bg-occ-green hover:bg-occ-green-dark' : 'bg-sp-red hover:bg-sp-red-dark'
        }`}
      >
        {action === 'in' ? <LogIn className="w-7 h-7" /> : <LogOut className="w-7 h-7" />}
        {action === 'in' ? 'I’m here — clock me in' : 'Clock me out'}
      </motion.button>

      <p className="text-center text-[11px] text-ink-light/70 italic">
        Tap once. Your shift is recorded.
      </p>
    </motion.section>
  );
}

// ─── Step 4: Confirmation ─────────────────────────────────────────────────────
function DoneStep({
  volunteer, location, action, at, onAnother, onExit,
}: {
  volunteer: Volunteer;
  location: NonNullable<ReturnType<typeof getLocationById>>;
  action: Action;
  at: string;
  onAnother: () => void;
  onExit: () => void;
}) {
  const time = new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="bg-bg-card rounded-3xl border border-border-custom shadow-card p-10 text-center space-y-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center ${
            action === 'in' ? 'bg-occ-green-light' : 'bg-sp-red-light'
          }`}
        >
          <CheckCircle2 className={`w-14 h-14 ${action === 'in' ? 'text-occ-green' : 'text-sp-red'}`} strokeWidth={2.5} />
        </motion.div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-sp-red mb-2">
            {action === 'in' ? 'Clocked In' : 'Clocked Out'}
          </p>
          <h2 className="font-display text-3xl font-medium text-ink leading-none">{volunteer.name}</h2>
          <p className="text-sm text-ink-light italic mt-2">{location.name} · {time}</p>
        </div>
        <p className="font-display-italic text-base text-sp-red">Thank you for serving.</p>
      </div>

      <button
        onClick={onAnother}
        className="w-full h-12 bg-bg-card border-2 border-border-custom text-ink text-sm font-semibold rounded-2xl flex items-center justify-center gap-2 hover:border-ink transition-colors"
      >
        Next volunteer
      </button>
      <button
        onClick={onExit}
        className="w-full h-10 text-ink-light text-xs hover:text-ink transition-colors"
      >
        Exit to roster
      </button>
    </motion.section>
  );
}

// ─── Recent activity ──────────────────────────────────────────────────────────
function RecentActivity({ history }: { history: ClockEvent[] }) {
  return (
    <div className="mt-8 pt-6 border-t border-border-warm">
      <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-ink-light mb-3 flex items-center gap-1.5">
        <ClockIcon className="w-3 h-3" /> Recent activity
      </p>
      <ul className="space-y-1.5 text-[11px]">
        {history.map((h, i) => {
          const v = VOLUNTEERS.find((x) => x.id === h.volunteerId);
          const t = new Date(h.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
          return (
            <li key={i} className="flex items-center gap-2 text-ink-light">
              <span className={`w-1.5 h-1.5 rounded-full ${h.action === 'in' ? 'bg-occ-green' : 'bg-sp-red'}`} />
              <span className="text-ink">{v?.name ?? 'Unknown'}</span>
              <span>clocked {h.action === 'in' ? 'in' : 'out'}</span>
              <span className="ml-auto tabular-nums">{t}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
