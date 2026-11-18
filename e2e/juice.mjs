// Captures de la V3 : BROWSER_URL=… node e2e/juice.mjs <url> <dossier>
import puppeteer from 'puppeteer-core';
const url = process.argv[2] ?? 'http://127.0.0.1:5301/';
const out = process.argv[3] ?? '/shots';
const b = await puppeteer.connect({ browserURL: process.env.BROWSER_URL });
const mk = (o) => JSON.stringify({ v: 3, at: Date.now(), opts: { lang: 'fr', reduced: false, mode: 1, sound: false, seen: 0, music: false, ambient: false },
  s: { dirt: 0, runTotal: 0, lifeTotal: 0, gems: 0, gemsEarned: 0, rebirths: 0, shovel: 0, gens: [0, 0, 0, 0, 0, 0], perms: [0, 0, 0, 0], clicks: 0, runTime: 0, ...o } });
const states = {
  early: mk({ dirt: 600, runTotal: 800, lifeTotal: 800, shovel: 3, gens: [4, 1, 0, 0, 0, 0], clicks: 20 }),
  late: mk({ dirt: 4e9, runTotal: 4e10, lifeTotal: 9e10, shovel: 40, gens: [60, 40, 30, 20, 10, 4], clicks: 4000, gemsEarned: 9, gems: 3, rebirths: 4, perms: [3, 2, 1, 1] }),
};
for (const [w, h] of [[320, 568], [390, 844], [1280, 800]]) {
  for (const [name, st] of Object.entries(states)) {
    const p = await b.newPage();
    await p.setViewport({ width: w, height: h, isMobile: w < 700, hasTouch: w < 700 });
    const errs = [];
    p.on('pageerror', (e) => errs.push(e.message));
    await p.evaluateOnNewDocument((v) => { if (!sessionStorage.getItem('x')) { localStorage.setItem('taupe-tycoon-save', v); sessionStorage.setItem('x', '1'); } }, st);
    await p.goto(url, { waitUntil: 'load' });
    await new Promise((r) => setTimeout(r, 4500));
    await p.screenshot({ path: `${out}/${name}-${w}.png` });
    const over = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    console.log(name, w, 'débordement horizontal:', over, 'erreurs:', errs.join('|') || 'aucune');
    await p.close();
  }
}
b.disconnect();
