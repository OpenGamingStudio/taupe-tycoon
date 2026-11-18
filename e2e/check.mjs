// Contrôle navigateur : node e2e/check.mjs <url> [dossier de captures]  (BROWSER_URL = Chrome avec --remote-debugging-port)
import puppeteer from 'puppeteer-core';
const url = process.argv[2] ?? 'http://127.0.0.1:5188/';
const out = process.argv[3];
const b = await puppeteer.connect({ browserURL: process.env.BROWSER_URL });
let bad = 0;
const ko = (m) => { bad++; console.log('KO', m); };
for (const [w, h] of [[320, 568], [360, 740], [430, 932], [768, 1024], [1280, 720], [800, 380]]) {
  const p = await b.newPage();
  await p.setViewport({ width: w, height: h, isMobile: w < 700, hasTouch: w < 700 });
  const errs = []; p.on('pageerror', (e) => errs.push(String(e))); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await p.evaluateOnNewDocument(() => { if (!sessionStorage.getItem('e2e')) { localStorage.clear(); sessionStorage.setItem('e2e', '1'); } });
  await p.goto(url, { waitUntil: 'load' });
  const ov = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  if (ov > 0) ko(`${w}: débordement horizontal ${ov}`);
  const small = await p.evaluate(() => [...document.querySelectorAll('button,a')].filter((e) => e.offsetParent && (e.getBoundingClientRect().height < 44 || e.getBoundingClientRect().width < 44)).map((e) => e.id || e.textContent.trim().slice(0, 12)));
  if (small.length) ko(`${w}: cibles < 44 px : ${small}`);
  for (let i = 0; i < 20; i++) await p.click('#mole');
  const dirt = await p.$eval('#hud-dirt', (e) => e.textContent);
  if (dirt.trim() !== '200') ko(`${w}: 20 clics -> ${dirt}`);
  const first = await p.$eval('#rows button', (e) => e.getAttribute('aria-disabled'));
  if (first !== 'false') ko(`${w}: pelle non achetable après 20 clics`);
  await p.click('#rows li:first-child button');
  await p.click('#tab-rebirth'); const vis = await p.$eval('#p-rebirth', (e) => !e.hidden);
  if (!vis) ko(`${w}: onglet rebirth`);
  await p.click('#tab-options'); await p.click('#opt-lang');
  const l = await p.evaluate(() => document.documentElement.lang);
  await p.click('#tab-dig');
  if (out && (w === 320 || w === 1280)) await p.screenshot({ path: `${out}/${w}.png` });
  // rechargement : la sauvegarde revient
  await p.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  await p.reload({ waitUntil: 'load' });
  const lang2 = await p.evaluate(() => document.documentElement.lang);
  if (l !== lang2) ko(`${w}: langue non sauvegardée`);
  if (errs.length) ko(`${w}: erreurs ${errs.join(' | ')}`);
  console.log(w, h, 'ok débordement', ov, 'langue', l);
  await p.close();
}
b.disconnect();
process.exit(bad ? 1 : 0);
