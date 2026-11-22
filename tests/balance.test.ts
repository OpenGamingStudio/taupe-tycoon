import { describe, expect, it } from 'vitest';
import { GENS, PERMS } from '../src/config';
import { State, newState, perSecond, startDirt } from '../src/sim';
import { DEFAULT_POLICY, play } from '../tools/play';

/** Joue un run complet jusqu'au premier rebirth et renvoie les achats par bâtiment. */
const firstRun = (nuggets: boolean) => {
  const s = newState();
  const log = play(s, 8 * 3600, true, 1, { perms: DEFAULT_POLICY.perms, nuggets });
  return { log, bought: (log as any).bought as Record<string, number> };
};

describe('courbe de progression', () => {
  it('premier rebirth : 18-35 min avec pépites, moins de 60 min sans aucune pépite', () => {
    const a = firstRun(true).log[0].t / 60;
    const b = firstRun(false).log[0].t / 60;
    expect(a).toBeGreaterThanOrEqual(18); expect(a).toBeLessThanOrEqual(35);
    expect(b).toBeGreaterThan(a); expect(b).toBeLessThan(60);
  });
  it('les pépites aident sans être obligatoires (moins de ×2 sur le premier run)', () => {
    expect(firstRun(false).log[0].t / firstRun(true).log[0].t).toBeLessThan(2);
  });
  it('aucun palier mort : chaque bâtiment et la pelle sont achetés avant le premier rebirth', () => {
    const { bought } = firstRun(true);
    for (let i = 0; i < GENS.length; i++) expect(bought[String(i)] ?? 0, GENS[i].id).toBeGreaterThanOrEqual(3);
    expect(bought.shovel).toBeGreaterThan(5);
  });
  it('aucun achat dominant : aucun bâtiment ne fait plus de 40 % des achats, aucun moins de 3 %', () => {
    const { bought } = firstRun(true);
    const gens = GENS.map((_, i) => bought[String(i)] ?? 0);
    const sum = gens.reduce((a, b) => a + b, 0);
    for (const n of gens) { expect(n / sum).toBeLessThan(0.4); expect(n / sum).toBeGreaterThan(0.03); }
  });
});

describe('objets permanents (3 h de jeu, 5 politiques)', () => {
  const run = (order: number[]) => { const s = newState(); play(s, 3 * 3600, true, 99, { perms: order, nuggets: true }); return s; };
  const lun = run([0]), pelle = run([1]), pec = run([2]), none = run([3]);
  it('chaque objet utile bat l\'absence d\'achat utile', () => {
    for (const s of [lun, pelle, pec]) expect(s.lifeTotal).toBeGreaterThan(none.lifeTotal * 1.5);
  });
  it('aucun ne domine : le meilleur seul fait moins de 4 fois le plus faible', () => {
    const v = [lun, pelle, pec].map((s) => s.gemsEarned);
    expect(Math.max(...v) / Math.min(...v)).toBeLessThan(4);
  });
  it('mélanger bat chacun seul (rendements décroissants par objet)', () => {
    const mix = run([0, 2, 1]);
    for (const s of [lun, pelle, pec]) expect(mix.lifeTotal).toBeGreaterThan(s.lifeTotal);
  });
});

describe('rebirth : récompense sans casser', () => {
  it('la production de départ d\'un run après rebirth reste très inférieure à celle de fin de run précédent', () => {
    const s: State = newState();
    play(s, 2 * 3600, true, 6);
    expect(s.rebirths).toBe(6);
    expect(startDirt(s)).toBeGreaterThanOrEqual(0);
    expect(perSecond(s)).toBeLessThan(1e6); // juste après un rebirth : tout bâtiment est à zéro
  });
  it('les runs raccourcissent mais jamais sous 30 s (pas de boucle de rebirth instantanée)', () => {
    const log = play(newState(), 6 * 3600, true, 25);
    expect(log.length).toBe(25);
    for (const l of log) expect(l.t).toBeGreaterThan(30);
  });
  it('le pécule donne 20 s de production précédente par niveau, avec un plancher plafonné au niveau 5', () => {
    const s = newState(); s.perms[2] = 12; s.lastPs = 1e6;
    expect(startDirt(s)).toBe(20 * 12 * 1e6);
    s.lastPs = 0; expect(startDirt(s)).toBe(1000 * 4 ** 4);
    s.perms[2] = 1; expect(startDirt(s)).toBe(1000);
    expect(PERMS[2].max).toBe(12);
  });
});
