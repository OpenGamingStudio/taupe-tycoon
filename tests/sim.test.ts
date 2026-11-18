import { describe, expect, it } from 'vitest';
import { GENS } from '../src/config';
import { applyOffline, buy, click, clickPower, genProd, costOf, maxAffordable, newState, perSecond, rebirth, rebirthGain, tick } from '../src/sim';
import { fmt as fmtRaw, fmtPct as fmtPctRaw } from '../src/format';
const fmtPct = (n: number, l: string) => fmtPctRaw(n, l);
const fmt = (n: number, l: string) => fmtRaw(n, l).replace(/\u00a0/g, ' ');
import { sanitize } from '../src/save';
import { play } from '../tools/play';

describe('coûts', () => {
  it('maxAffordable est cohérent avec costOf', () => {
    for (const budget of [15, 100, 1e4, 1e9]) {
      const n = maxAffordable(15, 3, budget);
      expect(costOf(15, 3, n)).toBeLessThanOrEqual(budget * (1 + 1e-9));
      expect(costOf(15, 3, n + 1)).toBeGreaterThan(budget);
    }
  });
  it('achat : débite et monte le niveau', () => {
    const s = newState(); s.dirt = 400;
    expect(buy(s, 0, 1)).toBe(1);
    expect(s.gens[0]).toBe(1);
    expect(s.dirt).toBeCloseTo(250);
    expect(buy(s, 1, 1)).toBe(0);
  });
});

describe('débuts rapides', () => {
  it('premier achat en moins de 6 s de clics à 4/s', () => {
    const s = newState(); let t = 0;
    while (s.gens[0] === 0 && t < 30) { for (let i = 0; i < 4; i++) click(s); tick(s, 1); t++; buy(s, 0, 1); }
    expect(t).toBeLessThanOrEqual(6);
  });
});

describe('équilibrage (joueur simulé : 4 clics/s, meilleur remboursement)', () => {
  it('premier rebirth entre 18 et 35 min, runs suivants plus courts', () => {
    const log = play(newState(), 8 * 3600, true, 10);
    expect(log.length).toBe(10);
    const m = log.map((l) => l.t / 60);
    expect(m[0]).toBeGreaterThanOrEqual(18);
    expect(m[0]).toBeLessThanOrEqual(35);
    for (let i = 1; i < m.length; i++) expect(m[i]).toBeLessThan(m[i - 1] * 1.6);
    expect(m[5]).toBeLessThan(m[0] * 0.7);
    expect(m[9]).toBeLessThan(m[2]);
  });
  it('sans rebirth : mur de progression (la production plafonne)', () => {
    const s = newState();
    play(s, 3600, false); const p1 = perSecond(s);
    play(s, 3600, false); const p2 = perSecond(s);
    expect(p2 / p1).toBeLessThan(4);
    play(s, 4 * 3600, false);
    expect(perSecond(s) / p2).toBeLessThan(12);
  });
  it('rebirth indispensable : après 4 h, jouer avec rebirth rapporte plus de 10 fois plus', () => {
    const a = newState(); play(a, 4 * 3600, false);
    const b = newState(); play(b, 4 * 3600, true);
    expect(b.lifeTotal).toBeGreaterThan(a.lifeTotal * 10);
  });
});

describe('rebirth', () => {
  it('sans gemme possible, rien ne change', () => {
    const s = newState(); s.runTotal = 10; expect(rebirth(s)).toBe(0); expect(s.rebirths).toBe(0);
  });
  it('réinitialise le run et garde les gemmes', () => {
    const s = newState(); s.runTotal = 1e10; s.dirt = 5; s.gens[0] = 9; s.shovel = 4;
    const g = rebirthGain(s); expect(g).toBeGreaterThan(1);
    expect(rebirth(s)).toBe(g);
    expect(s.gems).toBe(g); expect(s.gens.every((x) => x === 0)).toBe(true); expect(s.shovel).toBe(0);
    expect(clickPower(s)).toBeGreaterThan(10);
  });
});

describe('hors-ligne', () => {
  it('est plafonné à 2 h', () => {
    const s = newState(); s.gens[0] = 10;
    const r = applyOffline(s, 99 * 3600);
    expect(r.seconds).toBe(7200);
    expect(r.gain).toBeCloseTo(perSecond(s) * 7200, 3);
    expect(GENS.length).toBeGreaterThan(0);
  });
});

describe('format : aucun nombre à virgule', () => {
  it('entiers, espaces entre milliers, K/M/B sans décimale', () => {
    expect(fmt(0, 'fr')).toBe('0');
    expect(fmt(0.3, 'fr')).toBe('0');
    expect(fmt(2.5, 'fr')).toBe('3');
    expect(fmt(999, 'en')).toBe('999');
    expect(fmt(1200, 'fr')).toBe('1 200');
    expect(fmt(9999.4, 'en')).toBe('9 999');
    expect(fmt(12345, 'fr')).toBe('12K');
    expect(fmt(999999, 'fr')).toBe('999K');
    expect(fmt(1.9e6, 'fr')).toBe('1 900K');
    expect(fmt(12.4e6, 'en')).toBe('12M');
    expect(fmt(3e9, 'en')).toBe('3 000M');
    expect(fmt(7e12, 'en')).toBe('7 000B');
    expect(fmt(1e40, 'en')).toBe('10 000 000Dc');
    expect(fmt(Infinity, 'en')).toBe('∞');
    expect(fmt(NaN, 'en')).toBe('0');
  });
  it('jamais de séparateur décimal, quelle que soit la valeur', () => {
    for (let i = 0; i < 400; i++) {
      const n = Math.random() * Math.pow(10, Math.random() * 40);
      for (const l of ['fr', 'en']) expect(fmt(n, l)).toMatch(/^\d[\d ]*[A-Za-z]{0,2}$/);
    }
  });
  it('pourcentages entiers', () => {
    expect(fmtPct(25, 'fr').replace(/\s/g, ' ')).toBe('+25 %');
    expect(fmtPct(181.25, 'en')).toBe('+181%');
  });
  it('toutes les valeurs affichées par le jeu sont entières (échantillon d\'états)', () => {
    const s = newState(); s.gemsEarned = 3; s.shovel = 7; s.gens = [4, 3, 2, 1, 1, 1]; s.perms = [2, 1, 1, 0];
    for (const v of [clickPower(s), perSecond(s), ...GENS.map((_, i) => genProd(s, i)), s.dirt, rebirthGain(s)]) {
      expect(fmt(v, 'fr')).not.toMatch(/[.,]/);
    }
  });
});

describe('sauvegarde', () => {
  it('rejette ou nettoie les données invalides', () => {
    expect(sanitize(null)).toBeNull();
    const r = sanitize({ s: { dirt: -5, gens: [1, 'x', NaN], gems: Infinity }, at: 1e20 });
    expect(r!.s.dirt).toBe(0); expect(r!.s.gens.length).toBe(GENS.length); expect(r!.s.gens[1]).toBe(0);
    expect(r!.s.gems).toBe(0); expect(r!.at).toBeLessThanOrEqual(Date.now());
  });
});
