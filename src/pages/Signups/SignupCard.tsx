import { memo } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRightLeft, KeyRound, Mail, MessageCircle, Phone, Send, Shield, Trash2,
} from 'lucide-react';
import { timeAgo } from '@/data/mockData';
import type { StoredSignup } from '@/data/mockData';

// ─── Signup card ────────────────────────────────────────────────────────────
// Memoized — Signups admin can show 100+ rows; every parent state
// change (search, sort, PII toggle, attendance change) previously
// re-rendered every card. memo + reference-stable handlers from
// useCallback cuts this to "only re-render rows whose data changed".
// Audit P1.22.
interface SignupCardProps {
  signup: StoredSignup;
  isDuplicate?: boolean;
  isPiiBlurred?: boolean;
  onToggleReveal?: () => void;
  onResendLink?: () => void;
  onReissueLink?: () => void;
  onTransfer?: () => void;
  onRemove: () => void;
}

const SignupCard = memo(function SignupCard({
  signup, isDuplicate, isPiiBlurred, onToggleReveal, onResendLink, onReissueLink, onTransfer, onRemove,
}: SignupCardProps) {
  const initials = signup.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  // Tailwind doesn't easily blur text without affecting layout. We use
  // a CSS filter so the row keeps its dimensions; hover reveals to make
  // the admin's intent explicit (no accidental drive-by reads).
  const blurClass = isPiiBlurred
    ? 'blur-sm select-none hover:blur-none transition-all cursor-pointer'
    : '';
  return (
    <motion.li
      variants={{
        hidden: { opacity: 0, y: 12 },
        show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
      }}
      className="bg-bg-card rounded-2xl border border-border-custom p-4 hover:shadow-card transition-shadow"
    >
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-full bg-sp-red text-white flex items-center justify-center font-display text-lg leading-none shrink-0">
          {initials || '?'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-display text-base text-ink truncate leading-tight">{signup.name}</h3>
              <p className="text-[11px] text-ink-light mt-0.5">Signed up {timeAgo(signup.submittedAt)}</p>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              {signup.firstTime && (
                <span className="text-[9px] font-bold uppercase tracking-wider text-lime-dark bg-lime-light px-2 py-0.5 rounded-full whitespace-nowrap">
                  First-Timer
                </span>
              )}
              {signup.lastEditedBy === 'self' && signup.lastEditedAt && (
                <span
                  className="text-[9px] font-bold uppercase tracking-wider text-occ-green bg-occ-green-light px-2 py-0.5 rounded-full whitespace-nowrap"
                  title={`Volunteer self-edited via magic link · ${new Date(signup.lastEditedAt).toLocaleString()}`}
                >
                  Self-edited · {timeAgo(signup.lastEditedAt)}
                </span>
              )}
              {isDuplicate && (
                <span
                  className="text-[9px] font-bold uppercase tracking-wider text-gold bg-gold-light px-2 py-0.5 rounded-full whitespace-nowrap"
                  title="Email or phone matches another signup — possible duplicate"
                >
                  ⚠ Duplicate
                </span>
              )}
            </div>
          </div>

          <div
            className="mt-3 grid grid-cols-1 gap-1.5 text-[11px]"
            onClick={isPiiBlurred ? onToggleReveal : undefined}
          >
            <a
              href={isPiiBlurred ? undefined : `tel:${signup.phone}`}
              className={`flex items-center gap-1.5 text-ink-light hover:text-sp-red transition-colors tabular-nums ${blurClass}`}
              onClick={(e) => { if (isPiiBlurred) e.preventDefault(); }}
            >
              <Phone className="w-3 h-3 shrink-0 not-blurred" />
              <span>{signup.phone}</span>
            </a>
            <a
              href={isPiiBlurred ? undefined : `mailto:${signup.email}`}
              className={`flex items-center gap-1.5 text-ink-light hover:text-sp-red transition-colors truncate ${blurClass}`}
              onClick={(e) => { if (isPiiBlurred) e.preventDefault(); }}
            >
              <Mail className="w-3 h-3 shrink-0" />
              <span className="truncate">{signup.email}</span>
            </a>
          </div>

          {(signup.shirtSize || signup.emergencyName || signup.notes) && (
            <div className="mt-3 pt-3 border-t border-border-custom/60 space-y-2 text-[11px] text-ink-light">
              {signup.shirtSize && (
                <p><span className="font-semibold text-ink uppercase tracking-wider text-[9px]">Shirt:</span> {signup.shirtSize}</p>
              )}
              {signup.emergencyName && (
                <p
                  className={`flex items-start gap-1.5 ${blurClass}`}
                  onClick={isPiiBlurred ? onToggleReveal : undefined}
                >
                  <Shield className="w-3 h-3 shrink-0 mt-0.5" />
                  <span><span className="font-semibold text-ink">{signup.emergencyName}</span>{signup.emergencyPhone && ` · ${signup.emergencyPhone}`}</span>
                </p>
              )}
              {signup.notes && (
                <p className="flex items-start gap-1.5 italic">
                  <MessageCircle className="w-3 h-3 shrink-0 mt-0.5" />
                  <span>{signup.notes}</span>
                </p>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1 shrink-0 print-hide">
          {onResendLink && signup.editToken && (
            <button
              onClick={onResendLink}
              className="touch-target text-ink-light/60 hover:text-occ-green transition-colors"
              aria-label={`Resend edit link to ${signup.name}`}
              title="Resend their existing magic link by email"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
          {onReissueLink && signup.editToken && (
            <button
              onClick={onReissueLink}
              className="touch-target text-ink-light/60 hover:text-gold transition-colors"
              aria-label={`Reissue edit link for ${signup.name}`}
              title="Reissue a NEW magic link (revokes old one) — for security incidents"
            >
              <KeyRound className="w-4 h-4" />
            </button>
          )}
          {onTransfer && (
            <button
              onClick={onTransfer}
              className="touch-target text-ink-light/60 hover:text-blue-accent transition-colors"
              aria-label={`Transfer ${signup.name} to another CDO`}
              title="Transfer this volunteer to another Central Drop-off"
            >
              <ArrowRightLeft className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onRemove}
            className="touch-target text-ink-light/60 hover:text-sp-red transition-colors"
            aria-label={`Remove ${signup.name}`}
            title="Remove this signup entirely"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.li>
  );
});

export { SignupCard };
