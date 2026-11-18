import { it } from 'vitest';
import { GENS, PERMS } from '../src/config';
import { newState, perSecond } from '../src/sim';
import { fmt } from '../src/format';
import { play } from '../tools/play';

/** `npm run balance` : imprime la courbe de progression du joueur simulé (rien n'est vérifié ici). */
it.runIf(process.env.BALANCE_REPORT)('rapport d\'équilibrage', () => {
  const out: string[] = [];
  for (const nuggets of [true, false]) {
    const s = newState();
    const log = play(s, 8 * 3600, true, 14, { perms: [0, 2, 1], nuggets });
    out.push(`\n== ${nuggets ? 'avec' : 'sans'} pépites : 14 rebirths ==`);
    out.push(log.map((l, i) => `#${i + 1} ${(l.t / 60).toFixed(1)} min +${l.gain} gemmes`).join('\n'));
  }
  const b = newState(); const first = play(b, 8 * 3600, true, 1);
  out.push(`\nAchats du premier run : ${JSON.stringify((first as any).bought)} (${GENS.map((g) => g.id).join(', ')})`);
  for (const [name, order] of [['Lunettes seules', [0]], ['Pelle en or seule', [1]], ['Pécule seul', [2]], ['Sacoche seule (hors-ligne, inutile en jeu actif)', [3]], ['Mélange 0-2-1', [0, 2, 1]]] as const) {
    const s = newState(); play(s, 3 * 3600, true, 99, { perms: [...order], nuggets: true });
    out.push(`${name} : ${s.rebirths} rebirths, ${fmt(s.gemsEarned)} gemmes, ${fmt(s.lifeTotal)} de terre, niveaux ${PERMS.map((p, i) => p.id + s.perms[i]).join(' ')}, ${fmt(perSecond(s))}/s`);
  }
  console.log(out.join('\n'));
});
