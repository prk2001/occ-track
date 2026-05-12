import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  TOKEN_BRUTEFORCE_LOCKOUT_MS,
  TOKEN_BRUTEFORCE_THRESHOLD,
  checkSignupThrottle,
  getBrowserOrigin,
  getSecuritySignals,
  isTokenLocked,
  logSecuritySignal,
  recordTokenFailure,
  resetTokenFailures,
  SECURITY_LOG_KEY,
  SIGNUP_THROTTLE_KEY,
  SIGNUP_THROTTLE_SECONDS,
  stampSignupThrottle,
  TOKEN_ATTEMPTS_KEY,
} from '@/lib/security';

describe('security', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('logSecuritySignal', () => {
    it('writes a signal with kind, timestamp, origin', () => {
      logSecuritySignal('honeypot_filled', 'field=spam');
      const signals = getSecuritySignals();
      expect(signals).toHaveLength(1);
      expect(signals[0].kind).toBe('honeypot_filled');
      expect(signals[0].details).toBe('field=spam');
      expect(signals[0].origin).toBeTruthy();
    });

    it('reuses the same origin id across multiple writes', () => {
      logSecuritySignal('honeypot_filled');
      logSecuritySignal('submit_too_fast');
      const signals = getSecuritySignals();
      expect(signals[0].origin).toBe(signals[1].origin);
    });
  });

  describe('getBrowserOrigin', () => {
    it('generates a stable id and persists it', () => {
      const id1 = getBrowserOrigin();
      const id2 = getBrowserOrigin();
      expect(id1).toBe(id2);
      expect(id1.length).toBeGreaterThan(0);
    });
  });

  describe('checkSignupThrottle', () => {
    it('returns null when no prior submission', () => {
      expect(checkSignupThrottle()).toBeNull();
    });

    it('returns seconds-remaining when within throttle window', () => {
      stampSignupThrottle();
      const remaining = checkSignupThrottle();
      expect(remaining).not.toBeNull();
      expect(remaining!).toBeGreaterThan(0);
      expect(remaining!).toBeLessThanOrEqual(SIGNUP_THROTTLE_SECONDS);
    });

    it('returns null after throttle window elapses', () => {
      // Fake a stale stamp
      window.localStorage.setItem(SIGNUP_THROTTLE_KEY, String(Date.now() - (SIGNUP_THROTTLE_SECONDS + 1) * 1000));
      expect(checkSignupThrottle()).toBeNull();
    });

    it('returns null when the stored value is garbage', () => {
      window.localStorage.setItem(SIGNUP_THROTTLE_KEY, 'not-a-number');
      expect(checkSignupThrottle()).toBeNull();
    });
  });

  describe('magic link brute-force lockout', () => {
    it('is unlocked initially', () => {
      expect(isTokenLocked().locked).toBe(false);
    });

    it('records failures without locking under threshold', () => {
      for (let i = 0; i < TOKEN_BRUTEFORCE_THRESHOLD - 1; i++) {
        const tripped = recordTokenFailure();
        expect(tripped).toBe(false);
      }
      expect(isTokenLocked().locked).toBe(false);
    });

    it('locks on the Nth failure within the window', () => {
      for (let i = 0; i < TOKEN_BRUTEFORCE_THRESHOLD - 1; i++) {
        recordTokenFailure();
      }
      const tripped = recordTokenFailure();
      expect(tripped).toBe(true);
      const status = isTokenLocked();
      expect(status.locked).toBe(true);
      expect(status.secondsRemaining).toBeGreaterThan(0);
      expect(status.secondsRemaining).toBeLessThanOrEqual(Math.ceil(TOKEN_BRUTEFORCE_LOCKOUT_MS / 1000));
    });

    it('resetTokenFailures clears the failure ledger', () => {
      for (let i = 0; i < TOKEN_BRUTEFORCE_THRESHOLD - 1; i++) {
        recordTokenFailure();
      }
      resetTokenFailures();
      // One more failure should still NOT trip lockout (counter reset)
      const tripped = recordTokenFailure();
      expect(tripped).toBe(false);
    });

    it('unlocks after the lockout window passes', () => {
      // Manually set a lockout that already expired
      const expired = new Date(Date.now() - 1000).toISOString();
      window.localStorage.setItem(TOKEN_ATTEMPTS_KEY, JSON.stringify({ failures: [], lockedUntil: expired }));
      expect(isTokenLocked().locked).toBe(false);
    });
  });

  describe('signal log persistence', () => {
    it('survives garbage storage gracefully', () => {
      window.localStorage.setItem(SECURITY_LOG_KEY, '{{{ bad json');
      expect(() => getSecuritySignals()).not.toThrow();
      expect(getSecuritySignals()).toEqual([]);
    });
  });
});
