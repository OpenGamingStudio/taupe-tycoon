import { describe, expect, it } from 'vitest';
import { isNewer } from '../src/update';

describe('mise à jour', () => {
  it('détecte une construction différente', () => {
    expect(isNewer('abc', { version: '2.3.0', build: 'xyz' })).toBe(true);
    expect(isNewer('abc', { build: 'abc' })).toBe(false);
  });
  it('ignore les réponses invalides et le mode dev', () => {
    expect(isNewer('abc', null)).toBe(false);
    expect(isNewer('abc', { build: 42 })).toBe(false);
    expect(isNewer('abc', { build: '' })).toBe(false);
    expect(isNewer('abc', { build: 'x'.repeat(50) })).toBe(false);
    expect(isNewer('dev', { build: 'xyz' })).toBe(false);
  });
});
