// Boutique V5.1 : achat unique, infobulle d'appui long, légende de la barre. BROWSER_URL=… node e2e/shop.mjs <url> <dossier>
import puppeteer from 'puppeteer-core';
const url = process.argv[2] ?? 'http://127.0.0.1:5301/';
const out = process.argv[3] ?? '/shots';
const b = await puppeteer.connect({ browserURL: process.env.BROWSER_URL });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const mk = (perms) => JSON.stringify({ v: 6, at: Date.now(), opts: { lang: 'fr', reduced: false, mode: 1, sound: false, seen: 3, music: false, ambient: false },
  s: { dirt: 5e6, runTotal: 2e7, lifeTotal: 2e7, gems: 20, gemsEarned: 5, rebirths: 2, shovel: 12, gens: [20, 12, 8, 4, 1, 0], perms, clicks: 900, runTime: 900 } });
let fail = 0;
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) fail++; };
const open = async (w, h, save) => {
  const p = await b.newPage();
  await p.setViewport({ width: w, height: h, isMobile: true, hasTouch: true });
  p.on('pageerror', (e) => { console.log('ERR', e.message); fail++; });
  await p.evaluateOnNewDocument((v) => { if (!sessionStorage.getItem('x')) { localStorage.setItem('taupe-tycoon-save', v); sessionStorage.setItem('x', '1'); } }, save);
  await p.goto(url, { waitUntil: 'load' });
  await sleep(1200);
  return p;
};
for (const w of [320, 390]) {
  const h = w === 320 ? 568 : 844;
  // 1. bonus achetés : infobulle d'appui long
  let p = await open(w, h, mk([1, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0]));
  const vis = await p.evaluate(() => [...document.querySelectorAll('#bonus li')].filter((l) => !l.hidden).length);
  ok(vis === 3, `${w}px : 3 bonus visibles`);
  const box = await (await p.$('#bonus [data-id="turbo"]')).boundingBox();
  await p.touchscreen.touchStart(box.x + box.width / 2, box.y + box.height / 2);
  await sleep(700);
  const tip = await p.evaluate(() => { const e = document.querySelector('.tip'); const r = e.getBoundingClientRect(); return { hidden: e.hidden, text: e.textContent, l: r.left, r: r.right, t: r.top, b: r.bottom, sw: document.documentElement.scrollWidth, iw: innerWidth }; });
  console.log(JSON.stringify(tip));
  await p.screenshot({ path: `${out}/shop-${w}-tip.png` });
  ok(!tip.hidden && /Turbo/.test(tip.text) && /Recharge/.test(tip.text), `${w}px : infobulle affichée avec recharge`);
  ok(tip.l >= 0 && tip.r <= w && tip.sw <= tip.iw, `${w}px : infobulle dans l'écran, pas de défilement horizontal`);
  ok(!/\d[.,]\d/.test(tip.text), `${w}px : aucun nombre à virgule (${tip.text.slice(0, 60)}…)`);
  ok(tip.b <= box.y + 4, `${w}px : infobulle au-dessus du bouton (hors du doigt)`);
  await p.touchscreen.touchEnd();
  await sleep(200);
  const after = await p.evaluate(() => ({ hidden: document.querySelector('.tip').hidden, st: document.querySelector('#bonus [data-id="turbo"]').dataset.st }));
  ok(after.hidden, `${w}px : infobulle fermée au relâchement`);
  ok(after.st === 'ready', `${w}px : l'appui long n'a pas déclenché le bonus`);
  await p.close();
  // 2. rien d'acheté : pas de bonus, boutique avec prix
  p = await open(w, h, mk([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]));
  ok((await p.evaluate(() => [...document.querySelectorAll('#bonus li')].filter((l) => !l.hidden).length)) === 0, `${w}px : aucun bonus sans achat`);
  await p.click('#tab-rebirth'); await sleep(500);
  const shop = await p.evaluate(() => [...document.querySelectorAll('#perms .row')].map((r) => r.querySelector('.name').textContent + ' | ' + r.querySelector('.cb').textContent.trim()));
  console.log(shop.join('\n'));
  ok(shop.length === 11, `${w}px : 11 objets en boutique`);
  await p.screenshot({ path: `${out}/shop-${w}-boutique.png` });
  await p.click('#perms li:nth-child(5) .row'); await sleep(400);
  const bought = await p.evaluate(() => ({ cb: document.querySelector('#perms li:nth-child(5) .cb').textContent.trim(), vis: [...document.querySelectorAll('#bonus li')].filter((l) => !l.hidden).length, save: JSON.parse(localStorage.getItem('taupe-tycoon-save')).s.perms[4] }));
  ok(bought.cb === 'Acheté' && bought.vis === 1, `${w}px : achat unique -> « Acheté », bonus visible (${JSON.stringify(bought)})`);
  await p.reload({ waitUntil: 'load' }); await sleep(1000);
  ok((await p.evaluate(() => [...document.querySelectorAll('#bonus li')].filter((l) => !l.hidden).length)) === 1, `${w}px : toujours là après rechargement`);
  const cap = await p.evaluate(() => ({ t: document.getElementById('goal-t').textContent, sw: document.documentElement.scrollWidth, iw: innerWidth }));
  console.log(cap.t);
  ok(/Prochaine gemme/.test(cap.t) && cap.sw <= cap.iw, `${w}px : légende de la barre`);
  await p.screenshot({ path: `${out}/shop-${w}-barre.png` });
  await p.close();
}
b.disconnect();
process.exit(fail ? 1 : 0);
