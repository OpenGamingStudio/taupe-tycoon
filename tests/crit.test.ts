import { describe, expect, it } from 'vitest';
import { clickPower, clickRoll, newState } from '../src/sim';

describe('clic critique', () => {
  it('~10 % de critiques sur 10000 tirages', () => {
    const s = newState();
    let n = 0;
    for (let i = 0; i < 10000; i++) if (clickRoll(s).crit) n++;
    expect(n).toBeGreaterThan(800); expect(n).toBeLessThan(1200);
  });
  it('RNG injecté : seuil strict à 0,1', () => {
    expect(clickRoll(newState(), () => 0.0999).crit).toBe(true);
    expect(clickRoll(newState(), () => 0.1).crit).toBe(false);
  });
  it('double le gain, entier, et le crédite', () => {
    const s = newState(); s.shovel = 7;
    const base = clickPower(s), d0 = s.dirt;
    const r = clickRoll(s, () => 0);
    expect(r.gain).toBe(Math.round(base * 2));
    expect(Number.isInteger(r.gain)).toBe(true);
    expect(s.dirt - d0).toBe(r.gain);
    expect(clickRoll(s, () => 0.5).gain).toBe(clickPower(s));
  });
  it('se cumule avec le génie (×5) et le turbo : ×10 et ×20', () => {
    const s = newState(); const base = clickPower(s);
    s.genius = 10;
    expect(clickRoll(s, () => 0).gain).toBe(Math.round(base * 10));
    s.turbo = 10;
    expect(clickRoll(s, () => 0).gain).toBe(Math.round(base * 20));
  });
});
