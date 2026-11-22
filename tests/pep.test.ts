import { describe, expect, it } from 'vitest';
import { newState } from '../src/sim';
import { play } from '../tools/play';

describe('pépites : courbe simulée', () => {
  it('1er bonus vers 5-20 min, 2e vers 15-30 min, 3e vers 45-62 min, gain régulier ensuite', () => {
    const s = newState();
    const log: { t: number; n: number }[] = [];
    const pol = { perms: [0, 2, 1], nuggets: true, bonuses: true, pepLog: log } as any;
    const earned: Record<number, number> = {};
    for (let m = 5; m <= 120; m += 5) { play(s, 300, true, 99, pol); earned[m] = s.pepEarned; }
    const at = log.map((l) => l.t / 60);
    expect(at[0]).toBeGreaterThanOrEqual(3); expect(at[0]).toBeLessThanOrEqual(20);
    expect(at[1]).toBeGreaterThanOrEqual(15); expect(at[1]).toBeLessThanOrEqual(30);
    expect(at[2]).toBeGreaterThanOrEqual(45); expect(at[2]).toBeLessThanOrEqual(62);
    expect(earned[120]).toBeGreaterThan(earned[30]);
    expect(earned[120]).toBeLessThan(250);
  });
});
