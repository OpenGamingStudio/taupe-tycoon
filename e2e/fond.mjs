// Stress du fond : BROWSER_URL=… node e2e/fond.mjs <url> <dossier>
import puppeteer from 'puppeteer-core';
const url = process.argv[2] ?? 'http://127.0.0.1:5301/';
const out = process.argv[3] ?? '/shots';
const b = await puppeteer.connect({ browserURL: process.env.BROWSER_URL });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const save = JSON.stringify({ v: 3, at: Date.now(), opts: { lang: 'fr', reduced: false, mode: 1, sound: false, seen: 1, music: false, ambient: false },
  s: { dirt: 4e12, runTotal: 4e13, lifeTotal: 9e13, gems: 30, gemsEarned: 90, rebirths: 14, shovel: 60, gens: [90, 70, 50, 40, 30, 20], perms: [3, 2, 1, 1], clicks: 40000, runTime: 5000 } });
const p = await b.newPage();
await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
const errs = [];
p.on('pageerror', (e) => errs.push(e.message));
p.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
await p.evaluateOnNewDocument((v) => { if (!sessionStorage.getItem('x')) { localStorage.setItem('taupe-tycoon-save', v); sessionStorage.setItem('x', '1'); } }, save);
await p.goto(url, { waitUntil: 'load' });
await sleep(1500);
const probe = (label) => p.evaluate((label) => {
  const st = document.getElementById('stage'), w = document.getElementById('world'), f = document.getElementById('fxc');
  const cnt = (c) => { const g = c.getContext('2d'); const d = g.getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++; return n; };
  let wn = -1; try { wn = cnt(w); } catch (e) { wn = 'ERR ' + e.message; }
  return { label, cls: st.className.replace(/\s+/g, ' ').slice(0, 80), bg: getComputedStyle(st).backgroundColor, sceneKids: document.getElementById('scene').children.length,
    worldPx: wn, worldW: w.width, fxPx: cnt(f), fxKids: document.getElementById('fx').children.length, stageFx: document.getElementById('stage-fx').children.length };
}, label);
console.log(JSON.stringify(await probe('start')));
const click = async (n) => { const bx = await p.$eval('#mole', (e) => { const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; }); for (let i = 0; i < n; i++) { await p.touchscreen.tap(bx[0] + (i % 7) * 4, bx[1] + (i % 5) * 4); if (i % 20 === 0) await sleep(10); } };
await click(400); await sleep(800); console.log(JSON.stringify(await probe('400 clics')));
for (let k = 0; k < 6; k++) { await p.setViewport({ width: 320 + k * 90, height: 600 + k * 40, isMobile: true, hasTouch: true }); await click(60); }
await sleep(500); console.log(JSON.stringify(await probe('resize')));
// onglet caché puis revenu
const cdp = await p.createCDPSession();
await cdp.send('Emulation.setFocusEmulationEnabled', { enabled: false }).catch(() => {});
const bg = await b.newPage(); await bg.bringToFront(); await sleep(3000); await click(0).catch(() => {});
await p.bringToFront(); await sleep(1000); await click(100); await sleep(800); console.log(JSON.stringify(await probe('caché/revenu')));
// sabotage : scène vidée, classe perdue, canvas à 0, boucle de dessin gelée -> réparation attendue sans rechargement
await p.evaluate(() => { document.getElementById('scene').innerHTML = ''; const st = document.getElementById('stage'); st.className = 'x'; document.getElementById('world').width = 0; });
await sleep(100); console.log(JSON.stringify(await probe('sabotage')));
await sleep(2500); const rep = await probe('réparé');
console.log(JSON.stringify(rep));
const okRep = rep.sceneKids >= 5 && /depth-[0-2]/.test(rep.cls) && rep.worldW >= 40 && rep.worldPx > 1000;
console.log(okRep ? 'REPARATION OK' : 'REPARATION ECHEC');
if (!okRep) process.exitCode = 1;
await p.screenshot({ path: `${out}/fond-apres.png` });
console.log('erreurs:', errs.slice(0, 5).join(' | ') || 'aucune');
await p.close(); await bg.close();
b.disconnect();
