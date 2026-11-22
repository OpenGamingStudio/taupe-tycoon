import { describe, expect, it } from 'vitest';
import { PERMS, AUTO_PS_CAP, AUTO_RATE, BONUSES, CRIT_CHANCE, CRIT_MULT, GENIUS_MULT, RAIN_COUNT, RAIN_SEC, TURBO_MULT } from '../src/config';
import { play } from '../tools/play';
import { T } from '../src/i18n';
import { sanitize } from '../src/save';
import {
  applyOffline, autoTapRaw, boostOver, clickBase, bonusLeft, bonusReady, bonusReadyCount, clickPower, clickRaw, newState as freshState, perSecond,
  perSecondBase, rainCatch, rainValue, tick, useBonus,
} from '../src/sim';

const NOW = 1_700_000_000_000;
/** État de départ où les trois bonus à recharge sont déjà achetés (achat unique en boutique, voir tests/shop.test.ts). */
const newState = () => { const s = freshState(); s.bonusLv = BONUSES.map(() => 1); return s; };
const goldProfile = () => { const s = rich(); s.perms[1] = 100; s.shovel = 10; return s; };
const midGame = () => { const s = newState(); play(s, 3600, true, 99); return s; };
const lateGame = () => { const s = newState(); play(s, 3 * 3600, true, 99); return s; };
const profiles = () => [rich(), goldProfile(), midGame(), lateGame()];
const rich = () => { const s = newState(); s.gens = [20, 10, 5, 2, 0, 0]; s.shovel = 5; return s; };

describe('recharge', () => {
  it('tous les bonus sont prêts au départ ; cooldowns entre 5 et 7 min; 3 bonus seulement (pas de doublon)', () => {
    const s = newState();
    expect(bonusReadyCount(s, NOW)).toBe(BONUSES.length);
    expect(BONUSES.map((b) => b.id)).toEqual(['auto', 'turbo', 'rain']);
    for (const b of BONUSES) { expect(b.cd).toBeGreaterThanOrEqual(300); expect(b.cd).toBeLessThanOrEqual(420); }
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
  it('multiplicateurs cumulés : intégrale exacte', () => {
    expect(boostOver(10, [{ left: 4, m: 2 }, { left: 6, m: 3 }])).toBeCloseTo(4 * 6 + 2 * 3 + 4);
    expect(boostOver(5, [])).toBe(5);
  });
  it('Auto-tap : 8 taps/s pendant 30 s, compte les clics, s\'arrête seul', () => {
    const s = rich();
    useBonus(s, 'auto', NOW);
    const c = autoTapRaw(s), b = s.dirt, k = s.clicks;
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
  it('au tout début (sans production) le gain vaut des clics, jamais 0', () => {
    const s = newState();
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
  it('équilibre : TOUS les bonus (Auto-tap, Turbo, Pluie) + critique restent sous +80 % de la production, sur 4 profils', () => {
    for (const s of profiles()) {
      const p = perSecondBase(s);
      const per = (b: typeof BONUSES[number]) => {
        if (b.id === 'turbo') return (p * b.dur * (TURBO_MULT - 1)) / b.cd;
        if (b.id === 'rain') return (rainValue(s) * RAIN_COUNT) / b.cd;
        return (autoTapRaw(s) * AUTO_RATE * b.dur) / b.cd; // auto
      };
      const shares = BONUSES.map((b) => per(b) / p);
      const total = shares.reduce((a, b) => a + b, 0);
      for (const x of shares) expect(x).toBeLessThan(0.45); // aucun bonus ne domine
      expect(total).toBeLessThan(0.8);
      expect(CRIT_CHANCE * (CRIT_MULT - 1)).toBeLessThanOrEqual(0.1);
    }
  });
  it('Auto-tap ne rapporte jamais zéro ni davantage qu\'un joueur actif (4 clics/s)', () => {
    for (const s of profiles()) {
      expect(autoTapRaw(s)).toBeGreaterThan(0);
      expect(autoTapRaw(s) * AUTO_RATE).toBeLessThan(clickRaw(s) * 12);
    }
  });
});

describe('sauvegarde', () => {
  it('ancienne sauvegarde (v3) : tous les bonus prêts', () => {
    const r = sanitize({ v: 3, at: Date.now(), s: { dirt: 100, gens: [1] } })!;
    expect(r.s.ready).toEqual(BONUSES.map(() => 0));
    expect(r.s.auto + r.s.turbo).toBe(0);
    expect(r.s.dirt).toBe(100);
  });
  it('dates et durées corrompues ou excessives sont bornées', () => {
    const now = Date.now();
    const r = sanitize({ v: 5, s: { ready: [now + 9e12, 'x', now + 100_000], auto: 9999, turbo: -3, autoAcc: 7 } })!;
    expect(r.s.ready[0]).toBeLessThanOrEqual(now + BONUSES[0].cd * 1000 + 5);
    expect(r.s.ready[1]).toBe(0);
    expect(r.s.ready[2]).toBeGreaterThan(now);
    expect(r.s.auto).toBe(30); // migré = niveau 1 : durée plafonnée à 30 s
    expect(r.s.turbo).toBe(0);
    expect(r.s.autoAcc).toBeLessThan(1);
    expect(r.s.ready).toHaveLength(BONUSES.length);
  });
  it('aller-retour JSON : état des bonus conservé', () => {
    const s = rich();
    useBonus(s, 'turbo', Date.now());
    const r = sanitize(JSON.parse(JSON.stringify({ v: 5, at: Date.now(), s })))!;
    expect(r.s.turbo).toBe(30);
    expect(r.s.ready[1]).toBeGreaterThan(Date.now());
  });
  it('migration v4 : les recharges suivent les bonus par nom (auto, turbo, crew, rain, burst -> auto, turbo, rain)', () => {
    const t = Date.now() + 100_000;
    const r = sanitize({ v: 4, s: { ready: [0, t, t, 0, t] } })!;
    expect(r.s.ready[0]).toBe(0); expect(r.s.ready[1]).toBeGreaterThan(Date.now()); expect(r.s.ready[2]).toBe(0);
  });
});

describe('revue 2.12.1', () => {
  const goldRich = () => { const s = rich(); s.perms[1] = 100; s.shovel = 10; return s; };
  it('Auto-tap : la Pelle en or niveau 100 ne fait pas exploser le gain (part de production plafonnée)', () => {
    const s = goldRich();
    const p = perSecondBase(s);
    expect(autoTapRaw(s)).toBeLessThanOrEqual(clickBase(s) + AUTO_PS_CAP * p + 1e-6);
    expect(autoTapRaw(s)).toBeLessThan(clickRaw(s));
    // gain de l'Auto-tap pendant 1 s, sans autre bonus, en part de la production/s
    const a = newState(); Object.assign(a, { gens: s.gens, perms: s.perms, shovel: s.shovel, auto: 30 });
    const b = newState(); Object.assign(b, { gens: s.gens, perms: s.perms, shovel: s.shovel });
    tick(a, 1); tick(b, 1);
    expect((a.dirt - b.dirt) / p).toBeLessThan(AUTO_RATE * (clickBase(s) / p + AUTO_PS_CAP) + 1e-6);
    // sans Pelle en or, mêmes bâtiments : l'écart dû à la Pelle en or pendant l'Auto-tap reste <= AUTO_PS_CAP x taps/s de production
    const c = newState(); Object.assign(c, { gens: s.gens, perms: [0, 0, 0, 0], shovel: s.shovel, auto: 30 }); tick(c, 1);
    expect((a.dirt - c.dirt) / p).toBeLessThanOrEqual(AUTO_PS_CAP * AUTO_RATE + 1e-6);
  });
  it('Auto-tap avec Turbo et Génie cumulés reste borné', () => {
    const s = goldRich(); s.auto = 30; s.turbo = 30; s.genius = 15;
    const p = perSecondBase(s), d0 = s.dirt;
    tick(s, 1);
    expect(s.dirt - d0).toBeLessThan(p * (TURBO_MULT + AUTO_RATE * GENIUS_MULT * TURBO_MULT * (AUTO_PS_CAP + clickBase(s) / p)) + 1);
  });
  it('sauvegarde : version inconnue (>= 5) ou non numérique ne multiplie pas la terre par 10', () => {
    expect(sanitize({ v: 9, s: { dirt: 100 } })!.s.dirt).toBe(100);
    expect(sanitize({ v: '2', s: { dirt: 100 } })!.s.dirt).toBe(1000);
    expect(sanitize({ s: { dirt: 100 } })!.s.dirt).toBe(1000);
    expect(sanitize({ v: 2, s: { dirt: 100 } })!.s.dirt).toBe(100);
  });
  it('textes des bonus : durées et chiffres suivent config.ts', () => {
    for (const lang of ['fr', 'en'] as const) {
      expect(T[lang].bAutoD).toContain(`${AUTO_RATE}`); expect(T[lang].bAutoD).toContain(`${BONUSES[0].dur} s`);
      expect(T[lang].bTurboD).toContain(`${BONUSES[1].dur} s`);
      expect(T[lang].bRainD).toContain(`${RAIN_COUNT}`); expect(T[lang].bRainD).toContain(`${RAIN_SEC} s`);
    }
  });
});
