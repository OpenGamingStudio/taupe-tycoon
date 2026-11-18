/** Réglages d'équilibrage de Taupe Tycoon (tout le reste de la simulation en dérive). */
export const GROWTH = 1.15; // coût d'un niveau = base × GROWTH^niveau
export const PROD_EXP = 0.8; // production d'un type = base × niveaux^PROD_EXP (sous-linéaire)
export const SHOVEL_BASE = 12; // coût du premier niveau de pelle
export const SHOVEL_POWER = 1; // gain de terre par clic et par niveau de pelle
export const GEM_DIV = 2.6e6; // terre d'un run pour 1 gemme (gain = racine carrée de total / GEM_DIV)
export const GEM_BONUS = 0.25; // bonus de production par gemme gagnée (cumulé, jamais dépensé)
export const OFFLINE_BASE = 2 * 3600; // plafond hors-ligne de base (s)
export const OFFLINE_STEP = 3600; // + par niveau de Sacoche
export const OFFLINE_MAX_LEVEL = 10;

export interface GenDef { id: string; cost: number; prod: number }
export const GENS: GenDef[] = [
  { id: 'apprentie', cost: 15, prod: 0.3 },
  { id: 'taupiniere', cost: 150, prod: 2.5 },
  { id: 'foreuse', cost: 1.8e3, prod: 22 },
  { id: 'machine', cost: 2.4e4, prod: 190 },
  { id: 'mine', cost: 3.5e5, prod: 1700 },
  { id: 'excavatrice', cost: 5.5e6, prod: 15000 },
];

export interface PermDef { id: string; cost: number; growth: number; max: number }
export const PERMS: PermDef[] = [
  { id: 'lunettes', cost: 2, growth: 1.9, max: 999 }, // +25 % de production par niveau
  { id: 'pelleor', cost: 1, growth: 1.8, max: 999 }, // +50 % de terre par clic par niveau
  { id: 'pecule', cost: 2, growth: 2.2, max: 12 }, // terre de départ : 100 × 4^(niveau-1)
  { id: 'sacoche', cost: 3, growth: 1.9, max: OFFLINE_MAX_LEVEL }, // +1 h de hors-ligne
];
export const PERM_PROD_BONUS = 0.25;
export const PERM_CLICK_BONUS = 0.5;
