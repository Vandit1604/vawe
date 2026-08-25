// scripts/gates/copy-check.mjs — THE COPY GATE. On-screen words regress to the mean the same way
// hand-written HTML does: a hook that buries its strong word, marketing jargon ("seamless", "leverage"),
// a vague quantifier where a real number belongs, a headline that just restates the one before it, a big
// number set as flat text instead of counting up. `validate` catches the em-dash; this catches the WRITING.
// It reads the on-screen text layers and coaches toward the CLAUDE.md copy rules (hook ≤ ~12 words,
// front-load the strong word, be specific, numbers are heroes).
//
//   node scripts/gates/copy-check.mjs <scene.json> [--strict]   ·   make copy-check D=<file>
// WARN by default (coaching); --strict blocks. Not taste-policing — it flags the specific tells that make
// copy read as generated, so you reach past them.
import fs from 'node:fs';
import { onScreenText as stripTags } from '../lib/text.mjs';
import { flattenLayers } from '../lib/layers.mjs';

const file = process.argv[2];
const strict = process.argv.includes('--strict');
if (!file || !fs.existsSync(file)) { console.error('usage: node scripts/gates/copy-check.mjs <scene.json> [--strict]'); process.exit(2); }
const data = JSON.parse(fs.readFileSync(file, 'utf8'));

// marketing filler + AI-slop vocabulary — each reads as "someone who had nothing specific to say".
const JARGON = ['seamless', 'seamlessly', 'leverage', 'leveraging', 'cutting-edge', 'cutting edge', 'revolutionary',
  'world-class', 'world class', 'best-in-class', 'best in class', 'next-generation', 'next generation', 'next-gen',
  'game-changer', 'game changer', 'game-changing', 'synergy', 'synergies', 'robust', 'state-of-the-art',
  'state of the art', 'unlock', 'unleash', 'empower', 'empowering', 'delight', 'effortless', 'effortlessly',
  'innovative', 'innovation', 'supercharge', 'turbocharge', 'frictionless', 'bleeding-edge', 'paradigm',
  'elevate', 'unparalleled', 'transformative', 'reimagine', 'reimagining'];
const VAGUE = ['many', 'tons of', 'lots of', 'a lot of', 'countless', 'numerous', 'plenty of', 'tons', 'loads of', 'so much', 'so many'];
const WEAK_OPENER = ['the', 'a', 'an', 'we', 'our', 'it', 'this', 'that', 'here', 'introducing', 'meet', 'welcome', 'discover', 'presenting'];

const flat = flattenLayers(data.layers);
const words = (s) => stripTags(s).trim().split(/\s+/).filter(Boolean);
const norm = (s) => stripTags(s).toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const emojiCount = (s) => ([...stripTags(s)].filter((c) => /\p{Extended_Pictographic}/u.test(c))).length;

// on-screen copy = text/count layers with real words. Sort by start for hook detection.
const texts = flat.filter((l) => (l.type === 'text' || l.type === 'count' || l.type == null) && typeof l.text === 'string' && stripTags(l.text).trim())
  .map((l) => ({ l, t: l.start ?? 0, size: l.size ?? 96, txt: stripTags(l.text).trim() }))
  .sort((a, b) => a.t - b.t);
const headlines = texts.filter((x) => x.size >= 40 && x.l.font !== 'mono');

const findings = [];
const warn = (code, msg) => findings.push({ code, msg });

// ── the HOOK: the first big line ──
const hook = headlines[0];
if (hook) {
  const w = words(hook.txt);
  if (w.length > 12) warn('hook-length', `the hook "${hook.txt.slice(0, 48)}${hook.txt.length > 48 ? '…' : ''}" is ${w.length} words — a first-frame hook should be ≤ ~12, front-loaded. Cut it to the strong idea.`);
  if (WEAK_OPENER.includes(w[0]?.toLowerCase())) warn('hook-weak-opener', `the hook opens on "${w[0]}" — front-load the STRONG word instead of a weak lead-in (the/we/introducing…). Lead with the noun or verb that stops the scroll.`);
  if (emojiCount(hook.txt) > 1) warn('hook-emoji', `the hook has ${emojiCount(hook.txt)} emoji — a first-frame hook takes ≤ 1.`);
}

// ── jargon / vague quantifiers / long lines across all on-screen copy ──
const seenJargon = new Set();
for (const x of texts) {
  const n = ' ' + norm(x.txt) + ' ';
  for (const j of JARGON) if (n.includes(' ' + j + ' ') && !seenJargon.has(j)) { seenJargon.add(j); warn('jargon', `"${j}" in "${x.txt.slice(0, 40)}${x.txt.length > 40 ? '…' : ''}" — marketing filler / AI-slop vocabulary. Say the specific, true thing instead.`); }
  for (const v of VAGUE) if (n.includes(' ' + v + ' ')) { warn('vague-quantifier', `"${v}" in "${x.txt.slice(0, 40)}…" — a vague quantifier where a REAL number lands harder. Use the actual figure.`); break; }
  if (x.size >= 40 && words(x.txt).length > 14) warn('line-length', `"${x.txt.slice(0, 44)}…" is ${words(x.txt).length} words at ${x.size}px — too long to read in a beat. One idea per line.`);
}

// ── a big number set as FLAT text instead of a count-up (numbers are heroes) ──
for (const x of texts) {
  if (x.l.type === 'count') continue;
  const m = /\b\d[\d,]{3,}\b|\b\d+(\.\d+)?\s?(million|billion|k|m|b)\b/i.exec(x.txt);
  if (m && x.size >= 40) warn('number-not-count', `"${x.txt.slice(0, 40)}" sets a big number as flat text — make it a { "type":"count" } so it counts UP and reads as the hero (count.js compacts ≥1e6).`);
}

// ── a headline that just RESTATES the previous one (near-duplicate) ──
const lev = (a, b) => { const d = Array.from({ length: b.length + 1 }, (_, j) => j); for (let i = 1; i <= a.length; i++) { let p = d[0]; d[0] = i; for (let j = 1; j <= b.length; j++) { const t = d[j]; d[j] = Math.min(d[j] + 1, d[j - 1] + 1, p + (a[i - 1] === b[j - 1] ? 0 : 1)); p = t; } } return d[b.length]; };
for (let i = 1; i < headlines.length; i++) {
  const a = norm(headlines[i - 1].txt), b = norm(headlines[i].txt);
  if (a.length < 6 || b.length < 6) continue;
  const sim = 1 - lev(a, b) / Math.max(a.length, b.length);
  if (sim >= 0.8) warn('restated-headline', `"${headlines[i].txt.slice(0, 36)}…" is ~${Math.round(sim * 100)}% the same as the headline before it — a restatement earns no frame. Advance the idea or cut the beat.`);
}

// ── report ──
console.log(`\n  copy gate · ${file}  (${texts.length} on-screen line(s)${hook ? `, hook: "${hook.txt.slice(0, 40)}"` : ''})`);
if (!findings.length) {
  // NO TEXT IS NOT CLEAN COPY. Every rule in this gate needs a string to read, so a scene with none
  // scored the identical green tick as one that was examined and cleared. State which happened.
  console.log(texts.length
    ? `  ✓ copy reads specific — no hook/jargon/restatement tells across ${texts.length} line(s).\n`
    : `  ○ NO on-screen text in this scene, so every rule in this gate had nothing to read.\n`
      + `    That is not a clean bill of copy; it is an empty subject.\n`);
  process.exit(0);
}
console.log(`  ${findings.length} copy tell(s):`);
for (const f of findings) console.log(`    ~ [${f.code}] ${f.msg}`);
console.log(strict ? `\n  ✗ copy gate (strict): tighten the writing before shipping.\n` : `\n  reach past these — the copy is the video's voice. (Block with --strict / STRICT=1.)\n`);
process.exit(strict && findings.length ? 1 : 0);
