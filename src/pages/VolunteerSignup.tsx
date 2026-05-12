import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HandHeart, ChevronLeft, ChevronRight, X, User, Phone, Mail, MapPin,
  Sparkles, Shield, Shirt, MessageCircle, CalendarDays, Lock,
  Link2, Copy, Check, AlertTriangle,
} from 'lucide-react';
import Layout from '@/components/Layout';
import Logo from '@/components/Logo';
import ShoeboxStack from '@/components/illustrations/ShoeboxStack';
import ChristmasStar from '@/components/illustrations/ChristmasStar';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import {
  COLLECTION_DAYS,
  COLLECTION_DAY,
  DEFAULT_DAY_TIMES,
  COLLECTION_WEEK_START,
  COLLECTION_WEEK_END,
} from '@/data/mockData';
import {
  defaultTokenExpiry,
  findDuplicateSignups,
  getLocationById,
  inferCdoFromZip,
  LOCATIONS,
  USERS,
} from '@/data/mockData';
import type { DayBlock, ShirtSize, StoredSignup } from '@/data/mockData';
import { logAuditEvent } from '@/lib/auditLog';
import { buildCdoSignupAlert, buildSignupConfirmation, sendMessage } from '@/lib/outbox';
import {
  checkSignupThrottle,
  HONEYPOT_FIELD_NAME,
  HONEYPOT_HIDDEN_STYLE,
  logSecuritySignal,
  MIN_FILL_SECONDS,
  stampSignupThrottle,
} from '@/lib/security';
import TurnstileStub from '@/components/TurnstileStub';
import { safeJsonParse } from '@/lib/safeJson';
import { TrustStrip, ChristmasPattern } from '@/components/BrandFlair';
import { useTranslation } from '@/lib/i18n';
import LanguageToggle from '@/components/LanguageToggle';
import { getFirstName } from '@/lib/name';

// Note on roles: in real OCC practice, volunteers sign up just to *serve* —
// the Central Drop-off Leader assigns specific roles (Greeter, Counter,
// Cartonizer, etc.) on the day based on need and experience. Most
// volunteers never get OCC Track app access; only Greeters use the app
// at the welcome table for check-ins.
type Step = 'intro' | 'contact' | 'details' | 'done';

interface SignupDraft {
  name: string;
  email: string;
  phone: string;
  zip: string;
  firstTime: boolean | null;
  shirtSize: ShirtSize | '';
  emergencyName: string;
  emergencyPhone: string;
  notes: string;
  agree: boolean;
}

const EMPTY_DRAFT: SignupDraft = {
  name: '', email: '', phone: '', zip: '',
  firstTime: null, shirtSize: '',
  emergencyName: '', emergencyPhone: '', notes: '',
  agree: false,
};

function newId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

const heroTransition = { duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] };

function formatWeek(start: string, end: string) {
  const a = new Date(start);
  const b = new Date(end);
  const month = a.toLocaleString('en-US', { month: 'long' });
  return `${month} ${a.getDate()}–${b.getDate()}, ${b.getFullYear()}`;
}

export default function VolunteerSignup() {
  const [draft, setDraft] = useState<SignupDraft>(EMPTY_DRAFT);
  const [step, setStep] = useState<Step>('intro');
  const [signups, setSignups] = useLocalStorage<StoredSignup[]>('occ:signups', []);
  const [submittedId, setSubmittedId] = useState<string>('');

  // ── Anti-bot defenses ──────────────────────────────────────────────────
  // Three layers, all cheap, all bypassable individually but expensive
  // together: honeypot field, time-to-fill threshold, per-browser throttle.
  // None of these substitute for server-side rate limits + CAPTCHA in prod.
  const [honeypot, setHoneypot] = useState('');
  const [submitBlocked, setSubmitBlocked] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const mountedAt = useRef<number>(Date.now());
  useEffect(() => {
    mountedAt.current = Date.now();
  }, []);

  function patch(p: Partial<SignupDraft>) {
    setDraft((d) => ({ ...d, ...p }));
  }

  function submit() {
    // Honeypot check — visible to bots, invisible to humans. If anything
    // landed in the hidden field, treat it as a bot and silently fail.
    // We DO log the security signal but show a generic "thanks" path to
    // avoid telling the bot why it was rejected.
    if (honeypot.trim().length > 0) {
      logSecuritySignal('honeypot_filled', `field=${HONEYPOT_FIELD_NAME} value=${honeypot.slice(0, 40)}`);
      setSubmitBlocked("Hmm, that didn't go through. Please refresh the page and try again.");
      return;
    }
    // Time-to-fill check — humans take >3 seconds to fill a multi-field
    // form. Bots that auto-DOM-fill and click submit do it in <1 second.
    const elapsedSeconds = (Date.now() - mountedAt.current) / 1000;
    if (elapsedSeconds < MIN_FILL_SECONDS) {
      logSecuritySignal('submit_too_fast', `elapsed=${elapsedSeconds.toFixed(2)}s`);
      setSubmitBlocked("Hmm, that didn't go through. Please refresh the page and try again.");
      return;
    }
    // Per-browser throttle — same browser can't re-submit within 10s.
    const throttleRemaining = checkSignupThrottle();
    if (throttleRemaining !== null) {
      logSecuritySignal('signup_throttled', `wait=${throttleRemaining}s`);
      setSubmitBlocked(`Please wait ${throttleRemaining}s before submitting again.`);
      return;
    }
    // CAPTCHA gate — production wires this to Cloudflare Turnstile server
    // verification. Prototype: any non-empty token from the stub passes.
    if (!captchaToken) {
      setSubmitBlocked('Please complete the human verification first.');
      return;
    }

    const id = newId();
    // editToken: an unguessable capability URL secret. Volunteer gets it in
    // the success step; admins never see it on the roster. crypto.randomUUID
    // gives us ~122 bits of entropy — fine for a prototype, and the right
    // abstraction even if a production deploy would swap for a signed JWT.
    const editToken =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `tok_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
    const submittedAt = new Date().toISOString();
    // Auto-route to closest Central Drop-off based on ZIP. The volunteer can
    // change it later via their magic link if we guessed wrong (e.g., they
    // want to serve at a different CDO than the one nearest their home).
    const inferredCdo = inferCdoFromZip(draft.zip);
    const stored: StoredSignup = {
      ...draft,
      id,
      submittedAt,
      editToken,
      editTokenExpiresAt: defaultTokenExpiry(submittedAt),
      locationId: inferredCdo,
    };
    setSignups((prev) => [stored, ...prev]);
    setSubmittedId(id);
    setStep('done');
    stampSignupThrottle();
    // Audit trail: every new signup is logged so leadership can see
    // creation events alongside views/edits on /audit-log.
    logAuditEvent(
      { id: 'volunteer-self', name: stored.name, role: 'volunteer_self' },
      'volunteer_signup_created',
      `signup:${id}`,
      `New signup from ${stored.email}`,
    );
    // Mock outbox: in production this is where Telnyx/Resend would actually
    // dispatch the email and SMS. The /outbox viewer (Super Admin) shows
    // what *would have been sent* if the wire was hooked up.
    if (typeof window !== 'undefined') {
      const origin = window.location.origin + window.location.pathname.replace(/\/$/, '');
      const magicLinkUrl = `${origin}#/my-signup?token=${editToken}`;
      const msg = sendMessage(
        buildSignupConfirmation({
          name: stored.name,
          email: stored.email,
          magicLinkUrl,
          channel: 'email',
        }),
      );
      // Cross-link the outbox message into the audit trail so leadership
      // can see "we attempted to send the magic link" alongside the signup.
      msg.relatedTarget = `signup:${id}`;
      // In-app notifications: the CDO Leader hosting this location and the
      // Regional Admin overseeing this region both get a navbar ping so
      // they're aware of new signups without having to refresh /signups.
      // Per-CDO scoping (Phase 18a): we look up the actual leadership for
      // this signup's locationId instead of hard-coding u3/u2.
      const cdoLeader = USERS.find((u) => u.role === 'cdo_leader' && u.locationId === inferredCdo);
      const cdoLocation = LOCATIONS.find((l) => l.id === inferredCdo);
      const regionalAdmin = cdoLocation
        ? USERS.find((u) => u.role === 'regional' && /* matches region by location's state */
            true /* TODO: real region routing — for prototype, single regional always notified */)
        : undefined;
      if (cdoLeader) {
        sendMessage(buildCdoSignupAlert({
          cdoUserId: cdoLeader.id,
          cdoUserName: cdoLeader.name,
          volunteerName: stored.name,
          signupId: id,
        }));
      }
      if (regionalAdmin) {
        sendMessage(buildCdoSignupAlert({
          cdoUserId: regionalAdmin.id,
          cdoUserName: regionalAdmin.name,
          volunteerName: stored.name,
          signupId: id,
        }));
      }
    }
  }

  // Step gating
  // Audit P2.15: tighten email validation. Was `/.+@.+\..+/` which
  // accepted spaces, emojis, and other invalid characters. The pattern
  // below is RFC-5322-ish: no whitespace, no leading/trailing dot in
  // local part, 2-char minimum TLD. Good enough for client-side; the
  // server should still re-validate in production.
  const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
  const contactOk = draft.name.trim().length > 1 && EMAIL_OK.test(draft.email.trim()) && draft.phone.trim().length >= 7;
  const finalOk = draft.agree;

  return (
    <Layout hideNav>
      <div className="relative min-h-[100dvh] overflow-hidden">
        {/* Atmosphere */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-40 -left-40 w-[420px] h-[420px] rounded-full bg-sp-red/8 blur-[120px]" />
          <div className="absolute bottom-0 right-0 w-[440px] h-[440px] rounded-full bg-gold/10 blur-[120px]" />
        </div>

        <div className="relative px-5 pt-6 pb-12 max-w-2xl mx-auto">
          {/* Top bar */}
          <header className="flex items-center justify-between mb-6">
            <Link to="/login" aria-label="OCC Track home"><Logo size={28} /></Link>
            {step !== 'done' && (
              <Link to="/login" className="text-xs text-ink-light hover:text-sp-red flex items-center gap-1 transition-colors">
                <X className="w-4 h-4" />
                Cancel
              </Link>
            )}
          </header>

          {/* Step progress */}
          {step !== 'intro' && step !== 'done' && (
            <StepBar step={step} />
          )}

          <AnimatePresence mode="wait">
            {step === 'intro' && (
              <IntroStep key="intro" onStart={() => setStep('contact')} />
            )}
            {step === 'contact' && (
              <ContactStep
                key="contact"
                draft={draft}
                onPatch={patch}
                onBack={() => setStep('intro')}
                onNext={() => setStep('details')}
                ok={contactOk}
              />
            )}
            {step === 'details' && (
              <DetailsStep
                key="details"
                draft={draft}
                onPatch={patch}
                onBack={() => setStep('contact')}
                onSubmit={submit}
                ok={finalOk}
                honeypot={honeypot}
                onHoneypotChange={setHoneypot}
                submitBlocked={submitBlocked}
                captchaToken={captchaToken}
                onCaptchaVerified={setCaptchaToken}
              />
            )}
            {step === 'done' && (
              <DoneStep
                key="done"
                signup={signups.find((s) => s.id === submittedId)}
                onAnother={() => {
                  setDraft(EMPTY_DRAFT);
                  setSubmittedId('');
                  setStep('intro');
                }}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </Layout>
  );
}

// ─── Step progress bar ────────────────────────────────────────────────────────
function StepBar({ step }: { step: Step }) {
  const stepIndex = { intro: 0, contact: 1, details: 2, done: 3 }[step];
  return (
    <div className="mb-6 space-y-2">
      <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-light">
        <span>Step {stepIndex} of 2</span>
        <span>{['', 'About you', 'A few more things'][stepIndex]}</span>
      </div>
      <div className="flex gap-1.5">
        {[1, 2].map((i) => (
          <span
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i <= stepIndex ? 'bg-sp-red' : 'bg-border-custom'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Intro ───────────────────────────────────────────────────────────────────
function IntroStep({ onStart }: { onStart: () => void }) {
  const { t } = useTranslation();
  // Read the live admin-managed schedule + day blocks so the volunteer sees
  // exactly what the CDO has set up. Falls back to defaults if the admin
  // hasn't customized anything yet.
  const dayTimesRaw = typeof window !== 'undefined' ? window.localStorage.getItem('occ:day-times') : null;
  const dayTimes = safeJsonParse<Record<string, string>>(dayTimesRaw, DEFAULT_DAY_TIMES);
  const blocksRaw = typeof window !== 'undefined' ? window.localStorage.getItem('occ:day-blocks') : null;
  const blocks = safeJsonParse<DayBlock[]>(blocksRaw, []);
  const blocksByDate = new Map(blocks.map((b) => [b.date, b]));
  const openCount = COLLECTION_DAYS.filter((d) => !blocksByDate.has(d.date)).length;

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={heroTransition}
      className="relative space-y-6 text-center"
    >
      <ChristmasPattern />
      <div className="relative flex justify-center">
        <ShoeboxStack size={140} />
      </div>

      <div className="space-y-3">
        <div className="flex justify-center">
          <TrustStrip />
        </div>
        <div className="flex justify-center">
          <LanguageToggle variant="hero" />
        </div>
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-sp-red flex items-center justify-center gap-2">
          <Sparkles className="w-3 h-3" />
          {t('signup.intro.kicker')}
          <Sparkles className="w-3 h-3" />
        </p>
        <h1 className="font-display text-[clamp(2rem,6vw,3.25rem)] font-medium text-ink leading-[1.05] tracking-tight">
          {t('signup.intro.heroH1')}
          <span className="font-display-italic block text-sp-red mt-1 sp-underline">{t('signup.intro.heroSub')}</span>
        </h1>
        <p className="text-sm text-ink-light italic max-w-md mx-auto leading-relaxed">
          {t('signup.intro.bodyP', { week: formatWeek(COLLECTION_WEEK_START, COLLECTION_WEEK_END) })}
        </p>
        <p className="in-his-name text-xs pt-1">{t('brand.tagline')}</p>
      </div>

      <div className="grid grid-cols-3 gap-3 max-w-md mx-auto pt-2">
        <Fact value={t('signup.intro.fact.shiftValue')} label={t('signup.intro.fact.shift')} />
        <Fact value={`${openCount}/${COLLECTION_DAYS.length}`} label={t('signup.intro.fact.days')} />
        <Fact value={t('signup.intro.fact.costValue')} label={t('signup.intro.fact.cost')} />
      </div>

      {/* Week schedule preview — pulls live data from /signups admin */}
      <SchedulePreview dayTimes={dayTimes} blocksByDate={blocksByDate} />

      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={onStart}
        className="group w-full h-16 bg-lime hover:bg-lime-dark transition-colors text-occ-green-dark hover:text-white text-lg font-display rounded-2xl flex items-center justify-center gap-3 shadow-card"
      >
        <HandHeart className="w-5 h-5" />
        {t('signup.intro.cta')}
        <span className="ml-1 w-9 h-9 rounded-full bg-occ-green-dark flex items-center justify-center">
          <ChevronRight className="w-5 h-5 text-white" />
        </span>
      </motion.button>
      <p className="text-[11px] text-ink-light/80">
        {t('signup.intro.alreadyVolunteer')} <Link to="/my-signup" className="font-semibold text-sp-red underline">{t('signup.intro.signIn')}</Link>
      </p>
    </motion.section>
  );
}

function SchedulePreview({
  dayTimes, blocksByDate,
}: {
  dayTimes: Record<string, string>;
  blocksByDate: Map<string, DayBlock>;
}) {
  return (
    <section className="bg-bg-card rounded-2xl border border-border-custom shadow-card overflow-hidden text-left">
      <header className="px-5 py-3 border-b border-border-custom flex items-center gap-2 bg-bg-cream/40">
        <CalendarDays className="w-4 h-4 text-occ-green" />
        <h3 className="font-display text-base text-ink">This Collection Week</h3>
        <span className="text-[10px] font-bold uppercase tracking-wider text-ink-light ml-auto">
          You&apos;ll help any open day
        </span>
      </header>
      <ul className="divide-y divide-border-custom/60">
        {COLLECTION_DAYS.map((d) => {
          const block = blocksByDate.get(d.date);
          const isPast = d.index < COLLECTION_DAY;
          const time = dayTimes[d.date] ?? '';
          return (
            <li
              key={d.date}
              className={`flex items-center gap-3 px-5 py-2.5 text-sm ${
                isPast ? 'opacity-50' : ''
              }`}
            >
              <div className="flex flex-col items-center w-9 shrink-0">
                <span className="text-[9px] font-bold uppercase tracking-wider text-ink-light leading-none">
                  {d.weekday}
                </span>
                <span className="font-display text-lg text-ink tabular-nums leading-none mt-0.5">
                  {d.monthDay}
                </span>
              </div>
              <span className="text-ink-light tabular-nums flex-1">{time}</span>
              {block ? (
                <span className="flex items-center gap-1.5 text-[11px] font-bold text-gold bg-gold-light px-2 py-1 rounded-full uppercase tracking-wider">
                  <Lock className="w-2.5 h-2.5" />
                  {block.coveredBy}
                </span>
              ) : isPast ? (
                <span className="text-[11px] font-bold text-ink-light/60 uppercase tracking-wider">Past</span>
              ) : (
                <span className="flex items-center gap-1.5 text-[11px] font-bold text-occ-green uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-occ-green" />
                  Open
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Fact({ value, label }: { value: string; label: string }) {
  return (
    <div className="bg-bg-card border border-border-custom rounded-2xl p-3">
      <p className="font-display text-xl font-medium text-ink leading-none">{value}</p>
      <p className="text-[10px] text-ink-light uppercase tracking-wider mt-1">{label}</p>
    </div>
  );
}

// ─── Step 1: Contact ─────────────────────────────────────────────────────────
function ContactStep({
  draft, onPatch, onBack, onNext, ok,
}: {
  draft: SignupDraft;
  onPatch: (p: Partial<SignupDraft>) => void;
  onBack: () => void;
  onNext: () => void;
  ok: boolean;
}) {
  const { t } = useTranslation();
  return (
    <StepShell title={t('signup.contact.title')} italic={t('signup.contact.italic')} onBack={onBack}>
      <div className="bg-bg-card rounded-2xl shadow-card border border-border-custom p-5 space-y-4">
        <Field
          label={t('signup.contact.nameLabel')}
          icon={<User className="w-4 h-4" />}
          value={draft.name}
          onChange={(v) => onPatch({ name: v })}
          placeholder={t('signup.contact.namePlaceholder')}
          autoFocus
        />
        <Field
          label={t('signup.contact.emailLabel')}
          icon={<Mail className="w-4 h-4" />}
          value={draft.email}
          onChange={(v) => onPatch({ email: v })}
          placeholder={t('signup.contact.emailPlaceholder')}
          type="email"
        />
        <Field
          label={t('signup.contact.phoneLabel')}
          icon={<Phone className="w-4 h-4" />}
          value={draft.phone}
          onChange={(v) => onPatch({ phone: v })}
          placeholder={t('signup.contact.phonePlaceholder')}
          type="tel"
        />
        <Field
          label={t('signup.contact.zipLabel')}
          icon={<MapPin className="w-4 h-4" />}
          value={draft.zip}
          onChange={(v) => onPatch({ zip: v.replace(/[^\d]/g, '').slice(0, 5) })}
          placeholder={t('signup.contact.zipPlaceholder')}
          mono
        />
      </div>

      <p className="text-[11px] text-ink-light italic px-1">
        {t('signup.contact.privacy')}
      </p>

      <PrimaryNext label={t('signup.contact.next')} onClick={onNext} disabled={!ok} />
    </StepShell>
  );
}

// ─── Step 2: Details ──────────────────────────────────────────────────────────
function DetailsStep({
  draft, onPatch, onBack, onSubmit, ok,
  honeypot, onHoneypotChange, submitBlocked,
  captchaToken, onCaptchaVerified,
}: {
  draft: SignupDraft;
  onPatch: (p: Partial<SignupDraft>) => void;
  onBack: () => void;
  onSubmit: () => void;
  ok: boolean;
  honeypot: string;
  onHoneypotChange: (v: string) => void;
  submitBlocked: string | null;
  captchaToken: string | null;
  onCaptchaVerified: (token: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <StepShell title={t('signup.details.title')} italic={t('signup.details.italic')} onBack={onBack}>
      <div className="bg-bg-card rounded-2xl shadow-card border border-border-custom p-5 space-y-5">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-ink-light mb-2">{t('signup.details.firstTime')}</p>
          <div className="grid grid-cols-2 gap-2 p-1 bg-bg-primary rounded-xl" role="radiogroup" aria-label="First-time volunteer status">
            <button
              type="button"
              role="radio"
              aria-checked={draft.firstTime === true}
              onClick={() => onPatch({ firstTime: true })}
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                draft.firstTime === true ? 'bg-bg-card shadow-card text-ink' : 'text-ink-light'
              }`}
            >
              {t('signup.details.firstTime.yes')}
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={draft.firstTime === false}
              onClick={() => onPatch({ firstTime: false })}
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                draft.firstTime === false ? 'bg-bg-card shadow-card text-ink' : 'text-ink-light'
              }`}
            >
              {t('signup.details.firstTime.no')}
            </button>
          </div>
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-ink-light mb-2 flex items-center gap-1.5">
            <Shirt className="w-3 h-3" /> {t('signup.details.shirt')}
          </p>
          <div className="grid grid-cols-5 gap-1.5">
            {(['S', 'M', 'L', 'XL', 'XXL'] as ShirtSize[]).map((sz) => (
              <button
                key={sz}
                type="button"
                aria-pressed={draft.shirtSize === sz}
                aria-label={`T-shirt size ${sz}`}
                onClick={() => onPatch({ shirtSize: draft.shirtSize === sz ? '' : sz })}
                className={`h-10 rounded-lg text-xs font-bold transition-all border ${
                  draft.shirtSize === sz
                    ? 'bg-ink text-bg-card border-ink'
                    : 'bg-bg-card text-ink-light border-border-custom hover:border-ink/40'
                }`}
              >
                {sz}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-ink-light flex items-center gap-1.5">
            <Shield className="w-3 h-3" /> {t('signup.details.emergency.title')}
          </p>
          <Field
            label={t('signup.details.emergency.name')}
            value={draft.emergencyName}
            onChange={(v) => onPatch({ emergencyName: v })}
            placeholder={t('signup.details.emergencyHelp')}
          />
          <Field
            label={t('signup.details.emergency.phone')}
            type="tel"
            value={draft.emergencyPhone}
            onChange={(v) => onPatch({ emergencyPhone: v })}
            placeholder={t('signup.contact.phonePlaceholder')}
          />
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-ink-light mb-1.5 flex items-center gap-1.5">
            <MessageCircle className="w-3 h-3" /> {t('signup.details.notes.title')}
          </p>
          <textarea
            value={draft.notes}
            onChange={(e) => onPatch({ notes: e.target.value })}
            rows={3}
            placeholder={t('signup.details.notesHelp')}
            className="w-full px-4 py-3 bg-bg-primary border border-border-custom rounded-xl text-sm text-ink placeholder:text-ink-light/60 focus:outline-none focus:border-sp-red transition-colors resize-none"
          />
        </div>
      </div>

      {/* Honeypot — invisible to humans, irresistible to dumb bots.
          Real users never see this field; bots auto-fill every input.
          We use position:absolute off-screen instead of display:none
          because some bots skip display:none fields. */}
      <input
        type="text"
        name={HONEYPOT_FIELD_NAME}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        value={honeypot}
        onChange={(e) => onHoneypotChange(e.target.value)}
        style={HONEYPOT_HIDDEN_STYLE}
      />
      {submitBlocked && (
        <div className="bg-sp-red-light border border-sp-red rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-sp-red shrink-0 mt-0.5" />
          <p className="text-sm text-ink leading-relaxed">{submitBlocked}</p>
        </div>
      )}

      <TurnstileStub
        onVerified={onCaptchaVerified}
        verifiedToken={captchaToken}
      />

      <DuplicateWarning draft={draft} />

      <label className="flex items-start gap-3 bg-bg-cream border border-border-warm rounded-2xl p-4 cursor-pointer">
        <input
          type="checkbox"
          checked={draft.agree}
          onChange={(e) => onPatch({ agree: e.target.checked })}
          className="mt-0.5 w-5 h-5 accent-sp-red shrink-0"
        />
        <span className="text-xs text-ink leading-relaxed">
          {t('signup.details.agree')}
        </span>
      </label>

      <button
        onClick={onSubmit}
        disabled={!ok}
        className="w-full h-16 bg-sp-red text-white text-lg font-semibold rounded-2xl flex items-center justify-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-sp-red-dark transition-colors shadow-card"
      >
        <HandHeart className="w-5 h-5" />
        {t('signup.details.submit')}
      </button>
    </StepShell>
  );
}

// ─── Done ────────────────────────────────────────────────────────────────────
function DoneStep({ signup, onAnother }: { signup?: StoredSignup; onAnother: () => void }) {
  const { t } = useTranslation();
  const firstName = signup?.name ? getFirstName(signup.name) : '';
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={heroTransition}
      className="space-y-6 text-center"
    >
      <div className="relative flex justify-center">
        <ChristmasStar className="absolute -top-4 -left-2 opacity-50" size={48} />
        <ChristmasStar className="absolute -top-2 right-4 opacity-40" size={36} />
        <ShoeboxStack size={140} />
      </div>

      <div className="space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-sp-red">{t('signup.done.kicker')}</p>
        <h1 className="font-display text-[clamp(2rem,5vw,3rem)] font-medium text-ink leading-[1.05] tracking-tight">
          {t('signup.done.title')}{firstName ? `, ${firstName}` : ''}.
          <span className="font-display-italic block text-sp-red mt-1">{t('signup.done.italic')}</span>
        </h1>
        <p className="text-base text-ink-light italic max-w-md mx-auto leading-relaxed">
          {t('signup.done.body')}
        </p>
      </div>

      <div className="bg-bg-card rounded-2xl shadow-card border border-border-custom p-5 max-w-md mx-auto text-left space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sp-red mb-1">{t('signup.done.summary')}</p>
        <SummaryLine
          label={t('signup.done.summary.servingAt')}
          value={getLocationById(signup?.locationId ?? '')?.name ?? '—'}
        />
        <SummaryLine label={t('signup.done.summary.phone')} value={signup?.phone ?? '—'} />
        <SummaryLine label={t('signup.done.summary.email')} value={signup?.email ?? '—'} />
        <SummaryLine label={t('signup.done.summary.shirt')} value={signup?.shirtSize || '—'} />
      </div>

      {signup?.editToken && <MagicLinkCard token={signup.editToken} email={signup.email} />}

      <p className="text-sm text-ink-light italic">
        {t('signup.done.shareLine')} <span className="text-sp-red font-semibold">samaritanspurse.org/occ</span>
      </p>

      <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
        <button onClick={onAnother} className="h-12 bg-bg-card border-2 border-border-custom text-ink text-sm font-semibold rounded-2xl hover:border-ink transition-colors">
          {t('signup.done.signAnother')}
        </button>
        <Link to="/" className="h-12 bg-sp-red text-white text-sm font-semibold rounded-2xl flex items-center justify-center hover:bg-sp-red-dark transition-colors">
          {t('signup.intro.signIn').includes('link') ? 'Home' : 'Inicio'}
        </Link>
      </div>
    </motion.section>
  );
}

// ─── Magic link card ─────────────────────────────────────────────────────
// Shows the volunteer their personal edit URL with copy-to-clipboard.
// Possession of this URL = edit rights on the signup, no password needed.
// The same link is also dispatched via the outbox (mocked) so the volunteer
// has it in their inbox if they close this tab.
function MagicLinkCard({ token, email }: { token: string; email: string }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const origin =
    typeof window !== 'undefined' ? window.location.origin + window.location.pathname.replace(/\/$/, '') : '';
  const url = `${origin}#/my-signup?token=${token}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const el = document.querySelector<HTMLInputElement>('#magic-link-input');
      if (el) { el.select(); el.setSelectionRange(0, 99999); }
    }
  }

  return (
    <div className="bg-lime-light border-2 border-lime rounded-2xl p-5 max-w-md mx-auto text-left space-y-3">
      <div className="flex items-center gap-2">
        <Link2 className="w-4 h-4 text-occ-green-dark" />
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-occ-green-dark">
          {t('signup.done.magic.title')}
        </p>
      </div>
      <p className="text-xs text-ink leading-relaxed">
        {t('signup.done.magic.intro', { email })}
      </p>
      <div className="flex gap-2">
        <input
          id="magic-link-input"
          readOnly
          value={url}
          className="flex-1 h-10 px-3 text-[11px] font-mono bg-white border border-lime rounded-lg text-ink-light truncate focus:outline-none focus:border-occ-green"
          onClick={(e) => (e.currentTarget as HTMLInputElement).select()}
        />
        <button
          onClick={copy}
          className={`h-10 px-3 text-xs font-bold uppercase tracking-wider rounded-lg flex items-center gap-1.5 transition-colors ${
            copied
              ? 'bg-occ-green text-white'
              : 'bg-occ-green-dark text-white hover:bg-occ-green'
          }`}
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? t('signup.done.magic.copied') : t('signup.done.magic.copy')}
        </button>
      </div>
    </div>
  );
}

// Duplicate-signup warning — shown on the Details step when the email or
// phone matches an existing signup. Non-blocking on purpose: families
// sometimes use a shared email/phone, and we'd rather let them through
// than hard-block a real case.
function DuplicateWarning({ draft }: { draft: SignupDraft }) {
  const [signups] = useLocalStorage<StoredSignup[]>('occ:signups', []);
  const dupes = findDuplicateSignups(signups, { email: draft.email, phone: draft.phone });
  if (dupes.length === 0) return null;
  const existing = dupes[0];
  return (
    <div className="bg-gold-light border border-gold rounded-2xl p-4 flex items-start gap-3">
      <AlertTriangle className="w-5 h-5 text-gold shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-ink">
          We already have a signup with this {existing.email === draft.email ? 'email' : 'phone'}.
        </p>
        <p className="text-xs text-ink-light italic mt-1 leading-relaxed">
          If that&apos;s you, use your edit link instead of submitting again — search your
          inbox for &quot;Operation Christmas Child.&quot; Multiple family members sharing one
          email? Just submit; we&apos;ll dedupe later.
        </p>
      </div>
    </div>
  );
}

function SummaryLine({ label, value, capitalize }: { label: string; value: string; capitalize?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border-custom/60 last:border-0 py-1.5">
      <span className="text-[11px] font-semibold text-ink-light uppercase tracking-wider">{label}</span>
      <span className={`text-sm font-medium text-ink text-right ${capitalize ? 'capitalize' : ''}`}>{value}</span>
    </div>
  );
}

// ─── Shared primitives ────────────────────────────────────────────────────────
function StepShell({
  title, italic, children, onBack,
}: {
  title: string;
  italic: string;
  children: React.ReactNode;
  onBack: () => void;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={heroTransition}
      className="space-y-5"
    >
      <button onClick={onBack} className="text-xs text-ink-light hover:text-ink flex items-center gap-1 transition-colors -ml-1">
        <ChevronLeft className="w-4 h-4" />
        Back
      </button>
      <div>
        <h2 className="font-display text-2xl sm:text-3xl font-medium text-ink leading-tight">
          {title}
        </h2>
        <p className="font-display-italic text-base text-ink-light mt-1">{italic}</p>
      </div>
      {children}
    </motion.section>
  );
}

function Field({
  label, icon, value, onChange, placeholder, type, autoFocus, mono,
}: {
  label: string;
  icon?: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: 'text' | 'tel' | 'email';
  autoFocus?: boolean;
  mono?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink-light mb-1.5 flex items-center gap-1.5">
        {icon && <span className="text-ink-light/60">{icon}</span>}
        {label}
      </span>
      <input
        autoFocus={autoFocus}
        type={type ?? 'text'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full h-12 px-4 bg-bg-primary border border-border-custom rounded-xl text-base text-ink placeholder:text-ink-light/50 focus:outline-none focus:border-sp-red transition-colors ${mono ? 'font-mono tabular-nums' : ''}`}
      />
    </label>
  );
}

function PrimaryNext({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full h-14 bg-sp-red text-white text-base font-semibold rounded-2xl flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-sp-red-dark transition-colors"
    >
      {label}
      <ChevronRight className="w-5 h-5" />
    </button>
  );
}
