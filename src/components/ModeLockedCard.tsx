import { Link } from 'react-router';
import { motion } from 'framer-motion';
import { Lock, FlaskConical, ShieldCheck, ArrowRight } from 'lucide-react';
import { useAppMode } from '@/lib/appMode';
import { useAuth } from '@/hooks/useAuth';

/**
 * Production-mode lock card — rendered in place of write-enabled forms
 * (CheckIn, Cartonization, BolLoading) when the app is in production
 * mode. Tells the user clearly:
 *   - Why entry is locked (data integrity, not a bug)
 *   - How to unlock (Super Admin flips test mode in /settings)
 *   - That the locked-out attempt itself is logged
 *
 * Super Admin sees a one-click "Switch to test mode" button. Other roles
 * see a "Contact your Super Admin" message — they cannot self-elevate.
 */
export default function ModeLockedCard({
  feature, description,
}: {
  feature: string;
  description?: string;
}) {
  const { isProduction } = useAppMode();
  const { isSuperAdmin } = useAuth();

  if (!isProduction) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-bg-card rounded-2xl border-2 border-dashed border-sp-red/30 p-8 text-center max-w-xl mx-auto"
    >
      <div className="w-16 h-16 mx-auto bg-sp-red-light rounded-full flex items-center justify-center mb-4">
        <Lock className="w-8 h-8 text-sp-red" />
      </div>
      <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-sp-red mb-2 flex items-center justify-center gap-1.5">
        <ShieldCheck className="w-3 h-3" />
        Production Mode · Data Locked
      </p>
      <h2 className="font-display text-2xl text-ink leading-tight mt-2">
        {feature} is locked.
      </h2>
      <p className="text-sm text-ink-light italic mt-3 max-w-md mx-auto leading-relaxed">
        {description ??
          'This app is in production mode, so new entries to the shoebox/carton tally are blocked. This protects real Collection Week totals from accidental test data.'}
      </p>

      {isSuperAdmin ? (
        <Link
          to="/settings"
          className="inline-flex items-center gap-2 h-12 px-5 mt-6 bg-gold text-ink font-semibold rounded-xl hover:bg-gold/90 transition-colors"
        >
          <FlaskConical className="w-4 h-4" />
          Switch to Testing Mode
          <ArrowRight className="w-4 h-4" />
        </Link>
      ) : (
        <div className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-bg-primary border border-border-custom text-xs text-ink-light italic">
          <ShieldCheck className="w-3.5 h-3.5" />
          Contact your Super Admin to enable Testing Mode.
        </div>
      )}

      <p className="text-[10px] text-ink-light/60 italic mt-5 leading-relaxed">
        Every attempt to enter data while locked is recorded in the audit log,
        so leadership can spot any accidental write attempts.
      </p>
    </motion.div>
  );
}
