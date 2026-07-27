// scripts/gates/docs-drift.mjs — a doc is a claim about the PAST as much as the future, and
// nothing checked it. Twice now it listed shipped work as missing and routed a planning pass at
// effects that already existed (see its own closing warning, and MISTAKES #83).
//
// Two checks, both narrow on purpose:
//   1. Any registry NAME the roadmap calls absent must not actually be in that registry.
//   2. Any registry COUNT it quotes must match.
// Deliberately NOT a prose checker. It only reads sentences that make a falsifiable claim about a
// registry, because a gate that nags about wording gets ignored and takes the real findings with it.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SHADER_FX } from '../../core/stings.js';
import { AMBIENT_FX } from '../../core/shaders-ambient.js';
import { PAINT_FX_NAMES } from '../../core/paint-fx.js';
import { RESAMPLE_FX } from '../../core/resample-fx.js';
import { RAYMARCH_FX } from '../../core/raymarch-fx.js';
import { BG_NAMES } from '../../core/backgrounds.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const doc = fs.readFileSync(path.join(repoRoot, 'docs', 'ROADMAP.md'), 'utf8');

// PRIMITIVES.md states a count in its section HEADINGS ("— 35 WebGL cover-the-cut effects"). Those
// decayed exactly like the roadmap's did (33 and 14 against a real 35 and 17) while this gate watched
// only one file. A gate's blind spot is rarely the rule it states; it is the file list underneath it.
const PRIM_PATH = path.join(repoRoot, 'docs', 'PRIMITIVES.md');
const prim = fs.readFileSync(PRIM_PATH, 'utf8');
const HEADING_COUNTS = [
  { re: /## Shader stings \(`core\/stings\.js`\) — (\d+)/,          reg: 'SHADER_FX' },
  { re: /## Ambient shader looks \(`core\/shaders-ambient\.js`\) — (\d+)/, reg: 'AMBIENT_FX' },
  { re: /the `raymarch` layer type — (\d+)/,                         reg: 'RAYMARCH_FX' },
];

const REGISTRIES = {
  SHADER_FX: { names: SHADER_FX, src: 'core/stings.js' },
  AMBIENT_FX: { names: AMBIENT_FX, src: 'core/shaders-ambient.js' },
  PAINT_FX: { names: PAINT_FX_NAMES, src: 'core/paint-fx.js' },
  RESAMPLE_FX: { names: RESAMPLE_FX, src: 'core/resample-fx.js' },
  RAYMARCH_FX: { names: RAYMARCH_FX, src: 'core/raymarch-fx.js' },
};
const every = Object.entries(REGISTRIES).flatMap(([reg, { names, src }]) => names.map((n) => ({ n, reg, src })));

const findings = [];

// ---- 1. "still absent" / "missing" lines that name something already shipped ----------------------
// Strikethrough (~~...~~) is how this doc retires a claim, so a struck line is history, not a claim.
const ABSENT = /(still absent|^\s*-?\s*missing:|genuinely cheap and still absent|not built|cannot be built)/i;
doc.split('\n').forEach((line, i) => {
  if (!ABSENT.test(line)) return;
  if (line.trim().startsWith('~~') || line.includes('~~**Genuinely')) return;
  // only the part AFTER the absence marker is a claim of absence
  const tail = line.slice(line.search(ABSENT));
  for (const { n, reg, src } of every) {
    // BACKTICKED only. Matching the bare word flagged "Glitch RGB captions" (a caption feature) as
    // the `glitch` sting. This doc backticks a registry entry every time it means the registry entry,
    // and uses plain prose for feature names, so the backtick IS the disambiguator. A gate that
    // cries wolf on prose gets skimmed, and takes its real findings down with it.
    if (!tail.includes('`' + n + '`')) continue;
    findings.push(`docs/ROADMAP.md:${i + 1} calls "${n}" absent, but it ships in ${reg} (${src})\n      ${line.trim().slice(0, 150)}`);
  }
});

// ---- 2. quoted registry counts ------------------------------------------------------------------
// e.g. "`SHADER_FX` holds 34 entries and `AMBIENT_FX` 16"
for (const [reg, { names, src }] of Object.entries(REGISTRIES)) {
  const re = new RegExp('`?' + reg + '`?[^.\\n]{0,40}?(\\d+)', 'g');
  let m;
  while ((m = re.exec(doc)) !== null) {
    const claimed = Number(m[1]);
    // ignore numbers that are obviously not a count of this registry (a year, a line ref)
    if (claimed > 500) continue;
    if (claimed === names.length) continue;
    const line = doc.slice(0, m.index).split('\n').length;
    findings.push(`docs/ROADMAP.md:${line} says ${reg} holds ${claimed}, but it holds ${names.length} (${src})`);
  }
}

for (const { re, reg } of HEADING_COUNTS) {
  const m = prim.match(re);
  if (!m) { findings.push(`docs/PRIMITIVES.md has no ${reg} heading matching ${re} — the count check silently stopped running`); continue; }
  const claimed = Number(m[1]);
  const real = REGISTRIES[reg].names.length;
  if (claimed !== real) {
    const line = prim.slice(0, m.index).split('\n').length;
    findings.push(`docs/PRIMITIVES.md:${line} heading says ${claimed} ${reg}, but it holds ${real} (${REGISTRIES[reg].src})`);
  }
}

// 3. The docs-site backgrounds page hand-lists the bg presets ("There are N presets:" + a
//    `preset` · `preset` · … line). It silently went stale (16 vs a real 17) when `metallic` shipped,
//    because the list is copied, not derived. Check the count AND that every BG_NAME appears.
const BG_MDX = path.join(repoRoot, 'docs-site', 'content', 'docs', 'backgrounds-and-images.mdx');
if (fs.existsSync(BG_MDX)) {
  const mdx = fs.readFileSync(BG_MDX, 'utf8');
  const cm = /There are (\d+) presets:/.exec(mdx);
  if (!cm) findings.push(`docs-site backgrounds-and-images.mdx has no "There are N presets:" line — the bg count check silently stopped running`);
  else if (+cm[1] !== BG_NAMES.length) findings.push(`docs-site backgrounds-and-images.mdx says ${cm[1]} bg presets, but core/backgrounds.js BG_NAMES holds ${BG_NAMES.length}`);
  const missing = BG_NAMES.filter((n) => !mdx.includes('`' + n + '`'));
  if (missing.length) findings.push(`docs-site backgrounds-and-images.mdx never lists bg preset(s): ${missing.join(', ')} (in core/backgrounds.js BG_NAMES)`);
}

if (!findings.length) {
  console.log(`✓ docs in sync — no shipped effect listed as missing, every quoted registry count right (ROADMAP + PRIMITIVES + bg presets)`);
  process.exit(0);
}
console.log(`DOCS DRIFT (${findings.length})\n`);
for (const f of findings) console.log(`  ✗ ${f}\n`);
console.log('A roadmap that lists shipped work as missing routes the next planning pass at phantom work.');
console.log('This has happened twice (see the standing warning at the end of ROADMAP.md).');
process.exit(1);
