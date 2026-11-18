/**
 * Machines du décor (foreuse, machine, mine, excavatrice) et objets des bonus permanents, dessinés en pixel-art
 * directement sur le canvas du monde (rectangles pleins, aucun dégradé). Tout est une fonction pure du temps :
 * même image pour le même instant, donc testable sans navigateur avec un faux contexte 2D.
 * Le palier (0..4 : 1, 10, 25, 50, 100 exemplaires) change l'allure : lampe, fanion, halo, dorures.
 */
export interface Pen {
  fillStyle: string | CanvasGradient | CanvasPattern;
  globalAlpha: number;
  fillRect(x: number, y: number, w: number, h: number): void;
}

const INK = '#2b1d14', STEEL = '#aab4c4', STEEL_D = '#6b7589', ORANGE = '#e8803a', YELLOW = '#ffc21a', WOOD = '#8a5a2b';
const WOOD_D = '#5a3a1c', CREAM = '#fff3d0', TEAL = '#20c5c0', PINK = '#ff7aa8', GOLD = '#ffd84a', RED = '#e8503a';

export const MACHINE_KINDS = [2, 3, 4, 5] as const;
export const MACHINE_W = [22, 26, 16, 26]; // largeur (pixels logiques) de chaque machine, dans l'ordre de MACHINE_KINDS

/** Palier d'apparence d'après le nombre d'exemplaires (mêmes seuils que les paliers de production). */
export function tierOf(n: number): number {
  return n >= 100 ? 4 : n >= 50 ? 3 : n >= 25 ? 2 : n >= 10 ? 1 : 0;
}

/** Nombre d'exemplaires montrés : un par type possédé au minimum, plafonné par la place. */
export function shownMachines(count: number, room: number): number {
  return count <= 0 ? 0 : Math.max(1, Math.min(count, room, 1 + Math.floor(Math.log2(count + 1) * 0.7)));
}

function make(g: Pen) {
  const r = (c: string, x: number, y: number, w: number, h: number, a = 1) => {
    g.globalAlpha = a; g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); g.globalAlpha = 1;
  };
  /** Pavé avec contour encre d'un pixel. */
  const box = (c: string, x: number, y: number, w: number, h: number) => { r(INK, x - 1, y - 1, w + 2, h + 2); r(c, x, y, w, h); };
  const line = (c: string, x0: number, y0: number, x1: number, y1: number) => {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= n; i++) r(c, x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, 1, 1);
  };
  return { r, box, line };
}

/** Décorations communes selon le palier : lampe (1), fanion (2), halo (3), dorures + étincelle (4). */
function finish(p: ReturnType<typeof make>, x: number, top: number, w: number, tier: number, t: number, calm: boolean) {
  const { r, line } = p;
  if (tier >= 3) r(tier >= 4 ? GOLD : TEAL, x - 3, top - 4, w + 6, 4 + 18, calm ? 0.14 : 0.1 + 0.06 * Math.sin(t * 2.4));
  if (tier >= 1) { r(INK, x + 2, top - 3, 3, 3); r(calm || Math.sin(t * 4 + x) > -0.3 ? '#fff7b0' : YELLOW, x + 3, top - 2, 1, 1); }
  if (tier >= 2) { line(INK, x + w - 3, top - 6, x + w - 3, top); r(tier >= 4 ? GOLD : PINK, x + w - 2, top - 6, 3, 2); }
  if (tier >= 4 && !calm && Math.sin(t * 5 + x) > 0.6) { r('#fff', x + (w >> 1), top - 6, 1, 3); r('#fff', x + (w >> 1) - 1, top - 5, 3, 1); }
}

/**
 * Dessine une machine dont le pied est à `fy` (sol de la galerie) et le bord gauche à `x`.
 * `rise` (0..1) : sortie de terre à la construction ; `pulse` (0..1) : éclat juste après une livraison.
 */
export function drawMachine(g: Pen, kind: number, x: number, fy: number, t: number, tier: number, calm: boolean, rise = 1, pulse = 0): void {
  const p = make(g);
  const { r, box, line } = p;
  const lift = Math.round((1 - rise) * 16);
  const y = fy + lift; // pied, descendu pendant la sortie de terre
  const f = calm ? 0 : Math.floor(t * 8);
  const body = tier >= 4 ? GOLD : ORANGE;
  let top = y - 10, w = 22;
  if (kind === 2) { // foreuse à vapeur : mèche qui tourne, cheminée qui fume
    w = 22; top = y - 11;
    box(INK, x, y - 3, 16, 3); r(STEEL_D, x + 1, y - 2, 14, 1);
    for (let i = 0; i < 4; i++) r(STEEL, x + 2 + i * 4 + (f + i) % 2, y - 2, 1, 1);
    box(body, x + 2, y - 9, 10, 6); r(CREAM, x + 3, y - 8, 4, 2); r(STEEL_D, x + 8, y - 8, 3, 3);
    box(STEEL, x + 12, y - 8, 2, 4);
    box(STEEL_D, x + 4, y - 12, 3, 3);
    // mèche : bande de pixels qui défile (effet de vis)
    for (let i = 0; i < 6; i++) { const wd = 5 - i; r(INK, x + 14 + i - 0, y - 7 - 0, 1, 1); if (wd > 0) r((i + f) % 2 ? STEEL : STEEL_D, x + 14 + i, y - 7 + (i >> 1), 1, Math.max(1, 5 - i * 1 - (i >> 1) * 2)); }
    if (!calm) for (let i = 0; i < 3; i++) { const ph = (t * 1.3 + i / 3) % 1; r(CREAM, x + 5 + Math.sin(ph * 6 + i) * 1.5, y - 14 - ph * 8, 2, 2, 0.8 * (1 - ph)); }
  } else if (kind === 3) { // tunnelier : tambour rayé, tête de forage, tapis de déblais
    w = 26; top = y - 12;
    box(STEEL_D, x, y - 2, 24, 2);
    for (let i = 0; i < 6; i++) r(YELLOW, x + 1 + ((i * 4 + f) % 22), y - 1, 1, 1);
    box(STEEL, x + 1, y - 11, 17, 9); r(INK, x + 1, y - 7, 17, 1);
    for (let i = 0; i < 8; i++) r(STEEL_D, x + 2 + ((i * 2 + f) % 16), y - 10, 1, 7);
    r(RED, x + 3, y - 9, 3, 2); r(CREAM, x + 4, y - 9, 1, 1);
    box(body, x + 18, y - 12, 3, 11);
    for (let i = 0; i < 5; i++) r(i % 2 === (f % 2) ? YELLOW : INK, x + 21, y - 11 + i * 2, 3, 1);
    r(INK, x + 24, y - 8, 1, 3);
    if (!calm) for (let i = 0; i < 2; i++) { const ph = (t * 0.9 + i / 2) % 1; r(WOOD, x + 22 - ph * 22, y - 3 - Math.abs(Math.sin(ph * 9)), 2, 1); }
  } else if (kind === 4) { // puits de mine : ascenseur, benne qui monte et descend, poulie
    w = 16; top = y - 16;
    box(WOOD, x, y - 16, 2, 16); box(WOOD, x + 12, y - 16, 2, 16);
    box(WOOD_D, x, y - 17, 14, 2);
    const ph = calm ? 0.5 : (Math.sin(t * 1.4) + 1) / 2; // benne : va-et-vient
    const cy = y - 14 + ph * 10;
    r(INK, x + 7, y - 15, 1, Math.max(0, cy - (y - 15)));
    box(STEEL_D, x + 3, cy, 8, 5); r(YELLOW, x + 4, cy - 1, 2, 1); r(GOLD, x + 7, cy - 1, 3, 1); r(STEEL, x + 3, cy + 4, 8, 1);
    box(STEEL, x + 5, y - 19, 5, 4); r(INK, x + 7, y - 18, 1, 2);
    r(INK, x, y - 1, 14, 1); for (let i = 0; i < 4; i++) r(WOOD, x + i * 4, y - 1, 2, 1);
    top = y - 19;
  } else { // excavatrice : bras articulé qui balance son godet
    w = 26; top = y - 15;
    box(INK, x, y - 3, 14, 3); r(STEEL_D, x + 1, y - 2, 12, 1);
    for (let i = 0; i < 4; i++) r(STEEL, x + 2 + i * 3 + (f + i) % 2, y - 2, 1, 1);
    box(body, x + 1, y - 9, 12, 6); box(CREAM, x + 2, y - 12, 5, 3); r(TEAL, x + 3, y - 11, 3, 1); r(STEEL_D, x + 9, y - 8, 3, 2);
    const sw = calm ? 0.4 : (Math.sin(t * 1.8) + 1) / 2;
    const jx = x + 12, jy = y - 8;
    const ex = jx + 6, ey = jy - 7 + sw * 2;
    const bx = ex + 6 - sw * 2, by = ey + 3 + sw * 8;
    line(INK, jx, jy, ex, ey); line(INK, ex, ey, bx, by);
    line(body, jx, jy - 1, ex, ey - 1); line(body, ex, ey - 1, bx, by - 1);
    box(STEEL_D, bx - 1, by - 1, 4, 4);
    if (sw > 0.8 && !calm) r(WOOD, bx, by + 4, 2, 1);
    if (tier >= 1) r(YELLOW, x + 1, y - 9, 12, 1);
  }
  // éclat de livraison : la machine blanchit un instant
  if (pulse > 0) r('#fff', x - 1, top - 1, w + 2, y - top + 2, pulse * 0.45);
  // sortie de terre : poussière + éclair
  if (rise < 1) r('#fff', x - 1, top - 1, w + 2, y - top + 2, (1 - rise) * 0.7);
  if (rise >= 1 || rise > 0.6) finish(p, x, top, w, tier, t, calm);
}

/** Bonus permanents, visibles tant que leur niveau est > 0. `lvl` = niveau, `(x, fy)` = coin bas gauche de l'emplacement. */
export function drawPerm(g: Pen, id: number, lvl: number, x: number, fy: number, t: number, calm: boolean): void {
  if (lvl <= 0) return;
  const { r, box, line } = make(g);
  if (id === 0) { // Lunettes : lentilles qui scintillent (une paire par niveau, 8 au plus)
    const n = Math.min(lvl, 8);
    for (let i = 0; i < n; i++) {
      const gx = x + (i % 4) * 7, gy = fy - 5 - (i >> 2) * 6;
      r(INK, gx, gy, 3, 3); r(INK, gx + 4, gy, 3, 3); r(INK, gx + 3, gy + 1, 1, 1);
      r(CREAM, gx + 1, gy + 1, 1, 1); r(CREAM, gx + 5, gy + 1, 1, 1);
      const on = calm || Math.sin(t * 3 + i * 1.9) > 0.5;
      if (on) { r('#fff', gx + 1, gy - 2, 1, 1); r('#fff', gx, gy - 1, 3, 1, 0.8); r('#fff', gx + 1, gy, 1, 1); }
    }
  } else if (id === 1) { // Pelle d'or : plantée dans la terre, de plus en plus grande, reflets
    const hgt = 6 + Math.min(lvl, 10);
    line(INK, x + 3, fy - hgt - 2, x + 3, fy - 3); r(WOOD, x + 3, fy - hgt - 1, 1, hgt - 1);
    box(GOLD, x + 1, fy - hgt - 4, 5, 3);
    box(GOLD, x, fy - 4, 7, 4); r(INK, x + 3, fy - 1, 1, 1);
    r('#fff', x + 1, fy - 3, 1, 2);
    if (!calm && Math.sin(t * 2.6) > 0.7) { r('#fff', x + 5, fy - hgt - 4, 1, 1); r('#fff', x + 4, fy - hgt - 5, 3, 1, 0.8); }
  } else if (id === 2) { // Pécule : tas de pièces, une rangée de plus tous les 3 niveaux
    const rows = 1 + Math.min(4, Math.floor(lvl / 3));
    for (let rw = 0; rw < rows; rw++) {
      const n = rows - rw + 1;
      for (let i = 0; i < n; i++) { const cx = x + rw + i * 4, cy = fy - 3 - rw * 2; box(YELLOW, cx, cy, 3, 2); r(GOLD, cx, cy, 2, 1); }
    }
  } else if (id === 3) { // Sacoche : sacs de toile (un de plus tous les 2 niveaux)
    const n = 1 + Math.floor(Math.min(lvl, 10) / 2);
    for (let i = 0; i < n; i++) {
      const sx = x + (i % 3) * 6, sy = fy - 5 - (i >= 3 ? 5 : 0);
      box('#d8b878', sx, sy, 5, 5); r(INK, sx + 1, sy - 1, 3, 1); r(RED, sx + 1, sy, 3, 1); r(WOOD, sx + 2, sy + 2, 1, 1);
    }
  }
}
