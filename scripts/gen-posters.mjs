// gen-posters.mjs — generate copyright-safe "poster" cards (designed SVGs, not real posters).
// Each card = the film's real colour palette + a cinematic title. No copyrighted artwork.
//   node scripts/gen-posters.mjs   →   formats/higherlower/assets/posters/<slug>.svg
import fs from 'node:fs';

const DIR = 'formats/higherlower/assets/posters';
fs.mkdirSync(DIR, { recursive: true });

// slug, title line(s), year, gradient stops, accent
const FILMS = [
  { s: 'titanic',   lines: ['TITANIC'],            y: '1997', c1: '#06223f', c2: '#1e5a8a', a: '#d8b15a', size: 80, font: 'Georgia, "Times New Roman", serif' },
  { s: 'endgame',   lines: ['ENDGAME'],            y: '2019', c1: '#1a0e2e', c2: '#6b1f3a', a: '#e0b53c', size: 78 },
  { s: 'barbie',    lines: ['BARBIE'],             y: '2023', c1: '#ff2d8b', c2: '#ff84bd', a: '#ffffff', size: 92 },
  { s: 'frozen2',   lines: ['FROZEN 2'],           y: '2019', c1: '#2a6f97', c2: '#a8dadc', a: '#ffffff', size: 76 },
  { s: 'jurassic',  lines: ['JURASSIC', 'WORLD'],  y: '2015', c1: '#16301f', c2: '#3a5a32', a: '#e0a52e', size: 76 },
  { s: 'spiderman', lines: ['SPIDER-MAN'],         y: '2021', c1: '#b3122e', c2: '#1a3a8f', a: '#ffffff', size: 62 },
  { s: 'starwars',  lines: ['STAR WARS'],          y: '2015', c1: '#0a0a0a', c2: '#26210d', a: '#f2c84b', size: 70 },
  { s: 'avatar2',   lines: ['AVATAR 2'],           y: '2022', c1: '#0a3d4a', c2: '#2bb7c6', a: '#bfe9ff', size: 74 },
  { s: 'avatar',    lines: ['AVATAR'],             y: '2009', c1: '#0b2a4a', c2: '#2f86d6', a: '#bfe9ff', size: 86 },
];

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const W = 600, H = 400;

for (const m of FILMS) {
  const font = m.font || '"Arial Black", "Helvetica Neue", Arial, sans-serif';
  const n = m.lines.length;
  const startY = H / 2 - ((n - 1) * m.size) / 2 + m.size * 0.34;
  const title = m.lines
    .map((ln, i) => `<text x="${W / 2}" y="${(startY + i * m.size).toFixed(1)}" text-anchor="middle" font-family='${font}' font-weight="900" font-size="${m.size}" letter-spacing="2" fill="#fff">${esc(ln)}</text>`)
    .join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0.4" y2="1">
      <stop offset="0" stop-color="${m.c1}"/><stop offset="1" stop-color="${m.c2}"/>
    </linearGradient>
    <radialGradient id="v" cx="0.5" cy="0.42" r="0.75">
      <stop offset="0.55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.45"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#g)"/>
  <rect width="${W}" height="${H}" fill="url(#v)"/>
  <rect x="16" y="16" width="${W - 32}" height="${H - 32}" rx="16" fill="none" stroke="${m.a}" stroke-opacity="0.55" stroke-width="3"/>
  ${title}
  <text x="${W / 2}" y="${H - 52}" text-anchor="middle" font-family='Georgia, serif' font-size="34" letter-spacing="6" fill="${m.a}">${m.y}</text>
</svg>`;
  fs.writeFileSync(`${DIR}/${m.s}.svg`, svg);
}
console.log(`✓ ${FILMS.length} poster cards → ${DIR}`);
