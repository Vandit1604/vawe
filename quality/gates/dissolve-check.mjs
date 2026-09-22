// quality/gates/dissolve-check.mjs: IS ANY TRANSITION A DOUBLE EXPOSURE?
//
// A crossfade is the reflex for "A becomes B". For TEXT it is the wrong move: two strings at half
// opacity on top of each other are not a transition, they are a double exposure, and the midpoint of
// every one of them is illegible. Legible before, legible after, mush through the middle.
//
// This is the most-repeated defect in this repo. Five instances across three films: `ledgerline-neon`
// at 5.75s, `ab4-b-ledgerline` at 3.4s and again on every row of its ledger cascade, and both the
// merchant resolve and all twenty cascade rows of `ledgerline-shown`, which was the film written to fix
// the other ones (MISTAKES #171, #174). Writing it down twice did not stop it happening a third time,
// because opacity is what a hand reaches for and a changelog does not change reflexes. So: a gate.
//
// WHY NOTHING ELSE SEES IT. Every sampling tool here lands on settled frames by construction.
// `make beats` takes first/mid/last of a beat, `inspect` reads one instant, the judge sheet picks one
// frame per beat, and `make reveal` samples from LAYER starts, so a transition living inside an html
// layer on a CSS variable is invisible to it. All of them are at their best exactly where this defect
// is at its worst.
//
// WHAT IT MEASURES. For every pair of absolutely-positioned elements that sit at the SAME point inside
// one html layer and drive their opacity from the SAME variable, it evaluates both opacity expressions
// across that variable's whole range and asks: for how much of it are BOTH visible at once? That is the
// actual defect, stated as a number. A linear pair (`var(--n)` against `calc(1 - var(--n))`) overlaps
// across most of the range and is mud. A steep threshold swap (`calc((var(--n) - 0.5) * 40)`) crosses
// in a fortieth of it and is fine. The gate does not care which form you wrote; it cares how long both
// are on screen.
//
// THE FIX IT WILL NOT FLAG, deliberately: a WIPE. One box, two strings, clipped from opposite sides by
// the same variable, so at every instant one side of the edge is fully legible before and the other
// fully legible after. An element under a `clip-path` is exempt, because that is the correct pattern.
//
// WHAT IT CANNOT DO. It reads markup, not pixels, so two strings that overlap only where a transform
// has already moved one of them apart are still flagged. It cannot see a dissolve authored between two
// separate LAYERS rather than inside one. It says nothing about a pair whose opacities move the SAME
// way (both fading out, or both in): that is a group fade, not one state replacing another.
//
//   node quality/gates/dissolve-check.mjs <scene.json> [--strict]   ·   make dissolve D=<file>
// FAIL: crossfade-mud.   Waive with {"authoring":{"allow":["crossfade-mud"]}}.
import fs from 'node:fs';
import { gateFindings } from '../../harness/lib/findings.mjs';

const file = process.argv[2];
const strict = process.argv.includes('--strict') || process.env.STRICT === '1';
if (!file) { console.error('usage: node quality/gates/dissolve-check.mjs <scene.json> [--strict]'); process.exit(2); }
if (!fs.existsSync(file)) { console.error(`✗ no such scene: ${file}`); process.exit(2); }
let d;
try { d = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { console.error(`✗ ${file} is not valid JSON: ${e.message}`); process.exit(1); }
if (d.module !== 'scene') { console.log(`  dissolve check · ${file}: not a scene module, nothing to check.`); process.exit(0); }
const allow = new Set((d.authoring && Array.isArray(d.authoring.allow)) ? d.authoring.allow : []);

// No craft literature on dissolve-legibility thresholds exists (these grade OUR OWN compositor's
// crossfade output, not a general editing question): engine-doctrine/RESEARCH/TIMING-SOURCES.md part 4/6.
const VISIBLE = 0.15;   // opacity at which a glyph is legible enough to muddy the one behind it
const MUDDY = 0.12;     // share of the driving variable's range both may share before it reads as mush
const STEPS = 101;

// A restricted CSS arithmetic evaluator. Only clamp/calc/var/numbers/operators survive; anything that
// does not reduce to bare arithmetic is skipped rather than guessed at, because a gate that guesses at
// a value it cannot parse produces findings nobody can act on.
function evalCss(expr, vars) {
  let s = String(expr).trim();
  for (let i = 0; i < 12 && /var\(/.test(s); i++) {
    s = s.replace(/var\(\s*(--[\w-]+)\s*(?:,\s*([^()]*?))?\s*\)/g, (m, name, dflt) => {
      if (Object.prototype.hasOwnProperty.call(vars, name)) return `(${vars[name]})`;
      return dflt != null && dflt !== '' ? `(${dflt})` : '(0)';
    });
  }
  // clamp() is found by BALANCED PARENTHESES, not by regex. A regex that allows one level of nesting
  // cannot read `clamp(0,calc((var(--n) - 0.5) * 40),1)`, which is the exact threshold-swap form this
  // gate's own message recommends as the fix, and substituting a var adds another level on top. The
  // first version of this file could not evaluate its own recommended answer, so every clamped swap
  // fell through to "unparseable" and was passed over. It was right about them by accident, and a
  // clamped pair that WAS mud would have been invisible.
  for (let i = 0; i < 16 && /clamp\(/.test(s); i++) {
    const call = findCall(s, 'clamp');
    if (!call) return null;
    const parts = splitTop(call.inner);
    if (parts.length !== 3) return null;
    const [lo, val, hi] = parts.map((p) => evalCss(p, vars));
    if (lo == null || val == null || hi == null) return null;
    s = s.slice(0, call.start) + `(${Math.min(Math.max(val, lo), hi)})` + s.slice(call.end + 1);
  }
  s = s.replace(/calc\(/g, '(').replace(/px|deg|em|%/g, '');
  if (!/^[\d\s+\-*/().e]+$/i.test(s)) return null;   // refuse anything that is not plain arithmetic
  try { const v = Function(`"use strict";return (${s})`)(); return Number.isFinite(v) ? v : null; }
  catch { return null; }
}
// the INNERMOST call of `name`, located by balancing parentheses so arbitrary nesting is fine.
function findCall(s, name) {
  let last = -1;
  for (let i = 0; (i = s.indexOf(`${name}(`, i)) >= 0; i++) last = i;   // innermost = last opening
  if (last < 0) return null;
  let depth = 0, j = last + name.length;
  for (; j < s.length; j++) {
    if (s[j] === '(') depth++;
    else if (s[j] === ')') { depth--; if (depth === 0) break; }
  }
  if (depth !== 0) return null;
  return { start: last, end: j, inner: s.slice(last + name.length + 1, j) };
}
function splitTop(str) {
  const out = []; let depth = 0, cur = '';
  for (const ch of str) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) { out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  out.push(cur); return out;
}

const decl = (style, prop) => {
  const m = String(style).match(new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`, 'i'));
  return m ? m[1].trim() : null;
};

const findings = [];
const layers = [];
const walk = (L) => { if (!L || typeof L !== 'object') return; layers.push(L); (L.children || []).forEach(walk); };
(Array.isArray(d.layers) ? d.layers : []).forEach(walk);

let pairsChecked = 0;
const unreadable = [];
for (const L of layers) {
  if (typeof L.html !== 'string') continue;
  // every inline-styled element, with the nesting depth of any clip-path ancestor tracked, because a
  // clipped WRAPPER is exactly the correct fix and its children must not be flagged.
  const els = [];
  const stack = [];
  const tagRe = /<(\/?)(div|span)\b([^>]*)>/gi;
  let m;
  while ((m = tagRe.exec(L.html)) !== null) {
    const closing = m[1] === '/';
    if (closing) { stack.pop(); continue; }
    const attrs = m[3] || '';
    const selfClose = /\/\s*$/.test(attrs);
    const style = (attrs.match(/style\s*=\s*"([^"]*)"/i) || [])[1] || '';
    const clipped = stack.some((s) => s.clip) || !!decl(style, 'clip-path');
    els.push({ style, clipped, at: m.index });
    if (!selfClose) stack.push({ clip: clipped });
  }
  const cands = els.filter((e) => {
    if (e.clipped) return false;                                   // a wipe: the correct pattern
    const o = decl(e.style, 'opacity');
    return o && /var\(\s*--/.test(o) && /position\s*:\s*absolute/i.test(e.style);
  });
  // group by the point they occupy. Textual equality is the right test: two elements meant to be the
  // same place are written the same way, and two written differently are not reliably comparable.
  const groups = new Map();
  for (const e of cands) {
    const key = ['left', 'top', 'right', 'bottom'].map((p) => `${p}=${decl(e.style, p) || ''}`).join('|');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(e);
  }
  for (const [key, group] of groups) {
    for (let i = 0; i < group.length; i++) for (let j = i + 1; j < group.length; j++) {
      const a = group[i], b = group[j];
      const oa = decl(a.style, 'opacity'), ob = decl(b.style, 'opacity');
      const vars = [...new Set([...`${oa} ${ob}`.matchAll(/var\(\s*(--[\w-]+)/g)].map((x) => x[1]))];
      if (vars.length !== 1) continue;                             // driven by different clocks
      const v = vars[0];
      let both = 0, ok = true;
      for (let s = 0; s < STEPS; s++) {
        const p = s / (STEPS - 1);
        const va = evalCss(oa, { [v]: p }), vb = evalCss(ob, { [v]: p });
        if (va == null || vb == null) { ok = false; break; }
        if (Math.min(va, vb) >= VISIBLE) both++;
      }
      // A pair the evaluator cannot read is NOT a pass. Saying nothing about it is how a gate reports
      // green on the thing it failed to look at, so it is counted and named instead.
      if (!ok) { unreadable.push({ layer: L.id || L.type, oa: oa.slice(0, 48), ob: ob.slice(0, 48) }); continue; }
      pairsChecked++;
      // A CROSSFADE NEEDS ONE RISING AND ONE FALLING. Two elements that fade out together, or in
      // together, are a group fade: they are both meant to be there and neither is replacing the other.
      // Flagging those made the gate wrong on two real scenes, including one where the pair carried the
      // IDENTICAL expression, which cannot be a transition between two states by construction.
      const dirA = (evalCss(oa, { [v]: 1 }) ?? 0) - (evalCss(oa, { [v]: 0 }) ?? 0);
      const dirB = (evalCss(ob, { [v]: 1 }) ?? 0) - (evalCss(ob, { [v]: 0 }) ?? 0);
      if (dirA * dirB >= 0) continue;
      const share = both / STEPS;
      if (share < MUDDY) continue;
      const blur = /filter\s*:\s*blur/i.test(a.style) || /filter\s*:\s*blur/i.test(b.style);
      findings.push({
        layer: L.id || L.type, v, share, blur, key,
        oa: oa.slice(0, 60), ob: ob.slice(0, 60),
      });
    }
  }
}

const s = (n) => `${Math.round(n * 100)}%`;
console.log(`\n  dissolve check · ${file}`);
console.log(`  ${layers.filter((L) => typeof L.html === 'string').length} html layer(s) · ${pairsChecked} same-point opacity pair(s) measured`
  + `${unreadable.length ? ` · ${unreadable.length} NOT measured (see below)` : ''}\n`);

const mud = findings.filter(() => !allow.has('crossfade-mud'));
// One fact, one owner: the record IS the finding and the five printed lines are rendered from it, so
// author-check reads `code` off a structure rather than re-reading this paragraph. The class of bug
// that costs is engine-doctrine/MISTAKES.md #401.
const F = gateFindings({ scene: file, indent: '  ', line: (r, g) => [
  `  ${g} [${r.code}] ${r.summary}`,
  `      "${r.oa}"  vs  "${r.ob}"`,
  `      A crossfade between two TEXT states is a double exposure: the midpoint is two strings at half strength, not a transition.`,
  `      ${r.fix}`,
  `      Then every instant has fully legible before on one side and fully legible after on the other. For a few glyphs, a threshold swap works too.\n`,
].join('\n') });
for (const f of findings) F.finding({
  code: 'crossfade-mud',
  severity: 'error',
  waived: allow.has('crossfade-mud'),
  at: { layer: f.layer },
  summary: `layer "${f.layer}": two elements at the same point (${f.key.replace(/\|/g, ' ')}) `
    + `cross-dissolve on ${f.v}, and BOTH stay above ${VISIBLE} opacity for ${s(f.share)} of its range`
    + `${f.blur ? ', with a blur on top of it' : ''}.`,
  fix: `Use a WIPE instead: one box, both strings, clip-path insets from opposite sides driven by ${f.v}, with a read head at the seam.`,
  oa: f.oa, ob: f.ob,
});
F.emit();
for (const u of unreadable) {
  console.log(`  ⚠ layer "${u.layer}": a same-point opacity pair this gate could NOT evaluate, so it is unjudged, not cleared.`);
  console.log(`      "${u.oa}"  vs  "${u.ob}"   (extend evalCss in ${'quality/gates/dissolve-check.mjs'} if this shape should be measurable)\n`);
}
if (!findings.length && !unreadable.length) console.log('  ✓ no transition dissolves one text state into another in place.');
else if (!findings.length) console.log('  ✓ nothing measurable dissolves, but see the unjudged pair(s) above.');
console.log(`\n  ${allow.has('crossfade-mud') ? 0 : mud.length} fail${allow.has('crossfade-mud') && findings.length ? ` · ${findings.length} waived` : ''}`);
console.log(`  (this reads markup, not pixels. It cannot see a dissolve authored between two separate LAYERS,`);
console.log(`   and it will flag two identical strings crossfading, which is harmless.)\n`);
process.exit(mud.length && !allow.has('crossfade-mud') ? 1 : 0);
