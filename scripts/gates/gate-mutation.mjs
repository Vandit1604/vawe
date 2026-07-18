// gate-mutation.mjs — who checks the checkers?
//
//   node scripts/gates/gate-mutation.mjs        run every case
//   make gate-test
//
// A gate that cannot fail is worse than no gate: it reports green forever and everyone believes it.
// That is not hypothetical here — the image legibility floor guarded on `b.height > 1`, so the ONE
// case it existed to catch (an image occupying no space) was the one case it skipped (MISTAKES #26).
// Nothing noticed, because a gate being quiet looks exactly like a gate being satisfied.
//
// So each case feeds a gate a fixture built to trip it and asserts the gate SPEAKS. The mirror cases
// matter just as much: a fixture that must PASS, so a gate cannot buy its sensitivity by crying wolf
// (the layout audit briefly called every cross-dissolve a collision, #25).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const FIX = path.join(repoRoot, 'verify/fixtures');
fs.mkdirSync(FIX, { recursive: true });

const scene = (layers, extra = {}) => JSON.stringify({
  module: 'scene', aspect: '16:9', theme: 'tpot', duration: 2, audio: { silent: true },
  bg: [{ preset: 'plain', from: 0, to: 2 }], layers, ...extra,
}, null, 1);

const TXT = (o = {}) => ({ type: 'text', text: 'Gate mutation fixture', x: 200, y: 400, w: 1100, align: 'left', size: 90, weight: 600, start: 0, duration: 2, ...o });

// Each case: a fixture, the command, and what the gate must (or must not) say.
const CASES = [
  // ---- layout audit: must FAIL ----
  { gate: 'audit', name: 'overlap · two solid layers stacked', expect: 'fail', match: /overlap/,
    scene: scene([TXT(), TXT({ text: 'Second solid layer', x: 220, y: 420 })]) },
  { gate: 'audit', name: 'contrast · text barely off the bg', expect: 'fail', match: /contrast/,
    scene: scene([TXT({ text: 'Nearly invisible', color: '#fbfcfd' })]) },
  { gate: 'audit', name: 'safe-zone · layer off the frame edge', expect: 'fail', match: /safe/,
    scene: scene([TXT({ x: -260, y: 400 })]) },
  { gate: 'audit', name: 'tiny-text · below the legibility floor', expect: 'fail', match: /tiny-text/,
    scene: scene([TXT({ size: 9, text: 'unreadably small caption' })]) },
  // ---- layout audit: must PASS (a gate must not buy sensitivity with false positives) ----
  { gate: 'audit', name: 'clean scene stays green', expect: 'pass',
    scene: scene([TXT()]) },
  { gate: 'audit', name: 'cross-dissolve is NOT a collision (#25)', expect: 'pass',
    scene: scene([TXT({ text: 'State A', duration: 1.2, exitDur: 0.4 }),
                  TXT({ text: 'State B', start: 0.9, duration: 1.1, anim: 'fade', enterDur: 0.4 })]) },

  // ---- validator: must FAIL on vocabulary that does not exist ----
  { gate: 'validate', name: 'unknown anim name', expect: 'fail', match: /anim|not valid/i,
    scene: scene([TXT({ anim: 'slideL' })]) },
  { gate: 'validate', name: 'unknown cut style', expect: 'fail', match: /style|not valid/i,
    scene: scene([TXT()], { cuts: [{ t: 1, style: 'teleport' }] }) },
  { gate: 'validate', name: 'valid scene passes', expect: 'pass',
    scene: scene([TXT({ anim: 'lift' })], { cuts: [{ t: 1, style: 'softwipe' }] }) },
];

const run = (cmd, args) => {
  try { return { code: 0, out: execFileSync(cmd, args, { cwd: repoRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) }; }
  catch (e) { return { code: e.status ?? 1, out: `${e.stdout || ''}${e.stderr || ''}` }; }
};

const GATE_CMD = {
  audit: (f) => ['node', ['verify/audit.mjs', f]],
  validate: (f) => ['node', ['core/validate.mjs', f]],
};

let pass = 0; const broken = [];
console.log('── gate mutation: does each gate actually fire?\n');
for (const c of CASES) {
  const f = path.join(FIX, `mut-${c.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.json`);
  fs.writeFileSync(f, c.scene);
  const rel = path.relative(repoRoot, f);
  const [cmd, args] = GATE_CMD[c.gate](rel);
  const r = run(cmd, args);
  const failed = r.code !== 0;
  let ok, why;
  if (c.expect === 'fail') {
    ok = failed && (!c.match || c.match.test(r.out));
    why = !failed ? 'gate stayed SILENT on a fixture built to break it' : 'gate failed but for the wrong reason';
  } else {
    ok = !failed;
    why = 'gate FIRED on a fixture that is correct (false positive)';
  }
  console.log(`   ${ok ? '✓' : '✗'} ${c.gate.padEnd(9)} ${c.expect === 'fail' ? 'must-fail' : 'must-pass'}  ${c.name}`);
  if (ok) pass++; else broken.push({ ...c, why, out: r.out.split('\n').filter(Boolean).slice(-4).join(' | ').slice(0, 220) });
  fs.unlinkSync(f);
}

// ---- mutate the SOURCE, not a fixture: some gates can only be tested by breaking the thing they guard.
const srcCases = [
  { name: 'font-audit · @font-face removed', file: 'core/tokens.css',
    mutate: (s) => s.split('\n').filter((l) => !l.includes("font-family: 'Manrope'")).join('\n'),
    cmd: ['node', ['scripts/gates/font-audit.mjs', 'scene', 'formats/scene/tpot-launch.json']], match: /FALLBACK|not rendering/ },
  { name: 'schema-drift · anim enum drifted', file: 'formats/scene/schema.json',
    mutate: (s) => s.replace('"lift",', '"liftt",'),
    cmd: ['node', ['scripts/gates/schema-drift.mjs']], match: /DRIFT/ },
];
console.log('');
for (const c of srcCases) {
  const p = path.join(repoRoot, c.file);
  const orig = fs.readFileSync(p, 'utf8');
  const mutated = c.mutate(orig);
  if (mutated === orig) { console.log(`   ~ SKIP  ${c.name} (mutation did not apply — fixture is stale)`); continue; }
  fs.writeFileSync(p, mutated);
  const r = run(c.cmd[0], c.cmd[1]);
  fs.writeFileSync(p, orig); // always restore, even if the gate throws
  const ok = r.code !== 0 && c.match.test(r.out);
  console.log(`   ${ok ? '✓' : '✗'} ${'source'.padEnd(9)} must-fail  ${c.name}`);
  if (ok) pass++; else broken.push({ name: c.name, why: r.code === 0 ? 'gate stayed SILENT after its guard was removed' : 'fired for the wrong reason', out: r.out.split('\n').filter(Boolean).slice(-3).join(' | ').slice(0, 220) });
}

const total = CASES.length + srcCases.length;
console.log('\n' + '='.repeat(72));
if (!broken.length) { console.log(`✓ gate mutation OK — ${pass}/${total} gates proven able to fire (and to stay quiet when correct)`); process.exit(0); }
console.log(`GATE MUTATION FAILURES (${broken.length}/${total})\n`);
for (const b of broken) console.log(`  ✗ ${b.name}\n      ${b.why}\n      ${b.out}\n`);
console.log('A gate that cannot fail reports green forever and everyone believes it (MISTAKES #26).');
process.exit(1);
