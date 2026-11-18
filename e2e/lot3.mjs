// Panneaux (icônes) à 390 px : BROWSER_URL=… node e2e/lot3.mjs <url> <dossier> <préfixe>
import puppeteer from 'puppeteer-core';
const [url = 'http://127.0.0.1:5301/', out = '/shots', pre = 'x'] = process.argv.slice(2);
const b = await puppeteer.connect({ browserURL: process.env.BROWSER_URL });
const save = JSON.stringify({ v: 3, at: Date.now(), opts: { lang: 'fr', reduced: false, mode: 1, sound: false, seen: 0 },
  s: { dirt: 3e6, runTotal: 6e7, lifeTotal: 6e7, gems: 200, gemsEarned: 20, rebirths: 1, shovel: 14, gens: [20, 12, 8, 5, 3, 0], perms: [1, 1, 2, 1], clicks: 1500, runTime: 7200, playTime: 7200, trophies: [] } });
const p = await b.newPage();
await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
await p.evaluateOnNewDocument((v) => { if (!sessionStorage.getItem('x')) { localStorage.setItem('taupe-tycoon-save', v); sessionStorage.setItem('x', '1'); } }, save);
await p.goto(url, { waitUntil: 'load' });
await new Promise((r) => setTimeout(r, 2000));
for (const t of ['dig', 'rebirth', 'trophies', 'stats', 'options']) {
  await p.click('#tab-' + t); await new Promise((r) => setTimeout(r, 700));
  if (await p.evaluate(() => document.getElementById('app').dataset.panel === '')) { await p.click('#tab-' + t); await new Promise((r) => setTimeout(r, 700)); }
  await p.screenshot({ path: `${out}/${pre}-${t}.png` });
}
await p.close(); b.disconnect();
