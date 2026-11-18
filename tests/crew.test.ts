import { describe, expect, it } from 'vitest';
import { crewCap, distribute } from '../src/crew-math';

describe('équipe de fond', () => {
  it('sous le plafond, une taupe affichée par taupe réelle', () => {
    expect(distribute([3, 2, 0, 0, 0, 0], 20)).toEqual([3, 2, 0, 0, 0, 0]);
  });
  it('au-delà, regroupe : plafond respecté, chaque type possédé reste visible', () => {
    const c = [500, 40, 3, 1, 0, 0];
    const d = distribute(c, 14);
    expect(d.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(14);
    expect(d.reduce((a, b) => a + b, 0)).toBeGreaterThanOrEqual(12);
    d.forEach((n, i) => { expect(n > 0).toBe(c[i] > 0); expect(n).toBeLessThanOrEqual(c[i]); });
  });
  it('jamais plus de taupes affichées que de taupes réelles, même avec des millions', () => {
    const c = [2e6, 5e5, 1e5, 1e4, 100, 1];
    const d = distribute(c, 24);
    expect(d.reduce((a, b) => a + b, 0)).toBe(24);
    expect(d[5]).toBe(1);
  });
  it('le plafond suit la taille de la scène', () => {
    expect(crewCap(110, 110)).toBeLessThan(crewCap(250, 220));
    expect(crewCap(10, 10)).toBeGreaterThanOrEqual(6);
    expect(crewCap(1000, 1000)).toBe(24);
  });
});
