/**
 * Décor vivant (V5, lot 2) : cycle jour/nuit, météo, nuages à parallaxe et petites créatures, dans un second SVG
 * (#decor) posé sur #scene. Tout est dessiné en code, en aplats (aucun dégradé) et animé en CSS (transform/opacity) :
 * rien ne tourne en JavaScript, et html.reduced / prefers-reduced-motion coupent les animations.
 * Le moment du cycle ne vient que de l'horloge : aucun état à sauvegarder.
 */
import { C } from './art';

export type Tod = 'day' | 'dusk' | 'night' | 'dawn';
export type Weather = 'clear' | 'rain' | 'snow';

/** Un jour de jeu dure 4 minutes : jour 120 s, soir 30 s, nuit 60 s, aube 30 s. */
export const DAY_MS = 240_000;
export function todAt(ms: number): Tod {
  const t = ((ms % DAY_MS) + DAY_MS) % DAY_MS / 1000;
  return t < 120 ? 'day' : t < 150 ? 'dusk' : t < 210 ? 'night' : 'dawn';
}
/** Météo : un cycle de 6 minutes (clair 3 min, pluie 1 min, clair 1 min, neige 1 min), décalé du jour pour varier. */
export const WX_MS = 360_000;
export function weatherAt(ms: number): Weather {
  const t = ((ms + 90_000) % WX_MS + WX_MS) % WX_MS / 1000;
  return t < 180 ? 'clear' : t < 240 ? 'rain' : t < 300 ? 'clear' : 'snow';
}

const k = C.ink;
const rain = Array.from({ length: 36 }, (_, i) => {
  const x = -200 + i * 17 + (i % 3) * 5;
  return `<path class="d-drop" d="M${x} -60l-3 14"/>`;
}).join('');
const snow = Array.from({ length: 18 }, (_, i) => `<circle class="d-flake" cx="${-190 + i * 36 + (i % 4) * 9}" cy="-60" r="${2 + (i % 3)}"/>`).join('');
const flies = Array.from({ length: 6 }, (_, i) => `<circle class="d-fly" cx="${40 + i * 62}" cy="${58 + (i % 3) * 6}" r="2.4"/>`).join('');
const stars = [[30, -40], [88, -20], [150, -44], [214, -14], [262, -38], [312, -22], [370, -42], [120, 4], [286, 8], [56, 14]]
  .map(([x, y]) => `<path d="M${x} ${y - 4}l1.6 2.4 2.4 1.6-2.4 1.6-1.6 2.4-1.6-2.4-2.4-1.6 2.4-1.6z" fill="#fff"/>`).join('');

export const DECOR = `
<g class="d-far"><path d="M-1400 52h3000v-10c-80-26-150-22-230 0-90-30-160-28-250-2-110-32-190-24-290 4-100-26-180-22-280 2-90-22-160-16-250 6z" fill="${C.grassDark}" opacity=".55"/></g>
<g class="d-clouds d-c-far">${[-300, 100, 480].map((x) => `<path d="M${x} -20c0-8 8-12 16-10 4-7 16-7 19 1 8 0 11 6 9 11z" fill="#fff" opacity=".7"/>`).join('')}</g>
<g class="d-clouds d-c-near">${[-100, 260, 640].map((x) => `<path d="M${x} -42c0-10 9-15 18-13 5-8 18-8 22 1 9 0 13 7 11 12z" fill="#fff" stroke="${k}" stroke-width="3" stroke-linejoin="round"/>`).join('')}</g>
<g class="d-bird"><path class="d-wing" d="M0 0q6-8 12 0q6-8 12 0" fill="none" stroke="${k}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></g>
<g class="d-bfly"><path class="d-wing" d="M0 0c-6-8-10-2-6 4 4 4 6 0 6-4zM0 0c6-8 10-2 6 4-4 4-6 0-6-4z" fill="${C.pink}" stroke="${k}" stroke-width="2" stroke-linejoin="round"/></g>
<g class="d-night"><rect x="-1400" y="-60" width="3000" height="130" fill="#1d2a5c"/><rect x="-1400" y="70" width="3000" height="230" fill="#0f1738" class="d-night-ground"/></g>
<g class="d-stars">${stars}<circle cx="60" cy="-22" r="13" fill="#f6efc4" stroke="${k}" stroke-width="3.5"/><circle cx="55" cy="-26" r="3" fill="#e0d79a"/></g>
<g class="d-flies">${flies}</g>
<g class="d-bat"><path class="d-wing" d="M0 0q5-9 11-3 3-4 6 0 3-4 6 0 6-6 11 3-6-2-11 2-3-3-6 2-3-5-6 0-3-5-6 0-5-4-11-2z" fill="${k}"/></g>
<g transform="translate(30 -90)"><g class="d-worm" stroke="${k}" stroke-width="2.5" stroke-linecap="round"><path d="M250 250c6-8 12-8 16 0s10 8 16 0" fill="none" stroke="${C.pink}" stroke-width="9"/><path d="M250 250c6-8 12-8 16 0s10 8 16 0" fill="none" stroke="${k}" stroke-width="1.5"/><circle cx="282" cy="250" r="1.6" fill="${k}" stroke="none"/></g></g>
<g class="d-rain">${rain}</g>
<g class="d-snow">${snow}</g>`;
