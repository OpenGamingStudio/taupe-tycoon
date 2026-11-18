// Contrôle V2.1 : BROWSER_URL=… node e2e/features.mjs <url> <dossier de captures>
import puppeteer from 'puppeteer-core';
const url = process.argv[2] ?? 'http://127.0.0.1:5201/';
const out = process.argv[3] ?? '/shots';
const b = await puppeteer.connect({ browserURL: process.env.BROWSER_URL });
const ok = [], ko = [];
const check = (name, cond, info = '') => (cond ? ok : ko).push(name + (cond ? '' : ' ' + info));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const mk = (o, at = Date.now(), opts = {}) => JSON.stringify({ v: 2, at, opts: { lang: 'fr', reduced: false, mode: 1, sound: true, seen: 3, ...opts },
  s: { dirt: 4e6, runTotal: 6e7, lifeTotal: 6e7, gems: 2, gemsEarned: 2, rebirths: 1, shovel: 14, gens: [20, 12, 8, 5, 0, 0], perms: [1, 0, 0, 1], clicks: 400, runTime: 300, ...o } });
async function open(w, h, save, setup) {
  const p = await b.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(String(e)));
  p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await p.setViewport({ width: w, height: h, isMobile: w < 700, hasTouch: w < 700 });
  await p.evaluateOnNewDocument((v) => {
    window.__ac = 0;
    const A = window.AudioContext; window.AudioContext = function (...a) { window.__ac++; return new A(...a); }; window.AudioContext.prototype = A.prototype;
    if (v && !sessionStorage.getItem('x')) { localStorage.setItem('taupe-tycoon-save', v); sessionStorage.setItem('x', '1'); }
  }, save);
  await p.goto(url, { waitUntil: 'load' });
  p.errors = errors;
  return p;
}
const overflow = (p) => p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
const smallTargets = (p) => p.evaluate(() => [...document.querySelectorAll('button, input, a, textarea, [role=tab]')].filter((e) => {
  const r = e.getBoundingClientRect(); const vis = r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden' && !e.closest('[hidden]');
  return vis && (r.width < 43.5 || r.height < 43.5);
}).map((e) => (e.id || e.textContent.slice(0, 20)) + ' ' + Math.round(e.getBoundingClientRect().width) + 'x' + Math.round(e.getBoundingClientRect().height)));

// 1. aucun son avant le premier geste
let p = await open(390, 844, mk({}));
await wait(600);
check('aucun AudioContext avant interaction', (await p.evaluate(() => window.__ac)) === 0);
await p.click('#mole'); await wait(200);
check('AudioContext créé après le premier geste', (await p.evaluate(() => window.__ac)) >= 1);

// 2. onglets, succès, stats, options
for (const w of [320, 390, 1440]) {
  const h = w === 320 ? 568 : w === 390 ? 844 : 900;
  const q = await open(w, h, mk({}));
  await wait(500);
  await q.screenshot({ path: `${out}/dig-${w}.png` });
  for (const tab of ['trophies', 'options', 'rebirth']) {
    await q.click('#tab-' + tab); await wait(250);
    await q.screenshot({ path: `${out}/${tab}-${w}.png` });
    check(`pas de défilement horizontal (${tab} ${w})`, (await overflow(q)) <= 0, String(await overflow(q)));
    const small = await smallTargets(q);
    check(`cibles >= 44 px (${tab} ${w})`, small.length === 0, small.join(', '));
  }
  await q.click('#tab-trophies'); await wait(150);
  if (w === 390) {
    const n = await q.$$eval('#trophies li', (l) => l.length);
    check('20 succès listés', n === 20, String(n));
    const txt = await q.$eval('#p-trophies', (e) => e.textContent);
    check('aucun nombre à virgule (succès)', !/\d[.,]\d/.test(txt.replace(/\d[  ]?\d{3}/g, '')), txt.slice(0, 80));
    // clavier : flèches entre onglets
    await q.focus('#tab-trophies'); await q.keyboard.press('ArrowRight'); await wait(100);
    check('flèche droite : onglet Options', (await q.$eval('#tab-options', (e) => e.getAttribute('aria-selected'))) === 'true');
    await q.keyboard.press('End'); await q.keyboard.press('Home'); await wait(50);
    check('Home : onglet Creuser', (await q.$eval('#tab-dig', (e) => e.getAttribute('aria-selected'))) === 'true');
  }
  check(`aucune erreur console (${w})`, q.errors.length === 0, q.errors.join(' | '));
  await q.close();
}

// 3. options : volume, ambiance, export/import
{
  const q = await open(390, 844, mk({ gens: [7, 0, 0, 0, 0, 0], dirt: 123 }, Date.now(), { sound: false }));
  await q.click('#tab-options'); await wait(200);
  await q.$eval('#opt-vol', (e) => { e.value = '35'; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); });
  await q.click('#opt-ambient'); await wait(150);
  check('volume affiché', (await q.$eval('#vol-v', (e) => e.textContent)) === '35 %');
  check('ambiance activée (aria-pressed)', (await q.$eval('#opt-ambient', (e) => e.getAttribute('aria-pressed'))) === 'true');
  const saved = await q.evaluate(() => { window.dispatchEvent(new Event('pagehide')); return JSON.parse(localStorage.getItem('taupe-tycoon-save')).opts; });
  check('volume + ambiance persistés', saved.volume === 35 && saved.ambient === true && saved.sound === false, JSON.stringify(saved));
  await q.click('#io-export'); await wait(200);
  const text = await q.$eval('#io-text', (e) => e.value);
  check('export "TT1."', text.startsWith('TT1.'), text.slice(0, 20));
  await q.click('#opt-reset'); await q.click('#opt-reset'); await wait(300);
  await q.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  check('reset vide la partie', (await q.evaluate(() => JSON.parse(localStorage.getItem('taupe-tycoon-save')).s.gens[0])) === 0);
  await q.$eval('#io-text', (e, v) => { e.value = v; }, text);
  await q.click('#io-import'); await q.click('#io-import'); await wait(300);
  await q.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  check('import restaure la partie', (await q.evaluate(() => JSON.parse(localStorage.getItem('taupe-tycoon-save')).s.gens[0])) === 7);
  await q.$eval('#io-text', (e) => { e.value = 'n\'importe quoi'; });
  await q.click('#io-import'); await q.click('#io-import'); await wait(200);
  check('import invalide : partie intacte', (await q.evaluate(() => { window.dispatchEvent(new Event('pagehide')); return JSON.parse(localStorage.getItem('taupe-tycoon-save')).s.gens[0]; })) === 7);
  check('aucune erreur console (options)', q.errors.length === 0, q.errors.join(' | '));
  await q.close();
}

// 4. fenêtre « Bon retour » après 3 h d'absence
for (const w of [320, 1440]) {
  const q = await open(w, w === 320 ? 568 : 900, mk({}, Date.now() - 3 * 3600 * 1000));
  await wait(500);
  const open_ = await q.$eval('#welcome', (d) => d.open);
  check(`fenêtre Bon retour ouverte (${w})`, open_);
  const txt = await q.$eval('#welcome', (d) => d.textContent);
  check('texte : durée + gain + plafond, entiers', /3 h/.test(txt) && /terre/.test(txt) && !/\d[.,]\d/.test(txt.replace(/\d[  ]\d{3}/g, '')), txt.replace(/\s+/g, ' '));
  check('focus sur le bouton OK', (await q.evaluate(() => document.activeElement?.id)) === 'w-ok');
  await q.screenshot({ path: `${out}/welcome-${w}.png` });
  check(`pas de défilement horizontal (dialogue ${w})`, (await overflow(q)) <= 0);
  await q.keyboard.press('Escape'); await wait(150);
  check('Échap ferme la fenêtre', !(await q.$eval('#welcome', (d) => d.open)));
  await q.close();
}

// 5. pépite d'or (apparition à ~45 s) et deux onglets
{
  const a = await open(390, 844, mk({}));
  await wait(2000);
  const c = await open(390, 844, null); // second onglet : relit la sauvegarde de a (écrite à pagehide/5 s)
  let live = '';
  for (let i = 0; i < 30 && !/autre onglet/.test(live); i++) { await wait(500); live = (await a.$eval('#toast', (e) => e.textContent).catch(() => '')) + (await c.$eval('#toast', (e) => e.textContent).catch(() => '')); }
  check('deux onglets : le plus ancien est averti', /autre onglet/.test(live), live);
  await c.close();
  await wait(46000);
  const vis = await a.$eval('#nugget', (e) => !e.hidden);
  check('la pépite apparaît (~45 s)', vis);
  if (vis) {
    const box = await a.$eval('#nugget', (e) => { const r = e.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; });
    check('pépite visible et >= 44 px', box[2] >= 44 && box[3] >= 44 && box[0] >= 0 && box[0] + box[2] <= 390, JSON.stringify(box));
    check('pépite a un nom accessible', !!(await a.$eval('#nugget', (e) => e.getAttribute('aria-label'))));
    await a.screenshot({ path: `${out}/nugget-390.png` });
    await a.click('#nugget'); await wait(300);
    const t = await a.$eval('#toast', (e) => e.textContent);
    check('cueillir la pépite : message', /Pépite|Ruée|génie|Trésor/.test(t), t);
    await a.screenshot({ path: `${out}/nugget-caught-390.png` });
  }
  check('aucune erreur console (pépite)', a.errors.length === 0, a.errors.join(' | '));
  await a.close();
}
b.disconnect();
console.log('OK', ok.length); if (ko.length) { console.log('KO'); ko.forEach((k) => console.log(' -', k)); process.exit(1); }
