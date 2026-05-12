import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, ShieldCheck, KeyRound, X, AlertTriangle } from 'lucide-react';
import {
  isKioskPinSet,
  isKioskUnlocked,
  setKioskPin,
  verifyKioskPin,
  lockKiosk,
  clearKioskPin,
} from '@/lib/kioskPin';
import { logSecuritySignal } from '@/lib/security';

type Phase = 'setting' | 'unlocking' | 'locked-ok' | 'wrong';

/**
 * Kiosk PIN gate — wraps fullscreen kiosk pages (WelcomeTable, Clock).
 *
 * Three modes:
 *   1. No PIN set yet → SetPinPanel (greeter chooses a 4-digit code)
 *   2. PIN set + unlocked → render children
 *   3. PIN set + locked → UnlockPanel (enter the code)
 *
 * The PIN lives in sessionStorage only — closing the iPad clears it.
 * No persistent secret the next user inherits.
 *
 * Triple-tap the lock icon in the corner of children content to manually
 * re-lock the kiosk (e.g. greeter takes a break, hands off shift).
 */
export default function KioskPinGate({ children, onExit }: { children: React.ReactNode; onExit?: () => void }) {
  const [phase, setPhase] = useState<Phase>(() => {
    if (!isKioskPinSet()) return 'setting';
    if (isKioskUnlocked()) return 'locked-ok';
    return 'unlocking';
  });
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);

  async function handleSetPin() {
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      setError('PIN must be 4 digits.');
      return;
    }
    if (pin !== confirm) {
      setError('PINs don\'t match.');
      return;
    }
    await setKioskPin(pin);
    setPhase('locked-ok');
    setError(null);
    setPin('');
    setConfirm('');
  }

  async function handleUnlock() {
    const ok = await verifyKioskPin(pin);
    if (ok) {
      // Re-mark unlocked.
      window.sessionStorage.setItem('occ:kiosk-unlocked', '1');
      setPhase('locked-ok');
      setPin('');
      setError(null);
      setAttempts(0);
    } else {
      const next = attempts + 1;
      setAttempts(next);
      setPin('');
      logSecuritySignal('invalid_token', `Kiosk PIN attempt ${next}`);
      if (next >= 5) {
        // After 5 wrong PINs, force a full reset — greeter has to set
        // a new PIN. This locks out anyone brute-forcing the iPad.
        clearKioskPin();
        setPhase('setting');
        setError('Too many wrong tries. Greeter must set a new PIN.');
        logSecuritySignal('token_bruteforce_lockout', 'Kiosk PIN reset after 5 failed attempts');
      } else {
        setError(`Wrong PIN. ${5 - next} tries remaining.`);
      }
    }
  }

  if (phase === 'setting') {
    return (
      <SetPinPanel
        pin={pin} setPin={setPin}
        confirm={confirm} setConfirm={setConfirm}
        error={error} onSubmit={handleSetPin}
        onExit={onExit}
      />
    );
  }
  if (phase === 'unlocking') {
    return (
      <UnlockPanel
        pin={pin} setPin={setPin}
        error={error} attempts={attempts}
        onSubmit={handleUnlock}
        onExit={onExit}
      />
    );
  }
  return (
    <>
      {children}
      <ManualLockButton />
    </>
  );
}

// ─── Set-PIN panel (first launch) ─────────────────────────────────────────
function SetPinPanel({
  pin, setPin, confirm, setConfirm, error, onSubmit, onExit,
}: {
  pin: string; setPin: (v: string) => void;
  confirm: string; setConfirm: (v: string) => void;
  error: string | null; onSubmit: () => void;
  onExit?: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-bg-cream flex items-center justify-center px-4 z-50">
      <div className="bg-bg-card rounded-3xl shadow-card-elevated max-w-md w-full p-8 text-center">
        {onExit && (
          <button
            onClick={onExit}
            className="absolute top-4 right-4 touch-target text-ink-light/60 hover:text-sp-red transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
        <div className="w-20 h-20 mx-auto bg-occ-green-light rounded-full flex items-center justify-center mb-5">
          <KeyRound className="w-10 h-10 text-occ-green" />
        </div>
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-sp-red mb-2">
          Kiosk Setup
        </p>
        <h1 className="font-display text-3xl text-ink leading-tight tracking-tight">
          Set a kiosk PIN.
          <span className="font-display-italic block text-occ-green mt-1">
            Greeter only.
          </span>
        </h1>
        <p className="text-sm text-ink-light italic mt-3 leading-relaxed">
          The kiosk locks itself when idle. This 4-digit PIN unlocks it.
          Share with greeters covering this welcome table — not volunteers.
        </p>
        <PinInput value={pin} onChange={setPin} label="PIN" />
        <PinInput value={confirm} onChange={setConfirm} label="Confirm PIN" />
        {error && (
          <div className="mt-3 flex items-center justify-center gap-2 text-sm text-sp-red font-semibold">
            <AlertTriangle className="w-4 h-4" />
            {error}
          </div>
        )}
        <button
          onClick={onSubmit}
          disabled={pin.length !== 4 || confirm.length !== 4}
          className="w-full h-14 mt-6 bg-occ-green text-white font-display rounded-2xl text-lg hover:bg-occ-green-dark transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ShieldCheck className="w-5 h-5" />
          Launch Welcome Table
        </button>
      </div>
    </div>
  );
}

// ─── Unlock panel (kiosk locked) ──────────────────────────────────────────
function UnlockPanel({
  pin, setPin, error, attempts, onSubmit, onExit,
}: {
  pin: string; setPin: (v: string) => void;
  error: string | null; attempts: number;
  onSubmit: () => void;
  onExit?: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-navy/95 backdrop-blur flex items-center justify-center px-4 z-50">
      <div className="bg-bg-card rounded-3xl shadow-card-elevated max-w-md w-full p-8 text-center">
        {onExit && (
          <button
            onClick={onExit}
            className="absolute top-4 right-4 touch-target text-ink-light/60 hover:text-sp-red transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
        <div className="w-20 h-20 mx-auto bg-sp-red-light rounded-full flex items-center justify-center mb-5">
          <Lock className="w-10 h-10 text-sp-red" />
        </div>
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-sp-red mb-2">
          Kiosk Locked
        </p>
        <h1 className="font-display text-3xl text-ink leading-tight tracking-tight">
          Greeter PIN required.
        </h1>
        <p className="text-sm text-ink-light italic mt-3 leading-relaxed">
          Enter the 4-digit kiosk PIN to continue checking volunteers in.
        </p>
        <PinInput value={pin} onChange={setPin} autoFocus />
        {error && (
          <div className="mt-3 flex items-center justify-center gap-2 text-sm text-sp-red font-semibold">
            <AlertTriangle className="w-4 h-4" />
            {error}
          </div>
        )}
        <button
          onClick={onSubmit}
          disabled={pin.length !== 4}
          className="w-full h-14 mt-6 bg-sp-red text-white font-display rounded-2xl text-lg hover:bg-sp-red-dark transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ShieldCheck className="w-5 h-5" />
          Unlock
        </button>
        {attempts > 0 && (
          <p className="text-[10px] text-ink-light/60 italic mt-4">
            {attempts} wrong attempt{attempts === 1 ? '' : 's'} · resets after 5
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Manual lock button (triple-tap in the corner) ────────────────────────
function ManualLockButton() {
  const [taps, setTaps] = useState(0);
  useEffect(() => {
    if (taps === 0) return;
    const t = setTimeout(() => setTaps(0), 1500);
    return () => clearTimeout(t);
  }, [taps]);

  function handleTap() {
    const next = taps + 1;
    if (next >= 3) {
      lockKiosk();
      logSecuritySignal('signup_throttled', 'Manual kiosk lock (triple-tap)');
      window.location.reload();
    } else {
      setTaps(next);
    }
  }

  return (
    <button
      onClick={handleTap}
      className="fixed top-4 left-4 z-40 w-10 h-10 rounded-full bg-bg-card/40 backdrop-blur hover:bg-bg-card text-ink-light/40 hover:text-sp-red flex items-center justify-center transition-colors"
      aria-label="Lock kiosk (triple-tap)"
      title="Triple-tap to lock"
    >
      <Lock className="w-4 h-4" />
      {taps > 0 && (
        <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-sp-red text-white text-[9px] font-bold rounded-full flex items-center justify-center">
          {taps}
        </span>
      )}
    </button>
  );
}

// ─── PIN input ────────────────────────────────────────────────────────────
function PinInput({
  value, onChange, label, autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
  autoFocus?: boolean;
}) {
  return (
    <div className="mt-4">
      {label && (
        <p className="text-[10px] font-bold uppercase tracking-wider text-ink-light mb-2">{label}</p>
      )}
      <div className="flex justify-center gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`w-14 h-16 rounded-2xl border-2 ${
              value.length > i ? 'border-occ-green bg-occ-green-light' : 'border-border-custom bg-bg-primary'
            } flex items-center justify-center font-display text-3xl text-ink`}
          >
            {value.length > i ? '●' : ''}
          </div>
        ))}
      </div>
      <input
        type="tel"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={4}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 4))}
        autoFocus={autoFocus}
        className="sr-only"
        aria-label={label ?? 'PIN'}
      />
      <button
        onClick={() => {
          const input = document.querySelector<HTMLInputElement>('input[type="tel"]');
          input?.focus();
        }}
        className="mt-3 text-[10px] uppercase tracking-wider text-ink-light hover:text-sp-red"
      >
        Tap to type
      </button>
    </div>
  );
}
