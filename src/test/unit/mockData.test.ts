import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CDO_ID,
  defaultTokenExpiry,
  findDuplicateSignups,
  inferCdoFromZip,
  normalizeEmail,
  normalizePhone,
  signupInScopeForUser,
  tokenStatus,
} from '@/data/mockData';
import type { StoredSignup, User } from '@/data/mockData';

const makeSignup = (overrides: Partial<StoredSignup> = {}): StoredSignup => ({
  id: 's' + Math.random().toString(36).slice(2, 8),
  name: 'Jane Sample',
  email: 'jane@example.org',
  phone: '(404) 555-0101',
  firstTime: false,
  shirtSize: 'M',
  emergencyName: '',
  emergencyPhone: '',
  notes: '',
  submittedAt: new Date().toISOString(),
  locationId: 'cdo1',
  ...overrides,
});

describe('mockData helpers', () => {
  describe('normalizeEmail', () => {
    it('lowercases and trims', () => {
      expect(normalizeEmail('  JANE@Example.ORG ')).toBe('jane@example.org');
    });
    it('does NOT apply gmail-dot tricks (treats aliases as distinct)', () => {
      expect(normalizeEmail('j.s@gmail.com')).toBe('j.s@gmail.com');
      expect(normalizeEmail('js@gmail.com')).toBe('js@gmail.com');
      expect(normalizeEmail('j.s@gmail.com')).not.toBe(normalizeEmail('js@gmail.com'));
    });
  });

  describe('normalizePhone', () => {
    it('strips formatting', () => {
      expect(normalizePhone('(404) 555-0101')).toBe('4045550101');
    });
    it('strips leading 1 country code', () => {
      expect(normalizePhone('1-404-555-0101')).toBe('4045550101');
    });
    it('leaves a 10-digit number alone', () => {
      expect(normalizePhone('4045550101')).toBe('4045550101');
    });
  });

  describe('findDuplicateSignups', () => {
    it('returns empty when nothing matches', () => {
      const existing = [makeSignup({ email: 'a@x.com', phone: '1111111111' })];
      const dupes = findDuplicateSignups(existing, { email: 'b@x.com', phone: '2222222222' });
      expect(dupes).toEqual([]);
    });

    it('matches by email (case-insensitive)', () => {
      const existing = [makeSignup({ email: 'jane@example.org' })];
      const dupes = findDuplicateSignups(existing, { email: 'JANE@example.ORG', phone: '' });
      expect(dupes).toHaveLength(1);
    });

    it('matches by phone (digits only)', () => {
      const existing = [makeSignup({ phone: '(404) 555-0101' })];
      const dupes = findDuplicateSignups(existing, { email: '', phone: '404-555-0101' });
      expect(dupes).toHaveLength(1);
    });

    it('excludes by id when excludeId is passed', () => {
      const s = makeSignup({ id: 'self', email: 'me@x.com' });
      const dupes = findDuplicateSignups([s], { email: 'me@x.com' }, 'self');
      expect(dupes).toEqual([]);
    });

    it('does NOT match on partial phone (must be \u2265 7 digits)', () => {
      const existing = [makeSignup({ phone: '4045550101' })];
      const dupes = findDuplicateSignups(existing, { email: '', phone: '404' });
      expect(dupes).toEqual([]);
    });
  });

  describe('signupInScopeForUser', () => {
    const signup = makeSignup({ locationId: 'cdo1' });

    it('Super Admin sees everything', () => {
      const u: User = { id: 'u0', name: 'X', email: '', role: 'super_admin' };
      expect(signupInScopeForUser(u, signup)).toBe(true);
    });
    it('SP Admin sees everything', () => {
      const u: User = { id: 'u1', name: 'X', email: '', role: 'admin' };
      expect(signupInScopeForUser(u, signup)).toBe(true);
    });
    it('CDO Leader only sees signups at their own CDO', () => {
      const u: User = { id: 'u3', name: 'X', email: '', role: 'cdo_leader', locationId: 'cdo1' };
      expect(signupInScopeForUser(u, signup)).toBe(true);
      expect(signupInScopeForUser(u, makeSignup({ locationId: 'cdo2' }))).toBe(false);
    });
    it('Greeter never sees signups', () => {
      const u: User = { id: 'u5', name: 'X', email: '', role: 'greeter', locationId: 'cdo1' };
      expect(signupInScopeForUser(u, signup)).toBe(false);
    });
    it('null user sees nothing', () => {
      expect(signupInScopeForUser(null, signup)).toBe(false);
    });
  });

  describe('inferCdoFromZip', () => {
    it('returns DEFAULT_CDO_ID for blank ZIP', () => {
      expect(inferCdoFromZip(undefined)).toBe(DEFAULT_CDO_ID);
      expect(inferCdoFromZip('')).toBe(DEFAULT_CDO_ID);
    });
    it('matches a known Atlanta ZIP to a real CDO', () => {
      const cdo = inferCdoFromZip('30301');
      expect(cdo).toBeTruthy();
      expect(cdo).not.toBe('');
    });
    it('falls back to DEFAULT_CDO_ID for an unknown ZIP', () => {
      expect(inferCdoFromZip('99999')).toBe(DEFAULT_CDO_ID);
    });
  });

  describe('token expiry helpers', () => {
    it('defaultTokenExpiry returns a future ISO timestamp', () => {
      const exp = defaultTokenExpiry();
      expect(new Date(exp).getTime()).toBeGreaterThan(Date.now());
    });

    it('tokenStatus returns valid when far from expiry', () => {
      const far = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
      const s = tokenStatus(far);
      expect(s.state).toBe('valid');
      expect(s.daysLeft).toBeGreaterThan(14);
    });

    it('tokenStatus returns expiring when within threshold', () => {
      const soon = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const s = tokenStatus(soon);
      expect(s.state).toBe('expiring');
      expect(s.daysLeft).toBeLessThanOrEqual(14);
    });

    it('tokenStatus returns expired when in the past', () => {
      const past = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const s = tokenStatus(past);
      expect(s.state).toBe('expired');
      expect(s.daysLeft).toBe(0);
    });

    it('tokenStatus treats undefined as valid', () => {
      const s = tokenStatus(undefined);
      expect(s.state).toBe('valid');
    });
  });
});
