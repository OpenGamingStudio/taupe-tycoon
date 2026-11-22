import { describe, expect, it } from 'vitest';
import { TROPHIES, trophyPep, checkTrophies } from '../src/trophies';
import { BONUSES, PEP_COSTS, PEP_NUGGET_PER_HOUR, PEP_PER_NUGGET, GENS, PERMS, SHOVEL_TABLE, MILESTONE_TABLE } from '../src/config';
import { ALL_PERMS, play } from '../tools/play';
import { SAVE_VERSION, sanitize } from '../src/save';
import {
  State, baseCost, milestoneMult, bonusCd, bonusFacts, bonusOwned, bonusReady, buy, buyBonus, buyPerm, bonusLevel, pepCost, nextBonusBuy, nuggetPep, nuggetPepLeft, checkTiers, clickRaw, critChance, clickRoll, genProd, genProdAt, newState,
  nuggetDelayMult, rainCount, perSecondBase, rebirth, tick, useBonus,
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

describe('bonus à recharge : achat en pépites, permanent', () => {
  it('sans achat, le bonus est refusé ; la 1re pépite-prix l\'achète, puis des niveaux jusqu\'à 3', () => {
    const s = newState(); s.pep = 10000; s.gems = 100;
    for (const b of BONUSES) {
      expect(bonusOwned(s, b.id)).toBe(false);
      expect(bonusReady(s, b.id, NOW)).toBe(false);
      expect(useBonus(s, b.id, NOW)).toBe(false);
      expect(idx(b.id)).toBe(-1); // plus dans la boutique de gemmes
      expect(buyBonus(s, b.id)).toBe(true);
      expect(bonusOwned(s, b.id)).toBe(true);
      expect(bonusLevel(s, b.id)).toBe(1);
      expect(buyBonus(s, b.id)).toBe(true); expect(buyBonus(s, b.id)).toBe(true);
      expect(buyBonus(s, b.id)).toBe(false); // niveau maximal
      expect(bonusLevel(s, b.id)).toBe(3);
    }
    expect(s.gems).toBe(100); // les gemmes ne servent plus aux bonus
    expect(10000 - s.pep).toBe(BONUSES.reduce((a, b) => a + PEP_COSTS[b.id].reduce((x, y) => x + y, 0), 0));
    const p = newState(); p.pep = PEP_COSTS.auto[0] - 1;
    expect(buyBonus(p, 'auto')).toBe(false); expect(p.pep).toBe(PEP_COSTS.auto[0] - 1);
    expect(nextBonusBuy(p)).toEqual({ id: 'auto', cost: PEP_COSTS.auto[0], missing: 1 });
  });
  it('les coûts croissent (achat puis niveaux) ; durée et nombre de pépites suivent le niveau', () => {
    for (const b of BONUSES) { const c = PEP_COSTS[b.id]; expect(c[1]).toBeGreaterThan(c[0]); expect(c[2]).toBeGreaterThan(c[1]); }
    const s = newState(); s.pep = 1e4;
    for (const id of ['auto', 'turbo', 'rain'] as const) buyBonus(s, id);
    expect(bonusFacts(s, 'auto').dur).toBe(30); expect(rainCount(s)).toBe(12);
    for (const id of ['auto', 'turbo', 'rain'] as const) { buyBonus(s, id); buyBonus(s, id); }
    expect(bonusFacts(s, 'auto').dur).toBe(60); expect(rainCount(s)).toBe(24);
    expect(useBonus(s, 'auto', NOW)).toBe(true); expect(s.auto).toBe(60);
  });
  it('reste acquis après un rebirth, une sauvegarde et un rechargement ; la recharge continue', () => {
    const s = richState(); s.gems = 50; s.runTotal = 1e13; s.pep = 500; s.tiers = [1, 1, 1, 1, 1, 1, 1];
    for (const b of BONUSES) buyBonus(s, b.id);
    const pep = s.pep;
    expect(useBonus(s, 'turbo', NOW)).toBe(true);
    expect(rebirth(s)).toBeGreaterThan(0);
    for (const b of BONUSES) expect(bonusOwned(s, b.id)).toBe(true);
    const back = sanitize(JSON.parse(JSON.stringify({ v: SAVE_VERSION, s, at: NOW, opts: {} })))!.s;
    for (const b of BONUSES) expect(bonusOwned(back, b.id)).toBe(true);
    expect(back.bonusLv).toEqual([1, 1, 1]); expect(s.pep).toBe(pep); expect(back.pep).toBe(pep); expect(back.tiers).toEqual(s.tiers); // les pépites survivent au rebirth
  });
  it('migration : une sauvegarde antérieure à la v6 reçoit les trois bonus, une v6 sans achat ne les a pas', () => {
    const old = sanitize({ v: 5, at: NOW, s: { dirt: 10, perms: [0, 0, 0, 0] }, opts: {} })!;
    for (const b of BONUSES) expect(bonusOwned(old.s, b.id)).toBe(true);
    const fresh = sanitize({ v: 6, at: NOW, s: { dirt: 10, perms: [0, 0, 0, 0, 0, 0, 0] }, opts: {} })!;
    for (const b of BONUSES) expect(bonusOwned(fresh.s, b.id)).toBe(false);
    const six = sanitize({ v: 6, at: NOW, s: { dirt: 10, perms: [1, 0, 0, 0, 0, 1, 0, 2] }, opts: {} })!; // v6 : lunettes 1, turbo acheté, trèfle 2
    expect(six.s.bonusLv).toEqual([0, 1, 0]); expect(six.s.perms[0]).toBe(1); expect(six.s.perms[idx('trefle')]).toBe(2);
    expect(old.s.perms[idx('lunettes')]).toBe(0); // rien d'autre n'est offert
  });
  it('infobulle : chiffres réels, entiers, qui suivent le niveau', () => {
    const a = richState(), b = richState(); a.bonusLv = [1, 1, 1]; b.bonusLv = [1, 1, 1]; b.gens = GENS.map(() => 100); b.perms[idx('thermos')] = 5; b.perms[idx('pelleor')] = 3; b.shovel = 60;
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
    s.perms[idx('thermos')] = 10; s.bonusLv[1] = 1;
    expect(bonusCd(s, 'turbo')).toBe(Math.round(360 * 0.6));
    expect(useBonus(s, 'turbo', NOW)).toBe(true);
    expect(Math.ceil(s.ready[1] - NOW) / 1000).toBe(Math.round(360 * 0.6));
  });
  it('chaque nouvel objet a un identifiant, un prix et un maximum propres', () => {
    const ids = PERMS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const p of PERMS) { expect(p.cost).toBeGreaterThan(0); expect(p.max).toBeGreaterThanOrEqual(1); }
    expect(ids.length).toBeGreaterThanOrEqual(8);
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
    const s = richState(); s.perms[idx('pelleor')] = 200; s.bonusLv = [1, 1, 1]; s.shovel = 100;
    const f = bonusFacts(s, 'auto');
    expect(f.total).toBeLessThan(perSecondBase(s) * 600);
    const before = s.dirt;
    expect(useBonus(s, 'auto', NOW)).toBe(true); expect(useBonus(s, 'turbo', NOW)).toBe(true);
    tick(s, 30);
    expect(s.dirt - before).toBeLessThan(perSecondBase(s) * 600);
  });
  it('les bonus (achetés un à un avec les pépites) ne doublent pas la progression : médiane du rapport < ×2,5', () => {
    // un rapport pris à un seul instant est chaotique (le bot renaît à des moments différents) : médiane sur 9 points de 20 min
    const a = newState(), b = newState(), ra: number[] = [];
    const pa = { perms: [3], nuggets: true, bonuses: true }, pb = { perms: [3], nuggets: true };
    for (let m = 1; m <= 36; m++) { play(a, 300, true, 99, pa); play(b, 300, true, 99, pb); if (m % 4 === 0) ra.push(a.lifeTotal / b.lifeTotal); }
    ra.sort((x, y) => x - y);
    expect(ra[4]).toBeLessThan(2.5);
  });
});

describe('pépites : sources et garde-fous', () => {
  it('paliers : 1 pépite par palier, une seule fois à vie, pas pour le 1er palier ; survit au rebirth', () => {
    const s = newState(); s.gens[0] = 10; s.shovel = 10;
    expect(checkTiers(s)).toBe(2); // palier 10 (bâtiment) et 10 (pelle : le palier 5 est offert à personne, PEP_TIER_SKIP_SHOVEL = 1)
    s.gens[0] = 25; s.shovel = 25;
    expect(checkTiers(s)).toBe(2); expect(s.pep).toBe(4);
    expect(checkTiers(s)).toBe(0);
    s.runTotal = 1e13; rebirth(s); s.gens[0] = 25; s.shovel = 25; // rejouer le palier ne repaie pas
    expect(checkTiers(s)).toBe(0); expect(s.pep).toBe(4);
    s.gens[0] = 50; expect(checkTiers(s)).toBe(1);
  });
  it('acheter un niveau franchit le palier et paie la pépite', () => {
    const s = newState(); s.gens[1] = 24; s.dirt = 1e12;
    buy(s, 1, 1); expect(s.gens[1]).toBe(25); expect(s.pep).toBe(2); // paliers 10 et 25
  });
  it('pépite d\'or : au plus N pépites par heure, la fenêtre glisse', () => {
    const s = newState(); let got = 0;
    for (let i = 0; i < 20; i++) got += nuggetPep(s, NOW + i * 60_000);
    expect(got).toBe(PEP_NUGGET_PER_HOUR * PEP_PER_NUGGET);
    const q = nuggetPepLeft(s, NOW + 20 * 60_000);
    expect(q.left).toBe(0); expect(q.wait).toBeGreaterThan(0); expect(q.wait).toBeLessThanOrEqual(3600);
    expect(nuggetPep(s, NOW + 61 * 60_000)).toBe(PEP_PER_NUGGET);
  });
  it('succès : 1 à 3 pépites chacun', () => {
    for (const tr of TROPHIES) { expect(trophyPep(tr.id)).toBeGreaterThanOrEqual(1); expect(trophyPep(tr.id)).toBeLessThanOrEqual(3); }
    const s = newState(); s.clicks = 1; checkTrophies(s); expect(s.pep).toBe(trophyPep('clic1'));
  });
  it('migration : succès et paliers déjà atteints sont offerts une fois ; v7 : valeurs bornées', () => {
    const m = sanitize({ v: 6, at: NOW, s: { dirt: 1, gens: [25, 0, 0, 0, 0, 0], shovel: 0, trophies: ['clic1', 'clic10k'] }, opts: {} })!;
    expect(m.s.pep).toBe(2 + trophyPep('clic1') + trophyPep('clic10k'));
    const h = sanitize({ v: 7, at: NOW, s: { dirt: 1, pep: 1e99, bonusLv: [9, -1, 'x'], tiers: [1e9], pepAt: [NOW + 1e12, 'a', NOW - 1000] }, opts: {} })!;
    expect(Number.isFinite(h.s.pep)).toBe(true); expect(h.s.bonusLv).toEqual([3, 0, 0]); expect(h.s.pepAt).toEqual([NOW - 1000]);
  });
  it('plusieurs sources : l\'ordre d\'achat conseillé est le moins cher', () => {
    const s = newState(); s.pep = 5;
    expect(nextBonusBuy(s)!.id).toBe('auto'); expect(nextBonusBuy(s)!.missing).toBe(PEP_COSTS.auto[0] - 5);
    expect(pepCost(s, 'turbo')).toBe(PEP_COSTS.turbo[0]);
  });
});
