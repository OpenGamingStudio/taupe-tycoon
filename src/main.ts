import './style.css';
import {
  GENS, MILESTONE_TABLE, SHOVEL_TABLE, PERMS, GEM_BONUS, CASQUE_STEP, THERMOS_STEP, RUSH_MULT, TREASURE_SEC, PERM_CLICK_PS, PERM_PROD_BONUS, SHOVEL_BASE, GEM_DIV,
  NUGGET_MIN_DELAY, NUGGET_MAX_DELAY, NUGGET_LIFE, RUSH_TIME, GENIUS_TIME, BONUSES, BonusId, AUTO_RATE, TURBO_MULT, GENIUS_MULT,
  BONUS_MAX_LV, PEP_COSTS, PEP_NUGGET_PER_HOUR, PEP_TIER_SKIP, PEP_TIER_SKIP_SHOVEL,
} from './config';
import { DECOR, todAt, weatherAt } from './decor';
import { ACC, CHIPS, ICONS, MOLE, SCENE, icon, plate } from './art';
import { fmt, fmtDuration, fmtPct } from './format';
import { Lang, setLang, t } from './i18n';
import { Options, PANELS, SAVE_KEY, defaultLang, exportText, importText, load, save, wipe } from './save';
import * as sfx from './sound';
import { VERSION } from './version';
import { BUILD, watch } from './update';
import { createWorld } from './world';
import { createFx } from './fx';
import { installGuard } from './guard';
import { TROPHIES, TROPHY_COUNT, checkTrophies, trophyPep } from './trophies';
import { statsHtml, trophiesHtml } from './lists';
import {
  State, applyEvent, applyOffline, buyN, buyPerm, click, clickRoll, clickRaw, clickPower, costOf, genProd, genProdAt, maxAffordable,
  milestoneCount, milestoneMult, newState, nextMilestone, offlineCap, perSecond, permCost, prodMult, rebirth, rebirthAdvised, rebirthGain,
  rollEvent, startDirt, tick, trophyMult, perSecondBase, bonusActive, baseCost, bonusFacts, bonusOwned, bonusCd, critChance, nuggetDelayMult, bonusLeft, bonusReadyCount, rainCatch, useBonus, autoTapRaw,
  bonusDur, bonusLevel, buyBonus, nextBonusBuy, nuggetPep, nuggetPepLeft, pepCost, rainCount,
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
$('decor').innerHTML = DECOR;
const stageEl = $('stage');
const syncDecor = () => { const n = Date.now(); stageEl.dataset.tod = todAt(n); stageEl.dataset.wx = weatherAt(n); };
syncDecor();
window.setInterval(syncDecor, 5000);
$('mole-svg').innerHTML = MOLE;
$('ico-dirt').innerHTML = icon('dirt', 'h-8 w-8');
$('ico-gem').innerHTML = icon('gem', 'h-6 w-6');
$('ico-pep').innerHTML = icon('nugget', 'h-6 w-6');
document.querySelectorAll<HTMLElement>('[data-ico]').forEach((el) => { el.innerHTML = icon(el.dataset.ico!, 'h-6 w-6'); });
$('ver').textContent = `v${VERSION}`;

// ---------- lignes ----------
interface Row { el: HTMLButtonElement; tile: HTMLElement; name: HTMLElement; lv: HTMLElement; plus: HTMLElement; cur: HTMLElement; desc: HTMLElement; mile: HTMLElement; cost: HTMLElement; kind: number; id: string }
const rows: Row[] = [];
const permRows: Row[] = [];

function mkRow(id: string, kind: number): Row {
  const li = document.createElement('li');
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'row';
  const [acc, accd] = ACC[id] ?? ACC.shovel;
  el.style.setProperty('--acc', acc);
  el.style.setProperty('--accd', accd);
  el.innerHTML = `<span class="tile">${plate(id)}${icon(id, 'ico')}<span class="padlock">${icon('lock', 'ico')}</span><span class="maxtag">${t('maxTag')}</span></span><span class="min-w-0"><span class="block text-lg font-bold leading-tight"><span class="name"></span></span><span class="badges"><span class="lv"></span><span class="plus"></span></span><span class="desc"></span><span class="cur"></span><span class="mile"><span class="bar"><i></i></span><span class="mile-t"></span></span></span><span class="cost"><span class="cb"></span><span class="need" hidden><i></i></span></span>`;
  li.append(el);
  const q = (c: string) => el.querySelector<HTMLElement>('.' + c)!;
  return { el, tile: q('tile'), name: q('name'), lv: q('lv'), plus: q('plus'), cur: q('cur'), desc: q('desc'), mile: q('mile'), cost: q('cost'), kind, id };
}
const rowsUl = $('rows');
const crewUl = $('crew');
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
      const tb = r.kind < 0 ? SHOVEL_TABLE : MILESTONE_TABLE;
      if (milestoneMult(lvl, tb) > milestoneMult(before, tb)) milestoneHit(r, lvl);
      if (r.kind >= 0) sfx.moleArrive();
    }
  });
  rows.push(r);
  (i === 0 ? rowsUl : crewUl).append(r.el.parentElement!);
});
const pname = (id: string) => t(id);
PERMS.forEach((p, i) => {
  const r = mkRow(p.id, i);
  r.el.addEventListener('click', () => {
    if (r.el.getAttribute('aria-disabled') === 'true') { sfx.deny(); return; }
    if (buyPerm(s, i)) { say(t('bought', { name: pname(p.id), n: s.perms[i] })); bought(r, true); }
  });
  permRows.push(r);
  permsUl.append(r.el.parentElement!);
});

// ----- panneau Bonus : achat et niveaux des bonus à recharge, payés en pépites -----
const bonusBuyUl = $('bonus-buy');
const bonusRows: Row[] = [];
BONUSES.forEach((b, i) => {
  const r = mkRow(b.id, i);
  r.el.addEventListener('click', () => {
    if (r.el.getAttribute('aria-disabled') === 'true') { sfx.deny(); return; }
    const first = !bonusOwned(s, b.id);
    if (buyBonus(s, b.id)) { const m = t(first ? 'boughtBonus' : 'upBonus', { name: bname(b.id), n: bonusLevel(s, b.id) }); say(m); bought(r, true); notify(m); persist(); }
  });
  bonusRows.push(r);
  bonusBuyUl.append(r.el.parentElement!);
});

/** Un palier de niveaux est franchi : fanfare et annonce. */
function milestoneHit(r: Row, level: number) {
  sfx.fanfare();
  const sub = t(r.kind < 0 ? 'mileSubShovel' : 'mileSub', { name: t(r.id), n: level, m: milestoneMult(level, r.kind < 0 ? SHOVEL_TABLE : MILESTONE_TABLE) / milestoneMult(level - 1, r.kind < 0 ? SHOVEL_TABLE : MILESTONE_TABLE) });
  say(`${t('mileBanner')} ${sub}`);
  banner('gem', t('mileBanner'), sub);
  const b = fxBox(); jfx.confetti(b.width / 2, b.height * 0.35, 60); jfx.stars(b.width / 2, b.height * 0.35, 14); jfx.shock(b.width / 2, b.height * 0.35, '#ffc21a'); flash('#ffe27a'); shake(2); vibe([30, 40, 60]);
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
/** Jauge « terre déjà réunie » sous le prix (entier 0-100) ; -1 = cachée. */
function setNeed(cost: HTMLElement, pct: number) {
  const need = cost.lastElementChild as HTMLElement;
  need.hidden = pct < 0;
  if (pct >= 0) (need.firstElementChild as HTMLElement).style.width = Math.min(100, pct) + '%';
}
function setDisabled(el: HTMLElement, off: boolean) { el.setAttribute('aria-disabled', off ? 'true' : 'false'); }

const depthOf = () => (s.gens[4] > 0 || s.gens[5] > 0 ? 2 : s.gens[2] > 0 || s.gens[3] > 0 ? 1 : 0);
const revealed = (i: number) => s.gens[i] > 0 || s.lifeTotal >= GENS[i].cost * 0.4;
const bonusPct = (lvl: number, per: number) => fmtPct(per * 100 * lvl, lang());

let goalPrev = -1; // gemmes en attente au rendu précédent (animation de « montée de niveau »)
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
/** Éclair d'écran en aplat (jamais en mouvement réduit) : un seul à la fois, couleur de la récompense. */
function flash(color: string) {
  if (reducedMotion()) return;
  stageFx.querySelector('.flash')?.remove();
  const el = document.createElement('div');
  el.className = 'flash'; el.style.backgroundColor = color;
  stageFx.append(el);
  el.addEventListener('animationend', () => el.remove());
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
let permsKey = '';
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
    const bt = document.createElement('button');
    bt.type = 'button';
    bt.className = 'ow';
    bt.setAttribute('aria-label', t('owned', { name: t(g.id), n: f(s.gens[i]) }) + '. ' + t('ownedOpen'));
    bt.innerHTML = `${icon(g.id, 'h-8 w-8')}<span class="n" aria-hidden="true">${f(s.gens[i])}</span>`;
    bt.addEventListener('click', () => { openPanel('dig', false); const r = rows[i + 1]; r?.el.scrollIntoView({ block: 'center' }); r?.el.classList.add('flash'); window.setTimeout(() => r?.el.classList.remove('flash'), 900); });
    li.append(bt);
    if ((ownedPrev[i] ?? 0) < s.gens[i] && ownedPrev.length) li.classList.add('pop');
    ul.append(li);
  });
  const grew = ownedPrev.length > 0 && s.gens.some((n, i) => n > (ownedPrev[i] ?? 0));
  world.setCrew(s.gens, GENS.map((_, i) => genProd(s, i)), grew);
  ownedPrev = s.gens.slice();
}

let hintTimer = 0;
let goalTipText = '';
let hintKeyShown = '', hintSince = 0;
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
  renderBonus();
  setText($('hud-gems'), f(s.gems));
  renderPep();
  const power = clickPower(s);
  $('mole').setAttribute('aria-label', t('digLabel', { n: f(power) }));
  const st = $('stage');
  const d = depthOf();
  sfx.setDepth(d);
  world.setDepth(d);
  world.setReduced(reducedMotion());
  jfx.setReduced(reducedMotion());
  world.setRates(GENS.map((_, i) => genProd(s, i)));
  if (permsKey !== s.perms.join(',')) { world.setPerms(s.perms, permsKey !== ''); permsKey = s.perms.join(','); }
  world.setLevel(s.gens.reduce((a, n) => a + milestoneCount(n), 0));
  if (!st.classList.contains('depth-' + d)) st.className = st.className.replace(/depth-\d/, 'depth-' + d);
  const gl = goal();
  $('goal').setAttribute('aria-valuenow', String(gl.pct));
  $('goal-fill').style.width = gl.pct + '%';
  setText($('goal-l'), t('gemPct', { p: gl.pct }));
  const pend = rebirthGain(s);
  const goalTxt = t('goalCap', { a: pend, b: pend + 1, p: gl.pct, g: Math.round(GEM_BONUS * 100) }) + (pend >= 1 ? ' · ' + t('goalReady') : '');
  setText($('goal-t'), goalTxt); goalTipText = goalTxt; $('goal').setAttribute('aria-label', t('gemPct', { p: gl.pct }));
  if (goalPrev >= 0 && pend > goalPrev) {
    notify(t('goalUp', { n: pend, g: Math.round(GEM_BONUS * 100 * pend) }));
    const gb = $('goal'); gb.classList.remove('goal-pop'); void gb.offsetWidth; if (!reducedMotion()) gb.classList.add('goal-pop');
    { const [gx, gy] = centerOf('goal'); jfx.stars(gx, gy, 10, '#20c5c0'); jfx.shock(gx, gy, '#9ff5ee'); }
    sfx.upgrade();
  }
  goalPrev = pend;
  $('goal').setAttribute('aria-label', t(gl.first ? 'goalFirst' : 'goalNext'));
  let hot = false;
  rows.forEach((r, i) => {
    const level = r.kind < 0 ? s.shovel : s.gens[r.kind];
    const base = baseCost(s, r.kind);
    const locked = r.kind >= 0 && !revealed(r.kind);
    const n = opts.mode === 'max' ? Math.max(1, maxAffordable(base, level, s.dirt)) : opts.mode;
    const cost = costOf(base, level, n);
    const no = !locked && s.dirt < cost;
    r.el.classList.toggle('is-locked', locked);
    r.el.classList.toggle('is-no', no);
    setText(r.name, t(ids[i]));
    setText(r.lv, locked ? '' : `${t('level')} ${f(level)}${n > 1 ? ` ×${f(n)}` : ''}`);
    r.lv.hidden = locked;
    r.plus.hidden = locked;
    if (locked) {
      setText(r.plus, '');
      setText(r.desc, t('lockedD', { n: f(Math.ceil(GENS[r.kind].cost * 0.4)) }));
      setText(r.cur, '');
    } else if (r.kind < 0) {
      setText(r.plus, `+${f(clickRaw(s, s.shovel + n) - clickRaw(s))} ${t('per')}`);
      setText(r.desc, t('shovelD'));
      setText(r.cur, `${t('nowVal')} : ${f(clickRaw(s))} ${t('per')}`);
    } else {
      const gain = genProdAt(s, r.kind, level + n) - genProd(s, r.kind);
      setText(r.plus, `+${f(gain)}${t('secShort')}`);
      setText(r.desc, t(ids[i] + 'D'));
      setText(r.cur, `${t('nowVal')} : ${f(genProd(s, r.kind))}${t('secShort')}`);
    }
    r.el.title = locked ? '' : r.desc.textContent ?? '';
    const nmx = locked ? null : nextMilestone(level, r.kind < 0 ? SHOVEL_TABLE : MILESTONE_TABLE);
    const nm = nmx && nmx[0];
    r.mile.hidden = locked;
    if (!locked) {
      setText(r.mile.lastElementChild as HTMLElement, nm === null ? `${t('allMiles')} · ×${f(milestoneMult(level, r.kind < 0 ? SHOVEL_TABLE : MILESTONE_TABLE))}` : t('nextMile' + (r.kind < 0 ? 'Shovel' : ''), { n: nm!, m: nmx![1], k: nm! - level }));
      (r.mile.querySelector('i') as HTMLElement).style.width = (nm === null ? 100 : Math.min(100, Math.floor(level / nm * 100))) + '%';
    }
    setHtml(r.cost.firstElementChild as HTMLElement, `${icon('dirt', 'h-5 w-5')}<span class="sr-only">${t('cost')} </span>${f(Math.ceil(cost))}`);
    setNeed(r.cost, no ? Math.floor(s.dirt / cost * 100) : -1);
    r.cost.classList.toggle('is-lock', locked);
    setDisabled(r.el, locked || no);
    const wantHot = !hot && (hintKey() === 'hintBuy' || hintKey() === 'hintOpen') && !locked && s.dirt >= cost;
    if (wantHot) hot = true;
    r.el.classList.toggle('hot', wantHot && !reducedMotion());
  });
  setText($('crew-n'), `${f(GENS.filter((_, k) => revealed(k)).length)} / ${f(GENS.length)}`);
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
      : p.id === 'pecule' ? `${f(startDirt(s))}` : p.id === 'sacoche' ? `+${f(lvl)} h`
      : p.id === 'trefle' ? `${t('nowVal')} : ${f(Math.round(critChance(s) * 100))} %`
      : p.id === 'casque' ? `${t('nowVal')} : -${f(Math.round(CASQUE_STEP * lvl * 100))} %`
      : p.id === 'aimant' ? `${t('nowVal')} : ${t('nuggetEvery', { t: fmtDuration(Math.round((NUGGET_MIN_DELAY + NUGGET_MAX_DELAY) / 2 * nuggetDelayMult(s)), L) })}`
      : p.id === 'thermos' ? `${t('nowVal')} : -${f(Math.round(THERMOS_STEP * lvl * 100))} %`
      : '';
    const pc = permCost(s, i);
    const no = !maxed && s.gems < pc;
    r.el.classList.toggle('is-max', maxed);
    r.el.classList.toggle('is-no', no);
    setText(r.name, pname(p.id));
    setText(r.lv, `${t('level')} ${f(lvl)}`);
    r.lv.hidden = false;
    setText(r.desc, t(p.id + 'D'));
    r.el.title = r.desc.textContent ?? '';
    setText(r.cur, extra);
    r.cur.hidden = extra === '';
    r.plus.hidden = true;
    r.mile.hidden = true;
    setHtml(r.cost.firstElementChild as HTMLElement, maxed ? `${icon('trophy', 'h-5 w-5')}${t('full')}` : `${icon('gem', 'h-5 w-5')}<span class="sr-only">${t('cost')} </span>${f(pc)}`);
    setNeed(r.cost, no ? Math.floor(s.gems / pc * 100) : -1);
    setDisabled(r.el, maxed || no);
  });
  renderOwned();
  renderBuffs();
  const sel = openPanelName();
  if (sel === 'trophies' || sel === 'stats') renderTrophies();
  renderBadges(hot);
  const hk = hintKey();
  const hint = $('hint');
  if (hk !== hintKeyShown) { hintKeyShown = hk ?? ''; hintSince = Date.now(); }
  if (hk && Date.now() - hintSince < 5000) { setText(hint, t(hk)); hint.hidden = false; } else hint.hidden = true;
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
/** Compteur de pépites (en-tête), annonce d'un gain, panneau Bonus (s'il est ouvert). */
let pepPrev = -1;
function renderPep() {
  const nb = nextBonusBuy(s);
  const can = !!nb && nb.missing === 0;
  setText($('hud-pepn'), f(s.pep));
  const hp = $('hud-pep');
  hp.classList.toggle('can', can && !reducedMotion());
  hp.setAttribute('aria-label', t('pepLabel', { n: f(s.pep) }) + (nb ? ' · ' + (can ? t('pepCanBuy') : t('pepMissing', { n: f(nb.missing), name: bname(nb.id) })) : ''));
  hp.title = hp.getAttribute('aria-label')!;
  if (pepPrev >= 0 && s.pep > pepPrev) {
    const d = s.pep - pepPrev;
    notify(t('pepGain', { n: f(d) }));
    sfx.nuggetCatch();
    if (!reducedMotion()) { hp.classList.remove('bump'); void hp.offsetWidth; hp.classList.add('bump'); }
  }
  pepPrev = s.pep;
  if (openPanelName() !== 'bonus') return;
  const L = lang();
  setText($('bp-n'), f(s.pep));
  setHtml($('bp-ico'), icon('nugget', 'h-12 w-12'));
  setText($('bp-next'), nb ? (can ? t('pepCanBuy') : t('pepMissing', { n: f(nb.missing), name: bname(nb.id) })) : t('pepAllMax'));
  ($('bp-bar').firstElementChild as HTMLElement).style.width = nb ? Math.min(100, Math.floor(s.pep / nb.cost * 100)) + '%' : '100%';
  BONUSES.forEach((b, i) => {
    const r = bonusRows[i], lv = bonusLevel(s, b.id), maxed = lv >= BONUS_MAX_LV, c = pepCost(s, b.id);
    const no = !maxed && s.pep < c;
    r.el.classList.toggle('is-max', maxed);
    r.el.classList.toggle('is-no', no);
    setText(r.name, bname(b.id));
    setText(r.lv, lv < 1 ? t('notBought') : `${t('level')} ${f(lv)} / ${f(BONUS_MAX_LV)}`);
    r.lv.hidden = false;
    setText(r.desc, tipText(b.id));
    r.el.title = r.desc.textContent ?? '';
    setText(r.cur, maxed ? t('bonusMaxed') : t(lv < 1 ? 'bonusFirst' : 'bonusNext', { v: nextLevelText(b.id) }));
    r.cur.hidden = false;
    r.plus.hidden = true; r.mile.hidden = true;
    setHtml(r.cost.firstElementChild as HTMLElement, maxed ? `${icon('trophy', 'h-5 w-5')}${t('full')}` : `${icon('nugget', 'h-5 w-5')}<span class="sr-only">${t('cost')} </span>${f(c)}`);
    setNeed(r.cost, no ? Math.floor(s.pep / c * 100) : -1);
    setDisabled(r.el, maxed || no);
  });
  // sources de pépites : où j'en suis
  const tierMax = GENS.length * (MILESTONE_TABLE.length - PEP_TIER_SKIP) + (SHOVEL_TABLE.length - PEP_TIER_SKIP_SHOVEL);
  const tierDone = s.tiers.reduce((a, b) => a + b, 0);
  const q = nuggetPepLeft(s, Date.now());
  const li = (ico: string, title: string, body: string) => `<li class="note flex items-center gap-2"><span class="shrink-0">${icon(ico, 'h-9 w-9')}</span><span class="min-w-0"><strong class="block text-lg">${title}</strong><span class="block text-base">${body}</span></span></li>`;
  setHtml($('pep-src'),
    li('machine', t('srcTiers'), t('srcTiersD', { a: f(tierDone), b: f(tierMax) }))
    + li('nugget', t('srcNugget'), t('srcNuggetD', { k: PEP_NUGGET_PER_HOUR, a: f(PEP_NUGGET_PER_HOUR - q.left) }) + (q.left < 1 && q.wait > 0 ? ' ' + t('srcNuggetWait', { t: fmtDuration(q.wait, L) }) : ''))
    + li('trophy', t('srcTrophy'), t('srcTrophyD', { a: f(s.trophies.length), b: f(TROPHY_COUNT) })));
  bonusHelp();
}
/** Effet du prochain niveau d'un bonus (texte court, entiers). */
function nextLevelText(id: BonusId): string {
  const lv = bonusLevel(s, id) + 1, mult = [1, 1.5, 2][lv - 1];
  return id === 'rain' ? t('nlRain', { n: Math.round(12 * mult) }) : t('nlDur', { d: Math.round(BONUSES.find((b) => b.id === id)!.dur * mult) });
}
function setBadge(id: string, n: number | string) {
  const el = $('bd-' + id);
  const v = n ? String(n) : '';
  el.hidden = !v;
  if (el.textContent !== v) { el.textContent = v; if (v && !reducedMotion()) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); } }
  if (v) el.setAttribute('aria-label', t('badgeBuy'));
}
function renderBadges(hot: boolean) {
  setBadge('dig', rows.some((r) => r.el.getAttribute('aria-disabled') !== 'true') ? '!' : '');
  setBadge('rebirth', rebirthAdvised(s) || permRows.some((r) => r.el.getAttribute('aria-disabled') !== 'true') ? '!' : '');
  const nb = nextBonusBuy(s);
  setBadge('bonus', nb && nb.missing === 0 ? '!' : '');
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
  bnEls.forEach((b) => { b.key = ''; });
  bonusHelp();
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

function burst(power: number, x: number, y: number, crit = false) {
  if (reducedMotion()) return;
  while (fx.children.length > 40) fx.firstElementChild!.remove();
  const tag = document.createElement('span');
  tag.className = crit ? 'fx fx-crit' : 'fx';
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

let cheerAt = 0;
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
  const { gain: p, crit } = clickRoll(s);
  const now = performance.now();
  sfx.dig();
  if (crit) sfx.crit();
  const box = fx.getBoundingClientRect();
  const hasPos = 'clientX' in e && (e.clientX || e.clientY);
  const x = hasPos ? (e as MouseEvent).clientX - box.left : box.width / 2;
  const y = hasPos ? (e as MouseEvent).clientY - box.top : box.height * 0.6;
  burst(p, x, y, crit);
  if (crit) { jfx.stars(x, y, 7, '#ff5a3c'); jfx.shock(x, y, '#ff5a3c'); }
  coinsToHud(x, y, 1, 'dirt');
  if (p >= s.dirt * 0.2 && p > 50) { shake(1); jfx.sparks(x, y, 10, '#ffc21a'); }
  vibe(8);
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
// un appui glissé hors de la taupe n'émet pas de click : on lève le drapeau pour ne pas avaler une activation clavier
for (const ev of ['pointerup', 'pointercancel'] as const) document.addEventListener(ev, () => { if (skipClick) window.setTimeout(() => { skipClick = false; }, 350); });

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
  const statRows = (): [string, string][] => [
    ['sDirt', f(s.lifeTotal)], ['sClicks', f(s.clicks)], ['sTime', fmtDuration(s.playTime, L)],
    ['sRebirths', f(s.rebirths)], ['sGems', f(s.gemsEarned)], ['sBest', s.bestRun > 0 ? fmtDuration(s.bestRun, L) : t('sNone')],
    ['sCaught', f(s.caught)], ['sBuildings', f(s.gens.reduce((a, b) => a + b, 0))],
  ];
  const n = s.trophies.length;
  setText($('tr-sum'), t('trophyBonus', { n: f(n), m: f(TROPHY_COUNT), p: f(Math.round((trophyMult(s) - 1) * 100)) }));
  setHtml($('trophies'), trophiesHtml(s.trophies, L, icon, (k) => t(k)));
  setHtml($('stats'), statsHtml(statRows(), (k) => t(k)));
}
const trophyName = (id: string) => TROPHIES.find((x) => x.id === id)!;
/** Débloque les succès atteints (annonce groupée s'il y en a plusieurs d'un coup). */
function awardTrophies(quiet = false) {
  const fresh = checkTrophies(s);
  if (!fresh.length) return;
  if (quiet) return;
  sfx.trophy();
  { const b = fxBox(); jfx.confetti(b.width / 2, b.height * 0.3, 40); jfx.stars(b.width / 2, b.height * 0.3, 10, '#ff7aa8'); flash('#ffffff'); }
  banner(fresh.length === 1 ? fresh[0].icon : 'trophy', t('trophyBanner'), fresh.length === 1 ? trophyName(fresh[0].id)[lang()][0] : t('trophiesMany', { n: fresh.length }));
}

// ---------- pépite d'or (événement aléatoire) ----------
const nuggetEl = $<HTMLButtonElement>('nugget');
nuggetEl.innerHTML = icon('nugget', 'h-10 w-10');
let nuggetIn = 45; // secondes avant la prochaine apparition
let nuggetLeft = 0; // secondes restantes pour la cueillir (0 = absente)
const nextNuggetDelay = () => (NUGGET_MIN_DELAY + Math.random() * (NUGGET_MAX_DELAY - NUGGET_MIN_DELAY)) * nuggetDelayMult(s);
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
  nuggetPep(s, Date.now());
  sfx.nuggetCatch();
  { const b = nuggetEl.getBoundingClientRect(), o = fxBox(); const nx = b.left - o.left + b.width / 2, ny = b.top - o.top + b.height / 2; coinsToHud(nx, ny, kind === 'treasure' ? 14 : 8, 'gold'); jfx.confetti(nx, ny, 26); jfx.sparks(nx, ny, 14, '#ffc21a'); jfx.stars(nx, ny, kind === 'treasure' ? 12 : 6); jfx.shock(nx, ny, '#ffc21a'); if (kind === 'treasure') flash('#ffe27a'); }
  vibe([20, 30, 40]);
  mood('happy', 800);
  notify(kind === 'rush' ? t('nuggetRush') : kind === 'genius' ? t('nuggetGenius') : t('nuggetTreasure', { n: f(got) }));
  awardTrophies();
  render();
});


// ---------- bonus à recharge (2.11.0) ----------
const bonusUl = $('bonus');
const bname = (id: BonusId) => t('b' + id[0].toUpperCase() + id.slice(1));
const RING = 2 * Math.PI * 23;
bonusUl.innerHTML = BONUSES.map((b) => `<li><button type="button" class="bn" data-id="${b.id}" data-st="ready"><svg class="bn-ring" viewBox="0 0 52 52" aria-hidden="true" focusable="false"><circle class="bn-bg" cx="26" cy="26" r="23"/><circle class="bn-arc" cx="26" cy="26" r="23" transform="rotate(-90 26 26)"/></svg><span class="bn-ico">${icon(b.id, 'h-7 w-7')}</span></button><span class="bn-n"></span><span class="bn-s"></span></li>`).join('');
const bnEls = BONUSES.map((b) => {
  const el = bonusUl.querySelector<HTMLButtonElement>(`[data-id="${b.id}"]`)!;
  return { def: b, el, arc: el.querySelector<SVGElement>('.bn-arc')!, nm: el.parentElement!.querySelector<HTMLElement>('.bn-n')!, tm: el.parentElement!.querySelector<HTMLElement>('.bn-s')!, key: '' };
});
const mmss = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
function renderBonus() {
  const now = Date.now();
  bnEls.forEach((b) => {
    const own = bonusOwned(s, b.def.id);
    const left = bonusLeft(s, b.def.id, now), act = Math.ceil(bonusActive(s, b.def.id));
    const st = act > 0 ? 'active' : left > 0 ? 'cool' : 'ready';
    const key = (own ? 'o' : 'n') + st + (st === 'active' ? act : st === 'cool' ? left : '') + lang() + s.perms[PERMS.findIndex((p) => p.id === 'thermos')] + 'L' + bonusLevel(s, b.def.id);
    if (key === b.key) return;
    b.key = key;
    b.el.parentElement!.hidden = !own;
    b.el.title = tipText(b.def.id);
    b.el.dataset.st = st;
    const frac = st === 'active' ? act / bonusDur(s, b.def.id) : st === 'cool' ? 1 - left / b.def.cd : 1;
    b.arc.setAttribute('stroke-dashoffset', String(Math.round((1 - Math.max(0, Math.min(1, frac))) * RING * 10) / 10));
    b.arc.setAttribute('stroke-dasharray', String(Math.round(RING * 10) / 10));
    setText(b.nm, bname(b.def.id));
    b.tm.dataset.st = st;
    setText(b.tm, st === 'active' ? act + ' s' : st === 'cool' ? mmss(left) : t('stIdle'));
    b.el.setAttribute('aria-disabled', st === 'ready' ? 'false' : 'true');
    b.el.setAttribute('aria-label', st === 'ready' ? t('bonusReady', { name: bname(b.def.id) }) + '. ' + t(b.def.id === 'auto' ? 'bAutoD' : b.def.id === 'turbo' ? 'bTurboD' : 'bRainD')
      : st === 'active' ? t('bonusActive', { name: bname(b.def.id), s: act }) : t('bonusCool', { name: bname(b.def.id), t: fmtDuration(left, lang()) }));
  });
  const n = bonusReadyCount(s, now);
  bonusUl.setAttribute('aria-label', t('bonusBar') + (n ? ' · ' + t('bonusReadyN', { n }) : ''));
}
/** Texte d'un bonus avec les chiffres réels du niveau actuel (infobulle d'appui long et aide). Aucun nombre à virgule. */
function tipText(id: BonusId): string {
  const x = bonusFacts(s, id);
  const cd = x.cd % 60 === 0 ? `${x.cd / 60} min` : `${Math.floor(x.cd / 60)} min ${x.cd % 60} s`;
  return id === 'auto' ? t('tipAuto', { r: AUTO_RATE, d: x.dur, e: f(x.each), n: f(x.total), c: cd })
    : id === 'turbo' ? t('tipTurbo', { m: TURBO_MULT, d: x.dur, n: f(x.total), c: cd })
    : t('tipRain', { k: x.count, d: x.dur, e: f(x.each), n: f(x.total), c: cd });
}
function bonusHelp() {
  const nug = [
    ['nugget', t('bRush'), t('tipRush', { m: RUSH_MULT, d: RUSH_TIME, n: f(Math.round(perSecondBase(s) * (RUSH_MULT - 1) * RUSH_TIME)) })],
    ['nugget', t('bGenius'), t('tipGenius', { m: GENIUS_MULT, d: GENIUS_TIME })],
    ['nugget', t('bTreasure'), t('tipTreasure', { n: f(Math.round(Math.max(perSecondBase(s) * TREASURE_SEC, clickPower(s) * 50))), s: fmtDuration(TREASURE_SEC, lang()) })],
  ];
  const li = (ico: string, name: string, body: string, extra: string) => `<li class="note flex items-center gap-2"><span class="shrink-0">${icon(ico, 'h-9 w-9')}</span><span class="min-w-0"><strong class="block text-lg">${name}</strong><span class="block text-base">${body}</span>${extra ? `<span class="block text-sm">${extra}</span>` : ''}</span></li>`;
  setHtml($('bonus-help'), nug.map(([i, n, b]) => li(i, n, b, t('nuggetNote'))).join(''));
}

// ----- infobulle d'appui long (bonus à recharge) : au-dessus du bouton, hors du doigt, se ferme au relâchement -----
const tipEl = document.createElement('div');
tipEl.className = 'tip'; tipEl.hidden = true; tipEl.setAttribute('role', 'tooltip');
document.body.append(tipEl);
let tipTimer = 0, tipShown = false;
function hideTip() { window.clearTimeout(tipTimer); tipEl.hidden = true; }
function showTip(el: HTMLElement, text?: string) {
  tipEl.textContent = text ?? tipText(el.dataset.id as BonusId);
  tipEl.hidden = false;
  const r = el.getBoundingClientRect(), w = tipEl.offsetWidth, h = tipEl.offsetHeight;
  const left = Math.max(8, Math.min(window.innerWidth - w - 8, r.left + r.width / 2 - w / 2));
  const above = r.top - h - 14;
  tipEl.style.left = left + 'px';
  tipEl.style.top = Math.max(8, above >= 8 ? above : r.bottom + 64) + 'px';
  tipShown = true; vibe(8);
}
bonusUl.addEventListener('pointerdown', (e) => {
  const el = (e.target as HTMLElement).closest<HTMLElement>('.bn');
  if (!el) return;
  tipShown = false;
  window.clearTimeout(tipTimer);
  tipTimer = window.setTimeout(() => showTip(el), 420);
});
for (const ev of ['pointerup', 'pointercancel', 'pointerleave', 'contextmenu', 'blur'] as const) bonusUl.addEventListener(ev, (e) => { if (ev === 'contextmenu') e.preventDefault(); hideTip(); }, true);
window.addEventListener('scroll', hideTip, true);
// barre de gemme : appui long ou clic = explication
{
  const g = $('goal');
  let tm = 0;
  g.addEventListener('pointerdown', () => { window.clearTimeout(tm); tm = window.setTimeout(() => showTip(g, goalTipText), 350); });
  g.addEventListener('click', () => { window.clearTimeout(tm); showTip(g, goalTipText); window.clearTimeout(tipTimer); tipTimer = window.setTimeout(hideTip, 4500); });
  for (const ev of ['pointerup', 'pointercancel', 'pointerleave'] as const) g.addEventListener(ev, () => window.clearTimeout(tm));
}
const fingerEl = document.createElement('span');
fingerEl.className = 'finger'; fingerEl.hidden = true; fingerEl.innerHTML = icon('auto', 'h-12 w-12');
fx.append(fingerEl);
let autoVis = 0, autoN = 0;
// positions mises en cache (au plus toutes les 500 ms) : évite 3 relevés de mise en page à chaque pas de 100 ms
let rectsAt = 0, rects: { box: DOMRect; mb: DOMRect; cb: DOMRect } | null = null;
const dropRects = () => { rects = null; };
window.addEventListener('resize', dropRects); window.addEventListener('orientationchange', dropRects);
function autoRects() {
  const n = performance.now();
  if (!rects || n - rectsAt > 500) { rects = { box: fx.getBoundingClientRect(), mb: mole.getBoundingClientRect(), cb: fxBox() }; rectsAt = n; }
  return rects;
}
/** Effets visuels de l'Auto-tap (les gains sont dans sim.tick) : doigt qui tape, ondes, éclats ; léger. */
function autoFx(gap: number) {
  const on = s.auto > 0 && !document.hidden;
  if (fingerEl.hidden === on) fingerEl.hidden = !on;
  if (!on) { autoVis = 0; return; }
  const { box, mb, cb } = autoRects();
  const ox = box.left - cb.left, oy = box.top - cb.top;
  const cx = mb.left - box.left + mb.width / 2, cy = mb.top - box.top + mb.height * 0.45;
  fingerEl.style.left = `${cx + 18}px`; fingerEl.style.top = `${cy - 10}px`;
  autoVis += Math.min(gap, 0.5) * AUTO_RATE;
  const n = Math.min(Math.floor(autoVis), 3);
  autoVis -= Math.floor(autoVis);
  for (let i = 0; i < n; i++) {
    autoN++;
    const x = cx + rnd(-mb.width * 0.18, mb.width * 0.18), y = cy + rnd(-mb.height * 0.12, mb.height * 0.12);
    if (autoN % 2 === 0) { sfx.dig(); jelly(); mole.classList.remove('hit'); void mole.offsetWidth; mole.classList.add('hit'); world.kick(3); }
    if (reducedMotion()) continue;
    while (fx.children.length > 40) { const k = fx.children[1] ?? fx.firstElementChild!; if (k === fingerEl) break; k.remove(); }
    const ring = document.createElement('span');
    ring.className = 'ring'; ring.style.left = `${x}px`; ring.style.top = `${y}px`;
    fx.append(ring); ring.addEventListener('animationend', () => ring.remove());
    if (autoN % 3 === 0) {
      const tag = document.createElement('span');
      tag.className = 'fx'; tag.textContent = '+' + f(autoTapRaw(s) * (s.turbo > 0 ? TURBO_MULT : 1) * (s.genius > 0 ? GENIUS_MULT : 1)); tag.style.left = `${x}px`; tag.style.top = `${y - 14}px`;
      fx.append(tag); tag.addEventListener('animationend', () => tag.remove());
      jfx.sparks(x + ox, y + oy, 4, '#ffc21a');
    }
  }
  if (autoN % 4 === 0) rollTo(s.dirt);
}

// Pluie de pépites : des pépites tombent, chacune se cueille d'un tap.
const rainEl = document.createElement('div');
rainEl.className = 'rain pointer-events-none absolute inset-0 z-20 overflow-hidden';
fx.parentElement!.insertBefore(rainEl, fx);
let rainCaught = 0, rainLeft = 0;
function rainDrop() {
  const d = document.createElement('button');
  d.type = 'button'; d.className = 'drop';
  d.innerHTML = icon('nugget', 'h-9 w-9');
  d.setAttribute('aria-label', t('bonusRainLabel'));
  d.style.left = `${rnd(4, 82)}%`;
  const still = reducedMotion();
  if (still) d.style.top = `${rnd(8, 60)}%`;
  d.style.setProperty('--fall', `${rainEl.clientHeight}px`);
  rainEl.append(d);
  const gone = window.setTimeout(() => d.remove(), still ? 5000 : 4300);
  d.addEventListener('click', () => {
    if (!d.isConnected) return;
    window.clearTimeout(gone);
    const b = d.getBoundingClientRect(), o = fxBox(), fb = fx.getBoundingClientRect();
    const x = b.left - o.left + b.width / 2, y = b.top - o.top + b.height / 2; // canvas d'effets
    const lx = b.left - fb.left + b.width / 2, ly = b.top - fb.top + b.height / 2; // couche DOM
    const g = rainCatch(s);
    rainCaught++;
    d.remove();
    sfx.nuggetCatch(); vibe(15);
    coinsToHud(x, y, 3, 'gold'); jfx.sparks(x, y, 8, '#ffc21a');
    const tag = document.createElement('span');
    tag.className = 'fx'; tag.textContent = '+' + f(g); tag.style.left = `${lx}px`; tag.style.top = `${ly - 10}px`;
    fx.append(tag); tag.addEventListener('animationend', () => tag.remove());
    awardTrophies();
    render();
  });
}
function rainStep() {
  if (rainLeft <= 0) {
    window.setTimeout(() => { if (rainCaught > 0) notify(t('bonusRainEnd', { n: rainCaught })); }, 4400);
    return;
  }
  if (!document.hidden) { rainLeft--; rainDrop(); } // onglet caché : la pluie attend, rien n'est perdu
  window.setTimeout(rainStep, 800);
}
function startRain() { rainCaught = 0; rainLeft = rainCount(s); rainStep(); }

bonusUl.addEventListener('click', (e) => {
  const el = (e.target as HTMLElement).closest<HTMLButtonElement>('.bn');
  if (!el) return;
  if (tipShown) { tipShown = false; return; } // l'appui long a seulement ouvert l'infobulle
  const id = el.dataset.id as BonusId;
  const out = { gain: 0 };
  if (!useBonus(s, id, Date.now(), out)) {
    sfx.deny();
    notify(el.getAttribute('aria-label') ?? '');
    return;
  }
  const b = el.getBoundingClientRect(), o = fxBox();
  const x = b.left - o.left + b.width / 2, y = b.top - o.top + b.height / 2;
  sfx.upgrade(); vibe([15, 25, 30]);
  jfx.confetti(x, y, 18);
  mood('happy', 700);
  if (id === 'rain') startRain();
  notify(t('bonusUsed', { name: bname(id) }));
  awardTrophies();
  persist();
  render();
});

// ---------- tiroir de menus et dock ----------
const tabs = PANELS;
const app = $('app');
const sheet = $('sheet');
const panelTitle: Record<string, string> = { dig: 'panelDig', rebirth: 'rebirthTitle', bonus: 'bonusTitle', trophies: 'trophyTitle', stats: 'statsTitle', options: 'tabOptions' };
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
twoTap($('rb-go'), 'rebirthConfirm', () => { const g = rebirth(s); if (g > 0) { awardTrophies(); persist(); sfx.rebirth(); rebirthFx(); { const b = fxBox(); jfx.confetti(b.width / 2, b.height * 0.4, 90); jfx.fireworks(b.width / 2, b.height * 0.3, b.width); coinsToHud(b.width / 2, b.height * 0.5, 10, 'gem'); flash('#9ff5ee'); shake(3); vibe([40, 40, 80]); } notify(t('rebirthDone', { n: g })); } });
twoTap($('opt-reset'), 'resetConfirm', () => {
  wipe(); s = newState(); pepPrev = -1; lastWall = Date.now(); nuggetIn = 45; nuggetLeft = 0; nuggetEl.hidden = true;
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
  s = imp.s; pepPrev = -1; lastWall = Date.now(); ownedKey = ''; ownedPrev = [];
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
  autoFx(gap);
  acc += gap; renderAcc += gap;
  if (acc >= 5) { acc = 0; persist(); }
  if (renderAcc >= 0.25 || gap > 1) { renderAcc = 0; render(); }
}, 100);
installGuard({
  stage: $('stage'), scene: $('scene'), sceneHtml: SCENE, world: $<HTMLCanvasElement>('world'), depth: depthOf,
  worldLastDraw: () => world.lastDraw(), reviveWorld: () => world.revive(), reviveFx: () => jfx.revive(), fxStuck: () => jfx.stuck(),
});
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
