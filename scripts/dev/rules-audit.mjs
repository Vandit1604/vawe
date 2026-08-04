// scripts/dev/rules-audit.mjs — audit the RULES, the way the rules audit the films.
//
// The repo's quality doctrine has grown monotonically: 25 craft docs, 11 gates in the ladder, 119
// mutation cases, and nothing has ever been removed. Meanwhile 54% of the scene library carries a
// waiver and 24 of those carry no written reason. A rule waived by a quarter of the library is not a
// standard, it is a comment with a gate attached, and it costs the honesty of every green check
// beside it.
//
// So each finding gets the same three questions the films get:
//   FIRES   — does it ever trigger on real work?
//   WAIVED  — when it triggers, is it fixed or waved through?
//   REASONED— when it is waved through, does anyone say why?
//
// The four verdicts that come out of those, and what each one means:
//   WORKING   fires and is mostly fixed. The rule is doing its job.
//   IGNORED   fires on a THIRD OR MORE of the library and is never waived. This is the pathology that
//             hides behind a clean waiver count: a waiver is a decision someone had to write down, but
//             a WARNING is free to skip, so a warning nobody acts on accumulates silently. `no-camera`
//             fires on 63 of 102 scenes. At that rate it is not a signal, it is wallpaper, and every
//             author has learned to scroll past it — which also trains them to scroll past the ones
//             that matter.
//   DECORATIVE fires and is mostly waived. Either the rule is wrong or it is not being taught. Both
//             are actionable, and "delete it" is an acceptable answer.
//   SILENT    never fires anywhere. Either perfect prevention or dead weight, and the two are
//             indistinguishable from here — which is itself the finding.
//   RARE      fires once or twice. Not enough evidence; say so rather than guess.
//
// This tool cannot tell you whether a rule is TRUE. It tells you whether it is alive. Truth needs the
// A/B judge, and the `becomes:` field is the precedent: tested, lost to its control, and kept only
// with an honest note about what it does not buy.
//
//   node scripts/dev/rules-audit.mjs [--gates a,b] [--json]
import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const run = promisify(execFile);

const args = process.argv.slice(2);
const JSON_OUT = args.includes('--json');
const flag = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };

// Static gates only: anything that renders is too slow to sweep 100 scenes, and the point is a map of
// the ruleset rather than a full quality pass.
const GATES = (flag('--gates') || 'direction-floor,visual-vocabulary,copy-check,designspec-check,slop')
  .split(',').filter(Boolean);

const DIR = 'formats/scene';
const scenes = fs.readdirSync(DIR).filter((f) => f.endsWith('.json') && f !== 'schema.json')
  .filter((f) => { try { return JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')).module === 'scene'; } catch { return false; } });

// waivers, and whether anyone wrote down why
const waivers = new Map();      // finding id → { count, reasoned }
for (const f of scenes) {
  const d = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
  const a = d.authoring?.allow;
  if (!Array.isArray(a)) continue;
  const why = d.authoring?._why || d.authoring?.why || {};
  for (const k of a) {
    const e = waivers.get(k) || { count: 0, reasoned: 0, scenes: [] };
    e.count++; if (why && why[k]) e.reasoned++;
    e.scenes.push(f.replace('.json', ''));
    waivers.set(k, e);
  }
}

// what actually fires
const fires = new Map();        // finding id → { fail, warn, scenes:Set }
const LIMIT = 6;
let done = 0;
async function sweep(gate) {
  const queue = [...scenes];
  const workers = Array.from({ length: LIMIT }, async () => {
    for (;;) {
      const f = queue.shift(); if (!f) return;
      let out = '';
      try { const r = await run('node', [`scripts/gates/${gate}.mjs`, path.join(DIR, f)], { maxBuffer: 8e6 }); out = r.stdout + r.stderr; }
      catch (e) { out = (e.stdout || '') + (e.stderr || ''); }   // a failing gate exits non-zero; its output is the point
      for (const line of out.split('\n')) {
        const m = /\[([a-z][a-z0-9:·\-]*)\]/i.exec(line);
        if (!m) continue;
        const id = m[1].replace(/\s*·\s*warn$/, '');
        const e = fires.get(id) || { fail: 0, warn: 0, scenes: new Set(), gate };
        if (/^\s*[✗x]/.test(line) || /\bfail\b/i.test(line.slice(0, 12))) e.fail++; else e.warn++;
        e.scenes.add(f.replace('.json', ''));
        fires.set(id, e);
      }
      done++;
      if (!JSON_OUT && done % 40 === 0) process.stderr.write(`  … ${done}/${scenes.length * GATES.length}\n`);
    }
  });
  await Promise.all(workers);
}
for (const g of GATES) await sweep(g);

// ── verdicts ──────────────────────────────────────────────────────────────────────────────────────
const TOTAL = scenes.length;
const ids = new Set([...fires.keys(), ...waivers.keys()]);
const rows = [...ids].map((id) => {
  const f = fires.get(id) || { fail: 0, warn: 0, scenes: new Set(), gate: '' };
  const w = waivers.get(id) || { count: 0, reasoned: 0 };
  const hit = f.scenes.size, wv = w.count;
  // A waived finding does not fire (the gate skips it), so "how often was this rule engaged" is
  // hits PLUS waivers. Waive-rate is the share of engagements that were waved through.
  const engaged = hit + wv;
  const rate = engaged ? wv / engaged : 0;
  let verdict;
  if (!engaged) verdict = 'SILENT';
  else if (engaged < 3) verdict = 'RARE';
  else if (rate >= 0.5) verdict = 'DECORATIVE';
  else if (wv === 0 && hit / TOTAL >= 0.33) verdict = 'IGNORED';
  else verdict = 'WORKING';
  return { id, gate: f.gate, hit, fail: f.fail, warn: f.warn, waived: wv, reasoned: w.reasoned, engaged, rate, verdict };
}).sort((a, b) => b.engaged - a.engaged || b.rate - a.rate);

if (JSON_OUT) { console.log(JSON.stringify({ scenes: scenes.length, gates: GATES, rows }, null, 2)); process.exit(0); }

const ORDER = { DECORATIVE: 0, IGNORED: 1, WORKING: 2, RARE: 3, SILENT: 4 };
rows.sort((a, b) => ORDER[a.verdict] - ORDER[b.verdict] || b.engaged - a.engaged);
console.log(`\n  RULES AUDIT · ${scenes.length} scenes · gates: ${GATES.join(', ')}\n`);
console.log('  verdict      finding                          fired  waived  reasoned  waive-rate');
let last = '';
for (const r of rows) {
  if (r.verdict !== last) { console.log(''); last = r.verdict; }
  console.log(`  ${r.verdict.padEnd(11)}  ${r.id.slice(0, 30).padEnd(32)} ${String(r.hit).padStart(4)}   ${String(r.waived).padStart(5)}    ${String(r.reasoned).padStart(5)}      ${(r.rate * 100).toFixed(0).padStart(3)}%`);
}
const dec = rows.filter((r) => r.verdict === 'DECORATIVE');
const sil = rows.filter((r) => r.verdict === 'SILENT');
const ign = rows.filter((r) => r.verdict === 'IGNORED');
console.log(`\n  ${rows.length} findings · ${rows.filter((r) => r.verdict === 'WORKING').length} working · ${dec.length} DECORATIVE · ${ign.length} IGNORED · ${rows.filter((r) => r.verdict === 'RARE').length} rare · ${sil.length} silent`);
if (ign.length) console.log(`\n  IGNORED means it fires on a third or more of the library and nobody has ever had to write down\n  why they skipped it, because warnings are free to skip. Either raise it, retire it, or fix the films:\n    ${ign.map((r) => `${r.id} (${r.hit}/${TOTAL} scenes, ${(r.hit / TOTAL * 100).toFixed(0)}%)`).join('\n    ')}`);
if (dec.length) console.log(`\n  DECORATIVE means the rule is engaged and then waved through more often than it is obeyed.\n  Each one is either a wrong rule or an untaught one. Deleting it is an acceptable answer:\n    ${dec.map((r) => `${r.id} (${(r.rate * 100).toFixed(0)}% waived, ${r.reasoned}/${r.waived} with a reason)`).join('\n    ')}`);
if (sil.length) console.log(`\n  SILENT means it never fired and was never waived across the whole library. Perfect prevention and\n  dead weight look identical from here, and that ambiguity is the finding:\n    ${sil.map((r) => r.id).join(', ')}`);
