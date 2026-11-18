import './style.css';
import { GENS, PERMS, PERM_CLICK_BONUS, PERM_PROD_BONUS, SHOVEL_BASE, SHOVEL_POWER, GEM_DIV, PROD_EXP } from './config';
import { CHIPS, ICONS, MOLE, SCENE, icon } from './art';
import { fmt, fmtDuration, fmtPct } from './format';
import { Lang, setLang, t } from './i18n';
import { Options, defaultLang, load, save, wipe } from './save';
import * as sfx from './sound';
import { VERSION } from './version';
import {
  State, applyOffline, buyN, buyPerm, click, clickPower, costOf, gemMult, genProd, maxAffordable, newState,
  perSecond, permCost, prodMult, rebirth, rebirthAdvised, rebirthGain, startDirt, tick,
} from './sim';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const loaded = load();
let s: State = loaded?.s ?? newState();
const opts: Options = loaded?.opts ?? { lang: defaultLang(), reduced: false, mode: 1, sound: true, seen: 0 };
sfx.setEnabled(opts.sound);
const lang = () => opts.lang;
const f = (n: number) => fmt(n, lang());
const reducedMotion = () => opts.reduced || window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- assets ----------
$('scene').innerHTML = SCENE;
$('mole-svg').innerHTML = MOLE;
$('ico-dirt').innerHTML = icon('dirt', 'h-8 w-8');
$('ico-gem').innerHTML = icon('gem', 'h-6 w-6');
document.querySelectorAll<HTMLElement>('[data-ico]').forEach((el) => { el.innerHTML = icon(el.dataset.ico!, 'h-6 w-6'); });
$('ver').textContent = `v${VERSION}`;

// ---------- lignes ----------
interface Row { el: HTMLButtonElement; tile: HTMLElement; name: HTMLElement; lv: HTMLElement; desc: HTMLElement; stat: HTMLElement; cost: HTMLElement; kind: number; id: string }
const rows: Row[] = [];
const permRows: Row[] = [];

function mkRow(id: string, kind: number): Row {
  const li = document.createElement('li');
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'row';
  el.innerHTML = `<span class="tile"></span><span class="min-w-0"><span class="block text-lg font-bold leading-tight"><span class="name"></span><span class="lv"></span></span><span class="desc block text-sm leading-tight"></span><span class="stat"></span></span><span class="cost"></span>`;
  li.append(el);
  const q = (c: string) => el.querySelector<HTMLElement>('.' + c)!;
  return { el, tile: q('tile'), name: q('name'), lv: q('lv'), desc: q('desc'), stat: q('stat'), cost: q('cost'), kind, id };
}
const rowsUl = $('rows');
const permsUl = $('perms');
const ids = ['shovel', ...GENS.map((g) => g.id)];
ids.forEach((id, i) => {
  const r = mkRow(id, i - 1);
  r.el.addEventListener('click', () => {
    if (r.el.getAttribute('aria-disabled') === 'true') { sfx.deny(); return; }
    const n = buyN(s, r.kind, opts.mode);
    if (n > 0) {
      const lvl = r.kind < 0 ? s.shovel : s.gens[r.kind];
      say(t('bought', { name: t(id), n: lvl }));
      bought(r);
    }
  });
  rows.push(r);
  rowsUl.append(r.el.parentElement!);
});
PERMS.forEach((p, i) => {
  const r = mkRow(p.id, i);
  r.el.addEventListener('click', () => {
    if (r.el.getAttribute('aria-disabled') === 'true') { sfx.deny(); return; }
    if (buyPerm(s, i)) { say(t('bought', { name: t(p.id), n: s.perms[i] })); bought(r); }
  });
  permRows.push(r);
  permsUl.append(r.el.parentElement!);
});

function bought(r: Row) {
  sfx.buy();
  r.el.classList.remove('flash'); void r.el.offsetWidth; r.el.classList.add('flash');
  mood('happy', 800);
  render();
}

// ---------- affichage ----------
const live = $('live');
let liveTimer = 0;
function say(msg: string) {
  window.clearTimeout(liveTimer);
  live.textContent = '';
  liveTimer = window.setTimeout(() => { live.textContent = msg; }, 60);
}
const toastEl = $('toast');
let toastTimer = 0;
function toast(msg: string) {
  window.clearTimeout(toastTimer);
  toastEl.hidden = true; void toastEl.offsetWidth;
  toastEl.textContent = msg; toastEl.hidden = false;
  toastTimer = window.setTimeout(() => { toastEl.hidden = true; }, 2400);
}
const notify = (msg: string) => { say(msg); toast(msg); };

function setText(el: HTMLElement, v: string) { if (el.textContent !== v) el.textContent = v; }
function setHtml(el: HTMLElement, v: string) { if (el.dataset.h !== v) { el.dataset.h = v; el.innerHTML = v; } }
function setDisabled(el: HTMLElement, off: boolean) { el.setAttribute('aria-disabled', off ? 'true' : 'false'); }

const depthOf = () => (s.gens[4] > 0 || s.gens[5] > 0 ? 2 : s.gens[2] > 0 || s.gens[3] > 0 ? 1 : 0);
const revealed = (i: number) => s.gens[i] > 0 || s.lifeTotal >= GENS[i].cost * 0.4;
const bonusPct = (lvl: number, per: number) => fmtPct(per * 100 * lvl, lang());

/** Progression vers la prochaine gemme, en pourcentage entier. */
function goal() {
  const g = rebirthGain(s);
  const from = g * g * GEM_DIV, to = (g + 1) * (g + 1) * GEM_DIV;
  return { pct: Math.max(0, Math.min(100, Math.floor(((s.runTotal - from) / (to - from)) * 100))), first: s.rebirths === 0 && g < 1 };
}

let ownedKey = '';
let ownedPrev: number[] = [];
function renderOwned() {
  const key = s.gens.join(',') + lang();
  if (key === ownedKey) return;
  ownedKey = key;
  const ul = $('owned');
  ul.innerHTML = '';
  GENS.forEach((g, i) => {
    if (s.gens[i] < 1) return;
    const li = document.createElement('li');
    li.style.setProperty('--i', String(i));
    li.setAttribute('aria-label', t('owned', { name: t(g.id), n: f(s.gens[i]) }));
    li.innerHTML = `${icon(g.id, 'h-8 w-8')}<span class="n" aria-hidden="true">${f(s.gens[i])}</span>`;
    if ((ownedPrev[i] ?? 0) < s.gens[i] && ownedPrev.length) li.classList.add('pop');
    ul.append(li);
  });
  ownedPrev = s.gens.slice();
}

let hintTimer = 0;
function hintKey(): string | null {
  const any = s.shovel + s.gens.reduce((a, b) => a + b, 0) + s.rebirths > 0;
  if (rebirthGain(s) >= 1 && s.rebirths === 0 && !(opts.seen & 2)) return 'hintRebirth';
  if (!any) return s.clicks < 3 || s.dirt < SHOVEL_BASE ? 'hintDig' : 'hintBuy';
  if (!(opts.seen & 1) && s.gens.some((g) => g > 0)) {
    if (!hintTimer) hintTimer = window.setTimeout(() => { opts.seen |= 1; }, 6000);
    return 'hintAuto';
  }
  return null;
}

function render() {
  const L = lang();
  document.documentElement.lang = L;
  setText($('hud-dirt'), f(s.dirt));
  setText($('hud-ps'), f(perSecond(s)));
  setText($('hud-gems'), f(s.gems));
  const power = clickPower(s);
  $('mole').setAttribute('aria-label', t('digLabel', { n: f(power) }));
  const st = $('stage');
  const d = depthOf();
  if (!st.classList.contains('depth-' + d)) st.className = st.className.replace(/depth-\d/, 'depth-' + d);
  const gl = goal();
  $('goal').setAttribute('aria-valuenow', String(gl.pct));
  $('goal-fill').style.width = gl.pct + '%';
  setText($('goal-l'), `${gl.pct} %`);
  $('goal').setAttribute('aria-label', t(gl.first ? 'goalFirst' : 'goalNext'));
  let hot = false;
  rows.forEach((r, i) => {
    const level = r.kind < 0 ? s.shovel : s.gens[r.kind];
    const base = r.kind < 0 ? SHOVEL_BASE : GENS[r.kind].cost;
    const locked = r.kind >= 0 && !revealed(r.kind);
    const n = opts.mode === 'max' ? Math.max(1, maxAffordable(base, level, s.dirt)) : opts.mode;
    const cost = costOf(base, level, n);
    r.el.classList.toggle('is-locked', locked);
    setHtml(r.tile, icon(locked ? 'lock' : ids[i], 'h-11 w-11'));
    setText(r.name, locked ? t('locked') : t(ids[i]));
    setText(r.lv, locked ? '' : `${t('level')} ${f(level)}${n > 1 ? ` +${f(n)}` : ''}`);
    r.lv.hidden = locked;
    if (locked) {
      setText(r.desc, t('lockedD', { n: f(Math.ceil(GENS[r.kind].cost * 0.4)) }));
      setText(r.stat, '');
    } else if (r.kind < 0) {
      setText(r.desc, t('shovelD'));
      setText(r.stat, `${t('gain')} : +${f(SHOVEL_POWER * n * gemMult(s) * (1 + PERM_CLICK_BONUS * s.perms[1]))} ${t('per')}`);
    } else {
      const gain = GENS[r.kind].prod * (Math.pow(level + n, PROD_EXP) - Math.pow(level, PROD_EXP)) * prodMult(s);
      setText(r.desc, t(ids[i] + 'D'));
      setText(r.stat, `${t('gain')} : +${f(gain)}${t('secShort')} · ${f(genProd(s, r.kind))}${t('secShort')}`);
    }
    setHtml(r.cost, `${icon('dirt', 'h-5 w-5')}<span class="sr-only">${t('cost')} </span>${f(Math.ceil(cost))}`);
    setDisabled(r.el, locked || s.dirt < cost);
    const wantHot = !hot && hintKey() === 'hintBuy' && !locked && s.dirt >= cost;
    if (wantHot) hot = true;
    r.el.classList.toggle('hot', wantHot && !reducedMotion());
  });
  const gain = rebirthGain(s);
  setText($('rb-gain'), f(gain));
  setText($('rb-mult'), fmtPct(100 * (prodMult(s) - 1), L));
  setText($('rb-count'), f(s.rebirths));
  setText($('rb-time'), fmtDuration(s.runTime, L));
  const msg = gain < 1 ? t('rebirthNeed', { n: f(GEM_DIV) }) : rebirthAdvised(s) ? t('rebirthAdvised') : t('rebirthWait');
  setText($('rb-msg'), msg);
  setDisabled($('rb-go'), gain < 1);
  $('rb-dot').hidden = !(rebirthAdvised(s) && !($('tab-rebirth').getAttribute('aria-selected') === 'true'));
  PERMS.forEach((p, i) => {
    const r = permRows[i];
    const lvl = s.perms[i];
    const maxed = lvl >= p.max;
    const extra = p.id === 'lunettes' ? bonusPct(lvl, PERM_PROD_BONUS) : p.id === 'pelleor' ? bonusPct(lvl, PERM_CLICK_BONUS)
      : p.id === 'pecule' ? `${f(startDirt(s))}` : p.id === 'sacoche' ? `+${f(lvl)} h` : '';
    setHtml(r.tile, icon(p.id, 'h-11 w-11'));
    setText(r.name, t(p.id));
    setText(r.lv, `${t('level')} ${f(lvl)}`);
    setText(r.desc, t(p.id + 'D'));
    setText(r.stat, extra);
    setHtml(r.cost, maxed ? t('maxed') : `${icon('gem', 'h-5 w-5')}<span class="sr-only">${t('cost')} </span>${f(permCost(s, i))}`);
    setDisabled(r.el, maxed || s.gems < permCost(s, i));
  });
  renderOwned();
  const hk = hintKey();
  const hint = $('hint');
  if (hk) { setText(hint, t(hk)); hint.hidden = false; } else hint.hidden = true;
  $('opt-lang').textContent = `${t('lang')} : ${L === 'fr' ? 'Français' : 'English'}`;
  $('opt-motion').textContent = `${t('reduced')} : ${t(opts.reduced ? 'on' : 'off')}`;
  $('opt-motion').setAttribute('aria-pressed', String(opts.reduced));
  $('opt-sound').textContent = `${t('sound')} : ${t(opts.sound ? 'on' : 'off')}`;
  $('opt-sound').setAttribute('aria-pressed', String(opts.sound));
  const snd = $('snd');
  setHtml(snd, icon(opts.sound ? 'soundOn' : 'soundOff', 'h-7 w-7'));
  snd.setAttribute('aria-pressed', String(opts.sound));
  snd.setAttribute('aria-label', t('toggleSound'));
  document.documentElement.classList.toggle('reduced', opts.reduced);
  document.querySelectorAll<HTMLElement>('[data-mode]').forEach((b) =>
    b.setAttribute('aria-pressed', String(String(opts.mode) === b.dataset.mode)));
}

function i18nStatic() {
  setLang(opts.lang);
  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n!); });
  document.title = t('title');
  document.querySelector('.stage')?.setAttribute('aria-label', t('stage'));
  ownedKey = '';
}

// ---------- taupe : humeurs et effets ----------
const mole = $('mole');
const fx = $('fx');
let moodTimer = 0;
type Mood = 'idle' | 'dig' | 'happy' | 'rebirth';
function mood(m: Mood, ms: number) {
  const cur = mole.dataset.mood;
  if (m === 'dig' && (cur === 'happy' || cur === 'rebirth')) return;
  window.clearTimeout(moodTimer);
  mole.dataset.mood = m;
  moodTimer = window.setTimeout(() => { mole.dataset.mood = 'idle'; }, ms);
}
const rnd = (a: number, b: number) => a + Math.random() * (b - a);

function burst(power: number, x: number, y: number) {
  if (reducedMotion()) return;
  while (fx.children.length > 40) fx.firstElementChild!.remove();
  const tag = document.createElement('span');
  tag.className = 'fx';
  tag.textContent = '+' + f(power);
  tag.style.left = `${x}px`; tag.style.top = `${y - 10}px`;
  fx.append(tag);
  tag.addEventListener('animationend', () => tag.remove());
  const ring = document.createElement('span');
  ring.className = 'ring'; ring.style.left = `${x}px`; ring.style.top = `${y}px`;
  fx.append(ring);
  ring.addEventListener('animationend', () => ring.remove());
  const depth = depthOf();
  for (let i = 0; i < 5; i++) {
    const c = document.createElement('span');
    c.className = 'chip-dirt';
    const pool = depth >= 2 && Math.random() < 0.25 ? 3 : depth >= 1 && Math.random() < 0.25 ? 2 : Math.floor(rnd(0, 2));
    c.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${CHIPS[pool]}</svg>`;
    c.style.left = `${x}px`; c.style.top = `${y}px`;
    c.style.setProperty('--dx', `${rnd(-70, 70)}px`);
    c.style.setProperty('--dy', `${rnd(-110, -40)}px`);
    c.style.setProperty('--rot', `${rnd(-200, 200)}deg`);
    fx.append(c);
    c.addEventListener('animationend', () => c.remove());
  }
}

let combo = 0, lastDigAt = 0, cheerAt = 0;
let skipClick = false;
function dig(e: PointerEvent | MouseEvent | KeyboardEvent) {
  const p = click(s);
  const now = performance.now();
  combo = now - lastDigAt < 450 ? combo + 1 : 0;
  lastDigAt = now;
  sfx.dig(combo);
  const box = fx.getBoundingClientRect();
  const hasPos = 'clientX' in e && (e.clientX || e.clientY);
  const x = hasPos ? (e as MouseEvent).clientX - box.left : box.width / 2;
  const y = hasPos ? (e as MouseEvent).clientY - box.top : box.height * 0.6;
  burst(p, x, y);
  mood('dig', 260);
  mole.classList.remove('hit');
  void mole.offsetWidth;
  mole.classList.add('hit');
  if (s.clicks % 50 === 0 && now - cheerAt > 2000) { cheerAt = now; mood('happy', 800); }
  setText($('hud-dirt'), f(s.dirt));
}
mole.addEventListener('pointerdown', (e) => { if (e.button === 0 || e.pointerType !== 'mouse') { skipClick = true; dig(e); } });
mole.addEventListener('click', (e) => { if (skipClick) { skipClick = false; return; } dig(e); });

function rebirthFx() {
  mood('rebirth', 1100);
  if (reducedMotion()) return;
  const box = $('rb-fx');
  box.innerHTML = '<span class="wave"></span>';
  for (let i = 0; i < 16; i++) {
    const sh = document.createElement('span');
    sh.className = 'shard';
    const a = (i / 16) * Math.PI * 2;
    const r = rnd(110, 220);
    sh.style.setProperty('--dx', `${Math.cos(a) * r}px`);
    sh.style.setProperty('--dy', `${Math.sin(a) * r * 0.8}px`);
    sh.style.setProperty('--rot', `${rnd(-300, 300)}deg`);
    sh.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${CHIPS[3]}</svg>`;
    box.append(sh);
  }
  box.hidden = false;
  window.setTimeout(() => { box.hidden = true; box.innerHTML = ''; }, 1400);
}

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
    if (on && n === 'rebirth') opts.seen |= 2;
  });
}
tabs.forEach((n, i) => {
  $('tab-' + n).addEventListener('click', () => { sfx.tab(); selectTab(n); render(); });
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
twoTap($('rb-go'), 'rebirthConfirm', () => { const g = rebirth(s); if (g > 0) { save(s, opts); sfx.rebirth(); rebirthFx(); notify(t('rebirthDone', { n: g })); selectTab('dig'); } });
twoTap($('opt-reset'), 'resetConfirm', () => { wipe(); s = newState(); say(t('resetDone')); save(s, opts); });
$('opt-lang').addEventListener('click', () => { opts.lang = lang() === 'fr' ? 'en' : 'fr'; i18nStatic(); render(); });
const toggleSound = () => { opts.sound = !opts.sound; sfx.setEnabled(opts.sound); if (opts.sound) sfx.buy(); save(s, opts); render(); };
$('opt-sound').addEventListener('click', toggleSound);
$('snd').addEventListener('click', toggleSound);
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
    if (gain > 0) notify(t('offline', { t: fmtDuration(seconds, lang()), n: f(gain) }));
  }
}
i18nStatic();
render();
