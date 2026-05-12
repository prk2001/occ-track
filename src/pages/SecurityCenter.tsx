import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { motion } from 'framer-motion';
import {
  ShieldAlert, Bug, Bot, Eye, Lock, ArrowLeft, Search, Filter, ChevronRight,
  AlertTriangle, CheckCircle2, Clock as ClockIcon, Globe, ServerCrash, Zap,
} from 'lucide-react';
import Layout from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useNoIndex } from '@/hooks/useNoIndex';
import {
  SECURITY_LOG_KEY,
} from '@/lib/security';
import type { SecuritySignal, SecuritySignalKind } from '@/lib/security';
import { timeAgo } from '@/data/mockData';

/**
 * Security Center — Super Admin only.
 *
 * Three sections:
 *   1. Live security signals (honeypot trips, throttle hits, etc.)
 *   2. Threat summary (per-origin rollup; 1 persistent bot vs 1000 distributed)
 *   3. Production-hardening checklist (what to add when you graduate from
 *      the prototype to a real deploy with a backend)
 *
 * The hardening checklist is the most important piece — it tells the future
 * operator that frontend gates are NOT a security boundary, and what real
 * security looks like (CSP, server-side rate limits, CAPTCHA, etc.).
 */
export default function SecurityCenter() {
  useNoIndex();
  const { isSuperAdmin } = useAuth();
  const [signals] = useLocalStorage<SecuritySignal[]>(SECURITY_LOG_KEY, []);
  const [query, setQuery] = useState('');
  const [kindFilter, setKindFilter] = useState<SecuritySignalKind | 'all'>('all');

  const filtered = useMemo(() => {
    return signals
      .filter((s) => kindFilter === 'all' || s.kind === kindFilter)
      .filter((s) => {
        const q = query.trim().toLowerCase();
        if (!q) return true;
        return [s.kind, s.details, s.origin].some((f) => f?.toLowerCase().includes(q));
      });
  }, [signals, kindFilter, query]);

  const countsByKind = useMemo(() => {
    const m = new Map<SecuritySignalKind, number>();
    signals.forEach((s) => m.set(s.kind, (m.get(s.kind) ?? 0) + 1));
    return m;
  }, [signals]);

  const originRollup = useMemo(() => {
    const m = new Map<string, { count: number; kinds: Set<SecuritySignalKind>; lastSeen: string }>();
    for (const s of signals) {
      const key = s.origin ?? 'unknown';
      const existing = m.get(key);
      if (existing) {
        existing.count += 1;
        existing.kinds.add(s.kind);
        if (s.timestamp > existing.lastSeen) existing.lastSeen = s.timestamp;
      } else {
        m.set(key, { count: 1, kinds: new Set([s.kind]), lastSeen: s.timestamp });
      }
    }
    return Array.from(m.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10);
  }, [signals]);

  if (!isSuperAdmin) {
    return (
      <Layout>
        <div className="px-4 py-12 max-w-2xl mx-auto">
          <div className="bg-bg-card rounded-2xl border border-border-custom p-8 text-center">
            <Lock className="w-10 h-10 text-sp-red mx-auto mb-3" />
            <h1 className="font-display text-2xl text-ink">Super Admin only.</h1>
            <p className="text-sm text-ink-light mt-2 italic max-w-md mx-auto">
              The security center shows defense signals (honeypot trips, brute-force
              attempts, throttle hits). Access is restricted to national HQ.
            </p>
            <Link
              to="/"
              className="inline-flex h-11 px-5 mt-6 bg-sp-red text-white text-sm font-semibold rounded-xl items-center justify-center hover:bg-sp-red-dark transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Back to Dashboard
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="px-4 py-4 max-w-5xl mx-auto space-y-6 pb-24">
        <header className="flex items-start justify-between gap-3">
          <div className="space-y-2 pt-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-sp-red flex items-center gap-1.5">
              <ShieldAlert className="w-3 h-3" />
              Security Center
            </p>
            <h1 className="font-display text-3xl sm:text-4xl text-ink leading-[1.05] tracking-tight">
              What we caught.
              <span className="font-display-italic block text-sp-red mt-1">
                {signals.length} {signals.length === 1 ? 'signal' : 'signals'} since launch.
              </span>
            </h1>
            <p className="text-sm text-ink-light italic">
              Honeypot trips, throttle hits, brute-force lockouts, PII reveals.
            </p>
          </div>
          <span className="text-[10px] font-bold text-sp-red bg-sp-red-light px-2 py-1 rounded-full uppercase tracking-wider whitespace-nowrap shrink-0 mt-1">
            Super Admin Only
          </span>
        </header>

        {/* Hard truth callout */}
        <div className="bg-sp-red-light border border-sp-red rounded-xl p-4 flex items-start gap-3">
          <ServerCrash className="w-5 h-5 text-sp-red shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-ink">
              Frontend defenses are layered theater, not a wall.
            </p>
            <p className="text-xs text-ink-light italic mt-1 leading-relaxed">
              Everything below detects and slows <em>opportunistic</em> bots and
              scrapers. A motivated attacker with devtools bypasses it in seconds.
              Production needs real server-side controls — see the hardening
              checklist at the bottom.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatTile icon={Bot} label="Honeypot trips" value={String(countsByKind.get('honeypot_filled') ?? 0)} bg="bg-gold-light" color="text-gold" />
          <StatTile icon={Zap} label="Too-fast submits" value={String(countsByKind.get('submit_too_fast') ?? 0)} bg="bg-blue-light" color="text-blue-accent" />
          <StatTile icon={ClockIcon} label="Throttled" value={String(countsByKind.get('signup_throttled') ?? 0)} bg="bg-purple-light" color="text-purple-accent" />
          <StatTile icon={Bug} label="Bad tokens" value={String((countsByKind.get('invalid_token') ?? 0) + (countsByKind.get('token_bruteforce_lockout') ?? 0))} bg="bg-sp-red-light" color="text-sp-red" />
        </div>

        {originRollup.length > 0 && (
          <section className="bg-bg-card rounded-2xl border border-border-custom p-5">
            <header className="mb-3">
              <h2 className="font-display text-lg text-ink flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-accent" />
                Top origins
              </h2>
              <p className="text-[11px] text-ink-light italic mt-0.5">
                Same browser id appearing repeatedly suggests a single persistent bot;
                many distinct origins suggest a distributed attack.
              </p>
            </header>
            <ul className="divide-y divide-border-custom/60">
              {originRollup.map(([origin, info]) => (
                <li key={origin} className="flex items-center gap-3 py-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-light flex items-center justify-center shrink-0">
                    <span className="text-[9px] font-mono text-blue-accent">{origin.slice(0, 4)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-ink font-mono truncate">{origin}</p>
                    <p className="text-[10px] text-ink-light italic">
                      {Array.from(info.kinds).join(', ')} · last seen {timeAgo(info.lastSeen)}
                    </p>
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full whitespace-nowrap ${
                    info.count > 10
                      ? 'bg-sp-red-light text-sp-red'
                      : info.count > 3
                      ? 'bg-gold-light text-gold'
                      : 'bg-bg-primary text-ink-light'
                  }`}>
                    {info.count} {info.count === 1 ? 'hit' : 'hits'}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-light/60 pointer-events-none" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by kind, details, origin…"
                className="w-full h-10 pl-10 pr-3 bg-bg-card border border-border-custom rounded-xl text-sm focus:outline-none focus:border-sp-red transition-colors"
              />
            </div>
          </div>
          {signals.length > 0 && (
            <div className="mt-3 flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-ink-light flex items-center gap-1 shrink-0 mr-1">
                <Filter className="w-3 h-3" /> Kind
              </span>
              <FilterChip active={kindFilter === 'all'} onClick={() => setKindFilter('all')} label={`All (${signals.length})`} />
              {Array.from(countsByKind.entries())
                .sort((a, b) => b[1] - a[1])
                .map(([kind, count]) => (
                  <FilterChip key={kind} active={kindFilter === kind} onClick={() => setKindFilter(kind)} label={`${kindLabel(kind)} (${count})`} />
                ))}
            </div>
          )}
        </section>

        {signals.length === 0 ? (
          <div className="bg-bg-card rounded-2xl border border-border-custom p-10 text-center">
            <CheckCircle2 className="w-10 h-10 text-occ-green mx-auto mb-3" />
            <p className="font-display text-base text-ink mb-1">All quiet.</p>
            <p className="text-xs text-ink-light italic max-w-sm mx-auto">
              No security signals on record. When a bot trips the honeypot or
              a magic link gets brute-forced, the event will appear here.
            </p>
          </div>
        ) : (
          <motion.ul
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.02 } } }}
            className="space-y-2"
          >
            {filtered.map((signal) => (
              <SignalRow key={signal.id} signal={signal} />
            ))}
            {filtered.length === 0 && (
              <li className="bg-bg-card rounded-2xl border border-border-custom p-6 text-center">
                <p className="text-sm text-ink-light italic">No signals match your filter.</p>
              </li>
            )}
          </motion.ul>
        )}

        <section className="bg-bg-card rounded-2xl border border-border-custom p-5 mt-8">
          <header className="mb-3">
            <h2 className="font-display text-lg text-ink flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-sp-red" />
              Production hardening checklist
            </h2>
            <p className="text-[11px] text-ink-light italic mt-0.5">
              What to add when you graduate from this prototype to a real
              deploy with a backend.
            </p>
          </header>
          <ul className="space-y-3 text-sm">
            <Hardening status="missing" title="Real CAPTCHA on /signup">
              Wire Cloudflare Turnstile or hCaptcha. Token verification on the
              server (not just the client) — the current honeypot is the
              minimum, not the maximum.
            </Hardening>
            <Hardening status="missing" title="Server-side rate limits">
              Per-IP + per-account: signup form (5/hour/IP), magic link lookups
              (10/minute/IP). Cloudflare WAF or middleware on the API gateway.
            </Hardening>
            <Hardening status="missing" title="CSP + security headers">
              Content-Security-Policy, Strict-Transport-Security,
              X-Frame-Options, X-Content-Type-Options. Most are one-liners in
              netlify.toml or vercel.json.
            </Hardening>
            <Hardening status="missing" title="Magic link token verification on the server">
              Today the token is checked in localStorage. Move to a server
              endpoint that validates, rate-limits, and audits each lookup.
              Token storage: signed JWT with short expiry + refresh.
            </Hardening>
            <Hardening status="missing" title="WAF + DDoS protection">
              Cloudflare in front of the origin. Bot Fight Mode + WAF rules
              targeting common scraper signatures.
            </Hardening>
            <Hardening status="missing" title="Anomaly alerting">
              Slack/email pings to leadership when honeypot/throttle hits
              spike. This page shows them — production needs to push them.
            </Hardening>
            <Hardening status="present" title="Honeypot + time-to-fill + browser throttle on signup">
              Already shipped — see Phase 19a. Not a substitute for the items
              above, but catches the casual cases.
            </Hardening>
            <Hardening status="present" title="Magic link brute-force lockout">
              5 failures in 5 minutes → 15-minute browser lockout. Phase 19b.
              Doesn't stop a distributed attack but slows down single-origin probing.
            </Hardening>
            <Hardening status="present" title="robots.txt + per-page noindex meta">
              Private routes blocked from crawlers. Phase 19c.
            </Hardening>
            <Hardening status="present" title="PII blur with auto-restore">
              30-second exposure window per row, then auto-blurs. Phase 19d.
              Protects against over-the-shoulder leaks.
            </Hardening>
            <Hardening status="present" title="Audit log + retention policy">
              Every PII access is logged; Super Admin can purge per retention
              window. Phase 15b + 18c.
            </Hardening>
          </ul>
        </section>
      </div>
    </Layout>
  );
}

function SignalRow({ signal }: { signal: SecuritySignal }) {
  const meta = kindMeta(signal.kind);
  const fullTime = new Date(signal.timestamp).toLocaleString();
  return (
    <motion.li
      variants={{
        hidden: { opacity: 0, y: 6 },
        show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
      }}
      className="bg-bg-card rounded-2xl border border-border-custom p-4 hover:shadow-card transition-shadow"
    >
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${meta.bg}`}>
          <meta.Icon className={`w-5 h-5 ${meta.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <h3 className="font-display text-sm text-ink leading-tight">{meta.label}</h3>
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full whitespace-nowrap ${meta.bg} ${meta.color}`}>
              {meta.severity}
            </span>
          </div>
          {signal.details && (
            <p className="text-xs text-ink-light mt-1.5 font-mono break-all">{signal.details}</p>
          )}
          <p className="text-[10px] text-ink-light/60 mt-2 tabular-nums" title={fullTime}>
            {timeAgo(signal.timestamp)} · {fullTime}{signal.origin ? ` · origin ${signal.origin}` : ''}
          </p>
        </div>
      </div>
    </motion.li>
  );
}

function Hardening({
  status, title, children,
}: {
  status: 'present' | 'missing';
  title: string;
  children: React.ReactNode;
}) {
  const Icon = status === 'present' ? CheckCircle2 : AlertTriangle;
  const color = status === 'present' ? 'text-occ-green' : 'text-gold';
  const bg = status === 'present' ? 'bg-occ-green-light' : 'bg-gold-light';
  return (
    <li className="flex items-start gap-3">
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${bg}`}>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-ink">{title}</p>
        <p className="text-xs text-ink-light italic mt-0.5 leading-relaxed">{children}</p>
      </div>
    </li>
  );
}

function StatTile({
  icon: Icon, label, value, bg, color,
}: {
  icon: typeof Eye;
  label: string;
  value: string;
  bg: string;
  color: string;
}) {
  return (
    <div className={`${bg} rounded-2xl p-3`}>
      <Icon className={`w-4 h-4 ${color} mb-1`} />
      <p className={`font-display text-2xl ${color} tabular-nums leading-none`}>{value}</p>
      <p className="text-[10px] text-ink-light mt-1 uppercase tracking-wider">{label}</p>
    </div>
  );
}

function FilterChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 h-7 px-3 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
        active ? 'bg-ink text-white' : 'bg-bg-card border border-border-custom text-ink-light hover:text-ink'
      }`}
    >
      {label}
    </button>
  );
}

function kindLabel(kind: SecuritySignalKind): string {
  switch (kind) {
    case 'honeypot_filled':         return 'Honeypot tripped';
    case 'submit_too_fast':         return 'Submit too fast';
    case 'signup_throttled':        return 'Signup throttled';
    case 'invalid_token':           return 'Invalid token';
    case 'token_bruteforce_lockout':return 'Token lockout';
    case 'pii_reveal':              return 'PII revealed';
    case 'pii_blur_restored':       return 'PII re-hidden';
  }
}

function kindMeta(kind: SecuritySignalKind): {
  Icon: typeof Bug;
  bg: string;
  color: string;
  label: string;
  severity: 'low' | 'medium' | 'high';
} {
  switch (kind) {
    case 'honeypot_filled':
      return { Icon: Bot, bg: 'bg-gold-light', color: 'text-gold', label: 'Honeypot tripped', severity: 'medium' };
    case 'submit_too_fast':
      return { Icon: Zap, bg: 'bg-blue-light', color: 'text-blue-accent', label: 'Submit too fast', severity: 'medium' };
    case 'signup_throttled':
      return { Icon: ClockIcon, bg: 'bg-purple-light', color: 'text-purple-accent', label: 'Signup throttled', severity: 'low' };
    case 'invalid_token':
      return { Icon: Bug, bg: 'bg-sp-red-light', color: 'text-sp-red', label: 'Invalid token', severity: 'low' };
    case 'token_bruteforce_lockout':
      return { Icon: ShieldAlert, bg: 'bg-sp-red-light', color: 'text-sp-red', label: 'Token brute-force lockout', severity: 'high' };
    case 'pii_reveal':
      return { Icon: Eye, bg: 'bg-blue-light', color: 'text-blue-accent', label: 'PII revealed by admin', severity: 'low' };
    case 'pii_blur_restored':
      return { Icon: Lock, bg: 'bg-occ-green-light', color: 'text-occ-green', label: 'PII re-hidden', severity: 'low' };
  }
}

// Suppress unused-import lint; ChevronRight is reserved for future "deep dive" links.
void ChevronRight;
