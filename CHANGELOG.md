# Changelog

Versionnage sémantique. La version courante est affichée dans le jeu (Options).

## 2.5.0 — 2026-11-18 (V4 « TYCOON » 3/3 : chaque achat passif se voit dans la mine)
- Foreuse, Machine à creuser, Mine et Excavatrice ne sont plus des taupes : ce sont de vraies machines animées dans les galeries (foreuse à vapeur avec mèche et fumée, tunnelier avec tapis de déblais, puits de mine avec benne qui monte et descend, excavatrice au bras articulé). Apprentie et Taupinière gardent leurs taupes ouvrières.
- Plusieurs exemplaires s'affichent avec le nombre possédé (plafonné par la place sur l'écran, une machine représente alors un groupe). Le palier (10 / 25 / 50 / 100) change l'allure : lampe, fanion, halo, dorures.
- Les 4 bonus permanents ont leur objet dans le décor : lunettes qui scintillent, pelle d'or de plus en plus grande, tas de pièces (Pécule), sacs de toile (Sacoche).
- À l'achat : la machine sort de terre avec un éclair, une onde et des éclats, un « +N » en sort ; ensuite chaque machine livre à son tour un « +N » de sa vraie production. Mouvement réduit : image fixe, sans éclats.
- Galeries resserrées sous une taupe un peu plus petite pour que tout le décor reste visible ; au plus 14 taupes dessinées (performances).
- Inventaire complet dans TAUPE-V4.md.

## 2.4.0 — 2026-11-18 (V4 « TYCOON » 2/3 : plein écran de jeu et menus repliables)
- La scène (mine, taupes, effets) occupe tout l'écran ; en-tête réduit à un compteur compact (terre, /s, gemmes, progression).
- Les menus passent dans un dock de 5 boutons en bas (Mine, Rebirth, Succès, Stats, Options). Chaque menu est un tiroir qui s'ouvre et se ferme avec animation : bottom-sheet sur mobile, panneau latéral sur grand écran/paysage. Un seul ouvert à la fois, fermé par défaut sur une nouvelle partie ; bouton ×, Échap et clic hors du tiroir ferment (creuser ou cueillir une pépite ne le ferme pas) ; le dernier menu ouvert est mémorisé (`opts.panel`, anciennes sauvegardes = fermé).
- Pastilles de notification sur le dock : nombre d'achats possibles (Mine, Rebirth) ou « ! » quand le rebirth est conseillé ; le bouton Mine pulse quand le tout premier achat est possible.
- Les statistiques ont leur propre menu (séparées des succès).

## 2.3.0 — 2026-11-18 (V4 « TYCOON » 1/3 : mises à jour)
- Cause du « jeu qui ne se met pas à jour » : nginx ne donnait aucun `Cache-Control` à `index.html` ; le navigateur (ou l'appli installée) le gardait comme page « fraîche » (cache heuristique) et continuait à charger d'anciens fichiers.
- Correctif : `index.html`, icônes et manifeste en `no-cache` (revalidés à chaque ouverture), `version.json` en `no-store`, `/assets/` à empreinte en `immutable`.
- Détection : le jeu relit `version.json` au retour au premier plan, au retour du réseau et toutes les 5 minutes ; s'il y a une nouvelle construction, bannière « Nouvelle version disponible — Recharger » (la partie est sauvegardée avant le rechargement). Pas de service worker (les anciens, s'il en reste, et leurs caches sont supprimés). `connect-src 'self'` (CSP) pour cette seule lecture.
- Version (et identifiant de construction en infobulle) affichées dans Options.

## 2.2.0 — 2026-11-18 (V3 « JUICE »)
### Sons et musique
- Sound design refait : coup de pelle (trois sons au hasard, hauteur variable, tintement de pierre précieuse), ramassage en gamme pentatonique montante, fanfare de palier, arrivée d'une taupe, accord de combo, refus à deux notes.
- Musique de fond synthétisée (boucle de 4 mesures, très basse, tonalité qui change avec la profondeur) avec son propre bouton et son propre volume ; l'ambiance sonore (vent, gouttes, cristaux) est activée par défaut. Les sauvegardes existantes sont migrées (champs absents = valeurs par défaut).
### Décor vivant et équipe de fond
- Chaque taupe ouvrière achetée apparaît en pixel-art dans des galeries du décor : elle tombe en rebondissant, creuse, rapporte une pépite au coffre (« +N » flottant, étincelles) puis repart ; casque et outil selon le type (6 types). Plafond d'affichage selon la taille de l'écran (24 au plus, moins sur mobile), au-delà une taupe affichée représente un groupe (petite bande de taupes).
- Décor : rayons de lumière, poussière en deux couches (parallaxe qui réagit aux coups de pelle), cristaux qui pulsent, vers, lampes suspendues ; la teinte et le nombre de cristaux suivent la profondeur et les paliers.
- Canvas en pixel-art minuscule, 30 images/s, à l'arrêt quand la page est cachée ; mouvement réduit : taupes ralenties, sans étincelles, poussière ni balancement.
### Dopamine et interface
- Pièces de terre et d'or qui volent vers le compteur (chaque arrivée sonne et fait « rebondir » le compteur), gemmes au rebirth, étincelles, confettis aux paliers, succès, pépites, combos et rebirth.
- Compteur de terre qui roule (entiers), secousse d'écran sur les gros gains, badge de combo à quatre paliers, bannières de palier et de succès en file d'attente, bouton principal élastique, vibration discrète sur mobile.
- Barre de progression brillante, changement d'onglet animé. Mouvement réduit : tout est instantané, sans secousse ni particules inutiles.

## 2.1.0 — 2026-11-18
### Sons
- Moteur sonore refait : coup de pelle (choc + gravier, hauteur aléatoire), achat, amélioration permanente, succès, pépite, rebirth, ambiance de galerie (optionnelle, désactivée par défaut).
- Volume réglable (curseur), mute enregistré ; rien ne sonne avant la première interaction ; le son se met en pause quand la page est cachée.
### Nouveautés
- Succès : 20 trophées, chacun donne +2 % de production pour toujours ; page Succès avec les statistiques (terre creusée, temps de jeu, meilleur run, pépites...).
- Pépite d'or : événement aléatoire à cueillir (Ruée ×3 la production, Coup de génie ×5 le clic, ou Trésor = 5 min de production).
- Paliers : chaque bâtiment (et la pelle) double sa production à 10, 25, 50 et 100 niveaux ; le prochain palier est affiché sur chaque ligne.
- Fenêtre « Bon retour » : durée d'absence, terre gagnée, plafond hors-ligne et son extension par la Sacoche.
- Export / import de la sauvegarde (texte copiable), validé et borné.
### Équilibrage
- Courbe simulée (bot) : premier rebirth en 18-35 min, tests d'équilibrage (aucun palier mort, aucun achat dominant). La Pelle en or et le Pécule suivent désormais la production (ils étaient dépassés en milieu de partie). Détail : BALANCE.md.
### Corrections
- Onglet en arrière-plan : le temps écoulé est rattrapé au retour (il était perdu au-delà d'1 s par tick).
- Sauvegarde : valeurs bornées (une sauvegarde modifiée ne produit plus Infinity/NaN), objets permanents limités à leur maximum.
- Deux onglets ouverts : le plus ancien ne sauvegarde plus (il écrasait la partie).
- Très grands nombres : plus de notation scientifique.
- Liste complète : REVIEW.md.

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
