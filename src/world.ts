/**
 * Décor vivant et petites taupes ouvrières, sur un seul canvas en pixel-art (1 pixel logique = PIX pixels CSS,
 * `image-rendering: pixelated`). Une taupe affichée par taupe achetée (regroupées au-delà du plafond) : elle sort
 * du ciel en rebondissant, creuse dans une galerie, rapporte une pépite au coffre, puis repart.
 * Perf : canvas minuscule, images pré-rendues, 30 images/s, arrêt quand la page est cachée ; aucun dégradé.
 */
import { SPR_H, SPR_W, chest, sprites } from './sprites';
import { crewCap, distribute } from './crew-math';

export interface WorldHooks {
  /** Une ouvrière vide sa pépite : position CSS dans la scène, gain réel représenté, type. */
  deliver(x: number, y: number, gain: number, kind: number): void;
  /** Des taupes viennent d'être achetées : position CSS, nombre, type. */
  arrive(x: number, y: number, n: number, kind: number): void;
}

type St = 'fall' | 'walk' | 'dig' | 'carry' | 'drop';
interface Agent {
  kind: number; w: number; lane: number; x: number; y: number; vy: number; dir: 1 | -1; st: St; t: number; tx: number; hop: number; ph: number;
}
interface Bit { x: number; y: number; vx: number; vy: number; life: number; c: string }

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const LANE_H = 14; // hauteur d'une galerie (pixels logiques)
const CYCLE = 9; // secondes moyennes d'un aller-retour (sert à rapporter le gain réel)
const TINT = ['#000000', '#2a1450', '#06323a'];
const TINT_A = [0.0, 0.2, 0.26];

export interface World {
  setCrew(counts: number[], rates: number[], animate: boolean): void;
  setRates(rates: number[]): void;
  setDepth(d: number): void;
  setReduced(r: boolean): void;
  setLevel(n: number): void;
  kick(power: number): void;
  resize(): void;
}

export function createWorld(canvas: HTMLCanvasElement, hooks: WorldHooks): World {
  const g = canvas.getContext('2d', { alpha: true })!;
  const spr = sprites();
  const chestImg = chest();
  let W = 100, H = 100, PIX = 3;
  let depth = 0, reduced = false, level = 0, lanes = 1, cap = 12;
  let counts: number[] = [0, 0, 0, 0, 0, 0];
  let rates: number[] = [0, 0, 0, 0, 0, 0];
  let agents: Agent[] = [];
  const bits: Bit[] = [];
  let camX = 0, camV = 0;
  let last = 0, clock = 0;
  const laneY = (l: number) => Math.round(H * 0.36 + l * (LANE_H + 3));
  const laneCount = () => Math.max(1, Math.min(4, Math.floor((H * 0.9 - H * 0.36) / (LANE_H + 3))));

  // poussière : deux couches de profondeur
  const motes = Array.from({ length: 28 }, () => ({ x: Math.random(), y: Math.random(), z: Math.random() < 0.5 ? 1 : 2, s: Math.random() * 6.3 }));
  const crystalSeeds = Array.from({ length: 9 }, (_, i) => ({ x: (i * 0.137 + 0.05) % 1, y: 0.3 + ((i * 0.31) % 0.6), h: 4 + (i % 3) * 2, z: i % 2 ? 0.6 : 1 }));

  function resize() {
    const r = canvas.getBoundingClientRect();
    PIX = r.width >= 520 ? 4 : r.width >= 330 ? 3 : 2;
    W = Math.max(40, Math.ceil(r.width / PIX));
    H = Math.max(40, Math.ceil(r.height / PIX));
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    lanes = laneCount();
    cap = Math.min(crewCap(W, H), lanes * Math.max(3, Math.floor(W / 22)));
    layout(false);
  }

  const chestX = (l: number) => (l % 2 === 0 ? 4 : W - 4 - 14);
  function css(x: number, y: number): [number, number] { return [x * PIX, y * PIX]; }

  /** Recale les agents sur le plafond et les galeries actuels, sans faire réapparaître personne. */
  function layout(animate: boolean, added: number[] = []) {
    const shown = distribute(counts, cap);
    const next: Agent[] = [];
    for (let k = 0; k < shown.length; k++) {
      const mine = agents.filter((a) => a.kind === k);
      const w = shown[k] > 0 ? counts[k] / shown[k] : 1;
      for (let i = 0; i < shown[k]; i++) {
        let a = mine[i];
        if (!a) {
          const lane = (next.length) % lanes;
          a = { kind: k, w, lane, x: rnd(12, W - 28), y: laneY(lane), vy: 0, dir: Math.random() < 0.5 ? 1 : -1, st: 'walk', t: rnd(0, 2), tx: rnd(10, W - 24), hop: 0, ph: rnd(0, 6) };
          if (animate && added[k] > 0) { a.st = 'fall'; a.y = -SPR_H - rnd(0, 20); a.vy = 0; }
        }
        a.w = w;
        if (a.lane >= lanes) { a.lane = next.length % lanes; a.y = laneY(a.lane); }
        next.push(a);
      }
    }
    agents = next;
    // les taupes sans galerie n'existent plus : une galerie reçoit au plus ~W/20 taupes (la répartition est déjà plafonnée)
  }

  function setCrew(c: number[], r: number[], animate: boolean) {
    const added = c.map((n, i) => Math.max(0, n - (counts[i] ?? 0)));
    counts = c.slice(); rates = r.slice();
    layout(animate, added);
    if (animate) {
      added.forEach((n, k) => {
        if (n <= 0) return;
        const mine = agents.filter((a) => a.kind === k);
        mine.forEach((a) => { a.hop = 0.5; });
        const a = mine[mine.length - 1];
        if (a) { const [cx, cy] = css(Math.max(10, Math.min(W - 10, a.x + 8)), laneY(a.lane)); hooks.arrive(cx, cy, n, k); }
      });
    }
  }

  function spark(x: number, y: number, n: number, colors: string[]) {
    if (reduced) return;
    for (let i = 0; i < n && bits.length < 90; i++) bits.push({ x, y, vx: rnd(-26, 26), vy: rnd(-44, -10), life: rnd(0.35, 0.7), c: colors[i % colors.length] });
  }

  function update(dt: number) {
    const sp = reduced ? 0.55 : 1;
    for (const a of agents) {
      const baseY = laneY(a.lane);
      a.t -= dt;
      if (a.hop > 0) a.hop -= dt;
      const speed = (13 + a.kind * 2) * sp;
      switch (a.st) {
        case 'fall': {
          a.vy += 190 * dt; a.y += a.vy * dt;
          if (a.y >= baseY) {
            a.y = baseY;
            if (a.vy > 60 && !reduced) { a.vy = -a.vy * 0.4; spark(a.x + SPR_W / 2, baseY + 12, 8, ['#ffc21a', '#fff', '#ff7aa8']); } else { a.vy = 0; a.st = 'walk'; a.tx = rnd(10, W - 24); }
          }
          if (reduced && a.y >= baseY) { a.y = baseY; a.st = 'walk'; }
          break;
        }
        case 'walk': {
          a.dir = a.tx > a.x ? 1 : -1;
          a.x += a.dir * speed * dt;
          if (Math.abs(a.tx - a.x) < 2) { a.st = 'dig'; a.t = rnd(1.3, 2.7); }
          break;
        }
        case 'dig': {
          if (!reduced && Math.random() < dt * 9) bits.push({ x: a.x + (a.dir > 0 ? 14 : 2), y: baseY + 11, vx: a.dir * rnd(6, 22), vy: rnd(-34, -12), life: 0.5, c: depth >= 2 ? '#8ff0ea' : '#8a5a2b' });
          if (a.t <= 0) { a.st = 'carry'; a.tx = chestX(a.lane) + 3; }
          break;
        }
        case 'carry': {
          a.dir = a.tx > a.x ? 1 : -1;
          a.x += a.dir * speed * 1.15 * dt;
          if (Math.abs(a.tx - a.x) < 2) { a.st = 'drop'; a.t = 0.4; }
          break;
        }
        case 'drop': {
          if (a.t <= dt) {
            a.st = 'walk'; a.tx = rnd(14, W - 26); a.hop = 0.3;
            spark(a.x + SPR_W / 2, baseY + 4, 5, ['#ffc21a', '#fff3b0']);
            const [cx, cy] = css(a.x + SPR_W / 2, baseY);
            hooks.deliver(cx, cy, (rates[a.kind] / Math.max(1, counts[a.kind] / a.w)) * CYCLE, a.kind);
          }
          break;
        }
      }
    }
    for (let i = bits.length - 1; i >= 0; i--) {
      const b = bits[i];
      b.life -= dt; b.vy += 120 * dt; b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.life <= 0) bits.splice(i, 1);
    }
    camX += camV * dt; camV += (-camX * 40 - camV * 9) * dt;
  }

  const fr = (n: number) => Math.round(n);
  function rect(c: string, x: number, y: number, w: number, h: number, a = 1) {
    g.globalAlpha = a; g.fillStyle = c; g.fillRect(fr(x), fr(y), w, h); g.globalAlpha = 1;
  }
  function crystal(x: number, y: number, h: number, c: string, glow: number) {
    if (glow > 0) { g.globalAlpha = glow; g.fillStyle = c; g.beginPath(); g.arc(fr(x) + 2, fr(y) - h / 2, 4 + h * 0.8, 0, 6.283); g.fill(); g.globalAlpha = 1; }
    // pointe, corps, pointe : contour encre puis aplat, reflet blanc
    for (let i = 0; i < h; i++) {
      const wide = i === 0 || i === h - 1 ? 1 : i === 1 || i === h - 2 ? 3 : 5;
      rect('#2b1d14', x + 2 - Math.floor(wide / 2) - 1, y - h + i, wide + 2, 1);
    }
    for (let i = 0; i < h; i++) {
      const wide = i === 0 || i === h - 1 ? 1 : i === 1 || i === h - 2 ? 3 : 5;
      rect(c, x + 2 - Math.floor(wide / 2), y - h + i, wide, 1);
    }
    rect('#fff', x + 1, y - h + 2, 1, Math.max(1, h - 4), 0.85);
  }

  function draw(now: number) {
    g.clearRect(0, 0, W, H);
    const calm = reduced;
    const tt = calm ? 0 : clock;
    const sway = calm ? 0 : Math.sin(tt * 0.35) * 2;
    const camOff = camX + sway;

    // rayons de lumière du jour qui descendent (translucides, plats), de moins en moins visibles avec la profondeur
    if (depth < 2) {
      const a = (depth === 0 ? 0.1 : 0.05) + (calm ? 0 : Math.sin(tt * 0.5) * 0.02);
      for (const bx of [0.25, 0.62]) {
        g.globalAlpha = a; g.fillStyle = '#fff6c8'; g.beginPath();
        const x0 = bx * W + camOff * 0.3;
        g.moveTo(x0, H * 0.23); g.lineTo(x0 + 10, H * 0.23); g.lineTo(x0 - 18, H * 0.8); g.lineTo(x0 - 40, H * 0.8); g.closePath(); g.fill();
        g.globalAlpha = 1;
      }
    }

    // cristaux (de plus en plus nombreux avec la progression), lueur qui pulse
    const nCry = Math.min(crystalSeeds.length, (depth >= 2 ? 4 : depth === 1 ? 2 : 0) + Math.floor(level / 2));
    for (let i = 0; i < nCry; i++) {
      const c = crystalSeeds[i];
      const x = ((c.x * (W - 10) + camOff * c.z * 1.4) % W + W) % W;
      const glow = calm ? 0.16 : 0.12 + 0.1 * Math.sin(tt * 1.8 + i * 1.7);
      crystal(x, c.y * H, c.h, i % 3 === 0 ? '#ff7aa8' : '#20c5c0', glow);
    }

    // galeries
    for (let l = 0; l < lanes; l++) {
      const y = laneY(l);
      rect('#2b1d14', 0, y - 1, W, LANE_H + 2);
      rect('#3a2618', 0, y, W, LANE_H);
      rect('#4a301d', 0, y, W, 1);
      for (let x = 12 + (l % 2) * 12; x < W - 8; x += 26) {
        rect('#8a5a2b', x, y, 1, LANE_H); rect('#8a5a2b', x - 2, y, 5, 1);
        // lampe suspendue, qui pulse
        const on = calm || Math.sin(tt * 3 + x + l) > -0.4;
        rect(depth >= 2 ? '#8ff0ea' : '#fff7b0', x, y + 2, 1, 1, on ? 1 : 0.35);
        if (on && !calm) rect(depth >= 2 ? '#8ff0ea' : '#ffc21a', x - 1, y + 2, 3, 3, 0.18);
      }
      g.drawImage(chestImg, chestX(l), y + LANE_H - 10);
    }

    // vers dans la terre, au-dessus de la première galerie
    const wy = Math.round(H * 0.3);
    for (let w = 0; w < 2; w++) {
      const head = ((tt * (calm ? 0 : 4 + w * 2) + w * 70) % (W + 40)) - 20;
      for (let i = 0; i < 7; i++) {
        const x = (w === 0 ? head - i * 2 : W - head + i * 2) + camOff * 0.5;
        const y = wy + w * 5 + Math.round(Math.sin(i * 0.9 + tt * 4 + w) * 1.5);
        rect('#2b1d14', x - 1, y - 1, 4, 4); rect(i === 0 ? '#e8503a' : '#ff7aa8', x, y, 2, 2);
      }
    }

    // teinte d'ambiance (aplat translucide) : chaque palier assombrit et colore la galerie
    const lv = Math.min(1, level / 8);
    rect(TINT[depth], 0, 0, W, H, TINT_A[depth] + lv * 0.08 + (calm ? 0 : Math.sin(tt * 0.12) * 0.03));

    // ouvrières
    const ordered = agents.slice().sort((a, b) => a.y - b.y);
    for (const a of ordered) {
      const lane = laneY(a.lane);
      const step = Math.floor((calm ? now / 2 : now) / 150 + a.ph) % 2;
      let pose = step ? 'walk1' : 'walk0';
      if (a.st === 'dig') pose = Math.floor(now / 160 + a.ph) % 2 ? 'up' : 'down';
      else if (a.st === 'carry' || a.st === 'drop') pose = step ? 'carry1' : 'carry0';
      else if (a.st === 'fall') pose = 'up';
      const hop = a.hop > 0 && !calm ? -Math.abs(Math.sin(a.hop * 10)) * 5 : 0;
      const y = (a.st === 'fall' ? a.y : lane) + hop - 2;
      const img = spr[`${a.kind}:${pose}:${a.dir}`];
      if (a.st !== 'fall') rect('#000', a.x + 3, lane + LANE_H - 1, 10, 1, 0.25);
      // un groupe est montré par une petite bande : une taupe devant, une ou deux derrière
      if (a.w >= 1.5) { g.globalAlpha = 0.8; g.drawImage(img, fr(a.x - 5 * a.dir), fr(y) + 1); g.globalAlpha = 1; }
      if (a.w >= 10) { g.globalAlpha = 0.65; g.drawImage(img, fr(a.x - 10 * a.dir), fr(y) + 2); g.globalAlpha = 1; }
      g.drawImage(img, fr(a.x), fr(y));
    }

    // éclats
    for (const b of bits) rect(b.c, b.x, b.y, 1, 1, Math.min(1, b.life * 3));

    // poussière : deux couches qui défilent à des vitesses différentes (parallaxe)
    if (!calm) {
      for (const m of motes) {
        const x = (((m.x * W + tt * 2.5 * m.z + camOff * m.z * 1.8) % W) + W) % W;
        const y = ((m.y * H - tt * 1.2 * m.z) % H + H) % H;
        rect('#fff3d0', x, y, m.z === 2 ? 2 : 1, m.z === 2 ? 2 : 1, 0.25 + 0.3 * Math.abs(Math.sin(tt * 0.9 + m.s)));
      }
    }

  }

  let raf = 0;
  function frame(ts: number) {
    raf = requestAnimationFrame(frame);
    if (document.hidden) { last = ts; return; }
    const dt = ts - last;
    if (dt < 32) return; // 30 images/s : le pixel-art n'a pas besoin de plus
    last = ts;
    const d = Math.min(dt / 1000, 0.1);
    clock += d;
    update(d);
    draw(ts);
  }
  resize();
  new ResizeObserver(() => resize()).observe(canvas);
  raf = requestAnimationFrame(frame);
  void raf;

  return {
    setCrew,
    setRates(r) { rates = r.slice(); },
    setDepth(d) { depth = d; },
    setReduced(r) { reduced = r; },
    setLevel(n) { level = n; },
    kick(p) { camV += (Math.random() < 0.5 ? -1 : 1) * Math.min(p, 40); },
    resize,
  };
}
