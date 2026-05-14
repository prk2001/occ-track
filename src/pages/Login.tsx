import { useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import {
  ArrowRight, Mail, Lock, LogIn, ChevronDown,
} from 'lucide-react';
import Layout from '@/components/Layout';
import { Mark } from '@/components/Logo';
import HeroVideo from '@/components/HeroVideo';
import BibleVerse from '@/components/BibleVerse';
import { useAuth } from '@/hooks/useAuth';
import { ROLE_CONFIG } from '@/data/mockData';
import type { UserRole } from '@/data/mockData';

// Demo-mode role mapping: in the prototype there's no real user database,
// so we map a few well-known seed emails to their canonical roles. In
// production this would be a server-side lookup against the users table.
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

// "Good News and Great Joy for Namibia" — currently featured on
// @OperationChristmasChild. Swap by changing this ID.
const HERO_VIDEO_ID = '69yDGFqhLJ8';

const heroTransition = { duration: 0.9, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] };

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
      {/* ─── Cinematic hero ─────────────────────────────────────────
         Full-bleed silent looping OCC mission video as the live
         background. Overlay text (logo, masthead, welcome) sits over
         a dark scrim for legibility, with a bottom gradient that
         dissolves into the cream paper for the rest of the page. */}
      <section
        className="relative min-h-[100dvh] flex items-end overflow-hidden text-bg-card"
        aria-labelledby="hero-headline"
      >
        <HeroVideo videoId={HERO_VIDEO_ID} posterAlt="Children receiving Operation Christmas Child shoeboxes" />

        {/* Atmospheric scrim — three stacked gradients:
             1. Soft dark vignette at the top so the logo + masthead read
             2. Stronger dark-to-transparent in the middle to underweight
                non-essential parts of the footage
             3. Cream-paper fade at the bottom so the video dissolves into
                the page instead of cutting hard */}
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(180deg,rgba(15,8,5,0.45)_0%,rgba(15,8,5,0.20)_28%,rgba(15,8,5,0.45)_55%,rgba(26,15,10,0.78)_82%,#FAF4E8_100%)]" />

        {/* Hero content — flexed to the bottom edge of the viewport.
             Masthead label up top (small caps), then the big welcome
             headline in Fraunces, italic pull-line in cranberry, and a
             "scroll to sign in" hint at the bottom. */}
        <div className="relative z-10 w-full max-w-3xl mx-auto px-5 sm:px-10 py-12 sm:py-14">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={heroTransition}
            className="text-center"
          >
            <div className="flex items-center justify-center gap-3 mb-5 opacity-90">
              <Mark size={36} />
              <span className="font-mast text-[10px] tracking-[0.32em] text-bg-card/85">
                Operation Christmas Child
              </span>
            </div>

            <h1
              id="hero-headline"
              className="font-display text-[44px] sm:text-[68px] leading-[0.98] tracking-[-0.02em] text-bg-card"
              style={{ textShadow: '0 2px 24px rgba(0,0,0,0.45)' }}
            >
              Welcome back,{' '}
              <span className="block">friend.</span>
            </h1>
            <p
              className="font-display-italic text-[26px] sm:text-[36px] mt-2"
              style={{ color: '#F7B8B8', textShadow: '0 2px 24px rgba(0,0,0,0.55)' }}
            >
              A child is waiting on you.
            </p>
            <p
              className="font-sans text-[15px] italic max-w-md mx-auto leading-[1.7] mt-6 text-bg-card/85"
              style={{ textShadow: '0 1px 14px rgba(0,0,0,0.6)' }}
            >
              The official tracker for Drop-off Leaders, Central Drop-off
              Leaders, and Greeters during Collection Week.
            </p>

            {/* Scroll cue */}
            <motion.a
              href="#signin"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.85 }}
              transition={{ delay: 1.2, duration: 0.8 }}
              className="inline-flex flex-col items-center gap-1 mt-10 group"
            >
              <span className="font-mast text-[9px] text-bg-card/75 group-hover:text-bg-card transition-colors">
                Sign in to continue
              </span>
              <motion.span
                animate={{ y: [0, 5, 0] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                className="text-bg-card/75 group-hover:text-bg-card transition-colors"
              >
                <ChevronDown className="w-5 h-5" aria-hidden="true" />
              </motion.span>
            </motion.a>
          </motion.div>
        </div>
      </section>

      {/* ─── Below the fold — sign in + verse on cream paper ──────── */}
      <div id="signin" className="relative px-5 sm:px-10 pt-16 pb-12 max-w-3xl mx-auto scroll-mt-4">

        {/* Bible verse */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
        >
          <BibleVerse />
        </motion.div>

        <div className="editorial-rule my-10" aria-hidden="true">
          <span className="fleuron" />
        </div>

        {/* Sign-in form */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="max-w-md mx-auto"
          aria-labelledby="signin-title"
        >
          <div className="text-center mb-6">
            <p className="font-mast text-[10px] text-ink-light">Sign in</p>
            <h2 id="signin-title" className="font-display-italic text-[28px] text-ink mt-1">
              Pick up where you left off.
            </h2>
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

          {/* Demo-role panel — prototype only */}
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

        {/* Colophon handled globally by Footer. */}
      </div>
    </Layout>
  );
}
