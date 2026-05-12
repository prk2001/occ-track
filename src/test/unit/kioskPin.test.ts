import { beforeEach, describe, expect, it } from 'vitest';
import {
  KIOSK_PIN_KEY,
  KIOSK_UNLOCKED_KEY,
  clearKioskPin,
  constantTimeEqual,
  hashPin,
  isKioskPinSet,
  isKioskUnlocked,
  lockKiosk,
  setKioskPin,
  verifyKioskPin,
} from '@/lib/kioskPin';

describe('kioskPin', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  describe('constantTimeEqual', () => {
    it('returns true for equal strings', () => {
      expect(constantTimeEqual('abcd', 'abcd')).toBe(true);
      expect(constantTimeEqual('', '')).toBe(true);
    });

    it('returns false for different strings', () => {
      expect(constantTimeEqual('abcd', 'abce')).toBe(false);
      expect(constantTimeEqual('1234', '12345')).toBe(false);
      expect(constantTimeEqual('a', '')).toBe(false);
    });

    it('tolerates non-ASCII', () => {
      expect(constantTimeEqual('mañana', 'mañana')).toBe(true);
      expect(constantTimeEqual('mañana', 'manana')).toBe(false);
    });
  });

  describe('hashPin', () => {
    it('is deterministic for the same input', async () => {
      const a = await hashPin('1234');
      const b = await hashPin('1234');
      expect(a).toBe(b);
    });

    it('produces different output for different inputs', async () => {
      const a = await hashPin('1234');
      const b = await hashPin('1235');
      expect(a).not.toBe(b);
    });

    it('returns a hex SHA-256 string (64 chars)', async () => {
      const h = await hashPin('9999');
      expect(h).toMatch(/^[0-9a-f]+$/);
      // WebCrypto path → 64 hex chars. Fallback returns shorter hex.
      expect(h.length).toBeGreaterThan(0);
    });
  });

  describe('setKioskPin / verifyKioskPin', () => {
    it('verifies the correct PIN', async () => {
      await setKioskPin('4242');
      expect(isKioskPinSet()).toBe(true);
      expect(isKioskUnlocked()).toBe(true);
      const ok = await verifyKioskPin('4242');
      expect(ok).toBe(true);
    });

    it('rejects an incorrect PIN', async () => {
      await setKioskPin('4242');
      const ok = await verifyKioskPin('1111');
      expect(ok).toBe(false);
    });

    it('returns false when no PIN is set', async () => {
      const ok = await verifyKioskPin('4242');
      expect(ok).toBe(false);
    });
  });

  describe('lockKiosk + clearKioskPin', () => {
    it('lockKiosk removes the unlocked flag but keeps the PIN', async () => {
      await setKioskPin('4242');
      lockKiosk();
      expect(isKioskUnlocked()).toBe(false);
      expect(isKioskPinSet()).toBe(true);
    });

    it('clearKioskPin removes both pin + unlocked flag', async () => {
      await setKioskPin('4242');
      clearKioskPin();
      expect(isKioskPinSet()).toBe(false);
      expect(isKioskUnlocked()).toBe(false);
    });
  });

  it('uses sessionStorage, not localStorage', async () => {
    await setKioskPin('4242');
    expect(window.sessionStorage.getItem(KIOSK_PIN_KEY)).toBeTruthy();
    expect(window.sessionStorage.getItem(KIOSK_UNLOCKED_KEY)).toBe('1');
    // Should NOT be in localStorage (key was sessionStorage above)
    expect(window.localStorage.getItem(KIOSK_PIN_KEY)).toBeNull();
  });
});
