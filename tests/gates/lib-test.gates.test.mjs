import test from 'node:test';
import assert from 'node:assert/strict';
// tests/gates/lib-test.gates.test.mjs: fast pure-JS asserts, split by domain out of the old quality/gates/lib-test.mjs.
// No browser needed (the primitives are pure). Run: node tests/gates/lib-test.gates.test.mjs  (make test)
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
import { classifyRegions } from '../../quality/gates/motion-floor.mjs';
import { sceneTiming } from '../../quality/gates/scene-timing.mjs';
import { exitEmphasis, entranceEmphasis } from '../../quality/gates/choreo.mjs';
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

test('lib-test: gates', async () => {
// ---- a gate's own FIX INSTRUCTION must be a command that runs ----
// `quality/gates/audio-check.mjs` told an author to run `make sfx` in two places and printed it inside
// the finding, in the tone of the fix. There is no such target; the bake is `make audio`. So following
// a gate's own advice failed with "No rule to make target `sfx`", which is worse than no advice: it
// teaches the reader that the gates do not know their own repo, and the next real instruction gets
// ignored too. `make check GATE=doc-refs` already checks this for DOCS, and found 111 stale paths when it landed.
// Nothing checked the strings the gates themselves print.
{
  const mk = fs.readFileSync(path.join(repoRoot, 'Makefile'), 'utf8');
  const targets = new Set([...mk.matchAll(/^([a-zA-Z][\w-]*)\s*:/gm)].map((m) => m[1]));
  const dir = path.join(repoRoot, 'quality/gates');
  const bad = [];
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.mjs')) continue;
    const src = fs.readFileSync(path.join(dir, f), 'utf8');
    // BACKTICKED OR COMMAND-SHAPED ONLY. A bare /make (\w+)/ matches English: "make sure", "make it",
    // "make a decision" all appear in gate prose and produced 45 false hits on the first run. A gate
    // prints a command either inside backticks or after a colon and run of spaces, so those are the two
    // forms checked, and ordinary sentences are left alone.
    // COMMENTS ARE STRIPPED FIRST, and that is not tidiness. Gate files discuss this very class in
    // prose: doc-refs.mjs:145 records reporting `make builds` and `make timed` as missing when they
    // were quoted inside a comment, and snap-blocks.mjs names `make slop` as a past mistake. Reading
    // a comment as an instruction makes the check argue with prose that is already correct, which is
    // the failure doc-refs already wrote down and this would otherwise repeat.
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '')
      .split('\n').filter((l) => !/^\s*(\/\/|\*)/.test(l)).join('\n');
    const forms = [...code.matchAll(/`make ([a-z][\w-]*)/g), ...code.matchAll(/:\s\s+make ([a-z][\w-]*)/g)];
    for (const m of forms) if (!targets.has(m[1])) bad.push(`${f}: make ${m[1]}`);
  }
  if (bad.length) console.log('    gates naming a make target that does not exist:', [...new Set(bad)].join(' · '));
  ok('gates: every `make <target>` a gate prints is a target the Makefile has', bad.length === 0);
}


// ---------------------------------------------------------------------------------------------------
// SCENE UNITS: which layers the beat wrapper carries through the cut (engine-doctrine/MISTAKES.md #555).
//
// The wrapper owns the exit slide, so a layer it carries loses its own exit and lives to the end of the
// cut window. Applied to EVERY layer of the beat, a beat that is a whole act paints its entire history
// at once. These assert the membership rule through scene-timing.mjs, which is the ONE model of it
// outside the renderer; films/scene/scene.js carries the same rule and snap-all's tpot-launch
// baseline is what proves the two still agree in the DOM.
{
  const { sceneTiming } = await import('../../quality/gates/scene-timing.mjs');
  const scene = (layers) => ({ module: 'scene', duration: 12, sceneUnits: true,
    cuts: [{ t: 6, style: 'slide', dur: 0.6 }], bg: [{ t: 0, preset: 'plain' }], layers });
  const held = (layers, i) => { const T = sceneTiming(scene(layers)); return T.unitEnd(T.scene.layers[i]); };
  const L = (start, duration, extra = {}) => ({ type: 'text', text: 'x', size: 80, start, duration, ...extra });

  ok('sceneUnits: the beat\'s last state rides the wrapper out, so it lives to the end of the cut window',
    held([L(0, 6)], 0) === 6.6);
  ok('sceneUnits: a layer SUPERSEDED inside its beat keeps its authored window and is not resurrected',
    held([L(0, 3), L(3, 3)], 0) === null && held([L(0, 3), L(3, 3)], 1) === 6.6);
  ok('sceneUnits: three sequential lines in one beat leave only the third on screen at the cut',
    (() => { const ls = [L(0, 2), L(2, 2), L(4, 2)];
      return held(ls, 0) === null && held(ls, 1) === null && held(ls, 2) === 6.6; })());
  // The reason the fix moves ONE scene and not fifteen. A line that lands a beat early and waits for the
  // cut in silence was never replaced, so the wrapper still carries it: a strict on-screen-at-the-cut
  // test would drop it and slide an empty beat out, which is a regression in every showcase scene.
  ok('sceneUnits: a deliberate hold (nothing starts after it ends) still rides the wrapper out',
    held([L(0, 5.5)], 0) === 6.6);
  ok('sceneUnits: supersession is measured against when a layer ENDS, so an overlapping pair both ride out',
    (() => { const ls = [L(0, 6), L(1, 5)]; return held(ls, 0) === 6.6 && held(ls, 1) === 6.6; })());
  // float noise: 17.4 + 2.7 lands on 20.099999999999998, and a cut at 20.1 must not read that as gone.
  ok('sceneUnits: a layer ending ON its cut is current, float noise included',
    held([L(0, 2), L(2, 4.0000000000001)], 1) === 6.6);
  ok('sceneUnits: `acrossBeats` still opts a layer out of the wrapper entirely',
    held([L(0, 2, { acrossBeats: true }), L(2, 4)], 0) === null);
}


// ---- the judge rubric: the two things a prompt template must not lose --------------------------
//
// A prompt is not code and nothing here asserted anything about it, which is how both of these came to
// be true at once. They are asserted rather than merely fixed because the rubric is prose, and prose
// regresses by being rewritten well.
{
  const { craftRubric, abRubric } = await import('../../quality/gates/rubric.mjs');
  const craft = craftRubric({ name: 'probe', frames: 6, landscape: true, dir: '/tmp/judge' });
  const ab = abRubric({ rows: 4, landscape: true, dir: '/tmp/judge', judge: '1' });

  // ABSTENTION. The craft verdict grammar had two values, PASS and FIX, so a judge asked about a
  // dimension a STILL cannot carry had to guess, and the guess came back in the same shape as a real
  // finding. engine-doctrine/MISTAKES.md #155 is the archetype: a background "matched" on one frame that was 2.5x
  // too fast in motion. harness/author/arsenal.mjs solved the identical problem with CONFIDENT and a
  // WEAK GUESS heading (#552) and it was never carried to the judge.
  ok('rubric: the craft judge can decline a dimension a still cannot answer',
    craft.includes('CANNOT TELL'));
  ok('rubric: and is told what evidence would settle it instead of guessing',
    /strip|seam frames|rendered mp4/.test(craft));
  // The A/B sheet already had its own abstentions and must keep them: a forced choice with no TIE is
  // an instruction to invent a difference.
  ok('rubric: the blind comparison keeps TIE and NEITHER', ab.includes('TIE') && ab.includes('NEITHER'));

  // LENGTH BIAS. Dimension 6 read "crafted density; not a word-on-empty-space slide", which tells the
  // judge to score density UP, the direction an LLM judge already leans. CLAUDE.md argues the opposite
  // case at length (active versus passive whitespace) and notes no gate sees it; the rubric saw it and
  // scored against it. Asked as a question about whether the space is WORKING, a spare frame can win.
  for (const [label, sheet] of [['craft', craft], ['blind', ab]]) {
    ok(`rubric: the ${label} sheet asks what the empty part is DOING, not how much there is`,
      /doing a job/.test(sheet) && !/crafted density/.test(sheet));
  }
}


// ---- gradeable: a render that exists is not a render that is CURRENT -----------------------------
//
// quality/gates/tile.mjs already carried this bug's near twin in its own comment: a wrongly-resolved
// name once made the judge grade a leftover mp4 and "report a clean run on a video the author never
// made". The NAME was fixed and the FRESHNESS was not, so out/x.mp4 could still be the right name for
// a film since rewritten, and every consumer checked only existsSync. An author edits a scene, runs
// `make judge`, and is handed a verdict about a film that no longer exists. Nothing is wrong with the
// file: it is simply the previous answer. This is the harness reflex "that file changed since you read
// it", which the engine had nowhere.
{
  const { gradeable } = await import('../../quality/gates/tile.mjs');
  const dir = fs.mkdtempSync(path.join((await import('node:os')).tmpdir(), 'gradeable-'));
  const scene = path.join(dir, 'probe.json');
  const mp4 = path.join(dir, 'probe.mp4');

  ok('gradeable: no render at all is refused, with the command that makes one',
    (() => { fs.writeFileSync(scene, '{}'); const r = gradeable(scene, mp4);
      return !r.ok && /no rendered video/.test(r.why) && /make video/.test(r.fix); })());

  fs.writeFileSync(mp4, 'x');
  fs.utimesSync(scene, new Date(1e9), new Date(1e9));   // scene older than the render
  ok('gradeable: a render made after the scene is gradeable', gradeable(scene, mp4).ok);

  fs.utimesSync(mp4, new Date(1e9), new Date(1e9));
  fs.utimesSync(scene, new Date(2e9), new Date(2e9));   // scene edited after the render
  const stale = gradeable(scene, mp4);
  ok('gradeable: a render older than its scene is REFUSED', !stale.ok);
  ok('gradeable: and the refusal says it is the previous answer, not a broken file',
    /film you have since edited/.test(stale.why) && /make video/.test(stale.fix));
  ok('gradeable: the age is stated in units a reader does not have to convert',
    /(minute|hour|day)\(s\)/.test(stale.why));

  // EVERY GRADER, NOT JUST THE ONE THAT BIT. The judge, the seam sheet and compare all read a render
  // they did not make; a seam sheet cut from the previous render reports clean seams for a film whose
  // cuts have moved, which is the one class that gate exists to catch.
  for (const g of ['judge.mjs', 'seams.mjs']) {
    ok(`gradeable: quality/gates/${g} asks it before grading`,
      /gradeable\(/.test(fs.readFileSync(path.join(repoRoot, 'quality/gates', g), 'utf8')));
  }
  fs.rmSync(dir, { recursive: true, force: true });
}


// ---- findings: a gate returns a RESULT, not a paragraph the caller re-reads --------------------
//
// author-check used to decide whether a rule had fired by matching `[✗~]\s*\[<code>\]` against the
// gate's printed output. Forty gates can fail and every one of them was one reformat away from being
// silently unheard: the step prints its findings, the aggregator reads none, the film passes. The same
// class is already recorded as engine-doctrine/MISTAKES.md #401, where a verdict line printed after a --json
// payload made the documented machine-readable output unparseable and a sweep called all 154 scenes
// crashed. These asserts hold the contract that replaced it.
{
  const findingsSrc = fs.readFileSync(path.join(repoRoot, 'harness/lib/findings.mjs'), 'utf8');
  const acSrc = fs.readFileSync(path.join(repoRoot, 'quality/gates/author-check.mjs'), 'utf8');
  // Comments quote the regex that was removed, on purpose: the incident is the reason the rule exists.
  // Strip them, so this asserts about CODE and cannot be satisfied by deleting the history.
  const acCode = acSrc.replace(/^\s*\/\/.*$/gm, '');
  ok('findings: author-check no longer builds a RegExp out of a finding code',
    !/new RegExp\([^)]*\$\{code\}/.test(acCode));
  // A marker followed by a BRACKET is the scrape: it is reading a CODE out of a sentence. The bare
  // marker count two lines below it in author-check is a different fact (how many lines the step
  // printed) and is allowed to stay, which is why this pattern requires the bracket.
  ok('findings: author-check no longer scrapes a [code] out of a ✗ / ~ line',
    !/(matchAll|match|test)\(\s*\/[^/]*[✗~][^/]*\\\[/.test(acCode));
  ok('findings: author-check reads the records instead', /readFindings\(/.test(acCode) && /VAWE_FINDINGS_OUT/.test(acCode));

  // The emitter itself: one door, and stdout belongs to JSON under --json.
  ok('findings: the module binds the real stdout before redirecting it',
    /const realStdout = process\.stdout\.write\.bind/.test(findingsSrc)
    && findingsSrc.indexOf('const realStdout') < findingsSrc.indexOf('if (jsonMode) process.stdout.write'));

  // EVERY CONVERTED GATE, BY NAME. A gate that goes back to printing its findings by hand is the whole
  // bug returning, and it would return quietly, so it is named here rather than counted.
  const CONVERTED = ['quality/gates/preflight.mjs', 'quality/gates/beat-check.mjs',
    'quality/gates/direction-floor.mjs', 'quality/gates/seams.mjs',
    'quality/gates/designspec-check.mjs', 'quality/gates/copy-check.mjs', 'quality/gates/read-check.mjs',
    'quality/gates/pace-check.mjs', 'quality/gates/eye-trace.mjs', 'quality/gates/plan-vs-render.mjs',
    'harness/author/motion-director.mjs', 'quality/audit.mjs'];
  for (const g of CONVERTED) {
    const src = fs.readFileSync(path.join(repoRoot, g), 'utf8');
    ok(`findings: ${g} records its findings through the shared emitter`,
      /gateFindings\(/.test(src) && /from '.*lib\/findings\.mjs'/.test(src));
  }

  // A FAILING SCENE, END TO END. The fixture crossfades two absolutely-positioned elements at the same
  // point on one clock, which is exactly what dissolve-check exists to refuse; nothing in the library
  // does it, so the gate could never be proven to speak on a scene it fails.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'findings-'));
  const scene = path.join(dir, 'mud.json');
  fs.writeFileSync(scene, JSON.stringify({ module: 'scene', name: 'mud', duration: 4,
    bg: [{ preset: 'softwash' }], audio: { silent: true, _why: 'a fixture, not a film' },
    layers: [{ type: 'html', id: 'mud', at: 0, dur: 4,
      html: '<div style="position:absolute;left:10%;top:20%;opacity:var(--t)">AFTER</div>'
          + '<div style="position:absolute;left:10%;top:20%;opacity:calc(1 - var(--t))">BEFORE</div>' }] }));
  const gate = path.join(repoRoot, 'quality/gates/seams.mjs');

  const asJson = spawnSync('node', [gate, scene, '--json'], { encoding: 'utf8', cwd: repoRoot });
  ok('findings: --json exits with the same code the prose run does', asJson.status === 1);
  let parsed = null;
  try { parsed = JSON.parse(asJson.stdout); } catch { parsed = null; }
  ok('findings: --json stdout PARSES on a scene the gate fails', Array.isArray(parsed) && parsed.length === 1);
  ok('findings: and it carries the code, the severity and the scene',
    parsed && parsed[0].code === 'crossfade-mud' && parsed[0].severity === 'error' && parsed[0].scene === scene);
  ok('findings: nothing but JSON reaches stdout under --json (#401: the human verdict goes to stderr)',
    asJson.stdout.trim().startsWith('[') && asJson.stdout.trim().endsWith(']')
    && /double exposure/.test(asJson.stderr));

  // The prose is the same prose, rendered from the record.
  const prose = spawnSync('node', [gate, scene], { encoding: 'utf8', cwd: repoRoot });
  ok('findings: the prose run still prints the finding line it always printed',
    /^ {2}✗ \[crossfade-mud\] layer "mud":/m.test(prose.stdout));
  ok('findings: and it says nothing on stderr', prose.stderr === '');

  // The side channel: how author-check gets the structure without a second run.
  const out = path.join(dir, 'recs.json');
  const side = spawnSync('node', [gate, scene], { encoding: 'utf8', cwd: repoRoot,
    env: { ...process.env, VAWE_FINDINGS_OUT: out } });
  ok('findings: VAWE_FINDINGS_OUT gets the records while stdout keeps the prose',
    JSON.parse(fs.readFileSync(out, 'utf8'))[0].code === 'crossfade-mud' && /crossfade-mud/.test(side.stdout));

  // A CLEAN RUN IS STILL A RESULT. Every one of these gates exits early when it finds nothing, long
  // before its report block, so the empty answer has to be flushed on the way out or the caller cannot
  // tell "found nothing" from "does not speak records".
  const clean = path.join(dir, 'clean.json');
  fs.writeFileSync(clean, JSON.stringify({ module: 'scene', name: 'clean', duration: 4,
    bg: [{ preset: 'softwash' }], layers: [{ type: 'text', text: 'hello', at: 0, dur: 4 }] }));
  const cleanOut = path.join(dir, 'clean-recs.json');
  // copy-check, not the dissolve gate: it returns at `process.exit(0)` the moment it has nothing to
  // say, several blocks above its report, which is exactly the path the exit flush exists for.
  spawnSync('node', [path.join(repoRoot, 'quality/gates/copy-check.mjs'), clean], { encoding: 'utf8', cwd: repoRoot,
    env: { ...process.env, VAWE_FINDINGS_OUT: cleanOut } });
  ok('findings: a gate that finds nothing still writes an empty result',
    (() => { try { return JSON.stringify(JSON.parse(fs.readFileSync(cleanOut, 'utf8'))) === '[]'; } catch { return false; } })());

  fs.rmSync(dir, { recursive: true, force: true });
}


// ---- the sound gate: silence has to be a decision, and the decision has to be READABLE ---------
//
// This gate ran for months and nothing read it. It was not one of author-check's steps, and it stated
// each finding as a tuple in a local array, so harness/lib/finding-codes.mjs saw no code from it and
// quality/gates/rung.mjs would have called a tag naming it a FALSE TAG. Both halves are asserted here,
// because both halves failed silently and either one alone leaves the rule unenforced again.
{
  const { execFileSync } = await import('node:child_process');
  const gate = path.join(repoRoot, 'quality/gates/audio-check.mjs');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sound-gate-'));
  const outFile = path.join(tmp, 'findings.json');
  const run = (audio) => {
    const scene = path.join(tmp, 'scene.json');
    fs.writeFileSync(scene, JSON.stringify({ module: 'scene', ...(audio === undefined ? {} : { audio }) }));
    try { fs.rmSync(outFile, { force: true }); } catch { /* first run */ }
    let out;
    try { out = execFileSync('node', [gate, scene], { encoding: 'utf8', cwd: repoRoot, env: { ...process.env, VAWE_FINDINGS_OUT: outFile } }); }
    catch (e) { out = `${e.stdout || ''}${e.stderr || ''}`; }
    let recs = []; try { recs = JSON.parse(fs.readFileSync(outFile, 'utf8')); } catch { /* wrote none */ }
    return { out, recs, codes: recs.map((r) => r.code) };
  };
  try {
    const bare = run({ silent: true });
    ok('sound gate: silent:true with no _why fires silence-without-a-reason',
      bare.codes.includes('silence-without-a-reason'));
    // THE RECORD, NOT THE LINE. The old shape printed the same sentence and told the aggregator
    // nothing, which is how a working gate stayed unread (engine-doctrine/MISTAKES.md #401).
    ok('sound gate: and it says so as a RECORD, so author-check can read it without scraping prose',
      bare.recs.some((r) => r.code === 'silence-without-a-reason' && r.severity === 'error' && r.fix));
    ok('sound gate: and the printed line still carries the code, for the person watching',
      /\[silence-without-a-reason\]/.test(bare.out));

    ok('sound gate: a stated reason clears it',
      !run({ silent: true, _why: 'autoplays muted in-feed; the type carries it alone' }).codes.includes('silence-without-a-reason'));
    // A WORD IS NOT A REASON. 12 chars, the same floor author-check uses for `authoring._why`.
    ok('sound gate: a one-word _why does not count as a decision',
      run({ silent: true, _why: 'muted' }).codes.includes('silence-without-a-reason'));
    ok('sound gate: no audio block at all is a different finding, because nobody decided anything',
      run(undefined).codes.includes('silent-by-omission'));
    ok('sound gate: an audio block that names nothing renders silent and says so',
      run({ musicGain: 1 }).codes.includes('audio-block-produces-nothing'));
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }

  // THE WIRING IS THE OTHER HALF. A gate nothing runs is a gate that does not exist, and this one was
  // in that state while its prose read as enforcement.
  const ladder = fs.readFileSync(path.join(repoRoot, 'quality/gates/author-check.mjs'), 'utf8');
  // The PATH, in the CALL. Matching the path anywhere in the file passes on the comment above the call,
  // which is the whole failure again: prose reading as a mechanism.
  ok('sound gate: author-check runs it as one of its steps',
    /styleGate\('sound',[^\n]*'quality\/gates\/audio-check\.mjs'/.test(ladder));
  ok('sound gate: and declares it in the ladder it prints before it runs', /\['sound', 'reports'/.test(ladder));
  // The tag in CLAUDE.md cites a code. rung.mjs checks the citation; this checks the citation is the
  // one the gate actually fires on, which is the difference between a rung and a plausible neighbour.
  const { codesEmitted } = await import('../../harness/lib/finding-codes.mjs');
  const codes = codesEmitted();
  ok('sound gate: finding-codes.mjs can SEE its codes, so the [gated] tag verifies against the derived map',
    (codes.get('silence-without-a-reason') || new Set()).has('quality/gates/audio-check.mjs'));
}


// ---- direction-floor: a seam recipe is a declared transition, read before recipe expansion --------
// DEFECT: direction-floor reads `sig.transition` off the EXPANDED scene, where recipes/expand.mjs has
// already compiled a `recipes[]` seam line to plain `motion` keys and deleted `recipes`. A film whose
// every joint is a seam recipe (no raw `seams`/`cuts`/`transitions`) then measured zero transitions and
// fired `no-transition` on a film that had in fact earned several. Fixed by counting seam-kind recipe
// lines on the RAW scene, before expansion.
{
  const seamScene = {
    module: 'scene', duration: 4,
    layers: [
      { id: 'a', type: 'text', text: 'Hello', size: 60, w: 400, start: 0 },
      { id: 'b', type: 'text', text: 'World', size: 60, w: 400, start: 1.4 },
    ],
    recipes: [{ recipe: 'flow-seam', at: 1, out: 'a', in: 'b' }],
  };
  const tmp2 = fs.mkdtempSync(path.join(os.tmpdir(), 'direction-floor-seam-'));
  const seamFile = path.join(tmp2, 'seam.json');
  fs.writeFileSync(seamFile, JSON.stringify(seamScene));
  const seamRun = spawnSync(process.execPath, [path.join(repoRoot, 'quality/gates/direction-floor.mjs'), seamFile], { encoding: 'utf8' });
  ok('direction-floor: a seam recipe counts as a transition (transition×1 in the vocabulary line)',
    /transition×1/.test(seamRun.stdout));
  ok('direction-floor: a seam recipe means no-transition does not fire',
    !/no-transition/.test(seamRun.stdout));
  fs.rmSync(tmp2, { recursive: true, force: true });
}


// ---- beats-of: a film's storyboard beat table wins over the layer-start guess ----------------------
// judge.mjs sampled ONE key frame on a 7-beat film built from a few long full-frame fragments, because
// beatStarts's clustering only counts layers with track>1 and duration<D*0.7, and a film like that has
// almost none. The fix: read the declared beat table from `<scene>.storyboard.md` when one exists
// beside the scene file, and fall back to the old heuristic only when there is none (or no file path
// to check one against, e.g. a caller scanning many scenes with no single storyboard to read).
{
  const { beatStarts } = await import('../../quality/gates/beats-of.mjs');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'beats-of-'));
  const sceneFile = path.join(tmp, 'demo.json');
  // A scene built from long full-frame fragments: every layer is track 0/1 or near-full-duration, so
  // the heuristic infers zero beats from it.
  const scene = { duration: 20, layers: [{ type: 'html', start: 0, duration: 20, track: 1 }] };
  fs.writeFileSync(sceneFile, JSON.stringify(scene));

  const noStoryboard = beatStarts(scene, 20, sceneFile);
  ok('beats-of: no storyboard sidecar falls back to the heuristic (zero beats on an all-chrome scene)',
    noStoryboard.beats.length === 0);

  fs.writeFileSync(path.join(tmp, 'demo.storyboard.md'),
    '---\nmessage: "x"\nduration: "20s"\n---\n\n' +
    '## Beat 1: hook (0s-7s)\nobject: the thing\n\n' +
    '## Beat 2: proof (7s-14s)\nobject: the thing\n\n' +
    '## Beat 3: payoff (14s-20s)\nobject: the thing\n');
  const withStoryboard = beatStarts(scene, 20, sceneFile);
  ok('beats-of: a storyboard sidecar wins, reading its real 3-beat table instead of the heuristic\'s zero',
    withStoryboard.beats.length === 3 &&
    withStoryboard.beats[0] === 0 && withStoryboard.beats[1] === 7 && withStoryboard.beats[2] === 14);

  ok('beats-of: omitting the file path (no storyboard to look up) keeps the old two-arg heuristic',
    beatStarts(scene, 20).beats.length === 0);

  fs.rmSync(tmp, { recursive: true, force: true });
}


// ---- core/transitions/relationships.js + contract.mjs: the decision procedure per boundary ---------
{
  const beat = (name, extra) => ({ name, ...extra });
  const catalogNames = new Set(TRANSITIONS_CATALOG.map((t) => t.name));

  // freshness: every catalog candidate in the taxonomy actually exists in the catalog. A device name
  // (camera travel, shared-element morph, match-on-action) is not a catalog transition on purpose.
  let staleCandidate = null;
  for (const [rel, { candidates }] of Object.entries(RELATIONSHIPS)) {
    for (const c of candidates) {
      if (!DEVICES.has(c) && !catalogNames.has(c)) staleCandidate = `${rel}: "${c}"`;
    }
  }
  ok('relationships: every catalog candidate exists in core/transitions/catalog.js', staleCandidate === null);
  if (staleCandidate) console.error(`  (stale candidate: ${staleCandidate})`);

  // parseTransitionWhy: the three-part grammar, a bad relationship word, and "nothing written"
  const why = parseTransitionWhy('time · a slow reveal · invisible');
  ok('contract: transition_why parses relationship/feeling/mode', why && why.relationship === 'time' && why.feeling === 'a slow reveal' && why.mode === 'invisible');
  const badRel = parseTransitionWhy('teleport · zap · invisible');
  ok('contract: transition_why an unknown relationship is an error naming the real ones', !!badRel.error && /continuity/.test(badRel.error));
  const badShape = parseTransitionWhy('time, a slow reveal, invisible');
  ok('contract: transition_why wrong separator (no middle dot) is an error', !!badShape.error);
  ok('contract: transition_why unset is null (no opinion)', parseTransitionWhy(undefined) === null && parseTransitionWhy('') === null);

  // transitionFindings: the three report-only findings, firing and quiet
  const covered = [beat('A', {}), beat('B', { transition_in: 'fx:dissolve', transition_why: 'time · a slow reveal · invisible' })];
  ok('contract: transitionFindings is quiet on a covered, reasoned, matched boundary', transitionFindings(covered).unreasoned.length === 0
    && transitionFindings(covered).uncovered.length === 0 && transitionFindings(covered).mismatch.length === 0);

  const unreasoned = [beat('A', {}), beat('B', { transition_in: 'fx:cinematicZoom' })];
  ok('contract: transitionFindings.unreasoned fires when transition_in has no transition_why', transitionFindings(unreasoned).unreasoned.length === 1);

  const uncovered = [beat('A', {}), beat('B', {})];
  ok('contract: transitionFindings.uncovered fires on a bare boundary (no transition_in/recipe/camera/becomes)', transitionFindings(uncovered).uncovered.length === 1);
  const coveredByBecomes = [beat('A', {}), beat('B', { becomes: 'the card becomes the label' })];
  ok('contract: transitionFindings.uncovered is quiet when becomes: crosses the boundary', transitionFindings(coveredByBecomes).uncovered.length === 0);
  const coveredBySeam = [beat('A', {}), beat('B', { recipe: 'flow-seam out=a in=b axis=x' })];
  ok('contract: transitionFindings.uncovered is quiet across a flow-seam recipe boundary', transitionFindings(coveredBySeam).uncovered.length === 0);

  // isContinuousBoundary: two beats naming the same fragment file are one continuous surface, not a
  // cut waiting on a transition (vawe-flow-2's beats 2-3-4-5, all one terminal fragment).
  const sameFrag = [beat('A', { fragment: 'terminal.html' }), beat('B', { fragment: 'terminal.html' })];
  ok('contract: isContinuousBoundary is true when two beats name the same fragment', isContinuousBoundary(sameFrag[0], sameFrag[1]));
  ok('contract: transitionFindings.uncovered is quiet across a same-fragment boundary', transitionFindings(sameFrag).uncovered.length === 0);
  const diffFrag = [beat('A', { fragment: 'a.html' }), beat('B', { fragment: 'b.html' })];
  ok('contract: isContinuousBoundary is false when two beats name different fragments', !isContinuousBoundary(diffFrag[0], diffFrag[1]));

  const mismatch = [beat('A', {}), beat('B', { transition_in: 'fx:whipPan', transition_why: 'time · a slow reveal · invisible' })];
  ok('contract: transitionFindings.mismatch fires when the fx is not among the relationship\'s candidates', transitionFindings(mismatch).mismatch.length === 1);
  const matched = [beat('A', {}), beat('B', { transition_in: 'fx:whipPan', transition_why: 'new-place-energy · frantic · expressive' })];
  ok('contract: transitionFindings.mismatch is quiet when the fx IS among the relationship\'s candidates', transitionFindings(matched).mismatch.length === 0);
}


// ---- make transitions D=<film.json>: the per-boundary CLI report, on a fixture storyboard ----------
{
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vawe-transitions-'));
  const sbPath = path.join(tmp, 'x.storyboard.md');
  const jsonPath = path.join(tmp, 'x.json');
  fs.writeFileSync(sbPath, [
    '---',
    'message: "test"',
    'duration: "13s"',
    'spectacle: "beat 2, card, punch, the reveal"',
    'not: "no confetti"',
    '---',
    '',
    '## Beat 1, open (0s-3s)',
    'why: open',
    '',
    '## Beat 2, reveal (3s-6s)',
    'why: payoff',
    'transition_in: fx:cinematicZoom',
    'transition_why: time · a slow reveal · invisible',
    '',
    '## Beat 3, grain gradient (6s-9.5s)',
    'why: texture',
    '',
    '## Beat 4, grain settle (9.5s-13s)',
    'why: hold',
    'fragment: terminal.html',
    '',
  ].join('\n'));
  fs.writeFileSync(jsonPath, '{"module":"scene"}');
  const r = spawnSync('node', [path.join(repoRoot, 'quality/gates/transitions-catalog.mjs'), jsonPath], { encoding: 'utf8', cwd: repoRoot });
  ok('make transitions D=: exits 0 on a fixture storyboard', r.status === 0);
  ok('make transitions D=: names the boundary and its current fx', /beat 1 \(open\) -> beat 2 \(reveal\)/.test(r.stdout) && /fx:cinematicZoom/.test(r.stdout));
  ok('make transitions D=: prints the stated why', /time · a slow reveal · invisible/.test(r.stdout));
  // (b) no transition_why: never guess a candidate from the beat's name ("grain gradient" -> "grain").
  const candidateLines = r.stdout.split('\n').filter((l) => l.trim().startsWith('candidates'));
  ok('make transitions D=: an unreasoned boundary states the relationship first, never a name-guessed fx',
    candidateLines.some((l) => l.includes('state the relationship first (transition_why)'))
    && !candidateLines.some((l) => l.includes('grain')));
  // (c) the relationships list + doc anchor print exactly once, not once per boundary (3 boundaries here).
  const relLines = (r.stdout.match(/^  relationships: /gm) || []).length;
  ok('make transitions D=: the relationships legend prints once, not per boundary', relLines === 1);
  fs.rmSync(tmp, { recursive: true, force: true });
}


// ---- content-check.mjs: act pairing and the verdict function, on synthetic numbers ----------------
{
  const c = (fill, detail, photo, band = 'slightly', colorfulness = 20) => ({ fill, detail, photo, band, colorfulness });

  // pairActs: by order when nothing is said, an explicit list otherwise, and it never invents a pair
  // past whichever side is shorter.
  ok('content-check: pairActs pairs by order up to the shorter side', JSON.stringify(pairActs(9, 10)) === JSON.stringify(Array.from({ length: 9 }, (_, i) => [i + 1, i + 1])));
  ok('content-check: pairActs pairs by order the other way round too', pairActs(3, 10).length === 3);
  ok('content-check: an explicit pairs list wins over order', JSON.stringify(pairActs(9, 10, [[1, 3], [2, 3]])) === JSON.stringify([[1, 3], [2, 3]]));
  ok('content-check: parsePairs reads "1:1,2:2,3:4"', JSON.stringify(parsePairs('1:1,2:2,3:4')) === JSON.stringify([[1, 1], [2, 2], [3, 4]]));
  ok('content-check: parsePairs drops a malformed entry rather than guessing it', JSON.stringify(parsePairs('1:1,nope,3:4')) === JSON.stringify([[1, 1], [3, 4]]));
  ok('content-check: parsePairs of nothing is null, not an empty guess', parsePairs(undefined) === null);

  // verdictOf: a quiet reference (band 'not') asks only whether ours is ALSO quiet; a busy reference
  // asks whether ours clears 60% of it on fill/detail/photo.
  ok('content-check: verdictOf reads "quiet ok" when both sides are quiet', verdictOf(c(0.02, 1.9, 0.01, 'not'), c(0.03, 1.7, 0.01, 'not')) === 'quiet ok');
  ok('content-check: verdictOf reads "over" when ours is busy against a quiet reference', verdictOf(c(0.49, 2.4, 0.02, 'slightly'), c(0.03, 1.7, 0.01, 'not')) === 'over');
  ok('content-check: verdictOf reads "under" when ours misses 60% of a busy reference on fill', verdictOf(c(0.15, 14, 0.23, 'slightly'), c(0.43, 14.1, 0.23, 'slightly')) === 'under');
  ok('content-check: verdictOf reads "ok" when ours matches a busy reference', verdictOf(c(0.43, 14.1, 0.23, 'slightly'), c(0.4, 13, 0.2, 'slightly')) === 'ok');

  // isPlaceholderSurface: the calibration in content-check.mjs itself (vawe-flow's real editor act,
  // madera's real results shot) must NOT trip it; a large flat colourless act must.
  ok('content-check: a real editor act (band slightly) is not a placeholder', !isPlaceholderSurface({ fill: 0.49, band: 'slightly', photo: 0.02, detail: 2.4 }));
  ok('content-check: a real dense act (band slightly) is not a placeholder', !isPlaceholderSurface({ fill: 0.68, band: 'slightly', photo: 0.23, detail: 14.1 }));
  ok('content-check: a large flat colourless mock IS a placeholder', isPlaceholderSurface({ fill: 0.5, band: 'not', photo: 0, detail: 1 }));
  ok('content-check: a small flat colourless patch is not (too little of the frame to be the subject)', !isPlaceholderSurface({ fill: 0.1, band: 'not', photo: 0, detail: 1 }));
}


// ---- the judge prep (quality/gates/judge.mjs), on its own pure halves: which frame stands for which
// beat (beats-of.mjs), and whether a render is fresh enough to grade (tile.mjs). Neither had a test
// before this. A bare mp4 with no scene JSON falls back to evenSamples: n slices of the duration,
// centred in each slice, so the exact times are computable by hand and asserted here rather than eyeballed. ----
{
  const s5 = evenSamples(10, 5);
  ok('judge prep: evenSamples(10, 5) centres each of 5 slices of a 10s film',
    JSON.stringify(s5.map((s) => s.t)) === JSON.stringify([1, 3, 5, 7, 9]));
  ok('judge prep: evenSamples labels and indexes each sample', s5[2].i === 2 && s5[2].label === '@5.0s');

  ok('judge prep: tileBox is scrutiny-sized landscape, not a thumbnail', JSON.stringify(tileBox(true)) === JSON.stringify({ tw: 600, th: 338 }));
  ok('judge prep: tileBox flips to a tall box for a portrait render', JSON.stringify(tileBox(false)) === JSON.stringify({ tw: 340, th: 604 }));
  ok('judge prep: baseOf strips the extension, keeps the rest of the name', baseOf('out/madera.v2.mp4') === 'madera.v2');

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gradeable-'));
  const scenePath = path.join(dir, 'x.json'), mp4Path = path.join(dir, 'x.mp4');
  fs.writeFileSync(scenePath, '{}');
  ok('judge prep: gradeable refuses a scene with no render at all', gradeable(scenePath, mp4Path).ok === false);
  fs.writeFileSync(mp4Path, 'not a real mp4, only mtime matters here');
  const now = Date.now();
  fs.utimesSync(scenePath, now / 1000, now / 1000);
  fs.utimesSync(mp4Path, now / 1000 + 5, now / 1000 + 5);
  ok('judge prep: gradeable passes a render newer than the scene it came from', gradeable(scenePath, mp4Path).ok === true);
  fs.utimesSync(mp4Path, now / 1000 - 60, now / 1000 - 60);
  ok('judge prep: gradeable refuses a render OLDER than the scene: a stale grade of an edited film',
    gradeable(scenePath, mp4Path).ok === false);
  fs.rmSync(dir, { recursive: true, force: true });
}

// harness/lib/runlog.mjs and harness/lib/why.mjs, on synthetic records: appendRun writes the
// documented shape and readRuns reads it back; the why-table formatter and diff read a fixed pair of
// records without touching the filesystem's real out/ directory.
{
  const { appendRun, readRuns, runsPathFor } = await import('../../harness/lib/runlog.mjs');
  const { formatRows, diffLines } = await import('../../harness/lib/why.mjs');

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'runlog-test-'));
  const film = path.join(tmpDir, '_runlog-lib-test.json');
  const cwd = process.cwd();
  process.chdir(tmpDir);
  try {
    ok('runsPathFor names out/<basename>.runs.jsonl', runsPathFor(film) === path.join('out', '_runlog-lib-test.runs.jsonl'));
    ok('readRuns of a film with no log is empty', readRuns(film).length === 0);

    const r1 = appendRun(film, { cmd: 'check', checks: [{ name: 'validate', ran: true, fired: 0, blocked: false, codes: [], waived: [] }] });
    ok('appendRun returns the written record', r1.cmd === 'check' && Array.isArray(r1.checks));
    ok('appendRun defaults render/content/judge to null', r1.render === null && r1.content === null && r1.judge === null);
    ok('appendRun stamps an ISO timestamp', /^\d{4}-\d{2}-\d{2}T/.test(r1.at));

    appendRun(film, {
      cmd: 'ship',
      checks: [
        { name: 'validate', ran: true, fired: 0, blocked: false, codes: [], waived: [] },
        { name: 'storyboard', ran: true, fired: 1, blocked: true, codes: ['no-storyboard'], waived: [] },
      ],
      render: { file: 'out/x.mp4', frames: 300, fps: 30, ms: 8400 },
      judge: { verdict: 'PASS', file: '/tmp/judge/x/sheet.png' },
    });

    const runs = readRuns(film);
    ok('readRuns reads back one line per appendRun call', runs.length === 2);
    ok('readRuns preserves order (oldest first)', runs[0].cmd === 'check' && runs[1].cmd === 'ship');
    ok('a corrupt line is dropped, not thrown', (() => {
      fs.appendFileSync(runsPathFor(film), 'not json\n');
      return readRuns(film).length === 2;
    })());

    const rows = formatRows(runs);
    ok('formatRows returns one line per run', rows.length === 2);
    ok('formatRows names the cmd and sha', rows[1].includes('ship') && rows[1].includes(runs[1].git || '-'));
    ok('formatRows shows the render ms', rows[1].includes('8400ms'));
    ok('formatRows shows the judge verdict', rows[1].includes('judge:PASS'));

    const diff = diffLines(runs[0], runs[1]);
    ok('diffLines names the newly fired code', diff.some((l) => l.startsWith('newly fired:') && l.includes('no-storyboard')));
    ok('diffLines with only one run says so', diffLines(null, runs[1])[0].includes('only one run'));
  } finally {
    process.chdir(cwd);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// END-TO-END: run-author-check.mjs against a real fixture scene, in a scratch cwd so the log lands
// under a temp out/, not the repo's own. Asserts one line lands with real gate names as `checks[].name`,
// recovered from the findings author-check's own gates already write, per the file header comment in
// harness/lib/run-author-check.mjs.
{
  const { readRuns } = await import('../../harness/lib/runlog.mjs');
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'runlog-e2e-'));
  const fixture = path.join(tmpDir, '_runlog-e2e-fixture.json');
  fs.copyFileSync(path.join(repoRoot, 'tests/fixtures/films/sample.json'), fixture);
  const r = spawnSync('node', [path.join(repoRoot, 'harness/lib/run-author-check.mjs'), fixture], {
    cwd: tmpDir, encoding: 'utf8', env: { ...process.env, RUNLOG_CMD: 'test', MODE: 'iterate' },
  });
  const cwd = process.cwd();
  process.chdir(tmpDir);
  let runs = [];
  try { runs = readRuns(fixture); } finally { process.chdir(cwd); }
  ok('run-author-check.mjs left one run-log line', runs.length === 1);
  ok('run-author-check.mjs named the RUNLOG_CMD it was given', runs[0] && runs[0].cmd === 'test');
  ok('run-author-check.mjs recorded real gate names, not only unrouted codes', runs[0] && runs[0].checks.length > 0
    && runs[0].checks.some((c) => c.name && c.name !== 'unrouted'));
  ok('run-author-check.mjs named the preflight gate, which sample.json always fires', runs[0]
    && runs[0].checks.some((c) => c.name === 'preflight' && c.codes.includes('no-preflight')));
  // FIX 1: `blocked` must come from author-check's own verdict (tier + TASTE + HARD_CODES), not from
  // finding severity alone. no-preflight is a REPORT-tier code (preflight's own tier is 'reports') that
  // HARD_CODES escalates to blocking regardless of TASTE, so the true answer is blocked:true.
  ok('run-author-check.mjs: a HARD_CODES-escalated report-tier code logs blocked:true', runs[0]
    && runs[0].checks.some((c) => c.name === 'preflight' && c.blocked === true));
  // direction-floor's no-transition finding is severity WARN (F.warn, not F.fail) but is ALSO a
  // HARD_CODES code, so it blocks too. This is the shape the old `severity === 'error'` rule missed
  // entirely (a warn-severity finding could never be marked blocked), which is exactly the real defect
  // being fixed: a run log that said "reported" for a code that was actually stopping the ship.
  ok('run-author-check.mjs: a HARD_CODES-escalated WARN-severity code also logs blocked:true', runs[0]
    && runs[0].checks.some((c) => c.name === 'direction-floor' && c.codes.includes('no-transition') && c.blocked === true));
  // TIMING: the whole ladder's wall time lands at the top level, and at least one gate that actually
  // ran (preflight always fires on sample.json) carries its own wallMs, read off the `.wallms` sidecar
  // spawnGate drops in quality/gates/author-check.mjs.
  ok('run-author-check.mjs logs a top-level wallMs for the whole ladder', runs[0] && Number.isFinite(runs[0].wallMs) && runs[0].wallMs >= 0);
  ok('run-author-check.mjs logs a per-gate wallMs for a gate that ran', runs[0]
    && runs[0].checks.some((c) => c.name === 'preflight' && Number.isFinite(c.wallMs) && c.wallMs >= 0));
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

// UNIT: parseBlockedCodes reads author-check's two structural "this code blocks" prints. Isolated from
// any real gate so the assertion is exact and does not depend on which codes a fixture happens to fire.
{
  const { parseBlockedCodes } = await import('../../harness/lib/run-author-check.mjs');
  const stdout = [
    '  ✗ beats      BLOCKS (dead-air, empty-close)',
    '  ~ critique   reported, does not block (hollow-beat)',
    '      [no-transition] (step floor)',
    '          read: engine-doctrine/CRAFT/TRANSITIONS.md',
  ].join('\n');
  const blocked = parseBlockedCodes(stdout);
  ok('parseBlockedCodes reads codes off a BLOCKS(...) line', blocked.has('dead-air') && blocked.has('empty-close'));
  ok('parseBlockedCodes reads a HARD_CODES escalation [code] (step ...) line', blocked.has('no-transition'));
  // THE REAL DEFECT: a report-tier gate's error finding (hollow-beat, printed as "reported, does not
  // block") must NOT be in the blocked set. The old rule (severity === 'error' alone) could not tell
  // this apart from a genuine block and would have marked it blocked:true.
  ok('parseBlockedCodes never blocks a report-only code', !blocked.has('hollow-beat'));
}

// UNIT: record-render.mjs parses a fixture render log into wallMs (the real time the render took),
// kept separate from `ms` (the rendered VIDEO's length, from the Go line's own "(<n>s, ...)").
{
  const { appendRun, readRuns, runsPathFor } = await import('../../harness/lib/runlog.mjs');
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'record-render-test-'));
  const film = path.join(tmpDir, '_record-render-lib-test.json');
  const logfile = path.join(tmpDir, 'render.log');
  fs.writeFileSync(logfile, '▶ rendering …\n✓ done → out/x.mp4  (17.0s, 1022 frames)\n');
  const cwd = process.cwd();
  process.chdir(tmpDir);
  try {
    const r = spawnSync('node', [path.join(repoRoot, 'harness/lib/record-render.mjs'), 'dev', film, logfile, '4200'], {
      cwd: tmpDir, encoding: 'utf8',
    });
    ok('record-render.mjs exits 0', r.status === 0);
    const runs = readRuns(film);
    ok('record-render.mjs left one run-log line', runs.length === 1);
    ok('record-render.mjs keeps render.ms as the VIDEO length', runs[0].render.ms === 17000);
    ok('record-render.mjs records render.wallMs from its 4th argument, not the video length', runs[0].render.wallMs === 4200);
    ok('record-render.mjs also stamps the top-level wallMs for this step', runs[0].wallMs === 4200);

    // no wallMs argument given: both fields stay null rather than falling back to the video length.
    fs.rmSync(runsPathFor(film));
    const r2 = spawnSync('node', [path.join(repoRoot, 'harness/lib/record-render.mjs'), 'dev', film, logfile], {
      cwd: tmpDir, encoding: 'utf8',
    });
    ok('record-render.mjs without a wallMs argument still exits 0', r2.status === 0);
    const runs2 = readRuns(film);
    ok('record-render.mjs with no wallMs argument leaves render.wallMs null', runs2[0].render.wallMs === null);
  } finally {
    process.chdir(cwd);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// UNIT: harness/lib/timings.mjs formats a fixture run log into a wall-clock table, and computes the
// per-command median from a small set of synthetic runs (odd and even counts, both exercised).
{
  const { formatRows, medianByCmd } = await import('../../harness/lib/timings.mjs');
  const mkRun = (cmd, wallMs, renderWallMs, frames) => ({
    at: '2026-09-12T00:00:00.000Z', cmd, git: 'abc123', dirty: false,
    checks: [{ name: 'preflight', ran: true, fired: 0, blocked: false, codes: [], waived: [], wallMs: 120 }],
    render: renderWallMs === null ? null : { file: 'out/x.mp4', frames, fps: 60, ms: 17000, wallMs: renderWallMs },
    content: null, judge: null, wallMs,
  });
  const runs = [mkRun('ship', 5000, 4200, 1022), mkRun('ship', 9000, 8000, 1022), mkRun('dev', 3000, null, null)];
  const rows = formatRows(runs);
  ok('timings formatRows returns one line per run', rows.length === 3);
  ok('timings formatRows shows the gate wallMs, not just render', rows[0].includes('gate:120ms'));
  ok('timings formatRows shows render wallMs and a wall fps derived from it', rows[0].includes('render:4200ms') && rows[0].includes('wallfps:'));
  ok('timings formatRows shows the total wallMs for the step', rows[0].includes('total:5000ms'));
  ok('timings formatRows tolerates a run with no render (dev with NOCHECK-shaped data)', rows[2].includes('render:-'));

  const medians = medianByCmd(runs);
  ok('medianByCmd takes the median of an even count for one cmd', medians.ship === 7000);
  ok('medianByCmd handles a single-run cmd', medians.dev === 3000);
}

// FIX 2: stage.mjs lookBlock names the pre-render page audit alongside the frame commands, so a
// design/direct-stage author sees it at the same moment, not after paying for a render. sample.json +
// sample.storyboard.md are committed fixtures (unlike a working film's scene JSON, which is gitignored)
// so this stays true on a fresh clone.
{
  const { lookBlock } = await import('../../quality/gates/stage.mjs');
  // lookBlock resolves a bare name through VAWE_FILMS_DIR, pointed here at tests/fixtures/films/
  // (never films/scene/, which is real film content this suite must not depend on).
  const prevFilmsDir = process.env.VAWE_FILMS_DIR;
  process.env.VAWE_FILMS_DIR = 'tests/fixtures/films';
  try {
    const look = lookBlock('sample');
    ok('lookBlock names the pre-render page audit for a film with a scene', look
      && typeof look.audit === 'string' && look.audit.includes('quality/audit.mjs') && look.audit.includes('sample.json'));
    // THE REAL DEFECT: before this field existed, a design/direct worklist had no audit command at all,
    // so it was reachable only through `make ship`, a POST-render step. A storyboard with no scene JSON
    // yet (still at the design stage, nothing for the audit to load) must not claim one it cannot run.
    const noSceneStoryboard = 'tests/fixtures/films/_zz-lookblock-noscene.storyboard.md';
    fs.copyFileSync('tests/fixtures/films/sample.storyboard.md', noSceneStoryboard);
    try {
      const noScene = lookBlock('_zz-lookblock-noscene');
      ok('lookBlock names no audit command when there is no scene JSON yet', noScene && noScene.audit === null);
    } finally { fs.rmSync(noSceneStoryboard, { force: true }); }
  } finally {
    if (prevFilmsDir === undefined) delete process.env.VAWE_FILMS_DIR; else process.env.VAWE_FILMS_DIR = prevFilmsDir;
  }
}


// ---- quality/gates/motion-floor.mjs classifyRegions: one known-answer fixture per KIND ------------
// GW/GH match motion-floor's own grid (96x54); fixtures reuse the exact same shapes its own
// --self-test asserts against, so the two never drift into disagreeing about what a "clean camera
// pan" looks like.
{
  const GW = 96, GH = 54;
  const kindOf = (a, b) => classifyRegions(a, b).sort((x, y) => y.amount - x.amount)[0]?.kind;

  const block = (shiftX) => {
    const f = new Uint8Array(GW * GH).fill(80);
    for (let y = 1; y < GH - 1; y++) for (let x = 1 + shiftX; x < GW - 1 + shiftX; x++) if (x >= 0 && x < GW) f[y * GW + x] = 200;
    return f;
  };
  ok('classifyRegions: a whole-frame rigid pan reads as camera', kindOf(block(0), block(3)) === 'camera');

  const card = (shiftX) => {
    const f = new Uint8Array(GW * GH).fill(240);
    for (let y = 18; y < 36; y++) for (let x = 30 + shiftX; x < 58 + shiftX; x++) if (x >= 0 && x < GW) f[y * GW + x] = 40;
    return f;
  };
  ok('classifyRegions: a box translating reads as move', kindOf(card(0), card(3)) === 'move');

  const square = (half) => {
    const f = new Uint8Array(GW * GH).fill(240);
    for (let y = 27 - half; y < 27 + half; y++) for (let x = 48 - half; x < 48 + half; x++) f[y * GW + x] = 40;
    return f;
  };
  ok('classifyRegions: a box growing about its own centre reads as scale', kindOf(square(6), square(10)) === 'scale');

  const flat = new Uint8Array(GW * GH).fill(120);
  const reveal = Uint8Array.from(flat); for (let i = 0; i < 90; i++) reveal[i] = 250;
  ok('classifyRegions: a small region appearing reads as reveal', kindOf(flat, reveal) === 'reveal');

  const drift = Uint8Array.from(flat, (v) => v + 3);
  ok('classifyRegions: a whole-frame low-amplitude drift reads as ambient', kindOf(flat, drift) === 'ambient');
}


// ---- quality/gates/scene-timing.mjs choreography: lives, beat motion, handoffs ---------------------
// Known-answer SCENES, one per claim `make check GATE=choreo` makes. Minimal on purpose: each fixture isolates
// the one condition its name tests, so a failure here points at the one rule that broke rather than
// requiring a real film to be re-read to find it.
{
  // a layer that enters and never exits: no `out`, no cut (`cuts` is empty so no unit wrapper), it
  // ends well before the film's own end, and nothing names it as becoming something else.
  const noExit = sceneTiming({ module: 'scene', duration: 6, layers: [
    { type: 'rect', id: 'gone', x: 0, y: 0, w: 100, h: 100, start: 0, duration: 2 },
  ] });
  const goneLife = noExit.lives.find((L) => L.id === 'gone');
  ok('sceneTiming lives: a layer with no out, no cut and no becomes, ending before the film, is unplanned', goneLife && goneLife.planned === false);

  // the same layer, held to the film's own end, is a planned life even with no `out`: it does not
  // need to leave anywhere, the film simply stops.
  const heldToEnd = sceneTiming({ module: 'scene', duration: 2, layers: [
    { type: 'rect', id: 'held', x: 0, y: 0, w: 100, h: 100, start: 0, duration: 2 },
  ] });
  ok('sceneTiming lives: a layer that holds to the film\'s own end is planned', heldToEnd.lives.find((L) => L.id === 'held').planned === true);

  // an exit that hands to an entrance in the same screen region, close in time: a handoff, found even
  // with no `flow-seam` recipe declaring it, because the two boxes overlap and the gap is small.
  const handoff = sceneTiming({ module: 'scene', duration: 4, layers: [
    { type: 'rect', id: 'out1', x: 100, y: 100, w: 200, h: 200, start: 0, duration: 2, out: 'fade', exitDur: 0.2 },
    { type: 'rect', id: 'in1', x: 100, y: 100, w: 200, h: 200, start: 2, duration: 2 },
  ] });
  ok('sceneTiming handoffs: an exit and a same-region entrance close in time is found', handoff.handoffs.some((h) => h.from === 'out1' && h.to === 'in1'));

  // the same shapes, far apart on screen: no overlap, so no handoff is invented from timing alone.
  const noHandoff = sceneTiming({ module: 'scene', duration: 4, layers: [
    { type: 'rect', id: 'out2', x: 0, y: 0, w: 100, h: 100, start: 0, duration: 2, out: 'fade', exitDur: 0.2 },
    { type: 'rect', id: 'in2', x: 1500, y: 900, w: 100, h: 100, start: 2, duration: 2 },
  ] });
  ok('sceneTiming handoffs: an exit and a FAR entrance is not a handoff', !noHandoff.handoffs.some((h) => h.from === 'out2'));

  // a `flow-seam` recipe names the handoff directly (out/in): declared, and reported as such even
  // when the two boxes do not overlap (the recipe already owns the ground crossfade between them).
  const declared = sceneTiming({ module: 'scene', duration: 4, recipes: [
    { recipe: 'flow-seam', at: 2, out: 'a3', in: 'b3' },
  ], layers: [
    { type: 'rect', id: 'a3', x: 0, y: 0, w: 100, h: 100, start: 0, duration: 2, out: 'fade' },
    { type: 'rect', id: 'b3', x: 1500, y: 900, w: 100, h: 100, start: 2, duration: 2 },
  ] });
  const dh = declared.handoffs.find((h) => h.from === 'a3' && h.to === 'b3');
  ok('sceneTiming handoffs: a flow-seam recipe is a DECLARED handoff', dh && dh.declared === true);

  // two motions starting on the same frame: a beat with a zero offset between concurrent motions.
  // boxes are 300x300: motion-floor's SPECK threshold (8% of the canvas axis) would otherwise drop a
  // small rect as a garnish (a dot, an icon) rather than counting it as content with a life of its own.
  const zeroOffset = sceneTiming({ module: 'scene', duration: 2, layers: [
    { type: 'rect', id: 'm1', x: 0, y: 0, w: 300, h: 300, start: 0, duration: 2, motion: [{ t: 0, x: 0 }, { t: 1, x: 100 }] },
    { type: 'rect', id: 'm2', x: 500, y: 500, w: 300, h: 300, start: 0, duration: 2, motion: [{ t: 0, y: 0 }, { t: 1, y: 100 }] },
  ] });
  ok('sceneTiming beatMotion: two motions starting together report a zero offset', zeroOffset.beatMotion[0].offsets.includes(0));

  // staggered starts report a NON-zero offset, and both channels are named.
  const staggered = sceneTiming({ module: 'scene', duration: 3, layers: [
    { type: 'rect', id: 's1', x: 0, y: 0, w: 300, h: 300, start: 0, duration: 3, motion: [{ t: 0, x: 0 }, { t: 1, x: 100 }] },
    { type: 'rect', id: 's2', x: 500, y: 500, w: 300, h: 300, start: 1, duration: 2, motion: [{ t: 0, scale: 1 }, { t: 1, scale: 2 }] },
  ] });
  const off = staggered.beatMotion[0].offsets;
  ok('sceneTiming beatMotion: staggered starts report a non-zero offset', off.length > 0 && off.every((o) => o > 0));
  ok('sceneTiming beatMotion: staggered starts name both channels', staggered.beatMotion[0].kinds.includes('position') && staggered.beatMotion[0].kinds.includes('scale'));
}


// ---- quality/gates/scene-timing.mjs cameraStillHeldAt: the camera holds its end pose (owner's
// decision, engine-doctrine/MOTION-CRAFT.md) and this is the scene-side warning that names a later beat's
// full-frame content sitting under a hold nothing has returned. ------------------------------------
{
  // a diveIn-shaped leg (baked `camera[]`, as bakeCameraMove would produce) ending at 1.5s pushed to
  // s:1.6, then a full-frame layer's beat starting at 2s: the leg has already ended (not a live move
  // across the beat start) and the layer covers ~97% of the canvas, so this is exactly the defect.
  const held = sceneTiming({
    module: 'scene', duration: 6, aspect: '16:9',
    camera: [{ t: 0, s: 1, x: 0, y: 0 }, { t: 1.5, s: 1.6, x: -200, y: -100 }],
    layers: [{ type: 'rect', id: 'full', w: 1900, h: 1060, start: 2, duration: 4, bg: '#111' }],
  });
  const flagged = held.cameraStillHeldAt(2, 6);
  ok('cameraStillHeldAt: a full-frame beat after an unreturned push is flagged', flagged && flagged.layer === 'full');
  ok('cameraStillHeldAt: names the pose it is still held at', flagged && approx(flagged.pose.s, 1.6));
  ok('cameraStillHeldAt: names the leg that left it there', flagged && approx(flagged.legEndT, 1.5));

  // the same push, queried WHILE it is still live (before the leg's own end): not a hold yet, it is
  // just the move itself running, so this must not fire mid-move.
  ok('cameraStillHeldAt: a beat inside the still-live leg is not a hold', held.cameraStillHeldAt(0, 1.5) === null);

  // the same held pose, but this beat's own content is a small corner element, not a full-frame
  // composition: the hold is real but nothing here reads as "the plan expected the normal frame".
  const heldSmall = sceneTiming({
    module: 'scene', duration: 6, aspect: '16:9',
    camera: [{ t: 0, s: 1, x: 0, y: 0 }, { t: 1.5, s: 1.6, x: -200, y: -100 }],
    layers: [{ type: 'rect', id: 'chip', x: 40, y: 40, w: 120, h: 40, start: 2, duration: 4, bg: '#111' }],
  });
  ok('cameraStillHeldAt: a small, non-full-frame beat is not flagged', heldSmall.cameraStillHeldAt(2, 6) === null);

  // a camera that already sits at rest by this beat: no finding, nothing to return from.
  const atRest = sceneTiming({
    module: 'scene', duration: 6, aspect: '16:9',
    camera: [{ t: 0, s: 1, x: 0, y: 0 }, { t: 1.5, s: 1, x: 0, y: 0 }],
    layers: [{ type: 'rect', id: 'full2', w: 1900, h: 1060, start: 2, duration: 4, bg: '#111' }],
  });
  ok('cameraStillHeldAt: a camera already at rest is not flagged', atRest.cameraStillHeldAt(2, 6) === null);
}


// ---- quality/gates/choreo.mjs exitEmphasis: owner rule, "exits read faster than entrances" --------
{
  // symmetric: the exit takes exactly as long as the entrance, and eases with no accelerating curve.
  // Flagged: neither half of the rule (shorter, or an accelerating ease) is true.
  const slowSymmetric = sceneTiming({ module: 'scene', duration: 6, layers: [
    { type: 'rect', id: 'slow', x: 0, y: 0, w: 300, h: 300, start: 0, duration: 4, anim: 'fade', enterDur: 1,
      out: 'fade', exitDur: 1, motion: [{ t: 0, opacity: 1 }, { t: 1, opacity: 0 }] },
  ] });
  const slowLife = slowSymmetric.lives.find((L) => L.id === 'slow');
  const slowCheck = exitEmphasis(slowLife);
  ok('exitEmphasis: a slow symmetric exit (no accel ease) is flagged', slowCheck && slowCheck.ok === false);

  // a short exit, eased in: both halves of the rule hold (it is also clearly shorter than its entry).
  const shortEaseIn = sceneTiming({ module: 'scene', duration: 6, layers: [
    { type: 'rect', id: 'quick', x: 0, y: 0, w: 300, h: 300, start: 0, duration: 4, anim: 'fade', enterDur: 1,
      out: 'fade', exitDur: 0.2, motion: [{ t: 0, opacity: 1 }, { t: 1, opacity: 0, ease: 'easeInCubic' }] },
  ] });
  const quickLife = shortEaseIn.lives.find((L) => L.id === 'quick');
  const quickCheck = exitEmphasis(quickLife);
  ok('exitEmphasis: a short, ease-in exit passes', quickCheck && quickCheck.ok === true && quickCheck.ease === 'easeInCubic');

  // a long exit that nonetheless EASES with an accelerating curve still passes: duration is not the
  // only door, an accelerating ease earns it on its own (this is the case the "rush" alias exists for).
  const longButAccel = sceneTiming({ module: 'scene', duration: 6, layers: [
    { type: 'rect', id: 'rushed', x: 0, y: 0, w: 300, h: 300, start: 0, duration: 4, anim: 'fade', enterDur: 1,
      out: 'rush', exitDur: 1 },
  ] });
  const rushedCheck = exitEmphasis(longButAccel.lives.find((L) => L.id === 'rushed'));
  ok('exitEmphasis: an equal-length exit with an accelerating ease (out:"rush") passes', rushedCheck && rushedCheck.ok === true);

  // no exit declared at all: nothing to grade, exitEmphasis says so rather than inventing a verdict.
  const noExitLife = sceneTiming({ module: 'scene', duration: 2, layers: [
    { type: 'rect', id: 'bare', x: 0, y: 0, w: 300, h: 300, start: 0, duration: 2 },
  ] }).lives.find((L) => L.id === 'bare');
  ok('exitEmphasis: a layer with no declared exit is not graded', exitEmphasis(noExitLife) === null);

  // MEASURED SPEED: a symmetric duration, a non-accelerating ease, but the layer's own x track
  // measurably speeds up toward the exit -> passes on the measured number alone.
  const measuredFast = sceneTiming({ module: 'scene', duration: 6, layers: [
    { type: 'rect', id: 'zoomOut', x: 0, y: 0, w: 300, h: 300, start: 0, duration: 4, enterDur: 1, out: 'fade', exitDur: 1,
      motion: [{ t: 0, x: 0 }, { t: 3, x: 10 }, { t: 3.5, x: 60 }, { t: 4, x: 900 }] },
  ] });
  const zoomOutCheck = exitEmphasis(measuredFast.lives.find((L) => L.id === 'zoomOut'));
  ok('exitEmphasis: a symmetric duration with no accelerating ease still passes on measured speed alone',
    zoomOutCheck && zoomOutCheck.ok === true && zoomOutCheck.endSpeed > zoomOutCheck.startSpeed);

  // an exit that never moves position (fade-only) has nothing to measure: the speed fields stay null
  // and the verdict rests on duration/ease exactly as before (unchanged behaviour, #arrival note above).
  ok('exitEmphasis: an opacity-only exit reports no measured speed', quickCheck.startSpeed === null && quickCheck.endSpeed === null);
}


// ---- quality/gates/choreo.mjs entranceEmphasis: an entrance should DECELERATE into place ----------
{
  const settling = sceneTiming({ module: 'scene', duration: 6, layers: [
    { type: 'rect', id: 'lands', x: 0, y: 0, w: 300, h: 300, start: 0, duration: 4, enterDur: 1,
      motion: [{ t: 0, x: 900 }, { t: 1, x: 0, ease: 'easeOutCubic' }] },
  ] });
  const landsCheck = entranceEmphasis(settling.lives.find((L) => L.id === 'lands'));
  ok('entranceEmphasis: an entrance that slows into place passes', landsCheck && landsCheck.ok === true
    && landsCheck.endSpeed < landsCheck.startSpeed);

  const notSettling = sceneTiming({ module: 'scene', duration: 6, layers: [
    { type: 'rect', id: 'overshoots', x: 0, y: 0, w: 300, h: 300, start: 0, duration: 4, enterDur: 1,
      motion: [{ t: 0, x: 900 }, { t: 1, x: 0, ease: 'easeInCubic' }] },
  ] });
  const overshootsCheck = entranceEmphasis(notSettling.lives.find((L) => L.id === 'overshoots'));
  ok('entranceEmphasis: an entrance that never decelerates is flagged', overshootsCheck && overshootsCheck.ok === false);

  const noMotion = sceneTiming({ module: 'scene', duration: 2, layers: [
    { type: 'rect', id: 'bare2', x: 0, y: 0, w: 300, h: 300, start: 0, duration: 2 },
  ] }).lives.find((L) => L.id === 'bare2');
  ok('entranceEmphasis: nothing measured (no `anim`, no motion) gives no verdict', entranceEmphasis(noMotion) === null);
}


  assert.equal(fail, 0, `${fail} of ${pass + fail} assertion(s) failed`);
  assert.ok(pass >= 157, `expected at least 157 assertions (the count this file was split with) to have run, saw ${pass}`);
});
