// similarity.mjs — the SAMENESS AUDIT. Two videos that share too much motion vocabulary,
// beat structure, and layout are the template problem re-emerging; this turns that taste
// judgment into a failing check (same philosophy as the contrast + motion audits).
//
//   node scripts/gates/similarity.mjs a.json b.json [...]   # score the given files pairwise
//   node scripts/gates/similarity.mjs                       # scan all authored data JSONs
//   make similar [D="a.json b.json"]
//
// Fingerprint = motion vocabulary (cuts/stings/anims/presets/bgs) + beat-structure skeleton +
// layout signature (where text sits, at what scale). Cross-brand pairs FAIL above 0.75,
// warn above 0.55. Same-brand pairs only warn on identical structure (a brand may share style
// with itself; it shouldn't retell the same skeleton).
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');

// ---------- fingerprint ----------
export function fingerprint(data) {
  const vocab = new Set(), structure = [], layout = [], colors = new Set();
  const word = (v) => { if (typeof v === 'string' && v) vocab.add(v); };
  if (Array.isArray(data.scenes)) {
    for (const sc of data.scenes) {
      structure.push(sc.type || 'scene');
      word(sc.transition); word(sc.bg); word(sc.dir && `dir:${sc.dir}`);
    }
  }
  if (Array.isArray(data.layers)) {
    const ls = [...data.layers].sort((a, b) => (a.start ?? 0) - (b.start ?? 0));
    for (const L of ls) {
      structure.push(L.type || 'text');
      word(L.cut); word(L.anim); word(L.out); word(L.preset); word(L.split && `split:${L.split}`);
      if ((L.type || 'text') === 'text') layout.push(`${Math.round((L.x ?? 60) / 120)}:${Math.round((L.y ?? 240) / 120)}:${Math.round((L.size ?? 96) / 24)}`);
    }
  }
  for (const s of data.stings || []) word(`fx:${s.fx}`);
  for (const b of data.bg || []) word(`bg:${b.preset}`);
  (function scanColors(o) { if (Array.isArray(o)) o.forEach(scanColors); else if (o && typeof o === 'object') Object.values(o).forEach(scanColors);
    else if (typeof o === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(o)) colors.add(o.toLowerCase()); })(data);
  return { theme: typeof data.theme === 'string' ? data.theme : (data.module || 'inline'), module: data.module,
    vocab: [...vocab].sort(), structure, layout: layout.sort(), colors: [...colors].sort() };
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
  let files = process.argv.slice(2);
  if (!files.length) {
    // authored data only: skip schemas, bundled samples, and the transitions showcase
    files = fs.readdirSync(path.join(ROOT, 'formats'), { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .flatMap((d) => fs.readdirSync(path.join(ROOT, 'formats', d.name))
        .filter((f) => f.endsWith('.json') && !/^(schema|sample|cuts-demo)\.json$|^sample/.test(f))
        .map((f) => path.join('formats', d.name, f)));
  }
  const fps = files.map((f) => {
    const data = JSON.parse(fs.readFileSync(path.resolve(ROOT, f), 'utf8'));
    return { f, fp: fingerprint(data) };
  });
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
  }
  if (!hard && !warn) console.log(`✓ ${fps.length} video(s), all pairs distinct`);
  else console.log(`${hard ? '✗ ' + hard + ' SAME pair(s) — differentiate before shipping' : '~ ' + warn + ' close pair(s)'}`);
  process.exit(hard ? 1 : 0);
}
