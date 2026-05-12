import { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Loader2 } from 'lucide-react';

/**
 * Turnstile-style CAPTCHA stub.
 *
 * Production wiring: replace the inner button with the real Cloudflare
 * Turnstile widget (`<div className="cf-turnstile" data-sitekey="...">`).
 * The interface here matches what a real integration looks like —
 * `onVerified` fires with a token string once the user solves it.
 *
 * For the prototype, we accept a single click as "verification" but only
 * after a small artificial delay so a fast bot still gets caught by the
 * time-to-fill check upstream. The token returned is a UUID stub.
 */
export default function TurnstileStub({
  onVerified, verifiedToken,
}: {
  onVerified: (token: string) => void;
  verifiedToken: string | null;
}) {
  const [pending, setPending] = useState(false);

  async function pretendVerify() {
    setPending(true);
    // Artificial 800ms delay to mimic Turnstile's challenge time and to
    // force a tiny pause that's easier for humans than for fast bots.
    await new Promise((r) => setTimeout(r, 800));
    const token =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? `stub_${crypto.randomUUID()}`
        : `stub_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    onVerified(token);
    setPending(false);
  }

  if (verifiedToken) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-occ-green-light border border-occ-green rounded-2xl px-4 py-3 flex items-center gap-3"
      >
        <div className="w-8 h-8 rounded-full bg-occ-green flex items-center justify-center shrink-0">
          <ShieldCheck className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-occ-green-dark">Verified.</p>
          <p className="text-[10px] text-ink-light italic mt-0.5">
            Cloudflare Turnstile · prototype mode
          </p>
        </div>
        <code className="text-[9px] font-mono text-ink-light/40 truncate max-w-[90px]">
          {verifiedToken.slice(0, 12)}…
        </code>
      </motion.div>
    );
  }

  return (
    <button
      type="button"
      onClick={pretendVerify}
      disabled={pending}
      className="w-full bg-bg-primary border-2 border-border-custom hover:border-occ-green rounded-2xl px-4 py-3 flex items-center gap-3 transition-colors group disabled:opacity-60"
    >
      <div className="w-6 h-6 rounded border-2 border-ink-light/40 group-hover:border-occ-green flex items-center justify-center shrink-0 transition-colors">
        {pending && <Loader2 className="w-3.5 h-3.5 text-occ-green animate-spin" />}
      </div>
      <div className="flex-1 text-left min-w-0">
        <p className="text-sm font-semibold text-ink">
          {pending ? 'Verifying…' : 'I\'m not a robot'}
        </p>
        <p className="text-[10px] text-ink-light italic mt-0.5">
          Cloudflare Turnstile · privacy-friendly
        </p>
      </div>
      <p className="text-[9px] font-mono text-ink-light/30">CAPTCHA</p>
    </button>
  );
}
