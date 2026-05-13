import { motion, AnimatePresence } from 'framer-motion';
import { Lock, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { ROLE_CONFIG } from '@/data/mockData';
import { getFirstName } from '@/lib/name';
import { useFocusTrap } from '@/hooks/useFocusTrap';

/**
 * Lock overlay — shown on top of any private page when useIdleLock
 * flips `locked = true`. Blurs the underlying content (data still
 * present in DOM but unreadable) and requires the user to confirm
 * their identity before continuing.
 *
 * Production hardening: the "confirm" click would re-validate the
 * session against the server (re-auth via PIN, biometric, etc.).
 * In the prototype, any click dismisses — but the gate-up event itself
 * is logged as a security signal so the audit trail captures it.
 */
export default function LockOverlay({
  visible, onUnlock, warning,
}: {
  visible: boolean;
  onUnlock: () => void;
  warning?: boolean;
}) {
  const { user } = useAuth();
  const rc = user ? ROLE_CONFIG[user.role] : null;
  // Phase 35d: trap Tab/Shift+Tab inside the locked dialog so keyboard
  // users can't reach the (visually-blocked) content underneath.
  const trapRef = useFocusTrap<HTMLDivElement>(visible);

  if (warning && !visible) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-gold-light border border-gold rounded-2xl shadow-card-elevated px-5 py-3 max-w-md"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-3 text-sm">
            <Lock className="w-4 h-4 text-gold shrink-0" />
            <p className="text-ink">
              <span className="font-semibold">You'll be locked soon.</span>
              <span className="text-ink-light italic"> Move the mouse or press any key.</span>
            </p>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] backdrop-blur-md bg-navy/40 flex items-center justify-center px-4"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="lock-overlay-title"
          aria-describedby="lock-overlay-desc"
          ref={trapRef}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 240, damping: 22 }}
            className="bg-bg-card rounded-3xl shadow-card-elevated max-w-md w-full p-8 text-center"
          >
            <div className="w-20 h-20 mx-auto bg-sp-red-light rounded-full flex items-center justify-center mb-5">
              <Lock className="w-10 h-10 text-sp-red" />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-sp-red mb-2">
              Session Locked
            </p>
            <h1 id="lock-overlay-title" className="font-display text-3xl text-ink leading-tight tracking-tight">
              Welcome back.
              <span className="font-display-italic block text-sp-red mt-1">
                Confirm it's still you.
              </span>
            </h1>
            <p id="lock-overlay-desc" className="text-sm text-ink-light italic mt-3 leading-relaxed">
              For volunteer privacy, this session locked itself after a few
              minutes of inactivity. Tap below to continue with the same role.
            </p>
            {rc && (
              <div
                className="mt-5 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
                style={{ backgroundColor: rc.bgColor, color: rc.color }}
              >
                <ShieldCheck className="w-3 h-3" />
                {user?.name} · {rc.label}
              </div>
            )}
            <button
              onClick={onUnlock}
              className="w-full h-12 mt-6 bg-sp-red text-white font-semibold rounded-2xl hover:bg-sp-red-dark transition-colors flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              Continue as {user ? getFirstName(user.name) : 'me'}
            </button>
            <p className="text-[10px] text-ink-light/60 italic mt-4">
              Not you? Use the role switcher in the menu to switch accounts.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
