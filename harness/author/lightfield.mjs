// harness/author/lightfield.mjs: generate a light field from the command line.
//
//   node harness/author/lightfield.mjs --out formats/scene/_lightfield-ref.html
//   node harness/author/lightfield.mjs --preset tide --shot
//   node harness/author/lightfield.mjs --seed 12 --pattern.kind rings --bloom '#7ad9ff' --out /tmp/f.html
//
// Options mirror core/lightfield exactly: a flag per leaf key, dotted for the groups. An unknown
// flag is an error here for the same reason an unknown option is an error there.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lightfield, SCHEMA } from '../../core/lightfield/index.js';
import { PRESETS } from '../../core/lightfield/presets.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// Build the flag table straight off the schema, so the CLI can never drift from the generator.
const FLAGS = new Map();
for (const [group, rule] of Object.entries(SCHEMA)) {
  if (rule.kind !== 'group') FLAGS.set(group, { path: [group], rule });
  else for (const [leaf, r] of Object.entries(rule.fields)) FLAGS.set(`${group}.${leaf}`, { path: [group, leaf], rule: r });
}
// Short forms: a leaf name with no group, where it is unambiguous.
for (const [name, spec] of [...FLAGS]) {
  const leaf = spec.path[spec.path.length - 1];
  if (name.includes('.') && ![...FLAGS.keys()].some((k) => k !== name && k.endsWith('.' + leaf))) FLAGS.set(leaf, spec);
}

const argv = process.argv.slice(2);
let out = null;
let shot = false;
let preset = null;
const opts = {};

for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (!a.startsWith('--')) die(`stray argument "${a}". Every value needs its flag.`);
  const name = a.slice(2);
  if (name === 'help') usage(0);
  if (name === 'shot') { shot = true; continue; }
  const value = argv[++i];
  if (value === undefined) die(`--${name} needs a value.`);
  if (name === 'out') { out = value; continue; }
  if (name === 'preset') { preset = value; continue; }
  const spec = FLAGS.get(name);
  if (!spec) die(`unknown flag --${name}.\nValid flags: ${[...FLAGS.keys()].sort().map((k) => '--' + k).join(' ')}\nplus --preset --out --shot --help`);
  const [g, leaf] = spec.path;
  const parsed = spec.rule.kind === 'hex' || spec.rule.kind === 'enum' ? value : Number(value);
  if (typeof parsed === 'number' && Number.isNaN(parsed)) die(`--${name} wants a number. Got "${value}".`);
  if (leaf === undefined) opts[g] = parsed;
  else (opts[g] ||= {})[leaf] = parsed;
}

function die(msg) {
  console.error(`lightfield: ${msg}`);
  process.exit(1);
}
function usage(code) {
  console.log('usage: node harness/author/lightfield.mjs [--preset name] [--out file.html] [--shot] [--<option> value ...]');
  console.log('presets: ' + Object.keys(PRESETS).join(' '));
  console.log('options: ' + [...FLAGS.keys()].filter((k) => k.includes('.') || !k.includes('.')).sort().map((k) => '--' + k).join(' '));
  process.exit(code);
}

// A preset is a starting option set. Explicit flags win over it, group by group.
let merged = opts;
if (preset) {
  const base = PRESETS[preset];
  if (!base) die(`unknown preset "${preset}". Known: ${Object.keys(PRESETS).join(', ')}.`);
  merged = { ...base, ...opts };
  for (const k of Object.keys(base)) {
    if (typeof base[k] === 'object' && opts[k]) merged[k] = { ...base[k], ...opts[k] };
  }
}

let html;
try {
  html = lightfield(merged);
} catch (e) {
  die(e.message.replace(/^lightfield: /, ''));
}

if (out) {
  const p = path.isAbsolute(out) ? out : path.join(ROOT, out);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, html + '\n');
  console.log(`wrote ${path.relative(ROOT, p)}  (${html.length} bytes)`);
} else if (!shot) {
  process.stdout.write(html + '\n');
}

if (shot) {
  // A shot always lands in out/, never beside the fragment: formats/scene/ holds markup, not PNGs.
  const target = out ? (path.isAbsolute(out) ? out : path.join(ROOT, out)) : path.join(ROOT, 'out/lightfield.html');
  if (!out) { fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, html + '\n'); }
  const { shoot } = await import('../research/lightfield/lightfield-shot.mjs');
  const png = await shoot(target, path.join(ROOT, 'out', path.basename(target).replace(/\.html$/, '.png')));
  console.log(`shot ${path.relative(ROOT, png)}`);
}
