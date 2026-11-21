/**
 * Garde-fou du décor (2.10.1). Le jeu tourne des heures sur téléphone : le navigateur peut perdre la mémoire d'un
 * canvas (veille, retour d'onglet, manque de mémoire graphique), une boucle peut mourir sur une erreur. Le décor
 * (SVG de la scène, classe de profondeur, canvas du sous-sol, canvas d'effets) est alors redessiné SANS recharger la
 * page, et le fond reste toujours un aplat opaque (ciel / terre) en CSS.
 */
export interface Snapshot {
  sceneKids: number;
  stageClass: string;
  worldW: number; worldH: number;
  hidden: boolean;
  now: number; lastDraw: number;
  fxStuck: boolean; // des particules existent mais plus aucune image n'est programmée
}
export type Problem = 'scene' | 'class' | 'canvas' | 'loop' | 'fx';

export const MIN_SCENE_KIDS = 5;
export const STALL_MS = 2500;

/** Liste ce qui ne va pas dans le décor (fonction pure, testée). */
export function diagnose(x: Snapshot): Problem[] {
  const out: Problem[] = [];
  if (x.sceneKids < MIN_SCENE_KIDS) out.push('scene');
  if (!/(^|\s)stage(\s|$)/.test(x.stageClass) || !/(^|\s)depth-[0-2](\s|$)/.test(x.stageClass)) out.push('class');
  if (!(x.worldW >= 40 && x.worldH >= 40)) out.push('canvas');
  if (!x.hidden && x.now - x.lastDraw > STALL_MS) out.push('loop');
  if (x.fxStuck) out.push('fx');
  return out;
}

export interface GuardDeps {
  stage: HTMLElement;
  scene: Element;
  sceneHtml: string;
  world: HTMLCanvasElement;
  depth: () => number;
  worldLastDraw: () => number;
  reviveWorld: () => void;
  reviveFx: () => void;
  fxStuck: () => boolean;
  onFix?: (p: Problem[]) => void;
}

/** Vérifie le décor et répare ce qui manque. Renvoie les problèmes trouvés (vide = tout va bien). */
export function checkAndRepair(d: GuardDeps, now = performance.now()): Problem[] {
  const probs = diagnose({
    sceneKids: d.scene.children.length, stageClass: d.stage.className, worldW: d.world.width, worldH: d.world.height,
    hidden: document.hidden, now, lastDraw: d.worldLastDraw(), fxStuck: d.fxStuck(),
  });
  if (!probs.length) return probs;
  if (probs.includes('scene')) d.scene.innerHTML = d.sceneHtml;
  if (probs.includes('class')) {
    d.stage.classList.add('stage');
    d.stage.className = d.stage.className.replace(/(^|\s)depth-\S*/g, ' ').trim() + ' depth-' + Math.max(0, Math.min(2, d.depth()));
  }
  if (probs.includes('canvas') || probs.includes('loop')) d.reviveWorld();
  if (probs.includes('fx')) d.reviveFx();
  d.onFix?.(probs);
  return probs;
}

/**
 * Repeinture forcée (2.11.1). Sur Chrome Android, après une longue session avec beaucoup d'onglets, le navigateur peut
 * jeter les tuiles graphiques du fond : le décor devient noir alors que le DOM est intact (rien à « diagnostiquer »).
 * On force donc un nouveau dessin : couleur de fond décalée d'un cran (classe rp) et scène réécrite.
 */
export function repaint(d: Pick<GuardDeps, 'stage' | 'scene' | 'sceneHtml'>, scene = true): void {
  d.stage.classList.toggle('rp');
  if (scene) d.scene.innerHTML = d.sceneHtml;
}

/** Installe les déclencheurs : surveillance régulière, retour d'onglet, rotation, perte de contexte canvas. */
export function installGuard(d: GuardDeps): () => void {
  const run = () => { try { checkAndRepair(d); } catch { /* le garde-fou ne doit jamais casser le jeu */ } };
  // au retour au premier plan : on redessine tout de suite (le navigateur a pu jeter la mémoire des canvas)
  const refresh = () => {
    if (document.hidden) return;
    run();
    repaint(d);
    d.reviveWorld();
  };
  const timer = window.setInterval(run, 1000);
  // toutes les 8 s : bascule de couleur (légère) ; la scène n'est réécrite qu'une fois sur 8 (~1 min), jamais à chaque passage
  let paints = 0;
  const paintTimer = window.setInterval(() => { if (!document.hidden) repaint(d, ++paints % 8 === 0); }, 8000);
  const onVis = () => refresh();
  document.addEventListener('visibilitychange', onVis);
  window.addEventListener('pageshow', refresh);
  window.addEventListener('orientationchange', refresh);
  window.addEventListener('resize', run);
  d.world.addEventListener('contextlost', (e) => e.preventDefault());
  d.world.addEventListener('contextrestored', () => d.reviveWorld());
  return () => {
    clearInterval(timer);
    clearInterval(paintTimer);
    document.removeEventListener('visibilitychange', onVis);
    window.removeEventListener('pageshow', refresh);
    window.removeEventListener('orientationchange', refresh);
    window.removeEventListener('resize', run);
  };
}
