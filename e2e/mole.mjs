// Gros plans de la taupe dans ses humeurs : BROWSER_URL=… node e2e/mole.mjs <url> <dossier>
import puppeteer from 'puppeteer-core';
const url = process.argv[2] ?? 'http://127.0.0.1:5201/';
const out = process.argv[3] ?? '/shots';
const b = await puppeteer.connect({ browserURL: process.env.BROWSER_URL });
const p = await b.newPage();
await p.setViewport({ width: 900, height: 700, deviceScaleFactor: 2 });
await p.setBypassCSP(true);
await p.goto(url, { waitUntil: 'load' });
await p.addStyleTag({ content: '*{animation:none!important}' });
for (const m of ['idle', 'dig', 'happy', 'rebirth']) {
  await p.evaluate((m) => { document.getElementById('mole').dataset.mood = m; }, m);
  const el = await p.$('#mole-svg');
  await el.screenshot({ path: `${out}/mole-${m}.png` });
}
await p.close(); b.disconnect();
