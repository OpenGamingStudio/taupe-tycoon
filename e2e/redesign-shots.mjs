// Captures de la refonte 2.9.0 : menus mine / rebirth (boutique) / succès ouverts, 320 / 390 / 1440.
import puppeteer from 'puppeteer-core';
const url = process.argv[2] ?? 'http://127.0.0.1:5301/';
const out = process.argv[3] ?? '/shots/redesign';
const b = await puppeteer.connect({ browserURL: process.env.BROWSER_URL });
const save = JSON.stringify({ v: 2, at: Date.now(), opts: { lang: 'fr', reduced: false, mode: 1, sound: false, seen: 9 },
  s: { dirt: 3e6, runTotal: 6e7, lifeTotal: 6e7, gems: 3, gemsEarned: 5, rebirths: 2, shovel: 14, gens: [20, 12, 8, 5, 2, 0], perms: [3, 2, 1, 40], clicks: 400, runTime: 900 } });
for (const [w, h] of [[320, 568], [390, 844], [1440, 900]]) {
  for (const tab of ['dig', 'rebirth', 'trophies']) {
    const p = await b.newPage();
    await p.setBypassCSP(true);
    await p.setViewport({ width: w, height: h, isMobile: w < 700, hasTouch: w < 700 });
    await p.evaluateOnNewDocument((v) => { if (!sessionStorage.getItem('x')) { localStorage.setItem('taupe-tycoon-save', v); sessionStorage.setItem('x', '1'); } }, save);
    await p.goto(url, { waitUntil: 'load' });
    await new Promise((r) => setTimeout(r, 400));
    await p.click('#tab-' + tab);
    await new Promise((r) => setTimeout(r, 600));
    const res = await p.evaluate(() => {
      const bad = [];
      document.querySelectorAll('#app *').forEach((e) => {
        const r = e.getBoundingClientRect();
        const bg = getComputedStyle(e).backgroundColor;
        if (bg === 'rgb(255, 255, 255)' && r.width > 40 && r.height > 40 && e.closest('#sheet,.dock,.hud')) bad.push(e.className || e.tagName);
      });
      const hs = document.documentElement.scrollWidth > innerWidth;
      const small = [...document.querySelectorAll('#sheet button, .dock button')].filter((e) => { const r = e.getBoundingClientRect(); return r.width && (r.height < 43.5 || r.width < 43.5); }).map((e) => e.id || e.className);
      const grad = [...document.querySelectorAll('*')].filter((e) => /gradient/.test(getComputedStyle(e).backgroundImage)).length;
      return { white: bad.length, hscroll: hs, small, grad };
    });
    console.log(w, tab, JSON.stringify(res));
    if (res.white || res.hscroll || res.small.length || res.grad) process.exitCode = 1;
    await p.screenshot({ path: `${out}/${tab}-${w}.png` });
    await p.evaluate(() => { const sb = document.querySelector('.sheet-body'); sb.scrollTop = sb.scrollHeight; });
    await new Promise((r) => setTimeout(r, 300));
    await p.screenshot({ path: `${out}/${tab}-${w}-bas.png` });
    await p.close();
  }
}
b.disconnect();
