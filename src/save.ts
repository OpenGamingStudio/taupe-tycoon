import { BONUSES, GENS, PERMS } from './config';
import { State, newState } from './sim';
import { TROPHIES } from './trophies';

export const SAVE_KEY = 'taupe-tycoon-save';
export const SAVE_VERSION = 5; // 5 : bonus réduits à auto/turbo/pluie (ready réindexé) ; 4 : bonus à recharge ; les sauvegardes 1 à 3 s'ouvrent sans ces champs
const OLD_BONUS_ORDER = ['auto', 'turbo', 'crew', 'rain', 'burst']; // ordre des `ready` avant la v5
export const PANELS = ['dig', 'rebirth', 'trophies', 'stats', 'options'];
export interface Options {
  lang: 'fr' | 'en'; reduced: boolean; mode: 1 | 10 | 'max'; sound: boolean; seen: number;
  volume: number; // 0 à 100
  ambient: boolean;
  music: boolean;
  musicVolume: number; // 0 à 100
  panel: string; // menu ouvert au dernier lancement ('' = aucun)
}
export interface Saved { s: State; at: number; opts: Options }

/** Bornes de sécurité : une sauvegarde modifiée ou corrompue ne doit jamais produire Infinity ni NaN. */
const MAX_DIRT = 1e36, MAX_LEVEL = 1000, MAX_COUNT = 1e12, MAX_SECONDS = 1e10, MAX_GEMS = 1e9;
const num = (v: unknown, max: number, d = 0) => (typeof v === 'number' && isFinite(v) && v >= 0 ? Math.min(v, max) : d);
const int = (v: unknown, max: number) => Math.floor(num(v, max));
const arr = (v: unknown, n: number, max: (i: number) => number) =>
  Array.from({ length: n }, (_, i) => (Array.isArray(v) ? int(v[i], max(i)) : 0));

/**
 * Remet en forme une sauvegarde lue (JSON non fiable) : valeurs finies, positives et bornées, tailles correctes,
 * champs absents (anciennes versions) remplacés par leur défaut.
 */
export function sanitize(raw: unknown): Saved | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, any>;
  const st = r.s;
  if (!st || typeof st !== 'object') return null;
  const s = newState();
  // V1 (v absent ou 1) : la terre était 10 fois plus petite (décimales) ; passage aux entiers
  const k = typeof r.v === 'number' && r.v >= 2 ? 1 : 10;
  s.dirt = num(st.dirt, MAX_DIRT) * k; s.runTotal = num(st.runTotal, MAX_DIRT) * k; s.lifeTotal = num(st.lifeTotal, MAX_DIRT) * k;
  s.dirt = Math.min(s.dirt, MAX_DIRT); s.runTotal = Math.min(s.runTotal, MAX_DIRT); s.lifeTotal = Math.min(s.lifeTotal, MAX_DIRT);
  s.gems = int(st.gems, MAX_GEMS); s.gemsEarned = int(st.gemsEarned, MAX_GEMS);
  s.rebirths = int(st.rebirths, MAX_COUNT); s.shovel = int(st.shovel, MAX_LEVEL);
  s.gens = arr(st.gens, GENS.length, () => MAX_LEVEL);
  s.perms = arr(st.perms, PERMS.length, (i) => Math.min(PERMS[i].max, MAX_LEVEL));
  s.clicks = int(st.clicks, MAX_COUNT); s.runTime = num(st.runTime, MAX_SECONDS);
  s.playTime = num(st.playTime, MAX_SECONDS); s.bestRun = num(st.bestRun, MAX_SECONDS);
  s.caught = int(st.caught, MAX_COUNT); s.lastPs = num(st.lastPs, MAX_DIRT);
  // Bonus à recharge : dates bornées à « maintenant + recharge » (une date lointaine ou une horloge changée ne bloque jamais)
  const nowMs = Date.now();
  s.ready = BONUSES.map((b, i) => {
    const j = typeof r.v === 'number' && r.v < 5 ? OLD_BONUS_ORDER.indexOf(b.id) : i;
    const v = Array.isArray(st.ready) ? st.ready[j] : 0;
    return typeof v === 'number' && isFinite(v) && v > nowMs ? Math.min(Math.floor(v), nowMs + b.cd * 1000) : 0;
  });
  const dur = (id: string) => BONUSES.find((b) => b.id === id)!.dur;
  s.auto = Math.min(Math.ceil(num(st.auto, MAX_SECONDS)), dur('auto'));
  s.turbo = Math.min(Math.ceil(num(st.turbo, MAX_SECONDS)), dur('turbo'));
  s.autoAcc = Math.min(num(st.autoAcc, 1), 0.999);
  const ids = new Set(TROPHIES.map((x) => x.id));
  s.trophies = Array.isArray(st.trophies) ? [...new Set(st.trophies.filter((x: unknown) => typeof x === 'string' && ids.has(x)))] as string[] : [];
  const o = r.opts ?? {};
  const opts: Options = {
    lang: o.lang === 'en' ? 'en' : o.lang === 'fr' ? 'fr' : defaultLang(),
    reduced: o.reduced === true,
    sound: o.sound !== false,
    seen: int(o.seen, 1 << 20),
    mode: o.mode === 10 || o.mode === 'max' ? o.mode : 1,
    volume: typeof o.volume === 'number' && isFinite(o.volume) ? Math.max(0, Math.min(100, Math.round(o.volume))) : 60,
    ambient: o.ambient !== false, // V3 : activée par défaut (un choix « désactivé » déjà fait est gardé)
    music: o.music !== false,
    panel: typeof o.panel === 'string' && PANELS.includes(o.panel) ? o.panel : '',
    musicVolume: typeof o.musicVolume === 'number' && isFinite(o.musicVolume) ? Math.max(0, Math.min(100, Math.round(o.musicVolume))) : 35,
  };
  return { s, at: Math.min(num(r.at, Date.now(), Date.now()), Date.now()), opts };
}

export function defaultLang(): 'fr' | 'en' {
  return typeof navigator !== 'undefined' && /^fr/i.test(navigator.language) ? 'fr' : 'en';
}

export function load(): Saved | null {
  try {
    const t = localStorage.getItem(SAVE_KEY);
    return t ? sanitize(JSON.parse(t)) : null;
  } catch { return null; }
}
export function save(s: State, opts: Options) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify({ v: SAVE_VERSION, s, at: Date.now(), opts })); } catch { /* stockage plein ou refusé */ }
}
export function wipe() {
  try { localStorage.removeItem(SAVE_KEY); } catch { /* ignoré */ }
}

// ---------- export / import : texte « TT1.<base64 du JSON> » ----------
const PREFIX = 'TT1.';
export const MAX_IMPORT = 20000;
export function exportText(s: State, opts: Options): string {
  return PREFIX + btoa(JSON.stringify({ v: SAVE_VERSION, s, at: Date.now(), opts }));
}
/** Lit un texte d'export ; renvoie null s'il est invalide ou trop long (jamais d'exécution : JSON seulement). */
export function importText(text: string): Saved | null {
  const t = text.trim();
  if (!t.startsWith(PREFIX) || t.length > MAX_IMPORT || !/^[A-Za-z0-9+/=]+$/.test(t.slice(PREFIX.length))) return null;
  try { return sanitize(JSON.parse(atob(t.slice(PREFIX.length)))); } catch { return null; }
}
