/** Réglages d'équilibrage de Taupe Tycoon (tout le reste de la simulation en dérive). */
export const GROWTH = 1.15; // coût d'un niveau = base × GROWTH^niveau
export const PROD_EXP = 0.8; // production d'un type = base × niveaux^PROD_EXP (sous-linéaire)
export const CLICK_BASE = 10; // terre par clic sans pelle (toutes les quantités sont des entiers : unité = 1/10 de la V1)
export const SHOVEL_BASE = 120; // coût du premier niveau de pelle
export const SHOVEL_POWER = 10; // gain de terre par clic et par niveau de pelle
export const GEM_DIV = 2.6e7; // terre d'un run pour 1 gemme (gain = racine carrée de total / GEM_DIV)
export const GEM_BONUS = 0.25; // bonus de production par gemme gagnée (cumulé, jamais dépensé)
export const OFFLINE_BASE = 2 * 3600; // plafond hors-ligne de base (s)
export const OFFLINE_STEP = 3600; // + par niveau de Sacoche
export const OFFLINE_MAX_LEVEL = 10;

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
  { id: 'pelleor', cost: 1, growth: 1.8, max: 999 }, // +50 % de terre par clic par niveau
  { id: 'pecule', cost: 2, growth: 2.2, max: 12 }, // terre de départ : 100 × 4^(niveau-1)
  { id: 'sacoche', cost: 3, growth: 1.9, max: OFFLINE_MAX_LEVEL }, // +1 h de hors-ligne
];
export const PERM_PROD_BONUS = 0.25;
export const PERM_CLICK_BONUS = 0.5;
