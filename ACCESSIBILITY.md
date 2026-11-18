# Accessibilité (cible WCAG 2.2 AA)
- Tout est un vrai `<button>` ; la taupe se joue au clavier (Entrée / Espace) ; onglets ARIA avec flèches / Début / Fin ; focus visible 3 px.
- Cibles tactiles ≥ 44 px ; aucun défilement horizontal de 320 à 1440 px (contrôlé par `e2e/check.mjs`).
- Contrastes : encre brune #2b1d14 sur crème / blanc / pépite (> 12:1) ; état « trop cher » en gris-brun lisible (> 7:1), indiqué par `aria-disabled`, pas seulement par la couleur.
- Région `aria-live` polie pour les achats, le rebirth et les gains hors-ligne ; l'affichage de la terre n'est pas annoncé en continu.
- « Mouvements réduits » (option + `prefers-reduced-motion`) coupe toute animation. Texte redimensionnable (rem), zoom autorisé.
- `lang` mis à jour avec la langue FR / EN. Non fait : essai avec de vrais lecteurs d'écran.
