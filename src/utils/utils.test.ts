import { describe, it, expect } from 'vitest';
import { trim } from './utils';

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
