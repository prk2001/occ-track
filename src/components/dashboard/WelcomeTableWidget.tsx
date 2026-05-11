import { Link } from 'react-router';
import { motion } from 'framer-motion';
import { UserCheck, ChevronRight, ClipboardList, Users } from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useAuth } from '@/hooks/useAuth';
import {
  COLLECTION_DAY,
  COLLECTION_DAYS,
  getLocationById,
} from '@/data/mockData';
import type { StoredSignup } from '@/data/mockData';

/**
 * Welcome Table widget — surfaces day-of attendance progress on the
 * leadership dashboards (Admin, Regional). Gated to isRegionalAdmin so
 * even if it gets dropped into a less-privileged dashboard by mistake,
 * it won't render PII counts.
 *
 * Reads `occ:signups` live so when an admin marks an arrival on /signups,
 * this widget updates immediately in the same browser session.
 */
export default function WelcomeTableWidget() {
  const { isRegionalAdmin } = useAuth();
  const [signups] = useLocalStorage<StoredSignup[]>('occ:signups', []);

  // Defense in depth: even if a parent dashboard forgets to gate this,
  // the widget itself refuses to render data for unauthorized roles.
  if (!isRegionalAdmin) return null;

  // Demo "today" = Day 4 of Collection Week (Thu Nov 19, 2026).
  const todayISODate =
    COLLECTION_DAYS[COLLECTION_DAY - 1]?.date ?? new Date().toISOString().slice(0, 10);
  const arrivedToday = signups.filter(
    (s) => s.arrivedAt && s.arrivedAt.slice(0, 10) === todayISODate,
  ).length;
  const totalSignups = signups.length;
  const arrivalRate = totalSignups === 0 ? 0 : Math.round((arrivedToday / totalSignups) * 100);
  const cdoLabel = getLocationById('cdo1')?.name ?? 'Central Drop-off';

  // Empty state — no signups yet. Show a soft CTA to share the signup
  // link instead of a "0 of 0" donut that looks broken.
  if (totalSignups === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.3 }}
        className="bg-bg-card rounded-2xl shadow-card p-5 border border-border-custom"
      >
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold text-navy flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-occ-green" />
            Welcome Table
          </h2>
        </div>
        <p className="text-sm text-slate italic mb-4">
          No volunteer signups yet. When the public signup page goes live,
          arrivals will appear here on Day 1.
        </p>
        <Link
          to="/signups"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-sp-red hover:underline uppercase tracking-wider"
        >
          Set up the schedule
          <ChevronRight className="w-3 h-3" />
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.3 }}
      className="bg-bg-card rounded-2xl shadow-card p-5 border border-border-custom"
    >
      <div className="flex items-start justify-between mb-3 gap-2">
        <div>
          <h2 className="text-lg font-bold text-navy flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-occ-green" />
            Welcome Table
          </h2>
          <p className="text-xs text-slate italic mt-0.5">
            {cdoLabel} · today&apos;s arrivals
          </p>
        </div>
        <Link
          to="/signups"
          className="text-xs font-semibold text-sp-red hover:underline flex items-center gap-1 shrink-0"
        >
          Manage
          <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Hero count + percent */}
      <div className="flex items-baseline gap-3 mb-3">
        <p className="font-display text-4xl text-occ-green tabular-nums leading-none">
          {arrivedToday}
          <span className="text-ink-light/50 text-2xl"> / {totalSignups}</span>
        </p>
        <p className="text-sm text-slate italic">
          {arrivalRate}% arrived
        </p>
      </div>

      {/* Progress gauge */}
      <div className="h-2 bg-bg-primary rounded-full overflow-hidden mb-3">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${arrivalRate}%` }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.4 }}
          className={`h-full rounded-full ${
            arrivalRate >= 80
              ? 'bg-occ-green'
              : arrivalRate >= 40
              ? 'bg-lime'
              : 'bg-gold'
          }`}
        />
      </div>

      {/* Quick stats row */}
      <div className="grid grid-cols-3 gap-2">
        <Stat
          icon={Users}
          value={String(totalSignups - arrivedToday)}
          label="Pending"
          color="text-sp-red"
          bg="bg-sp-red-light"
        />
        <Stat
          icon={UserCheck}
          value={String(arrivedToday)}
          label="Here now"
          color="text-occ-green"
          bg="bg-occ-green-light"
        />
        <Stat
          icon={ClipboardList}
          value={String(totalSignups)}
          label="Expected"
          color="text-blue-accent"
          bg="bg-blue-light"
        />
      </div>
    </motion.div>
  );
}

function Stat({
  icon: Icon, value, label, color, bg,
}: {
  icon: typeof Users;
  value: string;
  label: string;
  color: string;
  bg: string;
}) {
  return (
    <div className={`${bg} rounded-xl p-2.5 text-center`}>
      <Icon className={`w-3.5 h-3.5 ${color} mx-auto mb-1`} />
      <p className={`font-display text-xl ${color} tabular-nums leading-none`}>{value}</p>
      <p className="text-[9px] text-slate uppercase tracking-wider mt-1">{label}</p>
    </div>
  );
}
