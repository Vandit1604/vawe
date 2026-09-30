// node prompts/moves/demo/contrast.mjs
// Reads every look in demo.css and checks WCAG contrast. Text pairs need 4.5:1, accent as large type 3:1.
// Exits 1 when a pair fails.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const css = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'demo.css'), 'utf8');

const tokensOf = (body) => Object.fromEntries([...body.matchAll(/--([a-z-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
const root = tokensOf(css.match(/:root \{([\s\S]*?)\n\}/)[1]);
const looks = [...css.matchAll(/html\[data-look="([a-z]+)"\] \{([\s\S]*?)\n\}/g)].map((m) => [m[1], { ...root, ...tokensOf(m[2]) }]);

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const lum = (hex) => {
  const [r, g, b] = rgb(hex).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };
const mix = (a, b, p) => '#' + rgb(a).map((v, i) => Math.round(v * p + rgb(b)[i] * (1 - p)).toString(16).padStart(2, '0')).join('');

let failed = 0;
for (const [name, t] of looks) {
  const get = (k) => { let v = t[k]; while (v && v.startsWith('var(')) v = t[v.slice(6, -1)]; return v; };
  const pairs = [
    ['ink/ground', get('ink'), get('ground'), 4.5],
    ['ink/surface', get('ink'), get('surface'), 4.5],
    ['ink/raised', get('ink'), get('raised'), 4.5],
    ['muted/ground', get('muted'), get('ground'), 4.5],
    ['muted/surface', get('muted'), get('surface'), 4.5],
    ['muted/raised', get('muted'), get('raised'), 4.5],
    ['on-accent/accent', get('on-accent'), get('accent'), 4.5],
    ['paper-ink/paper', get('paper-ink'), get('paper'), 4.5],
    ['paper-muted/paper', get('paper-muted'), get('paper'), 4.5],
    ['up-ink/up-tint', get('up-ink'), mix(get('accent'), get('surface'), 0.14), 4.5],
    ['accent/ground (large)', get('accent'), get('ground'), 3],
    ['accent/surface (large)', get('accent'), get('surface'), 3],
  ];
  const bad = pairs.filter(([, a, b, min]) => ratio(a, b) < min);
  failed += bad.length;
  console.log(`${name.padEnd(9)} ${pairs.map(([n, a, b]) => `${n} ${ratio(a, b).toFixed(1)}`).join('  ')}`);
  for (const [n, a, b, min] of bad) console.log(`  FAIL ${n} ${ratio(a, b).toFixed(2)} < ${min}`);
}
console.log(`${looks.length} looks, ${failed} failing pairs`);
process.exit(failed ? 1 : 0);
