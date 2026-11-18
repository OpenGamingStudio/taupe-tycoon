import { describe, expect, it } from 'vitest';
import { fmt, fmtDuration } from '../src/format';
import { TROPHIES } from '../src/trophies';
import { ICONS } from '../src/art';

const plain = (s: string) => s.replace(/ /g, ' ');

describe('formats par langue', () => {
  it('milliard = Md en français, B en anglais', () => {
    expect(plain(fmt(7e12, 'fr'))).toBe('7 000Md');
    expect(plain(fmt(4.5e10, 'fr'))).toBe('45Md');
    expect(plain(fmt(4.5e10, 'en'))).toBe('45B');
    expect(plain(fmt(-4.5e10, 'fr'))).toBe('-45Md');
  });
  it('durées rondes sans « 0 min »', () => {
    expect(fmtDuration(7200, 'fr')).toBe('2 h');
    expect(fmtDuration(7200, 'en')).toBe('2h');
    expect(fmtDuration(7500, 'fr')).toBe('2 h 5 min');
    expect(fmtDuration(125, 'fr')).toBe('2 min 5 s');
  });
});

describe('icônes de succès', () => {
  it('toutes existent, et les trois premiers succès de clic ont chacun la leur', () => {
    for (const t of TROPHIES) expect(ICONS[t.icon], t.id).toBeTruthy();
    const ic = ['clic1', 'clic100', 'clic1k'].map((id) => TROPHIES.find((t) => t.id === id)!.icon);
    expect(new Set(ic).size).toBe(3);
  });
  it('options = engrenage, pécule = pièces (ni sacoche ni œuf)', () => {
    expect(ICONS.gear).toBeTruthy();
    expect(ICONS.pecule).not.toBe(ICONS.sacoche);
    expect(ICONS.pecule).not.toMatch(/M24 4c8 0 14 9/);
  });
});
