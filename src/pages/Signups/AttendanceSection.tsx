import { Link } from 'react-router';
import { motion } from 'framer-motion';
import { CheckCircle2, ChevronRight, UserCheck, UserX } from 'lucide-react';
import type { StoredSignup } from '@/data/mockData';

// ─── Day-of attendance ─────────────────────────────────────────────────────
// Live tally of who's arrived at the welcome table today. The Greeter taps
// each volunteer as they walk in. Default open when nobody has arrived yet
// (i.e., the start of the day); collapsible once a few are marked.
function AttendanceSection({
  signups, onMarkArrived, onUnmarkArrived, todayISODate,
}: {
  signups: StoredSignup[];
  onMarkArrived: (id: string) => void;
  onUnmarkArrived: (id: string) => void;
  todayISODate: string;
}) {
  // Sort: not-yet-arrived first (so greeter can tap quickly), then arrived
  // in descending arrival order (most recent on top).
  const sorted = [...signups].sort((a, b) => {
    const aArrived = !!a.arrivedAt;
    const bArrived = !!b.arrivedAt;
    if (aArrived !== bArrived) return aArrived ? 1 : -1;
    if (aArrived && bArrived) {
      return (b.arrivedAt ?? '').localeCompare(a.arrivedAt ?? '');
    }
    return a.name.localeCompare(b.name);
  });
  const arrivedCount = signups.filter(
    (s) => s.arrivedAt && s.arrivedAt.slice(0, 10) === todayISODate,
  ).length;
  const pendingCount = signups.length - arrivedCount;

  return (
    <section className="print-hide">
      <header className="mb-3 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-display text-xl text-ink leading-tight flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-occ-green" />
            Welcome Table
          </h2>
          <p className="text-xs text-ink-light italic mt-1">
            Tap each volunteer as they arrive. {arrivedCount} of {signups.length} checked in today.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/welcome-table"
            className="text-[10px] font-bold uppercase tracking-wider text-sp-red hover:underline flex items-center gap-1"
          >
            iPad mode
            <ChevronRight className="w-3 h-3" />
          </Link>
          <Link
            to="/clock"
            className="text-[10px] font-bold uppercase tracking-wider text-ink-light hover:text-sp-red flex items-center gap-1"
          >
            Clock kiosk
            <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </header>
      <div className="bg-bg-card rounded-2xl border border-border-custom overflow-hidden">
        {/* Progress bar — visual gauge of attendance rate */}
        <div className="h-1.5 bg-bg-primary w-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${signups.length === 0 ? 0 : (arrivedCount / signups.length) * 100}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="h-full bg-occ-green"
          />
        </div>
        <ul className="divide-y divide-border-custom/60 max-h-96 overflow-y-auto">
          {sorted.map((s) => {
            const arrived = !!s.arrivedAt && s.arrivedAt.slice(0, 10) === todayISODate;
            const arrivedTime = s.arrivedAt
              ? new Date(s.arrivedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
              : null;
            return (
              <li
                key={s.id}
                className={`flex items-center gap-3 px-4 py-2.5 ${
                  arrived ? 'bg-occ-green-light/40' : ''
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-display text-sm leading-none shrink-0 ${
                    arrived ? 'bg-occ-green text-white' : 'bg-sp-red text-white'
                  }`}
                >
                  {arrived ? <CheckCircle2 className="w-4 h-4" /> : s.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink truncate">{s.name}</p>
                  <p className="text-[11px] text-ink-light truncate">
                    {arrived ? (
                      <>
                        Arrived <span className="font-semibold text-occ-green">{arrivedTime}</span>
                      </>
                    ) : (
                      <>
                        <span className="tabular-nums">{s.phone}</span>
                        {s.firstTime ? <span className="text-lime-dark"> · First-Timer</span> : null}
                      </>
                    )}
                  </p>
                </div>
                {arrived ? (
                  <button
                    onClick={() => onUnmarkArrived(s.id)}
                    className="h-9 px-3 bg-bg-primary border border-border-custom hover:border-sp-red hover:text-sp-red text-ink-light text-xs font-bold rounded-lg flex items-center gap-1.5 uppercase tracking-wider transition-all"
                    title="Undo arrival"
                  >
                    <UserX className="w-3 h-3" />
                    Undo
                  </button>
                ) : (
                  <button
                    onClick={() => onMarkArrived(s.id)}
                    className="h-9 px-3 bg-lime hover:bg-lime-dark text-occ-green-dark hover:text-white text-xs font-bold rounded-lg flex items-center gap-1.5 uppercase tracking-wider transition-colors"
                  >
                    <UserCheck className="w-3 h-3" />
                    Arrived
                  </button>
                )}
              </li>
            );
          })}
        </ul>
        {pendingCount === 0 && signups.length > 0 && (
          <div className="p-4 bg-occ-green-light/50 text-center border-t border-border-custom/60">
            <p className="text-sm font-display text-occ-green-dark">
              <CheckCircle2 className="w-4 h-4 inline -mt-0.5 mr-1" />
              Everyone&apos;s here.
            </p>
            <p className="text-[11px] text-ink-light italic mt-0.5">Full house — go pack some boxes.</p>
          </div>
        )}
      </div>
    </section>
  );
}


export { AttendanceSection };
