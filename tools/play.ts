import { State, applyEvent, bestBuy, buy, buyPerm, click, newState, rebirth, rebirthAdvised, rollEvent, tick } from '../src/sim';
import { checkTrophies } from '../src/trophies';

export const CPS = 4; // clics par seconde d'un joueur actif
export const NUGGET_EVERY = 110; // une pépite cueillie toutes les 110 s en moyenne (moitié des apparitions)
export interface Policy { perms: number[]; nuggets: boolean }
export const DEFAULT_POLICY: Policy = { perms: [0, 2, 1], nuggets: true };

/** Ordre d'achat des objets permanents : suit `order` (indices de PERMS), le premier achetable gagne. */
function spendGems(s: State, order: number[]) {
  for (let k = 0; k < 80; k++) {
    let done = false;
    for (const i of order) if (buyPerm(s, i)) { done = true; break; }
    if (!done) break;
  }
}

/**
 * Joue en pas d'1 s : meilleur achat par remboursement, pépite cueillie à intervalle fixe,
 * rebirth si conseillé, gemmes dépensées selon la politique.
 */
export function play(s: State, maxSec: number, doRebirth: boolean, stopAfterRebirths = 99, policy: Policy = DEFAULT_POLICY) {
  const log: { t: number; gain: number }[] = [];
  let t = 0, nug = 0, rolls = 0;
  const bought: Record<string, number> = {};
  while (t < maxSec && s.rebirths < stopAfterRebirths) {
    for (let i = 0; i < CPS; i++) click(s);
    tick(s, 1); t++;
    if (policy.nuggets && ++nug >= NUGGET_EVERY) { nug = 0; applyEvent(s, rollEvent(s, ((rolls++ * 0.381966) % 1))); }
    checkTrophies(s);
    for (let g = 0; g < 50; g++) {
      const b = bestBuy(s, CPS);
      if (b === null || !buy(s, b, 1)) break;
      const key = b < 0 ? 'shovel' : String(b);
      bought[key] = (bought[key] ?? 0) + 1;
    }
    if (doRebirth && rebirthAdvised(s)) {
      const run = s.runTime; const gain = rebirth(s); log.push({ t: run, gain });
      spendGems(s, policy.perms);
    }
  }
  (log as any).bought = bought;
  return log;
}
