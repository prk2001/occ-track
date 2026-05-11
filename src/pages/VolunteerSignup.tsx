import { useState } from 'react';
import { Link } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HandHeart, ChevronLeft, ChevronRight, X, User, Phone, Mail, MapPin,
  CheckCircle2, Sparkles, Shield, Shirt, MessageCircle,
} from 'lucide-react';
import Layout from '@/components/Layout';
import Logo from '@/components/Logo';
import ShoeboxStack from '@/components/illustrations/ShoeboxStack';
import ChristmasStar from '@/components/illustrations/ChristmasStar';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import {
  COLLECTION_DAYS,
  VOLUNTEER_ROLE_CONFIG,
  COLLECTION_WEEK_START,
  COLLECTION_WEEK_END,
} from '@/data/mockData';
import type { VolunteerRole } from '@/data/mockData';

type Step = 'intro' | 'contact' | 'days' | 'roles' | 'details' | 'done';
type ShirtSize = 'S' | 'M' | 'L' | 'XL' | 'XXL';
type HoursPref = 'morning' | 'afternoon' | 'evening' | 'any';

interface SignupDraft {
  name: string;
  email: string;
  phone: string;
  zip: string;
  days: string[];
  hoursPref: HoursPref;
  roles: VolunteerRole[];
  anyRole: boolean;
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
  days: [], hoursPref: 'any',
  roles: [], anyRole: false,
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
  const daysOk = draft.days.length > 0;
  const rolesOk = draft.anyRole || draft.roles.length > 0;
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
                onNext={() => setStep('days')}
                ok={contactOk}
              />
            )}
            {step === 'days' && (
              <DaysStep
                key="days"
                draft={draft}
                onPatch={patch}
                onBack={() => setStep('contact')}
                onNext={() => setStep('roles')}
                ok={daysOk}
              />
            )}
            {step === 'roles' && (
              <RolesStep
                key="roles"
                draft={draft}
                onPatch={patch}
                onBack={() => setStep('days')}
                onNext={() => setStep('details')}
                ok={rolesOk}
              />
            )}
            {step === 'details' && (
              <DetailsStep
                key="details"
                draft={draft}
                onPatch={patch}
                onBack={() => setStep('roles')}
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
  const stepIndex = { intro: 0, contact: 1, days: 2, roles: 3, details: 4, done: 5 }[step];
  return (
    <div className="mb-6 space-y-2">
      <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-light">
        <span>Step {stepIndex} of 4</span>
        <span>{['', 'About you', 'Your days', 'Your roles', 'A few more things'][stepIndex]}</span>
      </div>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4].map((i) => (
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
          on a team — we&apos;ll follow up with details a week before.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3 max-w-md mx-auto pt-2">
        <Fact value="~3 hrs" label="Avg shift" />
        <Fact value="6 roles" label="To choose from" />
        <Fact value="0 cost" label="Just your time" />
      </div>

      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={onStart}
        className="w-full h-16 bg-sp-red text-white text-lg font-semibold rounded-2xl flex items-center justify-center gap-3 shadow-card hover:bg-sp-red-dark transition-colors"
      >
        <HandHeart className="w-5 h-5" />
        Sign me up
        <ChevronRight className="w-5 h-5" />
      </motion.button>
      <p className="text-[11px] text-ink-light/80">
        Already volunteering this week? <Link to="/login" className="font-semibold text-sp-red underline">Sign in instead</Link>
      </p>
    </motion.section>
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

// ─── Step 2: Days ────────────────────────────────────────────────────────────
function DaysStep({
  draft, onPatch, onBack, onNext, ok,
}: {
  draft: SignupDraft;
  onPatch: (p: Partial<SignupDraft>) => void;
  onBack: () => void;
  onNext: () => void;
  ok: boolean;
}) {
  function toggleDay(date: string) {
    onPatch({
      days: draft.days.includes(date) ? draft.days.filter((d) => d !== date) : [...draft.days, date],
    });
  }
  return (
    <StepShell title="When can you help?" italic="Tap every day you can serve." onBack={onBack}>
      <div className="grid grid-cols-4 gap-2">
        {COLLECTION_DAYS.map((d) => {
          const active = draft.days.includes(d.date);
          return (
            <button
              key={d.date}
              onClick={() => toggleDay(d.date)}
              className={`relative flex flex-col items-center justify-center h-20 rounded-2xl border-2 transition-all ${
                active
                  ? 'bg-sp-red text-white border-sp-red shadow-card'
                  : 'bg-bg-card text-ink border-border-custom hover:border-sp-red/50'
              }`}
            >
              <span className="text-[10px] font-bold uppercase tracking-[0.15em] opacity-80">{d.weekday}</span>
              <span className={`font-display text-2xl font-medium tabular-nums leading-none mt-0.5 ${active ? 'text-white' : 'text-ink'}`}>{d.monthDay}</span>
              <span className={`text-[9px] mt-1 ${active ? 'text-white/80' : 'text-ink-light'}`}>Nov</span>
              {active && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-bg-card border-2 border-sp-red flex items-center justify-center">
                  <CheckCircle2 className="w-3 h-3 text-sp-red" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-ink-light mb-2">Time of day you prefer</p>
        <div className="grid grid-cols-4 gap-1.5">
          {([
            { v: 'morning', label: 'Morning' },
            { v: 'afternoon', label: 'Afternoon' },
            { v: 'evening', label: 'Evening' },
            { v: 'any', label: 'Any time' },
          ] as { v: HoursPref; label: string }[]).map((opt) => (
            <button
              key={opt.v}
              onClick={() => onPatch({ hoursPref: opt.v })}
              className={`h-10 rounded-xl text-xs font-semibold transition-all border ${
                draft.hoursPref === opt.v
                  ? 'bg-ink text-bg-card border-ink'
                  : 'bg-bg-card text-ink-light border-border-custom hover:border-ink/40'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <p className="text-[11px] text-ink-light italic px-1 text-center">
        {draft.days.length === 0
          ? 'Pick at least one day to continue.'
          : `Wonderful — that's ${draft.days.length} ${draft.days.length === 1 ? 'day' : 'days'} of impact.`}
      </p>

      <PrimaryNext label="Continue" onClick={onNext} disabled={!ok} />
    </StepShell>
  );
}

// ─── Step 3: Roles ───────────────────────────────────────────────────────────
function RolesStep({
  draft, onPatch, onBack, onNext, ok,
}: {
  draft: SignupDraft;
  onPatch: (p: Partial<SignupDraft>) => void;
  onBack: () => void;
  onNext: () => void;
  ok: boolean;
}) {
  function toggleRole(r: VolunteerRole) {
    onPatch({
      roles: draft.roles.includes(r) ? draft.roles.filter((x) => x !== r) : [...draft.roles, r],
      anyRole: false,
    });
  }
  function toggleAnyRole() {
    onPatch({ anyRole: !draft.anyRole, roles: [] });
  }

  return (
    <StepShell title="What sounds like you?" italic="Pick one or several. There's no wrong answer." onBack={onBack}>
      <button
        onClick={toggleAnyRole}
        className={`w-full flex items-center gap-3 rounded-2xl border-2 px-5 py-4 transition-all ${
          draft.anyRole
            ? 'bg-sp-red border-sp-red text-white shadow-card'
            : 'bg-bg-card border-border-custom hover:border-sp-red/50'
        }`}
      >
        <Sparkles className={`w-5 h-5 ${draft.anyRole ? 'text-white' : 'text-sp-red'}`} />
        <div className="flex-1 text-left">
          <p className="font-display text-base font-medium leading-tight">Wherever I&apos;m needed</p>
          <p className={`text-[11px] mt-0.5 ${draft.anyRole ? 'text-white/85' : 'text-ink-light'}`}>
            We&apos;ll put you where the gap is on the day
          </p>
        </div>
        {draft.anyRole && <CheckCircle2 className="w-5 h-5 text-white shrink-0" />}
      </button>

      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-border-warm" />
        <span className="text-[10px] uppercase tracking-[0.25em] text-ink-light">or pick specific roles</span>
        <span className="h-px flex-1 bg-border-warm" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {(Object.keys(VOLUNTEER_ROLE_CONFIG) as VolunteerRole[]).map((r) => {
          const cfg = VOLUNTEER_ROLE_CONFIG[r];
          const active = !draft.anyRole && draft.roles.includes(r);
          return (
            <button
              key={r}
              onClick={() => toggleRole(r)}
              disabled={draft.anyRole}
              className={`relative flex items-start gap-3 rounded-2xl border-2 p-4 text-left transition-all disabled:opacity-40 ${
                active
                  ? 'bg-bg-card shadow-card'
                  : 'bg-bg-card border-border-custom hover:shadow-card'
              }`}
              style={active ? { borderColor: cfg.color } : undefined}
            >
              <span
                className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                style={{ backgroundColor: cfg.color }}
              />
              <div className="flex-1 min-w-0">
                <p className="font-display text-base font-medium text-ink leading-tight">{cfg.label}</p>
                <p className="text-[11px] text-ink-light mt-0.5">{cfg.description}</p>
              </div>
              {active && <CheckCircle2 className="w-4 h-4 shrink-0 mt-1" style={{ color: cfg.color }} />}
            </button>
          );
        })}
      </div>

      <PrimaryNext label="Continue" onClick={onNext} disabled={!ok} />
    </StepShell>
  );
}

// ─── Step 4: Details ──────────────────────────────────────────────────────────
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
        <SummaryLine label="Days" value={signup?.days.length ? signup.days.length + ' day' + (signup.days.length === 1 ? '' : 's') : '—'} />
        <SummaryLine label="Roles" value={signup?.anyRole ? 'Any role needed' : signup?.roles.map((r) => VOLUNTEER_ROLE_CONFIG[r].label).join(', ') || '—'} />
        <SummaryLine label="Time of day" value={signup?.hoursPref ?? '—'} capitalize />
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
