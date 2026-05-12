import { describe, expect, it } from 'vitest';
import { getFirstName, getInitials } from '@/lib/name';

describe('getFirstName', () => {
  it('returns the single token when given one name', () => {
    expect(getFirstName('Madonna')).toBe('Madonna');
  });

  it('returns the first token for simple two-word names', () => {
    expect(getFirstName('Jane Doe')).toBe('Jane');
  });

  it('strips honorifics (audit P1.7)', () => {
    expect(getFirstName('Dr. Maria Rodriguez')).toBe('Maria');
    expect(getFirstName('Mrs. Sarah Chen')).toBe('Sarah');
    expect(getFirstName('Rev. James Henderson')).toBe('James');
    expect(getFirstName('Sra. Ana Pérez')).toBe('Ana');
  });

  it('preserves compound Hispanic given names', () => {
    expect(getFirstName('Maria José García')).toBe('Maria José');
    expect(getFirstName('Juan Antonio Pérez')).toBe('Juan Antonio');
    expect(getFirstName('María José Sánchez Ruiz')).toBe('María José');
  });

  it('does NOT preserve compound when 2nd token isn\'t a compound-given-name', () => {
    // "Sarah" is not in the compound list — should return just "John"
    expect(getFirstName('John Sarah Smith')).toBe('John');
  });

  it('handles empty + null + undefined gracefully', () => {
    expect(getFirstName('')).toBe('');
    expect(getFirstName(null)).toBe('');
    expect(getFirstName(undefined)).toBe('');
    expect(getFirstName('   ')).toBe('');
  });

  it('trims surrounding whitespace', () => {
    expect(getFirstName('  Jane Doe  ')).toBe('Jane');
  });
});

describe('getInitials', () => {
  it('returns first+last initial for two-word names', () => {
    expect(getInitials('Jane Doe')).toBe('JD');
  });

  it('returns first letter for single names', () => {
    expect(getInitials('Madonna')).toBe('M');
  });

  it('returns first + LAST initial for 3+ word names (not middle)', () => {
    expect(getInitials('Maria José García')).toBe('MG');
  });

  it('strips honorifics before computing', () => {
    expect(getInitials('Dr. Maria Rodriguez')).toBe('MR');
  });

  it('fallback for empty/null/undefined', () => {
    expect(getInitials('')).toBe('?');
    expect(getInitials(null)).toBe('?');
    expect(getInitials(undefined)).toBe('?');
  });

  it('always returns uppercase', () => {
    expect(getInitials('jane doe')).toBe('JD');
  });
});
