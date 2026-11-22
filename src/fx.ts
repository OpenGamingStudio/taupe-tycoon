/**
 * Effets de dopamine sur un canvas par-dessus la scène : pièces et gemmes qui volent vers le compteur, confettis,
 * étincelles. Le canvas ne tourne (requestAnimationFrame) que tant qu'il reste des particules ; tout est en
 * transform/canvas, rien ne force la mise en page. Aplats uniquement, aucun dégradé.
 */
export type CoinKind = 'dirt' | 'gold' | 'gem';

interface P {
  t: 'coin' | 'confetti' | 'spark' | 'star' | 'shock';
  x: number; y: number; vx: number; vy: number; a: number; va: number; age: number; life: number; c: string; s: number;
  kind?: CoinKind; land?: () => void; delay?: number;
}

const CONFETTI = ['#ffc21a', '#ff7aa8', '#20c5c0', '#4cc15a', '#3b6fb6', '#e8503a', '#ffffff'];
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const INK = '#2b1d14';

export interface Fx {
  /** `n` pièces partent de (x, y) en gerbe puis filent vers la cible ; `onLand` est appelé à chaque arrivée. */
  coins(x: number, y: number, n: number, kind: CoinKind, target: () => [number, number], onLand: (i: number) => void): void;
  confetti(x: number, y: number, n: number): void;
  sparks(x: number, y: number, n: number, color?: string): void;
  /** Étoiles à contour qui jaillissent puis retombent (récompenses), aplats. */
  stars(x: number, y: number, n: number, color?: string): void;
  /** Onde de choc : un anneau qui s'élargit et s'efface. */
  shock(x: number, y: number, color?: string): void;
  /** Feu d'artifice : plusieurs gerbes d'étoiles et d'étincelles échelonnées autour du point. */
  fireworks(x: number, y: number, w: number): void;
  setReduced(r: boolean): void;
  resize(): void;
  /** Vide les particules et relance la boucle si elle est morte (garde-fou). */
  revive(): void;
  /** Des particules attendent mais aucune image n'est programmée : la boucle est morte. */
  stuck(): boolean;
}

export function createFx(canvas: HTMLCanvasElement): Fx {
  const g = canvas.getContext('2d')!;
  let W = 300, H = 300, dpr = 1, reduced = false;
  const ps: P[] = [];
  let raf = 0, last = 0;
  const maxP = () => (W < 520 ? 110 : 200);

  function resize() {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  }
  new ResizeObserver(resize).observe(canvas);
  resize();

  function push(p: P) {
    if (ps.length >= maxP()) {
      // plein : on sacrifie un confetti ou une étincelle, jamais une pièce (elle porte un gain à l'écran)
      const i = ps.findIndex((q) => q.t !== 'coin');
      if (i < 0) { p.land?.(); return; }
      ps.splice(i, 1);
    }
    ps.push(p);
    if (!raf) { last = performance.now(); raf = requestAnimationFrame(loop); }
  }

  function drawCoin(p: P) {
    const sz = p.s;
    g.save();
    g.translate(p.x, p.y);
    g.rotate(p.a);
    g.lineWidth = 2.5; g.strokeStyle = INK; g.lineJoin = 'round';
    if (p.kind === 'gem') {
      g.fillStyle = '#20c5c0';
      g.beginPath(); g.moveTo(0, -sz); g.lineTo(sz * 0.8, 0); g.lineTo(0, sz); g.lineTo(-sz * 0.8, 0); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#8ff0ea'; g.fillRect(-sz * 0.2, -sz * 0.45, sz * 0.25, sz * 0.4);
    } else if (p.kind === 'dirt') {
      g.fillStyle = '#8a5a2b';
      g.beginPath(); g.arc(0, 0, sz * 0.8, 0, 6.283); g.fill(); g.stroke();
      g.fillStyle = '#c98a45'; g.fillRect(-sz * 0.4, -sz * 0.4, sz * 0.35, sz * 0.25);
    } else {
      g.fillStyle = '#ffc21a';
      g.beginPath(); g.arc(0, 0, sz, 0, 6.283); g.fill(); g.stroke();
      g.fillStyle = '#d98f12'; g.fillRect(-sz * 0.12, -sz * 0.55, sz * 0.24, sz * 1.1);
      g.fillStyle = '#fff3b0'; g.fillRect(-sz * 0.7, -sz * 0.5, sz * 0.3, sz * 0.25);
    }
    g.restore();
  }

  function loop(now: number) {
    raf = 0; // la boucle se reprogramme elle-même en fin de passe, quoi qu'il arrive
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.globalAlpha = 1;
    g.clearRect(0, 0, W, H);
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      try { step(p, i, dt); } catch { if (ps[i] === p) ps.splice(i, 1); g.restore(); g.globalAlpha = 1; } // une particule fautive disparaît seule
    }
    g.globalAlpha = 1;
    if (ps.length) raf = requestAnimationFrame(loop); else g.clearRect(0, 0, W, H);
  }

  /** Avance et dessine une particule. */
  function step(p: P, i: number, dt: number) {
    {
      if (p.delay && p.delay > 0) { p.delay -= dt; return; }
      p.age += dt;
      if (p.t === 'coin') {
        const [tx, ty] = (p as P & { tg: () => [number, number] }).tg();
        if (p.age < 0.32) { p.vx *= 1 - dt * 5; p.vy = p.vy * (1 - dt * 5) + 260 * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
        else {
          const k = 1 - Math.exp(-dt * (5 + (p.age - 0.32) * 22)); // elle accélère vers le compteur
          p.x += (tx - p.x) * k; p.y += (ty - p.y) * k;
        }
        p.a += p.va * dt;
        if ((p.age > 0.32 && Math.hypot(tx - p.x, ty - p.y) < 14) || p.age > 1.7) { ps.splice(i, 1); p.land?.(); return; }
        drawCoin(p);
      } else if (p.t === 'confetti') {
        p.vy += 700 * dt; p.vx *= 1 - dt * 1.6; p.vy *= 1 - dt * 1.2;
        p.x += p.vx * dt; p.y += p.vy * dt; p.a += p.va * dt;
        if (p.age > p.life || p.y > H + 20) { ps.splice(i, 1); return; }
        g.save(); g.translate(p.x, p.y); g.rotate(p.a); g.globalAlpha = Math.min(1, (p.life - p.age) * 3);
        g.fillStyle = p.c; g.fillRect(-p.s / 2, -p.s * 0.3 * Math.abs(Math.cos(p.age * 9 + p.va)) - 1, p.s, p.s * 0.6 * Math.abs(Math.cos(p.age * 9 + p.va)) + 2);
        g.restore();
      } else if (p.t === 'star') {
        p.vy += 520 * dt; p.vx *= 1 - dt * 1.4; p.x += p.vx * dt; p.y += p.vy * dt; p.a += p.va * dt;
        if (p.age > p.life || p.y > H + 20) { ps.splice(i, 1); return; }
        g.save(); g.translate(p.x, p.y); g.rotate(p.a); g.globalAlpha = Math.min(1, (p.life - p.age) * 3);
        g.lineWidth = 2.5; g.strokeStyle = INK; g.fillStyle = p.c; g.lineJoin = 'round';
        g.beginPath();
        for (let j = 0; j < 10; j++) { const r = j % 2 ? p.s * 0.45 : p.s, an = (j * Math.PI) / 5 - Math.PI / 2; g.lineTo(Math.cos(an) * r, Math.sin(an) * r); }
        g.closePath(); g.fill(); g.stroke(); g.restore();
      } else if (p.t === 'shock') {
        const k = p.age / p.life;
        if (k >= 1) { ps.splice(i, 1); return; }
        g.save(); g.globalAlpha = 1 - k; g.lineWidth = 7 * (1 - k) + 2; g.strokeStyle = p.c;
        g.beginPath(); g.arc(p.x, p.y, 10 + p.s * k, 0, 6.283); g.stroke(); g.restore();
      } else {
        p.vy += 260 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.age > p.life) { ps.splice(i, 1); return; }
        g.globalAlpha = Math.min(1, (p.life - p.age) * 4);
        g.fillStyle = p.c; g.save(); g.translate(p.x, p.y); g.rotate(Math.PI / 4); g.fillRect(-p.s / 2, -p.s / 2, p.s, p.s); g.restore();
        g.globalAlpha = 1;
      }
    }
  }

  function revive() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    ps.length = 0;
    resize();
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
  }

  return {
    coins(x, y, n, kind, target, onLand) {
      if (document.hidden) { for (let i = 0; i < n; i++) onLand(i); return; }
      const count = reduced ? Math.min(n, 2) : n;
      for (let i = 0; i < count; i++) {
        const a = rnd(-2.6, -0.5);
        const sp = reduced ? 0 : rnd(90, 230);
        const p: P & { tg: () => [number, number] } = {
          t: 'coin', kind, x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, a: 0, va: reduced ? 0 : rnd(-9, 9), age: 0, life: 2, c: '', s: kind === 'gold' ? 7 : 6, tg: target,
          delay: reduced ? 0 : i * 0.035, land: () => onLand(i),
        };
        push(p);
      }
      // en mouvement réduit les pièces en trop arrivent d'un coup
      for (let i = count; i < n; i++) onLand(i);
    },
    confetti(x, y, n) {
      if (reduced) return;
      for (let i = 0; i < n; i++) {
        const a = rnd(-Math.PI * 0.95, -Math.PI * 0.05), sp = rnd(180, 520);
        push({ t: 'confetti', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, a: rnd(0, 6.28), va: rnd(-12, 12), age: 0, life: rnd(1.4, 2.4), c: CONFETTI[i % CONFETTI.length], s: rnd(6, 11) });
      }
    },
    sparks(x, y, n, color = '#fff3b0') {
      if (reduced) n = Math.ceil(n / 3);
      for (let i = 0; i < n; i++) {
        const a = rnd(0, 6.283), sp = rnd(50, 190);
        push({ t: 'spark', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 50, a: 0, va: 0, age: 0, life: rnd(0.3, 0.6), c: i % 2 ? color : '#ffffff', s: rnd(3, 6) });
      }
    },
    stars(x, y, n, color = '#ffc21a') {
      const count = reduced ? Math.min(n, 3) : n;
      for (let i = 0; i < count; i++) {
        const a = rnd(-Math.PI * 0.95, -Math.PI * 0.05), sp = reduced ? 40 : rnd(140, 380);
        push({ t: 'star', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, a: rnd(0, 6.28), va: reduced ? 0 : rnd(-8, 8), age: 0, life: rnd(0.9, 1.5), c: i % 3 ? color : '#ffffff', s: rnd(7, 12) });
      }
    },
    shock(x, y, color = '#ffffff') {
      if (reduced) return;
      push({ t: 'shock', x, y, vx: 0, vy: 0, a: 0, va: 0, age: 0, life: 0.5, c: color, s: 90 });
    },
    fireworks(x, y, w) {
      if (reduced) { this.stars(x, y, 6); return; }
      const cols = ['#ffc21a', '#ff7aa8', '#20c5c0', '#ffffff', '#e8503a'];
      for (let b = 0; b < 5; b++) {
        const bx = x + (b - 2) * Math.min(70, w / 7), by = y - 40 + (b % 2) * 50, d = b * 0.18;
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * 6.283, sp = rnd(120, 230);
          push({ t: 'spark', x: bx, y: by, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, a: 0, va: 0, age: 0, life: rnd(0.5, 0.9), c: cols[(b + i) % cols.length], s: rnd(4, 7), delay: d });
        }
        push({ t: 'star', x: bx, y: by, vx: 0, vy: -60, a: 0, va: 3, age: 0, life: 1.1, c: cols[b % cols.length], s: 12, delay: d });
        push({ t: 'shock', x: bx, y: by, vx: 0, vy: 0, a: 0, va: 0, age: 0, life: 0.5, c: cols[b % cols.length], s: 60, delay: d });
      }
    },
    setReduced(r) { reduced = r; },
    resize,
    revive,
    stuck: () => ps.length > 0 && !raf && !document.hidden,
  };
}
