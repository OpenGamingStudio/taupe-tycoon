import './style.css';
import { GENS, PERMS, PERM_CLICK_BONUS, PERM_PROD_BONUS, SHOVEL_BASE, GEM_DIV } from './config';
import { fmt, fmtDuration } from './format';
import { Lang, setLang, t } from './i18n';
import { Options, defaultLang, load, save, wipe } from './save';
import {
  State, applyOffline, buyN, buyPerm, click, clickPower, costOf, gemMult, genProd, maxAffordable, newState,
  perSecond, permCost, rebirth, rebirthAdvised, rebirthGain, tick,
} from './sim';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const loaded = load();
let s: State = loaded?.s ?? newState();
const opts: Options = loaded?.opts ?? { lang: defaultLang(), reduced: false, mode: 1 };
const lang = () => opts.lang;
const f = (n: number) => fmt(n, lang());

// ---------- icônes ----------
const ICONS: Record<string, string> = {
  shovel: '<path d="M6 21L15 6" stroke="#2b1d14" stroke-width="3" stroke-linecap="round"/><path d="M13 3l8 5-3 4-8-5z" fill="#b8c4cc" stroke="#2b1d14" stroke-width="2.5" stroke-linejoin="round"/>',
  apprentie: '<circle cx="12" cy="13" r="8" fill="#7a5a44" stroke="#2b1d14" stroke-width="2.5"/><circle cx="9" cy="11" r="3" fill="#fff" stroke="#2b1d14" stroke-width="2"/><circle cx="15" cy="11" r="3" fill="#fff" stroke="#2b1d14" stroke-width="2"/>',
  taupiniere: '<path d="M2 21c1-10 6-14 10-14s9 4 10 14z" fill="#8a5a2b" stroke="#2b1d14" stroke-width="2.5" stroke-linejoin="round"/><circle cx="12" cy="15" r="3" fill="#2b1d14"/>',
  foreuse: '<path d="M4 7h10l6 5-6 5H4z" fill="#ff7aa8" stroke="#2b1d14" stroke-width="2.5" stroke-linejoin="round"/><path d="M6 20h12" stroke="#2b1d14" stroke-width="3" stroke-linecap="round"/>',
  machine: '<rect x="3" y="6" width="18" height="11" rx="2" fill="#ffc21a" stroke="#2b1d14" stroke-width="2.5"/><circle cx="8" cy="19" r="2.5" fill="#2b1d14"/><circle cx="16" cy="19" r="2.5" fill="#2b1d14"/>',
  mine: '<path d="M3 21V9l9-6 9 6v12z" fill="#b8793e" stroke="#2b1d14" stroke-width="2.5" stroke-linejoin="round"/><path d="M9 21v-7h6v7" fill="#2b1d14"/>',
  excavatrice: '<path d="M12 2l8 7-8 13L4 9z" fill="#20c5c0" stroke="#2b1d14" stroke-width="2.5" stroke-linejoin="round"/>',
  lunettes: '<circle cx="7" cy="13" r="5" fill="#ffc21a" fill-opacity=".6" stroke="#2b1d14" stroke-width="2.5"/><circle cx="17" cy="13" r="5" fill="#ffc21a" fill-opacity=".6" stroke="#2b1d14" stroke-width="2.5"/><path d="M12 12h0" stroke="#2b1d14" stroke-width="2.5"/>',
  pelleor: '<path d="M6 21L15 6" stroke="#2b1d14" stroke-width="3" stroke-linecap="round"/><path d="M13 3l8 5-3 4-8-5z" fill="#ffc21a" stroke="#2b1d14" stroke-width="2.5" stroke-linejoin="round"/>',
  pecule: '<ellipse cx="12" cy="13" rx="8" ry="9" fill="#fff3d6" stroke="#2b1d14" stroke-width="2.5"/><path d="M8 14l3-4 5 5" stroke="#2b1d14" stroke-width="2" fill="none"/>',
  sacoche: '<path d="M5 9h14l2 12H3z" fill="#4cc15a" stroke="#2b1d14" stroke-width="2.5" stroke-linejoin="round"/><path d="M8 9a4 4 0 018 0" fill="none" stroke="#2b1d14" stroke-width="2.5"/>',
};
const icon = (id: string) => `<svg class="h-9 w-9 shrink-0" viewBox="0 0 24 24" aria-hidden="true">${ICONS[id] ?? ''}</svg>`;

// ---------- lignes ----------
interface Row { el: HTMLButtonElement; name: HTMLElement; desc: HTMLElement; cost: HTMLElement; kind: number }
const rows: Row[] = [];
const permRows: Row[] = [];

function mkRow(ico: string, kind: number): Row {
  const li = document.createElement('li');
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'row';
  el.innerHTML = `${icon(ico)}<span class="min-w-0"><span class="name block text-lg font-bold leading-tight"></span><span class="desc block text-sm leading-tight"></span></span><span class="cost whitespace-nowrap"></span>`;
  li.append(el);
  return { el, name: el.querySelector('.name')!, desc: el.querySelector('.desc')!, cost: el.querySelector('.cost')!, kind };
}
const rowsUl = $('rows');
const permsUl = $('perms');
const ids = ['shovel', ...GENS.map((g) => g.id)];
ids.forEach((id, i) => {
  const r = mkRow(id, i - 1);
  r.el.addEventListener('click', () => {
    if (r.el.getAttribute('aria-disabled') === 'true') return;
    const n = buyN(s, r.kind, opts.mode);
    if (n > 0) {
      const lvl = r.kind < 0 ? s.shovel : s.gens[r.kind];
      say(t('bought', { name: t(id), n: lvl }));
      render();
    }
  });
  rows.push(r);
  rowsUl.append(r.el.parentElement!);
});
PERMS.forEach((p, i) => {
  const r = mkRow(p.id, i);
  r.el.addEventListener('click', () => {
    if (r.el.getAttribute('aria-disabled') === 'true') return;
    if (buyPerm(s, i)) { say(t('bought', { name: t(p.id), n: s.perms[i] })); render(); }
  });
  permRows.push(r);
  permsUl.append(r.el.parentElement!);
});

// ---------- affichage ----------
const live = $('live');
let liveTimer = 0;
function say(msg: string) {
  window.clearTimeout(liveTimer);
  live.textContent = '';
  liveTimer = window.setTimeout(() => { live.textContent = msg; }, 60);
}

function setText(el: HTMLElement, v: string) { if (el.textContent !== v) el.textContent = v; }
function setDisabled(el: HTMLElement, off: boolean) { el.setAttribute('aria-disabled', off ? 'true' : 'false'); }
const mult = () => gemMult(s);

function render() {
  const L = lang();
  document.documentElement.lang = L;
  setText($('hud-dirt'), f(s.dirt));
  setText($('hud-ps'), f(perSecond(s)));
  setText($('hud-gems'), f(s.gems));
  const power = clickPower(s);
  $('mole').setAttribute('aria-label', t('digLabel', { n: f(power) }));
  rows.forEach((r, i) => {
    const level = r.kind < 0 ? s.shovel : s.gens[r.kind];
    const base = r.kind < 0 ? SHOVEL_BASE : GENS[r.kind].cost;
    const n = opts.mode === 'max' ? Math.max(1, maxAffordable(base, level, s.dirt)) : opts.mode;
    const cost = costOf(base, level, n);
    setText(r.name, t(ids[i]));
    const lv = `${t('level')} ${level}${n > 1 ? ` (+${n})` : ''} · `;
    const d = lv + (r.kind < 0 ? `${t('shovelD')} · ${f(power)} ${t('each')}` : `${t(ids[i] + 'D')} · ${f(genProd(s, r.kind))}/s`);
    setText(r.desc, d);
    setText(r.cost, f(Math.ceil(cost)));
    setDisabled(r.el, s.dirt < cost);
  });
  const gain = rebirthGain(s);
  setText($('rb-gain'), f(gain));
  setText($('rb-mult'), `×${f(mult() * (1 + PERM_PROD_BONUS * s.perms[0]))}`);
  setText($('rb-count'), f(s.rebirths));
  setText($('rb-time'), fmtDuration(s.runTime, L));
  const msg = gain < 1 ? t('rebirthNeed', { n: f(GEM_DIV) }) : rebirthAdvised(s) ? t('rebirthAdvised') : t('rebirthWait');
  setText($('rb-msg'), msg);
  setDisabled($('rb-go'), gain < 1);
  PERMS.forEach((p, i) => {
    const r = permRows[i];
    const lvl = s.perms[i];
    const maxed = lvl >= p.max;
    const bonus = p.id === 'lunettes' ? ` · +${PERM_PROD_BONUS * lvl * 100}%` : p.id === 'pelleor' ? ` · +${PERM_CLICK_BONUS * lvl * 100}%` : '';
    setText(r.name, t(p.id));
    setText(r.desc, `${t('level')} ${lvl} · ${t(p.id + 'D')}${bonus}`);
    setText(r.cost, maxed ? t('maxed') : t('gemCost', { n: f(permCost(s, i)) }));
    setDisabled(r.el, maxed || s.gems < permCost(s, i));
  });
  $('opt-lang').textContent = `${t('lang')} : ${L === 'fr' ? 'Français' : 'English'}`;
  $('opt-motion').textContent = `${t('reduced')} : ${t(opts.reduced ? 'on' : 'off')}`;
  $('opt-motion').setAttribute('aria-pressed', String(opts.reduced));
  document.documentElement.classList.toggle('reduced', opts.reduced);
  document.querySelectorAll<HTMLElement>('[data-mode]').forEach((b) =>
    b.setAttribute('aria-pressed', String(String(opts.mode) === b.dataset.mode)));
}

function i18nStatic() {
  setLang(opts.lang);
  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n!); });
  document.title = t('title');
  document.querySelector('.stage')?.setAttribute('aria-label', t('stage'));
}

// ---------- creuser ----------
const mole = $('mole');
const fx = $('fx');
function burst(power: number, x: number, y: number) {
  if (opts.reduced || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  while (fx.children.length > 24) fx.firstElementChild!.remove();
  const tag = document.createElement('span');
  tag.className = 'fx';
  tag.textContent = '+' + f(power);
  tag.style.left = `${x}px`; tag.style.top = `${y}px`;
  fx.append(tag);
  tag.addEventListener('animationend', () => tag.remove());
  const colors = ['#8a5a2b', '#8a5a2b', '#b8793e', '#ffc21a', '#20c5c0'];
  for (let i = 0; i < 4; i++) {
    const c = document.createElement('span');
    c.className = 'chip-dirt';
    c.style.background = colors[Math.floor(Math.random() * colors.length)];
    c.style.left = `${x}px`; c.style.top = `${y}px`;
    c.style.setProperty('--dx', `${(Math.random() - 0.5) * 120}px`);
    c.style.setProperty('--dy', `${-30 - Math.random() * 70}px`);
    fx.append(c);
    c.addEventListener('animationend', () => c.remove());
  }
}
let skipClick = false;
function dig(e: PointerEvent | MouseEvent | KeyboardEvent) {
  const p = click(s);
  const box = fx.getBoundingClientRect();
  const hasPos = 'clientX' in e && (e.clientX || e.clientY);
  const x = hasPos ? (e as MouseEvent).clientX - box.left : box.width / 2;
  const y = hasPos ? (e as MouseEvent).clientY - box.top : box.height / 2;
  burst(p, x, y);
  mole.classList.remove('hit');
  void mole.offsetWidth;
  mole.classList.add('hit');
  setText($('hud-dirt'), f(s.dirt));
}
mole.addEventListener('pointerdown', (e) => { if (e.button === 0 || e.pointerType !== 'mouse') { skipClick = true; dig(e); } });
mole.addEventListener('click', (e) => { if (skipClick) { skipClick = false; return; } dig(e); });

// ---------- onglets ----------
const tabs = ['dig', 'rebirth', 'options'];
function selectTab(name: string, focus = false) {
  tabs.forEach((n) => {
    const on = n === name;
    const tab = $('tab-' + n);
    tab.setAttribute('aria-selected', String(on));
    tab.tabIndex = on ? 0 : -1;
    $('p-' + n).hidden = !on;
    if (on && focus) tab.focus();
  });
}
tabs.forEach((n, i) => {
  $('tab-' + n).addEventListener('click', () => selectTab(n));
  $('tab-' + n).addEventListener('keydown', (e) => {
    const k = e.key;
    const to = k === 'ArrowRight' ? (i + 1) % 3 : k === 'ArrowLeft' ? (i + 2) % 3 : k === 'Home' ? 0 : k === 'End' ? 2 : -1;
    if (to >= 0) { e.preventDefault(); selectTab(tabs[to], true); }
  });
});

document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach((b) =>
  b.addEventListener('click', () => { opts.mode = b.dataset.mode === 'max' ? 'max' : (Number(b.dataset.mode) as 1 | 10); render(); }));

// ---------- rebirth, options ----------
function twoTap(btn: HTMLElement, key: string, action: () => void) {
  let armed = 0;
  btn.addEventListener('click', () => {
    if (btn.getAttribute('aria-disabled') === 'true') return;
    if (!armed) {
      btn.textContent = t(key);
      armed = window.setTimeout(() => { armed = 0; i18nStatic(); render(); }, 4000);
      return;
    }
    window.clearTimeout(armed); armed = 0;
    action();
    i18nStatic(); render();
  });
}
twoTap($('rb-go'), 'rebirthConfirm', () => { const g = rebirth(s); if (g > 0) { save(s, opts); say(t('rebirthDone', { n: g })); selectTab('dig'); } });
twoTap($('opt-reset'), 'resetConfirm', () => { wipe(); s = newState(); say(t('resetDone')); save(s, opts); });
$('opt-lang').addEventListener('click', () => { opts.lang = lang() === 'fr' ? 'en' : 'fr'; i18nStatic(); render(); });
$('opt-motion').addEventListener('click', () => { opts.reduced = !opts.reduced; render(); });

// ---------- boucle, sauvegarde, hors-ligne ----------
let last = performance.now();
let acc = 0;
window.setInterval(() => {
  const now = performance.now();
  const dt = Math.min((now - last) / 1000, 1);
  last = now;
  tick(s, dt);
  acc += dt;
  if (acc >= 5) { acc = 0; save(s, opts); }
  render();
}, 100);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { save(s, opts); } else { last = performance.now(); }
});
window.addEventListener('pagehide', () => save(s, opts));

if (loaded) {
  const away = (Date.now() - loaded.at) / 1000;
  if (away > 60) {
    const { gain, seconds } = applyOffline(s, away);
    if (gain > 0) say(t('offline', { t: fmtDuration(seconds, lang()), n: f(gain) }));
  }
}
i18nStatic();
render();
