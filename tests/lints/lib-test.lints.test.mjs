import test from 'node:test';
import assert from 'node:assert/strict';
// tests/lints/lib-test.lints.test.mjs: fast pure-JS asserts, split by domain out of the old quality/gates/lib-test.mjs.
// No browser needed (the primitives are pure). Run: node tests/lints/lib-test.lints.test.mjs  (make test)
import { spring, springSettle, easeOutCubic,
  random, noise, hashSeed, resolveEasing, EASINGS, DEFAULT_MOTION,
  shake, trackingFor,
  anticipateEase, overshootEase, stepClock, icon } from '../../core/motion/motion.js';
import { srcUrl } from '../../core/engine/src-url.js';
import { layerTime, TIME_REMAP_NAMES, TIME_REMAP_BLURBS } from '../../core/timeline/time.js';
import { unitProgress, PRESETS, PRESET_BLURBS, wght } from '../../core/type/type.js';
import { PRESENTATIONS, cutStyle, soloCutStyle, SOLO_BLIND, CUT_BLURBS, cutWrites, TIMINGS } from '../../core/cuts/index.js';
import { PRESENTATIONS as CUT_PRESENTATIONS_AK } from '../../core/cuts/index.js';
import { dirVec as seamDirVec, featherFor as seamFeatherFor } from '../../core/timeline/seams.js';
import { killedBy, capabilitiesOf, checkCuts } from '../../core/fx/ancestor-kills.js';
import { ANIM_NAMES, ANIM_BLURBS, clipStyleAt, WARPABLE, entranceWarp } from '../../core/timeline/clips.js';
import { IDLE, IDLE_NAMES, IDLE_BLURBS, IDLE_IDENTITY, idleAt, idlePhase, idleTransform,
  normalizeIdle, settledGain } from '../../core/engine/idle.js';
import { SEAM_BLURBS } from '../../core/timeline/seams.js';
import { FX_TYPES, FX_BLURBS } from '../../core/fx/index.js';
import { GSAP_FX, GSAP_BLURBS, GSAP_REGISTRY, LOOP_FX, ONESHOT_FX } from '../../core/engine/gsap-effects.js';
import { BG_NAMES, BG_BLURBS, gradientFill } from '../../core/backgrounds/index.js';
import { GRADIENT_RECIPE_REGISTRY } from '../../core/backgrounds/gradient-recipes.js';
import { RESAMPLE_BLURBS } from '../../core/resample/effects.js';
import { CAP_STYLE_NAMES, CAPTION_BLURBS } from '../../core/type/captions.js';
import { COMPOSITION_NAMES, COMPOSITION_BLURBS } from '../../core/compositions/index.js';
import { PROFILES } from '../../harness/author/profiles.mjs';
import { createKit, GLYPH_PAINTERS, paintsOwnGlyphs, childExitDur } from '../../core/layers/util.js';
import { cameraAt, dollyZ, motionAt, resolveKeyedProps, poseBack, velocityAt, keyHandleErrors } from '../../core/timeline/sequence.js';
import { frame as squashFrame, build as squashBuild } from '../../core/fx/squash.js';
import { coverScale, isFullBleedPlane } from '../../core/tracks/overscan.js';
import { hasOwn3DMotion, computeGroup3D, applyGroup3DOpacityAdapt } from '../../core/tracks/group3d.js';
import { frame as lagFrame, build as lagBuild } from '../../core/fx/lag.js';
import { frame as matteFrame, build as matteBuild } from '../../core/fx/matte.js';
import { frame as uprightFrame, build as uprightBuild } from '../../core/fx/upright.js';
import { mergePan } from '../../core/timeline/pan-resolve.mjs';
import { patchMotion, upsertKey, layerSpan, matchBracket, applyOps } from '../../harness/author/patch-motion.mjs';
import { SHAPES as TRACK_SHAPES } from '../../harness/author/track.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { MARGIN, MAX_ZOOM } from '../../core/layout/safe.js';
import { safeArea, DESTINATION_NAMES, nativeAspect, sceneDims, captionBand, frameOf, outOfFrame, settleWindow, reportBounds, boundsCheckOn } from '../../core/layout/safe.js';
import { resolveFilter, parseColor, FILTER_PRESETS, FILTER_REGISTRY, ensureFilterDef } from '../../core/looks/filters.js';
import fsMod from 'node:fs';
import { defineRegistry, registries, catalogued, checkBlurb, searchWords } from '../../core/registry/registry.js';
import { presentIn, existingAt, newSince, WINDOW_DAYS } from '../../harness/author/recency.mjs';
import { collect as arsenalCollect, coverageIn, CONFIDENT, snippet as arsenalSnippet, toks as arsenalToks, score as arsenalScore, SIDE_KINDS as arsenalSideKinds } from '../../harness/author/arsenal.mjs';
import { loadSchema, steps as atSteps, resolve as atResolve, allPaths as atPaths, childrenOf as atChildren, kindsOfEnum, fmtPath as atFmt } from '../../harness/author/schema-at.mjs';
import { token, literal, lit, resolveColor } from '../../core/color/color.js';
import { frame as varsFrame } from '../../core/tracks/vars.js';
import { junctionTable, resolveJunction, isJunctionRef, marksOf, bindWindowsToJunctions } from '../../core/timeline/junctions.js';
import { applyComposite } from '../../core/looks/index.js';
import { bakeCanvasFx } from '../../core/canvas/effects.js';
import { DIRS } from '../../core/cuts/index.js';
import { expandTheme } from '../../core/theme/roles.js';
import { colorAlpha } from '../../core/color/engine.js';
import { SPECTACLE_GAIN, attenuated, attenuatedKick, KNOBS, bindDials } from '../../core/registry/knobs.js';
import { dialsOf } from '../../core/registry/props.js';
import { resolveSpectacle } from '../../core/timeline/spectacle.js';
import { okDir as seamDir } from '../../core/timeline/seams.js';
import { produceBaseline } from '../../core/engine/produce.js';
import { resolveRelativeTimes } from '../../core/timeline/relative-time.js';
import { expandScene } from '../../core/engine/expand.js';
import { resolveTempo } from '../../core/engine/tempo.js';
import { easeErrors, bgErrors, durationWordErrors, cssErrors, authoredJunctionErrors } from '../../core/validate/validate.mjs';
import { raise as raiseJunction, deepEqual as junctionDeepEqual, migrateOne } from '../../harness/author/migrate-junctions.mjs';
import { splitWaiver, waiverCovers, isWaivedBy, groupWaivers, bareWaiverCoverage } from '../../harness/lib/waivers.mjs';
import { FEEL, DURATION, CAMERA_WORDS, resolveSeconds, resolveCameraMove, verifyVocab,
  COMPARATIVE, resolveComparative } from '../../core/registry/vocab.js';
import { BASE_ENTER } from '../../core/timeline/clips.js';
import { CUT_REGISTRY } from '../../core/cuts/index.js';
import { CUT_CUE } from '../../core/audio/cues.js';
import { ANIM_REGISTRY } from '../../core/timeline/clips.js';
import { PART_NAMES, PART_BLURBS, PARTS } from '../../core/motion/parts.js';
import { FALLOFFS, FALLOFF_NAMES, FALLOFF_BLURBS, DRIVES, DRIVE_NAMES, effectorAt, effectorStyle } from '../../core/motion/effector.js';
import { cutVelocityAdvice, layerSpeedAt, cameraSpeedAt } from '../../core/timeline/velocity-cut.js';
import { TRACK_TYPES, SLOTS } from '../../core/tracks/index.js';
import { parseCameraLine, cameraErrors, cameraWarnings, cameraContinuityErrors, resolvedCamera, nearestCameraMoves, parseTransitionIn, transitionInErrors, transitionInWarnings, resolvedTransitionIn, nearestTransitions, parseTransitionWhy, transitionFindings, isContinuousBoundary } from '../../harness/lib/contract.mjs';
import { RELATIONSHIPS, DEVICES } from '../../core/transitions/relationships.js';
import { TRANSITIONS as TRANSITIONS_CATALOG } from '../../core/transitions/catalog.js';
import { adoptionReport } from '../../quality/gates/stage.mjs';
import { bgPaletteFrom } from '../../core/backgrounds/index.js';
import { parseColorRGB, colorDistance } from '../../core/color/engine.js';
import { toRgb as lightfieldToRgb } from '../../core/lightfield/colour.js';
import { presetSpec, pulseOpacity, alphaMix, liftWhite, cycleHue } from '../../core/layers/glow.js';
import { gradientCss, splitFillCss } from '../../core/layers/text.js';
import { rollOffsets, displayNum } from '../../core/layers/count.js';
import { dollyZoom, slowPush, diveIn, panFollow, workspaceZoomOut, orbit, multiPhase, travel, truck, cameraShake, punchIn, driftHold, followCursor, buildCameraMove, CAMERA_MOVE_NAMES } from '../../core/camera-moves/index.js';
import { bakeCameraMove } from '../../core/engine/produce.js';
import { capWords, capUnitWins, capShape, wordU, lineU, CAP_STYLES } from '../../core/type/captions.js';
import { BLOCKS, CATEGORY_OF, NOT_A_BLOCK } from '../../blocks/index.mjs';
import { SHADER_FX } from '../../core/stings/index.js';
import { AMBIENT_FX, AMBIENT_SHADERS } from '../../core/surfaces/shaders-ambient.js';
import { shaderAt as ambientShaderAt, validate as ambientValidate } from '../../core/surfaces/shader.js';
import { raymarchAt, validate as raymarchValidate } from '../../core/surfaces/raymarch.js';
import { resolveComposite, LOOKS, LOOK_NAMES, isLook, lookName, KNOB_ROUTES, liveKnobs } from '../../core/looks/index.js';
import { luma, BAYER4, bayerAt, cellAverage, hash01, canvasFxKey, CANVAS_FX_NAMES, resolveFxSpec, CANVAS_FX_PRESETS } from '../../core/canvas/effects.js';
import { CATALOG } from '../../blocks/catalog.mjs';
import { FAMILY_MODULES, NOT_A_FAMILY } from '../../blocks/index.mjs';
import { collect as collectArsenal } from '../../harness/author/arsenal.mjs';
import { CUES, renderCue, musicBed, normalize, biquad, osc, SR } from '../../core/audio/kit.mjs';
import { onsetEnvelope, estimateTempo, estimatePhase, beatGrid, snapToBeat, downbeats } from '../../core/beats/detect.js';
import { beatSyncOf, beatGridPath, bindBeats, snapJoints, unrollGrid, beatPeriod, DEFAULT_MAX_SHIFT } from '../../core/beats/index.js';
import { lift } from '../../core/motion/motion.js';
import { opacityEnvelope, ANIM } from '../../core/timeline/clips.js';
import { FX_PARAMS, bgOptKeys, bgOverErrors, bgPreset, applyBgOver } from '../../core/backgrounds/index.js';
import { bandEnergies, sampleAt, BANDS } from '../../core/tracks/spectrum.js';
import { ransomGlyph, ransomSwatches, RANSOM_FACES } from '../../core/type/ransom.js';
import { boundaryMechanism, lowerScene, checkStingColor } from '../../core/transitions/lower.js';
import { checkLayer } from '../../core/layers/vocabulary.js';
import { ENERGY, okEnergy } from '../../core/transitions/energy.js';
import { SEAM_FX } from '../../core/timeline/seams.js';
import { SEAM_CUE } from '../../core/audio/cues.js';
import { resolveBridges } from '../../core/audio/bridges.js';
import { RESAMPLE_FX, BLUR_DIR } from '../../core/resample/effects.js';
import { RAYMARCH_FX } from '../../core/surfaces/raymarch-fx.js';
import { THREE_FX } from '../../core/surfaces/three-scenes.js';
import { pairActs, parsePairs, verdictOf, isPlaceholderSurface } from '../../quality/gates/content-check.mjs';
import { evenSamples } from '../../quality/gates/beats-of.mjs';
import { gradeable, tileBox, baseOf } from '../../quality/gates/tile.mjs';
import { sceneTiming } from '../../quality/gates/scene-timing.mjs';
import { deriveEngineTruth, findNumberClaims, findRetiredNames } from '../../harness/lib/claims-truth.mjs';
import { adaptFinding } from '../../harness/lib/safeguards.mjs';
import { DIAL_CONTRACT_VIOLATIONS } from '../../core/registry/knobs.js';

// Snapshot taken BEFORE any test fixture runs: knobs.js's own `bindDials(KNOBS.kinetic, PRESETS)` ran
// at import, above, so this is exactly the real repo's violations, none of the synthetic ones the
// bindDials tests further down push onto the same array to test the collection mechanism itself.
const REAL_DIAL_VIOLATIONS = DIAL_CONTRACT_VIOLATIONS.slice();

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

let pass = 0, fail = 0;
const r2gain = (v) => Math.round(v * 1000) / 1000;
const approx = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;
const ok = (name, cond) => { if (cond) { pass++; } else { fail++; console.error('✗ ' + name); } };

test('lib-test: lints', async () => {
// ---- schema-drift --write: a regeneration must be READABLE and must never drop a name -------------
// Both halves of engine-doctrine/MISTAKES.md #564. The generator emitted each array on one line while
// schema.json is committed one-name-per-line, so every `--write` reflowed a 451-line block into 6 and
// `git diff --stat` reported ~445 deletions for a one-prop change. Nothing was lost, the data
// round-tripped identical, but the diff was unreadable, and an unreadable diff is where a real
// deletion hides. So: the render must reproduce the committed file byte for byte, and a write that
// WOULD lose a prop name must refuse.
//
// The refusal is exercised end to end, against the real file, because the whole point is that it
// happens before the write. A bogus name is spliced into the committed `layerProps.shared`, which no
// module declares, so regenerating would drop it. The original text is restored either way, and the
// test fails loudly if the guard let the write through.
{
  const { execFileSync } = await import('node:child_process');
  const gate = new URL('../../quality/gates/schema-drift.mjs', import.meta.url).pathname;
  const file = path.join(repoRoot, 'films', 'scene', 'schema.json');
  const original = fs.readFileSync(file, 'utf8');
  const run = (args) => {
    try { return { code: 0, out: String(execFileSync(process.execPath, [gate, ...args], { stdio: 'pipe' })) }; }
    catch (e) { return { code: e.status, out: String(e.stdout || '') + String(e.stderr || '') }; }
  };
  try {
    ok('schema-drift: --write over a current file is byte-identical (no reflow, so the diff is the change)',
      run(['--write']).code === 0 && fs.readFileSync(file, 'utf8') === original);

    const marked = original.replace('"shared": [\n', '"shared": [\n   "zzTestPropNothingDeclares",\n');
    ok('schema-drift: the refusal test could splice its subject in', marked !== original);
    fs.writeFileSync(file, marked);
    const refused = run(['--write']);
    const kept = fs.readFileSync(file, 'utf8') === marked;
    ok('schema-drift: --write REFUSES a regeneration that would drop a prop name, and writes nothing',
      refused.code === 2 && /refusing to write/.test(refused.out) && /zzTestPropNothingDeclares/.test(refused.out) && kept);
    ok('schema-drift: --force is the way past it, and the drop is named on the way',
      run(['--write', '--force']).code === 0 && fs.readFileSync(file, 'utf8') === original);
  } finally {
    if (fs.readFileSync(file, 'utf8') !== original) fs.writeFileSync(file, original);
  }
}


// ---- prop-probe: the exhaustive input to the prop audit (quality/gates/prop-probe.mjs) ----
//
// The prober's TABLE is produced in a browser and cannot be asserted here. These two things can, and
// they are the two that decide whether the table means anything: that a guarded prop is probed with its
// guard SET, and that `three` is asked once per preset claiming a dial rather than once per prop.
{
  const { watchProps, deadProps, auditedProps } = await import('../../core/registry/prop-audit.js');
  const { probesOf, surfaceOf } = await import('../../quality/gates/prop-probe.mjs');

  // deadProps is the ONE copy of the decision: read a key, and only the unread one comes back.
  const L = watchProps({ type: 'text', text: 'x', size: 40 });
  void L.text;
  ok('prop-audit: deadProps reports the prop that was never read',
    deadProps(L, new Set(['text', 'size'])).join() === 'size');
  ok('prop-audit: deadProps says nothing about a prop outside the set it was asked about',
    deadProps(L, new Set(['text'])).length === 0);
  ok('prop-audit: deadProps ignores the author\'s own `_` annotations',
    deadProps(watchProps({ type: 'text', _why: 'a note' }), new Set(['_why'])).length === 0);
  ok('prop-audit: auditedProps scopes a type out of its own declarations',
    auditedProps('text').has('bg') && !auditedProps('text').has('size'));

  // GUARD SATISFACTION. `fitH` is declared `{ when: 'fit' }` (core/layers/text.js:10) and text.js:25
  // reads it only inside `if (L.fit && L.w)`. A probe that set `fitH` alone would report a live prop
  // dead, which is the failure mode that would make this whole gate noise.
  const fitH = probesOf('text').find((p) => p.prop === 'fitH');
  ok('prop-probe: a `when`-guarded prop is probed with its guard set', !!fitH && fitH.layer.fit != null);
  ok('prop-probe: and with the width that guard needs to do anything', !!fitH && fitH.layer.w != null);
  const caretHold = probesOf('text').find((p) => p.prop === 'caretHold');
  ok('prop-probe: the typing family is probed with `typing` set',
    !!caretHold && caretHold.layer.typing != null && caretHold.layer.caretHold != null);

  // PER-PRESET COVERAGE, and this is the acceptance test in assertion form. Five three scenes read
  // `metalness`; the one that ignored it was deviceShowcase (engine-doctrine/MISTAKES.md #529). Asking one preset
  // per prop would have asked a scene that reads it and passed over the bug.
  const metal = probesOf('three').filter((p) => p.prop === 'metalness');
  ok('prop-probe: `three` asks every preset that claims a dial, not the first',
    metal.length > 1 && metal.every((p) => p.layer.three === p.at));
  ok('prop-probe: including deviceShowcase, the preset that ignored metalness',
    metal.some((p) => p.at === 'deviceShowcase'));
  ok('prop-probe: one probe layer carries exactly one target prop, on a minimal valid layer',
    probesOf('rect').every((p) => p.layer.type === 'rect' && p.layer[p.prop] !== undefined));
  ok('prop-probe: the surface covers what the type declares AND the kit props the audit scopes',
    surfaceOf('three').includes('metalness') && surfaceOf('three').includes('bg'));

  // THE ARITY TRAP, and it bit on the first run of the prober. A builder reads its props off a
  // destructured parameter (propsOf, core/registry/props.js), and a defaulted parameter only takes its default
  // when the caller passes nothing there. So the pattern must sit AFTER every argument the dispatcher
  // passes: core/layers/index.js calls build(kit, el, L) with three and frame(kit, el, L, t, scene)
  // with five. cursor, clip and lottie put the pattern in the fifth slot, destructured `scene`, and
  // read path/clicks/speed/loop as undefined on every frame, with no error and no film to notice.
  // `Function.length` counts the parameters before the first defaulted one, which IS the pattern's
  // index, so one comparison settles it and nothing here can go stale as the engine moves.
  const DISPATCHED = { build: 3, frame: 5 };
  for (const file of fs.readdirSync(new URL('../../core/layers/', import.meta.url))) {
    if (!file.endsWith('.js') || file === 'index.js' || file === 'util.js' || file === 'vocabulary.js') continue;
    const mod = await import(`../../core/layers/${file}`);
    for (const [name, min] of Object.entries(DISPATCHED)) {
      const fn = mod[name];
      if (typeof fn !== 'function' || !/=\s*L\s*\)\s*\{/.test(String(fn))) continue;
      ok(`prop-probe: ${file} ${name}() puts its destructured pattern past all ${min} dispatched arguments`,
        fn.length >= min);
    }
  }
}

// ---- the committed GENERATED artifacts have a check, and a target that runs it ----
// registry/, engine-doctrine/BLOCKS.md and site/lib/blocks.json are generated, committed, and read by outsiders.
// Each check EXISTED and none was reachable: the registry target documented `CHECK=1` in three places
// and its recipe passed no flag, so `make site X=registry CHECK=1` regenerated and exited 0, which looks
// exactly like a passing check. registry/ and blocks.json were both stale for a week underneath it.
// These asserts hold the wiring, not the freshness: site-check runs the real comparison, and this
// fails the moment somebody drops the flag again, which is the bug that actually happened.
// (registry/blocks-docs/blocks-json moved from their own Makefile targets into site-tool.mjs's TOOLS
// table when the SITE-phase publishers folded into `make site X=<name>`; the wiring lives there now.)
{
  const st = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '../../harness/lib/site-tool.mjs'), 'utf8');
  const sc = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '../../quality/gates/site-check.mjs'), 'utf8');
  for (const gen of ['registry', 'blocks-docs', 'blocks-json']) {
    ok(`generated: make site X=${gen} passes CHECK=1 through as --check`,
      new RegExp(`'${gen}':\\s*\\(\\)\\s*=>\\s*\\['scripts/site/${gen}\\.mjs',\\s*\\.\\.\\.check\\(\\)\\]`).test(st));
    ok(`generated: site-check verifies ${gen}`, new RegExp(`scripts/site/${gen}\\.mjs.*--check`).test(sc));
    ok(`generated: scripts/site/${gen}.mjs reads --check`,
      /--check/.test(fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), `../../scripts/site/${gen}.mjs`), 'utf8')));
  }
}

// ---- the MCP tool descriptions carry the inventory --------------------------------------------
//
// A calling model reads a tool's DESCRIPTION before every call and its OUTPUT only when it decides to
// call. So the size of the vocabulary belongs in the description, and this holds that wiring: the
// failure it guards against is silent, because a description that lost its inventory still reads as a
// perfectly good sentence.
{
  const { inventory } = await import('../../mcp/catalog.mjs');
  const inv = inventory();
  ok('mcp: the inventory reads the generated index and reports a real total',
    inv && inv.total > 100 && inv.families > 10 && inv.top.length === 6);
  const src = fs.readFileSync(path.join(repoRoot, 'mcp/server.mjs'), 'utf8');
  ok('mcp: vawe_capabilities and vawe_guide both carry it',
    (src.match(/\+ inventoryLine/g) || []).length >= 2);
  // ABSENCE MUST DEGRADE, NEVER LIE. A fresh clone has no site/lib/effects.json until `make regen`
  // has run, and a description inventing a count would be worse than one that omits it.
  ok('mcp: a missing index yields null rather than a made-up number',
    /catch \{ return null; \}/.test(fs.readFileSync(path.join(repoRoot, 'mcp/catalog.mjs'), 'utf8')));
}


// ---- effects-json `prose`: a colon or an en dash, and nothing else -----------------------------
//
// The class read `[: –]` with a literal SPACE inside it, so it matched every whitespace run and every
// intro reached the site with each word separated by a bullet. The markdown renderer was unaffected,
// which is exactly why it survived: two renderers read one intro and only one of them was ever looked at.
{
  const src = fs.readFileSync(path.join(repoRoot, 'scripts/site/effects-json.mjs'), 'utf8');
  // The DECLARATION, not the file: the comment above this fix quotes the broken class, and a whole-file
  // search would read the explanation as the bug.
  ok('effects-json: `prose` splits on a colon or an en dash, not on whitespace',
    /\[:–\]/.test(src) && !/\[: –\]/.test(src.replace(/^\s*\/\/.*$/gm, '')));
  // COUNTING BULLETS IS THE WRONG SIGNAL and the first cut of this used it: an intro that genuinely
  // uses several colons is correctly bulleted several times, and five real ones failed. The tell of the
  // bug is a segment that is ONE WORD, because it split between words rather than at punctuation.
  const site = JSON.parse(fs.readFileSync(path.join(repoRoot, 'site/lib/effects.json'), 'utf8'));
  const shredded = site.list.filter((f) => {
    const parts = (f.intro || '').split(' · ');
    return parts.length > 4 && parts.filter((p) => p.trim().split(/\s+/).length === 1).length > parts.length / 2;
  });
  ok(`effects-json: no intro is split between its words${shredded.length ? ': ' + shredded.map((f) => f.id).join(', ') : ''}`,
    shredded.length === 0);
}


// ---- the rung tags: a claimed mechanism must exist, and the [eye] count may never rise ----------
//
// A rung tag is a DECLARATION THAT CLAIMS AN OWNER, which is the exact shape this repo logs more often
// than any other failure: a field written and never read, a gate named in a doc and deleted a year ago,
// a waiver keyword that only makes a gate stop talking. So the tags are worth nothing unless the claim
// is checked, and the three things checked here are the three ways the mechanism rots: a gate that was
// renamed, an [eye] count that creeps up while nobody watches, and a heading whose tag stops parsing.
{
  const { execFileSync } = await import('node:child_process');
  const gate = path.join(repoRoot, 'quality/gates/rung.mjs');
  const ratchet = path.join(repoRoot, 'quality/baselines/rung-ratchet.json');
  const claude = path.join(repoRoot, 'AGENTS.md');
  const savedRatchet = fs.readFileSync(ratchet, 'utf8');
  const savedClaude = fs.readFileSync(claude, 'utf8');
  const run = (...args) => { try { return { code: 0, out: execFileSync('node', [gate, ...args], { encoding: 'utf8', cwd: repoRoot }) }; }
    catch (e) { return { code: e.status, out: `${e.stdout || ''}${e.stderr || ''}` }; } };
  try {
    const clean = run();
    ok('rungs: every tag CLAUDE.md and engine-doctrine/CRAFT carry today names something that exists', clean.code === 0);
    ok('rungs: and the distribution is printed, so the shape of the debt is visible', /\[eye\]/.test(clean.out));

    // A GATE THAT DOES NOT EXIST. The tag reads exactly as authoritative as a true one, which is why
    // this has to be mechanical: nobody re-checks a path in a heading they have read fifty times.
    fs.writeFileSync(claude, savedClaude.replace(
      '`[gated: quality/gates/author-check.mjs]`',
      '`[gated: quality/gates/no-such-gate.mjs]`'));
    const ghost = run();
    ok('rungs: a tag naming a gate that does not exist is REFUSED', ghost.code === 1);
    ok('rungs: and the refusal names the gate it could not find', /no-such-gate\.mjs/.test(ghost.out));

    // A GATE THAT EXISTS AND NEVER FIRES ON THIS RULE. One rung worse than a missing file, because the
    // path resolves and a reader stops there. audio-check.mjs WAS the live example: a real gate, with
    // real prose about silence, emitting no finding code at all. It emits them now (see the sound-gate
    // block below), which is what let the SILENCE section leave [eye].
    fs.writeFileSync(claude, savedClaude.replace(
      '`[gated: quality/gates/author-check.mjs]`',
      '`[gated: quality/gates/author-check.mjs#no-such-code]`'));
    const wrongCode = run();
    ok('rungs: a gate named for a code it never emits is REFUSED', wrongCode.code === 1);
    ok('rungs: and the refusal says so in those words', /does not emit/.test(wrongCode.out));

    // AN UNTAGGED SECTION. [eye] is the honest default and costs one word, so the only reason a section
    // of CLAUDE.md carries no rung is that nobody asked the question.
    fs.writeFileSync(claude, savedClaude.replace(
      '## Changing the engine, not a film?  `[live: harness/live/craft-live.mjs]`',
      '## Changing the engine, not a film?'));
    const bare = run();
    ok('rungs: an untagged section of CLAUDE.md is REFUSED', bare.code === 1);
    ok('rungs: and it is named, so the fix is one word', /untagged: Changing the engine, not a film\?/.test(bare.out));

    // THE [live] RUNG'S OCCUPANT. craft-live.mjs's structural fragment checks (kit-intact,
    // storyboard-order) have their own dedicated coverage in tests/hooks/craft-live-fragment.test.mjs
    // and tests/hooks/no-emdash-live.test.mjs; this only proves the file itself still exists and is
    // wired to the rung the doc claims, same as the rungs assertions above it.
    ok('craft-live: the [live] hook file still exists', fs.existsSync(path.join(repoRoot, 'harness/live/craft-live.mjs')));

    fs.writeFileSync(claude, savedClaude + '\n## Probe  `[eye]`\n');
    fs.writeFileSync(ratchet, JSON.stringify({ eye: 0 }));
    const worse = run();
    ok('rungs: a RISE in the [eye] count is refused', worse.code === 1);
    // The message must name the cheaper path, not merely the number, or the number is what gets edited.
    ok('rungs: and it names both the ablation that motivates it and --stamp',
      /PROMPT-EVAL\.md/.test(worse.out) && /--stamp/.test(worse.out));

    fs.writeFileSync(claude, savedClaude);
    fs.writeFileSync(ratchet, JSON.stringify({ eye: 9999 }));
    ok('rungs: a FALL is reported, not silently accepted', /fewer \[eye\]/.test(run().out));

    ok('rungs: --list prints the worklist and nothing else', /the \[eye\] worklist/.test(run('--list').out));
  } finally {
    fs.writeFileSync(ratchet, savedRatchet);
    fs.writeFileSync(claude, savedClaude);
  }
}


// ---- `make sections` has to ANSWER the rule that cites it, not merely relate to it ------------
//
// CLAUDE.md's "Reflecting a real website" section is tagged `[ref: make sections]`, and rung.mjs can
// only check that the Makefile defines the target. That is a floor, and the tag is worth nothing at the
// floor: a [ref] counts only when running the command returns THE RULE'S OWN ANSWER. The rule says
// storyboard one beat per section, in the site's order, and capture the real block. So the two things
// the output must carry are asserted here rather than left to whoever next edits the printer.
//
// Verified by running it against a live site while the tag was written: 6 sections, each with a stable
// selector and either a ready `make media X=capture` line or the canvas fallback. What a test cannot re-run on
// every machine is the network, so what is checked is the printer, which is the part that can rot.
{
  const src = fs.readFileSync(path.join(repoRoot, 'scripts/brand/sections.mjs'), 'utf8');
  ok('sections: the inventory tells you to storyboard one beat per section, in the site order',
    /storyboard = one beat per section, in this order/.test(src));
  ok('sections: and hands you a runnable `make media X=capture` per block, which is the capture-first half',
    /make media X=capture URL="\$\{url\}" SEL=/.test(src));
  // A CRAWL THAT FINDS NOTHING HAS TOLD YOU NOTHING (engine-doctrine/MISTAKES.md #207). An empty inventory that
  // exits 0 is the tag's worst failure: the command ran, said nothing, and the rule reads as answered.
  ok('sections: an empty inventory FAILS rather than printing a green tick over nothing',
    /if \(!manifest\.length\)/.test(src) && /process\.exit\(1\)/.test(src));
}


// ---- every MEASURING tool ships a known-answer test, run HERE so a broken one fails the same gate
// everything else fails, instead of carrying a `--self-test`/`--selftest` flag nobody ever calls. Before
// this block: motion-floor, frame-check, harness/media/content.mjs, harness/media/study.mjs and
// quality/gates/screen-readiness.test.mjs each had a known-answer check written and NEVER RUN by
// anything (found by grepping the repo for each script's own name: zero hits outside itself). The
// audit's own example ("agents reported a screen passed while clipped") is exactly what an unrun
// self-test buys nobody. ----
{
  const runSelftest = (label, script, args) => {
    const r = spawnSync('node', [path.join(repoRoot, script), ...args], { encoding: 'utf8', cwd: repoRoot });
    ok(label, r.status === 0);
    if (r.status !== 0) console.error(`  (${script} ${args.join(' ')}): ${(r.stderr || r.stdout || '').trim().slice(0, 300)}`);
  };
  runSelftest('known-answer: harness/media/content.mjs --selftest', 'harness/media/content.mjs', ['--selftest']);
  runSelftest('known-answer: harness/media/study.mjs --selftest', 'harness/media/study.mjs', ['--selftest']);
  runSelftest('known-answer: screen-readiness.test.mjs (readiness() against fixed markup)',
    'tests/gates/screen-readiness.test.mjs', []);
  runSelftest('known-answer: preview-fragment.test.mjs (sanitiser parity + real layer box clipping)',
    'tests/gates/preview-fragment.test.mjs', []);
}


// ---- registry doc pointers: the freshness check, same contract as craft-rules' own doc field --------
// A registry entry's `docs[name] = { doc, brief }` (core/registry/registry.js's `docs` option, used by
// the 18 layer types with real craft doctrine beyond their own blurb, core/layers/index.js) is checked
// here the same way engine-doctrine/CRAFT/rules/*.json is checked: the file exists, the anchor exists,
// and the quoted `brief` still appears in that section. A stale quote fails HERE, loudly, rather than
// rotting silently the way an unchecked pointer would.
{
  const { validateRegistryDocs } = await import('../../harness/lib/registry-docs.mjs');
  const problems = await validateRegistryDocs();
  ok(`registry docs: every doc pointer's file/anchor/quote checks out${problems.length ? `: ${problems.join('; ')}` : ''}`, problems.length === 0);
}


// ---- layer lanes: the studio's literal copy of core/layers/kinds.js must not drift ----
{
  const { KIND } = await import('../../core/layers/kinds.js');
  const src = fs.readFileSync(new URL('../../studio/ui/studio.js', import.meta.url), 'utf8');
  const lit = /const KIND=(\{[^}]*\});/.exec(src)?.[1];
  const studio = lit ? new Function(`return ${lit}`)() : null;
  ok('layer lanes: studio/ui/studio.js KIND equals core/layers/kinds.js KIND', JSON.stringify(studio) === JSON.stringify(KIND));
}


  assert.equal(fail, 0, `${fail} of ${pass + fail} assertion(s) failed`);
  assert.ok(pass >= 58, `expected at least 58 assertions (the count this file was split with) to have run, saw ${pass}`);
});
