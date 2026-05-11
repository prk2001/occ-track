import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import {
  Crown, ShieldCheck, MapPin, Church, Truck, UserCheck, ArrowRight, Sparkles,
} from 'lucide-react';
import Layout from '@/components/Layout';
import Logo from '@/components/Logo';
import BibleVerse from '@/components/BibleVerse';
import { useAuth } from '@/hooks/useAuth';
import { ROLE_CONFIG, COLLECTION_WEEK_START, COLLECTION_WEEK_END } from '@/data/mockData';
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

function formatWeek(start: string, end: string) {
  const a = new Date(start);
  const b = new Date(end);
  const month = a.toLocaleString('en-US', { month: 'long' });
  return `${month} ${a.getDate()}–${b.getDate()}, ${b.getFullYear()}`;
}

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

          {/* Editorial hero */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...heroTransition, delay: 0.1 }}
            className="text-center max-w-3xl mx-auto space-y-3"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-sp-red flex items-center justify-center gap-2">
              <Sparkles className="w-3 h-3" />
              Collection Week {new Date(COLLECTION_WEEK_START).getFullYear()}
              <Sparkles className="w-3 h-3" />
            </p>
            <h1 className="font-display text-[clamp(2.25rem,6vw,3.75rem)] font-medium text-ink leading-[1.05] tracking-tight">
              Every shoebox tells a story.
              <span className="font-display-italic block text-sp-red mt-1">Yours starts here.</span>
            </h1>
            <p className="text-base text-ink-light italic max-w-xl mx-auto leading-relaxed">
              {formatWeek(COLLECTION_WEEK_START, COLLECTION_WEEK_END)} · The official Collection Week
              companion for Samaritan’s Purse Operation Christmas Child.
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
                      {/* Subtle accent halo on hover */}
                      <div
                        className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-0 group-hover:opacity-100 blur-2xl transition-opacity pointer-events-none"
                        style={{ backgroundColor: cfg.color, opacity: 0.08 }}
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
                            style={{ color: cfg.color }}
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
