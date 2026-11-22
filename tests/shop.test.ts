import { describe, expect, it } from 'vitest';
import { BONUSES, GENS, PERMS, SHOVEL_TABLE, MILESTONE_TABLE } from '../src/config';
import { ALL_PERMS, play } from '../tools/play';
import { SAVE_VERSION, sanitize } from '../src/save';
import {
  State, baseCost, milestoneMult, bonusCd, bonusFacts, bonusOwned, bonusReady, buy, buyPerm, clickRaw, critChance, clickRoll, genProd, genProdAt, newState,
  nuggetDelayMult, perSecondBase, rebirth, tick, useBonus,
} from '../src/sim';

const NOW = 1_700_000_000_000;
const idx = (id: string) => PERMS.findIndex((p) => p.id === id);
const richState = () => { const s = newState(); s.gens = [30, 20, 10, 5, 2, 1]; s.shovel = 20; return s; };

/** Un achat « de palier » (qui franchit un seuil) est une aubaine : toujours plus fort que les achats voisins. Les autres doivent rester stables ou monter. */
describe('rendement par achat : jamais en baisse', () => {
  it('chaque bâtiment : le gain du niveau N+1 est >= celui du niveau N, de 1 à 700, quel que soit le multiplicateur global', () => {
    for (const mult of [0, 3, 9]) for (let i = 0; i < GENS.length; i++) {
      const s = newState(); s.gemsEarned = mult * 10; s.perms[0] = mult;
      let prev = 0;
      for (let L = 0; L < 700; L++) {
        const gain = genProdAt(s, i, L + 1) - genProdAt(s, i, L);
        expect(gain).toBeGreaterThan(0);
        if (milestoneMult(L + 1) > milestoneMult(L)) { expect(gain, `palier ${L + 1}`).toBeGreaterThan(prev); continue; }
        expect(gain, `${GENS[i].id} niveau ${L}`).toBeGreaterThanOrEqual(prev * (1 - 1e-9));
        prev = gain;
      }
    }
  });
  it('la pelle : le gain du niveau N+1 est >= celui du niveau N, de 0 à 700', () => {
    for (const gens of [[0, 0, 0, 0, 0, 0], [10, 5, 0, 0, 0, 0], [200, 150, 100, 50, 20, 5]]) {
      const s = newState(); s.gens = gens; s.perms[1] = 4;
      let prev = 0;
      for (let L = 0; L < 700; L++) {
        const gain = clickRaw(s, L + 1) - clickRaw(s, L);
        if (milestoneMult(L + 1, SHOVEL_TABLE) > milestoneMult(L, SHOVEL_TABLE)) { expect(gain, `palier ${L + 1}`).toBeGreaterThan(prev); continue; }
        expect(gain, `pelle niveau ${L}`).toBeGreaterThanOrEqual(prev * (1 - 1e-9));
        prev = gain;
      }
    }
  });
  it('acheter le niveau d\'un autre bâtiment ne baisse jamais le gain d\'un achat (bâtiments et pelle)', () => {
    const s = richState();
    for (let step = 0; step < 60; step++) {
      const k = step % GENS.length;
      const before = GENS.map((_, i) => genProdAt(s, i, s.gens[i] + 1) - genProd(s, i));
      const beforeShovel = clickRaw(s, s.shovel + 1) - clickRaw(s);
      s.gens[k]++;
      GENS.forEach((_, i) => { if (i !== k) expect(genProdAt(s, i, s.gens[i] + 1) - genProd(s, i)).toBeGreaterThanOrEqual(before[i] - 1e-9); });
      expect(clickRaw(s, s.shovel + 1) - clickRaw(s)).toBeGreaterThanOrEqual(beforeShovel - 1e-9);
    }
  });
  it('les paliers font monter le gain par niveau', () => {
    const s = newState();
    // gain d'un achat juste après le palier = gain d'un achat juste avant, × le multiplicateur du palier
    for (const [lv, m] of MILESTONE_TABLE) expect(genProdAt(s, 0, lv + 2) - genProdAt(s, 0, lv + 1)).toBeCloseTo((genProdAt(s, 0, lv - 1) - genProdAt(s, 0, lv - 2)) * m, 6);
  });
});

describe('bonus à recharge : achat unique, permanent', () => {
  it('sans achat, le bonus est refusé ; un achat suffit, un second est refusé', () => {
    const s = newState(); s.gems = 100;
    for (const b of BONUSES) {
      expect(bonusOwned(s, b.id)).toBe(false);
      expect(bonusReady(s, b.id, NOW)).toBe(false);
      expect(useBonus(s, b.id, NOW)).toBe(false);
      expect(buyPerm(s, idx(b.id))).toBe(true);
      expect(buyPerm(s, idx(b.id))).toBe(false);
      expect(s.perms[idx(b.id)]).toBe(1);
      expect(bonusOwned(s, b.id)).toBe(true);
      expect(PERMS[idx(b.id)].max).toBe(1);
    }
    const spent = 100 - s.gems;
    expect(spent).toBe(BONUSES.reduce((a, b) => a + PERMS[idx(b.id)].cost, 0));
  });
  it('reste acquis après un rebirth, une sauvegarde et un rechargement ; la recharge continue', () => {
    const s = richState(); s.gems = 50; s.runTotal = 1e13;
    for (const b of BONUSES) buyPerm(s, idx(b.id));
    expect(useBonus(s, 'turbo', NOW)).toBe(true);
    expect(rebirth(s)).toBeGreaterThan(0);
    for (const b of BONUSES) expect(bonusOwned(s, b.id)).toBe(true);
    const back = sanitize(JSON.parse(JSON.stringify({ v: SAVE_VERSION, s, at: NOW, opts: {} })))!.s;
    for (const b of BONUSES) expect(bonusOwned(back, b.id)).toBe(true);
    expect(back.perms[idx('auto')]).toBe(1);
  });
  it('migration : une sauvegarde antérieure à la v6 reçoit les trois bonus, une v6 sans achat ne les a pas', () => {
    const old = sanitize({ v: 5, at: NOW, s: { dirt: 10, perms: [0, 0, 0, 0] }, opts: {} })!;
    for (const b of BONUSES) expect(bonusOwned(old.s, b.id)).toBe(true);
    const fresh = sanitize({ v: 6, at: NOW, s: { dirt: 10, perms: [0, 0, 0, 0, 0, 0, 0] }, opts: {} })!;
    for (const b of BONUSES) expect(bonusOwned(fresh.s, b.id)).toBe(false);
    expect(old.s.perms[idx('lunettes')]).toBe(0); // rien d'autre n'est offert
  });
  it('infobulle : chiffres réels, entiers, qui suivent le niveau', () => {
    const a = richState(), b = richState(); b.gens = GENS.map(() => 100); b.perms[idx('thermos')] = 5; b.perms[idx('pelleor')] = 3; b.shovel = 60;
    for (const bn of BONUSES) {
      const fa = bonusFacts(a, bn.id), fb = bonusFacts(b, bn.id);
      for (const v of [fa.dur, fa.cd, fa.total, fa.each, fa.count]) expect(Number.isInteger(v)).toBe(true);
      expect(fb.total).toBeGreaterThan(fa.total);
      expect(fa.dur).toBe(bn.dur);
      expect(fa.cd).toBe(bn.cd);
      expect(fb.cd).toBeLessThan(fa.cd);
    }
    expect(bonusFacts(a, 'auto').total).toBeGreaterThan(0);
  });
});

describe('nouveaux objets : un effet distinct chacun', () => {
  it('Trèfle : plus de coups critiques, rien d\'autre', () => {
    const s = newState(); const base = critChance(s), cr = clickRoll(newState(), () => 0.15);
    s.perms[idx('trefle')] = 5;
    expect(critChance(s)).toBeCloseTo(base + 0.05, 9);
    expect(clickRoll(s, () => 0.15).crit).toBe(true);
    expect(cr.crit).toBe(false);
    expect(critChance(s) * 1).toBeLessThan(0.5);
  });
  it('Casque : bâtiments et pelle moins chers, jamais gratuits', () => {
    const s = newState(); const c0 = baseCost(s, 0), p0 = baseCost(s, -1);
    s.perms[idx('casque')] = PERMS[idx('casque')].max;
    expect(baseCost(s, 0)).toBeLessThan(c0); expect(baseCost(s, -1)).toBeLessThan(p0);
    expect(baseCost(s, 0)).toBeGreaterThan(c0 * 0.5);
    s.dirt = 1e6; const n = buy(s, 0, 1); expect(n).toBe(1);
  });
  it('Aimant : pépites plus fréquentes ; Thermos : recharge plus courte', () => {
    const s = newState();
    s.perms[idx('aimant')] = 10; expect(nuggetDelayMult(s)).toBeCloseTo(0.6, 9);
    s.perms[idx('thermos')] = 10; s.perms[idx('turbo')] = 1;
    expect(bonusCd(s, 'turbo')).toBe(Math.round(360 * 0.6));
    expect(useBonus(s, 'turbo', NOW)).toBe(true);
    expect(Math.ceil(s.ready[1] - NOW) / 1000).toBe(Math.round(360 * 0.6));
  });
  it('chaque nouvel objet a un identifiant, un prix et un maximum propres', () => {
    const ids = PERMS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const p of PERMS) { expect(p.cost).toBeGreaterThan(0); expect(p.max).toBeGreaterThanOrEqual(1); }
    expect(ids.length).toBeGreaterThanOrEqual(11);
  });
});

describe('équilibre avec TOUS les bonus (achetables + activables)', () => {
  const run = (policy: Parameters<typeof play>[4], hours = 3) => { const s = newState(); const log = play(s, hours * 3600, true, 99, policy); return { s, log }; };
  const plain = run({ perms: [0, 2, 1], nuggets: true });
  const all = run({ perms: ALL_PERMS, nuggets: true, bonuses: true });
  it('tout acheter et tout activer aide, mais de moins de ×6 sur 3 h', () => {
    expect(all.s.lifeTotal).toBeGreaterThan(plain.s.lifeTotal * 0.9);
    expect(all.s.lifeTotal).toBeLessThan(plain.s.lifeTotal * 6);
  });
  it('aucune boucle de rebirth instantanée avec tous les bonus (runs > 30 s)', () => {
    expect(all.log.length).toBeGreaterThan(3);
    for (const l of all.log) expect(l.t).toBeGreaterThan(30);
  });
  it('combo Auto-tap + Pelle en or + Turbo : un bonus de 30 s rapporte moins de 10 min de production', () => {
    const s = richState(); s.perms[idx('pelleor')] = 200; s.perms[idx('turbo')] = 1; s.perms[idx('auto')] = 1; s.shovel = 100;
    const f = bonusFacts(s, 'auto');
    expect(f.total).toBeLessThan(perSecondBase(s) * 600);
    const before = s.dirt;
    expect(useBonus(s, 'auto', NOW)).toBe(true); expect(useBonus(s, 'turbo', NOW)).toBe(true);
    tick(s, 30);
    expect(s.dirt - before).toBeLessThan(perSecondBase(s) * 600);
  });
  it('chaque bonus pris seul ne dépasse pas ×2 sur 3 h', () => {
    for (const b of BONUSES) {
      const order = [idx(b.id)];
      const one = run({ perms: order, nuggets: true, bonuses: true });
      const none = run({ perms: [3], nuggets: true });
      expect(one.s.lifeTotal, b.id).toBeLessThan(none.s.lifeTotal * 2);
    }
  });
});
