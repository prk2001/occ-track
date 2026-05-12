import { useEffect } from 'react';

/**
 * Sets document.title to "OCC Track — <pageTitle>" while the calling
 * component is mounted. Restores the previous title on unmount.
 *
 * Why this matters: multi-tab users rely on tab titles to find the
 * right tab in a busy workspace ("OCC Track — Signups & Schedule"
 * beats "OCC Track" alone). Also: browser history autocomplete uses
 * the title, so good titles → faster URL bar recall.
 *
 * The brand prefix ("OCC Track —") stays first so the tab favicon +
 * brand is recognized at a glance even when the title is truncated.
 */
export function useDocumentTitle(pageTitle: string): void {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const previous = document.title;
    document.title = pageTitle ? `OCC Track — ${pageTitle}` : 'OCC Track';
    return () => {
      document.title = previous;
    };
  }, [pageTitle]);
}
