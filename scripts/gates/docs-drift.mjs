// scripts/gates/docs-drift.mjs: a doc is a claim about the PAST as much as the future, and
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
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { SHADER_FX } from '../../core/stings.js';
import { AMBIENT_FX } from '../../core/shaders-ambient.js';
import { PAINT_FX_NAMES } from '../../core/paint-fx.js';
import { RESAMPLE_FX } from '../../core/resample-fx.js';
import { RAYMARCH_FX } from '../../core/raymarch-fx.js';
import { BG_NAMES } from '../../core/backgrounds.js';
import { LAYER_TYPES } from '../../core/layers/index.js';
import { gateFindings } from '../lib/findings.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const doc = fs.readFileSync(path.join(repoRoot, 'docs', 'ROADMAP.md'), 'utf8');
const f = gateFindings();

// PRIMITIVES.md states a count in its section HEADINGS (", 35 WebGL cover-the-cut effects"). Those
// decayed exactly like the roadmap's did (33 and 14 against a real 35 and 17) while this gate watched
// only one file. A gate's blind spot is rarely the rule it states; it is the file list underneath it.
const PRIM_PATH = path.join(repoRoot, 'docs', 'PRIMITIVES.md');
const prim = fs.readFileSync(PRIM_PATH, 'utf8');
// THIS TABLE SURVIVES site-counts.mjs WIDENING INTO docs/, and the reason is not the file list.
// site-counts matches "<n> <noun>" and "<noun> (<n>)"; these headings put the number AFTER the noun
// with a source path in between ("## Shader stings (`core/stings.js`), 35 WebGL cover-the-cut
// effects"), and teaching that shape to a prose matcher would pair every trailing number with the
// nearest preceding noun. It also checks something site-counts cannot: that the SENTENCE STILL
// EXISTS. A regex that misses is reported below, so deleting the heading fails; a count nobody wrote
// is a silent pass everywhere else.
const HEADING_COUNTS = [
  { re: /## Shader stings \(`core\/stings\.js`\)[,:] (\d+)/,          reg: 'SHADER_FX' },
  { re: /## Ambient shader looks \(`core\/shaders-ambient\.js`\)[,:] (\d+)/, reg: 'AMBIENT_FX' },
  { re: /the `raymarch` layer type, (\d+)/,                         reg: 'RAYMARCH_FX' },
];

const REGISTRIES = {
  SHADER_FX: { names: SHADER_FX, src: 'core/stings.js' },
  AMBIENT_FX: { names: AMBIENT_FX, src: 'core/shaders-ambient.js' },
  PAINT_FX: { names: PAINT_FX_NAMES, src: 'core/paint-fx.js' },
  RESAMPLE_FX: { names: RESAMPLE_FX, src: 'core/resample-fx.js' },
  RAYMARCH_FX: { names: RAYMARCH_FX, src: 'core/raymarch-fx.js' },
};
const every = Object.entries(REGISTRIES).flatMap(([reg, { names, src }]) => names.map((n) => ({ n, reg, src })));

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
    f.fail('absent-but-shipped', `docs/ROADMAP.md:${i + 1} calls "${n}" absent, but it ships in ${reg} (${src})`, {
      at: `docs/ROADMAP.md:${i + 1}`, fix: line.trim().slice(0, 150),
    });
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
    f.fail('count-mismatch', `docs/ROADMAP.md:${line} says ${reg} holds ${claimed}, but it holds ${names.length} (${src})`,
      { at: `docs/ROADMAP.md:${line}` });
  }
}

for (const { re, reg } of HEADING_COUNTS) {
  const m = prim.match(re);
  if (!m) { f.fail('heading-gone', `docs/PRIMITIVES.md has no ${reg} heading matching ${re}. The count check silently stopped running`); continue; }
  const claimed = Number(m[1]);
  const real = REGISTRIES[reg].names.length;
  if (claimed !== real) {
    const line = prim.slice(0, m.index).split('\n').length;
    f.fail('heading-count-mismatch', `docs/PRIMITIVES.md:${line} heading says ${claimed} ${reg}, but it holds ${real} (${REGISTRIES[reg].src})`,
      { at: `docs/PRIMITIVES.md:${line}` });
  }
}

// 3. The docs-site backgrounds page hand-lists the bg presets ("There are N presets:" + a
//    `preset` · `preset` · … line). It silently went stale (16 vs a real 17) when `metallic` shipped,
//    because the list is copied, not derived. Check the count AND that every BG_NAME appears.
const BG_MDX = path.join(repoRoot, 'docs-site', 'content', 'docs', 'backgrounds-and-images.mdx');
if (fs.existsSync(BG_MDX)) {
  const mdx = fs.readFileSync(BG_MDX, 'utf8');
  const cm = /There are (\d+) presets:/.exec(mdx);
  if (!cm) f.fail('bg-heading-gone', 'docs-site backgrounds-and-images.mdx has no "There are N presets:" line. The bg count check silently stopped running');
  else if (+cm[1] !== BG_NAMES.length) f.fail('bg-count-mismatch', `docs-site backgrounds-and-images.mdx says ${cm[1]} bg presets, but core/backgrounds.js BG_NAMES holds ${BG_NAMES.length}`);
  const missing = BG_NAMES.filter((n) => !mdx.includes('`' + n + '`'));
  if (missing.length) f.fail('bg-missing-name', `docs-site backgrounds-and-images.mdx never lists bg preset(s): ${missing.join(', ')} (in core/backgrounds.js BG_NAMES)`);
}

// 4. THE LIST IS THE HARDER HALF OF THE COUNT, and it is the half that hides the damage.
//    docs-site/content/docs/layers.mdx said "fourteen types" and then LISTED fourteen while the
//    registry held 23, so nine primitives (video, beam, svg, composition, adjust, paint, raymarch,
//    three, globe) were out of reach of anyone who took the page as the vocabulary, with nothing on
//    it admitting it was partial. site-counts.mjs now holds the NUMBER. A corrected number over a
//    list still missing nine names would be a green tick over the actual bug, so the names are
//    checked here, the same way the bg presets above are and for the same reason: the list is
//    copied, not derived.
const LAYERS_MDX = path.join(repoRoot, 'docs-site', 'content', 'docs', 'layers.mdx');
if (fs.existsSync(LAYERS_MDX)) {
  const mdx = fs.readFileSync(LAYERS_MDX, 'utf8');
  const missing = LAYER_TYPES.filter((n) => !mdx.includes('`' + n + '`'));
  if (missing.length) f.fail('layer-missing-name', `docs-site layers.mdx never names layer type(s): ${missing.join(', ')} (in core/layers/index.js LAYER_TYPES)`);
}

// GRAMMAR.md IS GENERATED, so the only way it can be wrong is by being stale. Delegated to the
// generator's own `--check` rather than re-implementing the comparison here: a second renderer would be
// the exact drift this gate exists to catch, inside the gate that catches it.
//
// It must sit ABOVE the clean-path exit. The first attempt put it below, where no finding it recorded
// could ever be printed, and the gate went on reporting "docs in sync" over a deliberately corrupted
// page. The insert had also silently failed to apply before that, and I read the green tick as a pass
// twice. Absence read as a pass, in the gate for absence read as a pass.
{
  const r = spawnSync('node', [path.join(repoRoot, 'scripts/author/grammar.mjs'), '--check'],
    { cwd: repoRoot, encoding: 'utf8' });
  if (r.status !== 0) f.fail('grammar-stale', String(r.stderr || r.stdout).replace(/✗/g, "").trim().split("\n").map((l) => l.trim()).filter(Boolean).join(" "));
}

// CLAUDE.md QUOTES NUMBERS TOO, AND IT IS THE FILE WITH THE WIDEST BLAST RADIUS. It is loaded into
// every session, so a stale figure there is repeated by whoever reads it, and its own text says so:
// "a number in this file gets quoted downstream faster than it gets checked". All three of its
// checkable counts had decayed while this gate watched two other files (566/36 against a real 638/48,
// 337 against 445, 134 against 148), which is this file's own lesson about the list underneath the rule,
// arriving a third time.
//
// Each count is read from the thing that OWNS it, never recomputed here: a second way to count the
// arsenal would be the drift this gate exists to catch, inside the gate that catches it.
{
  const claude = fs.readFileSync(path.join(repoRoot, 'AGENTS.md'), 'utf8');
  const ask = (script, args, re) => {
    const r = spawnSync('node', [path.join(repoRoot, script), ...args], { cwd: repoRoot, encoding: 'utf8' });
    const m = re.exec(String(r.stdout || '') + String(r.stderr || ''));
    return m ? m.slice(1) : null;
  };
  const effects = /(\d+) effects across (\d+) families/.exec(
    fs.readFileSync(path.join(repoRoot, 'docs/EFFECTS.md'), 'utf8'));
  const census = ask('scripts/author/arsenal.mjs', ['--census'], /ARSENAL CENSUS · (\d+) named things/);
  const scenes = ask('scripts/gates/waiver-drift.mjs', [], /WAIVER CENSUS · (\d+) scenes/);

  const CLAIMS = [
    { re: /(\d+) effects across (\d+) families/, want: effects && effects.slice(1),
      src: 'docs/EFFECTS.md, which `make effects` generates' },
    { re: /(\d+) named things/, want: census, src: 'scripts/author/arsenal.mjs --census' },
    { re: /(\d+) gate-visible scenes/, want: scenes, src: 'scripts/gates/waiver-drift.mjs' },
  ];
  for (const { re, want, src } of CLAIMS) {
    if (!want) { f.fail('claim-unreachable', `CLAUDE.md: could not reach ${src} to check its count, so it was NOT checked`); continue; }
    const said = re.exec(claude);
    if (!said) continue;   // the sentence was rewritten: nothing to check, not a failure
    const have = said.slice(1);
    if (have.join('/') !== want.join('/')) {
      f.fail('claim-mismatch', `AGENTS.md says "${said[0]}" and ${src} says ${want.join(' / ')}. `
        + 'Fix the sentence: this file is read every session, so a stale number here is repeated downstream.');
    }
  }
}

if (!f.count) {
  console.log(`✓ docs in sync: no shipped effect listed as missing, every quoted registry count right (ROADMAP + PRIMITIVES + CLAUDE.md + bg presets)`);
  f.emit();
  process.exit(0);
}
console.log(`DOCS DRIFT (${f.count})\n`);
f.emit();
console.log('A roadmap that lists shipped work as missing routes the next planning pass at phantom work.');
console.log('This has happened twice (see the standing warning at the end of ROADMAP.md).');
process.exit(1);
