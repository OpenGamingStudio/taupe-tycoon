import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { VERSION } from '../src/version';

describe('version', () => {
  it('src/version.ts, package.json et CHANGELOG.md sont alignés', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
    expect(pkg.version).toBe(VERSION);
    expect(readFileSync('CHANGELOG.md', 'utf8')).toMatch(new RegExp(`^## ${VERSION.replace(/\./g, '\\.')} `, 'm'));
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
