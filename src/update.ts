/**
 * Mise à jour du jeu sans service worker (donc rien à invalider côté navigateur) :
 * - index.html et version.json sont servis `no-cache` (nginx), les fichiers à empreinte en `immutable` ;
 * - le jeu relit `version.json` au retour au premier plan et toutes les 5 minutes ; si l'identifiant de
 *   construction diffère de celui embarqué, il propose de recharger (la partie est sauvegardée avant).
 */
declare const __BUILD__: string;
export const BUILD = typeof __BUILD__ === 'string' ? __BUILD__ : 'dev';

export const CHECK_EVERY_MS = 5 * 60 * 1000;
const MIN_GAP_MS = 20 * 1000;

/** Compare l'identifiant embarqué à celui du serveur ; `null` si la lecture échoue (hors ligne, serveur de dev). */
export function isNewer(local: string, remote: unknown): boolean {
  if (!remote || typeof remote !== 'object') return false;
  const b = (remote as { build?: unknown }).build;
  return typeof b === 'string' && b.length > 0 && b.length < 40 && local !== 'dev' && b !== local;
}

/** Supprime d'anciens service workers et caches (d'éventuelles versions installées avant ce mécanisme). */
export async function cleanup(): Promise<void> {
  try {
    const regs = await navigator.serviceWorker?.getRegistrations();
    await Promise.all((regs ?? []).map((r) => r.unregister()));
    if (typeof caches !== 'undefined') await Promise.all((await caches.keys()).map((k) => caches.delete(k)));
  } catch { /* sans importance */ }
}

export function watch(onNew: () => void, fetcher: typeof fetch = fetch.bind(globalThis)): { check: (force?: boolean) => Promise<boolean> } {
  let last = 0, found = false;
  async function check(force = false): Promise<boolean> {
    if (found) return true;
    const now = Date.now();
    if (!force && now - last < MIN_GAP_MS) return false;
    last = now;
    try {
      const r = await fetcher(`version.json?t=${now}`, { cache: 'no-store' });
      if (!r.ok) return false;
      if (isNewer(BUILD, await r.json())) { found = true; onNew(); }
    } catch { /* hors ligne : on réessaiera */ }
    return found;
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) void check(); });
  window.addEventListener('online', () => void check());
  window.setInterval(() => { if (!document.hidden) void check(); }, CHECK_EVERY_MS);
  void cleanup();
  window.setTimeout(() => void check(), 4000);
  return { check };
}
