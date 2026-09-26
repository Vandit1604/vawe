import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const DIR = 'core/layers';
const LIST = process.argv.includes('--list');

const SAFE_FIELDS = new Set([
  'w', 'h', 'x', 'y', 'grow', 'basis', 'size', 'gap', 'colGap', 'rowGap', 'gridCols', 'colw',
  'italic', 'weight', 'reflect', // dual type but every branch is either boolean or a bounded number
  'layout', 'direction', 'wrap', // only ever tested (=== / ternary), the raw string is never assigned
]);

const files = readdirSync(DIR).filter((f) => f.endsWith('.js')).map((f) => join(DIR, f));

const STYLE_RE = /\.style\.([a-zA-Z]+)\s*=\s*([^;]+);/g;
const FIELD_RE = /\b[LC]\.([a-zA-Z]+)\b/g;

const findings = [];
for (const file of files) {
  const src = readFileSync(file, 'utf8');
  const lines = src.split('\n');
  for (let i = 0; i < lines.length; i++) {
    STYLE_RE.lastIndex = 0;
    let m;
    while ((m = STYLE_RE.exec(lines[i]))) {
      const [, prop, expr] = m;
      const fields = [...expr.matchAll(FIELD_RE)].map((f) => f[1]);
      if (!fields.length) continue; // built from constants only, nothing author-shaped to lose
      if (fields.every((f) => SAFE_FIELDS.has(f))) continue;
      const context = lines.slice(Math.max(0, i - 1), i + 1).join('\n');
      const guarded = /checkDropped\(/.test(context);
      findings.push({ file, line: i + 1, prop, fields, guarded, text: lines[i].trim() });
    }
  }
}

if (LIST) {
  for (const f of findings) {
    console.log(`${f.file}:${f.line}: ${f.guarded ? 'guarded ' : 'UNGUARDED'} .style.${f.prop} <- ${f.fields.join(',')}`);
  }
  process.exit(0);
}

const unguarded = findings.filter((f) => !f.guarded);
for (const f of unguarded) {
  console.log(`${f.file}:${f.line}: .style.${f.prop} reads ${f.fields.join(', ')} with no checkDropped guard`);
  console.log(`  ${f.text}`);
}
if (unguarded.length) {
  console.error(`\nstyle-drop-check: ${unguarded.length} unguarded author-facing style write(s) in ${DIR}. `
    + 'Route the value through checkDropped before assigning it, same as pad and radius were fixed '
    + '(core/layers/util.js), or add the field to SAFE_FIELDS with a reason if it truly cannot carry a bad string.');
  process.exit(1);
}
console.log(`style-drop-check: clean (${findings.length} author-facing style write(s) checked in ${DIR})`);
