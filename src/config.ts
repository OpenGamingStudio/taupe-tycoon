/** Réglages d'équilibrage de Taupe Tycoon (tout le reste de la simulation en dérive). */
export const GROWTH = 1.15; // coût d'un niveau = base × GROWTH^niveau
export const PROD_EXP = 0.8; // production d'un type = base × niveaux^PROD_EXP (sous-linéaire)
export const CLICK_BASE = 10; // terre par clic sans pelle (toutes les quantités sont des entiers : unité = 1/10 de la V1)
export const SHOVEL_BASE = 120; // coût du premier niveau de pelle
export const SHOVEL_POWER = 10; // gain de terre par clic et par niveau de pelle
export const GEM_DIV = 3e8; // terre d'un run pour 1 gemme (gain = racine carrée de total / GEM_DIV)
export const GEM_BONUS = 0.25; // bonus de production par gemme gagnée (cumulé, jamais dépensé)
export const OFFLINE_BASE = 2 * 3600; // plafond hors-ligne de base (s)
export const OFFLINE_STEP = 3600; // + par niveau de Sacoche
export const OFFLINE_MAX_LEVEL = 10;


/** Paliers : à chaque seuil de niveaux atteint, la production du bâtiment (ou le clic de la pelle) est doublée. */
export const MILESTONES = [10, 25, 50, 100];
export const MILESTONE_MULT = 2;

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
];
export const PERM_PROD_BONUS = 0.25;
export const PERM_CLICK_PS = 0.03; // Pelle en or : chaque clic rapporte en plus 3 % de la production par seconde, par niveau
export const PECULE_SEC = 20; // Pécule : terre de départ = 20 s par niveau de la production atteinte au rebirth précédent
export const PECULE_MIN = 100; // plancher (utile aux premiers rebirths) : 100 × 4^(niveau-1), niveau plafonné à 5 pour le calcul
