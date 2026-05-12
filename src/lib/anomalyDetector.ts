// Anomaly detector — watches the security signal log for spikes and
// dispatches alerts via the outbox.
//
// Design contract:
//   - Pure rate analysis. "More than N signals of kind K in the last
//     W minutes" trips an anomaly.
//   - Alert routing per kind. Honeypot = low severity (in-app only),
//     brute-force lockout = high severity (in-app + email).
//   - Anti-fatigue throttle: at most one alert per kind per hour.
//   - Audited: every dispatched alert writes a security signal record.
//
// Real production: this logic moves server-side, alerts go to PagerDuty +
// Slack + email-pager, baselines auto-adjust based on historical rates.

import {
  getSecuritySignals,
  logSecuritySignal,
} from './security';
import type { SecuritySignal, SecuritySignalKind } from './security';
import { sendMessage } from './outbox';

export const ANOMALY_STATE_KEY = 'occ:anomaly-state';
export const ALERT_COOLDOWN_MS = 60 * 60 * 1000;       // 1 hour
export const DEFAULT_WINDOW_MS = 5 * 60 * 1000;         // 5 minutes

interface ThresholdConfig {
  kind: SecuritySignalKind;
  windowMs: number;
  threshold: number;
  severity: 'low' | 'medium' | 'high';
  channels: Array<'in_app' | 'email'>;
}

// Per-kind thresholds. Tuned for the OCC prototype:
//   - Honeypot: 10+ trips in 5min = bot wave hitting the public signup
//   - Submit-too-fast: 5+ in 5min = automated form-poster
//   - Token brute-force: ONE lockout fires immediately (no batching;
//     a single distributed attacker rotating origins still trips this)
const THRESHOLDS: ThresholdConfig[] = [
  {
    kind: 'honeypot_filled',
    windowMs: DEFAULT_WINDOW_MS,
    threshold: 10,
    severity: 'medium',
    channels: ['in_app'],
  },
  {
    kind: 'submit_too_fast',
    windowMs: DEFAULT_WINDOW_MS,
    threshold: 5,
    severity: 'medium',
    channels: ['in_app'],
  },
  {
    kind: 'signup_throttled',
    windowMs: DEFAULT_WINDOW_MS,
    threshold: 15,
    severity: 'low',
    channels: ['in_app'],
  },
  {
    kind: 'invalid_token',
    windowMs: DEFAULT_WINDOW_MS,
    threshold: 20,
    severity: 'medium',
    channels: ['in_app', 'email'],
  },
  {
    kind: 'token_bruteforce_lockout',
    windowMs: DEFAULT_WINDOW_MS,
    threshold: 1, // ANY lockout fires immediately
    severity: 'high',
    channels: ['in_app', 'email'],
  },
  {
    kind: 'pii_reveal',
    windowMs: DEFAULT_WINDOW_MS,
    threshold: 30,
    severity: 'low',
    channels: ['in_app'],
  },
];

// Anti-fatigue cooldown: track when we last sent an alert per kind.
interface AnomalyState {
  lastAlertedAt: Partial<Record<SecuritySignalKind, string>>;
}

function readState(): AnomalyState {
  if (typeof window === 'undefined') return { lastAlertedAt: {} };
  try {
    const raw = window.localStorage.getItem(ANOMALY_STATE_KEY);
    return raw ? JSON.parse(raw) : { lastAlertedAt: {} };
  } catch {
    return { lastAlertedAt: {} };
  }
}

function writeState(s: AnomalyState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(ANOMALY_STATE_KEY, JSON.stringify(s));
  } catch {
    // best-effort
  }
}

// One pass over the signal log. Returns the list of anomalies that fired
// (so the caller can render them in a digest). Anti-fatigue suppression
// is applied internally.
export interface AnomalyDispatch {
  kind: SecuritySignalKind;
  hitsInWindow: number;
  threshold: number;
  windowMinutes: number;
  severity: 'low' | 'medium' | 'high';
  uniqueOrigins: number;
}

export function scanForAnomalies(opts?: {
  superAdminEmail?: string;
  superAdminUserId?: string;
  superAdminName?: string;
}): AnomalyDispatch[] {
  const signals = getSecuritySignals();
  if (signals.length === 0) return [];
  const now = Date.now();
  const state = readState();
  const fired: AnomalyDispatch[] = [];

  for (const config of THRESHOLDS) {
    const cutoff = now - config.windowMs;
    const inWindow = signals.filter(
      (s) => s.kind === config.kind && new Date(s.timestamp).getTime() >= cutoff,
    );
    if (inWindow.length < config.threshold) continue;

    // Anti-fatigue: skip if we already alerted for this kind within the
    // cooldown window.
    const lastTs = state.lastAlertedAt[config.kind];
    if (lastTs) {
      const sinceLast = now - new Date(lastTs).getTime();
      if (sinceLast < ALERT_COOLDOWN_MS) continue;
    }

    // Count unique origins to characterize "1 bot looping" vs "distributed"
    const origins = new Set(inWindow.map((s) => s.origin).filter(Boolean));

    const dispatch: AnomalyDispatch = {
      kind: config.kind,
      hitsInWindow: inWindow.length,
      threshold: config.threshold,
      windowMinutes: Math.round(config.windowMs / 60_000),
      severity: config.severity,
      uniqueOrigins: origins.size,
    };
    fired.push(dispatch);

    // Dispatch via configured channels
    dispatchAlert(dispatch, config, opts);

    // Record + persist that we alerted
    state.lastAlertedAt[config.kind] = new Date().toISOString();
  }

  if (fired.length > 0) writeState(state);
  return fired;
}

function dispatchAlert(
  dispatch: AnomalyDispatch,
  config: ThresholdConfig,
  opts?: { superAdminEmail?: string; superAdminUserId?: string; superAdminName?: string },
): void {
  const subject = `${severityLabel(dispatch.severity)}: ${humanKind(dispatch.kind)} spike detected`;
  const body = `Security anomaly detected:\n\n` +
    `  Type:           ${humanKind(dispatch.kind)}\n` +
    `  Severity:       ${dispatch.severity.toUpperCase()}\n` +
    `  Hits in window: ${dispatch.hitsInWindow} (threshold ${dispatch.threshold} in ${dispatch.windowMinutes}m)\n` +
    `  Unique origins: ${dispatch.uniqueOrigins} (1 = persistent bot · many = distributed attack)\n\n` +
    `Review the Security Center → live signals for full context.\n\n` +
    `This is an automated alert from the OCC Track anomaly detector.`;

  if (config.channels.includes('in_app') && opts?.superAdminUserId) {
    sendMessage({
      kind: 'leadership_broadcast',
      channel: 'in_app',
      to: opts.superAdminUserId,
      toName: opts.superAdminName ?? 'Super Admin',
      subject,
      body,
      link: '/security',
    });
  }
  if (config.channels.includes('email') && opts?.superAdminEmail) {
    sendMessage({
      kind: 'leadership_broadcast',
      channel: 'email',
      to: opts.superAdminEmail,
      toName: opts.superAdminName ?? 'Super Admin',
      subject,
      body,
    });
  }

  // Cross-link the anomaly itself in the security log so a Super Admin
  // looking at the Security Center timeline sees the alert event.
  logSecuritySignal(
    config.severity === 'high' ? 'token_bruteforce_lockout' : 'signup_throttled',
    `ANOMALY ALERT: ${dispatch.hitsInWindow} ${humanKind(dispatch.kind)} hits in ${dispatch.windowMinutes}m (${dispatch.uniqueOrigins} origins)`,
  );
}

function humanKind(kind: SecuritySignalKind): string {
  return {
    honeypot_filled: 'Honeypot trip',
    submit_too_fast: 'Too-fast submit',
    signup_throttled: 'Signup throttle',
    invalid_token: 'Invalid token',
    token_bruteforce_lockout: 'Magic-link brute-force',
    pii_reveal: 'PII reveal',
    pii_blur_restored: 'PII re-hidden',
  }[kind];
}

function severityLabel(s: 'low' | 'medium' | 'high'): string {
  return s === 'high' ? '🚨 CRITICAL' : s === 'medium' ? '⚠ Warning' : 'ℹ Notice';
}

// Background scanner — runs scanForAnomalies every 60s. Returns a cleanup
// function the caller (App root) should call on unmount.
export function startAnomalyWatcher(opts?: {
  superAdminEmail?: string;
  superAdminUserId?: string;
  superAdminName?: string;
}): () => void {
  if (typeof window === 'undefined') return () => {};
  const id = setInterval(() => scanForAnomalies(opts), 60_000);
  scanForAnomalies(opts); // first run immediately
  return () => clearInterval(id);
}

// Used by the audit signals page if it wants to expose a "Run scan now" button.
// Returns the count + each dispatch for display.
export function manuallyScan(opts?: {
  superAdminEmail?: string;
  superAdminUserId?: string;
  superAdminName?: string;
}): AnomalyDispatch[] {
  return scanForAnomalies(opts);
}

// Test/debug helper — also useful when a Super Admin wants to clear
// the cooldown state and re-test alerts.
export function resetAnomalyState(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(ANOMALY_STATE_KEY);
}

// Helper exported for the Security Center page to render a small
// "next alert eligible in X minutes" indicator per kind.
export function getCooldownStatus(): Array<{ kind: SecuritySignalKind; cooldownSecondsRemaining: number }> {
  const state = readState();
  const now = Date.now();
  const out: Array<{ kind: SecuritySignalKind; cooldownSecondsRemaining: number }> = [];
  for (const [kind, ts] of Object.entries(state.lastAlertedAt)) {
    if (!ts) continue;
    const sinceLast = now - new Date(ts).getTime();
    const remaining = ALERT_COOLDOWN_MS - sinceLast;
    if (remaining > 0) {
      out.push({
        kind: kind as SecuritySignalKind,
        cooldownSecondsRemaining: Math.ceil(remaining / 1000),
      });
    }
  }
  return out;
}

// Re-export the signal type for consumers.
export type { SecuritySignal };
