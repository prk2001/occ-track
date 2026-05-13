import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRightLeft, X, MapPin, AlertTriangle, ChevronRight, Send,
} from 'lucide-react';
import { LOCATIONS } from '@/data/mockData';
import type { StoredSignup, User } from '@/data/mockData';
import { logAuditEvent } from '@/lib/auditLog';
import { sendMessage, buildCdoSignupAlert } from '@/lib/outbox';
import { USERS, getLocationById } from '@/data/mockData';
import { getFirstName } from '@/lib/name';
import { useFocusTrap } from '@/hooks/useFocusTrap';

/**
 * Cross-CDO transfer dialog.
 *
 * Admin reassigns a signup from one Central Drop-off to another. The
 * locationId field is updated; both old and new CDO Leaders get in-app
 * notifications; the volunteer gets an email confirming the change.
 *
 * Audit trail captures actor / from / to / signup target — the kind of
 * trail leadership needs when a volunteer claims "I never said I'd serve
 * at that CDO."
 */
export default function TransferDialog({
  open, signup, onClose, onTransfer, actor,
}: {
  open: boolean;
  signup: StoredSignup | null;
  onClose: () => void;
  onTransfer: (signupId: string, fromId: string, toId: string, reason: string) => void;
  actor: User | null;
}) {
  const [targetCdo, setTargetCdo] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [step, setStep] = useState<'pick' | 'confirm'>('pick');
  // Phase 35d: trap focus inside the dialog while it's open.
  const trapRef = useFocusTrap<HTMLDivElement>(open && !!signup);

  if (!open || !signup) return null;

  const currentCdo = getLocationById(signup.locationId ?? 'cdo1');
  const targetLocation = LOCATIONS.find((l) => l.id === targetCdo);
  const activeCdos = LOCATIONS.filter((l) => l.type === 'central' && l.status === 'active' && l.id !== signup.locationId);

  function reset() {
    setStep('pick');
    setTargetCdo('');
    setReason('');
  }

  function performTransfer() {
    if (!targetCdo || !signup) return;
    const fromId = signup.locationId ?? 'cdo1';
    onTransfer(signup.id, fromId, targetCdo, reason);

    // Notify both CDO Leaders. Find them by role + location.
    const oldLeader = USERS.find((u) => u.role === 'cdo_leader' && u.locationId === fromId);
    const newLeader = USERS.find((u) => u.role === 'cdo_leader' && u.locationId === targetCdo);
    const oldLoc = getLocationById(fromId);
    const newLoc = getLocationById(targetCdo);

    if (oldLeader) {
      sendMessage({
        kind: 'leadership_broadcast',
        channel: 'in_app',
        to: oldLeader.id,
        toName: oldLeader.name,
        subject: 'Volunteer transferred out',
        body: `${signup.name} has been moved from your CDO (${oldLoc?.name ?? fromId}) to ${newLoc?.name ?? targetCdo}.${reason ? ` Reason: ${reason}` : ''}`,
        relatedTarget: `signup:${signup.id}`,
        link: '/signups',
      });
    }
    if (newLeader) {
      sendMessage(buildCdoSignupAlert({
        cdoUserId: newLeader.id,
        cdoUserName: newLeader.name,
        volunteerName: signup.name,
        signupId: signup.id,
      }));
    }

    // Email the volunteer
    sendMessage({
      kind: 'signup_confirmation',
      channel: 'email',
      to: signup.email,
      toName: signup.name,
      subject: 'Your Collection Week CDO has changed',
      body: `Hi ${getFirstName(signup.name)},\n\nWe wanted to let you know we moved your signup from ${oldLoc?.name ?? 'your previous CDO'} to ${newLoc?.name ?? 'a new CDO'}.${reason ? `\n\nReason: ${reason}` : ''}\n\nYour existing edit link still works — no need to sign up again. If you have any questions, contact your new CDO Leader.\n\nSamaritan\'s Purse · Operation Christmas Child`,
      relatedTarget: `signup:${signup.id}`,
    });

    if (actor) {
      logAuditEvent(
        { id: actor.id, name: actor.name, role: actor.role },
        'volunteer_self_edit',
        `signup:${signup.id}`,
        `TRANSFERRED ${signup.name}: ${oldLoc?.name ?? fromId} → ${newLoc?.name ?? targetCdo}${reason ? ` (${reason})` : ''}`,
      );
    }

    reset();
    onClose();
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-navy/50 flex items-center justify-center px-4"
        onClick={() => { reset(); onClose(); }}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 240, damping: 22 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-bg-card rounded-3xl shadow-card-elevated max-w-md w-full overflow-hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="transfer-dialog-title"
          ref={trapRef}
        >
          <header className="px-6 py-4 border-b border-border-custom flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-light flex items-center justify-center">
                <ArrowRightLeft className="w-5 h-5 text-blue-accent" />
              </div>
              <div>
                <h2 id="transfer-dialog-title" className="font-display text-lg text-ink leading-tight">Transfer Volunteer</h2>
                <p className="text-[11px] text-ink-light italic">{signup.name}</p>
              </div>
            </div>
            <button
              onClick={() => { reset(); onClose(); }}
              className="touch-target text-ink-light/60 hover:text-sp-red transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </header>

          <div className="p-6 space-y-4">
            {/* Current CDO */}
            <div className="bg-bg-primary rounded-xl p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-ink-light mb-1">
                Currently at
              </p>
              <p className="text-sm font-semibold text-ink flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-sp-red" />
                {currentCdo?.name ?? 'Unknown CDO'}
                <span className="text-ink-light italic text-xs">
                  · {currentCdo?.city}, {currentCdo?.state}
                </span>
              </p>
            </div>

            {step === 'pick' && (
              <>
                <label className="block">
                  <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink-light mb-1.5 flex items-center gap-1.5">
                    <ArrowRightLeft className="w-3 h-3" />
                    Transfer to
                  </span>
                  <select
                    value={targetCdo}
                    onChange={(e) => setTargetCdo(e.target.value)}
                    className="w-full h-12 px-4 bg-bg-primary border border-border-custom rounded-xl text-base text-ink focus:outline-none focus:border-sp-red transition-colors"
                  >
                    <option value="">Pick a destination CDO…</option>
                    {activeCdos.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name} — {l.city}, {l.state}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink-light mb-1.5 flex items-center gap-1.5">
                    Reason (optional)
                  </span>
                  <input
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. Volunteer moved · Closer to home · CDO needed more help"
                    className="w-full h-12 px-4 bg-bg-primary border border-border-custom rounded-xl text-sm text-ink placeholder:text-ink-light/50 focus:outline-none focus:border-sp-red transition-colors"
                  />
                </label>

                {/* Heads-up callout */}
                <div className="bg-gold-light border border-gold rounded-xl p-3 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-gold shrink-0 mt-0.5" />
                  <p className="text-xs text-ink leading-relaxed">
                    Both CDO Leaders will get a notification. The volunteer
                    will get an email confirming the change. Their existing
                    edit link continues to work.
                  </p>
                </div>

                <button
                  onClick={() => setStep('confirm')}
                  disabled={!targetCdo}
                  className="w-full h-12 bg-blue-accent text-white font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-blue-accent/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Review transfer
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}

            {step === 'confirm' && targetLocation && (
              <>
                <div className="bg-blue-light rounded-xl p-4 text-center">
                  <ArrowRightLeft className="w-6 h-6 text-blue-accent mx-auto mb-2" />
                  <p className="text-sm text-ink">
                    <span className="font-semibold">{signup.name}</span> will move
                  </p>
                  <p className="text-sm text-ink-light mt-2">
                    from <span className="font-semibold text-ink">{currentCdo?.name}</span>
                  </p>
                  <p className="text-sm text-ink-light">
                    to <span className="font-semibold text-blue-accent">{targetLocation.name}</span>
                  </p>
                  {reason && (
                    <p className="text-xs text-ink-light italic mt-3">
                      Reason: {reason}
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setStep('pick')}
                    className="flex-1 h-12 bg-bg-card border border-border-custom hover:border-ink text-ink-light hover:text-ink text-sm font-semibold rounded-xl"
                  >
                    Back
                  </button>
                  <button
                    onClick={performTransfer}
                    className="flex-1 h-12 bg-occ-green hover:bg-occ-green-dark text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
                  >
                    <Send className="w-4 h-4" />
                    Transfer + notify
                  </button>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
