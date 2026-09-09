// glyphs.mjs: turn a vendored woff2 into a three.js "typeface JSON" of glyph OUTLINES.
//
//   node generators/fonts/glyphs.mjs Anybody
//   node generators/fonts/glyphs.mjs assets/fonts/Fraunces.woff2 --weight 900
//   make glyphs FONT=Anybody WEIGHT=700
//
// three.js TextGeometry extrudes vector outlines, so it cannot read a woff2 the way the browser
// does. It needs the contours as numbers. Every font in this repo is woff2 (Brotli-compressed,
// with a transformed `glyf` table), so the chain is:
//
//   woff2 --wawoff2--> ttf --fontkit--> outlines --> typeface JSON
//
// Both are BUILD-TIME ONLY devDependencies. Nothing here is imported by core/, by scene.html, or by
// anything the browser loads: the runtime contract and the page weight are unchanged, which is the
// only reason adding two dependencies is acceptable at all.
//
// WHY fontkit AND NOT opentype.js: every face in assets/fonts/ is a VARIABLE font, and opentype.js
// reads only the default master. Anybody's default master is wght=100, Thin. Extracting it would
// have produced a real-looking file that renders the brand headline in a hairline weight, i.e. the
// silent-substitution failure this repo has been burned by before (MISTAKES: the wrong font shipped
// because nothing said it had been swapped). fontkit applies gvar deltas, so we bake the weight we
// actually asked for. fontkit cannot read woff2's cmap directly, hence wawoff2 in front of it.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import * as wawoff2 from 'wawoff2';
import * as fontkit from 'fontkit';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT_DIR = path.join(repoRoot, 'assets/fonts/3d');

// Printable ASCII. A headline needs letters, digits and punctuation; it does not need 3000 CJK
// glyphs, and every glyph baked is bytes shipped, so the subset is the DEFAULT and widening is opt-in.
const CHARSETS = {
  ascii: [[0x20, 0x7e]],
  latin1: [[0x20, 0x7e], [0xa0, 0xff]],
};

// A 3D headline is a display use. Baking a variable font at its default master would give Anybody at
// Thin, whose stems extrude into slivers. 700 is the honest default for the job; it is recorded in
// the artifact and printed on every run, so it is a stated choice and never a silent one.
const DEFAULT_WEIGHT = 700;

function die(msg) {
  console.error(`\n✗ ${msg}\n`);
  process.exit(1);
}

// Accept either a bare family name or a path, so `make glyphs FONT=Anybody` works.
function resolveSource(arg) {
  const candidates = arg.endsWith('.woff2')
    ? [path.resolve(arg), path.join(repoRoot, arg)]
    : [path.join(repoRoot, 'assets/fonts', `${arg}.woff2`), path.join(repoRoot, 'assets/fonts/local', `${arg}.woff2`)];
  const hit = candidates.find((p) => fs.existsSync(p));
  if (!hit) die(`no woff2 found for "${arg}". Looked in:\n    ${candidates.map((p) => path.relative(repoRoot, p)).join('\n    ')}`);
  return hit;
}

function parseArgs(argv) {
  const positional = [];
  const opts = { weight: null, charset: 'ascii', chars: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--weight') opts.weight = Number(argv[++i]);
    else if (a === '--charset') opts.charset = argv[++i];
    else if (a === '--chars') opts.chars = argv[++i];
    else if (a.startsWith('--')) die(`unknown flag ${a}`);
    else positional.push(a);
  }
  if (!positional.length) die('usage: node generators/fonts/glyphs.mjs <Name|path.woff2> [--weight N] [--charset ascii|latin1] [--chars "ABC123"]');
  return { source: positional[0], ...opts };
}

// Codepoints to bake, always ascending and de-duplicated so the output order cannot depend on
// argument order.
function codepointsFor({ charset, chars }) {
  if (chars) {
    const set = new Set([...chars].map((c) => c.codePointAt(0)));
    return { list: [...set].sort((a, b) => a - b), label: 'custom', ranges: null };
  }
  const ranges = CHARSETS[charset];
  if (!ranges) die(`unknown charset "${charset}" (known: ${Object.keys(CHARSETS).join(', ')})`);
  const list = [];
  for (const [lo, hi] of ranges) for (let cp = lo; cp <= hi; cp++) list.push(cp);
  return { list, label: charset, ranges };
}

// Rounding is what makes this deterministic. fontkit interpolates variable-font deltas in floating
// point (an advance width comes back as 1459.136962890626), so unrounded output would be at the
// mercy of the last bit. At 1000-2000 units/em, integers are well below a pixel at any render size.
const r = (n) => Math.round(n);

// three's FontLoader reads curve arguments END-POINT FIRST, then the controls, the inverse of every
// canvas/path API. Getting this backwards yields a file that parses fine and renders as knotted
// spaghetti, so the reversal is done here, once, deliberately.
//   q  endX endY  cpX cpY
//   b  endX endY  cp1X cp1Y  cp2X cp2Y
function outlineFor(glyphPath) {
  const out = [];
  for (const c of glyphPath.commands) {
    const a = c.args;
    switch (c.command) {
      case 'moveTo': out.push('m', r(a[0]), r(a[1])); break;
      case 'lineTo': out.push('l', r(a[0]), r(a[1])); break;
      case 'quadraticCurveTo': out.push('q', r(a[2]), r(a[3]), r(a[0]), r(a[1])); break;
      case 'bezierCurveTo': out.push('b', r(a[4]), r(a[5]), r(a[0]), r(a[1]), r(a[2]), r(a[3])); break;
      case 'closePath': break; // ShapePath closes each subpath itself
      default: die(`unhandled path command "${c.command}". The outline would be silently incomplete`);
    }
  }
  return out.join(' ');
}

const args = parseArgs(process.argv.slice(2));
const sourcePath = resolveSource(args.source);
const sourceRel = path.relative(repoRoot, sourcePath).split(path.sep).join('/');
const woff2 = fs.readFileSync(sourcePath);
const sourceSha256 = crypto.createHash('sha256').update(woff2).digest('hex');

let ttf;
try {
  ttf = Buffer.from(await wawoff2.decompress(woff2));
} catch (e) {
  die(`could not decompress ${sourceRel}: ${e.message}`);
}

const base = fontkit.create(ttf);
if (base.type !== 'TTF' && base.type !== 'WOFF2' && !base.unitsPerEm) die(`${sourceRel} did not parse as a usable font`);

const axis = base.variationAxes?.wght || null;
let weight = null;
let font = base;
if (axis) {
  const want = args.weight ?? DEFAULT_WEIGHT;
  weight = Math.min(axis.max, Math.max(axis.min, want));
  if (weight !== want) console.log(`  ⚠ weight ${want} is outside this font's wght axis [${axis.min}, ${axis.max}], clamped to ${weight}`);
  font = base.getVariation({ wght: weight });
} else if (args.weight != null) {
  // Accepting a flag and then ignoring it is exactly how the wrong font ships. Say so.
  die(`${sourceRel} is a STATIC font (no wght axis): --weight ${args.weight} cannot be applied. Drop the flag, or vendor the weight you want as its own woff2.`);
}

const { list: codepoints, label: charsetLabel, ranges } = codepointsFor(args);

const glyphs = {};
const missing = [];
for (const cp of codepoints) {
  const ch = String.fromCodePoint(cp);
  const g = font.glyphForCodePoint(cp);
  if (!g || g.id === 0) { missing.push(cp); continue; } // .notdef, a blank box is not a glyph
  glyphs[ch] = {
    ha: r(g.advanceWidth),
    x_min: r(g.bbox.minX),
    x_max: r(g.bbox.maxX),
    o: outlineFor(g.path),
  };
}
if (missing.length) {
  die(`${sourceRel} has no glyph for ${missing.length} requested codepoint(s): `
    + missing.map((cp) => `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`).join(' ')
    + `\n  Bake a narrower --charset, or vendor a font that covers them. Emitting .notdef boxes would render as blanks.`);
}

const name = path.basename(sourcePath, '.woff2');
const typeface = {
  glyphs,
  familyName: name,
  ascender: r(base.ascent),
  descender: r(base.descent),
  underlinePosition: r(base.underlinePosition ?? 0),
  underlineThickness: r(base.underlineThickness ?? 0),
  boundingBox: { yMin: r(base.bbox.minY), xMin: r(base.bbox.minX), yMax: r(base.bbox.maxY), xMax: r(base.bbox.maxX) },
  resolution: base.unitsPerEm,
  original_font_information: { postscript_name: base.postscriptName, font_family_name: name },
  cssFontWeight: weight == null ? 'normal' : String(weight),
  cssFontStyle: 'normal',
  // Provenance. Without it a stale artifact is undetectable: the JSON stays syntactically perfect
  // forever while the woff2 underneath it changes. scripts/gates/glyphs-audit.mjs reads this.
  vawe: {
    generator: 'generators/fonts/glyphs.mjs',
    source: sourceRel,
    sourceSha256,
    weight,
    charset: charsetLabel,
    ranges,
    glyphCount: Object.keys(glyphs).length,
  },
};

fs.mkdirSync(OUT_DIR, { recursive: true });
const outPath = path.join(OUT_DIR, `${name}.typeface.json`);
// Compact, single line, trailing newline: a build artifact, and every byte is shipped to whoever
// loads it. Key order is fixed by construction above, so the bytes are a pure function of the input.
fs.writeFileSync(outPath, JSON.stringify(typeface) + '\n');

const kb = (fs.statSync(outPath).size / 1024).toFixed(1);
console.log(`  ✓ ${name.padEnd(16)} ${String(typeface.vawe.glyphCount).padStart(3)} glyphs  charset=${charsetLabel}  weight=${weight ?? 'static'}  upem=${typeface.resolution}  ${kb}K`);
console.log(`    ${sourceRel}  sha256:${sourceSha256.slice(0, 12)}`);
console.log(`    → ${path.relative(repoRoot, outPath)}`);
