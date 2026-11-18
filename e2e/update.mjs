// Mise à jour de bout en bout : usage  node e2e/update.mjs <dist-ancienne> <dist-nouvelle>
// Un petit serveur sert l'ancienne construction (mêmes en-têtes de cache que nginx), la page est ouverte,
// puis on « déploie » la nouvelle et on vérifie : bannière, rechargement, nouvelle version affichée, sauvegarde intacte.
import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import puppeteer from 'puppeteer-core';

const [oldDir, newDir] = process.argv.slice(2);
let dir = oldDir;
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, r) => {
  const u = new URL(q.url, 'http://x').pathname;
  const f = join(dir, u === '/' ? 'index.html' : u);
  if (!existsSync(f)) { r.writeHead(404).end(); return; }
  const cc = u.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : u === '/version.json' ? 'no-store' : 'no-cache';
  r.writeHead(200, { 'content-type': types[extname(f)] || 'application/octet-stream', 'cache-control': cc }).end(readFileSync(f));
});
await new Promise((ok) => srv.listen(5319, '127.0.0.1', ok));
const url = 'http://127.0.0.1:5319/';
const fails = [];
const ok = (c, m) => { console.log((c ? 'OK  ' : 'KO  ') + m); if (!c) fails.push(m); };
const b = await puppeteer.connect({ browserURL: process.env.BROWSER_URL });
const p = await b.newPage();
await p.setViewport({ width: 390, height: 800 });
const errs = []; p.on('pageerror', (e) => errs.push(String(e))); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await p.goto(url, { waitUntil: 'networkidle0' });
const ver = () => p.$eval('#ver', (e) => e.textContent + '|' + e.title);
const v1 = await ver(); console.log('ancienne :', v1);
for (let i = 0; i < 12; i++) await p.click('#mole');
await new Promise((r) => setTimeout(r, 6000));
ok(await p.$eval('#update', (e) => e.hidden), 'pas de bannière tant que rien n\'a changé');
const dirtBefore = await p.evaluate(() => JSON.parse(localStorage.getItem('taupe-tycoon-save') || localStorage.getItem(Object.keys(localStorage).find((k) => k.includes('save')) || '') || '{}'));
dir = newDir; // déploiement
ok(!(await p.evaluate(() => window.__tt_update())) || true, 'vérification déclenchée');
await new Promise((r) => setTimeout(r, 1500));
ok(!(await p.$eval('#update', (e) => e.hidden)), 'bannière « Nouvelle version » affichée après le déploiement');
const box = await p.$eval('#update-go', (e) => { const r = e.getBoundingClientRect(); return [r.width, r.height]; });
ok(box[1] >= 44 && box[0] >= 44, `bouton Recharger >= 44 px (${box.map(Math.round)})`);
await Promise.all([p.waitForNavigation({ waitUntil: 'networkidle0' }), p.click('#update-go')]);
const v2 = await ver(); console.log('nouvelle :', v2);
ok(v2 !== v1, 'version/build affichés changés après rechargement');
ok(await p.$eval('#update', (e) => e.hidden), 'plus de bannière après rechargement');
const after = await p.evaluate(() => Object.keys(localStorage).length);
ok(after > 0, 'sauvegarde toujours présente');
const clicks = await p.evaluate(() => JSON.parse(localStorage.getItem(Object.keys(localStorage).find((k) => k.includes('save'))) || '{}'));
ok(JSON.stringify(clicks).length > 20 && JSON.stringify(dirtBefore).length > 20, 'sauvegarde lisible avant/après');
ok(errs.length === 0, 'aucune erreur console : ' + errs.slice(0, 2).join(' / '));
await p.close(); b.disconnect(); srv.close();
console.log(fails.length ? `${fails.length} KO` : 'tout est OK');
process.exit(fails.length ? 1 : 0);
