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
import { sourceHash } from '../sim/provenance.mjs';
import { SCENE_DIR } from './paths.mjs';

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

  // ---- beat-check: the only gate that reads the scene as a TIMELINE rather than a bag of layers.
  // Both tells are pinned, because they are measured off different edges of the clock (an interior
  // hole vs the closing plate) and one can rot while the other keeps firing.
  { gate: 'beatcheck', name: 'dead-air · a hole between two beats', expect: 'fail', match: /dead-air/,
    scene: scene([TXT({ duration: 0.6 }), TXT({ text: 'Second beat', start: 1.4, duration: 0.6 })]) },
  { gate: 'beatcheck', name: 'ends-on-nothing · the film closes on a bare backdrop', expect: 'fail', match: /ends-on-nothing/,
    scene: scene([TXT({ duration: 1 })]) },

  // ---- layer-props. The must-fail half is a source mutation (below); this is the must-pass half, and
  // it is the one that was missing. The gate scanned a NAMED file for the shared path, that file was
  // split, and the shared set collapsed to nothing: ~1900 live props across the repo were reported dead
  // while the renders honoured every one of them. `start`/`duration`/`motion` on a non-text type is the
  // exact shape that broke, so it is pinned on its own (#25: sensitivity bought with noise is not free).
  { gate: 'layerprops', name: 'shared-path props on a non-text layer are NOT dead', expect: 'pass',
    scene: scene([{ type: 'html', html: '<b>hi</b>', w: 300, x: 200, y: 400, start: 0, duration: 2,
                    anim: 'slide-right', out: 'slide-left', motion: [{ to: { x: 400 }, dur: 1 }] }]) },
  { gate: 'layerprops', name: 'a prop no layer type reads is still caught', expect: 'fail',
    match: /nothing reads it/, scene: scene([TXT({ notARealProp: 7 })]) },
];

const run = (cmd, args) => {
  try { return { code: 0, out: execFileSync(cmd, args, { cwd: repoRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) }; }
  catch (e) { return { code: e.status ?? 1, out: `${e.stdout || ''}${e.stderr || ''}` }; }
};

const GATE_CMD = {
  audit: (f) => ['node', ['verify/audit.mjs', f]],
  validate: (f) => ['node', ['core/validate.mjs', f]],
  beatcheck: (f) => ['node', ['scripts/gates/beat-check.mjs', f]],
  layerprops: (f) => ['node', ['scripts/gates/layer-props.mjs', f]],
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

/** A minimal, CURRENT bake of `sim` under assets/baked/<name>/ — the fixture the sim cases mutate. */
function fakeBake(name, sim) {
  const dir = path.join(repoRoot, 'assets/baked', name);
  fs.mkdirSync(dir, { recursive: true });
  const prov = sourceHash(path.join(repoRoot, sim));
  const frames = ['f0001.png', 'f0002.png'];
  for (const f of frames) fs.writeFileSync(path.join(dir, f), '');
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(
    { fps: 30, w: 4, h: 4, count: 2, frames: frames.map((f) => `/assets/baked/${name}/${f}`) }, null, 2));
  fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(
    { sim, seed: 1, fps: 30, count: 2, w: 4, h: 4, sourceHash: prov.hash, sources: prov.files }, null, 2));
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
  // Factories were extracted from blocks/index.mjs into family siblings; re-anchored on the sibling that
  // now holds each one (loadingBar→dev.mjs, browserFrame + the swatch fill→ui.mjs).
  { name: 'blocks-audit · a factory ships an invented statistic', file: 'blocks/dev.mjs',
    mutate: (s) => s.replace("export function loadingBar({", "export function loadingBar({ note = 'Ready in 1.2s',"),
    cmd: ['node', ['scripts/gates/blocks-audit.mjs']], match: /claim-default|baked-claim/ },
  { name: 'blocks-audit · unreadable text on a hardcoded fill', file: 'blocks/ui.mjs',
    mutate: (s) => s.replace("bg: '#3A3A38', radius: 8", "bg: '#F6A417', radius: 8"),
    cmd: ['node', ['scripts/gates/blocks-audit.mjs']], match: /contrast/ },
  { name: 'blocks-audit · a factory defaults to a real brand', file: 'blocks/ui.mjs',
    mutate: (s) => s.replace("url = 'example.com'", "url = 'stripe.com'"),
    cmd: ['node', ['scripts/gates/blocks-audit.mjs']], match: /brand-default/ },
  { name: 'validate · an unknown prop on a layer, silently ignored by the engine', file: 'formats/scene/sample.json',
    // NB: the injected prop must be a name NO layer accepts. `fill` was used here until it became a real
    // svg-layer prop (docs/MISTAKES.md #143) — pick a prop that can never be legitimised.
    mutate: (s) => s.replace('"layers": [', '"layers": [\n    { "type": "rect", "x": 0, "y": 0, "w": 10, "h": 10, "start": 0, "duration": 1, "notARealProp": "#000" },'),
    cmd: ['node', ['core/validate.mjs', 'formats/scene/sample.json']], match: /unknown prop "notARealProp"/ },
  { name: 'three · a scene reaching for wall-clock or unseeded randomness', file: 'core/three-fx.js',
    mutate: (s) => s.replace('const ease = (p)', 'const jitter = Math.random();\nconst ease = (p)'),
    cmd: ['node', ['scripts/gates/lib-test.mjs']], match: /no wall-clock or unseeded randomness/ },
  { name: 'raymarch · a scene whose distance field ignores time', file: 'core/raymarch-fx.js',
    mutate: (s) => s.replace('float w = sin(p.x * 2.2 + u_time * 0.9) * 0.13 + sin(p.z * 1.7 - u_time * 0.7) * 0.11;',
                             'float w = sin(p.x * 2.2) * 0.13 + sin(p.z * 1.7) * 0.11;'),
    cmd: ['node', ['scripts/gates/lib-test.mjs']], match: /distance field that depends on time/ },
  { name: 'docs-drift · a shipped effect listed as missing', file: 'docs/ROADMAP.md',
    mutate: (s) => s.replace('- Still absent: **Glitch RGB captions', '- Still absent: `zoomBlur`, **Glitch RGB captions'),
    cmd: ['node', ['scripts/gates/docs-drift.mjs']], match: /DOCS DRIFT/ },
  { name: 'canvas-purity · a paint layer that does not clear off-window', file: 'core/layers/paint.js',
    // Anchored on the clearRect call, not the whole line: the line also carries the resample tick
    // now, and pinning the exact text made the fixture go stale the moment the branch grew. A stale
    // fixture SKIPS, which reads as "fine" in the summary while proving nothing.
    mutate: (s) => s.replace("const [w0, h0] = el.__paintWH; ctx.clearRect(0, 0, w0, h0);", ""),
    cmd: ['node', ['scripts/gates/canvas-purity.mjs', 'scene', 'formats/scene/paint-demo.json']], match: /CANVAS PURITY FAILED/ },
  // The fixture layer sets `pulseAmp`, which ONLY core/layers/glow.js reads, and the mutation deletes
  // that read. So the case turns on the mutation: it used to pin a prop (`r`) that no build of the
  // engine reads, which made it pass whether or not the mutation applied, and a case that cannot
  // distinguish the two states proves nothing. Deleting a real read is the defect being simulated.
  { name: 'layer-props · a prop the engine never reads', file: 'core/layers/glow.js',
    mutate: (s) => s.replace('L.pulseAmp', 'undefined'),
    cmd: ['node', ['scripts/gates/layer-props.mjs', 'formats/scene/_lp-fixture.json']], match: /`pulseAmp` is set and nothing reads it/,
    before: () => fs.writeFileSync(path.join(repoRoot, 'formats/scene/_lp-fixture.json'), JSON.stringify({
      module: 'scene', aspect: '16:9', theme: 'tpot', duration: 2, audio: { silent: true },
      bg: [{ preset: 'plain', from: 0, to: 2 }],
      layers: [{ type: 'glow', x: 200, y: 200, w: 400, h: 400, pulse: 2, pulseAmp: 0.4, start: 0, duration: 2 }] })),
    after: () => fs.rmSync(path.join(repoRoot, 'formats/scene/_lp-fixture.json'), { force: true }) },
  // ...and the other direction: layer-props must NOTICE when its own shared-path scan goes blind.
  // Renaming every `L.` read in the format's driver is what a file split did in effect, and the gate
  // answered by calling ~1900 live props dead instead of saying it could no longer see. It must now
  // report itself broken rather than blame the scenes.
  { name: 'layer-props · the shared-path scan goes blind', file: `${SCENE_DIR}/scene.js`,
    mutate: (s) => s.replace(/\bL\./g, 'Q.'),
    cmd: ['node', ['scripts/gates/layer-props.mjs', `${SCENE_DIR}/higgsfield-recreation.json`]], match: /layer-props is blind/ },
  { name: 'dead-branch · a ternary whose arms are identical', file: 'core/layers/rect.js',
    mutate: (s) => s.replace('export function build', 'const DEAD = 1 === 1 ? 2 : 2;\nexport function build'),
    cmd: ['node', ['scripts/gates/dead-branch.mjs']], match: /both arms are/ },
  // The dataflow half (MISTAKES #81 left it open, #91 closed it). Three shapes, three fixtures: a gate
  // that catches one of its three stated rules and reports green for the other two is the same failure
  // as no gate at all, so each rule is pinned on its own.
  { name: 'dead-branch · a value computed and never read', file: 'core/layers/rect.js',
    mutate: (s) => s.replace('export function build', 'const DISCARDED = Math.max(1, 2);\nexport function build'),
    cmd: ['node', ['scripts/gates/dead-branch.mjs']], match: /computed and never read/ },
  { name: 'dead-branch · a prop accepted and never read', file: 'core/layers/rect.js',
    mutate: (s) => s.replace('export function build', 'function probeUnusedProp({ neverRead }) { return 1; }\nexport function build'),
    cmd: ['node', ['scripts/gates/dead-branch.mjs']], match: /prop accepted and never read/ },
  { name: 'dead-branch · a condition decided at author time', file: 'core/layers/rect.js',
    // via a const-bound literal, not a bare `if (1 === 1)`: the one-hop lookup is the part of the rule
    // that could rot silently, since a bare tautology would also be caught by cruder text matching.
    mutate: (s) => s.replace('export function build', 'const PROBE_K = 2;\nif (PROBE_K === 3) { }\nexport function build'),
    cmd: ['node', ['scripts/gates/dead-branch.mjs']], match: /condition cannot vary/ },

  // Conformance's distinctness check was self-fulfilling for four years of vocabulary (MISTAKES #74).
  // All three of its guards are pinned: the defect itself, and both halves of the proof that the
  // signature can still see it. A distinctness check nobody can make fail is not a passing check.
  { name: 'conformance · two anim values that render identically', file: 'core/clips.js',
    mutate: (s) => s.replace("wipe(t, 'up')", "wipe(t, 'left')"),
    cmd: ['node', ['scripts/gates/conformance.mjs', 'enums']], match: /render identically to another value/ },
  { name: 'conformance · the signature goes back to revealing identity', file: 'scripts/gates/conformance.mjs',
    mutate: (s) => s.replace("['anim', 'out']", '[]'),
    cmd: ['node', ['scripts/gates/conformance.mjs', 'enums']], match: /falsifiability/ },
  { name: 'conformance · blindSig drifts from the frameSig it mirrors', file: 'scripts/gates/conformance.mjs',
    mutate: (s) => s.replace('2166136261, html', '2166136262, html'),
    cmd: ['node', ['scripts/gates/conformance.mjs', 'enums']], match: /disagrees with frameSig/ },
  // A baked 3D typeface goes stale SILENTLY: swap the woff2 and the old outlines keep rendering
  // flawless letters in the previous font. Anchored on the `"sourceSha256":"` key rather than on any
  // hash digits, so re-baking the artifact (which changes every digit) cannot make this fixture stale.
  { name: 'glyphs-audit · a 3D typeface stale against its woff2', file: 'assets/fonts/3d/Anybody.typeface.json',
    mutate: (s) => s.replace('"sourceSha256":"', '"sourceSha256":"0'),
    cmd: ['node', ['scripts/gates/glyphs-audit.mjs']], match: /STALE/ },
  // ---- Tier B: the offline sim bake. Three defects, three fixtures. A sequence on disk carries no
  // evidence of its own reproducibility, so all three of these ship SILENTLY: the video renders, the
  // frames play, and what plays is not what the sim says.
  { name: 'sim-audit · a sim reaching for unseeded randomness', file: 'sims/ember-burst.mjs',
    // anchored on the `step` signature: the smallest text that must exist for a sim to BE a sim, so
    // the fixture cannot go stale against tuning inside the sim's body (MISTAKES #89).
    mutate: (s) => s.replace('export function step(ctx, i) {', 'export function step(ctx, i) {\n  const drift = Math.random();'),
    cmd: ['node', ['scripts/gates/sim-audit.mjs']], match: /unseeded/ },
  { name: 'sim-audit · a bake left behind by an edited sim', file: 'sims/ember-burst.mjs',
    // any change to the source is the defect; the bake keeps playing the PREVIOUS version of the
    // effect and nothing downstream can tell. The fixture bake is synthesised so this case does not
    // depend on assets/baked/ being populated on the machine running the harness.
    mutate: (s) => s.replace('const GRAVITY = 0.42;', 'const GRAVITY = 0.61;'),
    cmd: ['node', ['scripts/gates/sim-audit.mjs']], match: /has changed since this was baked/,
    before: () => fakeBake('_mut-stale', 'sims/ember-burst.mjs'),
    after: () => fs.rmSync(path.join(repoRoot, 'assets/baked/_mut-stale'), { recursive: true, force: true }) },
  { name: 'sim-audit · a frame sequence with a hole in it', file: 'assets/baked/_mut-seq/manifest.json',
    // `clip` indexes by array position, so a missing PNG does not throw: it holds the previous frame.
    mutate: (s) => s.replace('f0002.png', 'f0009.png'),
    cmd: ['node', ['scripts/gates/sim-audit.mjs']], match: /expected "f0002.png"|missing on disk/,
    before: () => fakeBake('_mut-seq', 'sims/ember-burst.mjs'),
    after: () => fs.rmSync(path.join(repoRoot, 'assets/baked/_mut-seq'), { recursive: true, force: true }) },

  { name: 'schema-drift · anim enum drifted', file: 'formats/scene/schema.json',
    mutate: (s) => s.replace('"lift",', '"liftt",'),
    cmd: ['node', ['scripts/gates/schema-drift.mjs']], match: /DRIFT/ },
  // the drift check covered ONE enum of eight; adding an ambient fx made the schema reject a valid
  // value and nothing said so. A second enum is pinned so the generalisation cannot quietly regress.
  { name: 'schema-drift · a NON-anim enum drifted', file: 'formats/scene/schema.json',
    mutate: (s) => s.replace('"kaleidoscope",', '"kaleidoscop",'),
    cmd: ['node', ['scripts/gates/schema-drift.mjs']], match: /DRIFT/ },
  // The backdrop is a REQUIRED authoring choice now that the baseline no longer injects one. Without this
  // fixture the rule is the only thing standing between an author and a scene that renders on flat nothing,
  // and nothing proves it still fires. Anchored on the top-level key (a layer `bg` is a colour string, so
  // the array match cannot catch one by accident).
  { name: 'validate · a scene that declares no background at all', file: 'formats/scene/sample.json',
    mutate: (s) => s.replace(/,\s*"bg": \[[^\]]*\]/, ''),
    cmd: ['node', ['core/validate.mjs', 'formats/scene/sample.json']], match: /bg is required/ },
  // A hand-authored backdrop that animates in a browser and renders a dead still is the exact failure
  // the message exists to prevent; if the check stops firing, nothing else in the pipeline notices.
  // `untype` (reverse typing) used to be checked only for WIRING — that the engine reads the prop the
  // schema advertises. That proved the props were not no-ops and nothing more: the count itself, the
  // part that can actually be wrong, was untestable while it lived inside frame() (which needs a DOM).
  // It is now the exported pure typedLen(), so this case drops the delete term and demands lib-test
  // notice the line never shrinks.
  { name: 'text · untype reverses the typing', file: 'core/layers/text.js',
    mutate: (s) => s.replace('  if (untype != null && lt >= untype) n = Math.min(n, visLen) - Math.floor((lt - untype) * (untypeRate ?? cps));\n', ''),
    cmd: ['node', ['scripts/gates/lib-test.mjs']], match: /untype: deletes back to 0/ },

  { name: 'validate · a hand-authored bg animated with CSS (which never runs)', file: 'formats/scene/example-html-bg.json',
    mutate: (s) => s.replace('<style>.fan{', '<style>.x{animation:spin 2s linear infinite}.fan{'),
    cmd: ['node', ['core/validate.mjs', 'formats/scene/example-html-bg.json']], match: /DEAD STILL/ },
  { name: 'validate · a hand-authored bg that never says whether it is light or dark', file: 'formats/scene/example-html-bg.json',
    mutate: (s) => s.replace('"tone": "light",', ''),
    cmd: ['node', ['core/validate.mjs', 'formats/scene/example-html-bg.json']], match: /declares no `tone`/ },
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
