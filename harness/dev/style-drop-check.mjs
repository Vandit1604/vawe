// harness/dev/style-drop-check.mjs: find every `el.style.<prop> = <value>` write in core/layers/*.js
// whose value can come straight from an author field (an `L.<field>` or `C.<field>` read) and is not
// routed through `checkDropped` (core/layers/util.js:24), the one place that catches a CSS value the
// browser silently drops instead of rejecting.
//
// WHY THIS EXISTS. `pad` (util.js:244, :530) and `radius` on a glass layer (util.js:325) both took a
// raw author string straight to `el.style.*` with no check: an invalid value ("20pxx") rendered as if
// pad or radius were never set, with no error anywhere. Two independent instances of the same bug is a
// class, not a typo, so this script watches the whole file list rather than the two sites that were found
// by hand.
//
//   node harness/dev/style-drop-check.mjs           report every unguarded write, exit 1 if any
//   node harness/dev/style-drop-check.mjs --list    print every write this script can see, guarded or not
//
// WHAT COUNTS AS "CAN COME FROM AN AUTHOR FIELD": the assigned value's expression contains `L.<x>` or
// `C.<x>` naming a layer/child prop, AND that prop is not one this script knows is numeric-only or
// enum-only (SAFE_FIELDS below). A numeric field coerced with `+ 'px'` always yields a valid CSS length;
// there is no author-string branch for the browser to drop. A field with a real string branch (`pad`,
// `radius`, `glass`) is exactly the shape that bit us, and is the one this script must not miss again.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const DIR = 'core/layers';
const LIST = process.argv.includes('--list');

// Fields whose CSS write is safe with no checkDropped: schema-numeric only (a bad author value here
// is a type error the validator catches elsewhere, not a silently-dropped string), or a fixed
// internal enum the code itself chooses between (never the author's raw string).
const SAFE_FIELDS = new Set([
  'w', 'h', 'x', 'y', 'grow', 'basis', 'size', 'gap', 'colGap', 'rowGap', 'gridCols', 'colw',
  'italic', 'weight', 'reflect', // dual type but every branch is either boolean or a bounded number
  'layout', 'direction', 'wrap', // only ever tested (=== / ternary), the raw string is never assigned
]);

const files = readdirSync(DIR).filter((f) => f.endsWith('.js')).map((f) => join(DIR, f));

// A write is "guarded" if the same statement, or the line right before it, calls checkDropped for
// that property. Good enough for the patterns this codebase actually uses (one write per guard, right
// next to it) without parsing JS for real.
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
