// Bonus à recharge : BROWSER_URL=… node e2e/bonus.mjs <url> <dossier>
import puppeteer from 'puppeteer-core';
const url = process.argv[2] ?? 'http://127.0.0.1:5301/';
const out = process.argv[3] ?? '/shots';
const b = await puppeteer.connect({ browserURL: process.env.BROWSER_URL });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const save = JSON.stringify({ v: 4, at: Date.now(), opts: { lang: 'fr', reduced: false, mode: 1, sound: false, seen: 1, music: false, ambient: false },
  s: { dirt: 5e6, runTotal: 2e7, lifeTotal: 2e7, gems: 3, gemsEarned: 5, rebirths: 2, shovel: 12, gens: [20, 12, 8, 4, 1, 0], perms: [1, 0, 0, 0], clicks: 900, runTime: 900 } });
let fail = 0;
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) fail++; };
for (const [w, h] of [[390, 844], [320, 568], [1280, 720]]) {
  const p = await b.newPage();
  await p.setViewport({ width: w, height: h, isMobile: w < 700, hasTouch: w < 700 });
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.evaluateOnNewDocument((v) => { if (!sessionStorage.getItem('x')) { localStorage.setItem('taupe-tycoon-save', v); sessionStorage.setItem('x', '1'); } }, save);
  await p.goto(url, { waitUntil: 'load' });
  await sleep(1200);
  const geo = await p.evaluate(() => {
    const bs = [...document.querySelectorAll('#bonus .bn')].map((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height), Math.round(r.left), Math.round(r.right)]; });
    return { bs, sw: document.documentElement.scrollWidth, iw: innerWidth, states: [...document.querySelectorAll('#bonus .bn')].map((e) => e.dataset.st) };
  });
  console.log(w, JSON.stringify(geo));
  ok(geo.bs.length === 5 && geo.bs.every((x) => x[0] >= 44 && x[1] >= 44 && x[2] >= 0 && x[3] <= w), `${w}px : 5 boutons ≥ 44 px dans l'écran`);
  ok(geo.sw <= geo.iw, `${w}px : pas de défilement horizontal`);
  ok(geo.states.every((s) => s === 'ready'), `${w}px : tous prêts au départ`);
  await p.screenshot({ path: `${out}/bonus-${w}-prets.png` });
  // Auto-tap
  const d0 = await p.evaluate(() => JSON.parse(localStorage.getItem('taupe-tycoon-save') ?? '{}').s?.clicks ?? 0);
  await p.click('#bonus [data-id="auto"]');
  await sleep(1500);
  await p.screenshot({ path: `${out}/bonus-${w}-auto.png` });
  const st = await p.evaluate(() => ({ s: document.querySelector('#bonus [data-id="auto"]').dataset.st, t: document.querySelector('#bonus [data-id="auto"] .bn-t').textContent, finger: !document.querySelector('.finger').hidden, fx: document.getElementById('fx').children.length }));
  console.log(JSON.stringify(st));
  ok(st.s === 'active' && st.finger, `${w}px : auto-tap actif, doigt visible`);
  // Pluie
  await p.click('#bonus [data-id="rain"]');
  await sleep(2600);
  const drops = await p.evaluate(() => document.querySelectorAll('.drop').length);
  await p.screenshot({ path: `${out}/bonus-${w}-pluie.png` });
  ok(drops > 0, `${w}px : pépites qui tombent (${drops})`);
  const before = await p.evaluate(() => document.getElementById('hud-dirt').textContent);
  await p.evaluate(() => document.querySelector('.drop')?.click());
  await p.click('#bonus [data-id="burst"]');
  await p.click('#bonus [data-id="turbo"]');
  await p.click('#bonus [data-id="crew"]');
  await sleep(600);
  const states = await p.evaluate(() => [...document.querySelectorAll('#bonus .bn')].map((e) => e.dataset.st + ':' + e.querySelector('.bn-t').textContent));
  console.log(states.join(' '));
  ok(states.filter((s) => s.startsWith('cool') || s.startsWith('active')).length === 5, `${w}px : 5 bonus lancés → recharge/actif`);
  // persistance : recharge conservée au rechargement
  await p.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  await p.reload({ waitUntil: 'load' });
  await sleep(800);
  const after = await p.evaluate(() => [...document.querySelectorAll('#bonus .bn')].map((e) => e.dataset.st));
  console.log(after.join(' '));
  ok(after.filter((s) => s === 'ready').length === 0, `${w}px : recharges conservées après rechargement`);
  // hors-ligne simulé : on recule les dates de 11 min dans la sauvegarde
  await p.evaluate(() => { const k = 'taupe-tycoon-save'; const o = JSON.parse(localStorage.getItem(k)); o.s.ready = o.s.ready.map((r) => r - 11 * 60000); o.at -= 11 * 60000; o.s.auto = 0; o.s.turbo = 0; localStorage.setItem(k, JSON.stringify(o)); sessionStorage.setItem('x', '1'); Storage.prototype.setItem = () => {}; });
  await p.reload({ waitUntil: 'load' });
  await sleep(800);
  const off = await p.evaluate(() => [...document.querySelectorAll('#bonus .bn')].map((e) => e.dataset.st));
  console.log(off.join(' '));
  ok(off.every((s) => s === 'ready'), `${w}px : bonus de nouveau prêts après 11 min d'absence`);
  await p.evaluate(() => document.getElementById('tab-stats').click());
  await sleep(500);
  await p.screenshot({ path: `${out}/bonus-${w}-aide.png` });
  ok(errs.length === 0, `${w}px : aucune erreur (${errs.join(' | ')})`);
  await p.close();
}
b.disconnect();
process.exit(fail ? 1 : 0);
