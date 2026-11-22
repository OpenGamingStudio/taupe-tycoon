import { State, gainPep } from './sim';

export interface Trophy { id: string; icon: string; test: (s: State) => boolean; fr: [string, string]; en: [string, string] }

const total = (s: State) => s.gens.reduce((a, b) => a + b, 0);

/** Les succès : chacun donne +2 % de production pour toujours (TROPHY_BONUS). Textes : [nom, description]. */
export const TROPHIES: Trophy[] = [
  { id: 'clic1', icon: 'shovel', test: (s) => s.clicks >= 1, fr: ['Premier coup de pelle', 'Creuse une première fois.'], en: ['First dig', 'Dig once.'] },
  { id: 'clic100', icon: 'paw', test: (s) => s.clicks >= 100, fr: ['Petites pattes', 'Creuse 100 fois.'], en: ['Little paws', 'Dig 100 times.'] },
  { id: 'clic1k', icon: 'cuff', test: (s) => s.clicks >= 1000, fr: ['Poignets d’acier', 'Creuse 1 000 fois.'], en: ['Wrists of steel', 'Dig 1,000 times.'] },
  { id: 'clic10k', icon: 'pelleor', test: (s) => s.clicks >= 10000, fr: ['Marteau-piqueur', 'Creuse 10 000 fois.'], en: ['Jackhammer', 'Dig 10,000 times.'] },
  { id: 'terre1', icon: 'dirt', test: (s) => s.lifeTotal >= 1e5, fr: ['Un tas de terre', 'Creuse 100K de terre en tout.'], en: ['A pile of dirt', 'Dig 100K dirt in total.'] },
  { id: 'terre2', icon: 'dirt', test: (s) => s.lifeTotal >= 1e7, fr: ['Une colline', 'Creuse 10M de terre en tout.'], en: ['A hill', 'Dig 10M dirt in total.'] },
  { id: 'terre3', icon: 'dirt', test: (s) => s.lifeTotal >= 1e9, fr: ['Une montagne', 'Creuse 1 000M de terre en tout.'], en: ['A mountain', 'Dig 1,000M dirt in total.'] },
  { id: 'terre4', icon: 'dirt', test: (s) => s.lifeTotal >= 1e11, fr: ['Le centre de la Terre', 'Creuse 100 Md de terre en tout.'], en: ['Center of the Earth', 'Dig 100B dirt in total.'] },
  { id: 'aide', icon: 'apprentie', test: (s) => total(s) >= 1, fr: ['Un coup de patte', 'Achète ton premier bâtiment.'], en: ['A helping paw', 'Buy your first building.'] },
  { id: 'equipe', icon: 'taupiniere', test: (s) => total(s) >= 50, fr: ['Toute une équipe', 'Possède 50 bâtiments à la fois.'], en: ['A whole crew', 'Own 50 buildings at once.'] },
  { id: 'empire', icon: 'excavatrice', test: (s) => s.gens.every((g) => g > 0), fr: ['Empire minier', 'Possède chaque type de bâtiment.'], en: ['Mining empire', 'Own every kind of building.'] },
  { id: 'palier', icon: 'machine', test: (s) => s.gens.some((g) => g >= 25) || s.shovel >= 25, fr: ['Spécialiste', 'Monte un bâtiment ou la pelle au niveau 25.'], en: ['Specialist', 'Take a building or the shovel to level 25.'] },
  { id: 'rebirth1', icon: 'gem', test: (s) => s.rebirths >= 1, fr: ['Seconde chance', 'Fais ton premier rebirth.'], en: ['Second chance', 'Do your first rebirth.'] },
  { id: 'rebirth5', icon: 'gem', test: (s) => s.rebirths >= 5, fr: ['Habituée', 'Fais 5 rebirths.'], en: ['Regular', 'Do 5 rebirths.'] },
  { id: 'rebirth25', icon: 'gem', test: (s) => s.rebirths >= 25, fr: ['Éternelle recommenceuse', 'Fais 25 rebirths.'], en: ['Forever restarting', 'Do 25 rebirths.'] },
  { id: 'gemmes', icon: 'gem', test: (s) => s.gemsEarned >= 50, fr: ['Chasseuse de gemmes', 'Gagne 50 gemmes en tout.'], en: ['Gem hunter', 'Earn 50 gems in total.'] },
  { id: 'boutique', icon: 'lunettes', test: (s) => s.perms.some((p) => p > 0), fr: ['Bon investissement', 'Achète un objet permanent.'], en: ['Good investment', 'Buy a permanent item.'] },
  { id: 'pepite1', icon: 'nugget', test: (s) => s.caught >= 1, fr: ['Pépite !', 'Cueille une pépite d’or.'], en: ['Nugget!', 'Catch a golden nugget.'] },
  { id: 'pepite10', icon: 'nugget', test: (s) => s.caught >= 10, fr: ['Œil de lynx', 'Cueille 10 pépites d’or.'], en: ['Eagle eye', 'Catch 10 golden nuggets.'] },
  { id: 'temps', icon: 'sacoche', test: (s) => s.playTime >= 3600, fr: ['Une heure sous terre', 'Joue pendant une heure.'], en: ['An hour underground', 'Play for one hour.'] },
];
/** Pépites données par un succès : 1 (facile), 2 (moyen), 3 (difficile). */
const HARD = new Set(['clic10k', 'terre4', 'empire', 'rebirth25', 'gemmes', 'temps']);
const MID = new Set(['clic1k', 'terre2', 'terre3', 'equipe', 'rebirth5', 'pepite10']);
export const trophyPep = (id: string) => (HARD.has(id) ? 3 : MID.has(id) ? 2 : 1);
export const TROPHY_COUNT = TROPHIES.length;

/** Débloque les succès atteints ; renvoie ceux qui viennent de l'être. */
export function checkTrophies(s: State): Trophy[] {
  const fresh: Trophy[] = [];
  for (const tr of TROPHIES) if (!s.trophies.includes(tr.id) && tr.test(s)) { s.trophies.push(tr.id); gainPep(s, trophyPep(tr.id)); fresh.push(tr); }
  return fresh;
}
