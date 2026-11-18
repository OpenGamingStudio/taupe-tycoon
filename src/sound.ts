/**
 * Sons synthétisés (Web Audio, aucun fichier). Rien ne sonne avant la première interaction de la personne
 * (`unlock()`), tout est muet quand `enabled` est faux, et le volume maître est réglable (0 à 100).
 */
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;
export let enabled = true;
let volume = 0.6;
let ambientOn = false;

const level = () => volume * volume; // courbe douce : le réglage bas reste audible
export const setEnabled = (v: boolean) => { enabled = v; sync(); };
export const setVolume = (pct: number) => { volume = Math.max(0, Math.min(100, pct)) / 100; sync(); };
export const setAmbient = (v: boolean) => { ambientOn = v; sync(); };

function sync() {
  if (master && ctx) master.gain.setTargetAtTime(enabled ? level() : 0, ctx.currentTime, 0.02);
  if (enabled && ambientOn && ctx && ctx.state === 'running') startAmbient(); else stopAmbient();
}

/** À appeler depuis un geste (clic, touche) : crée le contexte audio, jamais avant. */
export function unlock() {
  if (ctx) { if (ctx.state === 'suspended' && !document.hidden) void ctx.resume().then(sync); return; }
  try {
    const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!C) return;
    ctx = new C();
    const comp = ctx.createDynamicsCompressor();
    master = ctx.createGain();
    master.gain.value = enabled ? level() : 0;
    master.connect(comp).connect(ctx.destination);
    const n = ctx.sampleRate;
    noiseBuf = ctx.createBuffer(1, n, n);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    void ctx.resume().then(sync);
  } catch { ctx = null; }
}
/** Met le son en pause quand la page est cachée. */
export function onVisibility(hidden: boolean) {
  if (!ctx) return;
  if (hidden) { stopAmbient(); void ctx.suspend(); } else if (enabled) void ctx.resume().then(sync);
}

function ac(): AudioContext | null {
  if (!enabled || !ctx || !master || ctx.state !== 'running' || volume === 0) return null;
  return ctx;
}
const jitter = (spread: number) => 1 + (Math.random() * 2 - 1) * spread; // variation aléatoire de hauteur

function tone(a: AudioContext, freq: number, end: number, dur: number, type: OscillatorType, vol: number, delay = 0) {
  const t0 = a.currentTime + delay;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, end), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(master!);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}
/** Souffle de bruit filtré (gravier, vent, craquement). */
function noise(a: AudioContext, type: BiquadFilterType, freq: number, endFreq: number, dur: number, vol: number, delay = 0, q = 1) {
  const t0 = a.currentTime + delay;
  const src = a.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = true;
  const f = a.createBiquadFilter();
  f.type = type; f.Q.value = q;
  f.frequency.setValueAtTime(freq, t0);
  f.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), t0 + dur);
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + Math.min(0.02, dur / 3));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f).connect(g).connect(master!);
  src.start(t0, Math.random() * 0.5);
  src.stop(t0 + dur + 0.02);
}

let lastDig = 0;
/** Coup de pelle : choc sourd + gravier, hauteur variable, plus aiguë quand les coups s'enchaînent (combo). */
export function dig(step = 0) {
  const a = ac(); if (!a) return;
  const now = performance.now();
  if (now - lastDig < 45) return;
  lastDig = now;
  const f = (130 + Math.min(step, 8) * 14) * jitter(0.12);
  tone(a, f * 1.9, f * 0.55, 0.12, 'triangle', 0.3);
  noise(a, 'bandpass', 1800 * jitter(0.25), 500, 0.09, 0.22, 0, 1.2);
  if (step > 0 && step % 5 === 0) tone(a, 700 * jitter(0.05), 1100, 0.08, 'sine', 0.06, 0.03);
}
/** Achat : petite pièce, deux notes. */
export function buy() {
  const a = ac(); if (!a) return;
  const k = jitter(0.06);
  tone(a, 660 * k, 660 * k, 0.1, 'triangle', 0.2);
  tone(a, 990 * k, 990 * k, 0.22, 'triangle', 0.2, 0.07);
  tone(a, 1980 * k, 1980 * k, 0.1, 'sine', 0.05, 0.07);
}
/** Objet permanent amélioré : accord montant et brillance. */
export function upgrade() {
  const a = ac(); if (!a) return;
  const k = jitter(0.03);
  [392, 494, 587, 784].forEach((f, i) => tone(a, f * k, f * k, 0.24, 'triangle', 0.17, i * 0.07));
  noise(a, 'highpass', 4000, 7000, 0.3, 0.05, 0.2);
}
/** Succès : arpège majeur et étincelle. */
export function trophy() {
  const a = ac(); if (!a) return;
  [523, 659, 784, 1047, 1319].forEach((f, i) => tone(a, f, f, 0.3, 'triangle', 0.15, i * 0.08));
  tone(a, 2093, 2093, 0.5, 'sine', 0.06, 0.4);
}
/** Une pépite apparaît : deux notes cristallines. */
export function nuggetAppear() {
  const a = ac(); if (!a) return;
  tone(a, 1568, 1568, 0.25, 'sine', 0.13); tone(a, 2093, 2093, 0.4, 'sine', 0.11, 0.12);
}
/** Pépite cueillie : montée brillante. */
export function nuggetCatch() {
  const a = ac(); if (!a) return;
  tone(a, 300, 1500, 0.25, 'sawtooth', 0.07);
  [659, 880, 1109, 1319].forEach((f, i) => tone(a, f, f, 0.22, 'triangle', 0.15, 0.06 + i * 0.06));
}
export function deny() {
  const a = ac(); if (!a) return;
  tone(a, 180 * jitter(0.05), 120, 0.14, 'square', 0.08);
}
/** Rebirth : balayage de bruit, grave qui monte, accord final. */
export function rebirth() {
  const a = ac(); if (!a) return;
  noise(a, 'bandpass', 300, 5000, 0.7, 0.18, 0, 2);
  tone(a, 80, 420, 0.7, 'sine', 0.24);
  [523, 659, 784, 1047, 1319].forEach((f, i) => tone(a, f, f, 0.34, 'triangle', 0.15, 0.3 + i * 0.09));
}
export function tab() {
  const a = ac(); if (!a) return;
  tone(a, 440 * jitter(0.03), 520, 0.06, 'triangle', 0.08);
}
/** Écho du curseur de volume : un « bip » au niveau choisi. */
export function volumeTick() {
  const a = ac(); if (!a) return;
  tone(a, 600, 600, 0.08, 'triangle', 0.15);
}

// ---------- ambiance : vent de galerie + gouttes lointaines (désactivée par défaut) ----------
let ambNode: { src: AudioBufferSourceNode; gain: GainNode; lfo: OscillatorNode } | null = null;
let dripTimer = 0;
function startAmbient() {
  if (ambNode || !ctx || !master || !noiseBuf) return;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf; src.loop = true;
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 380; f.Q.value = 0.7;
  const gain = ctx.createGain(); gain.gain.value = 0.05;
  const lfo = ctx.createOscillator(); lfo.frequency.value = 0.12;
  const depth = ctx.createGain(); depth.gain.value = 0.03;
  lfo.connect(depth).connect(gain.gain);
  src.connect(f).connect(gain).connect(master);
  src.start(); lfo.start();
  ambNode = { src, gain, lfo };
  const drip = () => {
    const a = ac();
    if (a) tone(a, 1400 * jitter(0.3), 700, 0.18, 'sine', 0.05);
    dripTimer = window.setTimeout(drip, 3500 + Math.random() * 6000);
  };
  dripTimer = window.setTimeout(drip, 2500);
}
function stopAmbient() {
  window.clearTimeout(dripTimer);
  if (!ambNode) return;
  try { ambNode.src.stop(); ambNode.lfo.stop(); } catch { /* déjà arrêté */ }
  ambNode = null;
}
