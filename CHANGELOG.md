# Changelog

Versionnage sémantique. La version courante est affichée dans le jeu (Options).

## 2.0.0 — 2026-11-18
### Visuels
- Tous les assets refaits en SVG, dans un seul langage (aplats, contour encre, ombre d'un ton, aucun dégradé) : taupe à lunettes avec casque de mineur, salopette et pelle dans la main gauche ; 12 icônes (pelle, 6 bâtiments, 4 objets permanents) ; décor souterrain (herbe, strates, racines, fossiles, caverne étayée) qui change de profondeur avec les bâtiments débloqués ; éclats de terre, pépites et gemmes.
- Taupe animée : respiration, clignement, et quatre états (repos, creuse, content, rebirth).
- Rangée des bâtiments possédés dans le décor, effet de rebirth (onde, éclats de gemmes, taupe qui tourne).
### Interface
- Disposition mobile d'abord : la taupe occupe la moitié de l'écran, le HUD est dans le décor.
- Barre de progression vers le prochain rebirth, bulles d'onboarding courtes, bâtiments mystère qui se révèlent, gain du prochain achat affiché, notifications visibles.
- Sons synthétisés optionnels (bouton dans le décor et dans Options, enregistré).
### Nombres
- Plus aucun nombre à virgule : toute la simulation passe en entiers (terre ×10 par rapport à la V1, équilibrage identique) ; abréviations 12K / 1 900K / 12M sans décimale ; bonus en pourcentage entier. Les sauvegardes V1 sont converties.
### Accessibilité
- Contrastes AA, navigation clavier complète, focus visibles, rôles ARIA (onglets, barre de progression), `prefers-reduced-motion` et option dédiée, cibles ≥ 44 px.

## 1.0.0
- Première version : clicker, pelle, 6 bâtiments, rebirth et boutique permanente, FR/EN.
