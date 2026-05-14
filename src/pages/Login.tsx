import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import {
  HandHeart, ArrowRight, Mail, Lock, LogIn,
} from 'lucide-react';
import Layout from '@/components/Layout';
import Logo from '@/components/Logo';
import BibleVerse from '@/components/BibleVerse';
import { useAuth } from '@/hooks/useAuth';
import { ROLE_CONFIG } from '@/data/mockData';
import type { UserRole } from '@/data/mockData';

// Demo-mode role mapping: in the prototype there's no real user database,
// so we map a few well-known seed emails to their canonical roles. In
// production this would be a server-side lookup against the users table.
// Any unrecognised email falls through to `greeter` (lowest privilege).
const DEMO_EMAIL_TO_ROLE: Record<string, UserRole> = {
  'fgraham@samaritanspurse.org': 'super_admin',
  'admin@samaritanspurse.org': 'admin',
  'regional@samaritanspurse.org': 'regional',
  'cdo@church.org': 'cdo_leader',
  'dropoff@church.org': 'do_leader',
  'greeter@church.org': 'greeter',
};

const ROLE_PREVIEWS: { role: UserRole; label: string; email: string }[] = [
  { role: 'super_admin', label: 'Super Admin', email: 'fgraham@samaritanspurse.org' },
  { role: 'admin', label: 'SP Admin', email: 'admin@samaritanspurse.org' },
  { role: 'regional', label: 'Regional Admin', email: 'regional@samaritanspurse.org' },
  { role: 'cdo_leader', label: 'CDO Leader', email: 'cdo@church.org' },
  { role: 'do_leader', label: 'Drop-off Leader', email: 'dropoff@church.org' },
  { role: 'greeter', label: 'Greeter', email: 'greeter@church.org' },
];

const heroTransition = { duration: 0.7, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] };

/**
 * Public Login page.
 *
 * Phase 37 — the role-picker grid was removed. The credentials carry the
 * role: signing in as `fgraham@samaritanspurse.org` lands you on the Super
 * Admin dashboard; signing in as `greeter@church.org` lands on the kiosk.
 * Lookup table lives at DEMO_EMAIL_TO_ROLE above.
 *
 * For prototype testing, a discreet "demo as another role" accordion sits
 * below the sign-in form so engineers can jump straight into any role
 * without typing a fake email.
 */
export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showDemo, setShowDemo] = useState(false);

  function signIn(e: React.FormEvent) {
    e.preventDefault();
    const normalized = email.trim().toLowerCase();
    if (!normalized || !password) {
      setError('Email and password are required.');
      return;
    }
    // Prototype: map known demo emails to their canonical role. In
    // production this hits the auth endpoint and the role comes back
    // from the server.
    const role = DEMO_EMAIL_TO_ROLE[normalized];
    if (!role) {
      setError(
        'No account matches that email. (Prototype tip: try one of the demo addresses below.)',
      );
      return;
    }
    login(role);
    navigate('/');
  }

  function enterAsRole(role: UserRole) {
    login(role);
    navigate('/');
  }

  return (
    <Layout hideNav>
      <div className="relative min-h-[100dvh]">
        <div className="relative px-5 sm:px-10 pt-10 pb-12 max-w-3xl mx-auto">

          {/* ─── Masthead ───────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <div className="font-mast text-[10px] text-ink-light flex items-center justify-center gap-2">
              <span className="block h-px w-10 bg-ink-light/30" />
              <span>The Tracker for Collection Week</span>
              <span className="block h-px w-10 bg-ink-light/30" />
            </div>
            <div className="flex items-center justify-center mt-5">
              <Logo size={44} />
            </div>
            <h1 className="font-display text-[44px] sm:text-[60px] text-ink leading-[0.95] tracking-[-0.02em] mt-4">
              OCC Track
            </h1>
            <p className="font-mast text-[10px] text-ink-light/80 mt-3">
              Year XXXIII &middot; Anno Domini MMXXVI &middot; Boone, North Carolina
            </p>
          </motion.div>

          <div className="editorial-rule my-10" aria-hidden="true">
            <span className="fleuron" />
          </div>

          {/* ─── Welcome ───────────────────────────────────────────── */}
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...heroTransition, delay: 0.15 }}
            className="text-center"
          >
            <h2 className="font-display text-[40px] sm:text-[56px] text-ink leading-[0.98] tracking-[-0.015em]">
              Welcome back,{' '}
              <span className="block">friend.</span>
            </h2>
            <p className="font-display-italic text-[26px] sm:text-[34px] text-sp-red leading-[1.05] mt-3">
              A child is waiting on you.
            </p>
            <p className="font-sans text-[15px] text-ink-light italic max-w-md mx-auto leading-[1.7] mt-6">
              The official tracker for Drop-off Leaders, Central Drop-off
              Leaders, and Greeters during Collection Week.
            </p>
          </motion.section>

          <div className="editorial-rule my-10" aria-hidden="true">
            <span className="fleuron" />
          </div>

          {/* ─── OCC story video ──────────────────────────────────
             The currently-featured film from the official Operation
             Christmas Child channel (@OperationChristmasChild). We
             use `youtube-nocookie.com` so YouTube doesn't drop any
             tracking cookies until the visitor presses Play — keeps
             the privacy story we tell on /privacy honest.
             `rel=0` strips related-video suggestions; `modestbranding=1`
             trims the YouTube chrome so the player feels integrated. */}
          <motion.figure
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.25, duration: 0.7, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
          >
            <div className="relative aspect-video w-full overflow-hidden rounded-md border border-border-deep/30 shadow-sm bg-ink">
              <iframe
                src="https://www.youtube-nocookie.com/embed/69yDGFqhLJ8?rel=0&modestbranding=1"
                title="Operation Christmas Child — Good News and Great Joy"
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                allowFullScreen
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>
            <figcaption className="font-mast text-[10px] text-ink-light mt-3 text-center">
              From the field &middot; Operation Christmas Child
            </figcaption>
          </motion.figure>

          <div className="editorial-rule my-10" aria-hidden="true">
            <span className="fleuron" />
          </div>

          {/* ─── Pull-quote ────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...heroTransition, delay: 0.32 }}
          >
            <BibleVerse />
          </motion.div>

          <div className="editorial-rule my-10" aria-hidden="true">
            <span className="fleuron" />
          </div>

          {/* ─── Sign-in form ──────────────────────────────────────── */}
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...heroTransition, delay: 0.4 }}
            className="max-w-md mx-auto"
            aria-labelledby="signin-title"
          >
            <div className="text-center mb-6">
              <p className="font-mast text-[10px] text-ink-light">Sign in</p>
              <h3 id="signin-title" className="font-display-italic text-[26px] text-ink mt-1">
                Pick up where you left off.
              </h3>
            </div>

            <form onSubmit={signIn} className="space-y-3">
              <label className="block">
                <span className="sr-only">Email</span>
                <span className="relative block">
                  <Mail className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-ink-light/60" aria-hidden="true" />
                  <input
                    type="email"
                    autoComplete="email"
                    placeholder="your@email.org"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(null); }}
                    className="w-full h-12 pl-11 pr-4 bg-bg-card border border-border-custom rounded-md text-base text-ink placeholder:text-ink-light/40 font-sans focus:outline-none focus:border-sp-red transition-colors"
                    aria-label="Email"
                  />
                </span>
              </label>

              <label className="block">
                <span className="sr-only">Password</span>
                <span className="relative block">
                  <Lock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-ink-light/60" aria-hidden="true" />
                  <input
                    type="password"
                    autoComplete="current-password"
                    placeholder="Your password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(null); }}
                    className="w-full h-12 pl-11 pr-4 bg-bg-card border border-border-custom rounded-md text-base text-ink placeholder:text-ink-light/40 font-sans focus:outline-none focus:border-sp-red transition-colors"
                    aria-label="Password"
                  />
                </span>
              </label>

              {error && (
                <p role="alert" className="text-[13px] text-sp-red font-sans italic">
                  {error}
                </p>
              )}

              <button
                type="submit"
                className="w-full h-12 bg-sp-red hover:bg-sp-red-dark text-bg-card font-display-italic text-[19px] rounded-md transition-colors flex items-center justify-center gap-2 mt-2"
              >
                <LogIn className="w-4 h-4" aria-hidden="true" />
                Sign in
              </button>

              <div className="flex items-center justify-between pt-1">
                <a
                  href="mailto:help@samaritanspurse.org?subject=OCC%20Track%20password%20reset"
                  className="font-mast text-[10px] text-ink-light hover:text-sp-red transition-colors"
                >
                  Forgot password?
                </a>
                <button
                  type="button"
                  onClick={() => setShowDemo((v) => !v)}
                  className="font-mast text-[10px] text-ink-light hover:text-sp-red transition-colors"
                  aria-expanded={showDemo}
                  aria-controls="demo-panel"
                >
                  {showDemo ? 'Hide demo accounts' : 'Sign in for demo'}
                </button>
              </div>
            </form>

            {/* ─── Demo-role panel (prototype only) ────────────────────
               Discreet expandable accordion that lets engineers + reviewers
               jump straight into any of the six roles without typing a
               fake email. Hidden by default; reveal via the link above. */}
            {showDemo && (
              <motion.div
                id="demo-panel"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-6 border-t border-border-deep/15 pt-6"
              >
                <p className="font-mast text-[9px] text-ink-light text-center mb-3">
                  Prototype mode &middot; sign in as any role
                </p>
                <ul className="space-y-px">
                  {ROLE_PREVIEWS.map(({ role, label, email: demoEmail }) => {
                    const cfg = ROLE_CONFIG[role];
                    return (
                      <li key={role}>
                        <button
                          type="button"
                          onClick={() => enterAsRole(role)}
                          className="group w-full text-left flex items-center justify-between gap-3 py-2.5 px-2 hover:bg-bg-warm/50 transition-colors rounded"
                        >
                          <span className="flex items-center gap-3 min-w-0">
                            <span
                              className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ backgroundColor: cfg.color }}
                              aria-hidden="true"
                            />
                            <span>
                              <span className="font-display text-[15px] text-ink leading-tight block">
                                {label}
                              </span>
                              <span className="font-sans text-[11px] text-ink-light italic truncate block">
                                {demoEmail}
                              </span>
                            </span>
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-ink-light/40 group-hover:text-sp-red group-hover:translate-x-1 transition-all shrink-0" aria-hidden="true" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <p className="font-sans text-[11px] text-ink-light italic text-center mt-3 leading-relaxed">
                  Demo accounts let reviewers exercise every role without
                  real credentials. They will be removed when real auth ships.
                </p>
              </motion.div>
            )}
          </motion.section>

          <div className="editorial-rule my-12" aria-hidden="true">
            <span className="fleuron" />
          </div>

          {/* ─── Volunteer sign-up callout ─────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.5 }}
            className="max-w-2xl mx-auto"
          >
            <Link
              to="/signup"
              className="group block bg-bg-card border-l-4 border-occ-green pl-5 pr-5 py-5 hover:bg-occ-green-light/40 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-full bg-occ-green-light flex items-center justify-center shrink-0">
                  <HandHeart className="w-5 h-5 text-occ-green-dark" aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-mast text-[10px] text-occ-green-dark">Not on a team yet?</p>
                  <p className="font-display-italic text-[20px] text-occ-green-deep leading-tight mt-1">
                    Sign up to volunteer.
                  </p>
                  <p className="font-sans text-[12px] text-ink-light mt-1 leading-relaxed">
                    Pick your days, pick your role — we&apos;ll handle the rest.
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-occ-green group-hover:translate-x-1 transition-transform shrink-0" aria-hidden="true" />
              </div>
            </Link>
          </motion.div>

          {/* Colophon (seal + tagline + address) handled globally by Footer. */}
        </div>
      </div>
    </Layout>
  );
}
