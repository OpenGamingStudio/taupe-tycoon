// Contrôle accessibilité : contrastes (calculés), cibles, clavier, focus, débordement.
// BROWSER_URL=… node e2e/a11y.mjs <url>
import puppeteer from 'puppeteer-core';
const url = process.argv[2] ?? 'http://127.0.0.1:5201/';
const b = await puppeteer.connect({ browserURL: process.env.BROWSER_URL });
let bad = 0;
const ko = (m) => { bad++; console.log('KO', m); };
const seed = JSON.stringify({ v: 2, at: Date.now(), opts: { lang: 'fr', reduced: false, mode: 1, sound: false, seen: 0 },
  s: { dirt: 3e5, runTotal: 5e8, lifeTotal: 5e8, gems: 5, gemsEarned: 5, rebirths: 1, shovel: 5, gens: [3, 2, 1, 0, 0, 0], perms: [1, 0, 0, 0], clicks: 99, runTime: 500 } });
for (const [w, h] of [[320, 568], [390, 844], [430, 932], [1440, 900]]) {
  const p = await b.newPage();
  await p.setViewport({ width: w, height: h, isMobile: w < 700, hasTouch: w < 700 });
  const errs = []; p.on('pageerror', (e) => errs.push(String(e))); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await p.evaluateOnNewDocument((v) => { if (!sessionStorage.getItem('x')) { localStorage.setItem('taupe-tycoon-save', v); sessionStorage.setItem('x', '1'); } }, seed);
  await p.goto(url, { waitUntil: 'load' });
  for (const tab of ['dig', 'rebirth', 'options']) {
    await p.click('#tab-' + tab);
    const r = await p.evaluate(() => {
      const lum = (c) => { const a = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2]; };
      const parse = (s) => (s.match(/[\d.]+/g) || []).map(Number);
      const bgOf = (el) => { for (let e = el; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c.length === 3 || (c.length === 4 && c[3] > 0.9)) return c.slice(0, 3); } return [255, 243, 214]; };
      const bad = [];
      document.querySelectorAll('body *').forEach((el) => {
        if (!el.offsetParent && el.tagName !== 'BODY') return;
        if (el.closest('svg') || el.closest('.sr-only') || el.closest('[hidden]')) return;
        const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
        if (!own) return;
        const cs = getComputedStyle(el);
        const fg = parse(cs.color).slice(0, 3); const bg = bgOf(el);
        const l1 = lum(fg), l2 = lum(bg); const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
        const size = parseFloat(cs.fontSize), bold = +cs.fontWeight >= 700;
        const need = size >= 24 || (size >= 18.66 && bold) ? 3 : 4.5;
        if (ratio < need) bad.push(`${el.className.toString().slice(0, 20)}|${el.textContent.trim().slice(0, 18)} ${ratio.toFixed(2)}<${need}`);
        if (size < 12) bad.push('texte < 12px ' + el.textContent.trim().slice(0, 18));
      });
      const small = [...document.querySelectorAll('button,a,[role=tab]')].filter((e) => e.offsetParent && (e.getBoundingClientRect().height < 43.5 || e.getBoundingClientRect().width < 43.5)).map((e) => e.id || e.textContent.trim().slice(0, 12));
      return { bad, small, ov: document.documentElement.scrollWidth - innerWidth };
    });
    if (r.bad.length) ko(`${w} ${tab} contraste/texte : ${r.bad.join(' ; ')}`);
    if (r.small.length) ko(`${w} ${tab} cibles < 44 : ${r.small}`);
    if (r.ov > 0) ko(`${w} ${tab} débordement ${r.ov}`);
  }
  // clavier : Tab parcourt, focus visible (outline) sur chaque arrêt
  await p.click('#tab-dig'); await p.evaluate(() => document.activeElement.blur());
  const stops = [];
  for (let i = 0; i < 40; i++) {
    await p.keyboard.press('Tab');
    const st = await p.evaluate(() => { const e = document.activeElement; if (!e || e === document.body) return null; const cs = getComputedStyle(e); const r = e.getBoundingClientRect(); return { id: e.id || e.textContent.trim().slice(0, 14), outline: cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2, vis: r.width > 0 && r.bottom > 0 && r.top < innerHeight }; });
    if (!st) break;
    stops.push(st.id);
    if (!st.outline) ko(`${w} focus sans contour : ${st.id}`);
  }
  if (new Set(stops).size < 10) ko(`${w} parcours clavier trop court : ${stops.length}`);
  // Entrée sur la taupe creuse ; flèches changent d'onglet
  await p.focus('#mole'); await p.$eval('#mole', (e) => e.classList.remove('hit'));
  await p.keyboard.press('Enter');
  if (!(await p.$eval('#mole', (e) => e.classList.contains('hit')))) ko(`${w} clavier : la taupe ne creuse pas`);
  await p.focus('#tab-dig'); await p.keyboard.press('ArrowRight');
  const sel = await p.$eval('#tab-rebirth', (e) => e.getAttribute('aria-selected'));
  if (sel !== 'true') ko(`${w} flèche droite sans effet`);
  // reduced motion : aucune animation de CSS active
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.click('#tab-dig'); await p.click('#mole');
  const anim = await p.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running').length);
  if (anim > 0) ko(`${w} reduced-motion : ${anim} animations actives`);
  if (errs.length) ko(`${w} erreurs : ${errs.join(' | ')}`);
  console.log(w, h, 'ok', stops.length, 'arrêts clavier');
  await p.close();
}
b.disconnect();
process.exit(bad ? 1 : 0);
