import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, FlaskConical } from 'lucide-react';
import { useAppMode } from '@/lib/appMode';

/**
 * Mode banner — always visible when the app is in test mode. Non-dismissable
 * by design: a staffer in a hurry should never look at the screen and forget
 * which mode they're in. Tinted gold (warning, not error) because test mode
 * isn't broken — it's just clearly labeled.
 *
 * Renders nothing in production mode (the default + safe state).
 */
export default function ModeBanner() {
  const { isTest } = useAppMode();

  return (
    <AnimatePresence>
      {isTest && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="sticky top-0 z-[60] overflow-hidden print-hide"
          role="status"
          aria-live="polite"
        >
          <div className="bg-gold text-ink px-4 py-2 flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em]">
            <FlaskConical className="w-3.5 h-3.5" />
            <span>Testing Mode</span>
            <span className="opacity-50">·</span>
            <span className="normal-case font-semibold tracking-normal">
              Data entered now is NOT counted toward real Collection Week totals.
            </span>
            <AlertTriangle className="w-3.5 h-3.5 hidden sm:inline" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
