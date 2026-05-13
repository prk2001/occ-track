import { Link } from 'react-router';
import { Shield, ChevronLeft, Mail, FileText } from 'lucide-react';
import Layout from '@/components/Layout';
import { useNoIndex } from '@/hooks/useNoIndex';
import { useTranslation } from '@/lib/i18n';

/**
 * Public privacy policy. Any system collecting PII (name, email, phone,
 * ZIP, emergency contact) needs a published privacy statement. Plain
 * English; mirrors the prototype's actual data flows (no analytics,
 * no marketing, no sharing). When the real backend lands replace with
 * the SP-OCC-canonical policy. Phase 35a.
 */
export default function Privacy() {
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
            {t('privacy.kicker')}
          </p>
          <h1 className="font-display text-3xl sm:text-4xl text-ink leading-tight tracking-tight">
            {t('privacy.title')}{' '}
            <span className="font-display-italic text-sp-red">{t('privacy.titleEm')}</span>
          </h1>
          <p className="text-sm text-ink-light italic">{t('privacy.subtitle')}</p>
        </header>
        <Section icon={Shield} heading={t('privacy.collect.heading')} body={t('privacy.collect.body')} />
        <Section icon={FileText} heading={t('privacy.use.heading')} body={t('privacy.use.body')} />
        <Section icon={Mail} heading={t('privacy.share.heading')} body={t('privacy.share.body')} />
        <Section icon={Shield} heading={t('privacy.retain.heading')} body={t('privacy.retain.body')} />
        <Section icon={Shield} heading={t('privacy.rights.heading')} body={t('privacy.rights.body')} />
        <div className="bg-bg-cream rounded-2xl border border-border-warm p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-sp-red mb-2">
            {t('privacy.contact.kicker')}
          </p>
          <p className="text-sm text-ink leading-relaxed">{t('privacy.contact.body')}</p>
          <a
            href="mailto:privacy@samaritanspurse.org"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-sp-red hover:text-sp-red-dark mt-2"
          >
            <Mail className="w-3.5 h-3.5" />
            privacy@samaritanspurse.org
          </a>
        </div>
        <p className="text-[11px] text-ink-light italic">
          {t('privacy.updated', { date: 'May 13, 2026' })}
        </p>
      </div>
    </Layout>
  );
}

function Section({
  icon: Icon, heading, body,
}: {
  icon: typeof Shield;
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
