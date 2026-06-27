import { describe, it, expect } from 'vitest';
import { trim, toUiAmount, getFormattedDate } from './utils';

describe('trim', () => {
  it('returns empty string unchanged', () => {
    expect(trim('', '/')).toBe('');
  });

  it('strips a single leading and trailing char', () => {
    expect(trim('/foo/', '/')).toBe('foo');
  });

  it('strips multiple repeated chars from both ends', () => {
    expect(trim('///foo///', '/')).toBe('foo');
  });

  it('does not strip when char is absent', () => {
    expect(trim('foo', '/')).toBe('foo');
  });

  it('strips only the specified char, leaving others intact', () => {
    expect(trim('/foo/bar/', '/')).toBe('foo/bar');
  });

  it('returns the original string when no char is given', () => {
    expect(trim('  hello  ')).toBe('  hello  ');
  });

  it('returns empty string when the entire string is the strip char', () => {
    expect(trim('///', '/')).toBe('');
  });
});

describe('getFormattedDate', () => {
  it('formats a valid date as a short-month string', () => {
    const result = getFormattedDate(new Date('2026-06-14T00:00:00Z'));
    expect(typeof result).toBe('string');
    expect(result).toContain('2026');
  });

  it('returns empty string for a falsy value', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(getFormattedDate(null as any)).toBe('');
  });
});

describe('toUiAmount', () => {
  it('returns numeric 0 for a falsy input (documents the type inconsistency)', () => {
    expect(toUiAmount(0)).toBe(0);
    expect(typeof toUiAmount(0)).toBe('number');
  });

  it('formats sub-thousand values as plain integers', () => {
    expect(toUiAmount(1)).toBe('1');
    expect(toUiAmount(999)).toBe('999');
    expect(toUiAmount(500)).toBe('500');
  });

  it('formats thousands as K with one decimal when not whole', () => {
    expect(toUiAmount(1500)).toBe('1.5K');
    expect(toUiAmount(1100)).toBe('1.1K');
  });

  it('formats whole thousands as K without decimal', () => {
    expect(toUiAmount(1000)).toBe('1K');
    expect(toUiAmount(2000)).toBe('2K');
  });

  it('formats millions as M with one decimal when not whole', () => {
    expect(toUiAmount(1500000)).toBe('1.5M');
  });

  it('formats whole millions as M without decimal', () => {
    expect(toUiAmount(1000000)).toBe('1M');
    expect(toUiAmount(2000000)).toBe('2M');
  });

  it('formats billions as B with one decimal when not whole', () => {
    expect(toUiAmount(1500000000)).toBe('1.5B');
  });

  it('formats whole billions as B without decimal', () => {
    expect(toUiAmount(1000000000)).toBe('1B');
  });
});
