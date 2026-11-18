// Captures de contrôle (lots 2-3) : BROWSER_URL=… node e2e/lot2.mjs <url> <dossier> <préfixe> [tailles "320x568,390x844,1440x900"]
import puppeteer from 'puppeteer-core';
const [url = 'http://127.0.0.1:5301/', out = '/shots', pre = 'x', sizes = '320x568,390x844,1024x768,1440x900'] = process.argv.slice(2);
const b = await puppeteer.connect({ browserURL: process.env.BROWSER_URL });
const mk = (o) => JSON.stringify({ v: 3, at: Date.now(), opts: { lang: 'fr', reduced: false, mode: 1, sound: false, seen: 0 },
  s: { dirt: 0, runTotal: 0, lifeTotal: 0, gems: 0, gemsEarned: 0, rebirths: 0, shovel: 0, gens: [0, 0, 0, 0, 0, 0], perms: [0, 0, 0, 0], clicks: 0, runTime: 0, trophies: [], ...o } });
const mid = mk({ dirt: 3e6, runTotal: 6e7, lifeTotal: 6e7, shovel: 14, gens: [20, 12, 8, 5, 0, 0], clicks: 400, gemsEarned: 2, gems: 2, rebirths: 1 });
const late = mk({ dirt: 4e12, runTotal: 4e13, lifeTotal: 4e14, shovel: 60, gens: [120, 100, 80, 60, 40, 30], clicks: 9000, gemsEarned: 900, gems: 90, rebirths: 12 });
const res = [];
for (const sz of sizes.split(',')) {
  const [w, h] = sz.split('x').map(Number);
  for (const [name, st, open] of [['debut', null, false], ['debut-menu', null, true], ['milieu', mid, false], ['milieu-menu', mid, true], ['fin', late, false], ['fin-menu', late, true]]) {
    const p = await b.newPage();
    await p.setViewport({ width: w, height: h, isMobile: w < 700, hasTouch: w < 700, deviceScaleFactor: 1 });
    if (st) await p.evaluateOnNewDocument((v) => { if (!sessionStorage.getItem('x')) { localStorage.setItem('taupe-tycoon-save', v); sessionStorage.setItem('x', '1'); } }, st);
    await p.goto(url, { waitUntil: 'load' });
    await new Promise((r) => setTimeout(r, 2500));
    const isOpen = () => p.evaluate(() => document.getElementById('app').dataset.panel !== '');
    if ((await isOpen()) !== open) { await p.click('#tab-dig'); await new Promise((r) => setTimeout(r, 700)); }
    const m = await p.evaluate(() => { const r = document.getElementById('mole').getBoundingClientRect(); const s = document.getElementById('mole-svg').getBoundingClientRect();
      const cx = s.x + s.width / 2, ys = [0.3, 0.5, 0.7].map((f) => document.elementFromPoint(cx, s.y + s.height * f)?.closest('#mole') ? 1 : 0);
      return { moleH: Math.round(s.height), hit: ys.join(''), sx: document.documentElement.scrollWidth > innerWidth }; });
    res.push(`${sz} ${name}: ${JSON.stringify(m)}`);
    await p.screenshot({ path: `${out}/${pre}-${name}-${sz}.png` });
    await p.close();
  }
}
console.log(res.join('\n'));
b.disconnect();
