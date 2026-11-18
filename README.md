# Taupe Tycoon

Clicker tycoon d'une petite taupe à lunettes (pelle dans la main gauche) : creuse, achète des auto-creuseurs, des taupinières, des machines et des mines, puis fais un **rebirth** pour repartir plus vite. Jouable dans le navigateur et sur mobile (FR / EN). Un jeu web open source d'[OpenGamingStudio](https://opengamingstudio.com), https://taupe-tycoon.opengamingstudio.com.

## Boucle de jeu
- Clic (ou Entrée / Espace sur la taupe) = coup de pelle. Premiers achats en quelques secondes.
- Pelle + 6 générateurs : coût × 1,15 par niveau, production sous-linéaire (niveaux^0,8) : la progression ralentit nettement.
- **Rebirth** : gemmes = √(terre du run / 2,6 M) ; chaque gemme donne +25 % de production et de clic pour toujours ; boutique permanente (lunettes dorées, pelle en or, pécule, sacoche hors-ligne).
- Sauvegarde locale (`localStorage`), gains hors-ligne plafonnés (2 h, jusqu'à 12 h avec la sacoche), grands nombres abrégés (K, M, B…).

## Développement
```
npm ci
npm run dev        # serveur de dev
npm test           # simulation d'équilibrage + unitaires
npm run build      # tsc + vite build -> dist/
```
Les réglages d'équilibrage sont dans `src/config.ts`, la logique pure dans `src/sim.ts`. `tests/sim.test.ts` joue une partie simulée (4 clics/s, meilleur remboursement) et vérifie : 1er rebirth entre 20 et 40 min, runs suivants plus courts, mur de progression sans rebirth. Contrôle navigateur : `BROWSER_URL=… node e2e/check.mjs <url>` (puppeteer-core, Chrome avec `--remote-debugging-port`).

Docker : `docker build -t taupe-tycoon . && docker run -p 8080:80 taupe-tycoon` (nginx, en-têtes de sécurité et CSP stricte).

## Accessibilité
Voir `ACCESSIBILITY.md`. Licence MIT.

## V2 (2.0.0)

- Tous les nombres affichés sont des entiers (« 1 200 », « 12K », jamais « 1,2K ») ; les valeurs internes sont ×10 pour garder des paliers fins. Les anciennes sauvegardes sont migrées automatiquement.
- Tous les visuels (taupe à lunettes et pelle, 16 icônes, décor qui s'enfonce avec les bâtiments) sont des SVG dessinés dans `src/art.ts`, sans dégradé.
- Sons synthétisés (Web Audio) optionnels, coupables dans l'écran Options.
- Contrôles : `e2e/shots.mjs` (captures), `e2e/a11y.mjs` (contrastes, cibles 44 px, clavier, focus, mouvement réduit), `e2e/check.mjs`.

## V2.1
Sons synthétisés (volume, ambiance), 20 succès, pépites d'or et événements, paliers de niveau, statistiques, retour hors ligne, import/export de sauvegarde. Voir `BALANCE.md`, `REVIEW.md`, `CHANGELOG.md`.

## Mises à jour (PWA / navigateur)
Pas de service worker : c'est le plus simple et le plus fiable pour un jeu en ligne. Chaque `npm run build` écrit `dist/version.json` (`{version, build}`) et embarque le même `build` dans le code.
- nginx : `index.html`, manifeste et icônes en `Cache-Control: no-cache` (le navigateur revalide à chaque ouverture), `version.json` en `no-store`, `/assets/*` (noms hachés) en `immutable` pour un an.
- Dans le jeu (`src/update.ts`) : lecture de `version.json` 4 s après le chargement, au retour au premier plan, au retour du réseau et toutes les 5 min ; si le `build` diffère, bannière « Nouvelle version disponible — Recharger ». Le bouton sauvegarde la partie puis recharge.
- Les anciens service workers et caches éventuels sont supprimés au démarrage.
- Test de bout en bout : `e2e/update.mjs` (deux images nginx, ancienne puis nouvelle version).
- Limite : une application installée avant la 2.3.0 peut garder l'ancienne page jusqu'à un rechargement manuel (une seule fois).
