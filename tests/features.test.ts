import { describe, expect, it } from 'vitest';
import { GENS, MILESTONES, PERMS, TROPHY_BONUS, RUSH_MULT, GENIUS_MULT, RUSH_TIME, GENIUS_TIME } from '../src/config';
import {
  applyEvent, applyOffline, clickPower, genProd, milestoneMult, newState, nextMilestone, perSecond, perSecondBase,
  prodMult, rebirth, rollEvent, tick, trophyMult,
} from '../src/sim';
import { TROPHIES, checkTrophies } from '../src/trophies';
import { SAVE_VERSION, exportText, importText, sanitize } from '../src/save';
import { fmt } from '../src/format';

describe('paliers', () => {
  it('×2 à chaque seuil de niveau, pas avant', () => {
    expect(milestoneMult(MILESTONES[0] - 1)).toBe(1);
    expect(milestoneMult(MILESTONES[0])).toBe(2);
    expect(milestoneMult(MILESTONES[1])).toBe(4);
    expect(milestoneMult(10000)).toBe(2 ** MILESTONES.length);
    expect(nextMilestone(0)).toBe(MILESTONES[0]);
    expect(nextMilestone(MILESTONES[MILESTONES.length - 1])).toBeNull();
  });
  it('la production d\'un bâtiment double au palier', () => {
    const s = newState();
    s.gens[0] = MILESTONES[0] - 1; const before = genProd(s, 0);
    s.gens[0] = MILESTONES[0]; const after = genProd(s, 0);
    expect(after / before).toBeGreaterThan(2);
  });
  it('le palier de la pelle double le clic', () => {
    const s = newState(); s.shovel = MILESTONES[0] - 1; const a = clickPower(s);
    s.shovel = MILESTONES[0]; expect(clickPower(s) / a).toBeGreaterThan(2);
  });
});

describe('succès', () => {
  it('identifiants uniques, textes fr/en, déblocage unique et bonus', () => {
    expect(new Set(TROPHIES.map((x) => x.id)).size).toBe(TROPHIES.length);
    for (const t of TROPHIES) { expect(t.fr[0] && t.fr[1] && t.en[0] && t.en[1]).toBeTruthy(); }
    const s = newState();
    expect(checkTrophies(s)).toHaveLength(0);
    s.clicks = 1;
    expect(checkTrophies(s).map((x) => x.id)).toEqual(['clic1']);
    expect(checkTrophies(s)).toHaveLength(0);
    expect(trophyMult(s)).toBeCloseTo(1 + TROPHY_BONUS);
    expect(prodMult(s)).toBeCloseTo(1 + TROPHY_BONUS);
  });
  it('tous les succès sont atteignables dans un état suffisamment avancé', () => {
    const s = newState();
    Object.assign(s, { clicks: 1e5, lifeTotal: 1e12, rebirths: 30, gemsEarned: 100, caught: 20, playTime: 4000 });
    s.gens = GENS.map(() => 30); s.shovel = 30; s.perms = PERMS.map(() => 1);
    checkTrophies(s);
    expect(s.trophies.length).toBe(TROPHIES.length);
  });
});

describe('pépites et bonus temporaires', () => {
  it('le tirage couvre les trois effets, et jamais « trésor » sans production', () => {
    const s = newState(); s.gens[0] = 5;
    const kinds = new Set([0.01, 0.5, 0.9].map((r) => rollEvent(s, r)));
    expect(kinds).toEqual(new Set(['rush', 'genius', 'treasure']));
    expect(rollEvent(newState(), 0.95)).toBe('genius');
  });
  it('ruée : production ×3 pendant 20 s puis retour à la normale', () => {
    const s = newState(); s.gens[0] = 10;
    applyEvent(s, 'rush');
    expect(s.rush).toBe(RUSH_TIME);
    expect(perSecond(s)).toBeCloseTo(perSecondBase(s) * RUSH_MULT);
    const d0 = s.dirt; tick(s, RUSH_TIME + 10);
    expect(s.dirt - d0).toBeCloseTo(perSecondBase(s) * (RUSH_TIME * RUSH_MULT + 10), 3);
    expect(s.rush).toBe(0);
  });
  it('coup de génie : clic ×5 pendant 15 s', () => {
    const s = newState(); const c0 = clickPower(s);
    applyEvent(s, 'genius');
    expect(clickPower(s)).toBe(c0 * GENIUS_MULT); expect(s.genius).toBe(GENIUS_TIME);
    tick(s, GENIUS_TIME); expect(clickPower(s)).toBe(c0);
  });
  it('trésor : 5 min de production d\'un coup, compté dans la terre creusée', () => {
    const s = newState(); s.gens[2] = 10;
    const g = applyEvent(s, 'treasure');
    expect(g).toBeCloseTo(perSecondBase(s) * 300, 3);
    expect(s.lifeTotal).toBeCloseTo(g); expect(s.caught).toBe(1);
  });
  it('les bonus temporaires ne survivent pas à une sauvegarde', () => {
    const s = newState(); s.rush = 10; s.genius = 10;
    const r = sanitize(JSON.parse(JSON.stringify({ v: SAVE_VERSION, s })));
    expect(r!.s.rush).toBe(0); expect(r!.s.genius).toBe(0);
  });
});

describe('hors-ligne', () => {
  it('ne compte pas comme temps de jeu', () => {
    const s = newState(); s.gens[0] = 3;
    applyOffline(s, 3600);
    expect(s.playTime).toBe(0);
  });
});

describe('rebirth : statistiques', () => {
  it('garde le meilleur run et la production atteinte', () => {
    const s = newState(); s.gens[1] = 20; s.runTotal = 1e10; s.runTime = 900;
    const ps = perSecondBase(s);
    rebirth(s);
    expect(s.bestRun).toBe(900); expect(s.lastPs).toBeCloseTo(ps);
    s.runTotal = 1e10; s.runTime = 1200; rebirth(s);
    expect(s.bestRun).toBe(900);
  });
});

describe('sauvegarde : migration et robustesse', () => {
  it('une sauvegarde V2 (sans les nouveaux champs) est reprise intacte', () => {
    const v2 = { v: 2, at: 1000, s: { dirt: 5000, runTotal: 9000, lifeTotal: 12345, gems: 3, gemsEarned: 7, rebirths: 2, shovel: 4, gens: [3, 2, 1, 0, 0, 0], perms: [1, 0, 0, 0], clicks: 99, runTime: 300 }, opts: { lang: 'fr', reduced: false, mode: 10, sound: false, seen: 3 } };
    const r = sanitize(v2)!;
    expect(r.s.dirt).toBe(5000); expect(r.s.gens).toEqual([3, 2, 1, 0, 0, 0]); expect(r.s.perms).toEqual([1, 0, 0, 0]);
    expect(r.s.gemsEarned).toBe(7); expect(r.s.trophies).toEqual([]); expect(r.s.playTime).toBe(0);
    expect(r.opts.sound).toBe(false); expect(r.opts.volume).toBe(60); expect(r.opts.ambient).toBe(true); expect(r.opts.mode).toBe(10);
  });
  it('une sauvegarde V1 passe aux entiers (terre ×10)', () => {
    const r = sanitize({ s: { dirt: 12, runTotal: 20, lifeTotal: 30, gens: [1] }, at: 5 })!;
    expect(r.s.dirt).toBe(120); expect(r.s.lifeTotal).toBe(300);
  });
  it('valeurs hostiles : bornées, jamais NaN ni Infinity, objets permanents limités à leur max', () => {
    const r = sanitize({ v: 3, s: { dirt: 1e300, gems: 1e300, gens: [1e300, -4, 'x'], perms: [1e9, 1e9, 1e9, 1e9], shovel: 1e99, trophies: ['clic1', 'clic1', '__proto__', 7, 'inconnu'] }, opts: { volume: 9999, lang: '<script>' } })!;
    expect(Number.isFinite(r.s.dirt)).toBe(true); expect(Number.isFinite(r.s.gems)).toBe(true);
    expect(r.s.gens[0]).toBeLessThanOrEqual(1000); expect(r.s.gens[1]).toBe(0);
    r.s.perms.forEach((p, i) => expect(p).toBeLessThanOrEqual(PERMS[i].max));
    expect(r.s.trophies).toEqual(['clic1']);
    expect(r.opts.volume).toBe(100); expect(['fr', 'en']).toContain(r.opts.lang);
    const s = r.s; s.gens = GENS.map(() => 1000); s.perms = PERMS.map((p) => p.max);
    expect(Number.isFinite(perSecond(s))).toBe(true); expect(Number.isFinite(clickPower(s))).toBe(true);
    expect(fmt(perSecond(s))).not.toMatch(/e\+|NaN/);
  });
  it('export puis import redonne le même état', () => {
    const s = newState(); s.gens[0] = 12; s.dirt = 777; s.trophies = ['clic1'];
    const text = exportText(s, { lang: 'en', reduced: true, mode: 1, sound: true, seen: 0, volume: 30, ambient: true, music: false, musicVolume: 20 });
    const r = importText(text)!;
    expect(r.s.gens[0]).toBe(12); expect(r.s.dirt).toBe(777); expect(r.s.trophies).toEqual(['clic1']); expect(r.opts.volume).toBe(30); expect(r.opts.music).toBe(false); expect(r.opts.musicVolume).toBe(20);
  });
  it('l\'import refuse tout ce qui n\'est pas un export valide', () => {
    expect(importText('')).toBeNull();
    expect(importText('{"s":{}}')).toBeNull();
    expect(importText('TT1.' + btoa('pas du json'))).toBeNull();
    expect(importText('TT1.' + btoa('[1,2]'))).toBeNull();
    expect(importText('TT1.<script>')).toBeNull();
    expect(importText('TT1.' + 'A'.repeat(30000))).toBeNull();
    expect(importText('TT1.' + btoa(JSON.stringify({ s: 5 })))).toBeNull();
  });
});

describe('format : très grands nombres', () => {
  it('jamais de notation scientifique', () => {
    for (const n of [1e36, 1e50, 1e100, 1e300]) expect(fmt(n)).toMatch(/^\d[\d ]*[A-Za-z]{0,2}\+?$/);
  });
  it('une sauvegarde 2.1 (sans musique) est migrée : musique et ambiance par défaut, choix déjà faits gardés', () => {
    const old = { v: 3, s: { dirt: 500 }, at: Date.now(), opts: { lang: 'fr', sound: false, volume: 40, ambient: false, seen: 0, mode: 1 } };
    const r = sanitize(old)!;
    expect(r.s.dirt).toBe(500);
    expect(r.opts.music).toBe(true); expect(r.opts.musicVolume).toBe(35);
    expect(r.opts.ambient).toBe(false); expect(r.opts.sound).toBe(false); expect(r.opts.volume).toBe(40);
    expect(sanitize({ v: 3, s: {}, at: 1 })!.opts.ambient).toBe(true);
  });
});
