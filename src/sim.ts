import {
  GEM_BONUS, GEM_DIV, GENS, GROWTH, OFFLINE_BASE, OFFLINE_STEP, PERMS, PERM_CLICK_PS, PERM_PROD_BONUS, PECULE_SEC, PECULE_MIN,
  CLICK_BASE, PROD_EXP, SHOVEL_BASE, SHOVEL_POWER, MILESTONE_TABLE, SHOVEL_TABLE, SHOVEL_PS, TROPHY_BONUS,
  RUSH_MULT, RUSH_TIME, GENIUS_MULT, GENIUS_TIME, TREASURE_SEC, EVENT_WEIGHTS,
  BONUSES, BonusId, AUTO_RATE, AUTO_PS_CAP, TURBO_MULT, CRIT_CHANCE, CRIT_MULT, RAIN_SEC, RAIN_CLICKS, RAIN_COUNT,
  TREFLE_STEP, CASQUE_STEP, AIMANT_STEP, THERMOS_STEP,
  PEP_COSTS, BONUS_MAX_LV, BONUS_LV_MULT, PEP_TIER_SKIP, PEP_TIER_SKIP_SHOVEL, PEP_NUGGET_PER_HOUR, PEP_PER_NUGGET,
} from './config';

export interface State {
  dirt: number; // terre disponible
  runTotal: number; // terre creusée depuis le dernier rebirth
  lifeTotal: number; // terre creusée depuis le début
  gems: number; // gemmes de rebirth à dépenser
  gemsEarned: number; // gemmes gagnées au total (donnent le multiplicateur)
  rebirths: number;
  shovel: number;
  gens: number[];
  perms: number[];
  clicks: number;
  runTime: number; // secondes de jeu depuis le dernier rebirth
  playTime: number; // secondes de jeu au total
  bestRun: number; // run le plus court menant à un rebirth (0 = aucun)
  caught: number; // pépites cueillies
  trophies: string[]; // identifiants des succès débloqués
  lastPs: number; // production par seconde atteinte à la fin du run précédent (base du Pécule)
  rush: number; // secondes restantes de « Ruée » (non sauvegardé)
  genius: number; // secondes restantes de « Coup de génie » (non sauvegardé)
  // --- bonus à recharge (2.11.0) ---
  ready: number[]; // par bonus : date (ms, horloge du mur) où il est de nouveau prêt ; 0 = prêt
  auto: number; // secondes restantes d'Auto-tap
  autoAcc: number; // taps en attente (fraction, < 1)
  turbo: number; // secondes restantes de Turbo (gains ×2)
  // --- pépites (2.17.0) : monnaie des bonus, survit au rebirth ---
  pep: number; // pépites à dépenser
  pepEarned: number; // pépites gagnées au total
  bonusLv: number[]; // par bonus : niveau (0 = pas acheté, jusqu'à BONUS_MAX_LV)
  tiers: number[]; // par ligne (0 = pelle, 1.. = bâtiments) : paliers déjà payés en pépites (jamais rejoués après un rebirth)
  pepAt: number[]; // dates (ms) des dernières pépites gagnées en cueillant une pépite d'or (plafond horaire)
}

export function newState(): State {
  return {
    dirt: 0, runTotal: 0, lifeTotal: 0, gems: 0, gemsEarned: 0, rebirths: 0, shovel: 0,
    gens: GENS.map(() => 0), perms: PERMS.map(() => 0), clicks: 0, runTime: 0,
    playTime: 0, bestRun: 0, caught: 0, trophies: [], lastPs: 0, rush: 0, genius: 0,
    ready: BONUSES.map(() => 0), auto: 0, autoAcc: 0, turbo: 0,
    pep: 0, pepEarned: 0, bonusLv: BONUSES.map(() => 0), tiers: [0, ...GENS.map(() => 0)], pepAt: [],
  };
}

const bonusIdx = (id: BonusId) => BONUSES.findIndex((b) => b.id === id);
const permLevel = (s: State, id: string) => s.perms[PERMS.findIndex((p) => p.id === id)] ?? 0;
export const permLv = permLevel;
/** Chance de coup critique : base + Trèfle. */
export const critChance = (s: State) => CRIT_CHANCE + TREFLE_STEP * permLevel(s, 'trefle');
/** Prix de base (1er niveau) de la pelle (kind -1) ou d'un bâtiment, après le Casque de chantier. */
export const baseCost = (s: State, kind: number) => (kind < 0 ? SHOVEL_BASE : GENS[kind].cost) * (1 - CASQUE_STEP * permLevel(s, 'casque'));
/** Multiplicateur de délai des pépites d'or (Aimant : plus petit = plus fréquent). */
export const nuggetDelayMult = (s: State) => 1 - AIMANT_STEP * permLevel(s, 'aimant');
/** Recharge réelle d'un bonus, en secondes entières (Thermos). */
export const bonusCd = (s: State, id: BonusId) => Math.max(1, Math.round(BONUSES[BONUSES.findIndex((b) => b.id === id)].cd * (1 - THERMOS_STEP * permLevel(s, 'thermos'))));
/** Un bonus à recharge s'achète une fois en boutique (gemmes), puis reste à vie. */
export const bonusLevel = (s: State, id: BonusId) => s.bonusLv[bonusIdx(id)] ?? 0;
export const bonusOwned = (s: State, id: BonusId) => bonusLevel(s, id) >= 1;
/** Durée réelle de l'effet (Auto-tap, Turbo) au niveau actuel, en secondes entières. */
export const bonusDur = (s: State, id: BonusId) => Math.round(BONUSES[bonusIdx(id)].dur * BONUS_LV_MULT[Math.max(0, bonusLevel(s, id) - 1)]);
/** Nombre de pépites d'une Pluie au niveau actuel. */
export const rainCount = (s: State) => Math.round(RAIN_COUNT * BONUS_LV_MULT[Math.max(0, bonusLevel(s, 'rain') - 1)]);

export const gemMult = (s: State) => 1 + GEM_BONUS * s.gemsEarned;
export const trophyMult = (s: State) => 1 + TROPHY_BONUS * s.trophies.length;
/** Multiplicateur de palier : produit des multiplicateurs de la table dont le seuil est atteint (bâtiments : MILESTONE_TABLE, pelle : SHOVEL_TABLE). */
export const milestoneMult = (level: number, table: [number, number][] = MILESTONE_TABLE) =>
  table.reduce((a, [lv, m]) => (level >= lv ? a * m : a), 1);
/** Prochain palier au-dessus de `level` : [seuil, multiplicateur], ou null. */
export const nextMilestone = (level: number, table: [number, number][] = MILESTONE_TABLE) => table.find((m) => m[0] > level) ?? null;
/** Nombre de paliers atteints. */
export const milestoneCount = (level: number, table: [number, number][] = MILESTONE_TABLE) => table.filter((m) => level >= m[0]).length;
/** Multiplicateur permanent de production (sans les bonus temporaires). */
export const prodMult = (s: State) => gemMult(s) * trophyMult(s) * (1 + PERM_PROD_BONUS * permLevel(s, 'lunettes'));
export const shovelBase = (s: State, lvl = s.shovel) => (CLICK_BASE + SHOVEL_POWER * lvl) * milestoneMult(lvl, SHOVEL_TABLE) * gemMult(s);
export const clickBase = (s: State) => shovelBase(s);
/** Gain d'un clic : base + part de la production (Pelle en or), ×5 pendant « Coup de génie ». */
export const clickPower = (s: State) =>
  clickRaw(s) * (s.genius > 0 ? GENIUS_MULT : 1) * (s.turbo > 0 ? TURBO_MULT : 1);
/** Gain d'un clic sans bonus temporaire. */
export const clickRaw = (s: State, lvl = s.shovel) => shovelBase(s, lvl) + (PERM_CLICK_PS * permLevel(s, 'pelleor') + SHOVEL_PS * lvl) * perSecondBase(s);
/** Gain d'un tap de l'Auto-tap : comme un clic, mais la part de production (Pelle en or) est plafonnée à AUTO_PS_CAP. */
export const autoTapRaw = (s: State) =>
  clickBase(s) + Math.min(PERM_CLICK_PS * permLevel(s, 'pelleor'), AUTO_PS_CAP) * perSecondBase(s);

/** Production d'un type de bâtiment, sans bonus temporaire. */
export const genProd = (s: State, i: number) => genProdAt(s, i, s.gens[i]);
export const genProdAt = (s: State, i: number, level: number) =>
  GENS[i].prod * Math.pow(level, PROD_EXP) * milestoneMult(level) * prodMult(s);
/** Production par seconde permanente (sans « Ruée »). */
export const perSecondBase = (s: State) => GENS.reduce((a, _, i) => a + genProd(s, i), 0);
export const perSecond = (s: State) => perSecondBase(s) * (s.rush > 0 ? RUSH_MULT : 1) * (s.turbo > 0 ? TURBO_MULT : 1);

/** Coût de `n` niveaux à partir du niveau `level` d'une base donnée. */
export function costOf(base: number, level: number, n: number): number {
  return (base * Math.pow(GROWTH, level) * (Math.pow(GROWTH, n) - 1)) / (GROWTH - 1);
}
/** Nombre maximal de niveaux achetables avec `budget`. */
export function maxAffordable(base: number, level: number, budget: number): number {
  const first = base * Math.pow(GROWTH, level);
  if (budget < first) return 0;
  return Math.floor(Math.log(1 + (budget * (GROWTH - 1)) / first) / Math.log(GROWTH) + 1e-9);
}

/** Clic avec chance de critique : `rng` injectable (tests). Le critique double le gain final (×5 or, ×2 turbo compris), arrondi entier ; ni production passive ni prestige. */
export function clickRoll(s: State, rng: () => number = Math.random): { gain: number; crit: boolean } {
  const crit = rng() < critChance(s);
  const g = crit ? Math.round(clickPower(s) * CRIT_MULT) : clickPower(s);
  s.clicks++;
  earn(s, g);
  return { gain: g, crit };
}
export function click(s: State): number {
  const g = clickPower(s);
  s.clicks++;
  earn(s, g);
  return g;
}
function earn(s: State, v: number) { s.dirt += v; s.runTotal += v; s.lifeTotal += v; }

/** Intégrale, sur `dt` secondes, du produit des multiplicateurs temporaires (chacun actif `left` secondes depuis maintenant). */
export function boostOver(dt: number, mults: { left: number; m: number }[]): number {
  const cuts = [...new Set(mults.map((x) => x.left).filter((l) => l > 0 && l < dt))].sort((a, b) => a - b);
  cuts.push(dt);
  let total = 0, prev = 0;
  for (const c of cuts) {
    let m = 1;
    for (const x of mults) if (x.left > prev) m *= x.m;
    total += m * (c - prev);
    prev = c;
  }
  return total;
}

export function tick(s: State, dt: number) {
  if (dt <= 0) return;
  const prodSecs = boostOver(dt, [
    { left: s.rush, m: RUSH_MULT }, { left: s.turbo, m: TURBO_MULT },
  ]);
  earn(s, perSecondBase(s) * prodSecs);
  const autoSecs = Math.min(dt, s.auto);
  if (autoSecs > 0) {
    // taps de l'Auto-tap : chacun vaut un clic, avec les bonus de clic encore actifs à ce moment-là
    const w = boostOver(autoSecs, [{ left: s.genius, m: GENIUS_MULT }, { left: s.turbo, m: TURBO_MULT }]);
    const taps = s.autoAcc + AUTO_RATE * autoSecs;
    const whole = Math.floor(taps);
    s.autoAcc = taps - whole;
    s.clicks += whole;
    earn(s, autoTapRaw(s) * AUTO_RATE * w);
  } else s.autoAcc = 0;
  s.rush = Math.max(0, s.rush - dt);
  s.genius = Math.max(0, s.genius - dt);
  s.auto = Math.max(0, s.auto - dt);
  s.turbo = Math.max(0, s.turbo - dt);
  s.runTime += dt;
  s.playTime += dt;
}

// ---------- bonus à recharge ----------
/** Secondes avant que le bonus soit prêt (entier, 0 = prêt). Une horloge reculée ne rallonge jamais au-delà de la recharge. */
export function bonusLeft(s: State, id: BonusId, now: number): number {
  const i = bonusIdx(id);
  const left = Math.ceil(((s.ready[i] ?? 0) - now) / 1000);
  return Math.max(0, Math.min(left, BONUSES[i].cd));
}
export const bonusReady = (s: State, id: BonusId, now: number) => bonusOwned(s, id) && bonusLeft(s, id, now) === 0;
/** Nombre de bonus prêts (pastille). */
export const bonusReadyCount = (s: State, now: number) => BONUSES.filter((b) => bonusReady(s, b.id, now)).length;
/** Nombre de bonus possédés. */
export const bonusOwnedCount = (s: State) => BONUSES.filter((b) => bonusOwned(s, b.id)).length;
/** Secondes d'effet restantes d'un bonus actif (0 = inactif). */
export function bonusActive(s: State, id: BonusId): number {
  return id === 'auto' ? s.auto : id === 'turbo' ? s.turbo : 0;
}
/** Production d'un instant, au minimum équivalente à `clicks` clics (utile au tout début, sans bâtiment). */
const worth = (s: State, sec: number, clicks: number) => Math.floor(Math.max(perSecondBase(s) * sec, clickBase(s) * clicks)); // plancher en clics SANS la part de production de la Pelle en or (sinon ×3 la production au niv. 100)
/** Chiffres réels d'un bonus au niveau actuel (infobulle) : durée, recharge, gain total estimé, tous entiers. */
export function bonusFacts(s: State, id: BonusId): { dur: number; cd: number; total: number; each: number; count: number } {
  const def = BONUSES[bonusIdx(id)], cd = bonusCd(s, id);
  const dur = bonusDur(s, id);
  if (id === 'auto') return { dur, cd, each: Math.round(autoTapRaw(s)), count: AUTO_RATE * dur, total: Math.round(autoTapRaw(s) * AUTO_RATE * dur) };
  if (id === 'turbo') return { dur, cd, each: TURBO_MULT, count: 0, total: Math.round(perSecondBase(s) * (TURBO_MULT - 1) * dur) };
  return { dur: def.dur, cd, each: rainValue(s), count: rainCount(s), total: rainValue(s) * rainCount(s) };
}
/** Valeur d'une pépite de la pluie. */
export const rainValue = (s: State) => worth(s, RAIN_SEC, RAIN_CLICKS);
/** Cueille une pépite de la pluie ; renvoie la terre gagnée. */
export function rainCatch(s: State): number {
  const g = rainValue(s);
  s.caught++;
  earn(s, g);
  return g;
}
/** Déclenche un bonus s'il est prêt (et pas déjà actif) ; renvoie false sinon. Lance la recharge, effet appliqué. Gain instantané : terre gagnée dans `out.gain`. */
export function useBonus(s: State, id: BonusId, now: number, out: { gain: number } = { gain: 0 }): boolean {
  if (!bonusOwned(s, id) || !bonusReady(s, id, now) || bonusActive(s, id) > 0) return false;
  const i = bonusIdx(id);
  s.ready[i] = now + bonusCd(s, id) * 1000;
  if (id === 'auto') { s.auto = bonusDur(s, id); s.autoAcc = 0; }
  else if (id === 'turbo') s.turbo = bonusDur(s, id);
  return true;
}

// ---------- pépites (2.17.0) ----------
const PEP_HOUR = 3600_000;
export function gainPep(s: State, n: number) { s.pep += n; s.pepEarned += n; }
/** Paliers de multiplicateur atteints pour la première fois (à vie) : 1 pépite chacun, hors les premiers paliers de chaque ligne. Renvoie les pépites gagnées. */
export function checkTiers(s: State): number {
  let g = 0;
  for (let k = -1; k < GENS.length; k++) {
    const lvl = k < 0 ? s.shovel : s.gens[k];
    const n = Math.max(0, milestoneCount(lvl, k < 0 ? SHOVEL_TABLE : MILESTONE_TABLE) - (k < 0 ? PEP_TIER_SKIP_SHOVEL : PEP_TIER_SKIP));
    if (n > s.tiers[k + 1]) { g += n - s.tiers[k + 1]; s.tiers[k + 1] = n; }
  }
  if (g) gainPep(s, g);
  return g;
}
/** Pépites encore gagnables en cueillant des pépites d'or pendant l'heure en cours, et secondes avant la prochaine. */
export function nuggetPepLeft(s: State, now: number): { left: number; wait: number } {
  const live = s.pepAt.filter((t) => now - t < PEP_HOUR && t <= now);
  const left = Math.max(0, PEP_NUGGET_PER_HOUR - live.length);
  return { left, wait: left > 0 || !live.length ? 0 : Math.ceil((Math.min(...live) + PEP_HOUR - now) / 1000) };
}
/** Une pépite d'or cueillie donne PEP_PER_NUGGET pépites si le plafond horaire le permet ; renvoie le gain. */
export function nuggetPep(s: State, now: number): number {
  if (nuggetPepLeft(s, now).left < 1) return 0;
  s.pepAt = [...s.pepAt.filter((t) => now - t < PEP_HOUR && t <= now), now];
  gainPep(s, PEP_PER_NUGGET);
  return PEP_PER_NUGGET;
}
/** Prix en pépites du prochain niveau d'un bonus (0 = niveau maximal). */
export const pepCost = (s: State, id: BonusId) => PEP_COSTS[id][bonusLevel(s, id)] ?? 0;
export function buyBonus(s: State, id: BonusId): boolean {
  const lv = bonusLevel(s, id);
  if (lv >= BONUS_MAX_LV) return false;
  const c = pepCost(s, id);
  if (s.pep < c) return false;
  s.pep -= c;
  s.bonusLv[bonusIdx(id)] = lv + 1;
  return true;
}
/** Prochain achat de bonus le moins cher : {id, cost, missing} (null si tout est au maximum). */
export function nextBonusBuy(s: State): { id: BonusId; cost: number; missing: number } | null {
  let best: { id: BonusId; cost: number; missing: number } | null = null;
  for (const b of BONUSES) {
    const c = pepCost(s, b.id);
    if (c > 0 && (!best || c < best.cost)) best = { id: b.id, cost: c, missing: Math.max(0, c - s.pep) };
  }
  return best;
}

export type EventKind = 'rush' | 'genius' | 'treasure';
/** Tire une pépite : `r` dans [0, 1[. Le trésor n'a de sens que si la production existe. */
export function rollEvent(s: State, r: number): EventKind {
  const w = EVENT_WEIGHTS;
  const total = w.rush + w.genius + w.treasure;
  const x = r * total;
  const k: EventKind = x < w.rush ? 'rush' : x < w.rush + w.genius ? 'genius' : 'treasure';
  return k === 'treasure' && perSecondBase(s) <= 0 ? 'genius' : k;
}
/** Applique l'effet d'une pépite cueillie ; renvoie la terre gagnée (trésor) ou 0. */
export function applyEvent(s: State, kind: EventKind): number {
  s.caught++;
  if (kind === 'rush') { s.rush = RUSH_TIME; return 0; }
  if (kind === 'genius') { s.genius = GENIUS_TIME; return 0; }
  const g = Math.max(perSecondBase(s) * TREASURE_SEC, clickPower(s) * 50);
  earn(s, g);
  return g;
}

/** Achète `n` niveaux (borné par la bourse) ; renvoie le nombre acheté. kind : -1 pelle, sinon index de générateur. */
export function buy(s: State, kind: number, n: number): number {
  const base = baseCost(s, kind);
  const level = kind < 0 ? s.shovel : s.gens[kind];
  const k = Math.min(n, maxAffordable(base, level, s.dirt));
  if (k < 1) return 0;
  s.dirt -= costOf(base, level, k);
  if (kind < 0) s.shovel += k; else s.gens[kind] += k;
  checkTiers(s);
  return k;
}
export const buyN = (s: State, kind: number, mode: 1 | 10 | 'max') =>
  buy(s, kind, mode === 'max' ? Infinity : mode);

export function permCost(s: State, i: number): number {
  const p = PERMS[i];
  return Math.ceil(p.cost * Math.pow(p.growth, s.perms[i]));
}
export function buyPerm(s: State, i: number): boolean {
  if (s.perms[i] >= PERMS[i].max) return false;
  const c = permCost(s, i);
  if (s.gems < c) return false;
  s.gems -= c;
  s.perms[i]++;
  return true;
}

export const rebirthGain = (s: State) => Math.floor(Math.sqrt(s.runTotal / GEM_DIV));
export const startDirt = (s: State) => {
  const l = permLevel(s, 'pecule');
  return l > 0 ? Math.floor(Math.max(PECULE_MIN * 10 * Math.pow(4, Math.min(l, 5) - 1), PECULE_SEC * l * s.lastPs)) : 0;
};
/** Conseillé quand le rebirth rapporte au moins 30 % des gemmes déjà gagnées, ou dès la première gemme. */
export const rebirthAdvised = (s: State) => {
  const g = rebirthGain(s);
  return g >= 1 && g >= Math.max(1, s.gemsEarned * 0.3);
};

export function rebirth(s: State): number {
  const g = rebirthGain(s);
  if (g < 1) return 0;
  s.lastPs = perSecondBase(s);
  s.gems += g;
  s.gemsEarned += g;
  s.rebirths++;
  s.dirt = startDirt(s);
  if (s.bestRun === 0 || s.runTime < s.bestRun) s.bestRun = s.runTime;
  s.runTotal = 0;
  s.shovel = 0;
  s.gens = GENS.map(() => 0);
  s.runTime = 0;
  return g;
}

export const offlineCap = (s: State) => OFFLINE_BASE + OFFLINE_STEP * permLevel(s, 'sacoche');
/** Terre gagnée pendant l'absence (plafonnée) ; renvoie {gain, seconds}. */
export function applyOffline(s: State, elapsedSec: number): { gain: number; seconds: number } {
  const seconds = Math.max(0, Math.min(elapsedSec, offlineCap(s)));
  const before = s.dirt, played = s.playTime;
  tick(s, seconds);
  s.playTime = played; // l'absence ne compte pas comme temps de jeu
  return { gain: s.dirt - before, seconds };
}

/** Meilleur achat selon le délai de remboursement (coût / gain de production), pelle comprise via clics du bot. */
export function bestBuy(s: State, clicksPerSec: number): number | null {
  let best: number | null = null;
  let bestRatio = Infinity;
  const base = perSecond(s) + clicksPerSec * clickPower(s);
  for (let k = -1; k < GENS.length; k++) {
    const cost = costOf(baseCost(s, k), k < 0 ? s.shovel : s.gens[k], 1);
    let gain: number;
    if (k < 0) {
      gain = clicksPerSec * (clickRaw(s, s.shovel + 1) - clickRaw(s)) * (s.turbo > 0 ? TURBO_MULT : 1);
    } else gain = genProdAt(s, k, s.gens[k] + 1) - genProd(s, k);
    if (base <= 0 && k < 0) gain = SHOVEL_POWER;
    if (gain <= 0) continue;
    const r = cost / gain;
    if (r < bestRatio) { bestRatio = r; best = k; }
  }
  return best;
}
