import { useEffect, useRef } from 'react';

/**
 * Trap keyboard focus inside a modal/dialog while it's open.
 *
 * Why we need this: when a modal is open, sighted users can interact with
 * its buttons easily, but a keyboard user pressing Tab will sail right out
 * of the modal and into the page content behind it — which the modal is
 * supposed to be blocking. WCAG 2.4.3 (Focus Order) + WAI-ARIA Authoring
 * Practices for dialog patterns require focus to cycle within the modal
 * until it's dismissed.
 *
 * Implementation:
 *   - On mount: snapshot `document.activeElement` (the element that opened
 *     the dialog) and call `.focus()` on the first focusable child inside
 *     the trapped container.
 *   - On Tab/Shift+Tab at the edges: wrap focus to the opposite edge.
 *   - On unmount: restore focus to the snapshot. Without this, keyboard
 *     users lose context every time a modal closes.
 *
 * Phase 35d.
 *
 * Usage:
 *   const ref = useFocusTrap<HTMLDivElement>(isOpen);
 *   return <div ref={ref}>{modalContents}</div>;
 *
 * `isOpen` lets the consumer toggle the trap; pass `true` when the modal
 * is mounted/visible and `false` (or unmount the component) when it isn't.
 */
export function useFocusTrap<T extends HTMLElement>(active: boolean = true) {
  const containerRef = useRef<T | null>(null);

  useEffect(() => {
    if (!active) return;
    const node = containerRef.current;
    if (!node) return;

    // Snapshot the trigger element so we can restore focus on close.
    const previousFocus = document.activeElement as HTMLElement | null;

    // Move focus into the modal. Prefer the first natively-focusable
    // descendant; fall back to the container itself (which gets tabindex=-1
    // applied here so it can receive focus programmatically without
    // appearing in the natural tab order).
    const focusables = getFocusableElements(node);
    if (focusables.length > 0) {
      focusables[0].focus();
    } else {
      node.tabIndex = -1;
      node.focus();
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab') return;
      const list = getFocusableElements(node!);
      if (list.length === 0) {
        // Nothing to cycle through — keep focus on the container.
        e.preventDefault();
        node!.focus();
        return;
      }
      const first = list[0];
      const last = list[list.length - 1];
      const activeEl = document.activeElement as HTMLElement | null;
      // Shift+Tab from the first → wrap to last.
      if (e.shiftKey && (activeEl === first || activeEl === node)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && activeEl === last) {
        // Tab from the last → wrap to first.
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      // Restore focus only if the previous element is still in the DOM
      // and focusable. Without this guard, restoring focus to an unmounted
      // input would throw.
      if (previousFocus && document.body.contains(previousFocus)) {
        try {
          previousFocus.focus();
        } catch {
          // Element rejected focus (rare — usually a removed shadow DOM
          // host). Silent fallback is fine; the page just keeps current focus.
        }
      }
    };
  }, [active]);

  return containerRef;
}

// Match the WAI-ARIA-recommended set of "tabbable" elements. Excludes
// disabled / aria-hidden / tabindex=-1 nodes. Keep this list close to what
// the popular `focus-trap` library targets so behavior is unsurprising.
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(',');

function getFocusableElements(root: HTMLElement): HTMLElement[] {
  const list = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
  // Filter out elements visually hidden (aria-hidden, display:none, etc.) —
  // they're in the DOM but shouldn't trap focus.
  return list.filter((el) => {
    if (el.getAttribute('aria-hidden') === 'true') return false;
    // offsetParent is null when display:none — but jsdom never computes
    // layout, so this check would filter EVERY element in unit tests.
    // Skip the check in jsdom; in a real browser it correctly excludes
    // display:none subtrees.
    const isJsdom = typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent);
    if (!isJsdom && el.offsetParent === null) return false;
    return true;
  });
}
