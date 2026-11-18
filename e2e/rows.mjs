// Lignes d'achat : node e2e/rows.mjs <url> <dossier>  (BROWSER_URL requis). x1/x10/Max, niveaux à 3 chiffres.
import puppeteer from 'puppeteer-core';
const url = process.argv[2], out = process.argv[3] ?? '/shots';
const b = await puppeteer.connect({ browserURL: process.env.BROWSER_URL });
const save = (mode, lv) => JSON.stringify({ v: 3, at: Date.now(), opts: { lang: 'fr', reduced: false, mode, sound: false, seen: 3, music: false, ambient: false },
  s: { dirt: 7.5e8, runTotal: 9e9, lifeTotal: 9e9, gems: 3, gemsEarned: 3, rebirths: 1, shovel: lv, gens: [lv, lv, Math.min(lv, 20), 1, 0, 0], perms: [0, 0, 0, 0], clicks: 300, runTime: 900 } });
const fails = []; const ok = (c, m) => { if (!c) { fails.push(m); console.log('KO  ' + m); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (const [w, h] of [[320, 640], [360, 740], [390, 844], [430, 900], [1440, 900]])
  for (const mode of [1, 10, 'max']) for (const lv of [3, 250]) {
    const p = await b.newPage();
    await p.setViewport({ width: w, height: h, isMobile: w < 700, hasTouch: w < 700 });
    await p.evaluateOnNewDocument((v) => { if (!sessionStorage.getItem('x')) { localStorage.setItem('taupe-tycoon-save', v); sessionStorage.setItem('x', '1'); } }, save(mode, lv));
    await p.goto(url, { waitUntil: 'load' }); await sleep(500);
    await p.click('#tab-dig'); await sleep(450);
    const tag = `${w}px x${mode} niv${lv}`;
    const r = await p.evaluate(() => {
      const bad = [];
      const rows = [...document.querySelectorAll('#rows .row')].filter((e) => !e.classList.contains('is-locked'));
      for (const e of rows) {
        const bd = e.querySelector('.badges'), lv = e.querySelector('.lv'), pl = e.querySelector('.plus');
        const name = e.querySelector('.name').getBoundingClientRect();
        if (bd.getBoundingClientRect().top < name.bottom - 1) bad.push('badges collés au titre');
        if (!pl.hidden && Math.abs(pl.getBoundingClientRect().top - lv.getBoundingClientRect().top) > 2 && pl.getBoundingClientRect().left > lv.getBoundingClientRect().left) bad.push('+N pas sur la ligne de Niv.');
        for (const c of ['.stat', '.cur', '.mile']) { const t = e.querySelector(c); if (t.scrollWidth > t.clientWidth + 1 || /,/.test(t.textContent)) bad.push(c + ' coupé ou virgule : ' + t.textContent); }
        const rr = e.getBoundingClientRect(); if (rr.height < 44) bad.push('ligne < 44 px');
      }
      return { bad, n: rows.length, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, txt: rows[0].innerText.replace(/\n/g, ' | ') };
    });
    ok(r.bad.length === 0, `${tag} : ${r.bad.join(' ; ')}`); ok(r.sw <= r.cw, `${tag} défilement horizontal`);
    if (lv === 3 || lv === 250) console.log(`${tag}: ${r.txt}`);
    await p.screenshot({ path: `${out}/rows-${w}-x${mode}-n${lv}.png` });
    await p.close();
  }
b.disconnect(); console.log(fails.length ? `${fails.length} échec(s)` : 'OK'); process.exit(fails.length ? 1 : 0);
