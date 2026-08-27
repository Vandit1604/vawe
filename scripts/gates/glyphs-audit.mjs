// glyphs-audit.mjs: fail the build if a 3D typeface JSON no longer matches the font it came from.
//
//   node scripts/gates/glyphs-audit.mjs
//   make glyphs-audit
//
// assets/fonts/3d/*.typeface.json are BAKED artifacts: outlines copied out of a woff2 at a moment in
// time. Nothing at render time re-reads the woff2, so when the font is re-subset or swapped, the
// stale JSON keeps loading, keeps parsing, and keeps rendering perfectly formed letters in the
// PREVIOUS font. There is no error and no visual glitch to notice, the scene simply stops being in
// the brand face. That is the same silent-substitution class this repo has shipped before, which is
// why the artifact records its source hash and why this exits non-zero rather than warning.
//
// Two checks, because the artifact can lie in two directions:
//   STALE: the source woff2's bytes no longer hash to what the artifact was built from.
//   GAPS: the artifact claims a charset it does not actually cover, so TextGeometry will hit a
//             missing glyph and quietly substitute '?' (FontLoader's fallback) mid-headline.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DIR = path.join(repoRoot, 'assets/fonts/3d');

if (!fs.existsSync(DIR)) { console.log('  · no assets/fonts/3d yet, nothing to audit'); process.exit(0); }
const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.typeface.json')).sort();
if (!files.length) { console.log('  · no typeface JSON in assets/fonts/3d, nothing to audit'); process.exit(0); }

const problems = [];
const hex = (cp) => `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`;

for (const f of files) {
  const rel = `assets/fonts/3d/${f}`;
  let data;
  try {
    data = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
  } catch (e) {
    problems.push({ rel, kind: 'UNREADABLE', msg: `not valid JSON: ${e.message}` });
    continue;
  }

  const m = data.vawe;
  if (!m?.source || !m?.sourceSha256) {
    // Without provenance the artifact is unauditable forever after, so absence is itself the failure.
    problems.push({ rel, kind: 'NO-PROVENANCE', msg: 'no vawe.source/sourceSha256 block. Rebuild it: node scripts/fonts/glyphs.mjs <Name>' });
    continue;
  }

  const srcPath = path.join(repoRoot, m.source);
  if (!fs.existsSync(srcPath)) {
    problems.push({ rel, kind: 'SOURCE-GONE', msg: `its source ${m.source} no longer exists` });
    continue;
  }
  const actual = crypto.createHash('sha256').update(fs.readFileSync(srcPath)).digest('hex');
  if (actual !== m.sourceSha256) {
    problems.push({ rel, kind: 'STALE', msg:
      `${m.source} has changed since this was baked\n      baked from sha256:${m.sourceSha256.slice(0, 16)}\n      file is now  sha256:${actual.slice(0, 16)}\n      Rebuild: node scripts/fonts/glyphs.mjs ${path.basename(m.source, '.woff2')}${m.weight ? ` --weight ${m.weight}` : ''}` });
    continue;
  }

  // Coverage. The artifact states the range it covers; hold it to that claim.
  const glyphs = data.glyphs || {};
  const missing = [];
  const empty = [];
  for (const [lo, hi] of (m.ranges || [])) {
    for (let cp = lo; cp <= hi; cp++) {
      const ch = String.fromCodePoint(cp);
      const g = glyphs[ch];
      if (!g) { missing.push(cp); continue; }
      // Space legitimately has no contours; anything else with an empty outline is an invisible
      // glyph that will render as a hole in the middle of a word.
      if (cp !== 0x20 && !g.o) empty.push(cp);
    }
  }
  if (missing.length) problems.push({ rel, kind: 'GAPS', msg:
    `claims charset "${m.charset}" but is missing ${missing.length} glyph(s): ${missing.slice(0, 12).map(hex).join(' ')}${missing.length > 12 ? ' …' : ''}` });
  if (empty.length) problems.push({ rel, kind: 'GAPS', msg:
    `${empty.length} glyph(s) have an EMPTY outline and would render as blanks: ${empty.slice(0, 12).map(hex).join(' ')}${empty.length > 12 ? ' …' : ''}` });

  if (!missing.length && !empty.length) {
    console.log(`  ✓ ${f.padEnd(28)} ${String(Object.keys(glyphs).length).padStart(3)} glyphs  charset=${m.charset}  weight=${m.weight ?? 'static'}  ← ${m.source}`);
  }
}

if (problems.length) {
  console.error(`\n✗ glyphs audit FAILED: ${problems.length} problem(s) in assets/fonts/3d:\n`);
  for (const p of problems) console.error(`  ✗ ${p.rel}  [${p.kind}]\n      ${p.msg}\n`);
  console.error('A stale typeface JSON renders flawlessly in the WRONG font. Nothing else will tell you.');
  process.exit(1);
}
console.log(`\n✓ glyphs audit OK: ${files.length} typeface artifact(s), each matching its source woff2 and covering the charset it claims`);
