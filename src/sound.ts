/**
 * Sons synthétisés (Web Audio, aucun fichier). Rien ne sonne avant la première interaction de la personne
 * (`unlock()`), tout est muet quand `enabled` est faux, et le volume maître est réglable (0 à 100).
 */
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let sfxBus: GainNode | null = null;
let musicBus: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;
export let enabled = true;
let volume = 0.6;
let ambientOn = false;
let musicOn = false;
let musicPct = 35;
let deep = 0;

const level = () => volume * volume; // courbe douce : le réglage bas reste audible
export const setEnabled = (v: boolean) => { enabled = v; sync(); };
export const setVolume = (pct: number) => { volume = Math.max(0, Math.min(100, pct)) / 100; sync(); };
export const setAmbient = (v: boolean) => { ambientOn = v; sync(); };
export const setMusic = (v: boolean) => { musicOn = v; sync(); };
export const setMusicVolume = (pct: number) => { musicPct = Math.max(0, Math.min(100, pct)); sync(); };
/** Profondeur (0 à 2) : change la tonalité de la musique et la couleur de l'ambiance. */
export const setDepth = (d: number) => { deep = d; };
const musicLevel = () => (musicPct / 100) * 0.5; // très bas par défaut : la musique reste sous les effets

function sync() {
  if (master && ctx) master.gain.setTargetAtTime(enabled ? level() : 0, ctx.currentTime, 0.02);
  if (musicBus && ctx) musicBus.gain.setTargetAtTime(musicLevel(), ctx.currentTime, 0.05);
  const running = enabled && ctx && ctx.state === 'running';
  if (running && ambientOn) startAmbient(); else stopAmbient();
  if (running && musicOn && musicPct > 0) startMusic(); else stopMusic();
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
    sfxBus = ctx.createGain();
    sfxBus.connect(master);
    musicBus = ctx.createGain();
    musicBus.gain.value = musicLevel();
    musicBus.connect(master);
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
  if (hidden) { stopAmbient(); stopMusic(); void ctx.suspend(); } else if (enabled) void ctx.resume().then(sync);
}

function ac(): AudioContext | null {
  if (!enabled || !ctx || !master || ctx.state !== 'running' || volume === 0) return null;
  return ctx;
}
const jitter = (spread: number) => 1 + (Math.random() * 2 - 1) * spread; // variation aléatoire de hauteur

function tone(a: AudioContext, freq: number, end: number, dur: number, type: OscillatorType, vol: number, delay = 0, bus?: GainNode) {
  const t0 = a.currentTime + delay;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, end), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(bus ?? sfxBus!);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}
/** Souffle de bruit filtré (gravier, vent, craquement). */
function noise(a: AudioContext, type: BiquadFilterType, freq: number, endFreq: number, dur: number, vol: number, delay = 0, q = 1, bus?: GainNode) {
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
  src.connect(f).connect(g).connect(bus ?? sfxBus!);
  src.start(t0, Math.random() * 0.5);
  src.stop(t0 + dur + 0.02);
}

let lastDig = 0;
/**
 * Coup de pelle : trois sons au hasard (choc sourd, grattement, tintement de pierre), hauteur variable, plus aiguë
 * quand les coups s'enchaînent (combo) ; de temps en temps une pierre précieuse tinte.
 */
export function dig(step = 0) {
  const a = ac(); if (!a) return;
  const now = performance.now();
  if (now - lastDig < 40) return;
  lastDig = now;
  const f = (130 + Math.min(step, 12) * 11) * jitter(0.15);
  const r = Math.random();
  if (r < 0.4) {
    tone(a, f * 1.9, f * 0.55, 0.12, 'triangle', 0.3);
    noise(a, 'bandpass', 1800 * jitter(0.25), 500, 0.09, 0.22, 0, 1.2);
  } else if (r < 0.75) {
    noise(a, 'highpass', 900 * jitter(0.2), 3200, 0.11, 0.2, 0, 0.8);
    tone(a, f * 1.4, f * 0.7, 0.09, 'triangle', 0.18);
  } else {
    tone(a, f * 1.6, f * 0.6, 0.08, 'triangle', 0.22);
    tone(a, 1500 * jitter(0.2), 1200, 0.16, 'sine', 0.09, 0.01);
    noise(a, 'bandpass', 3000, 1800, 0.05, 0.1, 0, 2);
  }
  if (step > 0 && step % 5 === 0) tone(a, 700 * jitter(0.05), 1100, 0.08, 'sine', 0.06, 0.03);
  if (Math.random() < 0.1) tone(a, 2093 * jitter(0.04), 2093, 0.2, 'sine', 0.07, 0.04);
}
const PENTA = [0, 2, 4, 7, 9]; // gamme pentatonique majeure
/** Ramassage : gamme montante, `i` = rang dans la série (la hauteur monte, puis reprend une octave plus haut). */
let pickAt = 0;
let pickI = 0;
export function pickup(i?: number) {
  const a = ac(); if (!a) return;
  const now = performance.now();
  if (now - pickAt < 35) return;
  pickI = i ?? (now - pickAt < 700 ? pickI + 1 : 0);
  pickAt = now;
  const n = Math.min(pickI, 14);
  const semis = PENTA[n % 5] + 12 * Math.floor(n / 5);
  const fr = 659 * Math.pow(2, semis / 12);
  tone(a, fr, fr, 0.14, 'triangle', 0.14);
  tone(a, fr * 2, fr * 2, 0.1, 'sine', 0.04);
}
/** Fanfare courte : palier, niveau gagné (deux accords de cuivres synthétisés). */
export function fanfare() {
  const a = ac(); if (!a) return;
  const seq: [number, number][] = [[523, 0], [659, 0.1], [784, 0.2], [1047, 0.32], [784, 0.46], [1047, 0.56], [1319, 0.68]];
  seq.forEach(([f, t], i) => {
    const long = i === seq.length - 1 ? 0.5 : 0.16;
    tone(a, f, f, long, 'sawtooth', 0.07, t);
    tone(a, f * 1.005, f * 1.005, long, 'square', 0.045, t);
    tone(a, f * 2, f * 2, long * 0.7, 'sine', 0.04, t);
  });
  noise(a, 'highpass', 5000, 8000, 0.4, 0.04, 0.68);
}
/** Une taupe de plus arrive : saut, petit « pop » et deux notes. */
export function moleArrive() {
  const a = ac(); if (!a) return;
  tone(a, 240, 620, 0.12, 'sine', 0.2);
  tone(a, 880 * jitter(0.04), 880, 0.1, 'triangle', 0.14, 0.1);
  tone(a, 1175 * jitter(0.04), 1175, 0.16, 'triangle', 0.12, 0.17);
}
/** Palier de combo : plus le palier est haut, plus l'accord est riche. */
export function comboTier(tier: number) {
  const a = ac(); if (!a) return;
  const base = 440 * Math.pow(2, Math.min(tier, 4) * 2 / 12);
  [0, 4, 7, 12].slice(0, 2 + Math.min(tier, 2)).forEach((s, i) => tone(a, base * Math.pow(2, s / 12), base * Math.pow(2, s / 12), 0.2, 'triangle', 0.13, i * 0.05));
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
  tone(a, 190 * jitter(0.05), 150, 0.09, 'square', 0.08);
  tone(a, 140 * jitter(0.05), 95, 0.14, 'square', 0.08, 0.09);
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
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 380 - deep * 90; f.Q.value = 0.7;
  const gain = ctx.createGain(); gain.gain.value = 0.05;
  const lfo = ctx.createOscillator(); lfo.frequency.value = 0.12;
  const depth = ctx.createGain(); depth.gain.value = 0.03;
  lfo.connect(depth).connect(gain.gain);
  src.connect(f).connect(gain).connect(sfxBus!);
  src.start(); lfo.start();
  ambNode = { src, gain, lfo };
  const drip = () => {
    const a = ac();
    if (a) {
      tone(a, (1400 - deep * 250) * jitter(0.3), 700, 0.18, 'sine', 0.05);
      if (deep >= 2 && Math.random() < 0.5) tone(a, (2093 + Math.random() * 900), 2400, 0.9, 'sine', 0.018, 0.05); // cristal qui chante
    }
    dripTimer = window.setTimeout(drip, 2500 + Math.random() * 5000);
  };
  dripTimer = window.setTimeout(drip, 2500);
}
function stopAmbient() {
  window.clearTimeout(dripTimer);
  if (!ambNode) return;
  try { ambNode.src.stop(); ambNode.lfo.stop(); } catch { /* déjà arrêté */ }
  ambNode = null;
}

// ---------- musique : boucle de 4 mesures, douce et rythmée, programmée un peu à l'avance ----------
// Accords (racine en Hz, tierce, quinte) par profondeur : clair en surface, plus sombre au fond.
const CHORDS: number[][][] = [
  [[130.8, 4, 7], [110, 3, 7], [87.3, 4, 7], [98, 4, 7]], // surface : Do, La m, Fa, Sol
  [[146.8, 3, 7], [116.5, 4, 7], [87.3, 4, 7], [130.8, 4, 7]], // galeries : Ré m, Si b, Fa, Do
  [[110, 3, 7], [87.3, 4, 11], [130.8, 4, 7], [82.4, 3, 7]], // cristaux : La m, Fa maj7, Do, Mi m
];
const BPM = [92, 98, 104];
const ARP = [0, 2, 1, 2, 3, 2, 1, 2];
let musicTimer = 0;
let nextStep = 0;
let stepNo = 0;
const hz = (root: number, semis: number) => root * Math.pow(2, semis / 12);
function stopMusic() { window.clearInterval(musicTimer); musicTimer = 0; }
function startMusic() {
  if (musicTimer || !ctx) return;
  nextStep = ctx.currentTime + 0.1;
  musicTimer = window.setInterval(() => {
    if (!ctx || ctx.state !== 'running' || !musicBus) return;
    if (nextStep < ctx.currentTime) nextStep = ctx.currentTime + 0.05;
    while (nextStep < ctx.currentTime + 0.4) { playStep(ctx, stepNo, nextStep); nextStep += 60 / BPM[deep] / 2; stepNo = (stepNo + 1) % 32; }
  }, 100);
}
function playStep(a: AudioContext, n: number, at: number) {
  const bus = musicBus!;
  const ch = CHORDS[deep][Math.floor(n / 8)];
  const step = n % 8;
  const d = at - a.currentTime;
  const notes = [0, ch[1], ch[2], 12];
  // basse sur les temps forts
  if (step === 0 || step === 3 || step === 4 || (step === 6 && Math.floor(n / 8) % 2 === 1)) tone(a, ch[0] / 2, ch[0] / 2, 0.28, 'triangle', 0.55, d, bus);
  // grosse caisse douce et petit charleston sur les contretemps
  if (step === 0 || step === 4) tone(a, 110, 45, 0.16, 'sine', 0.7, d, bus);
  if (step % 2 === 1) noise(a, 'highpass', 7000, 9000, 0.04, 0.12, d, 1, bus);
  // arpège pincé, une note sur trois laissée muette de temps en temps pour respirer
  if (!(step === 7 && n % 16 === 15)) {
    const f = hz(ch[0] * 2, notes[ARP[step]]);
    tone(a, f, f, 0.22, 'triangle', 0.4, d, bus);
    if (deep === 2 && step % 4 === 2) tone(a, f * 2, f * 2, 0.3, 'sine', 0.15, d, bus); // reflets de cristal
  }
  // nappe sur la première croche de la mesure à partir des galeries
  if (step === 0 && deep >= 1) {
    tone(a, ch[0], ch[0], 60 / BPM[deep] * 4, 'sine', 0.25, d, bus);
    tone(a, hz(ch[0], ch[2]), hz(ch[0], ch[2]), 60 / BPM[deep] * 4, 'sine', 0.15, d, bus);
  }
}
