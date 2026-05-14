import { Link, useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import {
  Crown, ShieldCheck, MapPin, Church, Truck, UserCheck, ArrowRight, HandHeart,
} from 'lucide-react';
import Layout from '@/components/Layout';
import Logo from '@/components/Logo';
import BibleVerse from '@/components/BibleVerse';
import { useAuth } from '@/hooks/useAuth';
import { ROLE_CONFIG } from '@/data/mockData';
import type { UserRole } from '@/data/mockData';

interface RoleCard {
  role: UserRole;
  icon: typeof Crown;
  one: string;
  two: string;
}

// Hand-ordered. The Roman numerals make this read like a printed
// table of contents, not a SaaS grid.
const ROLE_CARDS: RoleCard[] = [
  { role: 'super_admin', icon: Crown, one: 'National HQ', two: 'See every state and trailer.' },
  { role: 'admin', icon: ShieldCheck, one: 'Samaritan’s Purse', two: 'Oversight + region coordination.' },
  { role: 'regional', icon: MapPin, one: 'Regional Office', two: 'Your region’s CDOs.' },
  { role: 'cdo_leader', icon: Church, one: 'Central Drop-off', two: 'Pack, label, ship.' },
  { role: 'do_leader', icon: Truck, one: 'Drop-off Location', two: 'Daily totals + transfer.' },
  { role: 'greeter', icon: UserCheck, one: 'Greeter', two: 'Count boxes at the door.' },
];

const ROMAN = ['I.', 'II.', 'III.', 'IV.', 'V.', 'VI.'];

const heroTransition = { duration: 0.7, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] };

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  function enter(role: UserRole) {
    login(role);
    navigate('/');
  }

  return (
    <Layout hideNav>
      <div className="relative min-h-[100dvh]">
        <div className="relative px-5 sm:px-10 pt-10 pb-12 max-w-3xl mx-auto">

          {/* ─── Masthead ─────────────────────────────────────────────
             Editorial page-top mark. Stamps the page like the
             masthead of a quarterly journal — establishes that this
             is a tradition, not a SaaS dashboard.                       */}
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

          {/* Fleuron section break */}
          <div className="editorial-rule my-10" aria-hidden="true">
            <span className="fleuron" />
          </div>

          {/* ─── Welcome — editorial hero ──────────────────────────── */}
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

          {/* Bible verse — left-margin pull quote treatment */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...heroTransition, delay: 0.22 }}
            className="mt-10"
          >
            <BibleVerse />
          </motion.div>

          {/* Fleuron section break */}
          <div className="editorial-rule my-10" aria-hidden="true">
            <span className="fleuron" />
          </div>

          {/* ─── NCW banner (kept — it's the real SP marketing asset) ─
             Framed with a hairline brown border so it reads as a
             "poster pinned to the page" rather than an embedded ad. */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.7, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
            className="mx-auto"
          >
            <Link
              to="/signup"
              aria-label="Sign up for Collection Week"
              className="block rounded-md overflow-hidden border border-border-deep/30 hover:border-border-deep/60 transition-colors shadow-sm"
            >
              <img
                src="/images/ncw-banner-social.png"
                alt="National Collection Week, November 16–23, 2026 — Pack a Shoebox"
                className="w-full h-auto block"
                width={1080}
                height={566}
                loading="eager"
              />
            </Link>
          </motion.div>

          {/* Fleuron section break */}
          <div className="editorial-rule my-12" aria-hidden="true">
            <span className="fleuron" />
          </div>

          {/* ─── Role selection ────────────────────────────────────── */}
          <div>
            <div className="text-center mb-6">
              <p className="font-mast text-[10px] text-ink-light">
                Choose your role to continue
              </p>
              <h3 className="font-display-italic text-[22px] sm:text-[26px] text-ink mt-1">
                Six ways to serve.
              </h3>
            </div>

            <motion.ul
              initial="hidden"
              animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04, delayChildren: 0.35 } } }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-0 border-t border-border-deep/20"
            >
              {ROLE_CARDS.map(({ role, icon: Icon, one, two }, idx) => {
                const cfg = ROLE_CONFIG[role];
                return (
                  <motion.li
                    key={role}
                    variants={{
                      hidden: { opacity: 0, y: 8 },
                      show: { opacity: 1, y: 0, transition: { duration: 0.45 } },
                    }}
                    className="border-b border-border-deep/20"
                  >
                    <button
                      onClick={() => enter(role)}
                      className="group w-full text-left flex items-baseline gap-4 py-5 transition-colors hover:bg-bg-warm/40"
                    >
                      {/* Roman numeral — the editorial signature.
                          Deep cranberry, oldstyle weight, sized to compete
                          with the role name — the numeral and the name are
                          both equal players in this directory listing. */}
                      <span
                        className="font-display text-[34px] text-sp-red leading-none tabular-nums shrink-0 w-12"
                        style={{ fontVariationSettings: '"opsz" 144, "SOFT" 100, "WONK" 0' }}
                      >
                        {ROMAN[idx]}
                      </span>

                      <div className="flex-1 min-w-0">
                        <p className="font-mast text-[9px] text-ink-light leading-none" style={{ color: cfg.textColor, letterSpacing: '0.22em' }}>
                          {cfg.label}
                        </p>
                        <p className="font-display text-[22px] text-ink leading-tight mt-1.5">
                          {one}
                        </p>
                        <p className="font-sans text-[13px] text-ink-light italic mt-0.5">
                          {two}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Icon className="w-4 h-4 text-ink-light/60 group-hover:text-sp-red transition-colors" aria-hidden="true" />
                        <ArrowRight className="w-4 h-4 text-ink-light/30 group-hover:text-sp-red group-hover:translate-x-1 transition-all" aria-hidden="true" />
                      </div>
                    </button>
                  </motion.li>
                );
              })}
            </motion.ul>
          </div>

          {/* Fleuron section break */}
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
