export type Lang = 'fr' | 'en';
type Dict = Record<string, string>;

export const T: Record<Lang, Dict> = {
  fr: {
    title: 'Taupe Tycoon', dirt: 'Terre', perSec: 'par seconde', gems: 'Gemmes',
    dig: 'Creuser !', digLabel: 'Creuser avec la pelle : +{n} terre',
    tabDig: 'Creuser', tabRebirth: 'Rebirth', tabOptions: 'Options',
    buy: 'Acheter', mode: 'Quantité', max: 'Max', level: 'Niv.', cost: 'Coût', each: 'par clic',
    shovel: 'Pelle renforcée', shovelD: '+1 terre par clic',
    apprentie: 'Taupe apprentie', apprentieD: 'Creuse toute seule, doucement.',
    taupiniere: 'Taupinière', taupiniereD: 'Une famille entière de creuseuses.',
    foreuse: 'Foreuse à vapeur', foreuseD: 'Pschhh ! Ça perce le roc.',
    machine: 'Machine à creuser', machineD: 'Un monstre d’acier, des tonnes par minute.',
    mine: 'Mine', mineD: 'Galeries, rails et wagonnets.',
    excavatrice: 'Excavatrice à gemmes', excavatriceD: 'Elle déterre des trésors entiers.',
    lunettes: 'Lunettes dorées', lunettesD: '+25 % de production par niveau',
    pelleor: 'Pelle en or', pelleorD: '+50 % de terre par clic par niveau',
    pecule: 'Pécule', peculeD: 'Terre de départ à chaque rebirth',
    sacoche: 'Sacoche', sacocheD: '+1 h de gains hors-ligne par niveau',
    rebirthTitle: 'Rebirth', rebirthIntro: 'Repars de zéro : tu gagnes des gemmes de rebirth. Chaque gemme donne +25 % de production et de clic, pour toujours.',
    rebirthGain: 'Gemmes à gagner', rebirthNeed: 'Creuse encore : il faut {n} de terre sur ce run pour la première gemme.',
    rebirthAdvised: 'Bon moment pour un rebirth !', rebirthWait: 'Tu peux attendre un peu pour gagner plus de gemmes.',
    rebirthGo: 'Faire un rebirth', rebirthConfirm: 'Confirmer : tout repart de zéro', rebirthDone: 'Rebirth ! +{n} gemmes',
    rebirths: 'Rebirths', mult: 'Multiplicateur', shopTitle: 'Boutique permanente', gemCost: '{n} gemmes', maxed: 'Max',
    lang: 'Langue', reduced: 'Mouvements réduits', on: 'oui', off: 'non', reset: 'Effacer la sauvegarde',
    resetConfirm: 'Confirmer : tout effacer', resetDone: 'Sauvegarde effacée.',
    offline: 'Pendant ton absence ({t}) : +{n} terre', bought: '{name} : niveau {n}', bestRun: 'Run en cours',
    runTime: 'Durée du run', about: 'Jeu open source MIT par OpenGamingStudio.', code: 'Code source',
    stage: 'Une taupe à lunettes tient sa pelle dans la main gauche',
  },
  en: {
    title: 'Taupe Tycoon', dirt: 'Dirt', perSec: 'per second', gems: 'Gems',
    dig: 'Dig!', digLabel: 'Dig with the shovel: +{n} dirt',
    tabDig: 'Dig', tabRebirth: 'Rebirth', tabOptions: 'Options',
    buy: 'Buy', mode: 'Amount', max: 'Max', level: 'Lv.', cost: 'Cost', each: 'per click',
    shovel: 'Stronger shovel', shovelD: '+1 dirt per click',
    apprentie: 'Apprentice mole', apprentieD: 'Digs on its own, slowly.',
    taupiniere: 'Molehill', taupiniereD: 'A whole family of diggers.',
    foreuse: 'Steam drill', foreuseD: 'Pshhh! It bores through rock.',
    machine: 'Digging machine', machineD: 'A steel beast, tons per minute.',
    mine: 'Mine', mineD: 'Tunnels, rails and minecarts.',
    excavatrice: 'Gem excavator', excavatriceD: 'It unearths whole treasures.',
    lunettes: 'Golden glasses', lunettesD: '+25% production per level',
    pelleor: 'Golden shovel', pelleorD: '+50% dirt per click per level',
    pecule: 'Nest egg', peculeD: 'Starting dirt after each rebirth',
    sacoche: 'Satchel', sacocheD: '+1 h of offline earnings per level',
    rebirthTitle: 'Rebirth', rebirthIntro: 'Start over and earn rebirth gems. Each gem gives +25% production and clicks, forever.',
    rebirthGain: 'Gems to earn', rebirthNeed: 'Keep digging: you need {n} dirt this run for the first gem.',
    rebirthAdvised: 'Good time for a rebirth!', rebirthWait: 'You can wait a bit to earn more gems.',
    rebirthGo: 'Rebirth now', rebirthConfirm: 'Confirm: everything restarts', rebirthDone: 'Rebirth! +{n} gems',
    rebirths: 'Rebirths', mult: 'Multiplier', shopTitle: 'Permanent shop', gemCost: '{n} gems', maxed: 'Max',
    lang: 'Language', reduced: 'Reduced motion', on: 'yes', off: 'no', reset: 'Erase save',
    resetConfirm: 'Confirm: erase everything', resetDone: 'Save erased.',
    offline: 'While you were away ({t}): +{n} dirt', bought: '{name}: level {n}', bestRun: 'Current run',
    runTime: 'Run time', about: 'Open source MIT game by OpenGamingStudio.', code: 'Source code',
    stage: 'A mole with glasses holds its shovel in its left hand',
  },
};

let lang: Lang = 'fr';
export const setLang = (l: Lang) => { lang = l; };
export function t(key: string, vars: Record<string, string | number> = {}): string {
  let s = T[lang][key] ?? T.fr[key] ?? key;
  for (const k in vars) s = s.replace('{' + k + '}', String(vars[k]));
  return s;
}
