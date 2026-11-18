/**
 * Pixel-art des petites taupes ouvrières (une par type de bâtiment), dessinées en code puis pré-rendues dans de
 * petits canvas : le jeu ne fait ensuite que des `drawImage`. Aplats uniquement, contour encre, aucun dégradé.
 * Une image fait 16×16 pixels logiques ; la taupe regarde à droite, la version miroir est pré-calculée.
 */
export const SPR_W = 16;
export const SPR_H = 16;
const INK = '#2b1d14', FUR = '#7b563c', FUR_D = '#5c3f2b', CREAM = '#f6dcb4', PINK = '#ff7aa8', GOLD = '#ffc21a', GOLD_D = '#d98f12';
const STEEL = '#c3cfd6', STEEL_D = '#8a9aa6', WOOD = '#c98a45', WOOD_D = '#8a5a2b', RED = '#e8503a', LAMP = '#fff7b0';

/** Casque (ou casquette) de chaque type : [aplat, ombre, lampe frontale ?]. */
const HATS: [string, string, boolean][] = [
  ['#e8503a', '#b53a28', false], // apprentie : casquette rouge
  ['#ffc21a', '#d98f12', false], // taupinière : casque jaune
  ['#ff8a3d', '#d9622a', true], // foreuse : orange, lampe
  ['#3b6fb6', '#2a4f86', true], // machine : bleu, lampe
  ['#4cc15a', '#2f8f3c', true], // mine : vert, lampe
  ['#b58cf0', '#7d56c4', true], // excavatrice : violet, lampe
];

/** Corps de profil (12×11, origine en (2,4) dans l'image). `h` casque, `H` ombre du casque, `l` lampe. */
const BODY = [
  '...kkkk.....',
  '..khhhhk....',
  '.khhlhhHk...',
  '.kkkkkkkkk..',
  '..kfffkfffk.',
  '.kffffffcpk.',
  '.kfdffffcck.',
  '..kfdfffffk.',
  '..kfffddfk..',
  '..kkfkkfkk..',
  '...kk..kk...',
];
const FEET_B = ['..kkfkkfkk..', '...kk..kk...']; // pas suivant : jambes resserrées

type Pose = 'walk0' | 'walk1' | 'up' | 'down' | 'carry0' | 'carry1';
export const POSES: Pose[] = ['walk0', 'walk1', 'up', 'down', 'carry0', 'carry1'];

function px(g: CanvasRenderingContext2D, x: number, y: number, c: string, w = 1, h = 1) {
  g.fillStyle = c;
  g.fillRect(x, y, w, h);
}

/** Outil tenu : le manche et la tête changent selon le type. `pose` = sur l'épaule, levé, ou abattu. */
function tool(g: CanvasRenderingContext2D, type: number, pose: Pose) {
  const up = pose === 'up', down = pose === 'down';
  // manche (bois) : trois poses
  const hand: [number, number][] = up ? [[10, 10], [11, 9], [12, 8], [13, 7], [13, 6]] : down ? [[10, 9], [11, 10], [12, 11], [13, 12], [14, 13]] : [[5, 11], [4, 10], [3, 9], [3, 8], [2, 7]];
  const [hx, hy] = hand[hand.length - 1];
  for (const [x, y] of hand) px(g, x, y, WOOD_D);
  switch (type) {
    case 0: px(g, hx - 1, hy - 2, STEEL, 3, 2); px(g, hx - 1, hy, STEEL_D, 3, 1); break; // pelle
    case 1: px(g, hx - 2, hy - 1, STEEL, 5, 1); px(g, hx - 2, hy, STEEL_D, 1, 2); px(g, hx + 2, hy, STEEL_D, 1, 2); break; // pioche
    case 2: px(g, hx - 1, hy - 3, STEEL, 2, 3); px(g, hx, hy - 4, RED, 1, 1); px(g, hx - 1, hy - 1, STEEL_D, 2, 1); break; // foreuse
    case 3: px(g, hx - 1, hy - 3, STEEL_D, 3, 3); px(g, hx, hy - 4, RED, 1, 1); px(g, hx, hy, STEEL, 1, 2); break; // marteau-piqueur
    case 4: px(g, hx - 1, hy - 3, RED, 2, 3); px(g, hx, hy - 4, GOLD, 1, 1); px(g, hx - 1, hy, GOLD_D, 2, 1); break; // dynamite
    default: px(g, hx - 2, hy - 2, GOLD, 4, 2); px(g, hx - 2, hy, GOLD_D, 4, 1); px(g, hx, hy - 3, GOLD, 1, 1); break; // grosse pioche dorée
  }
}

function drawFrame(type: number, pose: Pose, flip: boolean): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = SPR_W; c.height = SPR_H;
  const g = c.getContext('2d')!;
  if (flip) { g.translate(SPR_W, 0); g.scale(-1, 1); }
  const [hat, hatD, lamp] = HATS[type];
  const bob = pose === 'walk1' || pose === 'carry1' ? 1 : 0;
  const rows = BODY.slice();
  if (pose === 'walk1' || pose === 'carry1') { rows[9] = FEET_B[0]; rows[10] = FEET_B[1]; }
  const pal: Record<string, string> = { k: INK, f: FUR, d: FUR_D, c: CREAM, p: PINK, h: hat, H: hatD, l: lamp ? LAMP : hat };
  const ox = 2, oy = 4 - (pose === 'walk1' || pose === 'carry1' ? 0 : 0);
  // la taupe lève un peu les pieds : le haut du corps descend d'un pixel au pas B
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.') continue;
      px(g, ox + x, oy + y + (y < 9 ? bob : 0), pal[ch] ?? INK);
    }
  });
  if (pose === 'carry0' || pose === 'carry1') {
    // pépite sur la tête, bras levés
    const by = oy + bob - 1;
    px(g, 5, by - 2, INK, 5, 4); px(g, 6, by - 1, GOLD, 3, 2); px(g, 6, by - 1, '#fff3b0', 1, 1); px(g, 8, by, GOLD_D, 1, 1);
    px(g, 4, by + 3, INK, 1, 1); px(g, 10, by + 3, INK, 1, 1);
  } else tool(g, type, pose);
  return c;
}

export type SpriteSet = Record<string, HTMLCanvasElement>;
let cache: SpriteSet | null = null;
/** Toutes les images, rendues une seule fois : clé `type:pose:sens` (sens 1 = vers la droite, -1 = vers la gauche). */
export function sprites(): SpriteSet {
  if (cache) return cache;
  cache = {};
  for (let t = 0; t < HATS.length; t++) for (const p of POSES) { cache[`${t}:${p}:1`] = drawFrame(t, p, false); cache[`${t}:${p}:-1`] = drawFrame(t, p, true); }
  return cache;
}

/** Coffre de dépôt (14×9) où chaque ouvrière vide sa pépite. */
export function chest(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 14; c.height = 10;
  const g = c.getContext('2d')!;
  px(g, 0, 3, INK, 14, 7); px(g, 1, 4, WOOD, 12, 5); px(g, 1, 4, WOOD_D, 12, 1); px(g, 6, 3, INK, 2, 3); px(g, 6, 5, GOLD, 2, 2);
  px(g, 1, 0, INK, 12, 4); px(g, 2, 1, GOLD, 4, 2); px(g, 7, 1, GOLD_D, 4, 2); px(g, 3, 1, '#fff3b0', 1, 1);
  return c;
}
