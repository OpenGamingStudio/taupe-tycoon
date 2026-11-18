import {
  GEM_BONUS, GEM_DIV, GENS, GROWTH, OFFLINE_BASE, OFFLINE_STEP, PERMS, PERM_CLICK_PS, PERM_PROD_BONUS, PECULE_SEC, PECULE_MIN,
  CLICK_BASE, PROD_EXP, SHOVEL_BASE, SHOVEL_POWER, MILESTONES, MILESTONE_MULT, TROPHY_BONUS,
  RUSH_MULT, RUSH_TIME, GENIUS_MULT, GENIUS_TIME, TREASURE_SEC, EVENT_WEIGHTS,
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
}

export function newState(): State {
  return {
    dirt: 0, runTotal: 0, lifeTotal: 0, gems: 0, gemsEarned: 0, rebirths: 0, shovel: 0,
    gens: GENS.map(() => 0), perms: PERMS.map(() => 0), clicks: 0, runTime: 0,
    playTime: 0, bestRun: 0, caught: 0, trophies: [], lastPs: 0, rush: 0, genius: 0,
  };
}

const permLevel = (s: State, id: string) => s.perms[PERMS.findIndex((p) => p.id === id)] ?? 0;

export const gemMult = (s: State) => 1 + GEM_BONUS * s.gemsEarned;
export const trophyMult = (s: State) => 1 + TROPHY_BONUS * s.trophies.length;
/** Multiplicateur de palier : ×2 par seuil de MILESTONES atteint. */
export const milestoneMult = (level: number) => Math.pow(MILESTONE_MULT, MILESTONES.filter((m) => level >= m).length);
/** Prochain seuil de palier au-dessus de `level`, ou null. */
export const nextMilestone = (level: number) => MILESTONES.find((m) => m > level) ?? null;
/** Multiplicateur permanent de production (sans les bonus temporaires). */
export const prodMult = (s: State) => gemMult(s) * trophyMult(s) * (1 + PERM_PROD_BONUS * permLevel(s, 'lunettes'));
export const clickBase = (s: State) =>
  (CLICK_BASE + SHOVEL_POWER * s.shovel) * milestoneMult(s.shovel) * gemMult(s);
/** Gain d'un clic : base + part de la production (Pelle en or), ×10 pendant « Coup de génie ». */
export const clickPower = (s: State) =>
  (clickBase(s) + PERM_CLICK_PS * permLevel(s, 'pelleor') * perSecondBase(s)) * (s.genius > 0 ? GENIUS_MULT : 1);

/** Production d'un type de bâtiment, sans bonus temporaire. */
export const genProd = (s: State, i: number) => genProdAt(s, i, s.gens[i]);
export const genProdAt = (s: State, i: number, level: number) =>
  GENS[i].prod * Math.pow(level, PROD_EXP) * milestoneMult(level) * prodMult(s);
/** Production par seconde permanente (sans « Ruée »). */
export const perSecondBase = (s: State) => GENS.reduce((a, _, i) => a + genProd(s, i), 0);
export const perSecond = (s: State) => perSecondBase(s) * (s.rush > 0 ? RUSH_MULT : 1);

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

export function click(s: State): number {
  const g = clickPower(s);
  s.clicks++;
  earn(s, g);
  return g;
}
function earn(s: State, v: number) { s.dirt += v; s.runTotal += v; s.lifeTotal += v; }

export function tick(s: State, dt: number) {
  const boosted = Math.min(dt, s.rush);
  earn(s, perSecondBase(s) * (dt + (RUSH_MULT - 1) * boosted));
  s.rush = Math.max(0, s.rush - dt);
  s.genius = Math.max(0, s.genius - dt);
  s.runTime += dt;
  s.playTime += dt;
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
  const base = kind < 0 ? SHOVEL_BASE : GENS[kind].cost;
  const level = kind < 0 ? s.shovel : s.gens[kind];
  const k = Math.min(n, maxAffordable(base, level, s.dirt));
  if (k < 1) return 0;
  s.dirt -= costOf(base, level, k);
  if (kind < 0) s.shovel += k; else s.gens[kind] += k;
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
    const cost = costOf(k < 0 ? SHOVEL_BASE : GENS[k].cost, k < 0 ? s.shovel : s.gens[k], 1);
    let gain: number;
    if (k < 0) {
      const cur = clickBase(s) / milestoneMult(s.shovel);
      gain = clicksPerSec * (cur / (CLICK_BASE + SHOVEL_POWER * s.shovel)) * ((CLICK_BASE + SHOVEL_POWER * (s.shovel + 1)) * milestoneMult(s.shovel + 1) - (CLICK_BASE + SHOVEL_POWER * s.shovel) * milestoneMult(s.shovel));
    } else gain = genProdAt(s, k, s.gens[k] + 1) - genProd(s, k);
    if (base <= 0 && k < 0) gain = SHOVEL_POWER;
    if (gain <= 0) continue;
    const r = cost / gain;
    if (r < bestRatio) { bestRatio = r; best = k; }
  }
  return best;
}
