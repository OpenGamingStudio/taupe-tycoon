// Achat x1 / x10 / Max sur chaque carte : la carte reste affichée (2.16.1). node e2e/buy.mjs <url>  (BROWSER_URL requis)
import puppeteer from 'puppeteer-core';
const url = process.argv[2];
const b = await puppeteer.connect({ browserURL: process.env.BROWSER_URL });
const save = (mode) => JSON.stringify({ v: 7, at: Date.now(), opts: { lang: 'fr', reduced: false, mode, sound: false, seen: 3, music: false, ambient: false },
  s: { dirt: 5e12, runTotal: 9e12, lifeTotal: 9e12, gems: 50, gemsEarned: 50, rebirths: 1, shovel: 5, gens: [5, 5, 5, 5, 5, 5], perms: [0, 0, 0, 0], clicks: 300, runTime: 900 } });
const fails = []; const ok = (c, m) => { if (!c) { fails.push(m); console.log('KO  ' + m); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (const mode of [1, 10, 'max']) {
  const p = await b.newPage();
  await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await p.evaluateOnNewDocument((v) => { if (!sessionStorage.getItem('x')) { localStorage.setItem('taupe-tycoon-save', v); sessionStorage.setItem('x', '1'); } }, save(mode));
  await p.goto(url, { waitUntil: 'load' }); await sleep(500);
  await p.click('#tab-dig'); await sleep(400);
  const n = await p.evaluate(() => document.querySelectorAll('#rows .row:not(.is-locked), #crew .row:not(.is-locked)').length);
  ok(n >= 3, `x${mode} : ${n} cartes seulement`);
  for (let i = 0; i < n; i++) {
    const r = await p.evaluate(async (i) => {
      const el = [...document.querySelectorAll('#rows .row:not(.is-locked), #crew .row:not(.is-locked)')][i];
      el.scrollIntoView({ block: 'center' }); const h0 = el.getBoundingClientRect().height;
      el.click();
      const seen = [];
      for (const d of [30, 120, 300, 600]) {
        await new Promise((r) => setTimeout(r, d));
        const cs = getComputedStyle(el), bb = el.getBoundingClientRect();
        seen.push({ conn: el.isConnected, op: cs.opacity, pos: cs.position, disp: cs.display, h: Math.round(bb.height), h0: Math.round(h0) });
      }
      return seen;
    }, i);
    for (const s of r) ok(s.conn && s.op !== '0' && s.pos !== 'absolute' && s.disp !== 'none' && s.h >= 40 && Math.abs(s.h - s.h0) < 30, `x${mode} carte ${i} : ${JSON.stringify(s)}`);
  }
  const fl = await p.evaluate(() => document.querySelectorAll('.row.flash').length); ok(fl === 0, `x${mode} : .row.flash présent`);
  await p.close();
}
b.disconnect(); console.log(fails.length ? `${fails.length} échec(s)` : 'OK'); process.exit(fails.length ? 1 : 0);
