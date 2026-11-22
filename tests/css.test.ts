import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const css = readFileSync('src/style.css', 'utf8');

describe('style.css : pas de collision de noms (2.16.1)', () => {
  it('aucun @keyframes défini deux fois', () => {
    const names = [...css.matchAll(/@keyframes\s+([\w-]+)/g)].map((m) => m[1]);
    const dup = names.filter((n, i) => names.indexOf(n) !== i);
    expect(dup).toEqual([]);
  });
  it('.flash (éclair d\'écran) est limité à #stage-fx', () => {
    const bare = css.split('\n').filter((l) => /(^|[\s,}])\.flash\b/.test(l) && !/#stage-fx \.flash/.test(l) && !/\.row-flash/.test(l));
    expect(bare).toEqual([]);
  });
  it('la carte achetée utilise row-flash, jamais flash', () => {
    const main = readFileSync('src/main.ts', 'utf8');
    expect(main).not.toMatch(/classList\.\w+\('flash'\)/);
    expect(css).toMatch(/\.row\.row-flash\s*\{\s*animation:\s*row-flash/);
  });
});
