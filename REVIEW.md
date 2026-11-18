# Revue complète 2.1.0 : problèmes trouvés et corrigés

| # | Problème | Correction |
|---|---|---|
| 1 | Onglet en arrière-plan : `dt` plafonné à 1 s par tick, production perdue | Horloge murale (`Date.now()`) avec rattrapage ; au-delà de 60 s : hors ligne (toast ≤ 2 min, fenêtre au-delà) |
| 2 | `sanitize` ne bornait rien : niveaux permanents trop hauts → `pow(4, l−1)` infini, NaN/Infinity en sauvegarde | Bornes (`MAX_DIRT` 1e36, `MAX_LEVEL` 1000, perms ≤ max, succès filtrés sur les ids connus) |
| 3 | Deux onglets ouverts s'écrasaient la sauvegarde | Événement `storage` : l'onglet dépassé passe en lecture seule et prévient |
| 4 | `fmt` affichait une notation scientifique au-delà de 1e36 | Plafond « 999 999 999 999 …+ » |
| 5 | `rebirth` : `lastPs` lu après le changement d'état (trouvé par un test) | Lu avant les gemmes |
| 6 | Pelle en or et Pécule dominées en milieu de partie (achat mort) | Refonte (voir BALANCE.md) ; niveaux existants conservés avec la nouvelle signification |
| 7 | Rendu toutes les 100 ms (lourd sur mobile) | Rendu toutes les 250 ms, simulation à 100 ms |
| 8 | Le temps hors ligne comptait dans le temps de jeu | `playTime` restauré à la reprise hors ligne |
| 9 | Aucun moyen de sauvegarder/transférer | Export/import `TT1.<base64>` borné (20 000 car.), validé, confirmation en deux appuis |
| 10 | Sons : un seul bip, actif avant tout geste | Moteur Web Audio (`sound.ts`) : débloqué au premier geste, hauteur aléatoire, volume réglable et coupure persistés, pause si page cachée |

Migration : V1 (×10) et V2 → v3 sans perte (testé dans `tests/features.test.ts`).
Code mort : aucun trouvé après la refonte ; `tests/probe.test.ts` supprimé.
Non vérifié : vrai téléphone, lecteur d'écran réel, écoute des sons.
