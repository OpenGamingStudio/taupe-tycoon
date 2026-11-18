# Taupe Tycoon V4 « TYCOON » : bilan

## Fait

| Demande | Version | Réalisation |
|---|---|---|
| 3. Mises à jour | 2.3.0 | Cause : `index.html` sans `Cache-Control` (cache heuristique). nginx : `/` no-cache, `/version.json` no-store, `/assets/` immutable ; `version.json` généré au build ; bandeau « Nouvelle version » (contrôle au démarrage, au retour sur l'onglet, en ligne, toutes les 5 min) ; nettoyage des anciens service workers ; version affichée dans Options ; `e2e/update.mjs`. |
| 1. Place pour le jeu | 2.4.0 | Scène plein écran, en-tête compact (terre, /s, gemmes, progression). |
| 2. Menus repliables | 2.4.0 | Dock de 5 boutons + un seul tiroir (bottom-sheet mobile, panneau latéral large/paysage), animé, ×  >= 44 px, Échap, clic dehors, état mémorisé, pastilles d'achat possible. `e2e/layout.mjs` (5 tailles). |
| 4. Effets visibles de chaque achat passif | 2.5.0 | Voir l'inventaire ci-dessous. `e2e/visuals.mjs`, `tests/machines.test.ts`. |

### Inventaire des achats passifs et de leur effet dans le décor

| Achat | Visible dans la scène | À l'achat | Production |
|---|---|---|---|
| Taupe apprentie | petites taupes ouvrières (casque rouge), nombre = possédées (plafonné, groupe au-delà) | taupe qui tombe du ciel, rebond, éclats, « +N » | chaque taupe rapporte une pépite au coffre, « +N » |
| Taupinière | taupes à casque jaune | idem | idem |
| Foreuse à vapeur | machine à mèche tournante, cheminée qui fume ; plusieurs exemplaires ; palier : lampe/fanion/halo/dorures | sortie de terre, éclair blanc, onde, éclats, « +N » | « +N » de la machine toutes les ~6 s |
| Machine à creuser | tunnelier à tambour rayé, tête de forage, tapis de déblais | idem | idem |
| Mine | puits : cadre en bois, poulie, benne pleine d'or qui monte/descend | idem | idem |
| Excavatrice | engin jaune, bras articulé, godet qui balance | idem | idem |
| Lunettes | paires de lunettes qui scintillent (jusqu'à 8) | éclats dorés + onde | (bonus de production global) |
| Pelle d'or | pelle dorée plantée dans la terre, plus grande avec le niveau | idem | (bonus de clic) |
| Pécule | tas de pièces qui grossit (rangée tous les 3 niveaux) | idem | (terre de départ) |
| Sacoche | sacs de toile près du coffre (un de plus tous les 2 niveaux) | idem | (hors-ligne) |
| Paliers 10/25/50/100 | cristaux supplémentaires, teinte plus sombre, décorations de machines | bannière de palier | ×2 |
| Pelle (clic) | non passif : la taupe creuse (déjà animé V3) | | |

Performances : canvas 30 images/s, rectangles pleins ; machines plafonnées à ~la moitié des places de galerie, taupes à 14 ; aucun dégradé ; mouvement réduit = images fixes.

## Reste à faire / limites

- Pas d'essai sur un vrai téléphone ni sur Safari/iOS (service worker supprimé, donc pas de mode hors-ligne installé).
- Les sons n'ont pas été écoutés ; pas de son propre à la construction d'une machine (le son d'achat existant est joué).
- Aucun drone ni élément de surface : tout se passe dans les galeries.
- Les machines peuvent se chevaucher avec les taupes quand l'écran est très court (une seule galerie).
- Barre de progression par rangée non faite.
