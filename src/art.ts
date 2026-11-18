/**
 * Assets de Taupe Tycoon : tout est dessiné ici en SVG, dans le même langage visuel :
 * aplats, contour encre #2b1d14 (3 px sur une grille de 48, 4 px sur 240), une seule ombre par aplat
 * (teinte « -dark »), reflet blanc en petit trait. Aucun dégradé.
 * Palette = thème Tailwind (src/style.css) + quelques teintes d'ombre propres au dessin.
 */
/** Palette « Plein soleil » (V2.6) : ciel bleu, herbe vive, terre orange, or, contour encre. Aucun dégradé. */
export const C = {
  ink: '#2b1d14', fur: '#a86a3c', furDark: '#7a4626', cream: '#fff0c4', creamDark: '#e8c27c',
  pink: '#ff6f9c', gold: '#ffc21a', goldDark: '#e08a0c', steel: '#d3dde3', steelDark: '#8497a6',
  wood: '#d98a3d', woodDark: '#8f4f1e', gem: '#20d0c8', gemDark: '#0f9490', gemLight: '#9ff5ee',
  grass: '#62d13c', grassDark: '#34a02a', denim: '#2f7fe0', denimDark: '#1f56b0', red: '#f0482e', white: '#ffffff',
  soil: '#c9742c', cave: '#4a2813', sky: '#5ec6f5', sun: '#ffd23a',
};

const k = C.ink;
/** Contour standard d'une icône 48 : épaisseur w. */
const st = (w = 3) => `stroke="${k}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
const shine = (d: string) => `<path d="${d}" fill="none" stroke="#fff" stroke-opacity=".75" stroke-width="2.4" stroke-linecap="round"/>`;

/** Icônes 48×48, une par objet du jeu. */
export const ICONS: Record<string, string> = {
  // --- outils ---
  shovel: `<g transform="rotate(24 24 26)"><path d="M21 8V32" ${st(8)} fill="none"/><path d="M21 8V32" stroke="${C.wood}" stroke-width="3.6" stroke-linecap="round"/>
    <path d="M13 11V8q0-4 4-4h8q4 0 4 4v3" ${st(8)} fill="none"/><path d="M13 11V8q0-4 4-4h8q4 0 4 4v3" fill="none" stroke="${C.woodDark}" stroke-width="3.6" stroke-linecap="round"/>
    <path d="M17 30h8l1 5h-10z" fill="${C.steelDark}" ${st(2.6)}/>
    <path d="M13 34h16c3 5 4 10 1 13-2 1-5 1-9 1s-7 0-9-1c-3-3-2-8 1-13z" fill="${C.steel}" ${st()}/>
    <path d="M17 38v6M25 38v6" stroke="${C.steelDark}" stroke-width="2.4" stroke-linecap="round"/><path d="M20 38l-.6 4" stroke="#fff" stroke-opacity=".9" stroke-width="2.4" stroke-linecap="round"/></g>`,
  pelleor: `<g transform="rotate(24 24 26)"><path d="M21 8V32" ${st(8)} fill="none"/><path d="M21 8V32" stroke="${C.wood}" stroke-width="3.6" stroke-linecap="round"/>
    <path d="M13 11V8q0-4 4-4h8q4 0 4 4v3" ${st(8)} fill="none"/><path d="M13 11V8q0-4 4-4h8q4 0 4 4v3" fill="none" stroke="${C.woodDark}" stroke-width="3.6" stroke-linecap="round"/>
    <path d="M17 30h8l1 5h-10z" fill="${C.steelDark}" ${st(2.6)}/>
    <path d="M13 34h16c3 5 4 10 1 13-2 1-5 1-9 1s-7 0-9-1c-3-3-2-8 1-13z" fill="${C.gold}" ${st()}/>
    <path d="M17 38v6M25 38v6" stroke="${C.goldDark}" stroke-width="2.4" stroke-linecap="round"/><path d="M20 38l-.6 4" stroke="#fff" stroke-opacity=".9" stroke-width="2.4" stroke-linecap="round"/></g><path d="M40 22l1.6 3.6L45 27l-3.4 1.4L40 32l-1.6-3.6L35 27l3.4-1.4z" fill="${C.white}" ${st(2)}/>`,
  apprentie: `<circle cx="11" cy="17" r="5.5" fill="${C.fur}" ${st()}/><circle cx="37" cy="17" r="5.5" fill="${C.fur}" ${st()}/>
    <circle cx="24" cy="27" r="16" fill="${C.fur}" ${st()}/><ellipse cx="24" cy="34" rx="8" ry="6" fill="${C.cream}"/>
    <path d="M9 21c1-12 7-15 15-15s14 3 15 15z" fill="${C.cream}" ${st()}/><rect x="7" y="19" width="34" height="5" rx="2.5" fill="${C.creamDark}" ${st()}/>
    <circle cx="18" cy="28" r="6" fill="#fff" ${st(2.6)}/><circle cx="30" cy="28" r="6" fill="#fff" ${st(2.6)}/><path d="M23.5 27h1" ${st(2.6)}/>
    <circle cx="18.5" cy="29" r="2.4" fill="${k}"/><circle cx="29.5" cy="29" r="2.4" fill="${k}"/>
    <ellipse cx="24" cy="35" rx="3.2" ry="2.3" fill="${C.pink}" ${st(2)}/>`,
  taupiniere: `<path d="M1 45C4 32 12 26 24 26s20 6 23 19z" fill="${C.wood}" ${st()}/>
    <path d="M1 45C3 40 7 36 12 34 8 38 6 41 6 45z" fill="${C.woodDark}"/>
    <ellipse cx="24" cy="36" rx="10.5" ry="6" fill="${C.cave}" ${st()}/>
    <circle cx="20" cy="34" r="3.4" fill="#fff" ${st(2)}/><circle cx="28" cy="34" r="3.4" fill="#fff" ${st(2)}/>
    <circle cx="20.5" cy="34.8" r="1.4" fill="${k}"/><circle cx="27.5" cy="34.8" r="1.4" fill="${k}"/>
    <ellipse cx="24" cy="30" rx="3.4" ry="2.4" fill="${C.pink}" ${st(2)}/>
    <path d="M6 24c3-1 5 0 6 2M38 25c2-2 5-2 7 0" fill="none" ${st(2.6)}/><circle cx="10" cy="20" r="2.2" fill="${C.wood}" ${st(2)}/><circle cx="40" cy="21" r="2" fill="${C.woodDark}" ${st(2)}/>`,
  foreuse: `<circle cx="14" cy="8" r="4" fill="#fff" ${st(2.4)}/><circle cx="21" cy="5" r="3" fill="#fff" ${st(2.4)}/>
    <rect x="9" y="12" width="9" height="7" rx="2" fill="${C.steel}" ${st()}/>
    <rect x="4" y="17" width="26" height="19" rx="5" fill="${C.pink}" ${st()}/><path d="M7 31h20" stroke="#d94d82" stroke-width="3" stroke-linecap="round"/>
    <circle cx="13" cy="26" r="4" fill="#fff" ${st(2.4)}/>
    <path d="M30 18l15 9-15 9z" fill="${C.steel}" ${st()}/><path d="M33 22l6 3.5M33 28.5l6-3.4" stroke="${C.steelDark}" stroke-width="2.6" stroke-linecap="round"/>
    <circle cx="11" cy="40" r="4.5" fill="${C.woodDark}" ${st()}/><circle cx="25" cy="40" r="4.5" fill="${C.woodDark}" ${st()}/>${shine('M8 21h10')}`,
  machine: `<rect x="3" y="33" width="31" height="10" rx="5" fill="${C.cave}" ${st()}/><circle cx="9" cy="38" r="2" fill="${C.steel}"/><circle cx="18.5" cy="38" r="2" fill="${C.steel}"/><circle cx="28" cy="38" r="2" fill="${C.steel}"/>
    <path d="M6 33V19c0-2 1.5-3 3.500-3H27c2 0 3 1 3 3v14z" fill="${C.gold}" ${st()}/>
    <rect x="9" y="19" width="9" height="8" rx="2" fill="${C.gemLight}" ${st(2.6)}/><path d="M22 18v-8" ${st(3)}/>
    <path d="M30 24L41 15" ${st(7)} fill="none"/><path d="M30 24L41 15" stroke="${C.goldDark}" stroke-width="3" stroke-linecap="round"/>
    <circle cx="41" cy="17" r="6.5" fill="${C.steel}" ${st()}/><path d="M41 11.5v11M35.5 17h11" stroke="${C.steelDark}" stroke-width="2.4" stroke-linecap="round"/><circle cx="41" cy="17" r="1.8" fill="${k}"/>${shine('M8 29h18')}`,
  mine: `<path d="M2 45V30L24 6l22 24v15z" fill="${C.steelDark}" ${st()}/><path d="M24 6l22 24v8L24 14z" fill="${C.steel}"/>
    <path d="M2 45V30L24 6l22 24v15z" fill="none" ${st()}/>
    <path d="M9 45V28h30v17z" fill="${C.cave}" ${st()}/><path d="M7 45V26h5v19M36 45V26h5v19M6 25h36" fill="${C.wood}" ${st()}/>
    <path d="M12 41h24" ${st(2.6)} fill="none"/><path d="M14 38h20v-6H14z" fill="${C.gold}" ${st(2.6)}/><circle cx="17.5" cy="42.5" r="2.2" fill="${C.steel}" ${st(2)}/><circle cx="30.5" cy="42.5" r="2.2" fill="${C.steel}" ${st(2)}/>
    <path d="M18 32l2-3 3 3 2-4 3 4 2-2" fill="none" stroke="${C.goldDark}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`,
  excavatrice: `<path d="M3 44h24" ${st(5)} fill="none"/><rect x="3" y="34" width="22" height="10" rx="4" fill="${C.cave}" ${st()}/>
    <path d="M12 34L16 12h9l5 22z" fill="${C.gold}" ${st()}/><path d="M25 14L38 8" ${st(7)} fill="none"/><path d="M25 14L38 8" stroke="${C.goldDark}" stroke-width="3" stroke-linecap="round"/>
    <path d="M32 31h14l-2 12H34z" fill="${C.steel}" ${st()}/>
    <path d="M32 31l4-11 6 3 4 8z" fill="${C.gem}" ${st()}/><path d="M36 20l1 11M42 23l-1 8" stroke="${C.gemDark}" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M38 6v-4M44 8l3-2M34 4l-3-2" ${st(2.4)} fill="none"/>`,
  // --- boutique permanente ---
  lunettes: `<path d="M5 24c-2-1-3-3-3-6M43 24c2-1 3-3 3-6" ${st(3)} fill="none"/>
    <circle cx="14" cy="27" r="10" fill="${C.gold}" ${st()}/><circle cx="34" cy="27" r="10" fill="${C.gold}" ${st()}/>
    <circle cx="14" cy="27" r="6.2" fill="#fff6c9" ${st(2.4)}/><circle cx="34" cy="27" r="6.2" fill="#fff6c9" ${st(2.4)}/>
    <path d="M23.5 25q.5-2.600 1-0 .5-2.6 1 0" ${st(3)} fill="none"/>${shine('M10.500 25c1-2 2.500-3 4-3M30.500 25c1-2 2.500-3 4-3')}
    <path d="M40 8l1.5 3.5L45 13l-3.500 1.500L40 18l-1.500-3.500L35 13l3.500-1.500z" fill="#fff" ${st(2)}/>`,
  pecule: `<path d="M5 30c0 10 8 15 19 15s19-5 19-15z" fill="${C.woodDark}" ${st()}/>
    <path d="M9 34l9 6M16 32l12 11M26 32l11 8M34 33l5 3" stroke="${C.wood}" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M24 4c8 0 14 9 14 18 0 6-5 10-14 10S10 28 10 22C10 13 16 4 24 4z" fill="${C.cream}" ${st()}/>
    <circle cx="19" cy="17" r="2.600" fill="${C.gold}" ${st(2)}/><circle cx="28" cy="13" r="2" fill="${C.pink}" ${st(2)}/><circle cx="29" cy="22" r="2.800" fill="${C.gem}" ${st(2)}/>${shine('M15 20c0-3 1-6 3-8')}`,
  sacoche: `<path d="M13 15C13 6 35 6 35 15" fill="none" ${st(3)}/>
    <path d="M7 19c0-4 3-6 6-6h22c3 0 6 2 6 6l2 22c0 3-2 4-5 4H10c-3 0-5-1-5-4z" fill="${C.grass}" ${st()}/>
    <path d="M7 19c0-4 3-6 6-6h22c3 0 6 2 6 6v6c-7 4-27 4-34 0z" fill="${C.grassDark}" ${st()}/>
    <rect x="20" y="22" width="8" height="9" rx="2.500" fill="${C.gold}" ${st(2.600)}/><circle cx="24" cy="27" r="1.500" fill="${k}"/>${shine('M10 36v5')}`,
  // --- interface ---
  gem: `<path d="M15 5h18l11 12-20 27L4 17z" fill="${C.gem}" ${st()}/><path d="M4 17h40M15 5l9 12 9-12M24 17l0 27" fill="none" stroke="${C.gemDark}" stroke-width="2.600" stroke-linejoin="round"/>
    <path d="M15 5l-4 12" stroke="${C.gemLight}" stroke-width="2.600" stroke-linecap="round" fill="none"/>`,
  dirt: `<path d="M3 41c1-13 8-22 21-22s20 9 21 22z" fill="${C.wood}" ${st()}/>
    <path d="M7 41c1-3 4-4 8-4 3 0 4 2 8 2s5-3 9-3 6 2 8 5z" fill="${C.woodDark}"/>${shine('M12 31c2-5 6-8 11-8')}
    <circle cx="17" cy="33" r="2.4" fill="${C.woodDark}"/><circle cx="31" cy="30" r="2" fill="${C.woodDark}"/>
    <path d="M32 13l3-5 5 3-2 6zM16 12l-4-4" fill="${C.wood}" ${st(2.6)}/>`,
  close: `<path d="M10 10l28 28M38 10L10 38" fill="none" ${st(9)}/><path d="M10 10l28 28M38 10L10 38" fill="none" stroke="#ff7aa8" stroke-width="4.5" stroke-linecap="round"/>`,
  stats: `<rect x="6" y="26" width="10" height="16" rx="2" fill="${C.gem}" ${st()}/><rect x="19" y="14" width="10" height="28" rx="2" fill="${C.gold}" ${st()}/><rect x="32" y="6" width="10" height="36" rx="2" fill="#ff7aa8" ${st()}/>`,
  soundOn: `<path d="M5 18h8l9-8v28l-9-8H5z" fill="${C.gold}" ${st()}/><path d="M30 17c3 4 3 10 0 14M36 12c6 7 6 17 0 24" fill="none" ${st(3.4)}/>`,
  soundOff: `<path d="M5 18h8l9-8v28l-9-8H5z" fill="${C.cream}" ${st()}/><path d="M31 18l11 12M42 18L31 30" fill="none" stroke="${C.red}" stroke-width="3.6" stroke-linecap="round"/>`,
  lock: `<rect x="9" y="21" width="30" height="22" rx="5" fill="${C.cream}" ${st()}/><path d="M15 21v-6c0-6 4-9 9-9s9 3 9 9v6" fill="none" ${st(3.4)}/><circle cx="24" cy="31" r="3.200" fill="${k}"/>`,
  trophy: `<path d="M13 8h22v11c0 7-5 12-11 12s-11-5-11-12z" fill="${C.gold}" ${st()}/><path d="M13 12H6c0 7 3 10 8 11M35 12h7c0 7-3 10-8 11" fill="none" ${st(3)}/><path d="M24 31v7" ${st(3.4)}/><rect x="14" y="38" width="20" height="6" rx="2" fill="${C.goldDark}" ${st()}/>${shine('M17 12v7')}`,
  nugget: `<path d="M24 5l5 11 12 1-9 8 3 12-11-7-11 7 3-12-9-8 12-1z" fill="${C.gold}" ${st()}/><path d="M24 12l2.500 6" stroke="#fff" stroke-opacity=".75" stroke-width="2.400" stroke-linecap="round"/>`,
};

export const icon = (id: string, cls = 'h-9 w-9 shrink-0') =>
  `<svg class="${cls}" viewBox="0 0 48 48" aria-hidden="true" focusable="false">${ICONS[id] ?? ''}</svg>`;

/** Particules de clic : éclats de terre, pépite et gemme (viewBox 24). Une forme par type, jamais un carré générique. */
export const CHIPS = [
  `<path d="M3 15l4-9 8-3 6 8-3 9-9 3z" fill="${C.wood}" ${st(2.4)}/><path d="M7 14l3 3" stroke="${C.woodDark}" stroke-width="2.4" stroke-linecap="round"/>`,
  `<path d="M2 12c0-6 5-9 10-9s9 4 9 9-4 9-9 9-10-3-10-9z" fill="${C.woodDark}" ${st(2.4)}/>`,
  `<path d="M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="${C.gold}" ${st(2.4)}/>`,
  `<path d="M7 3h10l6 7-11 12L1 10z" fill="${C.gem}" ${st(2.4)}/><path d="M1 10h22" stroke="${C.gemDark}" stroke-width="2.2"/>`,
];

/** Taupe à lunettes (viewBox 240). Calques : corps, tête, yeux (3 états), bouche (3 états), pelle dans la main gauche. */
export const MOLE = `
<g class="m-shadow"><ellipse cx="120" cy="218" rx="98" ry="17" fill="${C.cave}" stroke="${k}" stroke-width="5"/>
  <ellipse cx="120" cy="210" rx="82" ry="11" fill="${C.woodDark}"/><path d="M46 208c10 6 26 8 40 8M170 216c14-1 28-4 38-9" stroke="${C.wood}" stroke-width="4" stroke-linecap="round" fill="none"/></g>
<g class="m-body">
  <path d="M50 210c-6-62 20-102 70-102s76 40 70 102z" fill="${C.fur}" stroke="${k}" stroke-width="5" stroke-linejoin="round"/>
  <path d="M84 210c-2-36 8-56 36-56s38 20 36 56z" fill="${C.cream}"/>
  <path d="M84 210v-48c0-8 6-12 12-12h48c6 0 12 4 12 12v48z" fill="${C.denim}" stroke="${k}" stroke-width="5" stroke-linejoin="round"/>
  <path d="M92 166h56" stroke="${C.denimDark}" stroke-width="5" stroke-linecap="round"/>
  <path d="M96 150l-10-34M144 150l10-34" stroke="${k}" stroke-width="14" stroke-linecap="round"/><path d="M96 150l-10-34M144 150l10-34" stroke="${C.denim}" stroke-width="6" stroke-linecap="round"/>
  <circle cx="98" cy="158" r="6" fill="${C.gold}" stroke="${k}" stroke-width="4"/><circle cx="142" cy="158" r="6" fill="${C.gold}" stroke="${k}" stroke-width="4"/>
  <rect x="104" y="176" width="32" height="20" rx="6" fill="${C.denimDark}" stroke="${k}" stroke-width="4"/>
  <!-- bras droit (côté droit de l'écran) posé sur la salopette -->
  <ellipse cx="182" cy="176" rx="15" ry="27" transform="rotate(-8 182 176)" fill="${C.fur}" stroke="${k}" stroke-width="5"/>
  <g fill="${C.cream}" stroke="${k}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M170 198l-1 11 6-6zM180 201l1 11 6-8zM190 197l3 10 3-8z"/></g>
</g>
<g class="m-head">
  <circle cx="76" cy="96" r="15" fill="${C.fur}" stroke="${k}" stroke-width="5"/><circle cx="76" cy="97" r="7" fill="${C.pink}"/>
  <circle cx="164" cy="96" r="15" fill="${C.fur}" stroke="${k}" stroke-width="5"/><circle cx="164" cy="97" r="7" fill="${C.pink}"/>
  <ellipse cx="120" cy="110" rx="52" ry="46" fill="${C.fur}" stroke="${k}" stroke-width="5"/>
  <ellipse cx="120" cy="132" rx="30" ry="21" fill="${C.cream}"/>
  <!-- casque de mineur -->
  <g class="m-hat">
    <path d="M72 84c-2-30 20-48 48-48s50 18 48 48z" fill="${C.gold}" stroke="${k}" stroke-width="5" stroke-linejoin="round"/>
    <path d="M120 38v42M96 44v36M144 44v36" stroke="${C.goldDark}" stroke-width="5" stroke-linecap="round" fill="none"/>
    <rect x="62" y="80" width="116" height="14" rx="7" fill="${C.gold}" stroke="${k}" stroke-width="5"/>
    <path d="M70 90h100" stroke="${C.goldDark}" stroke-width="4" stroke-linecap="round"/>
    <path d="M86 52c4-6 10-10 18-11" stroke="#fff" stroke-opacity=".8" stroke-width="5" stroke-linecap="round" fill="none"/>
    <g class="m-lamp"><circle cx="120" cy="54" r="13" fill="#fff6c9" stroke="${k}" stroke-width="5"/><circle cx="120" cy="54" r="5" fill="${C.gold}"/></g>
  </g>
  <!-- lunettes rondes -->
  <circle cx="96" cy="112" r="19" fill="#fff" stroke="${k}" stroke-width="5.5"/>
  <circle cx="144" cy="112" r="19" fill="#fff" stroke="${k}" stroke-width="5.5"/>
  <path d="M114 110h12" stroke="${k}" stroke-width="5.5" stroke-linecap="round"/><path d="M77 108L66 104M163 108l11-4" stroke="${k}" stroke-width="5" stroke-linecap="round"/>
  <g class="m-eyes-open"><circle cx="98" cy="114" r="7" fill="${k}"/><circle cx="142" cy="114" r="7" fill="${k}"/><circle cx="101" cy="111" r="2.600" fill="#fff"/><circle cx="145" cy="111" r="2.600" fill="#fff"/></g>
  <g class="m-eyes-happy" fill="none" stroke="${k}" stroke-width="5.5" stroke-linecap="round"><path d="M86 116q10-14 20 0"/><path d="M134 116q10-14 20 0"/></g>
  <path d="M82 102c3-5 7-7 12-8" stroke="#8fd0ff" stroke-opacity=".9" stroke-width="4" stroke-linecap="round" fill="none"/><path d="M130 102c3-5 7-7 12-8" stroke="#8fd0ff" stroke-opacity=".9" stroke-width="4" stroke-linecap="round" fill="none"/>
  <ellipse cx="80" cy="134" rx="9" ry="6" fill="#ff8fae"/><ellipse cx="160" cy="134" rx="9" ry="6" fill="#ff8fae"/>
  <!-- museau -->
  <ellipse cx="120" cy="131" rx="14" ry="10" fill="${C.pink}" stroke="${k}" stroke-width="4.5"/><path d="M113 128c2-2 5-3 8-2" stroke="#fff" stroke-opacity=".8" stroke-width="3" stroke-linecap="round" fill="none"/>
  <g class="m-mouth-smile"><path d="M104 144q16 12 32 0" fill="none" stroke="${k}" stroke-width="4.5" stroke-linecap="round"/><rect x="113" y="148" width="6.500" height="9" rx="2" fill="#fff" stroke="${k}" stroke-width="3"/><rect x="121" y="148" width="6.500" height="9" rx="2" fill="#fff" stroke="${k}" stroke-width="3"/></g>
  <g class="m-mouth-open"><path d="M106 143q14 22 28 0z" fill="${C.cave}" stroke="${k}" stroke-width="4.5" stroke-linejoin="round"/><path d="M114 154q6 6 12 0" fill="${C.pink}"/></g>
  <g class="m-mouth-big"><path d="M100 142q20 26 40 0z" fill="${C.cave}" stroke="${k}" stroke-width="4.5" stroke-linejoin="round"/><path d="M110 156q10 8 20 0" fill="${C.pink}"/><rect x="108" y="143" width="9" height="7" rx="2" fill="#fff"/><rect x="123" y="143" width="9" height="7" rx="2" fill="#fff"/></g>
</g>
<!-- pelle tenue dans la MAIN GAUCHE (à gauche de l'écran) ; le bras fait partie du groupe pour suivre la pelle -->
<g class="m-shovel">
  <!-- vraie pelle : manche en bois à poignée en D, douille en fer, lame plate -->
  <path d="M54 100L46 188" stroke="${k}" stroke-width="15" stroke-linecap="round"/><path d="M54 100L46 188" stroke="${C.wood}" stroke-width="8" stroke-linecap="round"/>
  <path d="M51 112L48 150" stroke="#fff" stroke-opacity=".45" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M38 104V92q0-10 10-10h16q10 0 10 10v12" fill="none" stroke="${k}" stroke-width="15" stroke-linecap="round" stroke-linejoin="round"/><path d="M38 104V92q0-10 10-10h16q10 0 10 10v12" fill="none" stroke="${C.woodDark}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M39 176h15l2 18H37z" fill="${C.steelDark}" stroke="${k}" stroke-width="5" stroke-linejoin="round"/>
  <path d="M33 192h26c6 10 7 22 3 30-4 5-9 6-16 6s-12-1-16-6c-4-8-3-20 3-30z" fill="${C.steel}" stroke="${k}" stroke-width="5" stroke-linejoin="round"/>
  <path d="M38 200v18M54 200v18" stroke="${C.steelDark}" stroke-width="4" stroke-linecap="round"/><path d="M43 199l-1 10" stroke="#fff" stroke-opacity=".9" stroke-width="3.5" stroke-linecap="round"/>
  <ellipse cx="62" cy="146" rx="16" ry="19" transform="rotate(8 62 146)" fill="${C.fur}" stroke="${k}" stroke-width="5"/>
  <g fill="none" stroke="${k}" stroke-width="3.5" stroke-linecap="round"><path d="M70 136l-10 2M72 146l-11 1M70 156l-10-2"/></g>
  <g fill="${C.cream}" stroke="${k}" stroke-width="3" stroke-linejoin="round"><circle cx="50" cy="138" r="3.4"/><circle cx="48" cy="147" r="3.4"/><circle cx="50" cy="156" r="3.4"/></g>
</g>`;

/** Décor souterrain (viewBox 400×300, rempli en « slice »). Les bandes prennent leur couleur de .depth-N (style.css). */
export const SCENE = `
<rect width="400" height="300" class="s-b1"/>
<rect y="92" width="400" height="208" class="s-b2"/>
<rect y="190" width="400" height="110" class="s-b3"/>
<path d="M0 92c25 6 40-4 70 2s40 8 70 0 50-6 80 0 45 4 70-2 70 4 110 0V84H0z" class="s-b2" stroke="${k}" stroke-width="4"/>
<path d="M0 190c30 8 60-6 90 2s50 6 80 0 60-8 90 0 60 6 140 0v-8H0z" class="s-b3" stroke="${k}" stroke-width="4"/>
<!-- ciel, soleil, nuages, collines, herbe -->
<rect y="-60" width="400" height="112" fill="${C.sky}"/>
<g stroke="${k}" stroke-width="4" stroke-linecap="round"><path d="M338-6v-8M338 54v-8M368 24h8M300 24h8M360 2l6-6M360 46l6 6M316 2l-6-6" stroke="${C.sun}" transform="translate(0 -6)"/></g>
<circle cx="338" cy="18" r="17" fill="${C.sun}" stroke="${k}" stroke-width="4"/>
<path d="M30 20c0-10 9-15 18-13 5-8 18-8 22 1 9 0 13 7 11 12z" fill="#fff" stroke="${k}" stroke-width="3.5" stroke-linejoin="round"/>
<path d="M180 4c0-8 7-12 14-10 4-6 14-6 17 1 7 0 10 5 9 9z" fill="#fff" stroke="${k}" stroke-width="3.5" stroke-linejoin="round"/>
<path d="M0 52V38c40-22 70-14 100 0 30-18 60-30 100-8 30-14 80-18 100 6 30-8 70-6 100 6v10z" fill="${C.grassDark}" stroke="${k}" stroke-width="4" stroke-linejoin="round"/>
<rect y="46" width="400" height="22" fill="${C.grass}" stroke="${k}" stroke-width="4"/><rect y="62" width="400" height="8" fill="${C.grassDark}"/>
<path d="M0 62c8 6 14 6 20 0s14 6 20 0 14 6 20 0 14 6 20 0 14 6 20 0 14 6 20 0 14 6 20 0 14 6 20 0 14 6 20 0 14 6 20 0 14 6 20 0 14 6 20 0 14 6 20 0 14 6 20 0 14 6 20 0 14 6 20 0 14 6 20 0 14 6 20 0v6H0z" fill="${C.grassDark}"/>
<g stroke="${k}" stroke-width="2.5"><circle cx="70" cy="56" r="4" fill="#fff"/><circle cx="70" cy="56" r="1.5" fill="${C.gold}" stroke="none"/><circle cx="250" cy="58" r="4" fill="${C.pink}"/><circle cx="250" cy="58" r="1.5" fill="#fff" stroke="none"/><circle cx="330" cy="56" r="4" fill="#fff"/><circle cx="330" cy="56" r="1.5" fill="${C.gold}" stroke="none"/><circle cx="130" cy="58" r="4" fill="${C.gold}"/><circle cx="130" cy="58" r="1.5" fill="#fff" stroke="none"/></g>
<g stroke="${k}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
  <path d="M60 68l-4 12M64 68l2 10M298 68l-6 10M302 68l2 12M180 68l-3 9" fill="none" stroke="${C.grassDark}"/>
</g>
<!-- cailloux, racines, fossile, ver -->
<g stroke="${k}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round">
  <path d="M30 120l14-8 14 6 4 14-10 10-16-4z" class="s-rock"/><path d="M340 130l12-8 14 4 2 14-12 8-14-4z" class="s-rock"/>
  <path d="M90 154l8-4 8 4-2 8-8 2-8-4z" class="s-rock"/><path d="M320 170l10-5 10 5-3 9-9 2-9-5z" class="s-rock"/>
  <path d="M196 70c-4 16 4 26-6 40M186 96c-8 2-12 8-14 16M196 90c6 4 12 4 16 12" fill="none" stroke="${C.woodDark}"/>
  <path d="M52 238c-8-14 6-26 20-22 12 4 12 20 2 26-8 4-18 4-22-4z" class="s-fossil" stroke="${k}"/><path d="M56 232c4-6 12-6 16 0M60 238c2-3 7-3 9 0" fill="none" stroke="${C.cream}" stroke-width="3"/>
  <path d="M330 232c4-10 14-12 22-8 6 4 6 12 0 16s-14 2-22-8z" fill="${C.cream}" stroke="${k}"/><circle cx="346" cy="230" r="2" fill="${k}" stroke="none"/>
  <path d="M110 128c6-6 12-4 14 2s8 6 12 0 10-4 14 2" fill="none" stroke="${C.pink}" stroke-width="9"/><path d="M110 128c6-6 12-4 14 2s8 6 12 0 10-4 14 2" fill="none" stroke="${k}" stroke-width="2" stroke-dasharray="0 0"/>
</g>
<!-- veines de pépites (profondeur 1+) et cristaux (profondeur 2) -->
<g class="s-ore" stroke="${k}" stroke-width="3.5" stroke-linejoin="round"><path d="M250 112l5 6 8-2-3 8-9 2-5-6z" fill="${C.gold}"/><path d="M286 214l5 6 8-2-3 8-9 2-5-6z" fill="${C.gold}"/><path d="M130 236l5 6 8-2-3 8-9 2-5-6z" fill="${C.gold}"/></g>
<g class="s-crystals" stroke="${k}" stroke-width="4" stroke-linejoin="round"><path d="M20 290l6-30 10 6 6 24z" fill="${C.gem}"/><path d="M34 290l8-22 8 10 2 12z" fill="${C.gemLight}"/><path d="M360 290l6-34 12 8 6 26z" fill="${C.gem}"/><path d="M380 290l4-18 8 8 0 10z" fill="${C.gemLight}"/><path d="M270 296l6-14 10 6 4 8z" fill="${C.gem}"/></g>
<!-- caverne de la taupe : voûte étayée -->
<path d="M44 300c-2-60 22-122 156-122s158 62 156 122z" class="s-cave" stroke="${k}" stroke-width="5"/>
<path d="M60 300c-2-52 20-106 140-106s142 54 140 106z" class="s-cave2"/>
<g stroke="${k}" stroke-width="5" stroke-linejoin="round"><path d="M64 300V210h14v90zM322 300V210h14v90z" fill="${C.wood}"/><path d="M52 214h44v-14H52zM304 214h44v-14h-44z" fill="${C.woodDark}"/><path d="M200 180v30" stroke="${k}" fill="none"/></g>
<g class="s-lamp"><path d="M200 178v18" stroke="${k}" stroke-width="4"/><path d="M186 214c0-12 6-18 14-18s14 6 14 18z" fill="${C.gold}" stroke="${k}" stroke-width="4.5"/><circle cx="200" cy="208" r="5" fill="#fff6c9"/></g>`;
