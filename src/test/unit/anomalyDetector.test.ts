import { beforeEach, describe, expect, it } from 'vitest';
import { manuallyScan, resetAnomalyState, scanForAnomalies } from '@/lib/anomalyDetector';
import { getOutbox } from '@/lib/outbox';
import { logSecuritySignal } from '@/lib/security';

describe('anomalyDetector', () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetAnomalyState();
  });

  it('returns nothing when there are no signals', () => {
    expect(scanForAnomalies()).toEqual([]);
  });

  it('returns nothing when signals are under threshold', () => {
    // 9 honeypot trips — threshold is 10
    for (let i = 0; i < 9; i++) logSecuritySignal('honeypot_filled', `i=${i}`);
    expect(scanForAnomalies()).toEqual([]);
  });

  it('fires on threshold + dispatches in-app to Super Admin', () => {
    for (let i = 0; i < 12; i++) logSecuritySignal('honeypot_filled', `i=${i}`);
    const fired = scanForAnomalies({
      superAdminUserId: 'u0',
      superAdminName: 'Franklin Graham',
      superAdminEmail: 'fg@sp.org',
    });
    expect(fired).toHaveLength(1);
    expect(fired[0].kind).toBe('honeypot_filled');
    expect(fired[0].hitsInWindow).toBe(12);
    // Outbox now has the in-app alert
    const inbox = getOutbox().filter((m) => m.channel === 'in_app' && m.to === 'u0');
    expect(inbox.length).toBeGreaterThan(0);
  });

  it('high-severity (brute-force lockout) sends BOTH email + in-app on any trip', () => {
    logSecuritySignal('token_bruteforce_lockout', 'first one');
    scanForAnomalies({
      superAdminUserId: 'u0',
      superAdminName: 'Franklin Graham',
      superAdminEmail: 'fg@sp.org',
    });
    const out = getOutbox();
    const inApp = out.filter((m) => m.channel === 'in_app');
    const email = out.filter((m) => m.channel === 'email');
    expect(inApp.length).toBeGreaterThan(0);
    expect(email.length).toBeGreaterThan(0);
  });

  it('anti-fatigue: doesn\'t alert twice for the same kind within cooldown', () => {
    for (let i = 0; i < 12; i++) logSecuritySignal('honeypot_filled', `i=${i}`);
    const opts = { superAdminUserId: 'u0', superAdminName: 'FG', superAdminEmail: 'fg@sp.org' };
    const first = scanForAnomalies(opts);
    expect(first).toHaveLength(1);
    // Add 5 more signals, still over threshold — but cooldown should suppress
    for (let i = 0; i < 5; i++) logSecuritySignal('honeypot_filled', `bis=${i}`);
    const second = scanForAnomalies(opts);
    expect(second).toHaveLength(0);
  });

  it('manuallyScan is a thin alias for scanForAnomalies', () => {
    for (let i = 0; i < 12; i++) logSecuritySignal('honeypot_filled');
    const a = manuallyScan({ superAdminUserId: 'u0', superAdminName: 'FG', superAdminEmail: 'fg@sp.org' });
    expect(a).toBeDefined();
  });
});
