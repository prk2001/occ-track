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

const ROLE_CARDS: RoleCard[] = [
  { role: 'super_admin', icon: Crown, one: 'National HQ', two: 'See every state and trailer' },
  { role: 'admin', icon: ShieldCheck, one: 'Samaritan’s Purse', two: 'Oversight + region coordination' },
  { role: 'regional', icon: MapPin, one: 'Regional Office', two: 'Your region’s CDOs' },
  { role: 'cdo_leader', icon: Church, one: 'Central Drop-off', two: 'Pack, label, ship' },
  { role: 'do_leader', icon: Truck, one: 'Drop-off Location', two: 'Daily totals + transfer' },
  { role: 'greeter', icon: UserCheck, one: 'Greeter', two: 'Count boxes at the door' },
];

const heroTransition = { duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] };

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  function enter(role: UserRole) {
    login(role);
    navigate('/');
  }

  return (
    <Layout hideNav>
      <div className="relative min-h-[100dvh] overflow-hidden">
        {/* Atmospheric background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 -left-32 w-[420px] h-[420px] rounded-full bg-sp-red/8 blur-[120px]" />
          <div className="absolute top-1/3 -right-32 w-[440px] h-[440px] rounded-full bg-occ-green/8 blur-[120px]" />
          <div className="absolute bottom-0 left-1/3 w-[360px] h-[360px] rounded-full bg-gold/8 blur-[120px]" />
        </div>

        <div className="relative px-4 sm:px-8 pt-10 pb-8 max-w-6xl mx-auto">
          {/* Brand mark */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={heroTransition}
            className="flex items-center justify-center mb-8"
          >
            <Logo size={42} />
          </motion.div>

          {/* Official NCW campaign banner — replaces the hand-drawn shoebox.
              Clicks through to /signup since the banner's built-in "Pack a
              Shoebox" CTA is the natural conversion path for visitors. */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.05, duration: 0.7, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
            className="max-w-3xl mx-auto"
          >
            <Link
              to="/signup"
              aria-label="Sign up for Collection Week"
              className="block rounded-3xl overflow-hidden shadow-card-elevated border border-border-warm hover:shadow-xl transition-shadow"
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

          {/* Warm welcome — secondary copy under the banner */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...heroTransition, delay: 0.15 }}
            className="text-center max-w-3xl mx-auto space-y-3 mt-8"
          >
            <h1 className="font-display text-[clamp(1.75rem,5vw,2.75rem)] font-medium text-ink leading-[1.05] tracking-tight">
              Welcome back, friend.
              <span className="font-display-italic block text-sp-red mt-1">A child is waiting on you.</span>
            </h1>
            <p className="text-base text-ink-light italic max-w-xl mx-auto leading-relaxed">
              The official tracker for Drop-off Leaders, Central Drop-off Leaders,
              and Greeters during Collection Week.
            </p>
          </motion.section>

          {/* Pull-quote */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...heroTransition, delay: 0.2 }}
            className="max-w-2xl mx-auto mt-10"
          >
            <BibleVerse />
          </motion.div>

          {/* Role selection */}
          <div className="mt-10 max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-4">
              <span className="h-px flex-1 bg-border-warm" />
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-ink-light">
                Choose Your Role to Continue
              </span>
              <span className="h-px flex-1 bg-border-warm" />
            </div>
            <motion.ul
              initial="hidden"
              animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05, delayChildren: 0.3 } } }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
            >
              {ROLE_CARDS.map(({ role, icon: Icon, one, two }) => {
                const cfg = ROLE_CONFIG[role];
                return (
                  <motion.li
                    key={role}
                    variants={{
                      hidden: { opacity: 0, y: 12 },
                      show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
                    }}
                  >
                    <button
                      onClick={() => enter(role)}
                      className="group relative w-full text-left bg-bg-card rounded-2xl border border-border-custom p-5 hover:border-sp-red hover:shadow-card-elevated transition-all overflow-hidden"
                    >
                      {/* Subtle accent halo on hover. Inline `opacity: 0.08`
                          previously overrode the tailwind `opacity-0` (inline
                          CSS wins specificity), leaving the halo dimly visible
                          at rest — which axe-core then counted against the
                          card's effective text-contrast. Moved opacity into
                          the hover state only so resting cards have pure
                          white backgrounds for AA conformance. */}
                      <div
                        className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-0 group-hover:opacity-[0.08] blur-2xl transition-opacity pointer-events-none"
                        style={{ backgroundColor: cfg.color }}
                      />
                      <div className="relative flex items-start gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                          style={{ backgroundColor: cfg.bgColor, color: cfg.color }}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className="text-[10px] font-bold uppercase tracking-[0.18em] mb-1"
                            // textColor (not color) — AA-compliant darker variant
                            // for small text on white. cfg.color stays bright on
                            // the icon dot above where the tinted background lifts
                            // contrast back into AA territory.
                            style={{ color: cfg.textColor }}
                          >
                            {cfg.label}
                          </p>
                          <p className="font-display text-lg font-medium text-ink leading-tight">{one}</p>
                          <p className="text-xs text-ink-light mt-1">{two}</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-ink-light/40 group-hover:text-sp-red group-hover:translate-x-1 transition-all shrink-0 mt-1" />
                      </div>
                    </button>
                  </motion.li>
                );
              })}
            </motion.ul>
          </div>

          {/* Sign up to volunteer (pre-Collection Week recruiting) */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="mt-10 max-w-2xl mx-auto"
          >
            <Link
              to="/signup"
              className="group flex items-center gap-4 bg-lime hover:bg-lime-dark transition-colors rounded-2xl px-5 py-5 shadow-card"
            >
              <div className="w-12 h-12 rounded-2xl bg-white/40 flex items-center justify-center shrink-0">
                <HandHeart className="w-6 h-6 text-occ-green-dark" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-occ-green-dark mb-0.5">Not on a team yet?</p>
                <p className="font-display text-lg leading-tight text-occ-green-dark group-hover:text-white">
                  Sign up to volunteer this Collection Week
                </p>
                <p className="text-[11px] text-occ-green-dark/80 group-hover:text-white/80 mt-0.5">
                  Pick your days, pick your role — we&apos;ll handle the rest.
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-occ-green-dark flex items-center justify-center shrink-0 group-hover:translate-x-1 transition-transform">
                <ArrowRight className="w-5 h-5 text-white" />
              </div>
            </Link>
          </motion.div>

          {/* Footer ribbon */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="text-center mt-12 text-[10px] uppercase tracking-[0.25em] text-ink-light"
          >
            © Samaritan’s Purse · In Jesus’ Name.
          </motion.p>
        </div>
      </div>
    </Layout>
  );
}
