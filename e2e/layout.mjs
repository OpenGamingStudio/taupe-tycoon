// Disposition V4 : node e2e/layout.mjs <url> <dossier de captures>  (BROWSER_URL requis)
import puppeteer from 'puppeteer-core';
const url = process.argv[2], out = process.argv[3] ?? '/shots';
const b = await puppeteer.connect({ browserURL: process.env.BROWSER_URL });
const save = (o, opts = {}) => JSON.stringify({ v: 3, at: Date.now(), opts: { lang: 'fr', reduced: false, mode: 1, sound: false, seen: 3, music: false, ambient: false, ...opts },
  s: { dirt: 4000, runTotal: 9e6, lifeTotal: 9e6, gems: 3, gemsEarned: 3, rebirths: 1, shovel: 6, gens: [8, 4, 2, 1, 0, 0], perms: [0, 0, 0, 0], clicks: 300, runTime: 900, ...o } });
const fails = []; const ok = (c, m) => { if (!c) { fails.push(m); console.log('KO  ' + m); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (const [w, h] of [[320, 568], [390, 844], [768, 1024], [1440, 900], [800, 380]]) {
  const p = await b.newPage();
  await p.setViewport({ width: w, height: h, isMobile: w < 700, hasTouch: w < 700 });
  const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
  await p.evaluateOnNewDocument((v) => { if (!sessionStorage.getItem('x')) { localStorage.setItem('taupe-tycoon-save', v); sessionStorage.setItem('x', '1'); } }, save({}));
  await p.goto(url, { waitUntil: 'load' }); await sleep(500);
  const tag = `${w}x${h}`;
  const state = () => p.evaluate(() => ({ panel: document.getElementById('app').dataset.panel, open: document.getElementById('sheet').dataset.open, inert: document.getElementById('sheet').inert, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  let st = await state();
  ok(st.panel === '' && st.inert, `${tag} fermé au départ`);
  ok(st.sw <= st.cw, `${tag} pas de défilement horizontal (fermé)`);
  const stageBox = await p.$eval('#stage', (e) => { const m = e.querySelector('#mole').getBoundingClientRect(); return [m.height, innerHeight]; });
  console.log(`${tag}: taupe ${Math.round(stageBox[0])} px de haut`);
  await p.screenshot({ path: `${out}/closed-${tag}.png` });
  // badges
  const badge = await p.$eval('#bd-dig', (e) => (e.hidden ? '' : e.textContent));
  ok(badge !== '', `${tag} badge d'achat sur la Mine (${badge})`);
  // chaque bouton du dock ouvre son panneau
  for (const n of ['dig', 'rebirth', 'trophies', 'stats', 'options']) {
    await p.click('#tab-' + n); await sleep(380);
    st = await state();
    ok(st.panel === n && st.open === 'true' && !st.inert, `${tag} ${n} s'ouvre`);
    ok(st.sw <= st.cw, `${tag} ${n} : pas de défilement horizontal`);
    const bad = await p.evaluate(() => [...document.querySelectorAll('#sheet button:not([hidden]), #dock button, #sheet input[type=range], #sheet a')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.height < 43.5 || r.width < 43.5) && !e.closest('[hidden]') && getComputedStyle(e).visibility !== 'hidden'; }).map((e) => (e.id || e.className.toString().slice(0, 20)) + ':' + Math.round(e.getBoundingClientRect().width) + 'x' + Math.round(e.getBoundingClientRect().height)));
    ok(bad.length === 0, `${tag} ${n} cibles >= 44 px : ${bad.join(', ')}`);
    if (n === 'dig' || n === 'options') await p.screenshot({ path: `${out}/${n}-${tag}.png` });
  }
  // un seul panneau à la fois, bouton de fermeture
  const xb = await p.$eval('#sheet-x', (e) => { const r = e.getBoundingClientRect(); return [r.width, r.height]; });
  ok(xb[0] >= 44 && xb[1] >= 44, `${tag} bouton fermer >= 44 px (${xb.map(Math.round)})`);
  await p.click('#sheet-x'); await sleep(380);
  ok((await state()).panel === '', `${tag} × ferme`);
  await p.click('#tab-dig'); await sleep(350);
  await p.keyboard.press('Escape'); await sleep(350);
  ok((await state()).panel === '', `${tag} Échap ferme`);
  await p.click('#tab-dig'); await sleep(350);
  await p.mouse.click(w < 700 ? w / 2 : 30, 8); await sleep(350); // hors du tiroir (haut de scène)
  ok((await state()).panel === '', `${tag} clic dehors ferme`);
  // creuser avec le tiroir ouvert ne le ferme pas
  await p.click('#tab-dig'); await sleep(350);
  await p.click('#mole'); await sleep(100);
  ok((await state()).panel === 'dig', `${tag} creuser garde le tiroir ouvert`);
  // mémorisation
  await p.evaluate(() => window.dispatchEvent(new Event('pagehide'))); 
  await p.reload({ waitUntil: 'load' }); await sleep(500);
  ok((await state()).panel === 'dig', `${tag} panneau mémorisé après rechargement`);
  await sleep(100);
  ok(errs.length === 0, `${tag} erreurs : ${errs[0]}`);
  await p.close();
}
b.disconnect();
console.log(fails.length ? `${fails.length} KO` : 'tout est OK');
