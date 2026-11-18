# Audit de sécurité (revue manuelle, V1)
- Site statique : aucun serveur applicatif, aucun réseau (`connect-src 'none'`), aucune clé.
- CSP stricte en `<meta>` et en en-tête nginx (`default-src 'none'`, script/style/font en `'self'`), `frame-ancestors 'none'`, HSTS, nosniff, Referrer-Policy, Permissions-Policy.
- Aucun `innerHTML` sur du texte non fiable : les chaînes de la sauvegarde ne sont jamais injectées ; les seuls `innerHTML` reçoivent des constantes du code (icônes SVG).
- La sauvegarde `localStorage` est relue par `sanitize()` (nombres finis positifs, tailles de tableaux imposées, date plafonnée) : un JSON modifié ne peut pas casser le jeu ; tricher reste possible (jeu solo, sans enjeu).
- Dépendances de build uniquement (rien d'embarqué hors du bundle). `npm audit` signale picomatch (ReDoS, via vite/fdir) sans correctif non cassant : outil de build, jamais exécuté en production, entrée non contrôlée par un utilisateur.

## 2.1.0
- localStorage : tout est relu par `sanitize` (types, bornes, ids connus) ; une sauvegarde hostile ne peut produire ni NaN ni Infinity.
- Import : texte `TT1.` + base64 strict, 20 000 caractères max, JSON analysé puis assaini ; aucune insertion HTML (textContent seulement) ; confirmation avant écrasement.
- Export : copie dans le presse-papiers ou affichage du texte ; aucune donnée envoyée au réseau (CSP `connect-src 'none'`).
- Audio : aucun fichier chargé, tout est synthétisé.
