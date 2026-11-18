import './style.css';
import {
  GENS, MILESTONES, PERMS, PERM_CLICK_PS, PERM_PROD_BONUS, SHOVEL_BASE, GEM_DIV,
  NUGGET_MIN_DELAY, NUGGET_MAX_DELAY, NUGGET_LIFE, RUSH_TIME, GENIUS_TIME,
} from './config';
import { CHIPS, ICONS, MOLE, SCENE, icon } from './art';
import { fmt, fmtDuration, fmtPct } from './format';
import { Lang, setLang, t } from './i18n';
import { Options, PANELS, SAVE_KEY, defaultLang, exportText, importText, load, save, wipe } from './save';
import * as sfx from './sound';
import { VERSION } from './version';
import { BUILD, watch } from './update';
import { createWorld } from './world';
import { createFx } from './fx';
import { TROPHIES, TROPHY_COUNT, checkTrophies } from './trophies';
import {
  State, applyEvent, applyOffline, buyN, buyPerm, click, clickBase, clickPower, costOf, genProd, genProdAt, maxAffordable,
  milestoneMult, newState, nextMilestone, offlineCap, perSecond, permCost, prodMult, rebirth, rebirthAdvised, rebirthGain,
  rollEvent, startDirt, tick, trophyMult,
} from './sim';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const loaded = load();
let s: State = loaded?.s ?? newState();
const opts: Options = loaded?.opts ?? { lang: defaultLang(), reduced: false, mode: 1, sound: true, seen: 0, volume: 60, ambient: true, music: true, musicVolume: 35, panel: '' };
sfx.setEnabled(opts.sound);
sfx.setVolume(opts.volume);
sfx.setAmbient(opts.ambient);
sfx.setMusic(opts.music);
sfx.setMusicVolume(opts.musicVolume);
// Aucun son avant la première interaction : le contexte audio naît au premier geste.
for (const ev of ['pointerdown', 'keydown'] as const) document.addEventListener(ev, () => sfx.unlock(), { capture: true });
// Plusieurs onglets : le plus récent écrit, l'ancien arrête de sauvegarder (sinon il écraserait la partie).
let readOnly = false;
const persist = () => { if (!readOnly) save(s, opts); };
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
interface Row { el: HTMLButtonElement; tile: HTMLElement; name: HTMLElement; lv: HTMLElement; desc: HTMLElement; stat: HTMLElement; mile: HTMLElement; cost: HTMLElement; kind: number; id: string }
const rows: Row[] = [];
const permRows: Row[] = [];

function mkRow(id: string, kind: number): Row {
  const li = document.createElement('li');
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'row';
  el.innerHTML = `<span class="tile"></span><span class="min-w-0"><span class="block text-lg font-bold leading-tight"><span class="name"></span><span class="lv"></span></span><span class="desc block text-sm leading-tight"></span><span class="stat"></span><span class="mile"></span></span><span class="cost"></span>`;
  li.append(el);
  const q = (c: string) => el.querySelector<HTMLElement>('.' + c)!;
  return { el, tile: q('tile'), name: q('name'), lv: q('lv'), desc: q('desc'), stat: q('stat'), mile: q('mile'), cost: q('cost'), kind, id };
}
const rowsUl = $('rows');
const permsUl = $('perms');
const ids = ['shovel', ...GENS.map((g) => g.id)];
ids.forEach((id, i) => {
  const r = mkRow(id, i - 1);
  r.el.addEventListener('click', () => {
    if (r.el.getAttribute('aria-disabled') === 'true') { sfx.deny(); return; }
    const before = r.kind < 0 ? s.shovel : s.gens[r.kind];
    const n = buyN(s, r.kind, opts.mode);
    if (n > 0) {
      const lvl = r.kind < 0 ? s.shovel : s.gens[r.kind];
      say(t('bought', { name: t(id), n: lvl }));
      bought(r, false);
      if (milestoneMult(lvl) > milestoneMult(before)) milestoneHit(r, lvl);
      if (r.kind >= 0) sfx.moleArrive();
    }
  });
  rows.push(r);
  rowsUl.append(r.el.parentElement!);
});
PERMS.forEach((p, i) => {
  const r = mkRow(p.id, i);
  r.el.addEventListener('click', () => {
    if (r.el.getAttribute('aria-disabled') === 'true') { sfx.deny(); return; }
    if (buyPerm(s, i)) { say(t('bought', { name: t(p.id), n: s.perms[i] })); bought(r, true); }
  });
  permRows.push(r);
  permsUl.append(r.el.parentElement!);
});

/** Un palier de niveaux est franchi : fanfare et annonce. */
function milestoneHit(r: Row, level: number) {
  sfx.fanfare();
  const sub = t(r.kind < 0 ? 'mileSubShovel' : 'mileSub', { name: t(r.id), n: level, m: milestoneMult(level) });
  say(`${t('mileBanner')} ${sub}`);
  banner('gem', t('mileBanner'), sub);
  const b = fxBox(); jfx.confetti(b.width / 2, b.height * 0.35, 60); shake(2); vibe([30, 40, 60]);
}

function bought(r: Row, perm: boolean) {
  if (perm) sfx.upgrade(); else sfx.buy();
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

// ---------- décor vivant et petites taupes ----------
const stageFx = $('stage-fx');
let floatAt = 0, deliverSnd = 0;
/** Petit texte flottant « +N » dans la scène (DOM, une animation CSS par texte, nombre borné). */
function floater(x: number, y: number, text: string, cls: string) {
  if (reducedMotion() && cls === 'fx-s') return;
  while (stageFx.children.length > 24) stageFx.firstElementChild!.remove();
  const el = document.createElement('span');
  el.className = 'fx ' + cls;
  el.textContent = text;
  el.style.left = `${x}px`; el.style.top = `${y}px`;
  stageFx.append(el);
  el.addEventListener('animationend', () => el.remove());
}
const jfx = createFx($<HTMLCanvasElement>('fxc'));
const fxBox = () => $('fxc').getBoundingClientRect();
const centerOf = (id: string): [number, number] => { const b = $(id).getBoundingClientRect(), o = fxBox(); return [b.left - o.left + b.width / 2, b.top - o.top + b.height / 2]; };
const bump = (id: string) => { const el = $(id); el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); };
/** Pièces de terre/or qui filent vers le compteur : chaque arrivée fait sonner le compteur. */
let landAt = 0;
function coinsToHud(x: number, y: number, n: number, kind: 'dirt' | 'gold' | 'gem') {
  jfx.coins(x, y, n, kind, () => centerOf(kind === 'gem' ? 'ico-gem' : 'ico-dirt'), (i) => {
    const now = performance.now();
    bump(kind === 'gem' ? 'ico-gem' : 'hud');
    if (now - landAt > 70) { landAt = now; sfx.pickup(i); }
  });
}
let shakeT = 0;
function shake(level: 1 | 2 | 3) {
  if (reducedMotion()) return;
  const st = $('stage');
  st.classList.remove('shake1', 'shake2', 'shake3'); void st.offsetWidth; st.classList.add('shake' + level);
  window.clearTimeout(shakeT); shakeT = window.setTimeout(() => st.classList.remove('shake1', 'shake2', 'shake3'), 520);
}
let vibeAt = 0;
function vibe(ms: number | number[]) {
  if (reducedMotion() || !navigator.vibrate || !navigator.userActivation?.hasBeenActive) return;
  const now = performance.now();
  if (now - vibeAt < 60) return;
  vibeAt = now; navigator.vibrate(ms);
}
// bannières (file d'attente : une à la fois)
const bannerQ: { ico: string; t: string; s: string }[] = [];
let bannerOn = false;
function banner(ico: string, title: string, sub: string) {
  if (bannerQ.length > 3) bannerQ.shift();
  bannerQ.push({ ico, t: title, s: sub });
  if (!bannerOn) nextBanner();
}
function nextBanner() {
  const b = bannerQ.shift();
  const el = $('banner');
  if (!b) { bannerOn = false; el.hidden = true; return; }
  bannerOn = true;
  $('banner-ico').innerHTML = icon(b.ico, 'h-12 w-12');
  setText($('banner-t'), b.t); setText($('banner-s'), b.s);
  el.hidden = false; el.classList.remove('banner-in'); void el.offsetWidth; el.classList.add('banner-in');
  window.setTimeout(nextBanner, reducedMotion() ? 2200 : 2600);
}
const world = createWorld($<HTMLCanvasElement>('world'), {
  deliver(x, y, gain) {
    const now = performance.now();
    if (now - floatAt > 260) { floatAt = now; floater(x, y - 18, '+' + f(gain), 'fx-s'); }
    if (now - deliverSnd > 450) { deliverSnd = now; coinsToHud(x, y - 6, 1, 'gold'); }
  },
  arrive(x, y, n) {
    floater(x, y - 24, '+' + f(n), 'fx-n');
  },
});

// compteur de terre qui roule vers sa valeur (entiers seulement ; direct si mouvement réduit)
let shown = -1, rollRaf = 0, rollLast = 0;
function rollTo(v: number) {
  if (shown < 0 || reducedMotion() || Math.abs(v - shown) < 2) { shown = v; setText($('hud-dirt'), f(v)); return; }
  if (rollRaf) return;
  rollLast = performance.now();
  const step = (now: number) => {
    const dt = Math.min(0.1, (now - rollLast) / 1000); rollLast = now;
    const target = s.dirt, d = target - shown;
    shown = Math.abs(d) < 2 ? target : shown + d * Math.min(1, dt * 9) + Math.sign(d);
    shown = d > 0 ? Math.min(shown, target) : Math.max(shown, target);
    setText($('hud-dirt'), f(Math.floor(shown)));
    rollRaf = shown === target ? 0 : requestAnimationFrame(step);
  };
  rollRaf = requestAnimationFrame(step);
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
  const grew = ownedPrev.length > 0 && s.gens.some((n, i) => n > (ownedPrev[i] ?? 0));
  world.setCrew(s.gens, GENS.map((_, i) => genProd(s, i)), grew);
  ownedPrev = s.gens.slice();
}

let hintTimer = 0;
function hintKey(): string | null {
  const any = s.shovel + s.gens.reduce((a, b) => a + b, 0) + s.rebirths > 0;
  if (rebirthGain(s) >= 1 && s.rebirths === 0 && !(opts.seen & 2)) return 'hintRebirth';
  if (!any) return s.clicks < 3 || s.dirt < SHOVEL_BASE ? 'hintDig' : openPanelName() ? 'hintBuy' : 'hintOpen';
  if (!(opts.seen & 1) && s.gens.some((g) => g > 0)) {
    if (!hintTimer) hintTimer = window.setTimeout(() => { opts.seen |= 1; }, 6000);
    return 'hintAuto';
  }
  return null;
}

function render() {
  const L = lang();
  document.documentElement.lang = L;
  rollTo(s.dirt);
  setText($('hud-ps'), f(perSecond(s)));
  setText($('hud-gems'), f(s.gems));
  const power = clickPower(s);
  $('mole').setAttribute('aria-label', t('digLabel', { n: f(power) }));
  const st = $('stage');
  const d = depthOf();
  sfx.setDepth(d);
  world.setDepth(d);
  world.setReduced(reducedMotion());
  jfx.setReduced(reducedMotion());
  world.setRates(GENS.map((_, i) => genProd(s, i)));
  world.setLevel(s.gens.reduce((a, n) => a + MILESTONES.filter((m) => n >= m).length, 0));
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
      setText(r.stat, `${t('gain')} : +${f(clickBase({ ...s, shovel: s.shovel + n }) - clickBase(s))} ${t('per')}`);
    } else {
      const gain = genProdAt(s, r.kind, level + n) - genProd(s, r.kind);
      setText(r.desc, t(ids[i] + 'D'));
      setText(r.stat, `${t('gain')} : +${f(gain)}${t('secShort')} · ${f(genProd(s, r.kind))}${t('secShort')}`);
    }
    const nm = locked ? null : nextMilestone(level);
    setText(r.mile, locked ? '' : nm === null ? `${t('allMiles')} · ×${f(milestoneMult(level))}` : `${t('nextMile' + (r.kind < 0 ? 'Shovel' : ''), { n: nm })}${milestoneMult(level) > 1 ? ` · ×${f(milestoneMult(level))}` : ''}`);
    setHtml(r.cost, `${icon('dirt', 'h-5 w-5')}<span class="sr-only">${t('cost')} </span>${f(Math.ceil(cost))}`);
    setDisabled(r.el, locked || s.dirt < cost);
    const wantHot = !hot && (hintKey() === 'hintBuy' || hintKey() === 'hintOpen') && !locked && s.dirt >= cost;
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
  PERMS.forEach((p, i) => {
    const r = permRows[i];
    const lvl = s.perms[i];
    const maxed = lvl >= p.max;
    const extra = p.id === 'lunettes' ? bonusPct(lvl, PERM_PROD_BONUS) : p.id === 'pelleor' ? bonusPct(lvl, PERM_CLICK_PS)
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
  renderBuffs();
  const sel = openPanelName();
  if (sel === 'trophies' || sel === 'stats') renderTrophies();
  renderBadges(hot);
  const hk = hintKey();
  const hint = $('hint');
  if (hk) { setText(hint, t(hk)); hint.hidden = false; } else hint.hidden = true;
  $('opt-lang').textContent = `${t('lang')} : ${L === 'fr' ? 'Français' : 'English'}`;
  $('opt-motion').textContent = `${t('reduced')} : ${t(opts.reduced ? 'on' : 'off')}`;
  $('opt-motion').setAttribute('aria-pressed', String(opts.reduced));
  $('opt-sound').textContent = `${t('sound')} : ${t(opts.sound ? 'on' : 'off')}`;
  $('opt-sound').setAttribute('aria-pressed', String(opts.sound));
  $('opt-ambient').textContent = `${t('ambient')} : ${t(opts.ambient ? 'on' : 'off')}`;
  $('opt-ambient').setAttribute('aria-pressed', String(opts.ambient));
  $('opt-music').textContent = `${t('music')} : ${t(opts.music ? 'on' : 'off')}`;
  $('opt-music').setAttribute('aria-pressed', String(opts.music));
  const mvol = $<HTMLInputElement>('opt-mvol');
  if (document.activeElement !== mvol) mvol.value = String(opts.musicVolume);
  mvol.setAttribute('aria-valuetext', `${opts.musicVolume} %`);
  setText($('mvol-v'), `${opts.musicVolume} %`);
  const vol = $<HTMLInputElement>('opt-vol');
  if (document.activeElement !== vol) vol.value = String(opts.volume);
  vol.setAttribute('aria-valuetext', `${opts.volume} %`);
  setText($('vol-v'), `${opts.volume} %`);
  const snd = $('snd');
  setHtml(snd, icon(opts.sound ? 'soundOn' : 'soundOff', 'h-7 w-7'));
  snd.setAttribute('aria-pressed', String(opts.sound));
  snd.setAttribute('aria-label', t('toggleSound'));
  document.documentElement.classList.toggle('reduced', opts.reduced);
  document.querySelectorAll<HTMLElement>('[data-mode]').forEach((b) =>
    b.setAttribute('aria-pressed', String(String(opts.mode) === b.dataset.mode)));
}

/** Pastilles du dock : nombre d'achats possibles (Mine, Rebirth) ; le bouton de la Mine pulse quand le tout premier achat est possible. */
function setBadge(id: string, n: number | string) {
  const el = $('bd-' + id);
  const v = n ? String(n) : '';
  el.hidden = !v;
  if (el.textContent !== v) { el.textContent = v; if (v && !reducedMotion()) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); } }
  if (v) el.setAttribute('aria-label', t('badgeBuy', { n: v }));
}
function renderBadges(hot: boolean) {
  let dig = 0;
  rows.forEach((r) => { if (r.el.getAttribute('aria-disabled') !== 'true') dig++; });
  setBadge('dig', dig);
  let perm = 0;
  permRows.forEach((r) => { if (r.el.getAttribute('aria-disabled') !== 'true') perm++; });
  setBadge('rebirth', rebirthAdvised(s) ? '!' : perm);
  $('tab-dig').classList.toggle('hot', hot && !openPanelName() && !reducedMotion());
}

function i18nStatic() {
  setLang(opts.lang);
  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n!); });
  document.querySelectorAll<HTMLElement>('[data-i18n-label]').forEach((el) => { el.setAttribute('aria-label', t(el.dataset.i18nLabel!)); });
  if (openPanelName()) $('sheet-t').textContent = t(panelTitle[openPanelName()]);
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

let combo = 0, lastDigAt = 0, cheerAt = 0, comboHide = 0;
const comboEl = $('combo');
function showCombo(n: number) {
  const tier = n >= 100 ? 3 : n >= 50 ? 2 : n >= 25 ? 1 : 0;
  comboEl.hidden = false; comboEl.dataset.tier = String(tier);
  setText(comboEl, t('comboLabel', { n: f(n) }));
  comboEl.classList.remove('tick'); void comboEl.offsetWidth; comboEl.classList.add('tick');
  window.clearTimeout(comboHide); comboHide = window.setTimeout(() => { comboEl.hidden = true; }, 900);
}
let jellyT = 0;
/** Écrasement élastique du bouton principal (CSS), sauf quand la taupe joue déjà une humeur forte. */
function jelly() {
  if (reducedMotion()) return;
  const el = $('mole-svg') as unknown as HTMLElement;
  el.classList.remove('jelly'); void el.getBoundingClientRect(); el.classList.add('jelly');
  window.clearTimeout(jellyT); jellyT = window.setTimeout(() => el.classList.remove('jelly'), 320);
}
let skipClick = false;
function dig(e: PointerEvent | MouseEvent | KeyboardEvent) {
  const p = click(s);
  const now = performance.now();
  combo = now - lastDigAt < 450 ? combo + 1 : 0;
  lastDigAt = now;
  sfx.dig(combo);
  if (combo === 10 || combo === 25 || combo === 50 || combo === 100) {
    sfx.comboTier(combo === 10 ? 0 : combo === 25 ? 1 : combo === 50 ? 2 : 3);
    const b = fxBox(); jfx.confetti(b.width / 2, b.height * 0.45, combo === 10 ? 20 : 40); if (combo >= 25) shake(combo >= 50 ? 3 : 2);
  }
  const box = fx.getBoundingClientRect();
  const hasPos = 'clientX' in e && (e.clientX || e.clientY);
  const x = hasPos ? (e as MouseEvent).clientX - box.left : box.width / 2;
  const y = hasPos ? (e as MouseEvent).clientY - box.top : box.height * 0.6;
  burst(p, x, y);
  coinsToHud(x, y, combo >= 25 ? 3 : combo >= 8 ? 2 : 1, 'dirt');
  if (combo >= 10) showCombo(combo + 1); 
  if (p >= s.dirt * 0.2 && p > 50) { shake(1); jfx.sparks(x, y, 10, '#ffc21a'); }
  vibe(combo >= 10 ? 14 : 8);
  jelly();
  mood('dig', 260);
  mole.classList.remove('hit');
  void mole.offsetWidth;
  mole.classList.add('hit');
  world.kick(5);
  if (s.clicks % 50 === 0 && now - cheerAt > 2000) { cheerAt = now; mood('happy', 800); }
  rollTo(s.dirt);
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

// ---------- bonus temporaires, succès, statistiques ----------
function renderBuffs() {
  const ul = $('buffs');
  const items: string[] = [];
  if (s.rush > 0) items.push(t('buffLeft', { name: t('buffRush'), s: Math.ceil(s.rush) }));
  if (s.genius > 0) items.push(t('buffLeft', { name: t('buffGenius'), s: Math.ceil(s.genius) }));
  setHtml(ul, items.map((x) => `<li class="buff">${x}</li>`).join(''));
}

function renderTrophies() {
  const L = lang();
  const n = s.trophies.length;
  setText($('tr-sum'), t('trophyBonus', { n: f(n), m: f(TROPHY_COUNT), p: f(Math.round((trophyMult(s) - 1) * 100)) }));
  setHtml($('trophies'), TROPHIES.map((tr) => {
    const on = s.trophies.includes(tr.id);
    const [name, desc] = tr[L];
    return `<li class="trophy ${on ? 'is-on' : 'is-off'}"><span class="tile">${icon(on ? tr.icon : 'lock', 'h-9 w-9')}</span><span class="min-w-0"><span class="block text-lg font-bold leading-tight">${name}</span><span class="block text-sm leading-tight">${desc}</span><span class="sr-only">${t(on ? 'trophyOk' : 'trophyLocked')}</span></span></li>`;
  }).join('') + L);
  const rows: [string, string][] = [
    ['sDirt', f(s.lifeTotal)], ['sClicks', f(s.clicks)], ['sTime', fmtDuration(s.playTime, L)],
    ['sRebirths', f(s.rebirths)], ['sGems', f(s.gemsEarned)], ['sBest', s.bestRun > 0 ? fmtDuration(s.bestRun, L) : t('sNone')],
    ['sCaught', f(s.caught)], ['sBuildings', f(s.gens.reduce((a, b) => a + b, 0))],
  ];
  setHtml($('stats'), rows.map(([k, v]) => `<div class="note"><dt>${t(k)}</dt><dd class="text-xl font-bold">${v}</dd></div>`).join('') + L);
}
const trophyName = (id: string) => TROPHIES.find((x) => x.id === id)!;
/** Débloque les succès atteints (annonce groupée s'il y en a plusieurs d'un coup). */
function awardTrophies(quiet = false) {
  const fresh = checkTrophies(s);
  if (!fresh.length) return;
  if (quiet) return;
  sfx.trophy();
  { const b = fxBox(); jfx.confetti(b.width / 2, b.height * 0.3, 40); }
  banner(fresh.length === 1 ? fresh[0].icon : 'trophy', t('trophyBanner'), fresh.length === 1 ? trophyName(fresh[0].id)[lang()][0] : t('trophiesMany', { n: fresh.length }));
  notify(fresh.length === 1 ? t('trophyDone', { name: trophyName(fresh[0].id)[lang()][0] }) : t('trophiesMany', { n: fresh.length }));
}

// ---------- pépite d'or (événement aléatoire) ----------
const nuggetEl = $<HTMLButtonElement>('nugget');
nuggetEl.innerHTML = icon('nugget', 'h-10 w-10');
let nuggetIn = 45; // secondes avant la prochaine apparition
let nuggetLeft = 0; // secondes restantes pour la cueillir (0 = absente)
const nextNuggetDelay = () => NUGGET_MIN_DELAY + Math.random() * (NUGGET_MAX_DELAY - NUGGET_MIN_DELAY);
function nuggetTick(dt: number) {
  if (document.hidden || welcome.open) return;
  if (nuggetLeft > 0) {
    nuggetLeft -= dt;
    if (nuggetLeft <= 0) { nuggetEl.hidden = true; nuggetIn = nextNuggetDelay(); }
  } else if (s.clicks + s.lifeTotal > 0) {
    nuggetIn -= dt;
    if (nuggetIn <= 0) {
      nuggetEl.style.left = `${rnd(8, 78)}%`;
      nuggetEl.style.top = `${rnd(18, 62)}%`;
      nuggetEl.setAttribute('aria-label', t('nuggetLabel'));
      nuggetEl.hidden = false;
      nuggetLeft = NUGGET_LIFE * (reducedMotion() ? 1.5 : 1);
      sfx.nuggetAppear();
      say(t('nuggetAppear'));
    }
  }
}
nuggetEl.addEventListener('click', () => {
  if (nuggetEl.hidden) return;
  nuggetEl.hidden = true; nuggetLeft = 0; nuggetIn = nextNuggetDelay();
  const kind = rollEvent(s, Math.random());
  const got = applyEvent(s, kind);
  sfx.nuggetCatch();
  { const b = nuggetEl.getBoundingClientRect(), o = fxBox(); const nx = b.left - o.left + b.width / 2, ny = b.top - o.top + b.height / 2; coinsToHud(nx, ny, kind === 'treasure' ? 14 : 8, 'gold'); jfx.confetti(nx, ny, 26); jfx.sparks(nx, ny, 14, '#ffc21a'); }
  vibe([20, 30, 40]);
  mood('happy', 800);
  notify(kind === 'rush' ? t('nuggetRush') : kind === 'genius' ? t('nuggetGenius') : t('nuggetTreasure', { n: f(got) }));
  awardTrophies();
  render();
});

// ---------- tiroir de menus et dock ----------
const tabs = PANELS;
const app = $('app');
const sheet = $('sheet');
const panelTitle: Record<string, string> = { dig: 'panelDig', rebirth: 'rebirthTitle', trophies: 'trophyTitle', stats: 'statsTitle', options: 'tabOptions' };
const openPanelName = () => app.dataset.panel || '';
/** Ouvre un panneau (ou le ferme si `name` est vide) ; un seul est ouvert à la fois, l'état est mémorisé. */
function openPanel(name: string, focus = true) {
  const prev = openPanelName();
  const wasOpen = prev !== '';
  if (name === prev) return;
  const hadFocus = sheet.contains(document.activeElement);
  app.dataset.panel = name;
  opts.panel = name;
  tabs.forEach((n) => {
    const on = n === name;
    $('p-' + n).hidden = !on;
    $('tab-' + n).setAttribute('aria-expanded', String(on));
    if (on && n === 'rebirth') opts.seen |= 2;
  });
  sheet.dataset.open = String(name !== '');
  if (name) {
    sheet.removeAttribute('inert');
    setText($('sheet-t'), t(panelTitle[name]));
    sheet.scrollTo?.(0, 0); $('p-' + name).parentElement!.scrollTop = 0;
    if (focus && !wasOpen) $('sheet-t').focus({ preventScroll: true });
  } else {
    sheet.setAttribute('inert', '');
    if (hadFocus && focus) $('tab-' + prev).focus({ preventScroll: true });
  }
  persist();
  render();
}
tabs.forEach((n) => {
  $('tab-' + n).addEventListener('click', () => { sfx.tab(); openPanel(openPanelName() === n ? '' : n); });
});
$('sheet-x').addEventListener('click', () => { sfx.tab(); openPanel(''); });
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && openPanelName() && !welcome.open) { e.preventDefault(); openPanel(''); }
});
// un clic hors du tiroir et du dock le ferme (la taupe et la pépite restent jouables : on creuse sans fermer)
document.addEventListener('pointerdown', (e) => {
  if (!openPanelName()) return;
  const el = e.target as Element | null;
  if (!el || el.closest('#sheet, #dock, #update, #welcome, #mole, #nugget')) return;
  openPanel('', false);
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
twoTap($('rb-go'), 'rebirthConfirm', () => { const g = rebirth(s); if (g > 0) { awardTrophies(); persist(); sfx.rebirth(); rebirthFx(); { const b = fxBox(); jfx.confetti(b.width / 2, b.height * 0.4, 90); coinsToHud(b.width / 2, b.height * 0.5, 10, 'gem'); shake(3); vibe([40, 40, 80]); } notify(t('rebirthDone', { n: g })); } });
twoTap($('opt-reset'), 'resetConfirm', () => {
  wipe(); s = newState(); lastWall = Date.now(); nuggetIn = 45; nuggetLeft = 0; nuggetEl.hidden = true;
  say(t('resetDone')); persist();
});
$('opt-lang').addEventListener('click', () => { opts.lang = lang() === 'fr' ? 'en' : 'fr'; i18nStatic(); render(); });
const toggleSound = () => { opts.sound = !opts.sound; sfx.setEnabled(opts.sound); if (opts.sound) sfx.buy(); persist(); render(); };
$('opt-sound').addEventListener('click', toggleSound);
$('snd').addEventListener('click', toggleSound);
$('opt-motion').addEventListener('click', () => { opts.reduced = !opts.reduced; render(); });
$('opt-ambient').addEventListener('click', () => { opts.ambient = !opts.ambient; sfx.setAmbient(opts.ambient); persist(); render(); });
$('opt-music').addEventListener('click', () => { opts.music = !opts.music; sfx.setMusic(opts.music); persist(); render(); });
const mvolEl = $<HTMLInputElement>('opt-mvol');
mvolEl.addEventListener('input', () => { opts.musicVolume = Math.max(0, Math.min(100, Math.round(Number(mvolEl.value) / 5) * 5)); sfx.setMusicVolume(opts.musicVolume); render(); });
mvolEl.addEventListener('change', persist);
const volEl = $<HTMLInputElement>('opt-vol');
volEl.addEventListener('input', () => { opts.volume = Math.max(0, Math.min(100, Math.round(Number(volEl.value) / 5) * 5)); sfx.setVolume(opts.volume); render(); });
volEl.addEventListener('change', () => { sfx.volumeTick(); persist(); });

// export / import : texte copiable, validé par `importText` (JSON seulement, bornes, jamais d'exécution)
const ioText = $<HTMLTextAreaElement>('io-text');
$('io-export').addEventListener('click', () => {
  const text = exportText(s, opts);
  ioText.value = text;
  ioText.select();
  const done = () => notify(t('ioCopied'));
  const shown = () => notify(t('ioShown'));
  if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(done, shown); else shown();
});
twoTap($('io-import'), 'importConfirm', () => {
  const imp = importText(ioText.value);
  if (!imp) { notify(t('importBad')); return; }
  s = imp.s; lastWall = Date.now(); ownedKey = ''; ownedPrev = [];
  nuggetIn = 45; nuggetLeft = 0; nuggetEl.hidden = true;
  awardTrophies(true);
  persist(); ioText.value = '';
  notify(t('importOk'));
});
window.addEventListener('storage', (e) => {
  if (e.key === SAVE_KEY && e.newValue && !readOnly) { readOnly = true; notify(t('otherTab')); }
});

// ---------- hors-ligne : fenêtre « bon retour » ----------
const welcome = $<HTMLDialogElement>('welcome');
$('w-ok').addEventListener('click', () => welcome.close());
function offlineReturn(gap: number) {
  const cap = offlineCap(s);
  const { gain, seconds } = applyOffline(s, gap);
  if (gain <= 0) return;
  if (gap <= 120) { notify(t('offline', { t: fmtDuration(seconds, lang()), n: f(gain) })); return; }
  setText($('w-text'), t('welcomeText', { t: fmtDuration(seconds, lang()) }));
  setText($('w-gain'), t('welcomeGain', { n: f(gain) }));
  setText($('w-cap'), t(gap > cap ? 'welcomeCapped' : 'welcomeCap', { c: fmtDuration(cap, lang()) }));
  if (!welcome.open) welcome.showModal();
  $('w-ok').focus();
}

// ---------- boucle, sauvegarde ----------
// L'horloge est celle du mur : un onglet figé ou en arrière-plan rattrape le temps écoulé au retour.
let lastWall = loaded ? loaded.at : Date.now();
let acc = 0, renderAcc = 0;
window.setInterval(() => {
  const now = Date.now();
  const gap = Math.max(0, (now - lastWall) / 1000);
  lastWall = now;
  if (gap > 60) offlineReturn(gap);
  else tick(s, gap);
  awardTrophies();
  nuggetTick(Math.min(gap, 1));
  acc += gap; renderAcc += gap;
  if (acc >= 5) { acc = 0; persist(); }
  if (renderAcc >= 0.25 || gap > 1) { renderAcc = 0; render(); }
}, 100);
document.addEventListener('visibilitychange', () => {
  sfx.onVisibility(document.hidden);
  if (document.hidden) persist();
});
window.addEventListener('pagehide', () => persist());

awardTrophies(true);
i18nStatic();
if (opts.panel) { const p0 = opts.panel; opts.panel = ''; openPanel(p0, false); } else render();

// ---------- mise à jour du jeu ----------
const updateBar = $('update');
const updater = watch(() => {
  updateBar.hidden = false;
  say(t('updateText'));
  $('update-go').focus({ preventScroll: true });
});
$('update-x').addEventListener('click', () => { updateBar.hidden = true; });
$('update-go').addEventListener('click', () => {
  persist();
  setText($('update-go'), t('updateReloading'));
  location.reload();
});
$('ver').title = `build ${BUILD}`;
(window as unknown as { __tt_update?: () => Promise<boolean> }).__tt_update = () => updater.check(true);
