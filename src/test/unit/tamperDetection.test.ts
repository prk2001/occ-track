import { beforeEach, describe, expect, it } from 'vitest';
import { auditAllProtectedKeys, readProtected, setProtected, PROTECTED_KEYS } from '@/lib/tamperDetection';
import { getSecuritySignals } from '@/lib/security';

describe('tamperDetection', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  describe('setProtected + readProtected', () => {
    it('round-trips a value', () => {
      setProtected('occ:signups', JSON.stringify([{ id: 's1', name: 'Jane' }]));
      const back = readProtected('occ:signups');
      expect(back).not.toBeNull();
      const parsed = JSON.parse(back!);
      expect(parsed[0].name).toBe('Jane');
    });

    it('stamps a checksum the first time it reads a value with no checksum', () => {
      // Bypass setProtected: write directly to the underlying key (simulating
      // an old-version write before tamper detection existed).
      window.localStorage.setItem('occ:signups', '[]');
      // First read should accept + stamp a checksum
      const value = readProtected('occ:signups');
      expect(value).toBe('[]');
      const cs = window.localStorage.getItem('occ:checksum:occ:signups');
      expect(cs).toBeTruthy();
    });

    it('returns null + logs a security signal when the checksum is wrong', () => {
      setProtected('occ:signups', '[{"id":"a"}]');
      // Tamper: edit the value without recomputing the checksum
      window.localStorage.setItem('occ:signups', '[{"id":"a","stolen":true}]');
      const value = readProtected('occ:signups');
      expect(value).toBeNull();
      const signals = getSecuritySignals();
      expect(signals.length).toBeGreaterThan(0);
      expect(signals[0].kind).toBe('invalid_token');
      expect(signals[0].details).toContain('Tamper detected');
    });
  });

  describe('auditAllProtectedKeys', () => {
    it('returns empty when nothing is protected', () => {
      const result = auditAllProtectedKeys();
      expect(result).toEqual([]);
    });

    it('flags tampered keys', () => {
      setProtected('occ:signups', '[]');
      setProtected('occ:audit-log', '[]');
      // Tamper one of them
      window.localStorage.setItem('occ:signups', '[{"id":"forged"}]');
      const failures = auditAllProtectedKeys();
      expect(failures).toContain('occ:signups');
      expect(failures).not.toContain('occ:audit-log');
    });
  });

  describe('PROTECTED_KEYS', () => {
    it('covers the actual occ:* keys we care about', () => {
      expect(PROTECTED_KEYS).toContain('occ:signups');
      expect(PROTECTED_KEYS).toContain('occ:audit-log');
      expect(PROTECTED_KEYS).toContain('occ:outbox');
      expect(PROTECTED_KEYS).toContain('occ:day-blocks');
      expect(PROTECTED_KEYS).toContain('occ:day-times');
      expect(PROTECTED_KEYS).toContain('occ:security-log');
    });
  });
});
