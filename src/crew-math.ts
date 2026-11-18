/**
 * Maths pures de l'équipe de fond : combien de petites taupes montrer pour un nombre réel d'ouvrières.
 * L'affichage est plafonné (performances sur mobile) ; au-delà, une taupe affichée représente un groupe.
 */

/** Répartit `cap` taupes affichées entre les types, au prorata des nombres réels (au moins une par type possédé). */
export function distribute(counts: number[], cap: number): number[] {
  const total = counts.reduce((a, b) => a + b, 0);
  if (total <= cap) return counts.slice();
  const owned = counts.filter((c) => c > 0).length;
  const room = Math.max(owned, cap);
  const shown = counts.map((c) => (c > 0 ? Math.max(1, Math.floor((c / total) * room)) : 0));
  let sum = shown.reduce((a, b) => a + b, 0);
  // trop d'affichées (les « au moins une » ont débordé) : on retire au type le plus chargé
  while (sum > room) {
    let k = -1, best = 0;
    shown.forEach((n, i) => { if (n > 1 && counts[i] / n > best) { best = counts[i] / n; k = i; } });
    if (k < 0) break;
    shown[k]--; sum--;
  }
  // pas assez : on ajoute au type dont le groupe est le plus gros
  while (sum < room) {
    let k = -1, best = 1;
    shown.forEach((n, i) => { if (n > 0 && n < counts[i] && counts[i] / n > best) { best = counts[i] / n; k = i; } });
    if (k < 0) break;
    shown[k]++; sum++;
  }
  return shown;
}

/** Nombre maximum de taupes affichées selon la taille de la scène (en pixels logiques) : sobre sur mobile. */
export function crewCap(w: number, h: number): number {
  return Math.max(6, Math.min(24, Math.floor((w * h) / 900)));
}
