// App mode — the most critical data-integrity primitive in the platform.
//
// Two modes:
//   - \'production\': shoebox + carton entry is READ-ONLY. Nothing the
//                     greeter or admin enters changes the tallies. Used
//                     during real Collection Week and for everyday
//                     demonstration to leadership.
//   - \'test\':       full read-write. Used during training, demos with
//                     synthetic data, and unit tests. Everything entered
//                     is clearly tagged as testing data in the audit log.
//
// Why default to \'production\': a fresh install / fresh browser session
// starts in the SAFE state. Bad data getting into a real tally is much
// worse than a real user being briefly blocked from entering data.
// Super Admin must explicitly flip the switch (and the flip itself is
// audited + announced).
//
// In a real production deploy, this flag would live on a backend with
// server-side enforcement — frontend gates are bypassable. The audit log
// captures every mode flip + every blocked write attempt so leadership
// can spot tampering.

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { logAuditEvent } from './auditLog';
import type { User } from '@/data/mockData';

export type AppMode = 'production' | 'test';

export const APP_MODE_KEY = 'occ:app-mode';
export const APP_MODE_HISTORY_KEY = 'occ:app-mode-history';

// ── Audit-trail record of every mode change ───────────────────────────────
export interface ModeChangeRecord {
  id: string;
  from: AppMode;
  to: AppMode;
  actorId: string;
  actorName: string;
  timestamp: string;
  reason?: string;
}

function readModeHistory(): ModeChangeRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(APP_MODE_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeModeHistory(records: ModeChangeRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(APP_MODE_HISTORY_KEY, JSON.stringify(records.slice(0, 200)));
  } catch (e) {
    console.error('[OCC appMode]', e);
    // best-effort
  }
}

export function getModeHistory(): ModeChangeRecord[] {
  return readModeHistory();
}

// ── Mode read ─────────────────────────────────────────────────────────────
// Default \'production\' — see comment at top of file for rationale.
export function getCurrentMode(): AppMode {
  if (typeof window === 'undefined') return 'production';
  try {
    const raw = window.localStorage.getItem(APP_MODE_KEY);
    return raw === 'test' ? 'test' : 'production';
  } catch {
    return 'production';
  }
}

export function isTestMode(): boolean {
  return getCurrentMode() === 'test';
}

export function isProductionMode(): boolean {
  return getCurrentMode() === 'production';
}

// ── Imperative guards for non-React call sites ────────────────────────────
// Use this in event handlers (e.g. CheckIn form onSubmit) to bail early
// when the user is in production mode but attempting a write.
export function requireTestMode(action: string): boolean {
  if (isTestMode()) return true;
  // Log the blocked attempt so admins can see if a greeter has been
  // hammering "Save" without realizing the mode is wrong.
  if (typeof window !== 'undefined') {
    try {
      const existing = JSON.parse(window.localStorage.getItem('occ:mode-blocks') ?? '[]');
      existing.unshift({
        action,
        timestamp: new Date().toISOString(),
      });
      window.localStorage.setItem('occ:mode-blocks', JSON.stringify(existing.slice(0, 100)));
    } catch (e) {
      console.error('[OCC appMode]', e);
      // best-effort
    }
  }
  return false;
}

// ── React context for live updates ────────────────────────────────────────
interface AppModeContext {
  mode: AppMode;
  setMode: (next: AppMode, actor: User | null, reason?: string) => void;
  isTest: boolean;
  isProduction: boolean;
  history: ModeChangeRecord[];
}

const Ctx = createContext<AppModeContext | null>(null);

export function AppModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<AppMode>(() => getCurrentMode());
  const [history, setHistory] = useState<ModeChangeRecord[]>(() => readModeHistory());

  // Sync mode changes across tabs via the storage event.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (e: StorageEvent) => {
      if (e.key === APP_MODE_KEY) {
        setModeState(getCurrentMode());
      }
      if (e.key === APP_MODE_HISTORY_KEY) {
        setHistory(readModeHistory());
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const setMode = useCallback((next: AppMode, actor: User | null, reason?: string) => {
    const previous = getCurrentMode();
    if (previous === next) return;
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(APP_MODE_KEY, next);
    } catch (e) {
      console.error('[OCC appMode]', e);
      // best-effort
    }
    setModeState(next);

    // Record + persist the change in the mode-change ledger.
    const record: ModeChangeRecord = {
      id:
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `mc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      from: previous,
      to: next,
      actorId: actor?.id ?? 'unknown',
      actorName: actor?.name ?? 'Unknown actor',
      timestamp: new Date().toISOString(),
      reason,
    };
    const nextHistory = [record, ...readModeHistory()].slice(0, 200);
    writeModeHistory(nextHistory);
    setHistory(nextHistory);

    // Cross-link to the audit log so the timeline of who-did-what
    // includes mode flips alongside PII access events.
    if (actor) {
      logAuditEvent(
        { id: actor.id, name: actor.name, role: actor.role },
        'switch_app_mode',
        'app-mode',
        `Switched app mode: ${previous.toUpperCase()} → ${next.toUpperCase()}${reason ? ` (${reason})` : ''}`,
      );
    }
  }, []);

  return (
    <Ctx.Provider
      value={{
        mode,
        setMode,
        isTest: mode === 'test',
        isProduction: mode === 'production',
        history,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAppMode(): AppModeContext {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAppMode must be used within AppModeProvider');
  return v;
}
