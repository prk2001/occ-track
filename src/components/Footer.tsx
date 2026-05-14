import { Mark } from '@/components/Logo';
import { Link } from 'react-router';
import { useTranslation } from '@/lib/i18n';

/**
 * Footer — editorial colophon.
 *
 * Phase 36 redesign: dropped the bordered card chrome in favor of an
 * open colophon — page seal on the left, signature in the middle,
 * masthead address on the right. Reads like the back of a hand-set
 * pamphlet, not a SaaS footer.
 */
export default function Footer() {
  const year = new Date().getFullYear();
  const { t } = useTranslation();
  return (
    <footer className="mt-10 mb-20 px-5">
      <div className="max-w-3xl mx-auto">
        {/* Fleuron divider — opens the colophon. */}
        <div className="editorial-rule mb-8" aria-hidden="true">
          <span className="fleuron" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr_auto] gap-6 sm:gap-8 items-center">
          {/* Page seal — small Est. 1993 stamp, slightly tilted */}
          <div className="flex justify-center sm:justify-start">
            <div className="page-seal" style={{ transform: 'rotate(-4deg)' }}>
              <span className="font-mast text-[6.5px] block">Operation</span>
              <span className="font-mast text-[6.5px] block">Christmas</span>
              <span className="font-mast text-[6.5px] block">Child</span>
              <span className="font-display-italic text-[12px] block mt-0.5">est.</span>
              <span className="font-display text-[13px] block tabular-nums leading-none">1993</span>
            </div>
          </div>

          {/* Signature — center column. */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
              <Mark size={20} />
              <p className="font-mast text-[9px] text-ink-light">Operation Christmas Child</p>
            </div>
            <p className="font-display-italic text-[26px] text-sp-red leading-none">
              In Jesus&rsquo; Name.
            </p>
            <p className="font-sans text-[11px] text-ink-light italic max-w-sm mx-auto leading-relaxed">
              The official digital companion for Drop-off Leaders, Central
              Drop-off Leaders, and Greeters.
            </p>
          </div>

          {/* Masthead address + legal — right column. */}
          <div className="font-mast text-[9px] text-ink-light text-center sm:text-right space-y-1.5 leading-relaxed">
            <p>Samaritan&rsquo;s Purse</p>
            <p>801 Bamboo Road</p>
            <p>Boone &middot; NC 28607</p>
            <p className="pt-2 flex items-center justify-center sm:justify-end gap-2">
              <Link to="/privacy" className="hover:text-sp-red transition-colors">
                {t('common.privacy')}
              </Link>
              <span className="text-ink-light/40" aria-hidden="true">/</span>
              <Link to="/terms" className="hover:text-sp-red transition-colors">
                {t('common.terms')}
              </Link>
            </p>
            <p className="font-sans not-italic text-[10px] text-ink-light/70 normal-case tracking-normal pt-1">
              © {year} Samaritan&rsquo;s Purse. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
