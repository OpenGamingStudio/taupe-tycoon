import { describe, expect, it } from 'vitest';
import { statsHtml, trophiesHtml } from '../src/lists';
import { TROPHIES } from '../src/trophies';

const icon = (id: string) => `<i>${id}</i>`;
const t = (k: string) => k;

describe('listes succès / stats', () => {
  it('aucun texte parasite après la liste (le code de langue « fr » était collé)', () => {
    for (const L of ['fr', 'en'] as const) {
      const html = trophiesHtml([], L, icon, t);
      expect(html.endsWith('</li>')).toBe(true);
      expect(html.startsWith('<li')).toBe(true);
      expect((html.match(/<li /g) ?? []).length).toBe(TROPHIES.length);
    }
    const st = statsHtml([['sDirt', '1']], t);
    expect(st.endsWith('</div>')).toBe(true);
  });
});
