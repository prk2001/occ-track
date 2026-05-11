import { useState } from 'react';
import { Link } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HandHeart, ChevronLeft, ChevronRight, X, User, Phone, Mail, MapPin,
  CheckCircle2, Sparkles, Shield, Shirt, MessageCircle, CalendarDays, Lock,
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
import type { DayBlock } from '@/data/mockData';

// Note on roles: in real OCC practice, volunteers sign up just to *serve* —
// the Central Drop-off Leader assigns specific roles (Greeter, Counter,
// Cartonizer, etc.) on the day based on need and experience. Most
// volunteers never get OCC Track app access; only Greeters use the app
// at the welcome table for check-ins.
type Step = 'intro' | 'contact' | 'details' | 'done';
type ShirtSize = 'S' | 'M' | 'L' | 'XL' | 'XXL';

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

interface StoredSignup extends SignupDraft {
  id: string;
  submittedAt: string;
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

  function patch(p: Partial<SignupDraft>) {
    setDraft((d) => ({ ...d, ...p }));
  }

  function submit() {
    const id = newId();
    const stored: StoredSignup = { ...draft, id, submittedAt: new Date().toISOString() };
    setSignups((prev) => [stored, ...prev]);
    setSubmittedId(id);
    setStep('done');
  }

  // Step gating
  const contactOk = draft.name.trim().length > 1 && /.+@.+\..+/.test(draft.email) && draft.phone.trim().length >= 7;
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
  // Read the live admin-managed schedule + day blocks so the volunteer sees
  // exactly what the CDO has set up. Falls back to defaults if the admin
  // hasn't customized anything yet.
  const dayTimesRaw = typeof window !== 'undefined' ? window.localStorage.getItem('occ:day-times') : null;
  const dayTimes: Record<string, string> = dayTimesRaw ? JSON.parse(dayTimesRaw) : DEFAULT_DAY_TIMES;
  const blocksRaw = typeof window !== 'undefined' ? window.localStorage.getItem('occ:day-blocks') : null;
  const blocks: DayBlock[] = blocksRaw ? JSON.parse(blocksRaw) : [];
  const blocksByDate = new Map(blocks.map((b) => [b.date, b]));
  const openCount = COLLECTION_DAYS.filter((d) => !blocksByDate.has(d.date)).length;

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={heroTransition}
      className="space-y-6 text-center"
    >
      <div className="flex justify-center">
        <ShoeboxStack size={140} />
      </div>

      <div className="space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-sp-red flex items-center justify-center gap-2">
          <Sparkles className="w-3 h-3" />
          Volunteer · Collection Week 2026
          <Sparkles className="w-3 h-3" />
        </p>
        <h1 className="font-display text-[clamp(2rem,6vw,3.25rem)] font-medium text-ink leading-[1.05] tracking-tight">
          Yes, we&apos;d love your help.
          <span className="font-display-italic block text-sp-red mt-1">Thank you for showing up.</span>
        </h1>
        <p className="text-sm text-ink-light italic max-w-md mx-auto leading-relaxed">
          {formatWeek(COLLECTION_WEEK_START, COLLECTION_WEEK_END)}. A few minutes here puts your name
          on the team — we&apos;ll follow up with details a week before.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3 max-w-md mx-auto pt-2">
        <Fact value="~3 hrs" label="Avg shift" />
        <Fact value={`${openCount}/${COLLECTION_DAYS.length}`} label="Days open" />
        <Fact value="0 cost" label="Just your time" />
      </div>

      {/* Week schedule preview — pulls live data from /signups admin */}
      <SchedulePreview dayTimes={dayTimes} blocksByDate={blocksByDate} />

      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={onStart}
        className="group w-full h-16 bg-lime hover:bg-lime-dark transition-colors text-occ-green-dark hover:text-white text-lg font-display rounded-2xl flex items-center justify-center gap-3 shadow-card"
      >
        <HandHeart className="w-5 h-5" />
        Sign me up
        <span className="ml-1 w-9 h-9 rounded-full bg-occ-green-dark flex items-center justify-center">
          <ChevronRight className="w-5 h-5 text-white" />
        </span>
      </motion.button>
      <p className="text-[11px] text-ink-light/80">
        Already volunteering this week? <Link to="/login" className="font-semibold text-sp-red underline">Sign in instead</Link>
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
  return (
    <StepShell title="First, the basics." italic="Just so we can reach you." onBack={onBack}>
      <div className="bg-bg-card rounded-2xl shadow-card border border-border-custom p-5 space-y-4">
        <Field
          label="Your name"
          icon={<User className="w-4 h-4" />}
          value={draft.name}
          onChange={(v) => onPatch({ name: v })}
          placeholder="First and last"
          autoFocus
        />
        <Field
          label="Email"
          icon={<Mail className="w-4 h-4" />}
          value={draft.email}
          onChange={(v) => onPatch({ email: v })}
          placeholder="you@email.com"
          type="email"
        />
        <Field
          label="Phone"
          icon={<Phone className="w-4 h-4" />}
          value={draft.phone}
          onChange={(v) => onPatch({ phone: v })}
          placeholder="(404) 555-0101"
          type="tel"
        />
        <Field
          label="Your ZIP code (optional)"
          icon={<MapPin className="w-4 h-4" />}
          value={draft.zip}
          onChange={(v) => onPatch({ zip: v.replace(/[^\d]/g, '').slice(0, 5) })}
          placeholder="30301"
          mono
        />
      </div>

      <p className="text-[11px] text-ink-light italic px-1">
        We only use this to coordinate the week. No marketing, no sharing — we promise.
      </p>

      <PrimaryNext label="Continue" onClick={onNext} disabled={!ok} />
    </StepShell>
  );
}

// ─── Step 2: Details ──────────────────────────────────────────────────────────
function DetailsStep({
  draft, onPatch, onBack, onSubmit, ok,
}: {
  draft: SignupDraft;
  onPatch: (p: Partial<SignupDraft>) => void;
  onBack: () => void;
  onSubmit: () => void;
  ok: boolean;
}) {
  return (
    <StepShell title="Almost done." italic="A few quick details to plan the week." onBack={onBack}>
      <div className="bg-bg-card rounded-2xl shadow-card border border-border-custom p-5 space-y-5">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-ink-light mb-2">First time volunteering with OCC?</p>
          <div className="grid grid-cols-2 gap-2 p-1 bg-bg-primary rounded-xl">
            <button
              onClick={() => onPatch({ firstTime: true })}
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                draft.firstTime === true ? 'bg-bg-card shadow-card text-ink' : 'text-ink-light'
              }`}
            >
              Yes, first time
            </button>
            <button
              onClick={() => onPatch({ firstTime: false })}
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                draft.firstTime === false ? 'bg-bg-card shadow-card text-ink' : 'text-ink-light'
              }`}
            >
              I&apos;m a returner
            </button>
          </div>
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-ink-light mb-2 flex items-center gap-1.5">
            <Shirt className="w-3 h-3" /> T-shirt size
          </p>
          <div className="grid grid-cols-5 gap-1.5">
            {(['S', 'M', 'L', 'XL', 'XXL'] as ShirtSize[]).map((sz) => (
              <button
                key={sz}
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
            <Shield className="w-3 h-3" /> Emergency contact
          </p>
          <Field
            label="Name"
            value={draft.emergencyName}
            onChange={(v) => onPatch({ emergencyName: v })}
            placeholder="Someone we can reach in an emergency"
          />
          <Field
            label="Phone"
            type="tel"
            value={draft.emergencyPhone}
            onChange={(v) => onPatch({ emergencyPhone: v })}
            placeholder="(404) 555-0101"
          />
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-ink-light mb-1.5 flex items-center gap-1.5">
            <MessageCircle className="w-3 h-3" /> Anything else? (optional)
          </p>
          <textarea
            value={draft.notes}
            onChange={(e) => onPatch({ notes: e.target.value })}
            rows={3}
            placeholder="Bringing my kids · I have a van for transport · I'm available for setup the day before · ..."
            className="w-full px-4 py-3 bg-bg-primary border border-border-custom rounded-xl text-sm text-ink placeholder:text-ink-light/60 focus:outline-none focus:border-sp-red transition-colors resize-none"
          />
        </div>
      </div>

      <label className="flex items-start gap-3 bg-bg-cream border border-border-warm rounded-2xl p-4 cursor-pointer">
        <input
          type="checkbox"
          checked={draft.agree}
          onChange={(e) => onPatch({ agree: e.target.checked })}
          className="mt-0.5 w-5 h-5 accent-sp-red shrink-0"
        />
        <span className="text-xs text-ink leading-relaxed">
          I understand my information will be used to coordinate Collection Week and confirm I&apos;m
          available to serve as a volunteer with Samaritan&apos;s Purse Operation Christmas Child.
          <span className="block text-ink-light italic mt-1">A liability waiver will be available to sign at the welcome table on Day 1.</span>
        </span>
      </label>

      <button
        onClick={onSubmit}
        disabled={!ok}
        className="w-full h-16 bg-sp-red text-white text-lg font-semibold rounded-2xl flex items-center justify-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-sp-red-dark transition-colors shadow-card"
      >
        <HandHeart className="w-5 h-5" />
        Submit my sign-up
      </button>
    </StepShell>
  );
}

// ─── Done ────────────────────────────────────────────────────────────────────
function DoneStep({ signup, onAnother }: { signup?: StoredSignup; onAnother: () => void }) {
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
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-sp-red">You&apos;re on the team</p>
        <h1 className="font-display text-[clamp(2rem,5vw,3rem)] font-medium text-ink leading-[1.05] tracking-tight">
          Thank you{signup?.name ? `, ${signup.name.split(' ')[0]}` : ''}.
          <span className="font-display-italic block text-sp-red mt-1">We&apos;ll be in touch.</span>
        </h1>
        <p className="text-base text-ink-light italic max-w-md mx-auto leading-relaxed">
          Your team lead at the closest Central Drop-off will email you the week before
          Collection Week with check-in details, parking, and what to wear.
        </p>
      </div>

      <div className="bg-bg-card rounded-2xl shadow-card border border-border-custom p-5 max-w-md mx-auto text-left space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sp-red mb-1">Quick summary</p>
        <SummaryLine label="Phone" value={signup?.phone ?? '—'} />
        <SummaryLine label="Email" value={signup?.email ?? '—'} />
        <SummaryLine label="Shirt" value={signup?.shirtSize || '—'} />
      </div>

      <p className="text-sm text-ink-light italic">
        Until then, share with a friend: <span className="text-sp-red font-semibold">samaritanspurse.org/occ</span>
      </p>

      <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
        <button onClick={onAnother} className="h-12 bg-bg-card border-2 border-border-custom text-ink text-sm font-semibold rounded-2xl hover:border-ink transition-colors">
          Sign up someone else
        </button>
        <Link to="/login" className="h-12 bg-sp-red text-white text-sm font-semibold rounded-2xl flex items-center justify-center hover:bg-sp-red-dark transition-colors">
          Back to home
        </Link>
      </div>
    </motion.section>
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
