import { useCallback, useEffect, useRef, useState } from 'react';
import { logSecuritySignal } from '@/lib/security';

/**
 * useIdleLock — track user activity and auto-lock after inactivity.
 *
 * Real-world pattern from EHR systems, banking apps, Stripe Dashboard:
 *  - Reset the timer on any mousemove, keydown, touch, scroll, click
 *  - At `warnAfterMs` show a "soon to lock" warning
 *  - At `lockAfterMs` flip the locked flag — consumer renders an overlay
 *  - Any user activity AFTER lock requires explicit unlock (role re-confirm)
 *
 * Returns `{ locked, dismissLock }` — caller renders the lock overlay
 * when `locked === true` and calls `dismissLock()` after the user
 * re-confirms identity (any click in our prototype; PIN in production).
 *
 * Activity events tracked: mousemove, keydown, touchstart, scroll, click,
 * wheel. All passive-listened so we don't block the event chain. We
 * throttle resets to once per 5 seconds to avoid spamming setState on
 * every mouse pixel.
 */
export interface UseIdleLockOptions {
  /** Inactivity period before showing the warning toast. Default 10 min. */
  warnAfterMs?: number;
  /** Inactivity period before locking. Default 15 min. */
  lockAfterMs?: number;
  /** Disable the timer entirely. Default false. Public pages opt out. */
  disabled?: boolean;
}

export function useIdleLock({
  warnAfterMs = 10 * 60 * 1000,
  lockAfterMs = 15 * 60 * 1000,
  disabled = false,
}: UseIdleLockOptions = {}) {
  const [locked, setLocked] = useState(false);
  const [warning, setWarning] = useState(false);
  const lastActivityRef = useRef<number>(Date.now());
  const lastResetWriteRef = useRef<number>(Date.now());

  // dismissLock — caller invokes this after the user re-confirms identity.
  const dismissLock = useCallback(() => {
    setLocked(false);
    setWarning(false);
    lastActivityRef.current = Date.now();
    lastResetWriteRef.current = Date.now();
  }, []);

  // resetTimer — called on every relevant user-activity event.
  // Throttled: only updates `lastActivityRef` once per 5s to avoid
  // doing work on every pixel of mouse movement. State updates
  // (clearing the warning) are guarded behind the throttle too.
  const resetTimer = useCallback(() => {
    if (disabled) return;
    if (locked) return; // Locked: ignore until dismissLock() is called.
    const now = Date.now();
    lastActivityRef.current = now;
    if (now - lastResetWriteRef.current < 5_000) return;
    lastResetWriteRef.current = now;
    setWarning(false);
  }, [disabled, locked]);

  useEffect(() => {
    if (disabled) return;
    const events: Array<keyof DocumentEventMap> = [
      'mousemove', 'keydown', 'touchstart', 'scroll', 'click', 'wheel',
    ];
    for (const ev of events) document.addEventListener(ev, resetTimer, { passive: true });
    return () => {
      for (const ev of events) document.removeEventListener(ev, resetTimer);
    };
  }, [disabled, resetTimer]);

  // Tick once per second; flip warning/locked when thresholds cross.
  useEffect(() => {
    if (disabled || locked) return;
    const id = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      if (elapsed >= lockAfterMs) {
        setLocked(true);
        setWarning(false);
        logSecuritySignal('signup_throttled', `Idle lock engaged after ${Math.round(elapsed / 1000)}s`);
      } else if (elapsed >= warnAfterMs && !warning) {
        setWarning(true);
      }
    }, 1_000);
    return () => clearInterval(id);
  }, [disabled, locked, warning, warnAfterMs, lockAfterMs]);

  return { locked, warning, dismissLock };
}
