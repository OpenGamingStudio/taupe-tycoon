import { describe, expect, it } from 'vitest';
import { newState } from '../src/sim';
import { play } from '../tools/play';

describe('pépites : courbe simulée', () => {
  it('premier bonus entre 5 et 20 min, gain régulier ensuite', () => {
    const s = newState();
    const log: { t: number; n: string }[] = [];
    const pol = { perms: [0, 2, 1], nuggets: true, bonuses: true, pepLog: log } as any;
    const earned: Record<number, number> = {};
    for (let m = 5; m <= 120; m += 5) { play(s, 300, true, 99, pol); earned[m] = s.pepEarned; }
    expect(log.length).toBeGreaterThan(0);
    const first = log[0].t / 60;
    expect(first).toBeGreaterThanOrEqual(5);
    expect(first).toBeLessThanOrEqual(20);
    expect(earned[120]).toBeGreaterThan(earned[30]);
    expect(earned[120]).toBeLessThan(200);
  });
});
