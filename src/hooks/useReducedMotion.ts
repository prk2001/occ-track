import { useEffect, useState } from 'react';

/**
 * Mirrors `(prefers-reduced-motion: reduce)` as React state.
 *
 * Use to short-circuit Framer Motion `initial` / `animate` props when the
 * user has signaled they want less motion. The CSS-level rule we already
 * have in index.css zeros out CSS transitions; this hook handles the JS
 * animation library (Framer Motion) too.
 *
 * Usage:
 *   const reduced = useReducedMotion();
 *   <motion.div animate={reduced ? false : { opacity: 1, y: 0 }} />
 *
 * The `false` value tells Framer Motion to skip animation entirely
 * (just snap to the final state).
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    // addEventListener is the modern API; older Safari needs addListener.
    if (mql.addEventListener) {
      mql.addEventListener('change', handler);
      return () => mql.removeEventListener('change', handler);
    }
    // Legacy fallback (older Safari) — type-cast to access deprecated APIs.
    type LegacyMQL = MediaQueryList & {
      addListener: (l: (e: MediaQueryListEvent) => void) => void;
      removeListener: (l: (e: MediaQueryListEvent) => void) => void;
    };
    const legacy = mql as LegacyMQL;
    legacy.addListener(handler);
    return () => legacy.removeListener(handler);
  }, []);

  return reduced;
}
