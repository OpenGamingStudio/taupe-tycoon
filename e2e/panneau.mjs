// Panneau ouvert : barre de bonus cachée, taupe cliquable ; clic critique visible. node e2e/panneau.mjs <url> <dossier>
import puppeteer from 'puppeteer-core';
const url = process.argv[2], out = process.argv[3] ?? '/shots';
const b = await puppeteer.connect({ browserURL: process.env.BROWSER_URL });
const save = JSON.stringify({ v: 3, at: Date.now(), opts: { lang: 'fr', reduced: false, mode: 1, sound: false, seen: 3, music: false, ambient: false },
  s: { dirt: 4000, runTotal: 9e6, lifeTotal: 9e6, gems: 3, gemsEarned: 3, rebirths: 1, shovel: 6, gens: [8, 4, 2, 1, 0, 0], perms: [0, 0, 0, 0], clicks: 300, runTime: 900 } });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ko = 0; const ok = (c, m) => { console.log((c ? 'OK  ' : 'KO  ') + m); if (!c) ko++; };
for (const [w, h] of [[320, 568], [360, 740], [390, 844], [430, 932], [1440, 900]]) {
  const p = await b.newPage(); const tag = `${w}x${h}`;
  await p.setViewport({ width: w, height: h, isMobile: w < 700, hasTouch: w < 700 });
  await p.evaluateOnNewDocument((v) => { if (!sessionStorage.getItem('x')) { localStorage.setItem('taupe-tycoon-save', v); sessionStorage.setItem('x', '1'); } }, save);
  await p.goto(url, { waitUntil: 'load' }); await sleep(600);
  const vis = () => p.evaluate(() => { const r = document.getElementById('bonus').getBoundingClientRect(); return { d: getComputedStyle(document.getElementById('bonus')).display, h: r.height }; });
  ok((await vis()).h > 0, `${tag} bonus visible fermé`);
  await p.screenshot({ path: `${out}/ferme-${tag}.png` });
  await p.click('#tab-dig'); await sleep(500);
  const v = await vis();
  ok(v.d === 'none', `${tag} bonus caché ouvert`);
  const m = await p.evaluate(() => { const r = document.getElementById('mole').getBoundingClientRect(), s = document.getElementById('sheet').getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height * 0.5; const top = document.elementFromPoint(cx, cy);
    return { w: r.width, h: r.height, bottom: r.bottom, sheetTop: s.top, hit: !!top?.closest('#mole'), vis: Math.min(r.bottom, s.top) - r.top }; });
  console.log(`${tag}: taupe ${Math.round(m.w)}x${Math.round(m.h)}, visible ${Math.round(m.vis)} px`);
  ok(m.hit, `${tag} taupe cliquable au centre`); ok(m.vis >= 44 && m.w >= 44, `${tag} taupe >= 44 px`);
  const c0 = await p.evaluate(() => document.getElementById('hud-dirt').textContent);
  await p.click('#mole'); await sleep(100);
  await p.screenshot({ path: `${out}/ouvert-${tag}.png` });
  await p.click('#sheet-x'); await sleep(500);
  ok((await vis()).h > 0, `${tag} bonus réaffiché à la fermeture`);
  if (w === 390) { // critiques : 200 clics, au moins un chiffre fx-crit
    let crit = 0;
    for (let i = 0; i < 120; i++) { await p.evaluate(() => document.getElementById('mole').dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 190, clientY: 400 }))); crit += await p.evaluate(() => document.querySelectorAll('.fx-crit').length ? 1 : 0); await sleep(20); }
    ok(crit > 0, `${tag} chiffres critiques vus (${crit})`);
    await p.evaluate(() => document.getElementById('mole').dispatchEvent(new MouseEvent('click', { bubbles: true })));
  }
  await p.close();
}
b.disconnect(); process.exit(ko ? 1 : 0);
