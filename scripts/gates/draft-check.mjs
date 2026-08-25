// scripts/gates/draft-check.mjs — IS THIS AN 85% DRAFT OR A 95% ONE? Say which, and say what is missing.
//
// The last missing studio stage. A studio does not hand over "the film"; it hands over a draft at a
// declared level of finish, and everyone reviews against that declaration. Without it, review is a
// guess: a reviewer who thinks they are seeing a ship candidate flags the placeholder photo, and a
// reviewer who thinks they are seeing a rough cut lets a real defect through. Both waste the pass.
//
// The two bars, and why they are drawn where they are:
//   85%  STRUCTURE AND TIMING ARE LOCKED, polish is open. The things that are expensive to change late
//        must be settled — the beat spans, what is on screen, that nothing is empty. The things that
//        are cheap to change stay open: exact colours, final copy, real assets in place of stand-ins.
//   95%  SHIP CANDIDATE. Everything above, plus the checks that need real pixels and cannot be run on
//        the plan: no flash at a transition, no layout or contrast failure, and not a repeat of a film
//        already in the ledger.
//
// WHAT IT RECORDS, and why that is the point. It writes the bar cleared AND every warning that was
// carried to clear it, so the next reviewer reads what was knowingly accepted instead of re-deriving
// it. A draft that says "85%, with placeholder photography and two off-palette colours" is reviewable.
// A draft that just says "here" is not.
//
//   node scripts/gates/draft-check.mjs <scene.json> --stage 85|95
//   make draft D=<scene.json> STAGE=85
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readReceipt, writeReceipt } from '../lib/receipt.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--'));
const flag = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const STAGE = String(flag('--stage', '85'));
if (!file || !fs.existsSync(file)) { console.error('usage: draft-check <scene.json> --stage 85|95'); process.exit(2); }
if (!['85', '95'].includes(STAGE)) { console.error(`✗ unknown stage "${STAGE}" — the bars are 85 and 95.`); process.exit(2); }

const NAME = path.basename(file, '.json');
// `pre` exists for ledger, whose CLI is `ledger.mjs check <file>` — a subcommand BEFORE the path. The
// first version passed the file first and read the resulting usage error as a real finding, which is a
// gate reporting its own miscall as a defect in the film.
const run = (script, extra = [], pre = []) => {
  const cmd = `node ${script} ${[...pre, file, ...extra].join(' ')}`;
  // `out: ''` ON SUCCESS was the whole bug in the CARRIED record. A sub-gate that passes still PRINTS —
  // author-check's REPORTS tier prints nine warning codes on a clean scene — and the output was thrown
  // away on exactly the branch that reaches the "CARRIED, knowingly" block, so the record of what a
  // draft knowingly accepted has never once been written. spawnSync, so pass and fail are read the same
  // way and out of both streams.
  const r = spawnSync('node', [path.join(ROOT, script), ...pre, file, ...extra], { cwd: ROOT, encoding: 'utf8' });
  return { ok: r.status === 0, out: `${r.stdout || ''}${r.stderr || ''}`, cmd };
};
const codes = (out) => [...new Set((out.match(/\[[a-z-]+\]/g) || []).map((c) => c.slice(1, -1)))];

const checks = [];
const need = (label, bar, res, hint) => checks.push({ label, bar, ...res, hint });

// ---- the 85% bar: what is expensive to change late ----
const ac = run('scripts/gates/author-check.mjs');
need('author-check', 85, { ok: ac.ok, codes: codes(ac.out), out: ac.out, cmd: ac.cmd }, 'structure, timing and value — the things a late fix is expensive for');

const beats = readReceipt('beats', file);
need('beats looked at', 85, { ok: beats.exists && !beats.stale, codes: beats.stale ? ['beats-stale'] : beats.exists ? [] : ['beats-unseen'] },
  `no gate can score a contact sheet; \`make beats D=${file}\` and read it`);

// ---- the 95% bar: what needs real pixels ----
if (STAGE === '95') {
  const mp4 = path.join(ROOT, 'out', `${NAME}.mp4`);
  if (!fs.existsSync(mp4)) {
    need('rendered', 95, { ok: false, codes: ['not-rendered'] }, `out/${NAME}.mp4 does not exist — a 95% draft is a thing you can watch`);
  } else {
    const seam = run('scripts/gates/seam-snap.mjs');
    need('seams', 95, { ok: seam.ok, codes: codes(seam.out), out: seam.out, cmd: seam.cmd }, 'a luminance flash at a cut, which centre-sampling gates structurally cannot see');
    const audit = run('verify/audit.mjs');
    need('audit', 95, { ok: audit.ok, codes: codes(audit.out), out: audit.out, cmd: audit.cmd }, 'overlap, clipping, safe zones, contrast');
    const led = run('scripts/gates/ledger.mjs', [], ['check']);
    need('ledger', 95, { ok: led.ok, codes: codes(led.out), out: led.out, cmd: led.cmd }, 'is this a repeat of a film already shipped');
  }
  const judged = readReceipt('judge', file);
  need('judged', 95, { ok: judged.exists && !judged.stale, codes: judged.exists ? (judged.stale ? ['judge-stale'] : []) : ['unjudged'] },
    `the only step that sees composition: \`make judge D=${file}\`, then read the sheet`);
}

// ---- verdict ----
const bar = checks.filter((c) => c.bar <= +STAGE);
const failed = bar.filter((c) => !c.ok);
const carried = [...new Set(bar.flatMap((c) => c.codes))].sort();  // sorted: the receipt is diffed between drafts

console.log(`\n  DRAFT ${STAGE}% · ${NAME}\n`);
// THE BARE WORD `failed` WAS THE WHOLE MESSAGE. Every sub-gate here is run with stdio:'pipe' and then
// reduced to a `[bracket-code]` regex, so a child that fails without emitting a code — a missing browser,
// a parse error, a real defect worded differently — printed the same four letters and every number it
// measured was discarded. A gate that captured its evidence and threw it away is worse than one that
// never looked: it reports a verdict it can no longer justify.
const tail = (out, n = 4) => out.split('\n').map((l) => l.replace(/\s+$/, '')).filter(Boolean).slice(-n);
for (const c of bar) {
  console.log(`  ${c.ok ? '✓' : '✗'} ${c.label.padEnd(16)} ${c.ok ? '' : c.codes.join(', ') || '(no finding code — see its own words below)'}`);
  if (c.ok) continue;
  console.log(`      ${c.hint}`);
  if (!c.codes.length && c.out) for (const l of tail(c.out)) console.log(`      │ ${l}`);
  if (c.cmd) console.log(`      run it yourself: ${c.cmd}`);
}

if (failed.length) {
  console.log(`\n  ✗ not a ${STAGE}% draft yet: ${failed.map((c) => c.label).join(', ')}.`);
  console.log(`    ${STAGE === '85'
    ? 'The 85% bar is structure and timing. Polish stays open on purpose — do not fix colours yet.'
    : 'The 95% bar needs real pixels, so everything here is checked against the render, not the plan.'}\n`);
  process.exit(1);
}

writeReceipt('draft', file, { stage: +STAGE, carried, at: new Date().toISOString() });
console.log(`\n  ✓ cleared the ${STAGE}% bar.`);
if (carried.length) {
  console.log(`\n  CARRIED, knowingly — this is what a reviewer should NOT re-flag:`);
  for (const c of carried) console.log(`    · ${c}`);
}
console.log(STAGE === '85'
  ? `\n  Still open at 85%: exact colours, final copy, real assets for any stand-in. Structure is locked;\n  changing it now costs what this bar exists to protect.\n`
  : `\n  Ship candidate. The last thing no gate can do is look at it: make judge D=${file}\n`);
