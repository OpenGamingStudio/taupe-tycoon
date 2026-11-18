import { TROPHIES } from './trophies';

type IconFn = (id: string, cls: string) => string;
type Tr = (key: string) => string;

/** Liste des succès (HTML d'un <ul>). Ne renvoie que des <li> : rien d'autre ne doit traîner après. */
export function trophiesHtml(owned: string[], lang: 'fr' | 'en', icon: IconFn, t: Tr): string {
  return TROPHIES.map((tr) => {
    const on = owned.includes(tr.id);
    const [name, desc] = tr[lang];
    return `<li class="trophy ${on ? 'is-on' : 'is-off'}"><span class="tile">${icon(on ? tr.icon : 'lock', 'h-9 w-9')}</span><span class="min-w-0"><span class="block text-lg font-bold leading-tight">${name}</span><span class="block text-sm leading-tight">${desc}</span><span class="sr-only">${t(on ? 'trophyOk' : 'trophyLocked')}</span></span></li>`;
  }).join('');
}

/** Statistiques (HTML d'un <dl>). */
export function statsHtml(rows: [string, string][], t: Tr): string {
  return rows.map(([k, v]) => `<div class="note"><dt>${t(k)}</dt><dd class="text-xl font-bold">${v}</dd></div>`).join('');
}
