// Décor V4 : node e2e/visuals.mjs <url> <dossier de captures>  (BROWSER_URL requis)
import puppeteer from 'puppeteer-core';
const url = process.argv[2], out = process.argv[3] ?? '/shots';
const b = await puppeteer.connect({ browserURL: process.env.BROWSER_URL });
const save = (o) => JSON.stringify({ v: 3, at: Date.now(), opts: { lang: 'fr', reduced: false, mode: 1, sound: false, seen: 3, music: false, ambient: false, panel: '' },
  s: { dirt: 1e12, runTotal: 9e6, lifeTotal: 9e6, gems: 3, gemsEarned: 3, rebirths: 1, shovel: 6, gens: [0, 0, 0, 0, 0, 0], perms: [0, 0, 0, 0], clicks: 300, runTime: 900, ...o } });
const fails = []; const ok = (c, m) => { if (!c) { fails.push(m); console.log('KO  ' + m); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cases = { vide: {}, debut: { gens: [3, 1, 0, 0, 0, 0] }, milieu: { gens: [12, 6, 3, 2, 1, 0], perms: [1, 1, 2, 1] }, plein: { gens: [60, 40, 30, 20, 12, 8], perms: [4, 3, 6, 5] }, max: { gens: [150, 120, 100, 100, 100, 100], perms: [10, 10, 12, 10] } };
for (const [w, h] of [[390, 844], [1440, 900]]) {
  for (const [name, o] of Object.entries(cases)) {
    const p = await b.newPage();
    await p.setViewport({ width: w, height: h, isMobile: w < 700, hasTouch: w < 700 });
    const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    await p.evaluateOnNewDocument((v) => { if (!sessionStorage.getItem('x')) { localStorage.setItem('taupe-tycoon-save', v); sessionStorage.setItem('x', '1'); } }, save(o));
    await p.goto(url, { waitUntil: 'load' }); await sleep(1800);
    await p.screenshot({ path: `${out}/vis-${name}-${w}.png` });
    ok(errs.length === 0, `${name} ${w} : erreurs ${errs.join('|')}`);
    await p.close();
  }
}
// achat en direct : un +N sort de la machine, animation de construction
{
  const p = await b.newPage(); await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await p.evaluateOnNewDocument((v) => { if (!sessionStorage.getItem('x')) { localStorage.setItem('taupe-tycoon-save', v); sessionStorage.setItem('x', '1'); } }, save({ gens: [2, 1, 0, 0, 0, 0] }));
  await p.goto(url, { waitUntil: 'load' }); await sleep(600);
  await p.click('#tab-dig'); await sleep(450);
  const names = await p.$$eval('#rows li', (a) => a.map((x) => x.querySelector('h3,strong,.name')?.textContent ?? x.textContent.slice(0, 14)));
  const idx = names.findIndex((n) => /Foreuse/.test(n));
  ok(idx >= 0, 'ligne Foreuse trouvée');
  const countFx = () => p.evaluate(() => document.querySelectorAll('#stage-fx *, #fx *').length);
  const before = await p.evaluate(() => document.getElementById('hud-ps').textContent);
  await (await p.$$('#rows li button'))[idx + 1].click();
  let seenN = false;
  for (let i = 0; i < 12 && !seenN; i++) { await sleep(120); seenN = await p.evaluate(() => [...document.querySelectorAll('.fx-n')].some((e) => /\+1/.test(e.textContent))); }
  ok(seenN, 'achat : un « +1 » sort de la machine construite');
  await p.screenshot({ path: `${out}/vis-achat-390.png` });
  let seenS = false;
  for (let i = 0; i < 90 && !seenS; i++) { await sleep(100); seenS = await p.evaluate(() => [...document.querySelectorAll('.fx-s')].some((e) => /^\+\d/.test(e.textContent))); }
  ok(seenS, 'la machine livre : un « +N » de production sort d\'elle');
  const after = await p.evaluate(() => document.getElementById('hud-ps').textContent);
  ok(before !== after, `production affichée mise à jour (${before} → ${after})`);
  void countFx;
  await p.close();
}
console.log(fails.length ? `${fails.length} échec(s)` : 'visuals OK');
process.exit(fails.length ? 1 : 0);
