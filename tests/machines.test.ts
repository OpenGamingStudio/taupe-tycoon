import { describe, expect, it } from 'vitest';
import { MACHINE_KINDS, drawMachine, drawPerm, shownMachines, tierOf, type Pen } from '../src/machines';
import { GENS, MILESTONES } from '../src/config';

function pen() {
  const calls: { c: string; a: number; x: number; y: number; w: number; h: number }[] = [];
  const g: Pen = { fillStyle: '', globalAlpha: 1, fillRect(x, y, w, h) { calls.push({ c: String(g.fillStyle), a: g.globalAlpha, x, y, w, h }); } };
  return { g, calls };
}

describe('machines du décor', () => {
  it('le palier suit les paliers de production', () => {
    expect([0, 1, 9, 10, 24, 25, 49, 50, 99, 100, 500].map(tierOf)).toEqual([0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4]);
    expect(MILESTONES).toEqual([10, 25, 50, 100]);
  });
  it('au moins un exemplaire par type possédé, jamais plus que le nombre réel ni que la place', () => {
    expect(shownMachines(0, 5)).toBe(0);
    expect(shownMachines(1, 5)).toBe(1);
    expect(shownMachines(3, 1)).toBe(1);
    for (const n of [2, 10, 100, 1e6]) { const s = shownMachines(n, 4); expect(s).toBeGreaterThanOrEqual(1); expect(s).toBeLessThanOrEqual(Math.min(n, 4)); }
  });
  it('chaque machine a un type de bâtiment et un dessin qui change dans le temps', () => {
    expect(MACHINE_KINDS.map((k) => GENS[k].id)).toEqual(['foreuse', 'machine', 'mine', 'excavatrice']);
    for (const k of MACHINE_KINDS) {
      const a = pen(), b = pen();
      drawMachine(a.g, k, 10, 40, 0, 0, false); drawMachine(b.g, k, 10, 40, 0.9, 0, false);
      expect(a.calls.length).toBeGreaterThan(10);
      expect(JSON.stringify(a.calls)).not.toBe(JSON.stringify(b.calls));
    }
  });
  it('mouvement réduit : image fixe ; les paliers ajoutent des éléments', () => {
    for (const k of MACHINE_KINDS) {
      const a = pen(), b = pen();
      drawMachine(a.g, k, 10, 40, 0, 0, true); drawMachine(b.g, k, 10, 40, 7.3, 0, true);
      expect(JSON.stringify(a.calls)).toBe(JSON.stringify(b.calls));
      const t0 = pen(), t4 = pen();
      drawMachine(t0.g, k, 10, 40, 0, 0, true); drawMachine(t4.g, k, 10, 40, 0, 4, true);
      expect(t4.calls.length).toBeGreaterThan(t0.calls.length);
    }
  });
  it('aucun dégradé, pas de sortie de canvas inutile, et rien à dessiner à niveau 0 pour un bonus', () => {
    for (const k of MACHINE_KINDS) { const p = pen(); drawMachine(p.g, k, 5, 30, 1.2, 3, false, 0.5, 1); expect(p.calls.every((c) => /^#[0-9a-f]{3,6}$/i.test(c.c))).toBe(true); }
    for (let id = 0; id < 4; id++) {
      const z = pen(); drawPerm(z.g, id, 0, 0, 20, 0, false); expect(z.calls).toHaveLength(0);
      const lo = pen(), hi = pen(); drawPerm(lo.g, id, 1, 0, 20, 0, true); drawPerm(hi.g, id, 10, 0, 20, 0, true);
      expect(lo.calls.length).toBeGreaterThan(0); expect(hi.calls.length).toBeGreaterThanOrEqual(lo.calls.length);
    }
  });
});
