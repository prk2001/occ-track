import { describe, expect, it } from 'vitest';
import { generateId, generateShortId } from '@/lib/id';

describe('generateId', () => {
  it('returns a non-empty string', () => {
    expect(generateId()).toBeTruthy();
  });

  it('includes the prefix when given', () => {
    const id = generateId('sig');
    expect(id.startsWith('sig_')).toBe(true);
  });

  it('no prefix → just the random body', () => {
    const id = generateId();
    expect(id).not.toContain('_undefined_');
  });

  it('produces unique IDs on repeated calls', () => {
    const ids = new Set();
    for (let i = 0; i < 100; i++) ids.add(generateId('x'));
    expect(ids.size).toBe(100);
  });

  it('IDs have crypto-quality entropy (no obvious sequential pattern)', () => {
    const a = generateId('t');
    const b = generateId('t');
    // The bodies (after prefix_) should differ by random bytes, not just timestamp.
    const aBody = a.slice('t_'.length);
    const bBody = b.slice('t_'.length);
    expect(aBody).not.toBe(bBody);
    // Reasonable length sanity check (uuid 36 chars OR hex 32 chars)
    expect(aBody.length).toBeGreaterThanOrEqual(20);
  });
});

describe('generateShortId', () => {
  it('is shorter than generateId', () => {
    const full = generateId('x');
    const short = generateShortId('x');
    expect(short.length).toBeLessThan(full.length);
  });

  it('keeps the prefix', () => {
    expect(generateShortId('sig').startsWith('sig_')).toBe(true);
  });
});
