import { afterEach, describe, expect, it, vi } from 'vitest';
import { checkAndRepair, diagnose, type GuardDeps, type Snapshot } from '../src/guard';

const ok: Snapshot = { sceneKids: 17, stageClass: 'stage depth-1 absolute', worldW: 130, worldH: 280, hidden: false, now: 10000, lastDraw: 9900, fxStuck: false };

describe('garde-fou du décor', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('ne signale rien quand le décor est intact', () => {
    expect(diagnose(ok)).toEqual([]);
  });
  it('détecte la scène perdue, la classe de profondeur invalide, le canvas vide, la boucle morte et les effets figés', () => {
    expect(diagnose({ ...ok, sceneKids: 0 })).toEqual(['scene']);
    expect(diagnose({ ...ok, stageClass: 'stage absolute' })).toEqual(['class']);
    expect(diagnose({ ...ok, stageClass: 'stage depth-7' })).toEqual(['class']);
    expect(diagnose({ ...ok, stageClass: 'depth-0' })).toEqual(['class']);
    expect(diagnose({ ...ok, worldW: 0 })).toEqual(['canvas']);
    expect(diagnose({ ...ok, lastDraw: 1000 })).toEqual(['loop']);
    expect(diagnose({ ...ok, fxStuck: true })).toEqual(['fx']);
  });
  it('une boucle arrêtée parce que l\'onglet est caché n\'est pas un problème', () => {
    expect(diagnose({ ...ok, hidden: true, lastDraw: 1000 })).toEqual([]);
  });

  it('répare : redessine la scène, remet la classe, relance les boucles', () => {
    vi.stubGlobal('document', { hidden: false });
    const scene = { children: { length: 0 }, innerHTML: '' };
    const stage = { className: 'foo', classList: { add: (c: string) => { stage.className += ' ' + c; } } };
    const calls: string[] = [];
    const d = {
      stage, scene, sceneHtml: '<g/>', world: { width: 0, height: 0 }, depth: () => 2,
      worldLastDraw: () => 0, reviveWorld: () => calls.push('world'), reviveFx: () => calls.push('fx'), fxStuck: () => true,
    } as unknown as GuardDeps;
    const probs = checkAndRepair(d, 10000);
    expect(probs.sort()).toEqual(['canvas', 'class', 'fx', 'loop', 'scene']);
    expect(scene.innerHTML).toBe('<g/>');
    expect(stage.className).toMatch(/stage/);
    expect(stage.className).toMatch(/depth-2$/);
    expect(calls).toContain('world');
    expect(calls).toContain('fx');
  });
});

import { repaint } from '../src/guard';
describe('repeinture forcée', () => {
  it('bascule la classe rp et réécrit la scène', () => {
    const cls = new Set<string>();
    const stage = { classList: { toggle: (c: string) => (cls.has(c) ? cls.delete(c) : cls.add(c)) } } as unknown as HTMLElement;
    const scene = { innerHTML: '' } as unknown as Element;
    repaint({ stage, scene, sceneHtml: '<g/>' });
    expect(cls.has('rp')).toBe(true);
    expect((scene as unknown as { innerHTML: string }).innerHTML).toBe('<g/>');
    repaint({ stage, scene, sceneHtml: '<g/>' }, false);
    expect(cls.has('rp')).toBe(false);
  });
});
