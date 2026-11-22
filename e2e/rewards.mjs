// Récompenses : renaissance (feu d'artifice + éclair) et critiques, sans erreur de page. node e2e/rewards.mjs <url> <dossier>
import puppeteer from 'puppeteer-core';
const url = process.argv[2] ?? 'http://127.0.0.1:5301/';
const out = process.argv[3] ?? '/shots';
const b = await puppeteer.connect({ browserURL: process.env.BROWSER_URL });
const save = JSON.stringify({ v: 6, at: Date.now(), opts: { lang: 'fr', reduced: false, mode: 1, sound: false, seen: 0 },
  s: { dirt: 4e9, runTotal: 4e10, lifeTotal: 9e10, gems: 3, gemsEarned: 9, rebirths: 4, shovel: 40, gens: [60, 40, 30, 20, 10, 4], perms: [3, 2, 1, 1], clicks: 4000, runTime: 0 } });
let errs = 0;
for (const [w, h] of [[320, 568], [390, 844], [1440, 900]]) {
  const p = await b.newPage();
  p.on('pageerror', (e) => { errs++; console.log('ERR', e.message); });
  await p.setViewport({ width: w, height: h, isMobile: w < 700, hasTouch: w < 700 });
  await p.evaluateOnNewDocument((v) => { if (!sessionStorage.getItem('x')) { localStorage.setItem('taupe-tycoon-save', v); sessionStorage.setItem('x', '1'); } }, save);
  await p.goto(url, { waitUntil: 'load' });
  for (let i = 0; i < 12; i++) { await p.click('#mole'); await new Promise((r) => setTimeout(r, 60)); }
  await p.screenshot({ path: `${out}/rew-click-${w}.png` });
  await p.click('#tab-rebirth');
  await p.click('#rb-go'); await p.click('#rb-go');
  await new Promise((r) => setTimeout(r, 350));
  const fl = await p.evaluate(() => !!document.querySelector('.flash'));
  console.log(w, 'éclair présent:', fl);
  await p.screenshot({ path: `${out}/rew-rebirth-${w}.png` });
  const sw = await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
  if (!sw) { errs++; console.log('défilement horizontal', w); }
  await p.close();
}
console.log('problèmes:', errs);
b.disconnect();
