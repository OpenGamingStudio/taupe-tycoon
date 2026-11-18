import {
  GEM_BONUS, GEM_DIV, GENS, GROWTH, OFFLINE_BASE, OFFLINE_STEP, PERMS, PERM_CLICK_BONUS, PERM_PROD_BONUS,
  CLICK_BASE, PROD_EXP, SHOVEL_BASE, SHOVEL_POWER,
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
}

export function newState(): State {
  return {
    dirt: 0, runTotal: 0, lifeTotal: 0, gems: 0, gemsEarned: 0, rebirths: 0, shovel: 0,
    gens: GENS.map(() => 0), perms: PERMS.map(() => 0), clicks: 0, runTime: 0,
  };
}

const permLevel = (s: State, id: string) => s.perms[PERMS.findIndex((p) => p.id === id)] ?? 0;

export const gemMult = (s: State) => 1 + GEM_BONUS * s.gemsEarned;
export const prodMult = (s: State) => gemMult(s) * (1 + PERM_PROD_BONUS * permLevel(s, 'lunettes'));
export const clickPower = (s: State) =>
  (CLICK_BASE + SHOVEL_POWER * s.shovel) * gemMult(s) * (1 + PERM_CLICK_BONUS * permLevel(s, 'pelleor'));

export const genProd = (s: State, i: number) => GENS[i].prod * Math.pow(s.gens[i], PROD_EXP) * prodMult(s);
export const perSecond = (s: State) => GENS.reduce((a, _, i) => a + genProd(s, i), 0);

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
  earn(s, perSecond(s) * dt);
  s.runTime += dt;
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
  return l > 0 ? 1000 * Math.pow(4, l - 1) : 0;
};
/** Conseillé quand le rebirth rapporte au moins 30 % des gemmes déjà gagnées, ou dès la première gemme. */
export const rebirthAdvised = (s: State) => {
  const g = rebirthGain(s);
  return g >= 1 && g >= Math.max(1, s.gemsEarned * 0.3);
};

export function rebirth(s: State): number {
  const g = rebirthGain(s);
  if (g < 1) return 0;
  s.gems += g;
  s.gemsEarned += g;
  s.rebirths++;
  s.dirt = startDirt(s);
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
  const before = s.dirt;
  tick(s, seconds);
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
    if (k < 0) gain = clicksPerSec * (clickPower(s) / (CLICK_BASE + SHOVEL_POWER * s.shovel)) * SHOVEL_POWER;
    else gain = GENS[k].prod * (Math.pow(s.gens[k] + 1, PROD_EXP) - Math.pow(s.gens[k], PROD_EXP)) * prodMult(s);
    if (base <= 0 && k < 0) gain = SHOVEL_POWER;
    if (gain <= 0) continue;
    const r = cost / gain;
    if (r < bestRatio) { bestRatio = r; best = k; }
  }
  return best;
}
