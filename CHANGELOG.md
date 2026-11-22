# Changelog

Versionnage sémantique. La version courante est affichée dans le jeu (Options).

## 2.14.0 — 2026-11-22 (V5, lot 1 bis : boutique et rendement)
- **Bug « plus j'achète, moins ça rapporte » corrigé** : la production d'un bâtiment croissait en `niveaux^0,8` (sous-linéaire), donc chaque niveau rapportait moins que le précédent. Elle est maintenant linéaire (`PROD_EXP` = 1) : le gain par achat reste stable et grimpe aux paliers. Test de monotonie (`tests/shop.test.ts`) sur les 6 bâtiments et la pelle, niveaux 1 à 700, plusieurs multiplicateurs ; un achat n'est jamais moins rentable après l'achat d'un autre bâtiment. Le gain « +N/s » affiché à l'achat est celui du vrai calcul.
- **Bonus à recharge = achat unique** (Auto-tap 3 gemmes, Turbo 5, Pluie 8) : acquis à vie (rebirth, sauvegarde, rechargement), seule la recharge court. Boutique : « Acheté ». Sauvegarde v6 : les joueurs existants les reçoivent (ils les avaient).
- **4 nouveaux objets permanents, effets distincts** : Trèfle (+1 pt de chance de critique), Casque de chantier (-2 % de prix), Aimant à pépites (pépites 4 % plus vite), Thermos (-4 % de recharge des bonus).
- **Infobulle d'appui long** sur chaque bonus, avec les vrais chiffres (coups, durée, terre gagnée, recharge) ; fermée au relâchement, placée au-dessus du doigt. L'aide (Stats) détaille aussi Ruée, Coup de génie et Trésor.
- **Barre sous la terre = progression vers la prochaine gemme** : légende explicite (« Gemmes 0 → 1 : 40 % · chaque gemme = +25 % de production »), animation et message quand une gemme est prête.
- Tests d'équilibre : tous les bonus (achetables + activables) joués par le bot, combo Auto-tap + Pelle en or + Turbo borné.

## 2.13.0 — 2026-11-22 (V5, lot 1 : équilibrage)
- **Moins de bonus, tous différents** : 5 bonus à recharge -> 3. « Ruée d'ouvrières » (production ×2) est absorbée par le Turbo (×2 sur tout) ; « Gain instantané » est absorbé par la Pluie de pépites (12 pépites de 12 s de production). Restent : Auto-tap (clics), Turbo (production + clics), Pluie (à cueillir). Sauvegardes v4 migrées par nom de bonus (recharges conservées), version de sauvegarde 5.
- **Paliers bien plus forts** : 10 paliers au lieu de 4 (niveaux 10, 25, 50, 100, 150, 200, 300, 400, 500 ; ×2 ×2 ×3 ×3 ×4 ×4 ×5 ×5 ×8) : ×36 au niveau 100 (avant ×16), ×576 au niveau 200 (avant ×16), ×115 200 au niveau 500.
- **Clic qui compte dans la durée** : la pelle ajoute 0,12 % de la production/s par niveau à chaque clic, et a ses propres paliers (niveaux 5, 10, 25, 50, 100, 150, 200, 300, 400, 500).
- Équilibre : `GEM_DIV` 3e9 (les paliers accélèrent la progression) ; premier rebirth 29 min avec pépites, 42 min sans. Test d'équilibre sur TOUS les bonus (Auto-tap compris) et 4 profils de partie.

## 2.12.1 — 2026-11-21 (correctifs de revue)
- **Équilibrage** : l'Auto-tap ne compte plus que 2 % de la production/s par tap pour la Pelle en or (`AUTO_PS_CAP`), au lieu de 3 % × niveau (+240 % au niv. 100, cumulé avec Turbo et Génie). Le plancher en clics de la Pluie et du Gain instantané ignore aussi la part de la Pelle en or. Le critique (×2, clics manuels seulement) ajoute ~+10 % aux clics : bilan revérifié dans `tests/bonus.test.ts`.
- Sauvegarde : une version inconnue (>= 5) ne multiplie plus la terre par 10.
- Pluie de pépites : ne perd plus ses pépites quand l'onglet est caché. Un glissé hors de la taupe ne fait plus avaler une activation clavier.
- Perf : repeinture de la scène une fois sur 8 (au lieu de toutes les 8 s) ; positions de l'Auto-tap en cache ; chute des pépites animée en `transform`.
- Textes des bonus alimentés par `config.ts` ; commentaire du Coup de génie corrigé (×5).

## 2.12.0 — 2026-11-21 (clic critique, panneaux dégagés)
- **Clic critique** : 10 % de chance par clic (RNG injectable) de doubler le gain, arrondi entier ; chiffre plus gros en aplat rouge et tintement léger. Se cumule avec la pioche en or (×5) et le turbo (×2) ; ni la production passive, ni l'Auto-tap, ni le prestige ne sont touchés.
- Panneau ouvert (boutique, rebirth, succès, stats, options) : la barre de bonus et les pastilles de gain flottantes sont cachées (les effets actifs continuent), la taupe garde toute la zone visible. Cause : la classe `flex` de la barre l'emportait sur la règle qui la cachait.

## 2.11.1 — 2026-11-21 (correctif : fond noir sur Chrome Android)
- Cause probable : après une longue session avec beaucoup d'onglets, Chrome Android jette les tuiles graphiques du fond (le DOM reste intact, d'où l'absence de détection par 2.10.1) : décor noir, taupe et HUD intacts.
- Repeinture forcée (`repaint` dans `src/guard.ts`) toutes les 8 s, au retour d'onglet, à la rotation et au redimensionnement : bascule de la classe `rp` (fond décalé d'un cran) et scène SVG réécrite.
- Fond de repli ciel aussi sur `#app`.

## 2.11.0 — 2026-11-21 (nouveauté : bonus à recharge)
- Barre de 5 bonus sous la taupe (anneau de recharge, compte à rebours m:ss, pastille et pulsation quand prêt) : **Auto-tap** (8 coups/s, 30 s, recharge 5 min, doigt et ondes à l'écran), **Turbo ×2** (gains, 30 s, 6 min), **Ruée d'ouvrières** (production ×2, 45 s, 8 min), **Pluie de pépites** (10 pépites à cueillir, 12 s de production chacune, 9 min), **Gain instantané** (2 min de production, 10 min).
- Recharges en horodatage (horloge du mur) : elles continuent hors-ligne, onglet caché ou en veille ; une horloge reculée ne les rallonge jamais. Sauvegarde v4 (`ready`, `auto`, `turbo`, `crew`), les v1 à v3 s'ouvrent sans perte, valeurs corrompues bornées.
- Équilibre : tous les bonus ensemble ajoutent moins de 60 % de production moyenne ; aucune monétisation ; gains entiers.
- Aide : section « Aide : les bonus » dans Stats. Mouvements réduits : pas d'ondes ni de chute animée (les pépites de la pluie restent en place).
- Tests : `tests/bonus.test.ts` (recharge, durée, hors-ligne, multiplicateurs, sauvegarde), `e2e/bonus.mjs` (320 / 390 / 1280 px).

## 2.10.1 — 2026-11-21 (correctif : fond perdu après un long moment de jeu)
- Garde-fou du décor (`src/guard.ts`) : chaque seconde, la scène SVG, la classe de profondeur et les deux canvas sont vérifiés ; au retour d'onglet, à la rotation et à la perte de contexte du canvas, le décor est redessiné sans recharger la page.
- Les boucles de dessin (sous-sol, effets) ne peuvent plus mourir sur une erreur d'effet (son, texte flottant, particule) : chaque étape est isolée, une particule fautive disparaît seule, la caméra est remise à zéro si elle devient invalide.
- Fond de repli CSS toujours opaque (ciel #5ec6f5) même si la variable de couleur est perdue.
- Tests : `tests/guard.test.ts` et `e2e/fond.mjs` (sabotage du décor, réparation attendue en moins de 3 s).

## 2.10.0 — 2026-11-19 (interface : direction « Galerie », choix du propriétaire)
- Le menu devient le sous-sol : fond terre sombre (#3b2416) à cailloux, planches claires clouées pour les cartes, HUD et notes en roche, dock brun.
- Chaque icône est posée dans une alcôve étayée éclairée par une lanterne à la couleur de l'objet ; plus de taches ni d'autocollants penchés.
- États conservés : planche claire = abordable (prix or) ; planche éteinte + jauge = trop cher ; roche pointillée + silhouette = verrouillé ; étiquette MAX gemme = « Complet ».
- Succès, boutons, dock et manifeste (fond #3b2416) repeints dans la même palette.

## 2.9.0 — 2026-11-19 (refonte de l'interface : « Autocollants »)
- Fond bleu nuit en aplat (étoiles discrètes), plus aucune grande surface blanche : feuille de menu, HUD, dock, boutons et notes repeints.
- Cartes d'achat en couleur : chaque objet a sa teinte, sa tache de peinture et son icône détourée (52 px, penchée). Trois lignes de texte : nom, badges (niveau, gain), valeur actuelle et palier en barre.
- États lisibles : en couleur = abordable ; bleu éteint avec jauge de terre réunie = trop cher ; pointillés et silhouette = verrouillé ; étiquette MAX = acheté à fond (« Complet »).
- Titres de section (« Équipe de creuseurs », compteur débloqués / 6), succès en autocollants, menu plus haut (56 % de l'écran).
- Icônes enrichies : taupinière avec sa taupe, wagonnet d'or de la mine, sac de pièces pour le pécule.
- Focus clavier crème visible sur le bleu nuit ; couleur de fond du manifeste alignée.

## 2.8.0 — 2026-11-18 (icônes et finitions)
- Icônes de l'application (favicon, apple-touch-icon, 192, 512) redessinées depuis la mascotte actuelle : casque, lunettes, pelle, fond ciel (`tools/picto.mjs`).
- Icônes : Options = engrenage, Pécule = pile de pièces, Taupinière simplifiée (monticule et trou), les trois premiers succès de clic ont chacun leur icône (pelle, patte, poignet d'acier), pépites = pépite.
- En français : K / M / Md (milliards) au lieu de B, « 2 h » au lieu de « 2 h 0 min ».
- Jauge de rebirth en turquoise foncé, reflet plus discret (contraste).
- Musique : boucle de 8 mesures en deux parties (nouvelle progression, arpège inversé et petite mélodie), toujours très basse.

## 2.7.0 — 2026-11-18 (la scène : paysage, fin de partie, menu ouvert)
- Sur ordinateur et en paysage, le décor n'est plus rogné : le ciel, le soleil, les nuages et les collines restent visibles, le décor se prolonge sur les côtés, plus de piliers ni de rochers géants coupés.
- Fin de partie : au plus quelques taupes et machines par galerie (le compteur porte le nombre réel), plus de halos translucides, gains flottants opaques à contour encre, profondeur 2 en aplats violets vifs.
- Menu ouvert sur téléphone : la taupe garde au moins 120 px entièrement visibles (vignettes et bulle d'aide masquées, toast sous le compteur).
- Fer de la pelle de la mascotte plus large (+30 %), plus recouvert par les vignettes.

## 2.6.1 — 2026-11-18 (correctifs de la revue des assets)
- Plus de texte « fr » parasite sous les Succès et les Statistiques ; plus de petit tiret à côté de « Niv. N » dans la Boutique permanente.
- Un succès n'est annoncé que par la bannière (plus de toast en double).
- Couleurs d'application (barre du navigateur, manifest, curseur de volume) alignées sur la palette Plein soleil ; compression gzip du site.

## 2.6.0 — 2026-11-18 (direction artistique « Plein soleil », combo retiré, vraie pelle)
- Le combo est supprimé : plus de compteur, de timer ni de multiplicateur caché. Chaque coup de pelle fait la même chose, lisible : le gain affiché, des pièces vers le compteur.
- La pelle est redessinée : manche en bois à poignée en D, douille en fer, lame plate (taupe, icône de boutique, pelle d'or).
- Direction artistique : ciel bleu avec soleil et nuages, collines et herbe fleurie, terre orange plus chaude, caverne plus claire, taupe aux joues roses et salopette bleu vif, HUD et dock en planches de bois, ombres « posées » (sans décalage latéral). Aucun dégradé.
- Pas d'asset externe : tout reste dessiné dans le dépôt (voir CREDITS.md).

## 2.5.1 — 2026-11-18 (correctif : lignes d'achat en x10 / Max)
- Les pastilles « Niv. N » et « +N » sont sur une ligne propre sous le titre (retour à la ligne avec espacement), plus collées au titre.
- « Gain : +217/s » et « Actuel : 65/s » : une valeur par libellé. Textes de palier courts (« Palier niv. 10 : clic ×2 »).

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
