// Captures de contrôle : BROWSER_URL=… node e2e/shots.mjs <url> <dossier>
import puppeteer from 'puppeteer-core';
const url = process.argv[2] ?? 'http://127.0.0.1:5201/';
const out = process.argv[3] ?? '/shots';
const b = await puppeteer.connect({ browserURL: process.env.BROWSER_URL });
const mk = (o) => JSON.stringify({ v: 2, at: Date.now(), opts: { lang: 'fr', reduced: false, mode: 1, sound: false, seen: 0 },
  s: { dirt: 0, runTotal: 0, lifeTotal: 0, gems: 0, gemsEarned: 0, rebirths: 0, shovel: 0, gens: [0, 0, 0, 0, 0, 0], perms: [0, 0, 0, 0], clicks: 0, runTime: 0, ...o } });
const states = {
  fresh: null,
  early: mk({ dirt: 600, runTotal: 800, lifeTotal: 800, shovel: 3, gens: [4, 1, 0, 0, 0, 0], clicks: 20 }),
  mid: mk({ dirt: 3e6, runTotal: 6e7, lifeTotal: 6e7, shovel: 14, gens: [20, 12, 8, 5, 0, 0], clicks: 400, gemsEarned: 2, gems: 2, rebirths: 1 }),
  late: mk({ dirt: 4e9, runTotal: 4e10, lifeTotal: 9e10, shovel: 40, gens: [60, 40, 30, 20, 10, 4], clicks: 4000, gemsEarned: 9, gems: 3, rebirths: 4, perms: [3, 2, 1, 1] }),
};
for (const [w, h] of [[320, 568], [390, 844], [1440, 900]]) {
  for (const [name, st] of Object.entries(states)) {
    const p = await b.newPage();
    await p.setViewport({ width: w, height: h, isMobile: w < 700, hasTouch: w < 700 });
    if (st) await p.evaluateOnNewDocument((v) => { if (!sessionStorage.getItem('x')) { localStorage.setItem('taupe-tycoon-save', v); sessionStorage.setItem('x', '1'); } }, st);
    await p.goto(url, { waitUntil: 'load' });
    await new Promise((r) => setTimeout(r, 300));
    await p.screenshot({ path: `${out}/${name}-${w}.png` });
    if (name === 'mid' && w !== 320) {
      for (const m of ['dig', 'happy']) { await p.evaluate((m) => { document.getElementById('mole').dataset.mood = m; }, m); await p.screenshot({ path: `${out}/mood-${m}-${w}.png` }); }
    }
    if (name === 'late') { await p.click('#tab-rebirth'); await p.screenshot({ path: `${out}/rebirth-${w}.png` }); }
    await p.close();
  }
}
b.disconnect();
