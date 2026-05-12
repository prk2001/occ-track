import { beforeEach, describe, expect, it } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { AppModeProvider, useAppMode, getCurrentMode, isTestMode, isProductionMode, requireTestMode, getModeHistory, APP_MODE_KEY } from '@/lib/appMode';
import type { ReactNode } from 'react';
import type { User } from '@/data/mockData';

const wrapper = ({ children }: { children: ReactNode }) => <AppModeProvider>{children}</AppModeProvider>;
const superAdmin: User = { id: 'u0', name: 'Franklin Graham', email: 'fg@sp.org', role: 'super_admin' };

describe('appMode', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  describe('getCurrentMode', () => {
    it('defaults to production when nothing stored', () => {
      expect(getCurrentMode()).toBe('production');
      expect(isProductionMode()).toBe(true);
      expect(isTestMode()).toBe(false);
    });

    it('returns test when explicitly stored', () => {
      window.localStorage.setItem(APP_MODE_KEY, 'test');
      expect(getCurrentMode()).toBe('test');
      expect(isTestMode()).toBe(true);
    });

    it('falls back to production for any unrecognized value', () => {
      window.localStorage.setItem(APP_MODE_KEY, 'malicious-payload');
      expect(getCurrentMode()).toBe('production');
    });
  });

  describe('requireTestMode', () => {
    it('returns false in production and records the block', () => {
      const allowed = requireTestMode('add-shoebox');
      expect(allowed).toBe(false);
      const blocks = JSON.parse(window.localStorage.getItem('occ:mode-blocks') ?? '[]');
      expect(blocks).toHaveLength(1);
      expect(blocks[0].action).toBe('add-shoebox');
    });

    it('returns true in test mode', () => {
      window.localStorage.setItem(APP_MODE_KEY, 'test');
      expect(requireTestMode('add-shoebox')).toBe(true);
      // No block recorded for allowed actions
      const blocks = JSON.parse(window.localStorage.getItem('occ:mode-blocks') ?? '[]');
      expect(blocks).toHaveLength(0);
    });
  });

  describe('useAppMode + setMode', () => {
    it('starts in production', () => {
      const { result } = renderHook(() => useAppMode(), { wrapper });
      expect(result.current.mode).toBe('production');
      expect(result.current.isProduction).toBe(true);
    });

    it('setMode persists + appends to history', () => {
      const { result } = renderHook(() => useAppMode(), { wrapper });
      act(() => {
        result.current.setMode('test', superAdmin, 'training session');
      });
      expect(result.current.mode).toBe('test');
      expect(result.current.isTest).toBe(true);
      // History records the change
      const history = getModeHistory();
      expect(history).toHaveLength(1);
      expect(history[0].from).toBe('production');
      expect(history[0].to).toBe('test');
      expect(history[0].actorName).toBe('Franklin Graham');
      expect(history[0].reason).toBe('training session');
    });

    it('setMode is idempotent when the target mode is already active', () => {
      const { result } = renderHook(() => useAppMode(), { wrapper });
      act(() => {
        result.current.setMode('production', superAdmin);
      });
      // No history because we were already in production
      expect(getModeHistory()).toHaveLength(0);
    });
  });
});
