import { describe, expect, it } from 'vitest';
import { SCENE } from '../src/art';

describe('décor', () => {
  it('se prolonge de chaque côté (tuiles) pour qu\'aucun élément ne soit coupé en paysage', () => {
    expect((SCENE.match(/<g transform="translate\(-?\d+ 0\)">/g) ?? []).length).toBeGreaterThanOrEqual(5);
    expect(SCENE).toContain('x="-1400"');
  });
  it('aucun dégradé', () => {
    expect(SCENE).not.toMatch(/gradient/i);
  });
});
