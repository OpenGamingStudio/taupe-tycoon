// Fabrique public/favicon.svg (picto de l'application) à partir de la mascotte actuelle (src/art.ts MOLE).
// Usage (Node 20) : npx esbuild src/art.ts --bundle --format=esm --outfile=.picto-art.mjs && node tools/picto.mjs <sortie.svg>
import { writeFileSync } from 'node:fs';
const { MOLE, C } = await import('../.picto-art.mjs');
const [out = 'public/favicon.svg'] = process.argv.slice(2);
// une seule expression : on masque les variantes (bouche ouverte, yeux contents) comme le fait style.css
const hide = '.m-eyes-happy,.m-mouth-open,.m-mouth-big{display:none}';
const vb = '12 26 208 208';
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}"><style>${hide}</style><rect x="12" y="26" width="208" height="208" rx="44" fill="${C.sky}"/>${MOLE}</svg>`;
writeFileSync(out, svg);
console.log(out, svg.length, 'octets', C.sky);
