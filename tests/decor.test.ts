import { describe, expect, it } from 'vitest';
import { DAY_MS, DECOR, WX_MS, todAt, weatherAt } from '../src/decor';

describe('décor vivant', () => {
  it('le jour de jeu enchaîne jour, soir, nuit, aube puis recommence', () => {
    expect([0, 119e3, 120e3, 149e3, 150e3, 209e3, 210e3, 239e3].map(todAt))
      .toEqual(['day', 'day', 'dusk', 'dusk', 'night', 'night', 'dawn', 'dawn']);
    expect(todAt(DAY_MS)).toBe('day');
    expect(todAt(-1)).toBe('dawn');
  });
  it('la météo couvre clair, pluie et neige sur un cycle', () => {
    const seen = new Set<string>();
    for (let t = 0; t < WX_MS; t += 10_000) seen.add(weatherAt(t));
    expect([...seen].sort()).toEqual(['clear', 'rain', 'snow']);
  });
  it('aplats seulement, créatures et couches présentes', () => {
    expect(DECOR).not.toMatch(/gradient/i);
    for (const c of ['d-bird', 'd-bfly', 'd-bat', 'd-flies', 'd-worm', 'd-rain', 'd-snow', 'd-c-far', 'd-c-near']) expect(DECOR).toContain(c);
  });
});
