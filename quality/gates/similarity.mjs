// similarity.mjs: the SAMENESS AUDIT. Two videos that share too much motion vocabulary,
// beat structure, and layout are the template problem re-emerging; this turns that taste
// judgment into a failing check (same philosophy as the contrast + motion audits).
//
//   node quality/gates/similarity.mjs a.json b.json [...]   # score the given files pairwise
//   node quality/gates/similarity.mjs                       # scan all authored data JSONs
//   make check GATE=similar [D="a.json b.json"]
//
// Fingerprint = motion vocabulary (cuts/stings/anims/presets/bgs) + beat-structure skeleton +
// layout signature (where text sits, at what scale). Cross-brand pairs FAIL above 0.75,
// warn above 0.55. Same-brand pairs only warn on identical structure (a brand may share style
// with itself; it shouldn't retell the same skeleton).
import fs from 'node:fs';
import path from 'node:path';
import { loadScene } from '../../core/engine/expand.js';
import { population, SCENE_DIR } from '../../harness/lib/census.mjs';
import { gateFindings } from '../../harness/lib/findings.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');

// ---------- fingerprint ----------
export function fingerprint(input) {
  // Lowered HERE rather than at each caller, so `make ledger` (quality/gates/ledger.mjs imports this)
  // inherits it. A film that declares its boundaries as `transitions` fingerprinted with no stings at
  // all, so two films could share a sting vocabulary and the ledger would score them as further apart
  // than they are (engine-doctrine/MISTAKES.md #408). Cloned: loadScene mutates and deletes what it is handed,
  // and a fingerprint must never rewrite the scene its caller goes on to grade.
  const data = loadScene(structuredClone(input));
  const vocab = new Set(), structure = [], layout = [], colors = new Set();
  // Category-tagged vocabulary, kept ALONGSIDE the merged `vocab` set (not instead of it): the ledger's
  // forward-looking "not" query (quality/gates/ledger.mjs) needs to say WHICH kind of thing a value is
  // (a background preset vs. a cut) to write a useful NOT line; the merged set alone can't tell them
  // apart. Purely additive, so it never touches the existing SAME/CLOSE scoring in similarity()/verdict().
  const cats = { bg: new Set(), entrance: new Set(), exit: new Set(), cut: new Set() };
  const word = (v) => { if (typeof v === 'string' && v) vocab.add(v); };
  if (Array.isArray(data.scenes)) {
    for (const sc of data.scenes) {
      structure.push(sc.type || 'scene');
      word(sc.transition); word(sc.bg); word(sc.dir && `dir:${sc.dir}`);
      if (typeof sc.bg === 'string' && sc.bg) cats.bg.add(sc.bg);
    }
  }
  if (Array.isArray(data.layers)) {
    const ls = [...data.layers].sort((a, b) => (a.start ?? 0) - (b.start ?? 0));
    for (const L of ls) {
      structure.push(L.type || 'text');
      word(L.cut); word(L.anim); word(L.out); word(L.preset); word(L.split && `split:${L.split}`);
      if (typeof L.cut === 'string' && L.cut) cats.cut.add(L.cut);
      if (typeof L.anim === 'string' && L.anim) cats.entrance.add(L.anim);
      if (typeof L.out === 'string' && L.out) cats.exit.add(L.out);
      if ((L.type || 'text') === 'text') layout.push(`${Math.round((L.x ?? 60) / 120)}:${Math.round((L.y ?? 240) / 120)}:${Math.round((L.size ?? 96) / 24)}`);
    }
  }
  for (const s of data.stings || []) word(`fx:${s.fx}`);
  for (const b of data.bg || []) { word(`bg:${b.preset}`); if (typeof b.preset === 'string' && b.preset) cats.bg.add(b.preset); }
  (function scanColors(o) { if (Array.isArray(o)) o.forEach(scanColors); else if (o && typeof o === 'object') Object.values(o).forEach(scanColors);
    else if (typeof o === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(o)) colors.add(o.toLowerCase()); })(data);
  return { theme: typeof data.theme === 'string' ? data.theme : (data.module || 'inline'), module: data.module,
    vocab: [...vocab].sort(), structure, layout: layout.sort(), colors: [...colors].sort(),
    cats: { bg: [...cats.bg].sort(), entrance: [...cats.entrance].sort(), exit: [...cats.exit].sort(), cut: [...cats.cut].sort() } };
}

// ---------- scoring ----------
const jaccard = (A, B) => { const a = new Set(A), b = new Set(B); if (!a.size && !b.size) return 0; let i = 0; for (const x of a) if (b.has(x)) i++; return i / (a.size + b.size - i); };
function editSim(A, B) { // 1 − normalized levenshtein over the beat skeletons
  const n = A.length, m = B.length;
  if (!n && !m) return 0;
  const d = Array.from({ length: n + 1 }, (_, i) => [i, ...Array(m).fill(0)]);
  for (let j = 1; j <= m; j++) d[0][j] = j;
  for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (A[i - 1] === B[j - 1] ? 0 : 1));
  return 1 - d[n][m] / Math.max(n, m);
}
export function similarity(fa, fb) {
  const vocab = jaccard(fa.vocab, fb.vocab);
  const struct = editSim(fa.structure, fb.structure);
  const hasLayout = fa.layout.length && fb.layout.length;
  const layout = hasLayout ? jaccard(fa.layout, fb.layout) : 0;
  const score = hasLayout ? 0.4 * vocab + 0.35 * struct + 0.25 * layout : 0.55 * vocab + 0.45 * struct;
  return { score, vocab, struct, layout: hasLayout ? layout : null, colors: jaccard(fa.colors, fb.colors) };
}
export const verdict = (s, sameBrand) => sameBrand
  ? (s.struct > 0.9 ? 'SAME-SKELETON' : 'ok')
  : (s.score > 0.75 ? 'SAME' : s.score > 0.55 ? 'CLOSE' : 'distinct');

// ---------- CLI ----------
if (process.argv[1] && process.argv[1].endsWith('similarity.mjs')) {
  const rawArgs = process.argv.slice(2).filter((a) => a !== '--json');
  const explicit = rawArgs.length > 0;
  let files = rawArgs;
  if (!files.length) {
    // authored data only: skip schemas, bundled samples, and the transitions showcase
    files = population('similarity', { filter: (f) => !/^(schema|sample|cuts-demo)\.json$|^sample/.test(f) })
      .names.map((f) => path.join(SCENE_DIR, f));
  }
  const f = gateFindings();
  // A `.template.json` holds mustache placeholders, so it is not JSON and never was a video. One of
  // them threw out of the scan and killed the WHOLE library audit, which is why `make check GATE=similar` with no
  // arguments reported nothing at all. Name the skip; an explicitly listed file still throws.
  const fps = [];
  for (const ff of files) {
    let data;
    try { data = JSON.parse(fs.readFileSync(path.resolve(ROOT, ff), 'utf8')); }
    catch (e) { if (explicit) throw e; console.log(`   · skipped ${path.basename(ff)} (not parseable JSON)`); continue; }
    let fp;
    try { fp = fingerprint(data); }
    catch (e) { if (explicit) throw e; console.log(`   · skipped ${path.basename(ff)} (${e.message})`); continue; }
    fps.push({ f: ff, fp });
  }
  let hard = 0, warn = 0;
  console.log('==================== SIMILARITY AUDIT ====================');
  for (let i = 0; i < fps.length; i++) for (let j = i + 1; j < fps.length; j++) {
    const A = fps[i], B = fps[j];
    const sameBrand = A.fp.theme === B.fp.theme;
    const s = similarity(A.fp, B.fp);
    const v = verdict(s, sameBrand);
    if (v === 'ok' || v === 'distinct') continue;
    if (v === 'SAME') hard++; else warn++;
    console.log(`${v === 'SAME' ? '✗ SAME ' : '~ ' + v.toLowerCase()}  ${path.basename(A.f)} ↔ ${path.basename(B.f)}${sameBrand ? ' (same brand)' : ''}`);
    console.log(`    score ${(s.score * 100).toFixed(0)}% · vocab ${(s.vocab * 100).toFixed(0)}% · structure ${(s.struct * 100).toFixed(0)}%${s.layout != null ? ` · layout ${(s.layout * 100).toFixed(0)}%` : ''}`);
    const summary = `${path.basename(A.f)} ↔ ${path.basename(B.f)}${sameBrand ? ' (same brand)' : ''}: score ${(s.score * 100).toFixed(0)}% · vocab ${(s.vocab * 100).toFixed(0)}% · structure ${(s.struct * 100).toFixed(0)}%${s.layout != null ? ` · layout ${(s.layout * 100).toFixed(0)}%` : ''}`;
    if (v === 'SAME') f.fail('similarity-same', summary); else f.warn('similarity-close', summary);
  }
  if (!hard && !warn) console.log(`✓ ${fps.length} video(s), all pairs distinct`);
  else console.log(`${hard ? '✗ ' + hard + ' SAME pair(s), differentiate before shipping' : '~ ' + warn + ' close pair(s)'}`);
  process.exit(hard ? 1 : 0);
}
