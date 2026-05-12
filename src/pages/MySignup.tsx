import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useNoIndex } from '@/hooks/useNoIndex';
import { useTranslation } from '@/lib/i18n';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck, User, Phone, Mail, MapPin, Shield, Shirt, MessageCircle,
  CheckCircle2, AlertCircle, Save, LogOut, Sparkles, Clock as ClockIcon, RefreshCw,
  Warehouse,
} from 'lucide-react';
import Layout from '@/components/Layout';
import Logo from '@/components/Logo';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { logAuditEvent } from '@/lib/auditLog';
import { buildSelfEditAlert, sendMessage } from '@/lib/outbox';
import {
  isTokenLocked,
  logSecuritySignal,
  recordTokenFailure,
  resetTokenFailures,
} from '@/lib/security';
import type { ShirtSize, StoredSignup } from '@/data/mockData';
import { getFirstName } from '@/lib/name';
import {
  DEFAULT_CDO_ID,
  defaultTokenExpiry,
  LOCATIONS,
  timeAgo,
  tokenStatus,
  TOKEN_EXTEND_THRESHOLD_DAYS,
} from '@/data/mockData';

/**
 * Volunteer self-service edit page.
 *
 * Access pattern: the volunteer arrives here via their unique magic link
 * (the URL they were shown after submitting /signup). The `?token=...`
 * query param IS the credential — possessing it grants edit rights on
 * exactly one signup record. No login, no password, no account.
 *
 * Same model Doodle/Calendly/Eventbrite use for invitee edits. Real
 * production deploy would harden this with:
 *   - HTTPS-only (cookies + Origin checks)
 *   - Token expiration (e.g. 90 days post-Collection Week)
 *   - Rate limiting to prevent brute force on the token space
 *   - Re-verification SMS for sensitive field changes (phone, email)
 * For a prototype, the bare token model is the right abstraction.
 */
export default function MySignup() {
  useNoIndex();
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [signups, setSignups] = useLocalStorage<StoredSignup[]>('occ:signups', []);
  const [saved, setSaved] = useState(false);

  // Find the signup by token. O(n) is fine — even a large CDO won't
  // exceed ~200 signups in a season.
  const signup = useMemo(() => {
    // Validate token format BEFORE doing the lookup. crypto.randomUUID
    // produces 36-char strings (e.g. "a1b2c3d4-1234-..."); our legacy
    // fallback uses "tok_<ts>_<rand>" format. Anything outside these
    // shapes is rejected — a bogus URL paste ("<script>...") never even
    // reaches the matcher. Audit P2.11.
    const TOKEN_OK = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|tok_[0-9a-z_]{12,32})$/i;
    if (!TOKEN_OK.test(token)) return undefined;
    return signups.find((s) => s.editToken && s.editToken === token);
  }, [signups, token]);

  // Live-editing local draft. Init from the matched signup or empty if no match.
  const [draft, setDraft] = useState(() =>
    signup
      ? {
          name: signup.name,
          email: signup.email,
          phone: signup.phone,
          zip: signup.zip ?? '',
          locationId: signup.locationId ?? DEFAULT_CDO_ID,
          shirtSize: signup.shirtSize as ShirtSize | '',
          emergencyName: signup.emergencyName,
          emergencyPhone: signup.emergencyPhone,
          notes: signup.notes,
        }
      : null,
  );

  // Brute-force gate: if this browser has hit too many failed token
  // lookups recently, show the lockout wall before anything else. We
  // check this BEFORE the token presence/match checks so a bot probing
  // random tokens hits the wall immediately.
  const lockout = isTokenLocked();
  if (lockout.locked) {
    return <LockoutPage secondsRemaining={lockout.secondsRemaining} />;
  }

  // No token at all — distinct from "token doesn't match anything"
  if (!token) {
    return <InvalidLinkPage reason="no-token" />;
  }
  // Token provided but didn't match — link expired or signup was deleted.
  // Each miss counts against the brute-force budget; the Nth one trips
  // the lockout for 15 minutes.
  if (!signup || !draft) {
    const tripped = recordTokenFailure();
    logSecuritySignal('invalid_token', `token-prefix=${token.slice(0, 8)}...`);
    if (tripped) {
      logSecuritySignal('token_bruteforce_lockout', 'Threshold reached; locked for 15 minutes');
    }
    return <InvalidLinkPage reason="not-found" />;
  }
  // Valid match — reset the failure counter so a typo earlier doesn't
  // keep accumulating against the next legitimate visit.
  resetTokenFailures();

  // Token matched but the timestamp says it's past its lifetime.
  const expiry = tokenStatus(signup.editTokenExpiresAt);
  if (expiry.state === 'expired') {
    return <InvalidLinkPage reason="expired" />;
  }

  function patch(p: Partial<NonNullable<typeof draft>>) {
    setDraft((d) => (d ? { ...d, ...p } : d));
  }

  function save() {
    if (!draft || !signup) return;
    const now = new Date().toISOString();
    const before = signup;
    // Sliding-window expiry: if the token is in the "expiring soon"
    // window when the volunteer comes back, push the expiry out another
    // full lifetime. Active users stay in; ghosts age out.
    const shouldExtend = expiry.state === 'expiring';
    const nextExpiry = shouldExtend ? defaultTokenExpiry(now) : signup.editTokenExpiresAt;
    setSignups((prev) =>
      prev.map((s) =>
        s.id === signup.id
          ? {
              ...s,
              name: draft.name.trim(),
              email: draft.email.trim(),
              phone: draft.phone.trim(),
              zip: draft.zip.trim() || undefined,
              locationId: draft.locationId,
              shirtSize: draft.shirtSize,
              emergencyName: draft.emergencyName.trim(),
              emergencyPhone: draft.emergencyPhone.trim(),
              notes: draft.notes.trim(),
              lastEditedAt: now,
              lastEditedBy: 'self',
              editTokenExpiresAt: nextExpiry,
            }
          : s,
      ),
    );

    // Audit trail — record what changed so leadership can see "Maria
    // updated her phone number" in the /audit-log viewer.
    const changes: string[] = [];
    if (before.name !== draft.name) changes.push('name');
    if (before.email !== draft.email) changes.push('email');
    if (before.phone !== draft.phone) changes.push('phone');
    if ((before.zip ?? '') !== draft.zip) changes.push('zip');
    if ((before.locationId ?? DEFAULT_CDO_ID) !== draft.locationId) changes.push('CDO');
    if (before.shirtSize !== draft.shirtSize) changes.push('shirt');
    if (before.emergencyName !== draft.emergencyName) changes.push('emergency name');
    if (before.emergencyPhone !== draft.emergencyPhone) changes.push('emergency phone');
    if (before.notes !== draft.notes) changes.push('notes');

    logAuditEvent(
      { id: 'volunteer-self', name: signup.name, role: 'volunteer_self' },
      'volunteer_self_edit',
      `signup:${signup.id}`,
      changes.length > 0
        ? `Updated fields: ${changes.join(', ')}`
        : 'Saved (no changes)',
    );

    // In-app notifications: when there were actual field changes, ping
    // CDO Leader + Regional Admin so they know the roster has updated info.
    // Skipped for no-op saves (e.g. user opened the page and clicked save
    // without changing anything).
    if (changes.length > 0) {
      sendMessage(buildSelfEditAlert({
        recipientUserId: 'u3',
        recipientName: 'Maria Rodriguez',
        volunteerName: signup.name,
        signupId: signup.id,
        changedFields: changes,
      }));
      sendMessage(buildSelfEditAlert({
        recipientUserId: 'u2',
        recipientName: 'David Chen',
        volunteerName: signup.name,
        signupId: signup.id,
        changedFields: changes,
      }));
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  // Track dirty state so the Save button changes appearance when there
  // are unsaved changes vs. when the draft matches the stored record.
  const dirty =
    draft.name !== signup.name ||
    draft.email !== signup.email ||
    draft.phone !== signup.phone ||
    (draft.zip || '') !== (signup.zip || '') ||
    draft.locationId !== (signup.locationId ?? DEFAULT_CDO_ID) ||
    draft.shirtSize !== signup.shirtSize ||
    draft.emergencyName !== signup.emergencyName ||
    draft.emergencyPhone !== signup.emergencyPhone ||
    draft.notes !== signup.notes;

  return (
    <Layout hideNav>
      <div className="relative min-h-[100dvh] overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-40 -left-40 w-[420px] h-[420px] rounded-full bg-occ-green/8 blur-[120px]" />
          <div className="absolute bottom-0 right-0 w-[440px] h-[440px] rounded-full bg-gold/10 blur-[120px]" />
        </div>

        <div className="relative px-5 pt-6 pb-12 max-w-2xl mx-auto">
          {/* Top bar */}
          <header className="flex items-center justify-between mb-6">
            <Link to="/" aria-label="OCC Track home"><Logo size={28} /></Link>
            <Link
              to="/"
              className="text-xs text-ink-light hover:text-sp-red flex items-center gap-1 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Done
            </Link>
          </header>

          {/* Hero */}
          <div className="space-y-2 mb-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-occ-green flex items-center gap-1.5">
              <ShieldCheck className="w-3 h-3" />
              {t('mysignup.kicker')}
            </p>
            <h1 className="font-display text-3xl sm:text-4xl text-ink leading-[1.05] tracking-tight">
              {t('mysignup.welcome', { name: signup.name ? `, ${getFirstName(signup.name)}` : '' })}
              <span className="font-display-italic block text-occ-green mt-1">
                {t('mysignup.subtitle')}
              </span>
            </h1>
            <p className="text-sm text-ink-light italic">
              {t('mysignup.body')} {timeAgo(signup.submittedAt)}
              {signup.lastEditedAt && signup.lastEditedAt !== signup.submittedAt
                ? ` · last updated ${timeAgo(signup.lastEditedAt)}`
                : ''}.
            </p>
          </div>

          {/* Saved flash */}
          <AnimatePresence>
            {saved && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-occ-green-light border border-occ-green rounded-xl px-4 py-3 mb-4 flex items-center gap-2.5"
              >
                <CheckCircle2 className="w-5 h-5 text-occ-green shrink-0" />
                <p className="text-sm text-occ-green-dark font-semibold">
                  {t('mysignup.saved')}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Expiring-soon warning. Only shown when the token is inside the
              extend-threshold window. Saving auto-extends the link, so we
              steer the user toward the Save button. */}
          {expiry.state === 'expiring' && (
            <div className="bg-gold-light border border-gold rounded-xl px-4 py-3 mb-4 flex items-start gap-2.5">
              <ClockIcon className="w-5 h-5 text-gold shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-ink font-semibold">
                  Your edit link expires in {expiry.daysLeft} {expiry.daysLeft === 1 ? 'day' : 'days'}.
                </p>
                <p className="text-xs text-ink-light italic mt-0.5">
                  Save any change below to extend it another {TOKEN_EXTEND_THRESHOLD_DAYS}+ days.
                  After that you&apos;d need to ask your CDO Leader for a fresh link.
                </p>
              </div>
              <RefreshCw className="w-4 h-4 text-gold/60 shrink-0 mt-0.5" />
            </div>
          )}

          {/* Edit form */}
          <div className="bg-bg-card rounded-2xl shadow-card border border-border-custom p-5 space-y-4">
            <Field
              label="Your name"
              icon={<User className="w-4 h-4" />}
              value={draft.name}
              onChange={(v) => patch({ name: v })}
              placeholder="First and last"
            />
            <Field
              label="Email"
              icon={<Mail className="w-4 h-4" />}
              value={draft.email}
              onChange={(v) => patch({ email: v })}
              placeholder="you@email.com"
              type="email"
            />
            <Field
              label="Phone"
              icon={<Phone className="w-4 h-4" />}
              value={draft.phone}
              onChange={(v) => patch({ phone: v })}
              placeholder="(404) 555-0101"
              type="tel"
            />
            <Field
              label="ZIP code (optional)"
              icon={<MapPin className="w-4 h-4" />}
              value={draft.zip}
              onChange={(v) => patch({ zip: v.replace(/[^\d]/g, '').slice(0, 5) })}
              placeholder="30301"
              mono
            />

            {/* Central Drop-off picker — defaults to whatever ZIP-inference
                routed them to at signup time. Volunteer can change to any
                active CDO if our guess was wrong. */}
            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink-light mb-1.5 flex items-center gap-1.5">
                <Warehouse className="w-4 h-4 text-ink-light/60" />
                Where you&apos;re serving
              </span>
              <select
                value={draft.locationId}
                onChange={(e) => patch({ locationId: e.target.value })}
                className="w-full h-12 px-4 bg-bg-primary border border-border-custom rounded-xl text-base text-ink focus:outline-none focus:border-sp-red transition-colors"
              >
                {LOCATIONS.filter((l) => l.type === 'central' && l.status === 'active').map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} — {l.city}, {l.state}
                  </option>
                ))}
              </select>
            </label>

            <div className="pt-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-ink-light mb-2 flex items-center gap-1.5">
                <Shirt className="w-3 h-3" /> T-shirt size
              </p>
              <div className="grid grid-cols-5 gap-1.5">
                {(['S', 'M', 'L', 'XL', 'XXL'] as ShirtSize[]).map((sz) => (
                  <button
                    key={sz}
                    onClick={() => patch({ shirtSize: draft.shirtSize === sz ? '' : sz })}
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

            <div className="space-y-3 pt-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-ink-light flex items-center gap-1.5">
                <Shield className="w-3 h-3" /> Emergency contact
              </p>
              <Field
                label="Name"
                value={draft.emergencyName}
                onChange={(v) => patch({ emergencyName: v })}
                placeholder="Someone we can reach in an emergency"
              />
              <Field
                label="Phone"
                type="tel"
                value={draft.emergencyPhone}
                onChange={(v) => patch({ emergencyPhone: v })}
                placeholder="(404) 555-0101"
              />
            </div>

            <div className="pt-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-ink-light mb-1.5 flex items-center gap-1.5">
                <MessageCircle className="w-3 h-3" /> Notes for your team lead
              </p>
              <textarea
                value={draft.notes}
                onChange={(e) => patch({ notes: e.target.value })}
                rows={3}
                placeholder="Bringing my kids · I have a van for transport · I'm available for setup the day before · ..."
                className="w-full px-4 py-3 bg-bg-primary border border-border-custom rounded-xl text-sm text-ink placeholder:text-ink-light/60 focus:outline-none focus:border-sp-red transition-colors resize-none"
              />
            </div>
          </div>

          <button
            onClick={save}
            disabled={!dirty}
            className={`w-full h-14 mt-5 text-white text-base font-semibold rounded-2xl flex items-center justify-center gap-2 transition-colors shadow-card ${
              dirty
                ? 'bg-occ-green hover:bg-occ-green-dark'
                : 'bg-ink-light/40 cursor-default'
            }`}
          >
            <Save className="w-5 h-5" />
            {dirty ? t('mysignup.save') : t('mysignup.nothingToSave')}
          </button>

          <p className="text-[11px] text-ink-light italic text-center mt-3 max-w-sm mx-auto">
            {t('mysignup.disclaimer')}
          </p>
        </div>
      </div>
    </Layout>
  );
}

// ─── Lockout page ─────────────────────────────────────────────────────────
// Shown when a browser has tripped the magic-link brute-force threshold.
// Friendly tone (we don't want to scare off a legitimate confused user)
// but firm — no retry button, no refresh shortcut. They wait it out.
function LockoutPage({ secondsRemaining }: { secondsRemaining: number }) {
  const { t, locale } = useTranslation();
  const minutes = Math.ceil(secondsRemaining / 60);
  // Localized pluralization. Our minimal i18n doesn't have plural rules,
  // so we resolve the word here based on locale.
  const minutesWord = locale === 'es'
    ? (minutes === 1 ? 'minuto' : 'minutos')
    : (minutes === 1 ? 'minute' : 'minutes');
  return (
    <Layout hideNav>
      <div className="relative min-h-[100dvh]">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[420px] h-[420px] rounded-full bg-sp-red/8 blur-[120px]" />
        </div>
        <div className="relative px-5 pt-12 pb-12 max-w-md mx-auto text-center">
          <Logo size={32} className="mx-auto mb-8" />
          <div className="w-16 h-16 mx-auto bg-sp-red-light rounded-full flex items-center justify-center mb-4">
            <ClockIcon className="w-8 h-8 text-sp-red" />
          </div>
          <h1 className="font-display text-3xl text-ink leading-[1.1] tracking-tight">
            {t('lockout.title')}
            <span className="font-display-italic block text-sp-red mt-1">
              {t('lockout.subtitle')}
            </span>
          </h1>
          <p className="text-sm text-ink-light mt-4 italic leading-relaxed">
            {t('lockout.body', { minutes, minutesWord })}
          </p>
          <p className="text-xs text-ink-light/60 italic mt-6 leading-relaxed">
            {t('lockout.contact')}
          </p>
        </div>
      </div>
    </Layout>
  );
}

// ─── Invalid link page ────────────────────────────────────────────────────
function InvalidLinkPage({ reason }: { reason: 'no-token' | 'not-found' | 'expired' }) {
  const [signups] = useLocalStorage<StoredSignup[]>('occ:signups', []);
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const headline = {
    'no-token': 'Link missing.',
    'not-found': 'Link expired.',
    'expired': 'Link expired.',
  }[reason];
  const subhead = {
    'no-token': "We'll send you a fresh one.",
    'not-found': 'Or your signup was removed.',
    'expired': 'Time to get a fresh one.',
  }[reason];
  const body = {
    'no-token':
      'Enter the email you used when you signed up. We will send you your personal edit link.',
    'not-found':
      'The link you used no longer matches an active signup. If you think this is a mistake, contact your Central Drop-off Leader.',
    'expired':
      'For security, edit links expire 90 days after Collection Week ends. Enter your email and we will issue a fresh link — or you can sign up again if your info needs a full refresh.',
  }[reason];

  async function resendLink() {
    setError(null);
    // Rate limit: at most 1 resend per 30s per browser. Without this an
    // attacker who finds /my-signup could flood any known email by spamming
    // this form. Audit P1.31.
    const RESEND_KEY = 'occ:last-resend-ts';
    const last = parseInt(window.localStorage.getItem(RESEND_KEY) ?? '0', 10);
    const elapsed = (Date.now() - last) / 1000;
    if (Number.isFinite(elapsed) && elapsed < 30) {
      setError(`Please wait ${Math.ceil(30 - elapsed)}s before requesting another link.`);
      return;
    }
    const normalized = email.trim().toLowerCase();
    if (!normalized || !normalized.includes('@')) {
      setError('Please enter the email you used at signup.');
      return;
    }
    window.localStorage.setItem(RESEND_KEY, String(Date.now()));
    const match = signups.find((s) => s.email.trim().toLowerCase() === normalized);
    if (!match || !match.editToken) {
      // For privacy, we DON'T tell the user whether the email matches.
      // Same UI either way — bots can't enumerate accounts via this form.
      setSent(true);
      logSecuritySignal('invalid_token', `Resend requested for non-matching email`);
      return;
    }
    const origin =
      typeof window !== 'undefined'
        ? window.location.origin + window.location.pathname.replace(/\/$/, '')
        : '';
    const url = `${origin}#/my-signup?token=${match.editToken}`;
    sendMessage({
      kind: 'signup_confirmation',
      channel: 'email',
      to: match.email,
      toName: match.name,
      subject: 'Your edit link — Operation Christmas Child',
      body: `Hi ${getFirstName(match.name)},\n\nHere's your edit link for your Collection Week 2026 signup:\n\n${url}\n\nThis link is private — anyone with it can edit your signup.\n\nSamaritan's Purse · Operation Christmas Child`,
      relatedTarget: `signup:${match.id}`,
    });
    setSent(true);
  }

  return (
    <Layout hideNav>
      <div className="relative min-h-[100dvh]">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[420px] h-[420px] rounded-full bg-sp-red/6 blur-[120px]" />
        </div>
        <div className="relative px-5 pt-12 pb-12 max-w-md mx-auto text-center">
          <Logo size={32} className="mx-auto mb-8" />
          <div className="w-16 h-16 mx-auto bg-sp-red-light rounded-full flex items-center justify-center mb-4">
            {reason === 'expired' ? (
              <ClockIcon className="w-8 h-8 text-sp-red" />
            ) : (
              <AlertCircle className="w-8 h-8 text-sp-red" />
            )}
          </div>
          <h1 className="font-display text-3xl text-ink leading-[1.1] tracking-tight">
            {headline}
            <span className="font-display-italic block text-sp-red mt-1">{subhead}</span>
          </h1>
          <p className="text-sm text-ink-light mt-4 italic leading-relaxed">{body}</p>

          {/* Resend-link form (no-token + expired cases). For not-found we
              skip the form — the signup itself is gone, nothing to resend. */}
          {(reason === 'no-token' || reason === 'expired') && (
            <div className="mt-6 text-left">
              {sent ? (
                <div className="bg-occ-green-light border border-occ-green rounded-xl px-4 py-4 flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-occ-green shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-occ-green-dark">
                      If that email matches a signup, your link is on its way.
                    </p>
                    <p className="text-xs text-ink-light italic mt-1">
                      Check your inbox in a few minutes. Look for a message from
                      &quot;Operation Christmas Child.&quot;
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <label className="block">
                    <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink-light mb-1.5 flex items-center gap-1.5">
                      <Mail className="w-3 h-3" />
                      Email you used at signup
                    </span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@email.com"
                      autoFocus
                      className="w-full h-12 px-4 bg-bg-primary border border-border-custom rounded-xl text-base text-ink placeholder:text-ink-light/50 focus:outline-none focus:border-sp-red transition-colors"
                    />
                  </label>
                  {error && (
                    <p className="text-xs text-sp-red font-semibold mt-2 flex items-center gap-1.5">
                      <AlertCircle className="w-3 h-3" />
                      {error}
                    </p>
                  )}
                  <button
                    onClick={resendLink}
                    disabled={!email}
                    className="w-full h-12 mt-3 bg-occ-green text-white text-sm font-semibold rounded-xl hover:bg-occ-green-dark transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Mail className="w-4 h-4" />
                    Email me my link
                  </button>
                </>
              )}
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-border-custom/60">
            <p className="text-xs text-ink-light italic mb-2">Never signed up before?</p>
            <Link
              to="/signup"
              className="inline-flex h-12 px-5 bg-sp-red text-white text-sm font-semibold rounded-xl items-center justify-center hover:bg-sp-red-dark transition-colors gap-1.5"
            >
              <Sparkles className="w-4 h-4" />
              Sign up fresh
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}

// ─── Field primitive (mirrors VolunteerSignup pattern) ────────────────────
function Field({
  label, icon, value, onChange, placeholder, type, mono,
}: {
  label: string;
  icon?: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: 'text' | 'tel' | 'email';
  mono?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink-light mb-1.5 flex items-center gap-1.5">
        {icon && <span className="text-ink-light/60">{icon}</span>}
        {label}
      </span>
      <input
        type={type ?? 'text'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full h-12 px-4 bg-bg-primary border border-border-custom rounded-xl text-base text-ink placeholder:text-ink-light/50 focus:outline-none focus:border-sp-red transition-colors ${mono ? 'font-mono tabular-nums' : ''}`}
      />
    </label>
  );
}
