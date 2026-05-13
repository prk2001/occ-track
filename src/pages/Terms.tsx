import { Link } from 'react-router';
import { Scroll, ChevronLeft, Mail, Heart } from 'lucide-react';
import Layout from '@/components/Layout';
import { useNoIndex } from '@/hooks/useNoIndex';
import { useTranslation } from '@/lib/i18n';

/**
 * Volunteer terms of service. Lightweight — the prototype is operated
 * by an SP-affiliated team and the "agreement" is essentially "I will
 * conduct myself per SP's Statement of Faith + volunteer code of
 * conduct." Real production page links to the canonical SP volunteer
 * agreement PDF. Phase 35a.
 */
export default function Terms() {
  useNoIndex();
  const { t } = useTranslation();
  return (
    <Layout>
      <div className="px-4 py-6 max-w-3xl mx-auto pb-24 space-y-6">
        <Link
          to="/login"
          className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-ink-light hover:text-sp-red transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          {t('common.back')}
        </Link>
        <header className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-sp-red">
            {t('terms.kicker')}
          </p>
          <h1 className="font-display text-3xl sm:text-4xl text-ink leading-tight tracking-tight">
            {t('terms.title')}{' '}
            <span className="font-display-italic text-sp-red">{t('terms.titleEm')}</span>
          </h1>
          <p className="text-sm text-ink-light italic">{t('terms.subtitle')}</p>
        </header>
        <Section icon={Heart} heading={t('terms.spirit.heading')} body={t('terms.spirit.body')} />
        <Section icon={Scroll} heading={t('terms.access.heading')} body={t('terms.access.body')} />
        <Section icon={Scroll} heading={t('terms.liability.heading')} body={t('terms.liability.body')} />
        <Section icon={Scroll} heading={t('terms.changes.heading')} body={t('terms.changes.body')} />
        <div className="bg-bg-cream rounded-2xl border border-border-warm p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-sp-red mb-2">
            {t('terms.contact.kicker')}
          </p>
          <p className="text-sm text-ink leading-relaxed">{t('terms.contact.body')}</p>
          <a
            href="mailto:legal@samaritanspurse.org"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-sp-red hover:text-sp-red-dark mt-2"
          >
            <Mail className="w-3.5 h-3.5" />
            legal@samaritanspurse.org
          </a>
        </div>
        <p className="text-[11px] text-ink-light italic">
          {t('terms.updated', { date: 'May 13, 2026' })}
        </p>
      </div>
    </Layout>
  );
}

function Section({
  icon: Icon, heading, body,
}: {
  icon: typeof Scroll;
  heading: string;
  body: string;
}) {
  return (
    <section className="bg-bg-card rounded-2xl border border-border-custom p-5 shadow-card">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-occ-green shrink-0" aria-hidden="true" />
        <h2 className="font-display text-base text-ink leading-tight">{heading}</h2>
      </div>
      <p className="text-sm text-ink leading-relaxed whitespace-pre-line">{body}</p>
    </section>
  );
}
