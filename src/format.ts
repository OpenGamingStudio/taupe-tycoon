const SUFFIX = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];

/** Grand nombre lisible : 12,3 K, 4,56 M… puis notation scientifique au-delà de Dc. */
export function fmt(n: number, lang: string = 'fr'): string {
  if (!isFinite(n)) return '∞';
  if (n < 0) return '-' + fmt(-n, lang);
  const dec = lang === 'fr' ? ',' : '.';
  const out = (v: number, digits: number, suf: string) => v.toFixed(digits).replace('.', dec) + (suf ? ' ' + suf : '');
  if (n < 1000) {
    if (n < 10 && n !== Math.floor(n)) return out(n, 1, '');
    return out(Math.floor(n), 0, '');
  }
  const tier = Math.floor(Math.log10(n) / 3);
  if (tier >= SUFFIX.length) {
    const e = Math.floor(Math.log10(n));
    return out(n / Math.pow(10, e), 2, '').replace(/$/, 'e' + e);
  }
  const v = n / Math.pow(1000, tier);
  return out(v, v < 10 ? 2 : v < 100 ? 1 : 0, SUFFIX[tier]);
}

export function fmtDuration(sec: number, lang: string = 'fr'): string {
  const s = Math.round(sec);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  const hh = lang === 'fr' ? ' h ' : 'h ';
  if (h > 0) return `${h}${hh}${m} min`;
  if (m > 0) return `${m} min ${s % 60} s`;
  return `${s} s`;
}
