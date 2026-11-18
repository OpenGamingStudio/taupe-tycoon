
import { State, bestBuy, buy, buyPerm, click, newState, rebirth, rebirthAdvised, tick } from '../src/sim';
export const CPS = 4; // clics par seconde d'un joueur actif
/** Joue en pas d'1 s : meilleur achat par remboursement, buyPerm, rebirth si conseillé. */
export function play(s: State, maxSec: number, doRebirth: boolean, stopAfterRebirths = 99) {
  const log: { t: number; gain: number }[] = [];
  let t = 0;
  while (t < maxSec && s.rebirths < stopAfterRebirths) {
    for (let i = 0; i < CPS; i++) click(s);
    tick(s, 1); t++;
    for (let g = 0; g < 50; g++) { const b = bestBuy(s, CPS); if (b === null || !buy(s, b, 1)) break; }
    if (doRebirth && rebirthAdvised(s)) {
      const run = s.runTime; const gain = rebirth(s); log.push({ t: run, gain });
      for (let k = 0; k < 50; k++) { const idx = [0, 2, 1][k % 3]; if (!buyPerm(s, idx)) { if (!buyPerm(s, 0)) break; } }
    }
  }
  return log;
}
