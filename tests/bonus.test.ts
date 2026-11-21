import { describe, expect, it } from 'vitest';
import { AUTO_RATE, BONUSES, BURST_SEC, CREW_MULT, TURBO_MULT } from '../src/config';
import { sanitize } from '../src/save';
import {
  applyOffline, boostOver, bonusLeft, bonusReady, bonusReadyCount, burstValue, clickPower, clickRaw, newState, perSecond,
  perSecondBase, rainCatch, rainValue, tick, useBonus,
} from '../src/sim';

const NOW = 1_700_000_000_000;
const rich = () => { const s = newState(); s.gens = [20, 10, 5, 2, 0, 0]; s.shovel = 5; return s; };

describe('recharge', () => {
  it('tous les bonus sont prêts au départ ; cooldowns entre 5 et 10 min', () => {
    const s = newState();
    expect(bonusReadyCount(s, NOW)).toBe(BONUSES.length);
    for (const b of BONUSES) { expect(b.cd).toBeGreaterThanOrEqual(300); expect(b.cd).toBeLessThanOrEqual(600); }
  });
  it('utilisation : recharge lancée, compte à rebours entier, deuxième usage refusé', () => {
    const s = rich();
    expect(useBonus(s, 'turbo', NOW)).toBe(true);
    expect(bonusLeft(s, 'turbo', NOW)).toBe(360);
    expect(bonusLeft(s, 'turbo', NOW + 59_500)).toBe(301);
    expect(Number.isInteger(bonusLeft(s, 'turbo', NOW + 1234))).toBe(true);
    expect(useBonus(s, 'turbo', NOW + 1000)).toBe(false);
    expect(bonusReady(s, 'turbo', NOW + 360_000)).toBe(true);
    expect(bonusReady(s, 'turbo', NOW + 359_000)).toBe(false);
  });
  it('un bonus encore actif ne se relance pas même prêt', () => {
    const s = rich();
    s.ready[0] = 0; s.auto = 5;
    expect(useBonus(s, 'auto', NOW)).toBe(false);
  });
  it('horloge reculée : la recharge ne dépasse jamais sa valeur nominale', () => {
    const s = rich();
    useBonus(s, 'auto', NOW);
    expect(bonusLeft(s, 'auto', NOW - 86_400_000)).toBe(300);
  });
  it('la recharge continue hors-ligne (horodatage)', () => {
    const s = rich();
    useBonus(s, 'rain', NOW);
    const back = NOW + 10 * 60_000; // 10 min plus tard (onglet fermé)
    expect(bonusReady(s, 'rain', back)).toBe(true);
  });
});

describe('durée et multiplicateurs', () => {
  it('Turbo ×2 : production et clics, pendant 30 s seulement', () => {
    const s = rich();
    const p = perSecondBase(s), c = clickRaw(s);
    useBonus(s, 'turbo', NOW);
    expect(perSecond(s)).toBeCloseTo(p * TURBO_MULT);
    expect(clickPower(s)).toBeCloseTo(c * TURBO_MULT);
    const before = s.dirt;
    tick(s, 40);
    expect(s.dirt - before).toBeCloseTo(p * (30 * TURBO_MULT + 10));
    expect(s.turbo).toBe(0);
    expect(perSecond(s)).toBeCloseTo(p);
  });
  it('Ruée d\'ouvrières ×2 sur la production, pas sur le clic', () => {
    const s = rich();
    const p = perSecondBase(s), c = clickPower(s);
    useBonus(s, 'crew', NOW);
    expect(perSecond(s)).toBeCloseTo(p * CREW_MULT);
    expect(clickPower(s)).toBeCloseTo(c);
    const b = s.dirt; tick(s, 45);
    expect(s.dirt - b).toBeCloseTo(p * 90);
  });
  it('multiplicateurs cumulés : intégrale exacte', () => {
    expect(boostOver(10, [{ left: 4, m: 2 }, { left: 6, m: 3 }])).toBeCloseTo(4 * 6 + 2 * 3 + 4);
    expect(boostOver(5, [])).toBe(5);
  });
  it('Auto-tap : 8 taps/s pendant 30 s, compte les clics, s\'arrête seul', () => {
    const s = rich();
    useBonus(s, 'auto', NOW);
    const c = clickRaw(s), b = s.dirt, k = s.clicks;
    for (let i = 0; i < 400; i++) tick(s, 0.1); // 40 s en pas de 100 ms
    expect(s.auto).toBe(0);
    const prod = perSecondBase(s) * 40;
    expect(s.dirt - b - prod).toBeCloseTo(c * AUTO_RATE * 30, 3);
    expect(Math.abs(s.clicks - k - AUTO_RATE * 30)).toBeLessThanOrEqual(1); // dérive des pas de 0,1 s
  });
  it('Auto-tap : pas de 100 ms et rattrapage d\'un bloc donnent le même gain', () => {
    const a = rich(), z = rich();
    useBonus(a, 'auto', NOW); useBonus(z, 'auto', NOW);
    for (let i = 0; i < 200; i++) tick(a, 0.1);
    tick(z, 20);
    expect(a.dirt).toBeCloseTo(z.dirt, 3);
    expect(Math.abs(a.clicks - z.clicks)).toBeLessThanOrEqual(1);
  });
  it('hors-ligne : un bonus actif se consume pendant l\'absence', () => {
    const s = rich();
    useBonus(s, 'turbo', NOW);
    const p = perSecondBase(s);
    const { gain } = applyOffline(s, 100);
    expect(gain).toBeCloseTo(p * (30 * 2 + 70));
    expect(s.turbo).toBe(0);
  });
});

describe('gains instantanés', () => {
  it('Gain instantané : 2 min de production, entier, sur le run', () => {
    const s = rich();
    const out = { gain: 0 };
    expect(useBonus(s, 'burst', NOW, out)).toBe(true);
    expect(out.gain).toBe(Math.floor(perSecondBase(s) * BURST_SEC));
    expect(s.dirt).toBe(out.gain);
    expect(s.runTotal).toBe(out.gain);
  });
  it('au tout début (sans production) le gain vaut des clics, jamais 0', () => {
    const s = newState();
    expect(burstValue(s)).toBeGreaterThan(0);
    expect(rainValue(s)).toBeGreaterThan(0);
    expect(Number.isInteger(rainValue(s))).toBe(true);
  });
  it('une pépite de pluie rapporte rainValue et compte comme cueillie', () => {
    const s = rich();
    const v = rainValue(s);
    expect(rainCatch(s)).toBe(v);
    expect(s.caught).toBe(1);
    expect(s.dirt).toBe(v);
  });
  it('équilibre : tous les bonus ensemble restent sous +60 % de la production moyenne', () => {
    const s = rich();
    const p = perSecondBase(s);
    const per = (b: typeof BONUSES[number]) => {
      if (b.id === 'turbo') return p * b.dur * (TURBO_MULT - 1) / b.cd;
      if (b.id === 'crew') return p * b.dur * (CREW_MULT - 1) / b.cd;
      if (b.id === 'burst') return burstValue(s) / b.cd;
      if (b.id === 'rain') return rainValue(s) * 10 / b.cd;
      return 0;
    };
    const extra = BONUSES.reduce((a, b) => a + per(b), 0) / p;
    expect(extra).toBeLessThan(0.6);
  });
});

describe('sauvegarde', () => {
  it('ancienne sauvegarde (v3) : tous les bonus prêts', () => {
    const r = sanitize({ v: 3, at: Date.now(), s: { dirt: 100, gens: [1] } })!;
    expect(r.s.ready).toEqual(BONUSES.map(() => 0));
    expect(r.s.auto + r.s.turbo + r.s.crew).toBe(0);
    expect(r.s.dirt).toBe(100);
  });
  it('dates et durées corrompues ou excessives sont bornées', () => {
    const now = Date.now();
    const r = sanitize({ v: 4, s: { ready: [now + 9e12, 'x', -5, NaN, now + 100_000], auto: 9999, turbo: -3, crew: 'a', autoAcc: 7 } })!;
    expect(r.s.ready[0]).toBeLessThanOrEqual(now + BONUSES[0].cd * 1000 + 5);
    expect(r.s.ready.slice(1, 4)).toEqual([0, 0, 0]);
    expect(r.s.ready[4]).toBeGreaterThan(now);
    expect(r.s.auto).toBe(30);
    expect(r.s.turbo).toBe(0); expect(r.s.crew).toBe(0);
    expect(r.s.autoAcc).toBeLessThan(1);
    expect(r.s.ready).toHaveLength(BONUSES.length);
  });
  it('aller-retour JSON : état des bonus conservé', () => {
    const s = rich();
    useBonus(s, 'crew', Date.now());
    const r = sanitize(JSON.parse(JSON.stringify({ v: 4, at: Date.now(), s })))!;
    expect(r.s.crew).toBe(45);
    expect(r.s.ready[2]).toBeGreaterThan(Date.now());
  });
});
