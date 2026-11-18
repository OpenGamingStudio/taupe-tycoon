# Audit de sécurité (revue manuelle, V1)
- Site statique : aucun serveur applicatif, aucun réseau (`connect-src 'none'`), aucune clé.
- CSP stricte en `<meta>` et en en-tête nginx (`default-src 'none'`, script/style/font en `'self'`), `frame-ancestors 'none'`, HSTS, nosniff, Referrer-Policy, Permissions-Policy.
- Aucun `innerHTML` sur du texte non fiable : les chaînes de la sauvegarde ne sont jamais injectées ; les seuls `innerHTML` reçoivent des constantes du code (icônes SVG).
- La sauvegarde `localStorage` est relue par `sanitize()` (nombres finis positifs, tailles de tableaux imposées, date plafonnée) : un JSON modifié ne peut pas casser le jeu ; tricher reste possible (jeu solo, sans enjeu).
- Dépendances de build uniquement ; `npm audit` à 0 vulnérabilité au moment de la V1.
