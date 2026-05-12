import { useEffect } from 'react';

/**
 * useNoIndex — inject `<meta name="robots" content="noindex,nofollow">`
 * into the document head while the calling page is mounted.
 *
 * Why per-page instead of global: the home page and /signup are *intended*
 * to be discoverable for marketing/recruiting. Private routes (signup
 * roster, audit log, outbox, etc.) must NOT be indexed because they may
 * contain PII or admin functionality.
 *
 * Cleanup contract: when the user navigates away from a noindex page, the
 * effect's teardown removes the meta tag so the next page doesn't inherit
 * a stale "don't index" signal. Without cleanup, a single private page
 * visit would deindex the entire SPA for the rest of the browser session.
 *
 * Belt-and-suspenders: the SPA uses HashRouter so URLs look like
 * /#/signups — search engines don't follow hash fragments at all, so
 * indexing is unlikely either way. The meta tag is for:
 *   1. Future migration to BrowserRouter (server-rendered URLs)
 *   2. Browsers that DO index hash routes (rare modern crawlers)
 *   3. Static-site indexers that read the HTML directly
 */
export function useNoIndex(): void {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    // If an existing robots meta tag is on the page, capture its current
    // content so we can restore it on cleanup. Otherwise we create one.
    let tag = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    const previousContent = tag?.content ?? null;
    const created = !tag;
    if (!tag) {
      tag = document.createElement('meta');
      tag.name = 'robots';
      document.head.appendChild(tag);
    }
    tag.content = 'noindex,nofollow';

    return () => {
      // If we created the tag, remove it. If it pre-existed, restore the
      // original content so any global default ("index,follow") survives.
      if (!tag) return;
      if (created) {
        tag.parentNode?.removeChild(tag);
      } else if (previousContent !== null) {
        tag.content = previousContent;
      }
    };
  }, []);
}
