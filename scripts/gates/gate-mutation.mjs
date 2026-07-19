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

  // The headline bar relaxes to WCAG-large ONLY on a filled chip (#44). Both halves are pinned here,
  // because a rule that was loosened for one video and never re-tested is how a guard quietly dies.
  { gate: 'audit', name: 'weak-headline · washed-out display type on the field', expect: 'fail', match: /weak-headline/,
    scene: scene([TXT({ text: 'Washed out heading', size: 110, color: '#9aa3ad' })]) },
  { gate: 'audit', name: 'headline on a filled brand chip is NOT weak (#44)', expect: 'pass',
    scene: scene([{ type: 'rect', x: 150, y: 380, w: 460, h: 160, bg: '#0093eb', radius: 26, start: 0, duration: 2 },
                  TXT({ text: 'Tech', x: 150, y: 400, w: 460, align: 'center', size: 110, color: '#ffffff' })]) },

  // The logotype exemption (WCAG 1.4.3) is contrast-ONLY and must be declared. Pinned in all three
  // directions so it cannot quietly become "any low-contrast text is fine".
  { gate: 'audit', name: 'logotype · a declared brand mark is contrast-exempt', expect: 'pass',
    scene: scene([{ type: 'group', x: 200, y: 400, layout: 'row', logotype: true, start: 0, duration: 2,
                    children: [{ type: 'text', text: 'o', size: 104, weight: 700, color: '#FBBC05' }] }]) },
  { gate: 'audit', name: 'logotype · undeclared low-contrast display text still fails', expect: 'fail', match: /contrast|weak-headline/,
    scene: scene([TXT({ text: 'o', size: 104, weight: 700, color: '#FBBC05' })]) },
  { gate: 'audit', name: 'logotype · exemption does NOT cover the tiny-text floor', expect: 'fail', match: /tiny-text/, outputOnly: true,
    scene: scene([{ type: 'group', x: 200, y: 400, layout: 'row', logotype: true, start: 0, duration: 2,
                    children: [{ type: 'text', text: 'unreadably small mark', size: 9, color: '#FBBC05' }] }]) },

  // A centring keyword must have something to centre. Pinned on BOTH axes and in both directions,
  // including the deliberate text-y carve-out, so "measure later" cannot quietly become "never".
  { gate: 'validate', name: 'layout · x:"center" with no w', expect: 'fail', match: /positions a box of width/,
    scene: scene([{ type: 'text', text: 'centred', x: 'center', y: 400, size: 90, start: 0, duration: 2 }]) },
  { gate: 'validate', name: 'layout · pin:"center" with no w', expect: 'fail', match: /positions a box of width/,
    scene: scene([{ type: 'text', text: 'pinned', pin: 'center', size: 90, start: 0, duration: 2 }]) },
  { gate: 'validate', name: 'layout · y:"center" on an image with no h', expect: 'fail', match: /positions a box of height/,
    scene: scene([{ type: 'image', src: '/assets/icons/ui/search.svg', x: 100, y: 'center', w: 80, start: 0, duration: 2 }]) },
  { gate: 'validate', name: 'layout · w + align is correct usage', expect: 'pass',
    scene: scene([{ type: 'text', text: 'fine', x: 'center', y: 400, w: 1200, align: 'center', size: 90, start: 0, duration: 2 }]) },
  { gate: 'validate', name: 'layout · text y-centring is the deliberate carve-out', expect: 'pass',
    scene: scene([{ type: 'text', text: 'fine', x: 100, y: 'center', w: 1200, size: 90, start: 0, duration: 2 }]) },

  // Overlap covers ALL text, not just >=60px "critical" text, because a headline that WRAPS lands on
  // the small caption beneath it. All four directions pinned: the two legitimate cases must PASS, or
  // the rule gets reverted the first time it cries wolf on a real design.
  { gate: 'audit', name: 'overlap · a wrapped headline lands on a small caption', expect: 'fail', match: /overlap/,
    scene: scene([{ type: 'text', text: 'A headline long enough to wrap onto a second line', x: 200, y: 400, w: 900, size: 90, weight: 600, start: 0, duration: 2 },
                   { type: 'text', text: 'formats/scene/file.json', x: 200, y: 500, w: 900, size: 24, font: 'mono', start: 0, duration: 2 }]) },
  { gate: 'audit', name: 'overlap · tight typographic stacking is NOT a collision', expect: 'pass',
    scene: scene([{ type: 'text', text: '1.2M', x: 200, y: 400, w: 600, size: 120, weight: 700, start: 0, duration: 2 },
                  { type: 'text', text: 'cups poured', x: 200, y: 508, w: 600, size: 20, font: 'mono', start: 0, duration: 2 }]) },
  { gate: 'audit', name: 'overlap · text hidden behind an opaque card is NOT a collision', expect: 'pass',
    // the card is LIGHT so the text beneath it still clears contrast against it — otherwise this
    // fixture fails on contrast and tells you nothing about occlusion (which is what it did first).
    scene: scene([{ type: 'text', text: 'behind the card', x: 300, y: 430, w: 600, size: 40, start: 0, duration: 2 },
                  { type: 'rect', x: 260, y: 380, w: 700, h: 200, bg: '#f4f7fa', radius: 12, start: 0, duration: 2 },
                  { type: 'text', text: 'on the card', x: 300, y: 440, w: 600, size: 40, start: 0, duration: 2 }]) },

  // Composition: warn-tier, so assert it SPOKE rather than that it exited non-zero.
  { gate: 'audit', name: 'top-heavy · a beat that abandons the bottom of the frame', expect: 'fail', match: /top-heavy/, outputOnly: true,
    scene: scene([{ type: 'text', text: 'All the way up here', x: 200, y: 90, w: 1200, size: 80, weight: 600, start: 0, duration: 2 },
                  { type: 'text', text: 'and nothing below', x: 200, y: 210, w: 1200, size: 30, start: 0, duration: 2 }]) },
  { gate: 'audit', name: 'a beat that uses the frame is NOT top-heavy', expect: 'pass',
    scene: scene([{ type: 'text', text: 'Upper', x: 200, y: 240, w: 1200, size: 80, weight: 600, start: 0, duration: 2 },
                  { type: 'text', text: 'Lower', x: 200, y: 760, w: 1200, size: 80, weight: 600, start: 0, duration: 2 }]) },

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
    // outputOnly: the rule is WARN-tier, so it reports without exiting non-zero. Assert it SPOKE.
    ok = (c.outputOnly ? true : failed) && (!c.match || c.match.test(r.out));
    why = !failed && !c.outputOnly ? 'gate stayed SILENT on a fixture built to break it' : 'gate failed but for the wrong reason';
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
  { name: 'clipped-text · riseClip mask too short for descenders', file: 'core/type.js',
    mutate: (s) => s.replace("        w.style.paddingBottom = '0.3em'; w.style.marginBottom = '-0.3em';\n", ''),
    cmd: ['node', ['verify/audit.mjs', 'formats/scene/tpot-launch.json']], match: /clipped-text/ },
  { name: 'snap · opacity easing reverted to linear', file: 'core/clips.js',
    mutate: (s) => s.replace('  easeOutCubic(clamp01(enterT)) * (exitT > 0 ? 1 - easeOutCubic(clamp01(exitT)) : 1);',
                             '  clamp01(enterT) * (exitT > 0 ? 1 - clamp01(exitT) : 1);'),
    cmd: ['node', ['scripts/gates/scene-snap.mjs', 'scene']], match: /opacity: /, outputOnly: true },
  { name: 'clipped-component · captured root margin re-offsets the content', file: 'core/layers/component.js',
    mutate: (s) => s.replace("  if (rootEl) rootEl.style.margin = '0';", ''),
    cmd: ['node', ['verify/audit.mjs', 'formats/scene/tpot-launch.json']], match: /clipped-component/ },
  { name: 'blocks-audit · a factory ships an invented statistic', file: 'blocks/index.mjs',
    mutate: (s) => s.replace("export function loadingBar({", "export function loadingBar({ note = 'Ready in 1.2s',"),
    cmd: ['node', ['scripts/gates/blocks-audit.mjs']], match: /claim-default|baked-claim/ },
  { name: 'blocks-audit · unreadable text on a hardcoded fill', file: 'blocks/index.mjs',
    mutate: (s) => s.replace("bg: '#3A3A38', radius: 8", "bg: '#F6A417', radius: 8"),
    cmd: ['node', ['scripts/gates/blocks-audit.mjs']], match: /contrast/ },
  { name: 'blocks-audit · a factory defaults to a real brand', file: 'blocks/index.mjs',
    mutate: (s) => s.replace("url = 'example.com'", "url = 'stripe.com'"),
    cmd: ['node', ['scripts/gates/blocks-audit.mjs']], match: /brand-default/ },
  { name: 'roadmap-drift · a shipped effect listed as missing', file: 'docs/ROADMAP.md',
    mutate: (s) => s.replace('- Still absent: **Glitch RGB captions', '- Still absent: `zoomBlur`, **Glitch RGB captions'),
    cmd: ['node', ['scripts/gates/roadmap-drift.mjs']], match: /ROADMAP DRIFT/ },
  { name: 'canvas-purity · a paint layer that does not clear off-window', file: 'core/layers/paint.js',
    // Anchored on the clearRect call, not the whole line: the line also carries the resample tick
    // now, and pinning the exact text made the fixture go stale the moment the branch grew. A stale
    // fixture SKIPS, which reads as "fine" in the summary while proving nothing.
    mutate: (s) => s.replace("const [w0, h0] = el.__paintWH; ctx.clearRect(0, 0, w0, h0);", ""),
    cmd: ['node', ['scripts/gates/canvas-purity.mjs', 'scene', 'formats/scene/paint-demo.json']], match: /CANVAS PURITY FAILED/ },
  { name: 'layer-props · a prop the engine never reads', file: 'core/layers/glow.js',
    mutate: (s) => s.replace('export function build', 'const UNUSED_MARKER = 1;\nexport function build'),
    cmd: ['node', ['scripts/gates/layer-props.mjs', 'formats/scene/_lp-fixture.json']], match: /accepted and dropped|is set and nothing reads it/,
    before: () => fs.writeFileSync(path.join(repoRoot, 'formats/scene/_lp-fixture.json'), JSON.stringify({
      module: 'scene', aspect: '16:9', theme: 'tpot', duration: 2, audio: { silent: true },
      bg: [{ preset: 'plain', from: 0, to: 2 }],
      layers: [{ type: 'glow', x: 200, y: 200, w: 400, h: 400, r: 620, start: 0, duration: 2 }] })),
    after: () => fs.rmSync(path.join(repoRoot, 'formats/scene/_lp-fixture.json'), { force: true }) },
  { name: 'dead-branch · a ternary whose arms are identical', file: 'core/layers/rect.js',
    mutate: (s) => s.replace('export function build', 'const DEAD = 1 === 1 ? 2 : 2;\nexport function build'),
    cmd: ['node', ['scripts/gates/dead-branch.mjs']], match: /both arms are/ },
  { name: 'schema-drift · anim enum drifted', file: 'formats/scene/schema.json',
    mutate: (s) => s.replace('"lift",', '"liftt",'),
    cmd: ['node', ['scripts/gates/schema-drift.mjs']], match: /DRIFT/ },
  // the drift check covered ONE enum of eight; adding an ambient fx made the schema reject a valid
  // value and nothing said so. A second enum is pinned so the generalisation cannot quietly regress.
  { name: 'schema-drift · a NON-anim enum drifted', file: 'formats/scene/schema.json',
    mutate: (s) => s.replace('"kaleidoscope",', '"kaleidoscop",'),
    cmd: ['node', ['scripts/gates/schema-drift.mjs']], match: /DRIFT/ },
];
console.log('');
for (const c of srcCases) {
  const p = path.join(repoRoot, c.file);
  if (c.before) c.before();
  const orig = fs.readFileSync(p, 'utf8');
  const mutated = c.mutate(orig);
  // A stale fixture is a FAILURE, not a skip. This is the gate that proves every other gate can
  // fire; when its fixture stops matching (because the code it patches moved), the gate it vouches
  // for silently becomes unproven while the run still exits 0. That is precisely the "reports green
  // forever" failure this whole harness exists to prevent, reproduced inside the harness itself.
  if (mutated === orig) {
    console.log(`   ✗ ${'source'.padEnd(9)} must-fail  ${c.name}`);
    broken.push({ name: c.name, why: 'FIXTURE IS STALE — the mutation no longer applies, so this gate is UNPROVEN. Re-anchor it on text that still exists in ' + c.file, out: '' });
    continue;
  }
  fs.writeFileSync(p, mutated);
  const r = run(c.cmd[0], c.cmd[1]);
  fs.writeFileSync(p, orig); // always restore, even if the gate throws
  if (c.after) c.after();
  // snap reports rather than fails (an intended change is still a change), so some cases
  // assert on OUTPUT alone — a gate can speak without exiting non-zero.
  const ok = (c.outputOnly ? true : r.code !== 0) && c.match.test(r.out);
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
