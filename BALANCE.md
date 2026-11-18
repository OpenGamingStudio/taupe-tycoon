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
