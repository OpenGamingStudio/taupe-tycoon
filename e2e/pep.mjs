// Pépites : compteur, onglet Bonus, dock à 6 onglets. node e2e/pep.mjs <url> <dossier>
import puppeteer from 'puppeteer-core';
const url = process.argv[2] ?? 'http://127.0.0.1:5301/';
const out = process.argv[3] ?? '/shots';
const b = await puppeteer.connect({ browserURL: process.env.BROWSER_URL });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fail = 0;
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) fail++; };
const save = JSON.stringify({ v: 7, at: Date.now(), opts: { lang: 'fr', reduced: false, mode: 1, sound: false, seen: 3, music: false, ambient: false },
  s: { dirt: 5e6, runTotal: 2e7, lifeTotal: 2e7, gems: 5, gemsEarned: 5, rebirths: 2, shovel: 12, gens: [20, 12, 8, 4, 1, 0], perms: [0, 0, 0, 0, 0, 0, 0, 0], pep: 27, pepEarned: 30, clicks: 900, runTime: 900 } });
for (const [w, h] of [[320, 568], [390, 844], [430, 932]]) {
  const p = await b.newPage();
  await p.setViewport({ width: w, height: h, isMobile: true, hasTouch: true });
  p.on('pageerror', (e) => { console.log('ERR', e.message); fail++; });
  await p.evaluateOnNewDocument((v) => { if (!sessionStorage.getItem('x')) { localStorage.setItem('taupe-tycoon-save', v); sessionStorage.setItem('x', '1'); } }, save);
  await p.goto(url, { waitUntil: 'load' });
  await sleep(1200);
  await p.screenshot({ path: `${out}/pep-${w}-main.png` });
  const hud = await p.evaluate(() => ({ t: document.querySelector('#hud-pepn')?.textContent, sw: document.documentElement.scrollWidth, iw: innerWidth }));
  ok(+hud.t >= 27, `${w}px : compteur de pépites = ${hud.t}`);
  ok(hud.sw <= hud.iw, `${w}px : pas de défilement horizontal`);
  const tab = await p.$('#tab-bonus');
  const bx = await tab.boundingBox();
  ok(bx.height >= 44 && bx.width >= 40, `${w}px : onglet Bonus ${Math.round(bx.width)}x${Math.round(bx.height)}`);
  const tabs = await p.evaluate(() => [...document.querySelectorAll('.dock button, nav button')].map((e) => e.getBoundingClientRect()).filter((r) => r.bottom > innerHeight - 100).map((r) => [Math.round(r.left), Math.round(r.right)]));
  ok(tabs.every((t) => t[0] >= 0 && t[1] <= w), `${w}px : dock dans l'écran`);
  await tab.tap();
  await sleep(500);
  await p.screenshot({ path: `${out}/pep-${w}-bonus.png` });
  const rows = await p.evaluate(() => document.querySelectorAll('#bonus-buy li').length);
  ok(rows === 3, `${w}px : 3 achats de bonus (${rows})`);
  const sw = await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
  ok(sw, `${w}px : panneau Bonus sans défilement horizontal`);
  await p.close();
}
b.disconnect();
process.exit(fail ? 1 : 0);
