/** Sons synthétisés (Web Audio, aucun fichier). Optionnels : tout est muet tant que `enabled` est faux. */
let ctx: AudioContext | null = null;
export let enabled = true;
export const setEnabled = (v: boolean) => { enabled = v; };

function ac(): AudioContext | null {
  if (!enabled) return null;
  try {
    if (!ctx) {
      const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!C) return null;
      ctx = new C();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch { return null; }
}

function tone(a: AudioContext, freq: number, end: number, dur: number, type: OscillatorType, vol: number, delay = 0) {
  const t0 = a.currentTime + delay;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, end), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(a.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

let lastDig = 0;
/** Coup de pelle : « toc » sourd, un peu plus aigu quand le coup est fort (combo). */
export function dig(step = 0) {
  const a = ac(); if (!a) return;
  const now = performance.now();
  if (now - lastDig < 45) return;
  lastDig = now;
  const f = 150 + Math.min(step, 8) * 18;
  tone(a, f * 1.8, f * 0.6, 0.11, 'triangle', 0.22);
  tone(a, 900, 300, 0.05, 'square', 0.04);
}
export function buy() {
  const a = ac(); if (!a) return;
  tone(a, 660, 660, 0.12, 'triangle', 0.16); tone(a, 990, 990, 0.2, 'triangle', 0.16, 0.08);
}
export function deny() {
  const a = ac(); if (!a) return;
  tone(a, 180, 120, 0.16, 'square', 0.08);
}
export function rebirth() {
  const a = ac(); if (!a) return;
  [523, 659, 784, 1047, 1319].forEach((f, i) => tone(a, f, f, 0.26, 'triangle', 0.16, i * 0.09));
  tone(a, 90, 400, 0.6, 'sine', 0.2);
}
export function tab() {
  const a = ac(); if (!a) return;
  tone(a, 440, 520, 0.06, 'triangle', 0.08);
}
