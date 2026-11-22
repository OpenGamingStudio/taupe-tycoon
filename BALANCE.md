# Équilibrage (2.1.0)

Toutes les valeurs sont dans `src/config.ts` ; la simulation pure est `src/sim.ts` ; le bot est `tools/play.ts`.
Rapport rejouable : `npm run balance` (affiche la courbe de progression). Garde-fous : `tests/balance.test.ts`.

## Méthode
Un bot déterministe joue : 4 clics/s, achète toujours le meilleur retour sur investissement (`bestBuy`), cueille une pépite toutes les 110 s,
renaît quand il le juge rentable. Variantes : sans pépites, et une politique de gemmes par run (lunettes, pelle, pécule, sacoche, mélange).

## Paramètres clés
- Coût : base × croissance^niveau (gens et pelle) ; paliers de production ×2 aux niveaux 10/25/50/100 (`MILESTONES`, `MILESTONE_MULT`).
- Succès : +2 % de production par succès (`TROPHY_BONUS`, 20 succès).
- Pépite d'or : apparaît toutes les 75 à 150 s, reste 20 s. Événements (poids 45/35/20) : Ruée ×3 pendant 20 s, Génie ×5 sur les clics pendant 15 s, Trésor = 300 s de production.
- Rebirth : gemmes = racine de (terre de la run / `GEM_DIV` 3e8) ; chaque gemme apporte un bonus ; 4 améliorations permanentes (Lunettes, Pelle en or = +3 %/niveau de la production par clic, Pécule = 20 s de production par niveau au départ, min 1000×4^(min(l,5)−1), Sacoche = plafond hors ligne).
- Hors ligne : plafond de base 3 h, rendement plein, fenêtre « Bon retour » au-delà de 2 min.

## Résultats (bot)
- Premier rebirth : 25,7 min avec pépites, 39,2 min sans (cible 18–35 min avec pépites).
- Runs suivantes : 19,2 / 14,5 / 10,2 / 11,7 / 9,1 / 5,2 / 2,4 … 1,9 min. Au-delà, les runs se compressent vers 2 min : limite connue.
- Première run, achats : gens 20/19/17/14/7/3, pelle 55 : aucun palier mort, tous achetés.
- Pépites : moins de 2× de gain sur la première run (elles aident sans être obligatoires).
- Gemmes gagnées en 3 h selon la politique : lunettes 725, pelle 301, pécule 556, sacoche 59, mélange 7 257. Aucun achat permanent ne dépasse 4× le pire ; le mélange bat chaque seul.

## Limites
Le bot joue en actif : la Sacoche (hors ligne) n'est pas mesurée. Pas de joueur humain testé.


# V5 (2.13.0) : paliers, clic, bonus
Avant -> après (bot, 4 clics/s, `tools/play.ts`) :
| mesure | avant (2.12.1) | après (2.13.0) |
|---|---|---|
| bonus à recharge | 5 (auto, turbo, ruée, pluie, gain instantané) | 3 (auto, turbo, pluie) |
| multiplicateur de paliers au niv. 100 / 200 / 500 | ×16 / ×16 / ×16 | ×36 / ×576 / ×115 200 |
| clic à 10 min (taupes 14/13/7/4/2/0, pelle 56) | 1 800 (x4 = 14 % du revenu) | 12 000 (x4 = 53 % du revenu) |
| premier rebirth, avec / sans pépites | 25,7 / 39,2 min | 29,4 / 42,1 min |
| 3 h : rebirths, gemmes | 31, 7 257 | 17, 172 (`GEM_DIV` 3e9) |
| runs suivantes | 19, 14, 10, 12, 9, 5, 2... min | 20, 17, 13, 16, 13, 8, 6... min |
Garde-fous : `tests/bonus.test.ts` (tous les bonus, Auto-tap compris, < +80 % de la production sur 4 profils, aucun > 45 %), `tests/features.test.ts` (paliers >= ×30 au niv. 100, clic >= 30 % du revenu passif).

## Pépites (V5 lot 4, courbe réglée en 2.18.2)
Bot CPS 4, rebirths conseillés. Pépites gagnées cumulées à 5, 10, 15, 20, 30, 45, 60, 90, 120 min : 22, 26, 34, 44, 57, 72, 76, 100, 138.
Bonus (prix niveau 1 : 20 / 26 / 32) : Auto-tap vers 5 min, Turbo vers 22 min, Averse vers 60 min (avant : 11 / 69 / 137 min).
Réglages : 2 pépites par pépite d'or (20 par heure au plus), paliers de bâtiments tous comptés (pelle : sauf le 1er). Leviers : `PEP_COSTS`, `PEP_PER_NUGGET`, `PEP_NUGGET_PER_HOUR`, `PEP_TIER_SKIP*` dans `src/config.ts`; `tests/pep.test.ts` garde les 3 dates.
