import { describe, expect, it, vi } from 'vitest';
import { safeJsonParse } from '@/lib/safeJson';

describe('safeJsonParse', () => {
  it('parses valid JSON', () => {
    expect(safeJsonParse('{"a":1}', {})).toEqual({ a: 1 });
    expect(safeJsonParse('[1,2,3]', [])).toEqual([1, 2, 3]);
  });

  it('returns fallback on null/undefined input', () => {
    expect(safeJsonParse(null, [])).toEqual([]);
    expect(safeJsonParse(undefined, [])).toEqual([]);
  });

  it('returns fallback on corrupted JSON', () => {
    // Mute the console.warn while we exercise the error path
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(safeJsonParse('{{{{ not json', [])).toEqual([]);
    expect(safeJsonParse('[1,2,', [])).toEqual([]);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('returns fallback when parsed value is null', () => {
    expect(safeJsonParse('null', { default: true })).toEqual({ default: true });
  });

  it('preserves typed fallback shape', () => {
    const result = safeJsonParse<{ count: number }>(undefined, { count: 0 });
    expect(result.count).toBe(0);
  });
});
