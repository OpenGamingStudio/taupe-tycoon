/** Réglages d'équilibrage de Taupe Tycoon (tout le reste de la simulation en dérive). */
export const GROWTH = 1.15; // coût d'un niveau = base × GROWTH^niveau
export const PROD_EXP = 1; // production d'un type = base × niveaux (linéaire : chaque achat rapporte au moins autant que le précédent, les paliers le font monter)
export const CLICK_BASE = 10; // terre par clic sans pelle (toutes les quantités sont des entiers : unité = 1/10 de la V1)
export const SHOVEL_BASE = 120; // coût du premier niveau de pelle
export const SHOVEL_POWER = 10; // gain de terre par clic et par niveau de pelle
export const GEM_DIV = 3e9; // terre d'un run pour 1 gemme (gain = racine carrée de total / GEM_DIV)
export const GEM_BONUS = 0.25; // bonus de production par gemme gagnée (cumulé, jamais dépensé)
export const OFFLINE_BASE = 2 * 3600; // plafond hors-ligne de base (s)
export const OFFLINE_STEP = 3600; // + par niveau de Sacoche
export const OFFLINE_MAX_LEVEL = 10;


/** Paliers : à chaque seuil de niveaux atteint, la production du bâtiment (ou le clic de la pelle) est doublée. */
export const MILESTONE_TABLE: [number, number][] = [[10, 2], [25, 2], [50, 3], [100, 3], [150, 4], [200, 4], [300, 5], [400, 5], [500, 8]];
export const MILESTONES = MILESTONE_TABLE.map((m) => m[0]);
/** Paliers de la pelle (clic) : leurs propres seuils et multiplicateurs. */
export const SHOVEL_TABLE: [number, number][] = [[5, 2], [10, 2], [25, 2], [50, 2], [100, 3], [150, 3], [200, 4], [300, 4], [400, 5], [500, 8]];
export const SHOVEL_PS = 0.0012; // la pelle ajoute à chaque clic cette part de la production/s, par niveau (clic = vrai revenu dans la durée)

/** Succès : chacun donne un petit bonus de production permanent (points de pourcentage entiers). */
export const TROPHY_BONUS = 0.02;

/** Pépite d'or (événement aléatoire). Délais en secondes, durées de bonus en secondes. */
export const NUGGET_MIN_DELAY = 75;
export const NUGGET_MAX_DELAY = 150;
export const NUGGET_LIFE = 20; // temps pour la cueillir
export const RUSH_MULT = 3; // « Ruée » : production ×3
export const RUSH_TIME = 20;
export const GENIUS_MULT = 5; // « Coup de génie » : clic ×5
export const GENIUS_TIME = 15;
export const TREASURE_SEC = 300; // « Trésor » : 5 min de production d'un coup
export const EVENT_WEIGHTS = { rush: 45, genius: 35, treasure: 20 };

export interface GenDef { id: string; cost: number; prod: number }
export const GENS: GenDef[] = [
  { id: 'apprentie', cost: 150, prod: 3 },
  { id: 'taupiniere', cost: 1500, prod: 25 },
  { id: 'foreuse', cost: 1.8e4, prod: 220 },
  { id: 'machine', cost: 2.4e5, prod: 1900 },
  { id: 'mine', cost: 3.5e6, prod: 17000 },
  { id: 'excavatrice', cost: 5.5e7, prod: 150000 },
];

export interface PermDef { id: string; cost: number; growth: number; max: number }
export const PERMS: PermDef[] = [
  { id: 'lunettes', cost: 2, growth: 1.9, max: 999 }, // +25 % de production par niveau
  { id: 'pelleor', cost: 1, growth: 1.8, max: 999 }, // +2 % de la production par clic, par niveau
  { id: 'pecule', cost: 2, growth: 2.2, max: 12 }, // terre de départ au rebirth
  { id: 'sacoche', cost: 3, growth: 1.9, max: OFFLINE_MAX_LEVEL }, // +1 h de hors-ligne
  // --- 2.14.0 : nouveaux objets, un effet distinct chacun ---
  { id: 'trefle', cost: 2, growth: 1.7, max: 20 }, // +1 point de chance de coup critique par niveau (base 10 %)
  { id: 'casque', cost: 4, growth: 1.9, max: 15 }, // −2 % sur le prix des bâtiments et de la pelle, par niveau
  { id: 'aimant', cost: 3, growth: 1.8, max: 10 }, // les pépites d'or arrivent 4 % plus vite, par niveau
  { id: 'thermos', cost: 4, growth: 1.9, max: 10 }, // −4 % de recharge des bonus, par niveau
];
export const TREFLE_STEP = 0.01;
export const CASQUE_STEP = 0.02;
export const AIMANT_STEP = 0.04;
export const THERMOS_STEP = 0.04;
export const PERM_PROD_BONUS = 0.25;
export const PERM_CLICK_PS = 0.03; // Pelle en or : chaque clic rapporte en plus 3 % de la production par seconde, par niveau
export const PECULE_SEC = 20; // Pécule : terre de départ = 20 s par niveau de la production atteinte au rebirth précédent
export const PECULE_MIN = 100; // plancher (utile aux premiers rebirths) : 100 × 4^(niveau-1), niveau plafonné à 5 pour le calcul

/**
 * Bonus à recharge (2.11.0). `cd` = recharge en secondes (horloge du mur : elle continue hors-ligne), `dur` = durée de
 * l'effet en secondes (0 = instantané ou géré à part).
 */
export type BonusId = 'auto' | 'turbo' | 'rain';
export interface BonusDef { id: BonusId; cd: number; dur: number }
export const BONUSES: BonusDef[] = [
  { id: 'auto', cd: 300, dur: 30 }, // Auto-tap : la taupe creuse toute seule
  { id: 'turbo', cd: 360, dur: 30 }, // Turbo : production ×2 (absorbe la Ruée d'ouvrières)
  { id: 'rain', cd: 420, dur: 8 }, // Pluie de pépites : à cueillir (durée de la chute)
];
export const AUTO_RATE = 8; // taps par seconde pendant l'Auto-tap
export const AUTO_PS_CAP = 0.02; // Auto-tap : part de la production/s comptée par tap, plafonnée (la Pelle en or n'y compte pas au-delà)
export const TURBO_MULT = 2;
export const CRIT_CHANCE = 0.1; // clic critique : 10 % de chance par clic
export const CRIT_MULT = 2; // ... qui double le gain du clic
export const RAIN_COUNT = 12; // pépites par pluie (absorbe le Gain instantané)
export const RAIN_SEC = 12; // chaque pépite vaut 12 s de production (ou 30 clics)
export const RAIN_CLICKS = 30;

/**
 * Pépites (2.17.0) : monnaie des bonus à recharge, distincte des gemmes (rebirth). Elle survit au rebirth.
 * Sources : paliers de multiplicateur (le 1er palier de chaque ligne ne compte pas, une seule fois à vie par palier),
 * pépite d'or cueillie (plafonnée par heure), succès (1 à 3 selon la difficulté).
 */
export const PEP_COSTS: Record<BonusId, number[]> = { auto: [20, 45, 85], turbo: [24, 55, 100], rain: [30, 65, 120] }; // coût du niveau 1 (achat), 2 et 3 (amélioration)
export const BONUS_MAX_LV = 3;
export const BONUS_LV_MULT = [1, 1.5, 2]; // durée (Auto-tap, Turbo) et nombre de pépites de la Pluie, selon le niveau
export const PEP_TIER_SKIP = 1; // les N premiers paliers de chaque ligne de bâtiments ne donnent pas de pépite (le 1er qui compte : niveau 25)
export const PEP_TIER_SKIP_SHOVEL = 2; // idem pour la pelle (1er palier qui compte : niveau 25)
export const PEP_NUGGET_PER_HOUR = 8; // pépites gagnées au plus par heure en cueillant des pépites d'or
