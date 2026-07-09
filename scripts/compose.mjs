// scripts/compose.mjs — deterministic storyboard compiler: dna/<name>.json → a complete, renderable
// scenes JSON. Same DNA + same flags → byte-identical output (no Date, no random). The draft it emits
// is meant to be RENDERABLE AS-IS and then copy-polished by a human — it never invents numbers
// (stats only come from an explicit dna.stats) and every line of copy is lifted from the site.
//
//   node scripts/compose.mjs dna/<name>.json [--format brandfilm|demo|launch] [--duration 30]
//                            [--out path] [--write]
//   make compose DNA=dna/plinth-auto.json [FORMAT=brandfilm] [DUR=40] [WRITE=1]
//
// Dry-run (default) prints the beat table + JSON; --write saves to formats/<format>/<name>.json.
// Mirrors scripts/assets.mjs (dry-run/--write) and self-validates against the format schema.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateData } from './validate.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const dnaPath = args.find((a) => !a.startsWith('--') && a.endsWith('.json'));
const FORMAT = flag('--format', 'brandfilm');
const TARGET = parseFloat(flag('--duration', '30'));
const WRITE = args.includes('--write');
if (!dnaPath) { console.error('usage: node scripts/compose.mjs dna/<name>.json [--format brandfilm|demo|launch] [--duration 30] [--write]'); process.exit(1); }

const dna = JSON.parse(fs.readFileSync(path.resolve(ROOT, dnaPath), 'utf8'));
const P = dna.product || {};
const light = (dna.dominant || dna.colors?.dominant) !== 'dark';
const host = (() => { try { return new URL(dna.url).hostname; } catch { return dna.url || ''; } })();
const themeName = fs.existsSync(path.join(ROOT, 'themes', `${dna.name}.json`)) ? dna.name : undefined;

// ---------- deterministic heading classifier ----------
const H = (P.headings || []).filter((h) => h && h !== P.tagline);
const stepsIntroIdx = H.findIndex((h) => /\b(steps?|how it works|how\b)\b/i.test(h));
const stepsIntro = stepsIntroIdx >= 0 ? H[stepsIntroIdx] : '';
const steps = (stepsIntroIdx >= 0 ? H.slice(stepsIntroIdx + 1) : H.slice(1))
  .filter((h) => h.length >= 8 && h.length <= 46).slice(0, 3);
const ctaHeading = [...H].reverse().find((h) => /^(publish|start|get|join|try|build|launch|sign|ship|create)\b/i.test(h) || /\b(minutes?|today|now|free)\b/i.test(h)) || '';
const used = new Set([stepsIntro, ctaHeading, ...steps]);
const pool = H.filter((h) => !used.has(h) && h.length >= 10 && h.length <= 52);
const features = pool.slice(0, 4);
const statements = (P.description || '').split(/(?<=\.)\s+/).map((s) => s.trim()).filter((s) => s.length >= 20 && s.length <= 90).slice(0, 2);
const spare = pool.slice(4);                          // leftover headings back up the statements
while (statements.length < 2 && spare.length) statements.push(spare.shift());

// ---------- background strategy (from identity.bgStrategy dominance) ----------
const DARK_ROT = ['aurora', 'spotlight', 'constellation', 'brandglow'];
let darkI = 0;
const bgFor = (slot) => light
  ? { bg: slot === 'hook' ? 'paperShapes' : slot === 'cta' ? 'soft' : 'paper', value: 'light' }   // plain by default, texture on hook/CTA only
  : { bg: slot === 'hook' || slot === 'cta' ? 'brandglow' : DARK_ROT[darkI++ % DARK_ROT.length], value: 'dark' };

// ---------- beat plan ----------
function planBrandfilm() {
  const beats = [];
  beats.push({ type: 'title', ...bgFor('hook'), eyebrow: `NEW · ${(P.name || dna.name || '').toUpperCase()}`, title: P.tagline || P.name });
  for (const s of statements) beats.push({ type: 'statement', ...bgFor('mid'), text: s });
  if (steps.length >= 2) beats.push({ type: 'steps', ...bgFor('mid'), title: stepsIntro || 'How it works', steps: steps.map((h, i) => ({ n: '0' + (i + 1), h, d: '' })) });
  if (features.length >= 2) beats.push({ type: 'features', ...bgFor('mid'), title: 'Why it wins', items: features.map((h) => ({ h, d: '' })) });
  if (Array.isArray(dna.stats) && dna.stats.length) beats.push({ type: 'stats', ...bgFor('mid'), stats: dna.stats.slice(0, 4) }); // numbers ONLY from explicit dna.stats
  if (P.tagline) beats.push({ type: 'quote', ...bgFor('mid'), text: P.tagline, cite: host });
  beats.push({ type: 'cta', ...bgFor('cta'), logo: dna.favicon || undefined, cta: ctaHeading || `Try ${P.name || dna.name}.`, url: host });
  return beats;
}
function planDemo() {
  const beats = [];
  beats.push({ type: 'title', bg: light ? 'paperShapes' : 'ink', eyebrow: `NEW · ${(P.name || '').toUpperCase()}`, title: P.tagline || P.name });
  for (const s of statements.slice(0, 1)) beats.push({ type: 'statement', bg: 'paper', text: s });
  if (Array.isArray(dna.demo?.lines) && dna.demo.lines.length) beats.push({ type: 'code', bg: 'paper', lines: dna.demo.lines });
  if (steps.length >= 2) beats.push({ type: 'deploy', bg: 'paper', title: stepsIntro || 'How it works', steps: steps.map((lb) => ({ ic: 'bolt', lb })), url: host });
  beats.push({ type: 'cta', bg: light ? 'soft' : 'accent', logo: dna.favicon || undefined, cta: ctaHeading || `Try ${P.name || dna.name}.`, url: host });
  return beats;
}

// ---------- duration budget: weights × target, clamped per type, residual spread deterministically ----------
const WEIGHT = { title: 1.2, statement: 0.9, code: 1.6, deploy: 1.5, steps: 1.5, stats: 1.3, features: 1.4, quote: 1.0, cta: 1.3 };
const CLAMP = { title: [3.0, 4.6], statement: [2.6, 3.6], code: [5.0, 7.0], deploy: [4.4, 6.0], steps: [4.2, 5.6], stats: [3.6, 4.8], features: [4.0, 5.2], quote: [2.8, 3.8], cta: [4.0, 5.0] };
function budget(beats, target) {
  const wSum = beats.reduce((a, b) => a + (WEIGHT[b.type] || 1), 0);
  const r1 = (v) => Math.round(v * 10) / 10;
  beats.forEach((b) => { const [lo, hi] = CLAMP[b.type] || [2.6, 6]; b.dur = r1(Math.min(hi, Math.max(lo, (WEIGHT[b.type] || 1) / wSum * target))); });
  // spread the residual in deterministic 0.1s steps (order: cta, title, steps/deploy, then the rest)
  const order = [...beats].sort((a, b) => ({ cta: 0, title: 1, steps: 2, deploy: 2, code: 2 }[a.type] ?? 3) - ({ cta: 0, title: 1, steps: 2, deploy: 2, code: 2 }[b.type] ?? 3));
  let guard = 400;
  let diff = r1(target - beats.reduce((a, b) => a + b.dur, 0));
  while (Math.abs(diff) >= 0.1 && guard-- > 0) {
    let moved = false;
    for (const b of order) {
      if (Math.abs(diff) < 0.1) break;
      const [lo, hi] = CLAMP[b.type] || [2.6, 6];
      if (diff > 0 && b.dur + 0.1 <= hi) { b.dur = r1(b.dur + 0.1); diff = r1(diff - 0.1); moved = true; }
      else if (diff < 0 && b.dur - 0.1 >= lo) { b.dur = r1(b.dur - 0.1); diff = r1(diff + 0.1); moved = true; }
    }
    if (!moved) break; // all clamped — accept the nearest achievable total
  }
  return beats;
}

// ---------- assemble ----------
let out;
if (FORMAT === 'launch') {
  out = { module: 'launch', orientation: 'landscape', ...(themeName && { theme: themeName }), audio: { silent: true },
    kicker: 'INTRODUCING', lines: statements.concat(features).slice(0, 3).map((text) => ({ text })),
    reveal: { name: P.name || dna.name, tagline: P.tagline || '', ...(dna.favicon && { logo: dna.favicon }) },
    date: 'LIVE NOW', cta: host };
} else {
  const beats = budget(FORMAT === 'demo' ? planDemo() : planBrandfilm(), TARGET);
  out = { module: FORMAT, orientation: 'landscape', ...(themeName && { theme: themeName }), ...(dna.favicon && FORMAT === 'brandfilm' && { brand: dna.favicon }), audio: { silent: true }, scenes: beats };
}

// ---------- self-validate against the format schema (refuse to emit an invalid draft) ----------
const schemaPath = path.join(ROOT, 'formats', FORMAT, 'schema.json');
const schema = fs.existsSync(schemaPath) ? JSON.parse(fs.readFileSync(schemaPath, 'utf8')) : null;
const errors = validateData(schema, out);
if (errors.length) { console.error(`✗ composed draft fails ${FORMAT} schema:`); errors.forEach((e) => console.error('   • ' + e)); process.exit(1); }

// ---------- report ----------
const json = JSON.stringify(out, null, 2) + '\n';
console.log(`==== COMPOSE · ${dna.name} → ${FORMAT}${out.scenes ? ` (${out.scenes.reduce((a, s) => a + s.dur, 0).toFixed(1)}s target ${TARGET}s)` : ''} ====`);
if (out.scenes) for (const s of out.scenes) console.log(`  ${s.dur.toFixed(1).padStart(4)}s  ${s.type.padEnd(10)} ${s.bg ? `[${s.bg}]`.padEnd(14) : ''.padEnd(14)} ${(s.title || s.text || s.cta || '').slice(0, 60)}`);
else console.log(`  lines: ${out.lines.map((l) => JSON.stringify(l.text.slice(0, 40))).join(' · ')}\n  reveal: ${out.reveal.name} — ${out.reveal.tagline}`);

const outPath = flag('--out', path.join(ROOT, 'formats', FORMAT, `${dna.name}.json`));
if (WRITE) { fs.writeFileSync(outPath, json); console.log(`\n✓ written → ${path.relative(ROOT, outPath)}   (render: make video D=${path.relative(ROOT, outPath)})`); }
else { console.log('\n' + json + `dry-run — add --write to save → ${path.relative(ROOT, outPath)}`); }
