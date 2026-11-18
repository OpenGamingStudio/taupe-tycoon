import { GENS, PERMS } from './config';
import { State, newState } from './sim';

export const SAVE_KEY = 'taupe-tycoon-save';
export interface Options { lang: 'fr' | 'en'; reduced: boolean; mode: 1 | 10 | 'max' }
export interface Saved { s: State; at: number; opts: Options }

const num = (v: unknown, d = 0) => (typeof v === 'number' && isFinite(v) && v >= 0 ? v : d);
const arr = (v: unknown, n: number) =>
  Array.from({ length: n }, (_, i) => (Array.isArray(v) ? Math.floor(num(v[i])) : 0));

/** Remet en forme une sauvegarde lue (JSON non fiable) : valeurs finies et positives, tailles correctes. */
export function sanitize(raw: unknown): Saved | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, any>;
  const st = r.s;
  if (!st || typeof st !== 'object') return null;
  const s = newState();
  s.dirt = num(st.dirt); s.runTotal = num(st.runTotal); s.lifeTotal = num(st.lifeTotal);
  s.gems = Math.floor(num(st.gems)); s.gemsEarned = Math.floor(num(st.gemsEarned));
  s.rebirths = Math.floor(num(st.rebirths)); s.shovel = Math.floor(num(st.shovel));
  s.gens = arr(st.gens, GENS.length); s.perms = arr(st.perms, PERMS.length);
  s.clicks = Math.floor(num(st.clicks)); s.runTime = num(st.runTime);
  const o = r.opts ?? {};
  const opts: Options = {
    lang: o.lang === 'en' ? 'en' : o.lang === 'fr' ? 'fr' : defaultLang(),
    reduced: o.reduced === true,
    mode: o.mode === 10 || o.mode === 'max' ? o.mode : 1,
  };
  return { s, at: Math.min(num(r.at, Date.now()), Date.now()), opts };
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
  try { localStorage.setItem(SAVE_KEY, JSON.stringify({ v: 1, s, at: Date.now(), opts })); } catch { /* stockage plein ou refusé */ }
}
export function wipe() {
  try { localStorage.removeItem(SAVE_KEY); } catch { /* ignoré */ }
}
