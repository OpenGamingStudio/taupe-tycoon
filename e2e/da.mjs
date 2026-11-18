// Captures de la direction artistique à 390 px : BROWSER_URL=… node e2e/da.mjs <url> <dossier> <préfixe> [da=b]
import puppeteer from 'puppeteer-core';
const [url = 'http://127.0.0.1:5301/', out = '/shots', pre = 'x', q = ''] = process.argv.slice(2);
const b = await puppeteer.connect({ browserURL: process.env.BROWSER_URL });
const mk = (o) => JSON.stringify({ v: 3, at: Date.now(), opts: { lang: 'fr', reduced: false, mode: 1, sound: false, seen: 0 },
  s: { dirt: 0, runTotal: 0, lifeTotal: 0, gems: 0, gemsEarned: 0, rebirths: 0, shovel: 0, gens: [0, 0, 0, 0, 0, 0], perms: [0, 0, 0, 0], clicks: 0, runTime: 0, ...o } });
const mid = mk({ dirt: 3e6, runTotal: 6e7, lifeTotal: 6e7, shovel: 14, gens: [20, 12, 8, 5, 0, 0], clicks: 400, gemsEarned: 2, gems: 2, rebirths: 1 });
for (const [name, st, tab] of [['debut', null, null], ['milieu', mid, null], ['mine', mid, '#tab-dig']]) {
  const p = await b.newPage();
  await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  if (st) await p.evaluateOnNewDocument((v) => { if (!sessionStorage.getItem('x')) { localStorage.setItem('taupe-tycoon-save', v); sessionStorage.setItem('x', '1'); } }, st);
  await p.goto(url + (q ? '?' + q : ''), { waitUntil: 'load' });
  await new Promise((r) => setTimeout(r, 1500));
  if (tab) { await p.click(tab); await new Promise((r) => setTimeout(r, 600)); }
  await p.screenshot({ path: `${out}/${pre}-${name}-390.png` });
  await p.close();
}
b.disconnect();
