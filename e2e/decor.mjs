// Captures du décor : BROWSER_URL=… node e2e/decor.mjs <url> <dossier> ; vérifie aussi l'absence de défilement horizontal.
import puppeteer from 'puppeteer-core';
const url = process.argv[2] ?? 'http://127.0.0.1:5301/';
const out = process.argv[3] ?? '/shots';
const b = await puppeteer.connect({ browserURL: process.env.BROWSER_URL });
let bad = 0;
for (const [w, h] of [[320, 568], [390, 844], [430, 932], [1440, 900]]) {
  for (const [tod, wx] of [['day', 'clear'], ['night', 'clear'], ['day', 'rain'], ['dusk', 'snow']]) {
    const p = await b.newPage();
    await p.setViewport({ width: w, height: h, isMobile: w < 700, hasTouch: w < 700 });
    await p.goto(url, { waitUntil: 'load' });
    await p.evaluate((t, x) => { const s = document.getElementById('stage'); s.dataset.tod = t; s.dataset.wx = x; }, tod, wx);
    await new Promise((r) => setTimeout(r, 3400));
    const o = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, d: !!document.getElementById('decor').children.length }));
    if (o.sw > o.cw || !o.d) { bad++; console.log('KO', w, tod, wx, o); }
    await p.screenshot({ path: `${out}/decor-${tod}-${wx}-${w}.png` });
    await p.close();
  }
}
console.log('problèmes:', bad);
b.disconnect();
