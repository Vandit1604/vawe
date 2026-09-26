import test from 'node:test';
import assert from 'node:assert/strict';
// tests/authoring/lib-test.authoring.test.mjs: fast pure-JS asserts, split by domain out of the old quality/gates/lib-test.mjs.
// No browser needed (the primitives are pure). Run: node tests/authoring/lib-test.authoring.test.mjs  (make test)
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

test('lib-test: authoring', async () => {
// ---- reference profiles (harness/author/profiles.mjs) --------------------------------------------
// Every name a profile BANS or PREFERS has to exist in the registry it comes from, or the rule is
// decoration. Two did not: a24 banned `pop` and vercel banned `bounce`, both sitting in `banCuts` and
// both compared only against cut styles, so neither ever fired. Split into banCuts (cut styles) and
// banMotion (an anim or a kinetic preset), and asserted here so the next one cannot go quiet.
{
  const CUTS = new Set(Object.keys(PRESENTATIONS));
  const MOTION = new Set([...ANIM_NAMES, ...Object.keys(PRESETS)]);
  const bad = [];
  for (const [name, P] of Object.entries(PROFILES)) {
    for (const k of ['cuts', 'banCuts']) for (const v of P[k] || []) if (!CUTS.has(v)) bad.push(`${name}.${k}: ${v}`);
    for (const v of P.banMotion || []) if (!MOTION.has(v)) bad.push(`${name}.banMotion: ${v}`);
    for (const v of P.stings || []) if (!SHADER_FX.includes(v)) bad.push(`${name}.stings: ${v}`);
  }
  ok('every profile names only real cuts / stings / entrances' + (bad.length ? `, ${bad.join(' · ')}` : ''), bad.length === 0);
  ok('every profile carries the 7 fields SELECTION.md declares',
    Object.values(PROFILES).every((P) => ['face', 'pace', 'easing', 'accent', 'look', 'blurb', 'antiBlurb'].every((k) => typeof P[k] === 'string' && P[k].length)));
}


// ---- patch-motion: the editor writes back into HAND-FORMATTED files -------------------------------
// The invariant that makes an editor safe to point at a tracked repo: saving without changing anything
// must be a zero-byte diff, in every formatting style the library actually uses. Everything else about
// the editor can be redone; silently reformatting 104 scenes cannot be undone from a diff.
{
  for (const name of ['higgsfield-recreation', 'showcase', 'ledgerline-neon', 'demo-interactions']) {
    const f = path.join(repoRoot, 'tests/fixtures/films', `${name}.json`);
    if (!fs.existsSync(f)) continue;
    const src = fs.readFileSync(f, 'utf8');
    const d = JSON.parse(src);
    const withTrack = d.layers.map((l, i) => [l, i]).filter(([l]) => Array.isArray(l.motion) && l.motion.length);
    ok(`patch-motion no-op is byte-identical (${name})`,
      withTrack.every(([l, i]) => patchMotion(src, i, l.motion) === src));
    if (withTrack.length) {
      const [layer, idx] = withTrack.find(([l]) => l.motion.length > 2) || withTrack[0];
      const keys = JSON.parse(JSON.stringify(layer.motion));
      keys[1].x = (keys[1].x ?? 0) + 7;
      const out = patchMotion(src, idx, keys);
      ok(`patch-motion edit still parses (${name})`, JSON.parse(out).layers[idx].motion[1].x === keys[1].x);
      // Measured as a MULTISET difference, not by line index. Comparing index-by-index counts every
      // line that merely SHIFTED, and adding one property to a key legitimately adds a line, so an
      // otherwise perfect patch scored 431. What matters is how many lines are genuinely new or gone.
      const bag = (t) => t.split('\n').reduce((mm, l) => mm.set(l, (mm.get(l) || 0) + 1), new Map());
      const A = bag(src), B = bag(out);
      let churn = 0;
      for (const [l, n] of B) churn += Math.max(0, n - (A.get(l) || 0));
      for (const [l, n] of A) churn += Math.max(0, n - (B.get(l) || 0));
      // one moved keyframe must not rewrite the file: collapsing a property-per-line key onto one line
      // churned hundreds of lines before the key layout was preserved
      ok(`patch-motion one key = a small diff (${name}, ${churn} lines)`, churn <= 8);
    }
  }
  const hf = path.join(repoRoot, 'tests/fixtures/films/higgsfield-recreation.json');
  if (fs.existsSync(hf)) {
    const src = fs.readFileSync(hf, 'utf8'), d = JSON.parse(src);
    const btn = d.layers.findIndex((l) => l.id === 'btn');
    const sp = layerSpan(src, btn);
    ok('patch-motion scanner survives CSS braces in a string', JSON.parse(src.slice(sp.start, sp.end)).id === 'btn');
    const hook = d.layers.findIndex((l) => l.id === 'hook');
    const ins = JSON.parse(patchMotion(src, hook, [{ t: 0, x: 0 }, { t: 0.5, x: 40 }]));
    ok('patch-motion inserts into a layer with no track', ins.layers[hook].motion.length === 2);
    ok('patch-motion insert leaves every other layer identical',
      JSON.stringify(ins.layers.filter((_, i) => i !== hook)) === JSON.stringify(d.layers.filter((_, i) => i !== hook)));
    ok('patch-motion removes a track', JSON.parse(patchMotion(src, btn, [])).layers[btn].motion === undefined);
  }
  ok('matchBracket ignores brackets inside strings', matchBracket('{"a":"}]"}', 0) === 9);
  const up = upsertKey([{ t: 0, x: 0 }, { t: 1, x: 10 }], { t: 0.5, x: 5 });
  ok('upsertKey inserts sorted', up.length === 3 && up[1].t === 0.5);
  const re = upsertKey(up, { t: 0.5, x: 99 });
  ok('upsertKey updates rather than stacking', re.length === 3 && re[1].x === 99);
  ok('upsertKey merges onto the existing key', upsertKey([{ t: 0, x: 1, ease: 'linear' }], { t: 0, x: 2 })[0].ease === 'linear');

  // applyOps: the same no-reformatting promise, for the chooser's RFC 6902 patches. Accepting a
  // candidate in studio must move ONE preset name, so what is asserted is the size of the diff as much
  // as the result: a parse/stringify round trip would give the right JSON and the wrong file.
  {
    const src = '{\n "bg": [\n  { "preset": "paper", "opts": { "scale": 2 } },\n  { "preset": "dark" }\n ]\n}';
    const swapped = applyOps(src, [{ op: 'replace', path: '/bg/1/preset', value: 'liquid' }]);
    ok('applyOps replaces the preset of the window it names', JSON.parse(swapped).bg[1].preset === 'liquid');
    ok('applyOps touches one line and no other byte',
      swapped.split('\n').filter((l, i) => l !== src.split('\n')[i]).length === 1);
    const dropped = applyOps(src, [{ op: 'replace', path: '/bg/0/preset', value: 'paperDots' },
      { op: 'remove', path: '/bg/0/opts' }]);
    const d0 = JSON.parse(dropped).bg[0];
    ok('applyOps removes the `opts` the new preset has no knob for', d0.preset === 'paperDots' && d0.opts === undefined);
    ok('applyOps leaves the other window untouched', JSON.parse(dropped).bg[1].preset === 'dark');
    // the studio curves panel needs a NESTED path (a layer's motion key, a camera station), so the
    // shape widened from `/bg/<i>/<prop>` to any chain of array/index pairs ending in a property.
    ok('applyOps refuses a path with no property at the end',
      (() => { try { applyOps(src, [{ op: 'replace', path: '/bg', value: 'x' }]); return false; }
        catch (e) { return /<key>\/<i>/.test(e.message); } })());
    ok('applyOps refuses a scene with no such window',
      (() => { try { applyOps(src, [{ op: 'replace', path: '/bg/9/preset', value: 'x' }]); return false; }
        catch (e) { return /bg\[9\]/.test(e.message); } })());
    ok('applyOps writes a nested path (a layer array two levels deep)',
      (() => { const nested = '{\n "layers": [\n  { "motion": [ { "t": 0 }, { "t": 1, "ease": "linear" } ] }\n ]\n}';
        const out = applyOps(nested, [{ op: 'replace', path: '/layers/0/motion/1/ease', value: 'easeOutCubic' }]);
        return JSON.parse(out).layers[0].motion[1].ease === 'easeOutCubic'; })());
    // WALKPATH MUST MATCH THE ARRAY AT THIS OBJECT'S OWN TOP LEVEL, not the first `"motion":[` a bare
    // scan finds anywhere in the region. A `fx` sub-object naming its own `motion` array earlier in the
    // byte stream than the layer's real `motion` used to win, silently patching the wrong track.
    ok('applyOps: a nested same-name array does not shadow the layer\'s own array',
      (() => {
        const shadowed = '{\n "layers": [\n  { "fx": { "motion": [ { "junk": 1 } ] }, '
          + '"motion": [ { "t": 0 }, { "t": 1, "ease": "linear" } ] }\n ]\n}';
        const out = applyOps(shadowed, [{ op: 'replace', path: '/layers/0/motion/1/ease', value: 'easeOutCubic' }]);
        const d = JSON.parse(out);
        return d.layers[0].motion[1].ease === 'easeOutCubic'          // the REAL track was patched
          && JSON.stringify(d.layers[0].fx) === '{"motion":[{"junk":1}]}';  // the nested one is untouched
      })());
  }
}


// ---- becomes: the handover must be EXACT, or a match cut silently stops reading ---------------------
{
  const src = fs.readFileSync(path.join(repoRoot, 'films/scene/scene.js'), 'utf8');
  const body = src.slice(src.indexOf('function resolveBecomes'), src.indexOf('// resolveAnchors'));
  const num = (v, d2) => (typeof v === 'number' && Number.isFinite(v) ? v : d2);
  // eslint-disable-next-line no-new-func
  const resolveBecomes = new Function('num', `${body}; return resolveBecomes;`)(num);
  // The engine hands it the box measured at build. These layers state w/h, so nothing is measured.
  const unmeasured = () => null;
  const centre = (L, k) => [L.x + num(k.x, 0) + L.w / 2, L.y + num(k.y, 0) + L.h / 2];

  const A = { id: 'card', type: 'rect', x: 300, y: 200, w: 640, h: 380, start: 1, duration: 2, becomes: 'dot',
    motion: [{ t: 0 }, { t: 1.4, x: 120, y: -40, scale: 0.5, rot: 6 }] };
  const B = { id: 'dot', type: 'rect', x: 1500, y: 800, w: 80, h: 80, start: 3, duration: 2 };
  resolveBecomes({ layers: [A, B] }, unmeasured);
  const [acx, acy] = centre(A, A.motion[A.motion.length - 1]);
  const [bcx, bcy] = centre(B, B.motion[0]);
  // CSS scales about the element's own centre, so scaling must NOT move the centre. Using the scaled
  // half-width put this 160px out and it looked almost right, the worst kind of wrong for a match cut.
  ok('becomes hands over on the exact centre', acx === bcx && acy === bcy);
  ok('becomes covers the outgoing form', B.w * B.motion[0].scale >= A.w * 0.5);
  ok('becomes carries rotation and then releases it', B.motion[0].rot === 6 && B.motion[1].rot === 0);
  ok('becomes settles into the layer own pose', B.motion[1].x === 0 && B.motion[1].y === 0 && B.motion[1].scale === 1);

  // an incoming layer's own keys resume after the handover; keys inside it are dropped
  const C = { id: 'c', type: 'rect', x: 0, y: 0, w: 100, h: 100, start: 0, duration: 1, becomes: 'd' };
  const D = { id: 'd', type: 'rect', x: 500, y: 500, w: 100, h: 100, start: 1, duration: 2,
    motion: [{ t: 0.1, x: 999 }, { t: 1.2, x: 40 }] };
  resolveBecomes({ layers: [C, D] }, unmeasured);
  ok('becomes drops incoming keys inside the handover', !D.motion.some((k) => k.x === 999));
  ok('becomes keeps incoming keys after the handover', D.motion.some((k) => k.t === 1.2 && k.x === 40));

  let threw = '';
  try { resolveBecomes({ layers: [{ id: 'x', becomes: 'nope' }] }, unmeasured); } catch (e) { threw = e.message; }
  ok('becomes throws on a dangling reference', /no layer with id/.test(threw));
  threw = '';
  try { resolveBecomes({ layers: [{ id: 'x', becomes: 'x' }] }, unmeasured); } catch (e) { threw = e.message; }
  ok('becomes throws on a self reference', /becomes itself/.test(threw));

  // THE CASE THAT WAS SILENT. A text layer states no w/h, so the old pass scored it 0x0: the scale
  // collapsed to 1 and the centre landed on the layer's top-left corner. The film rendered, every gate
  // passed, and the handover was merely wrong. The box now comes from the build measurement.
  {
    const word = { id: 'word', type: 'text', text: 'LATENCY', x: 300, y: 420, start: 0, duration: 3, becomes: 'card' };
    const card = { id: 'card', type: 'rect', x: 660, y: 340, w: 600, h: 400, start: 3, duration: 3 };
    const glyphs = { w: 780, h: 187 };
    resolveBecomes({ layers: [word, card] }, (L) => (L === word ? glyphs : null));
    const k = card.motion[0];
    ok('becomes centres an unsized outgoing layer on its MEASURED box',
      k.x === +(300 + glyphs.w / 2 - (660 + 300)).toFixed(3) && k.y === +(420 + glyphs.h / 2 - (340 + 200)).toFixed(3));
    ok('becomes scales an unsized outgoing layer by its MEASURED box',
      k.scale === +Math.max(glyphs.w / 600, glyphs.h / 400).toFixed(3) && k.scale > 1);
  }

  // A declared w/h still wins over the measurement, exactly as resolveBoxes reads `L.w ?? base.w`.
  {
    const a = { id: 'a', type: 'rect', x: 0, y: 0, w: 400, h: 400, start: 0, duration: 1, becomes: 'b' };
    const b = { id: 'b', type: 'rect', x: 0, y: 0, w: 200, h: 200, start: 1, duration: 1 };
    resolveBecomes({ layers: [a, b] }, () => ({ w: 999, h: 999 }));
    ok('becomes prefers the declared box to the measured one', b.motion[0].scale === 2);
  }

  // Unknowable rather than merely undeclared: nothing measured either. Refuse, never substitute.
  threw = '';
  try {
    resolveBecomes({ layers: [
      { id: 'ghost', type: 'text', x: 0, y: 0, start: 0, duration: 1, becomes: 'box' },
      { id: 'box', type: 'rect', x: 0, y: 0, w: 100, h: 100, start: 1, duration: 1 },
    ] }, () => null);
  } catch (e) { threw = e.message; }
  ok('becomes refuses a form with no box rather than guessing one', /no box to match against/.test(threw) && /ghost/.test(threw));

  // A hand-authored `becomes` (the front door for a match cut, now that `matches` is gone) hands the
  // same geometry to resolveBecomes: it never touches w/h itself.
  {
    const from = { id: 'word', type: 'text', x: 300, y: 420, start: 0, duration: 3, becomes: 'card' };
    const to = { id: 'card', type: 'rect', x: 660, y: 340, w: 600, h: 400, start: 3, duration: 4 };
    const scene = { duration: 8, sceneUnits: false, cuts: [{ t: 3, style: 'none' }], layers: [from, to] };
    resolveBecomes(scene, (L) => (L === from ? { w: 780, h: 187 } : null));
    ok('a hand-authored becomes handover is measured too', to.motion[0].scale === +Math.max(780 / 600, 187 / 400).toFixed(3));
  }
}


// ---- harness/lib/census.mjs: ONE definition of "the library" ----
// waiver-drift printed 135 and audio-check printed 150 for the same thing, because each caller wrote
// its own rule. These four assertions are what stops the two from drifting apart again.
{
  const { LIBRARY, LIBRARY_WITH_DERIVATIVES, SCENE_DIR, ROOT } = await import('../../harness/lib/census.mjs');
  const abs = (f) => path.join(ROOT, SCENE_DIR, f);
  const names = fs.readdirSync(path.join(ROOT, SCENE_DIR)).filter((f) => f.endsWith('.json')).sort();
  const lib = names.filter((f) => LIBRARY(f, abs(f)));
  const wide = names.filter((f) => LIBRARY_WITH_DERIVATIVES(f, abs(f)));
  ok('census: the library excludes every generated sidecar',
    !lib.some((f) => /\.(animatic|intent|expanded|beatsync|captioned|directed)\./.test(f)));
  ok('census: the library excludes schema.json and templates',
    !lib.includes('schema.json') && !lib.some((f) => /\.template\.json$/.test(f)));
  ok('census: every member of the library declares module scene',
    lib.every((f) => { try { return JSON.parse(fs.readFileSync(abs(f), 'utf8')).module === 'scene'; } catch { return false; } }));
  // The opt-in is the same rule minus one clause, so it can only ever be a superset. A caller that
  // wanted derivatives and got fewer files would be the original bug pointing the other way.
  ok('census: the derivatives opt-in is a strict superset of the library',
    lib.every((f) => wide.includes(f)) && wide.length >= lib.length);
}


// ---- the render harness: the one path guard 22 scripts used to hand-roll ----
{
  const { insideRoot, MIME, REPO_ROOT } = await import('../../harness/lib/render-harness.mjs');
  const root = '/repo';
  ok('a file under the root is served', insideRoot(root, '/repo/core/engine/boot.js'));
  ok('the root itself is inside itself', insideRoot(root, '/repo'));
  ok('a parent is refused', insideRoot(root, '/etc/passwd') === false);
  ok('a climb out is refused', insideRoot(root, path.join(root, '../../quality/secrets')) === false);
  // The bug every hand-rolled `p.startsWith(root)` carried: a sibling whose name extends the root's.
  ok('a sibling with the root as a name prefix is refused', insideRoot(root, '/repo-evil/config') === false);
  ok('the mime table covers every type the copies served',
    ['.html', '.mjs', '.json', '.woff2', '.otf', '.mp4', '.webm', '.jpeg'].every((e) => MIME[e]));
  ok('the harness resolves the repo root', fs.existsSync(path.join(REPO_ROOT, 'core/motion/motion.js')));
}


// ---- a fragment's stylesheet stops at its own layer (engine-doctrine/MISTAKES.md #510) ----
{
  const { scopeStyles } = await import('../../core/type/sanitize-html.js');
  ok('markup with no stylesheet is handed back unchanged',
    scopeStyles('<div class="g">hi</div>') === '<div class="g">hi</div>');
  ok('a style block is wrapped in a bare @scope',
    scopeStyles('<style>.g{color:red}</style>') === '<style>@scope {.g{color:red}}</style>');
  // The hoist is the half that matters: left inside `<div class="g">`, the scoping root would be that
  // div, and Chrome does not match an ordinary selector against the root itself, so the fragment's own
  // `.g` rule would stop applying. Hoisted, the root is the caller's wrapper and `.g` is a descendant.
  ok('a nested style block is hoisted to the front of the fragment',
    scopeStyles('<div class="g"><style>.g{color:red}</style>x</div>')
      === '<style>@scope {.g{color:red}}</style><div class="g">x</div>');
  // site-counts-allow: "two blocks" here is two <style> elements, not the block library
  ok('two blocks keep their order, so a fragment that overrides itself still cascades',
    scopeStyles('<style>a{}</style><b><style>c{}</style></b>')
      === '<style>@scope {a{}}</style><style>@scope {c{}}</style><b></b>');
  ok('a style attribute is not a style block', scopeStyles('<i style="color:red"></i>') === '<i style="color:red"></i>');
  // A COMMENT IS PROSE, AND EVERY REGEX IN THAT FILE READ IT AS MARKUP (engine-doctrine/MISTAKES.md #548). The
  // word `<style>` in an author's note made STYLE_BLOCK span from the NOTE to the first real
  // `</style>`, so the fragment's whole stylesheet and the opening tag of its root element were
  // swallowed into one `@scope {…}` block. The panel rendered as unstyled text and nothing said a word.
  const { sanitizeHtml, timeCssUsed, stripComments } = await import('../../core/type/sanitize-html.js');
  const noted = '<!-- write a <style> block, never a transition: it renders as a dead still -->'
    + '<style>.g{color:red}</style><div class="g">x</div>';
  ok('a comment naming <style> does not swallow the real stylesheet',
    scopeStyles(sanitizeHtml(noted)) === '<style>@scope {.g{color:red}}</style><div class="g">x</div>');
  ok('a comment naming <script> does not swallow the markup after it',
    sanitizeHtml('<!-- no <script> here --><div>x</div>') === '<div>x</div>');
  ok('a comment explaining the transition ban is not a transition',
    timeCssUsed('<!-- never write transition: .3s --><div style="color:red"></div>') === null);
  ok('a real transition is still refused', timeCssUsed('<div style="transition:opacity .3s"></div>') === 'transition');
  ok('stripComments leaves markup carrying no comment alone', stripComments('<b>x</b>') === '<b>x</b>');
}


// ---- ARSENAL RECENCY (harness/author/recency.mjs) ------------------------------------------------
// The census cannot tell "undiscoverable" from "unwanted", and age is what tells them apart. These
// assert the two halves that can be wrong: the tree read, and the join onto the census.
{
  ok('presentIn finds a name in the tree text and does not invent one that is absent',
     (() => { const got = presentIn('const X = { wipe: 1 };', ['wipe', 'matchCut']);
              return got.has('wipe') && !got.has('matchCut') && got.size === 1; })());
  ok('a name in NO registry file is reported new, whatever the window',
     newSince(['zzNotARealArsenalEntry']).has('zzNotARealArsenalEntry'));
  // `wipe` is one of the oldest entries in core/cuts.js. If a fixed window ever calls it new, the
  // derivation is reading diffs, or reading nothing, and both report the whole arsenal as fresh.
  ok('an entry that predates the window is never reported new',
     !newSince(['wipe', 'fade']).has('wipe') && !newSince(['wipe', 'fade']).has('fade'));
  ok('git that cannot answer reports NOTHING new, rather than everything',
     existingAt('', ['wipe'], undefined).size === 0 && newSince([], {}).size === 0);
  ok('the window is a fixed number of days, so a quiet fortnight is allowed to be empty',
     Number.isInteger(WINDOW_DAYS) && WINDOW_DAYS > 0);
  // The join the preflight output rests on: new AND unused is the pair worth surfacing, and each half
  // is measured by a different owner (recency here, the census in harness/author/arsenal.mjs).
  ok('newness and usage are independent reads, so an old entry with users is neither',
     (() => { const fresh = newSince(['wipe', 'zzNotARealArsenalEntry']);
              return fresh.size === 1 && fresh.has('zzNotARealArsenalEntry'); })());
}


// ---- ARSENAL SWEEP: the two shapes the gate used to be blind to --------------------------------
//
// `quality/gates/arsenal-check.mjs` reports how many capabilities the engine exports, and that number
// was a FLOOR rather than a census, in two ways that a green tick hid. It has no importable surface
// (it runs and exits), so this drives its `--list` dump, which prints one `file::NAME` per export the
// sweep sees.
//
// ONE: a vocabulary keyed by digits was not a vocabulary. The shape test required every key to start
// with a letter, so `ASPECTS` (the five canvases, keyed `16:9`, `9:16`, ...) fell out, and the most
// author-facing table in the engine was one the arsenal gate could not check.
//
// TWO: two files may export the same word. `found` and `exported` were keyed by NAME with
// first-file-wins, so `core/type/type.js`'s kinetic `PRESETS` lost the key to `core/lightfield/presets.js`
// and did not exist as far as the gate was concerned. That is worse than a miscount: the same
// collision between a registry part and a bare vocabulary launders the bare one into the derived
// bucket and stops checking it, and which of the two vanishes is decided by directory order.
{
  const { execFileSync } = await import('node:child_process');
  let keys = [];
  try {
    keys = execFileSync('node', [path.join(repoRoot, 'quality/gates/arsenal-check.mjs'), '--list'],
      { encoding: 'utf8' }).split('\n').map((l) => l.replace(/^\w+\s+/, '').split('\t')[0]);
  } catch { /* asserted as empty below */ }
  ok('arsenal --list: the sweep dumps what it saw', keys.length > 100);
  ok('arsenal sees a digit-keyed vocabulary (ASPECTS: 16:9, 9:16, 1:1, ...)',
    keys.includes('core/layout/safe.js::ASPECTS'));
  ok('arsenal sees a vocabulary shaped as a table of records (RANSOM_FACES)',
    keys.includes('core/type/ransom.js::RANSOM_FACES'));
  ok('arsenal sees BOTH exports when two files share a name (PRESETS in lightfield and in kinetic)',
    keys.includes('core/lightfield/presets.js::PRESETS') && keys.includes('core/kinetic/presets.js::PRESETS'));
}


// ---- ARSENAL HONESTY (harness/author/arsenal.mjs) ------------------------------------------------
// The search an author is told to reach for before inventing anything returned its nearest match even
// when it had none, twice in one day (engine-doctrine/MISTAKES.md #551). Two things are asserted here and they are
// different failures: RECALL, that it holds what it holds, and CONFIDENCE, that it can say it does not
// know. Fixing only the second would leave it silently missing `beam`; fixing only the first would
// leave it confidently answering questions with no answer.
{
  const corpus = await arsenalCollect();
  const coverage = coverageIn(corpus);
  const best = (q) => {
    const qt = arsenalToks(q);
    return corpus.map((e) => ({ name: e.name, c: coverage(e, qt) })).sort((a, b) => b.c - a.c)[0];
  };
  // Two vocabularies may legitimately share a word (the `globe` LAYER TYPE and the `globe` three.js
  // scene), so this asks the best-covering entry of that name, never the first one collect() emitted.
  const covers = (q, name) => { const qt = arsenalToks(q);
    return Math.max(-1, ...corpus.filter((x) => x.name === name).map((x) => coverage(x, qt))); };

  // RECALL. Layer types are not a `*_REGISTRY`, so the whole family was outside the corpus, and `beam`
  // (blurb: "a light that travels the rounded-rect border") was unfindable by a query naming exactly
  // that. The search offered cardCascade, lightLeak and highlight instead.
  ok('the search holds the LAYER TYPES, the coarsest vocabulary in the engine',
     ['beam', 'component', 'globe', 'adjust'].every((n) => corpus.some((e) => e.name === n && e.kind === 'layer type')));
  ok('every layer type in the corpus carries its blurb, which is the only text a paraphrase can match',
     corpus.filter((e) => e.kind === 'layer type').every((e) => e.blurb.length > 20));
  // THE TOP ANSWER MOVED, AND THAT IS THE SEARCH GETTING BETTER, not a regression. This asserted that
  // `beam` came FIRST, which was right when beam was the only thing in the engine that did this. The
  // block library is in the corpus now, and `borderBeamCard` ("a glass card with a bright line of light
  // chasing around its border") answers the query's own words more exactly: the query says "of a card"
  // and beam is a bare layer type. So the assertion is what the original finding actually cared about,
  // which is RECALL: beam was returned by nothing at all, and the search offered cardCascade, lightLeak
  // and highlight in its place (engine-doctrine/MISTAKES.md #551). Being findable and confident is the property;
  // being first was a coincidence of a smaller library.
  ok('"a light that travels around the border of a card" FINDS beam, and confidently', (() => {
    const q = 'a light that travels around the border of a card';
    const qt = arsenalToks(q);
    const top3 = corpus.map((e) => ({ name: e.name, c: coverage(e, qt) }))
      .sort((a, b) => b.c - a.c).slice(0, 3).map((r) => r.name);
    return top3.includes('beam') && covers(q, 'beam') >= CONFIDENT; })());

  // CONFIDENCE. Two sets, and the threshold sits in the gap between them. Known-present queries must
  // keep answering; known-absent queries must produce nothing above the bar. Loosening the matcher until
  // the first set passes would break the second, which is the point of asserting both.
  const PRESENT = [
    ['a light that travels around the border of a card', 'beam'],
    ['count up to a big number', 'count'],
    ['a dotted planet with tapered route arcs', 'globe'],
    ['a fast radial flash of sparks', 'sparks'],
    ['grade everything beneath this layer', 'adjust'],
    ['thermal blur', 'thermalBlur'],
    ['a sheen that sweeps across the box', 'beam'],
    ['capture a real product surface', 'component'],
    ['a full-frame generative webgl field', 'shader'],
    ['a lit implicit surface from a distance field', 'raymarch'],
    ['a low sustained dramatic weight sound', 'braam'],
    // This was in the ABSENT set below, correctly, for about an hour. A sibling agent built `upright`
    // in parallel while this calibration was being written, so the honest answer to it changed under
    // the test. That is the set working: an absent query becomes a present one the day the capability
    // lands, and the assertion has to move with it rather than be relaxed.
    ['keep a carried layer upright while its parent rotates', 'upright'],
    // Six queries that all returned NOTHING HERE CLEARLY MATCHES for a capability the engine HAS. None
    // of them is fixable by rewriting prose: `handheld`, `kerning`, `strikethrough` and `chromatic
    // aberration` are the words a person types and not words those descriptions can honestly use. They
    // are carried by `aka` on the registry, which is searched and never printed.
    ['typewriter typing text one letter at a time', 'type'],
    ['play the layer backwards', 'rewind'],
    ['handheld camera feel', 'driftHold'],
    ['letters get squeezed together kerning', 'expandIn'],
    ['chromatic aberration colour fringing', 'chroma'],
    ['strikethrough a word', 'strike'],
    // The seventh, and the one with a measured cost. Counted over `films/scene/*.json`: 166 films,
    // 289 motion tracks, `ease: "through"` on ZERO of them and a bezier handle on 12. Asked in the words
    // of the DEFECT it removes, the search answered NOTHING HERE CLEARLY MATCHES and offered a camera
    // move, a flight path and a colour grade; asked in the engine's own words ("velocity through a
    // keyframe") it answered instantly. The mechanism was reachable only by somebody who already knew.
    ['the move stops dead in the middle of a travel', 'through'],
    // theme.look (W8): the bg presets a brand turns through are fixed once, in the theme.
    ['the backdrops a brand turns through, fixed once in its theme', 'backdrop'],
  ];
  for (const [q, want] of PRESENT) {
    ok(`arsenal answers "${q}" with ${want}`, covers(q, want) >= CONFIDENT);
  }

  // The engine has none of these. `dollyZoom` was the top hit for the first one, and for the
  // upright query now in PRESENT above, and an author nearly hand-rolled a conic gradient off the
  // back of the same kind of confident wrong answer.
  // PLAIN ENGLISH ABOUT BLOCKS, and this set exists because the other one flattered the search. Every
  // PRESENT query above is written in the engine's own vocabulary ("a lit implicit surface from a
  // distance field"), which is how a person who already knows the library asks. These are how someone
  // asks who does not. Measured before the block blurb pass: 10 of 18 had the right answer in the top
  // three and 8 were answered confidently, while blurbs like `terminal`'s "command prompt; command
  // types in, output answers after it" contained none of the words a person types. After: 17 and 14.
  //
  // Top THREE, not top one, on purpose. Several of these have honest siblings (`glassNotification` for
  // a toast, `usMapHex` for a US map) and demanding a single winner would be asserting a preference
  // rather than a capability.
  //
  // WIDENED FROM 14 FAMILIES TO 94 OF 100, because 14 was a sample and the other families were a
  // promise nobody was keeping: the blurb pass rewrote 95 of them and a later edit could have made any
  // of the untested ones unfindable again in silence.
  //
  // The last nine were investigated together and split three ways. THREE WERE BLURB BUGS, fixed in
  // blocks/catalog.mjs and asserted at the end of the set below:
  //   card        "elevated info card: title, description, tag pills, and a call-to-action link at the
  //               bottom" lost "a card with a heading, body text and a button at the bottom" to `doc`
  //               at 0.52. It says heading and body text now and wins that query at 0.81. It still
  //               says LINK, not button, because the footer is a word and an arrow under a hairline
  //               and calling it a button would be a blurb that reads well about the wrong thing.
  //   colorCycle  "one word that changes colour over and over, cycling through a fixed hue sequence"
  //               was every word of the question and still lost to `shader`, because every token in it
  //               is common across the corpus and idf gives a common word nothing. It carries
  //               `rainbow` now, held by two entries rather than a hundred, and wins at 1.00.
  //   morphText   "each word melts into the next" lost "one word melting into the next word" to
  //               `wordFlash` on melts/melting alone. Written as "melting" it wins at 1.00, but the
  //               BLURB IS NOT THE REAL FIX: the index does not stem, `cycles`/`cycling` and
  //               `changes`/`changing` collide the same way, and rewriting one blurb per collision
  //               pays for the same bug over and over. Stemming belongs in harness/author/arsenal.mjs.
  //
  // FIVE ARE IN NO SEARCH CORPUS AT ALL, and no blurb can reach them. `pricingCard`, `statCard`,
  // `profileCard`, `lowerThird` and `searchEngine` have only `family.variant` rows in the manifest,
  // and harness/author/arsenal.mjs indexes BARE rows only, deliberately (a variant and its family
  // split their shared words; the retrieval floor fell 97% → 95% the day all 185 rows went in). So
  // `make arsenal Q="a pricing plan card"` answers ABSENT about something the engine has, which is
  // the failure this whole corpus exists to end. Their blurbs were stubs too and are rewritten, but
  // that only fixes the catalog label and the engine-doctrine/BLOCKS.md line. THE ASSERTION ABOVE, "every block
  // FAMILY in the catalog is in the search corpus", reads the manifest's bare NAMES rather than its
  // `family` field, so it passed over all five in silence. Two ways to close it, and the second is
  // cheaper than it looks: index a family that has no bare row (arsenal.mjs), or give each a bare row
  // here, which also needs a poster, a scene, a frame rect, and the block count edited by hand in
  // site/app/arsenal/[name]/Stage.tsx and docs-site/content/docs/blocks.mdx.
  //
  //   terminalHtml is the one exclusion that is neither. It and `terminal` are twins by design and any
  //               honest question for one answers the other, so asking is asserting a preference. The
  //               same reason the top-three rule exists.
  const PLAIN = [
    ["make the reveal snappier", "faster"],
    ["a transition that shows time passing", "time"],
    ["should the film have sound", "sound.default-not-silence"],
    ["a terminal window", "terminal"],
    ["a fake browser window around a screenshot", "browserFrame"],
    ["a progress bar filling up", "loadingBar"],
    ["a phone shaped frame to put a screenshot in", "phoneFrame"],
    ["a toast notification popping up", "notification"],
    ["a kanban board with columns", "kanban"],
    ["a line graph over time", "lineChart"],
    ["a pie chart", "donutChart"],
    ["a table of rows and columns", "table"],
    ["a checklist with items ticking off", "checklist"],
    ["a map of the united states", "usMap"],
    ["a map of the world", "worldMap"],
    ["a timeline of events", "timeline"],
    ["a deploy running in a console with a spinner", "terminalPro"],
    ["a pipeline that builds and then says deployed", "deploySuccess"],
    ["some small rounded labels in a row", "pillRow"],
    ["letters flipping like an old airport board", "splitFlapBoard"],
    ["a bar chart comparing values", "barChart"],
    ["a few numbers side by side that count up", "kpiRow"],
    ["a coloured warning strip with one line of text", "callout"],
    ["us versus them in two columns", "comparison"],
    ["subtitles at the bottom of the screen", "captions"],
    // The SKILL family. A skill answers "what should I load before I start", which nothing ranked
    // until skills joined the corpus; it was findable only through AGENTS.md's hand-kept router table.
    ["matching a reference film's exact look", "vawe-type"],
    ["several series stacked in one bar", "stackedBar"],
    ["a folder and file sidebar like an editor", "fileTree"],
    ["a list of git commits with authors", "commitRow"],
    ["a chat conversation with messages left and right", "chatBubble"],
    ["a row of overlapping profile pictures", "avatarStack"],
    ["a little popup at the bottom saying something happened", "toast"],
    ["emoji reactions with counts under a message", "reactionBar"],
    ["a dial with a needle showing a value", "gauge"],
    ["a music player with album art and a scrubber", "nowPlaying"],
    ["a subscribe button with a follower count", "videoLowerThird"],
    ["a profile with a follow button", "followCard"],
    ["the top of a profile page with follower stats", "profileHeader"],
    ["a dashed box saying there is nothing here yet", "emptyState"],
    ["a mouse cursor moving over and clicking something", "pointer"],
    ["a finger tapping the screen on a phone", "tapRipple"],
    ["a phone keyboard sliding up from the bottom", "keyboard"],
    ["a button that presses down when you click it", "pressButton"],
    ["two things side by side on half the screen each", "splitScreen"],
    ["trusted by thousands of teams with faces", "socialProof"],
    ["an app store row with stars and an install button", "installCard"],
    ["a grid of boxes of different sizes, one big one", "bento"],
    ["a viewfinder overlay with a blinking rec dot", "camcorderHud"],
    ["brackets that lock onto the subject like a camera focusing", "scanGate"],
    ["boxes joined by arrows showing a process with yes and no", "flowchart"],
    ["ios style widgets floating together", "glassWidgets"],
    ["push notifications stacking on a lock screen", "glassNotification"],
    ["a right click menu with icons", "glassMenu"],
    ["a play bar with a scrubber and volume", "glassControls"],
    ["a phone home screen full of app icons", "glassHome"],
    ["a mac dock where icons grow as you hover", "glassDock"],
    ["code typing itself out one character at a time", "codeTyping"],
    ["scrolling down a file until it reaches the important line", "codeScroll"],
    ["an old line of code being replaced by a new one", "codeDiff"],
    ["a refactor where the words slide into new places", "codeMorph"],
    ["two bits of code flying in and joining together", "codeFlight"],
    ["every state as the same size hexagon", "usMapHex"],
    ["circles on a map sized by how big the number is", "usMapBubble"],
    ["arrows on a map going from one city to others", "usMapFlow"],
    ["a blinking cursor typing a word with a coloured fringe", "textCursor"],
    ["one card in a grid zooming out to fill the screen", "parallaxZoom"],
    ["a full screen shot shrinking back into a grid of cards", "parallaxUnzoom"],
    ["rows of interface standing up out of the floor in 3d", "uiReveal3d"],
    ["a snippet of code as a syntax coloured card", "codeBlock"],
    ["one huge number with a small label under it", "statBig"],
    ["lines of logs streaming past fast", "logLines"],
    ["a ring that fills up showing percent done", "progressRing"],
    ["a small loading spinner going round", "spinner"],
    ["the first run screens you swipe through when you open an app", "onboardCard"],
    ["swiping from one app screen to the next", "screenSwap"],
    ["a map of things connected to each other, not a tree", "nodeGraph"],
    ["dim the code around the one line that matters", "codeHighlight"],
    ["a row of tabs you can switch between", "tabBar"],
    ["numbered steps across the screen filling in as you go", "stepFlow"],
    ["a card with a light chasing around its edge", "borderBeamCard"],
    // Two of the nine a blurb could reach (the third, `card`'s own fixed blurb, went with the
    // block when it was cut). The other six are in the comment above.
    ["a word that changes colour again and again", "colorCycle"],
    ["one word melting into the next word", "morphText"],
    // MOVE SHAPES (core/motion/shapes.js). An author reaches these through `move: <shape>:<band>`,
    // so the plain question is about the FEELING of the travel, never the shape's name.
    ["a scroll that surges then gives up, the way a hand scrolls", "pan"], ["make a group of layers loop forever", "forever"],
  ];
  {
    const top3 = (q, want) => { const qt = arsenalToks(q);
      return corpus.map((e) => ({ n: e.name, c: coverage(e, qt) })).sort((a, b) => b.c - a.c)
        .slice(0, 3).some((r) => r.n === want); };
    const missed = PLAIN.filter(([q, w]) => !top3(q, w));
    if (missed.length) console.log(`    plain questions with no answer in the top 3: ${missed.map(([q]) => `"${q}"`).join(', ')}`);
    ok('plain English about blocks finds the block, in the top three', missed.length === 0);
    const unsure = PLAIN.filter(([q]) => best(q).c < CONFIDENT);
    if (unsure.length) console.log(`    plain questions answered but not confidently: ${unsure.map(([q]) => `"${q}"`).join(', ')}`);
    // A PROPORTION, NOT A FIXED TEN. The floor said "at least ten" when the set held fourteen, which
    // was two thirds of it. Widening the set to 91 and keeping the ten would have turned a real floor
    // into decoration overnight: 81 of them could go unfindable and the number would still read green.
    // Two thirds is what the set measures today at 70, so the bar keeps the meaning it had.
    const floor = Math.ceil(PLAIN.length * 2 / 3);
    ok(`and at least ${floor} of the ${PLAIN.length} are answered confidently rather than refused`,
      PLAIN.length - unsure.length >= floor);
  }

  // ---- FAMILY: one author-phrased query per SEARCHABLE family, the coverage guarantee -------------
  // PRESENT and PLAIN prove specific capabilities answer. They leave a silent gap: a whole FAMILY that
  // nobody ever queried, so "a drifting background" reaching an `aurora` was never checked. This holds
  // one plain-English query for every family an author DESCRIBES rather than names, and every one must
  // resolve to its family confidently and in the top three. quality/gates/discovery.mjs check 5 reads
  // these (through harness/dev/family-coverage.mjs) and FAILS when a searchable family has no query
  // here, so a new vocabulary cannot land findable only by someone who already knows its name. Families
  // reached by MECHANISM (an easing, a blend mode, a keyframe handle) are exempt and named in
  // family-coverage.mjs; they stay covered per-entry by blurb self-retrieval. A miss is fixed with `aka`
  // at the write site, never by bending the query toward the blurb's own words. The target of each is a
  // name UNIQUE to its family: `bloom` names four different things, so a query wanting it proves nothing
  // about which family answered.
  const FAMILY = [
    ['one scene leaves the frame and the next arrives from the same side, with no cut between them', 'flow-seam'], // recipe
    ['an i-beam text cursor over the text', 'ibeam'],                                                   // cursor style
    ['a bright white flash to hide a hard cut', 'flash'],                                                 // sting fx
    ['an old worn videotape with scanlines and grain', 'vhs'],                                            // look
    ['the product bursts forward past the camera as it leaves the frame', 'punch'],                       // cut
    ['soft moving gradient blobs drifting slowly behind everything', 'flow'],                             // ambient shader
    ['slow to fast then slow again speed ramp for a whip transition', 'ramp'],                            // cut timing
    ['make the whole film feel calm and unhurried', 'calm'],                                              // energy (film-wide speed curve)
    ['a held frame that stays subtly alive without actually moving anywhere, like breathing', 'breathe'], // idle
    ['an animated pipeline diagram where cards pop in and a token travels along the connectors', 'pipelineFlow'], // composition
    ['a light travels around the rounded rectangle border of a card', 'beam:border (border-beam)'],       // per-frame accent layer
    ['have the logo icon outline draw itself stroke by stroke like a pen tracing it', 'svg:draw (stroke draws on)'], // vector layer
    ['a saturated color pool bleeding off the corner into white', 'gradientWash'],                        // background preset
    ['highlight the word as it is spoken like a marker', 'highlight'],                                    // caption style
    ['a chip that pops and bounces into place', 'pop'],                                                   // anim
    ['a lit crescent edge of light on one side of the subject', 'rimLight'],                              // glow preset
    ['cross dissolve fade between two clips', 'fade'],                                                    // seam fx
    ['camera pushes slowly closer to tighten focus', 'push in'],                                          // camera word
    ['a 3d phone device turning with a real app screen on it', 'deviceShowcase'],                         // three scene
    ['make this move feel snappy and springy', 'snappy'],                                                 // feel word
    ['a glassy transparent cube that bends and splits light like a prism', 'glassRefract'],               // raymarch
    ['a heavy hit that lands hard', 'impact'],                                                            // motion voice
    ['make it look like a newspaper print with dots', 'halftone'],                                        // canvas fx
    ['text through a heat vision thermal camera', 'thermalBlur'],                                          // generator
    ['travelling through space past the stars', 'starfield'],                                             // paint fx
    ['make a chip pop in from nothing', 'popIn'],                                                          // part entrance
    ['a handwritten note font', 'Caveat'],                                                                // ransom face
    ['make this vertical for a phone screen', '9:16'],                                                    // output target
    ['a video for tiktok', 'tiktok'],                                                                     // destination
    ['a fast entrance duration', 'fast'],                                                                 // duration word
    ['drain the colour to grey', 'desaturate'],                                                           // adjustment
    ['a moving crimson and amber fire mesh gradient that drifts', 'ember'],                               // gradient recipe
    ['put content in the safe content column at any aspect ratio', 'stage'],                              // placement
  ];
  {
    const inTop3 = (q, want) => { const qt = arsenalToks(q);
      return corpus.map((e) => ({ n: e.name, c: coverage(e, qt) })).sort((a, b) => b.c - a.c)
        .slice(0, 3).some((r) => r.n === want); };
    const miss = FAMILY.filter(([q, w]) => !inTop3(q, w) || covers(q, w) < CONFIDENT);
    if (miss.length) console.log(`    families whose query does not confidently resolve: ${miss.map(([q, w]) => `${w} <- "${q}"`).join('; ')}`);
    ok('every searchable family has an author-phrased query that finds it confidently, in the top three', miss.length === 0);
  }

  const ABSENT = [
    'invert a layer against whatever is behind it',
    'render the scene in stereoscopic 3d for a headset',
    'transcribe the voiceover into subtitles automatically',
    'make one layer chase another layer around the frame',
    'attach a physics rigid body to a layer',
  ];
  for (const q of ABSENT) {
    const b = best(q);
    ok(`arsenal says it does not know "${q}" (nearest ${b.name} at ${b.c.toFixed(2)})`, b.c < CONFIDENT);
  }

  // A word in every blurb must not buy confidence, which is the reason the weighting is idf and not a
  // plain count. Unweighted, "chase another layer around the frame" scored the same as a real query.
  ok('a query of nothing but corpus-wide filler is never confident',
     best('the layer in the frame').c < CONFIDENT);
  ok('the threshold sits strictly between the two sets, so neither end is decoration',
     CONFIDENT > Math.max(...ABSENT.map((q) => best(q).c))
     && CONFIDENT <= Math.min(...PRESENT.map(([q, w]) => covers(q, w))));
}


// ---- ARSENAL SNIPPETS: the line an author PASTES ---------------------------------------------------
// Every hit prints the JSON it goes in, and that line was built by one string replace over the slot. It
// was wrong for both key-shaped families: `modifiers[]` printed `"modifiers[]": "upright" }]`, which is
// not JSON at all, and every dotted slot printed a flat `"cameraMove.move": …`, which parses and is not
// what the engine reads. Nobody noticed because the modifier family was unsearchable until the day
// before. So the check is not "one family is fixed", it is that EVERY entry's snippet parses and puts
// the name where its own slot says it goes. The walk below restates the slot grammar deliberately: a
// test that called the renderer's own path builder would agree with it whatever it did.
{
  const corpus = await arsenalCollect();
  const nameAt = (obj, slot, name) => {
    const segs = slot.split('.');
    let node = obj;
    for (let i = 0; i < segs.length; i++) {
      const seg = segs[i];
      const marker = (seg.endsWith('[]') || seg.endsWith('{}')) ? seg.slice(-2) : '';
      const key = marker ? seg.slice(0, -2) : seg;
      if (!node || typeof node !== 'object') return false;
      node = node[key];
      if (marker === '[]') {
        if (!Array.isArray(node) || !node.length) return false;
        node = node[0];
      }
      if (i === segs.length - 1) {
        if (marker) return !!node && typeof node === 'object' && Object.prototype.hasOwnProperty.call(node, name);
        return node === name;
      }
    }
    return false;
  };

  const pasteable = corpus.filter((e) => e.slot && !e.slot.includes('(') && e.kind !== 'blueprint beat');
  const bad = [];
  for (const e of pasteable) {
    const snip = arsenalSnippet(e);
    let obj = null;
    try { obj = JSON.parse(`{${snip}}`); } catch { bad.push(`${e.kind} · ${e.name}: not JSON · ${snip}`); continue; }
    if (!nameAt(obj, e.slot, e.name)) bad.push(`${e.kind} · ${e.name}: not at \`${e.slot}\` · ${snip}`);
  }
  if (bad.length) console.error('     ' + bad.slice(0, 5).join('\n     '));
  ok(`every arsenal snippet parses as JSON and lands at its own slot (${pasteable.length} entries)`,
     bad.length === 0);

  // Per FAMILY, because the bug was one family being wrong while the other thirty-odd were right, and a
  // total pass count hides that. A family with no pasteable snippet must be one whose slot is prose.
  const families = [...new Set(corpus.map((e) => e.kind))];
  const silent = families.filter((k) => corpus.filter((e) => e.kind === k)
    .every((e) => e.kind === 'blueprint beat' ? false : !arsenalSnippet(e)));
  ok('the only families that print no paste are the ones whose slot is prose, not a path',
     silent.every((k) => corpus.filter((e) => e.kind === k).every((e) => e.slot && e.slot.includes('('))));
  ok('both key-shaped families put the NAME in the key position, not the value',
     (() => { const m = corpus.find((e) => e.kind === 'modifier');
              const d = corpus.find((e) => e.kind === 'effector drive');
              return arsenalSnippet(m) === `"modifiers": [{ "${m.name}": {} }]`
                && arsenalSnippet(d) === `"effector": { "drives": { "${d.name}": 1 } }`; })());
}


// ---------------------------------------------------------------------------------------------------
// THE CHOOSER'S CANDIDATES (harness/dev/candidates.mjs): what gets offered, and what a choice becomes.
//
// The panel that shows the strip depends on exactly two things: that the patch it is handed applies to
// the key it names, and that the six options are visibly DIFFERENT from each other. Both are pure and
// neither needs a browser, so both are asserted here rather than by looking at six clips.
{
  const { look: bgLook, patchOps, applyPatch, pickForVariety } = await import('../../harness/dev/candidates.mjs');

  // ---- the patch ----
  ok('candidates: the patch replaces the preset of the window it names, and nothing else',
    JSON.stringify(patchOps(2, 'liquid')) === '[{"op":"replace","path":"/bg/2/preset","value":"liquid"}]');
  ok('candidates: an `opts` block the new preset has no knob for is removed VISIBLY, as a second op',
    (() => { const ops = patchOps(0, 'paperDots', true);
      return ops.length === 2 && ops[1].op === 'remove' && ops[1].path === '/bg/0/opts'; })());
  ok('candidates: applying a patch changes the preset and leaves the source object untouched',
    (() => {
      const scene = { module: 'scene', bg: [{ preset: 'paper' }, { preset: 'dark', opts: { intensity: 2 } }] };
      const out = applyPatch(scene, patchOps(1, 'liquid', true));
      return out.bg[1].preset === 'liquid' && out.bg[1].opts === undefined
        && scene.bg[1].preset === 'dark' && scene.bg[1].opts.intensity === 2;
    })());

  // ---- what a preset LOOKS like, on this film's palette ----
  ok('candidates: `plain` is flat and `liquid` moves, read off the preset the engine builds',
    bgLook('plain').family === 'flat' && bgLook('plain').moves === false
    && bgLook('liquid').moves === true && bgLook('liquid').family === 'liquid');
  ok('candidates: lightness is MEASURED, so `paper` is light and `deep` is dark on the same palette',
    bgLook('paper').tone === 'light' && bgLook('deep').tone === 'dark');
  // BLACK MEANS #000000, and the three assertions are the three ways it stops meaning that.
  //
  // CLAUDE.md carried a whole section saying a pitch-black ground had to be hand-written HTML with a
  // `tone: "dark"` typed beside it, because no preset reached zero. Rendered at 1920x1080 on the vawe
  // theme, `dark`, `deep` and `ink` all sample rgb(12,18,26) at the corner and `black` samples
  // rgb(0,0,0). A tint of 12 is invisible next to a lit subject and obvious next to nothing.
  ok('backgrounds: `black` is literally #000000, which is the only reason it exists',
    bgPreset('black').base.kind === 'solid' && bgPreset('black').base.color === '#000000');
  // NO GRAIN. Grain is noise painted OVER the base, so one grain fx lifts the corner off zero and the
  // ground is very dark rather than black. Every other flat preset takes it; this one must not.
  ok('backgrounds: and it carries no fx at all, because grain would lift the corner off zero',
    bgPreset('black').fx.length === 0);
  // The half that makes it [built] rather than a shorter way to type the same mistake: scene.js reads
  // lightness off `base.color`, so the ink flips with nothing declared. A hand-authored fragment
  // returns null there and needs the tone typed every time.
  ok('backgrounds: the engine MEASURES it dark, so no `tone` has to be typed beside it',
    bgLook('black').tone === 'dark' && bgLook('black').moves === false);
  // The whole reason lightness is not read off the name: `value:"dark"` makes the same preset a dark
  // window, exactly as films/scene/scene.js decides it (engine-doctrine/MISTAKES.md #159 is the drift this avoids).
  ok('candidates: `value:"dark"` makes a light preset a dark window, the engine\'s own rule',
    bgLook('plain').tone === 'light' && bgLook('plain', 'dark').tone === 'dark');

  // ---- the picking ----
  // Six settings of one look are ONE option, so the strip must not fill up with a family it already has
  // even when that family holds the highest-scoring entries.
  const pool = [
    { name: 'a', relevance: 0.9, family: 'aurora', tone: 'dark' },
    { name: 'b', relevance: 0.8, family: 'aurora', tone: 'dark' },
    { name: 'c', relevance: 0.7, family: 'aurora', tone: 'dark' },
    { name: 'd', relevance: 0.6, family: 'flat', tone: 'light' },
    { name: 'e', relevance: 0.5, family: 'liquid', tone: 'dark' },
  ];
  ok('candidates: the strip takes an unseen family over a higher-scoring one it already has',
    pickForVariety(pool, 3).map((c) => c.name).join('') === 'ade');
  ok('candidates: relevance still orders the strip inside that rule, best first',
    pickForVariety(pool, 5)[0].name === 'a');
  ok('candidates: once every family is on the strip the rest fill in by relevance, nothing is lost',
    pickForVariety(pool, 5).map((c) => c.name).join('') === 'adebc');
  ok('candidates: `n` is a ceiling and a short pool is not padded',
    pickForVariety(pool, 2).length === 2 && pickForVariety(pool.slice(0, 1), 6).length === 1);
  // Deterministic, because the panel re-runs this and a strip that reshuffles is a strip nobody trusts.
  ok('candidates: the same pool always yields the same strip, ties broken by name',
    (() => {
      const tied = pool.map((c) => ({ ...c, relevance: 0 }));
      const one = pickForVariety(tied, 4).map((c) => c.name).join('');
      return one === pickForVariety([...tied].reverse(), 4).map((c) => c.name).join('');
    })());
}


// ---- arsenal --for: the trigger, not the search --------------------------------------------------
//
// The first cut ranked the arsenal against the film's own ON-SCREEN COPY, which states the subject
// ("part of Twitter") and nothing about the vocabulary, so it matched nothing and printed nothing at
// all. Silence read exactly like "you have used everything". The signal has to come from the
// registries, and this asserts that it does: a film naming one cut has decided cuts are in play, so
// the other 26 are a real omission rather than a guess.
{
  const { registries } = await import('../../core/registry/registry.js');
  await import('../../harness/author/arsenal.mjs').catch(() => {});
  const cut = registries().find((r) => r.kind === 'cut');
  ok('arsenal --for: the cut vocabulary is reachable from the registry list', !!cut && cut.names.length > 20);
  const { execFileSync } = await import('node:child_process');
  let out = '', ranClean = true;
  try {
    out = execFileSync('node', [path.join(repoRoot, 'harness/author/arsenal.mjs'), '--for',
      path.join(repoRoot, 'tests/fixtures/films/sample.json')], { encoding: 'utf8' });
  } catch { ranClean = false; }
  // sample.json is the reference scene every author reads first, so it is the one file guaranteed to
  // exist in a fresh clone. If it draws from no vocabulary at all the output is legitimately empty.
  ok('arsenal --for: runs against the reference scene without throwing', ranClean);
  ok('arsenal --for: says what a film has NOT reached for, or says nothing at all',
    out === '' || /has not reached for/.test(out));
}


// ---- `make arsenal AT=` (harness/author/schema-at.mjs) --------------------------------------------
//
// The tool that answers "what may I write HERE" from films/scene/schema.json. Every assert below is
// about the ANSWER being read out of the schema, never about a list this test or that tool keeps: the
// failure it was built for was an author guessing a keyframe's bezier handles were `in`/`out`, so a
// second copy of the field names anywhere in this chain would be the same bug with more steps.
{
  const schema = loadSchema();
  const at = (p) => atResolve(schema, atSteps(p));

  // THE INCIDENT, asserted directly. `easeIn`/`easeOut` are the real names and the guess was `in`/`out`.
  const kf = at('layers[].motion[]');
  // Through `childrenOf`, the same call the CLI prints from, so a tool that started filtering or
  // substituting fields on the way to the page would fail here rather than in front of an author.
  const kfFields = Object.keys(atChildren(kf.node) || {});
  ok('schema AT: the keyframe path lists the real handle names, not the guess that broke three films',
     !kf.error && kfFields.includes('easeIn') && kfFields.includes('easeOut')
     && !kfFields.includes('in') && !kfFields.includes('out'));
  ok('schema AT: the keyframe path carries the whole pose, `t` and `ox` included',
     ['t', 'x', 'y', 'scale', 'ox', 'oy'].every((f) => kfFields.includes(f)));

  // IT READS THE SCHEMA, NOT A SECOND LIST. Every field it printed above is a key of the schema node
  // that quality/gates/schema-drift.mjs holds against core/timeline/sequence.js KEYFRAME_PROPS. Compared to that
  // same node here: if the tool ever grew a list of its own, these two sets would stop being equal.
  const owner = schema.fields.layers.item.motion.item;
  ok('schema AT: what it lists at a path IS the schema node at that path, with nothing added or hidden',
     kfFields.slice().sort().join(',') === Object.keys(owner).sort().join(','));

  // BOTH SPELLINGS OF ONE PATH. `[]` is what an author writes; `item` is the schema's own key, and the
  // spelling quality/gates/schema-drift.mjs addresses the same node by.
  ok('schema AT: `layers.item.motion.item` and `layers[].motion[]` are one path',
     atFmt(at('layers.item.motion.item').trail) === atFmt(kf.trail));

  // A WRONG FIELD IS ANSWERED WITH THE LEGAL SET, never with a bare refusal. The map handed back is
  // what the caller prints, so an empty one would be a rejection that teaches nothing.
  const miss = at('layers[].zzNothing');
  ok('schema AT: an unknown field is answered with what IS legal at that path',
     miss.error === 'unknown' && miss.want === 'zzNothing'
     && miss.map && Object.keys(miss.map).length > 100 && 'anim' in miss.map);

  // A PARTIAL PATH IS FOUND, not refused: `AT=motion` fails at the root and the tree search is what
  // turns that into an answer.
  ok('schema AT: a partial path (`motion`) resolves to exactly one place in the tree',
     at('motion').error === 'unknown'
     && atPaths(schema).filter((x) => x.name === 'motion').map((x) => x.path).join() === 'layers[].motion');

  // WHICH VOCABULARY AN ENUM IS, derived by value from the live registries rather than from a table.
  // `layers.item.preset` is deliberately the union of two, and containment is what reports both.
  const regs = registries();
  ok('schema AT: an enum is traced back to the registry that owns it, by value',
     kindsOfEnum(schema.fields.layers.item.anim.enum, regs).includes('anim')
     && kindsOfEnum(schema.fields.cuts.item.style.enum, regs).includes('cut'));
  ok('schema AT: a slot carrying two vocabularies names both',
     ['kinetic preset', 'glow preset'].every((k) => kindsOfEnum(schema.fields.layers.item.preset.enum, regs).includes(k)));
  // `aspect` USED TO BE THE OWNERLESS EXAMPLE, and it is not any more: core/layout/safe.js's ASPECTS became a
  // registry, so the enum now names one. That is the improvement arriving, not the test breaking, and
  // the stronger assertion is the one the change makes available: that the enum finds its owner. The
  // ownerless half moves to a field that genuinely has none, so both halves keep being tested.
  ok('schema AT: an enum whose values ARE a registry names its owner',
     kindsOfEnum(schema.fields.aspect.enum, regs).includes('output target'));
  ok('schema AT: an enum that is nobody\'s registry claims no owner',
     kindsOfEnum(schema.fields.fps.enum, regs).length === 0);
}


// ---- the arsenal ratchet: hand-catalogued capabilities may fall, never rise --------------------
//
// This gate's job has been shrinking and nothing said so. Most of what it used to check is structural
// now and unreachable from here: a half-written catalog block throws at LOAD (checkCatalog), a blurb
// that restates its own name throws at LOAD (checkBlurb), a dial contradicting its signature throws at
// LOAD (bindDials). What is left is the one question no derivation can answer, because it is a decision
// and not a fact: is this a capability, and did you give it a registry?
//
// Ratcheted rather than gated at zero, because zero is not reachable and a rule that demands the
// impossible is a rule people turn off. Three registries deliberately carry no catalog block (feel,
// duration and camera words merge into one table) and several sections have no registry behind them yet.
{
  const { execFileSync } = await import('node:child_process');
  const gate = path.join(repoRoot, 'quality/gates/arsenal-check.mjs');
  const ratchet = path.join(repoRoot, 'quality/baselines/arsenal-ratchet.json');
  const saved = fs.readFileSync(ratchet, 'utf8');
  const run = () => { try { return { code: 0, out: execFileSync('node', [gate], { encoding: 'utf8', cwd: repoRoot }) }; }
    catch (e) { return { code: e.status, out: `${e.stdout || ''}${e.stderr || ''}` }; } };
  try {
    ok('arsenal ratchet: the recorded number is the count of hand-catalogued capabilities',
      Number.isInteger(JSON.parse(saved).handCatalogued));
    // ONE BELOW THE TRUE COUNT, not a hardcoded 0. This wrote 0 to force a rise, which worked only while
    // some capability was still hand-catalogued. The count reached 0 the day the last two got registries,
    // and 0 stopped being a rise, so the test that proves the ratchet has teeth quietly lost its own.
    // Reading the real value and subtracting one is a forced rise at every count including zero.
    const trueCount = JSON.parse(saved).handCatalogued;
    fs.writeFileSync(ratchet, JSON.stringify({ handCatalogued: trueCount - 1 }));
    const worse = run();
    ok('arsenal ratchet: a RISE is refused', worse.code === 1);
    // The message must name the cheaper path, not merely the number. A gate that reports a count and no
    // next action is one an author satisfies by editing the count.
    ok('arsenal ratchet: and it names the one-edit alternative',
      /catalog` block/.test(worse.out) && /--stamp/.test(worse.out));
    fs.writeFileSync(ratchet, JSON.stringify({ handCatalogued: 9999 }));
    ok('arsenal ratchet: a FALL is reported, not silently accepted',
      /fewer hand-catalogued/.test(run().out));
  } finally { fs.writeFileSync(ratchet, saved); }
}


// ---- craft-checklist: features, and the answered/missing split ------------------------------------
// The gate's whole contract is "a relevant doc with no storyboard answer blocks". Asserted here rather
// than left to the two sample renders in the repo, which can both go stale or be deleted.
{
  const { computeFeatures, craftMapFrom, storyboardPathFor, docConfirmDate } = await import('../../quality/gates/craft-checklist.mjs');

  // A tiny synthetic scene exercising every feature at once: short, with an image, a text layer with
  // split+preset (kinetic), an html layer, one cut, and real (non-silent) audio.
  const scene = {
    duration: 6,
    layers: [
      { type: 'image', src: 'x.png' },
      { type: 'text', text: 'hello', split: 'word', preset: 'up' },
      { type: 'html', html: '<div>x</div>' },
      { type: 'group', children: [{ type: 'text', text: '' }] }, // empty text: does not count as a text beat
    ],
    cuts: [{ t: 3, style: 'hard' }],
    audio: { music: 'warm.wav' },
  };
  const f = computeFeatures(scene);
  ok('craft-checklist: always is always true', f.always === true);
  ok('craft-checklist: 6s scene is short, not long', f.short === true && f.long === false);
  ok('craft-checklist: an image layer sets hasImages', f.hasImages === true);
  ok('craft-checklist: a text layer with split+preset sets hasKinetic', f.hasKinetic === true);
  ok('craft-checklist: an html layer sets hasHtml', f.hasHtml === true);
  ok('craft-checklist: a real text layer sets hasTextBeats', f.hasTextBeats === true);
  ok('craft-checklist: one cut sets hasBoundaries', f.hasBoundaries === true);
  ok('craft-checklist: a named music bed sets hasAudio and clears silent',
    f.hasAudio === true && f.silent === false);

  const onlyEmptyText = computeFeatures({ duration: 5, layers: [{ type: 'text', text: '  ' }] });
  ok('craft-checklist: a blank-text layer alone does not count as a text beat', onlyEmptyText.hasTextBeats === false);

  const longSilent = computeFeatures({ duration: 20, layers: [], audio: { silent: true } });
  ok('craft-checklist: a 20s scene is long, not short', longSilent.long === true && longSilent.short === false);
  ok('craft-checklist: silent:true is silent and carries no audio',
    longSilent.silent === true && longSilent.hasAudio === false);

  const noBoundaries = computeFeatures({ duration: 5, layers: [] });
  ok('craft-checklist: no cuts/seams/stings/transitions means no boundaries', noBoundaries.hasBoundaries === false);

  // storyboardPathFor: same basename, .storyboard.md sibling.
  ok('craft-checklist: storyboardPathFor swaps .json for .storyboard.md beside the scene',
    storyboardPathFor('films/scene/foo.json') === 'films/scene/foo.storyboard.md');

  // craftMapFrom: reads the nested `craft:` map out of a storyboard's frontmatter, case-insensitive key,
  // and stops at the first dedented (or blank) line so it never bleeds into the prose below.
  const sbAnswered = '---\nmessage: "x"\ncraft:\n  layout: "off-center hero, cream ground"\n  sound: "VO carries it"\n---\n\nbody text\n';
  const mapAnswered = craftMapFrom(sbAnswered);
  ok('craft-checklist: craftMapFrom reads a two-entry craft: map', mapAnswered.layout === 'off-center hero, cream ground' && mapAnswered.sound === 'VO carries it');
  ok('craft-checklist: craftMapFrom on a storyboard with no craft: key returns empty',
    Object.keys(craftMapFrom('---\nmessage: "x"\n---\n')).length === 0);

  // The gate itself, end to end, via temp files: a relevant doc with no answer BLOCKS; the same scene
  // with every relevant doc answered PASSES. Mirrors how audio-check's own asserts spawn the real CLI.
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'craft-checklist-'));
  const sceneFile = path.join(tmp, 'demo.json');
  fs.writeFileSync(sceneFile, JSON.stringify({ module: 'scene', duration: 6, layers: scene.layers, cuts: scene.cuts, audio: scene.audio }));

  const runGate = () => spawnSync(process.execPath, [path.join(repoRoot, 'quality/gates/craft-checklist.mjs'), sceneFile], { encoding: 'utf8' });

  // no storyboard sidecar at all: no separate code any more (folded into no-storyboard, which the main
  // ladder already owns); the craft map is just empty, so every relevant doc reads as craft-unvisited.
  const noPlan = runGate();
  ok('craft-checklist: a scene with no storyboard sidecar blocks with craft-unvisited, not a second code',
    noPlan.status !== 0 && /craft-unvisited/.test(noPlan.stdout) && !/no-plan-for-craft/.test(noPlan.stdout));

  // a storyboard that answers nothing: every relevant doc is craft-unvisited, blocks.
  fs.writeFileSync(path.join(tmp, 'demo.storyboard.md'), '---\nmessage: "x"\n---\n');
  const unanswered = runGate();
  ok('craft-checklist: a storyboard with no craft: map blocks with craft-unvisited',
    unanswered.status !== 0 && /craft-unvisited/.test(unanswered.stdout));

  // the same scene, every relevant doc answered: passes clean.
  const { docRegistry } = await import('../../quality/gates/craft-checklist.mjs');
  const features = computeFeatures(scene);
  const relevant = docRegistry().filter((d) => features[d.appliesWhen] === true);
  const craftLines = relevant.map((d) => `  ${d.slug}: "answered"`).join('\n');
  fs.writeFileSync(path.join(tmp, 'demo.storyboard.md'), `---\nmessage: "x"\ncraft:\n${craftLines}\n---\n`);
  const answered = runGate();
  ok('craft-checklist: a storyboard answering every relevant doc passes clean',
    answered.status === 0 && !/craft-unvisited/.test(answered.stdout));

  // DATE-GATED craft-new-doc: a doc added after a film's approval must not retroactively block it
  // (this is the DEFECT the owner measured: a doc added today re-blocked 34 approved films). Anchor
  // on the real git-dated confirm: line of an 'always' doc so the test tracks reality, not a date
  // that a later edit to the doc could silently invalidate.
  const densityDate = docConfirmDate('engine-doctrine/CRAFT/DENSITY.md');
  ok('craft-checklist: docConfirmDate finds a real YYYY-MM-DD date for an existing doc',
    typeof densityDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(densityDate));

  // approved BEFORE every doc's confirm: line existed: nothing is required, only reported.
  fs.writeFileSync(path.join(tmp, 'demo.storyboard.md'), '---\nmessage: "x"\napproved: "1970-01-01"\n---\n');
  const approvedBefore = runGate();
  ok('craft-checklist: approved before every doc existed passes, reporting craft-new-doc only',
    approvedBefore.status === 0 && /craft-new-doc/.test(approvedBefore.stdout)
      && !/craft-unvisited/.test(approvedBefore.stdout));

  // approved AFTER every doc's confirm: line existed: today's behaviour, unanswered docs still block.
  fs.writeFileSync(path.join(tmp, 'demo.storyboard.md'), '---\nmessage: "x"\napproved: "2099-01-01"\n---\n');
  const approvedAfter = runGate();
  ok('craft-checklist: approved after every doc existed blocks with craft-unvisited, same as today',
    approvedAfter.status !== 0 && /craft-unvisited/.test(approvedAfter.stdout)
      && !/craft-new-doc/.test(approvedAfter.stdout));

  // no `approved:` at all (unapproved film): every applicable doc is still required, same as today.
  fs.writeFileSync(path.join(tmp, 'demo.storyboard.md'), '---\nmessage: "x"\n---\n');
  const unapproved = runGate();
  ok('craft-checklist: an unapproved film still requires every applicable doc',
    unapproved.status !== 0 && /craft-unvisited/.test(unapproved.stdout));

  fs.rmSync(tmp, { recursive: true, force: true });
}


// ---- stage.mjs: the `make stage` adoption block is grounded in THIS film, not the whole markdown ----
// Regression for the defect measured on vawe-flow: a whole-document word match let `up`/`rise`/`slide`
// (transitions) and `weight`/`type`/`focus` (kinetic presets) count as "used" from unrelated prose
// anywhere in the file (a `weight:` line, a `why:`), and let bare, blurb-less names (`none`,
// `easeInOutElastic`) outrank a real match on pure substring luck. A tiny synthetic storyboard, one
// beat naming a real capability in prose and one declaring `camera:` structurally.
{
  const sbPath = path.join(repoRoot, 'tests/fixtures/films/_lib-test-adoption.storyboard.md');
  const prevFilmsDir = process.env.VAWE_FILMS_DIR;
  process.env.VAWE_FILMS_DIR = 'tests/fixtures/films';
  fs.writeFileSync(sbPath, [
    '---',
    'duration: 6s',
    '---',
    '',
    '## Beat 1: A (0s-3s)',
    '- mechanism: the camera follows the cursor, arriving just before each click',
    '- onscreen: "watch it click"',
    '',
    '## Beat 2: B (3s-6s)',
    '- camera: slowPush to=1.05',
    '',
  ].join('\n'));
  try {
    const rows = adoptionReport('_lib-test-adoption');
    const cam = rows.find((r) => r.label === 'camera');   // the group label discovery.mjs owns
    ok('stage adoption: a structural camera: field counts as used', cam.used === 1);
    ok('stage adoption: the used move is never re-suggested', !cam.suggestions.some((s) => s.name === 'slowPush'));
    ok('stage adoption: a real prose match (followCursor: cursor/click) is suggested with evidence',
      cam.suggestions.some((s) => s.name === 'followCursor' && s.matched.length > 0));
    const trans = rows.find((r) => r.label === 'transitions');
    ok('stage adoption: no `transition_in:`/`camera:`/`move:`/`motion:` field anywhere means 0 transitions used '
      + '(not inflated by an unrelated word like "up" or "rise" sitting in prose)', trans.used === 0);
    for (const r of rows) {
      ok(`stage adoption: ${r.label} never suggests an identity entry (none/linear/hold)`,
        !r.suggestions.some((s) => ['none', 'linear', 'hold'].includes(s.name)));
    }
  } finally {
    fs.rmSync(sbPath, { force: true });
    if (prevFilmsDir === undefined) delete process.env.VAWE_FILMS_DIR; else process.env.VAWE_FILMS_DIR = prevFilmsDir;
  }
}


// ---- assemble.mjs: a beat's camera: and a camera-kind recipe: (window-dolly) both write cameraMove ---
// Two producers of the same field: harness/author/assemble.mjs builds a windowed cameraMove entry per
// beat `camera:` line; recipes/expand.mjs expandCameraLine appends a leg for a camera-kind recipe (e.g.
// `window-dolly`) at RENDER time, with no overlap check of its own (it just appends to whatever
// assemble already wrote). Asserted end to end via temp files, the same shape craft-checklist's own
// asserts already use.
{
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'assemble-camera-'));
  const base = path.join(tmp, 'demo');
  const write = (sb, extraJson) => {
    fs.writeFileSync(`${base}.storyboard.md`, sb);
    fs.writeFileSync(`${base}.json`, JSON.stringify({ module: 'scene', theme: 'default', aspect: '16:9', ...extraJson }));
    for (const n of [1, 2, 3]) fs.writeFileSync(`${base}.scene${n}.html`, `<div style="position:absolute;inset:0"></div>\n`);
  };
  const runAssemble = () => spawnSync(process.execPath, [path.join(repoRoot, 'harness/author/assemble.mjs'), `${base}.json`], { encoding: 'utf8' });

  const sbOverlap = `---\nduration: 4.5s\n---\n\n## Beat 1: A (0s-1.5s)\n- camera: diveIn tx=960 ty=300 to=1.4\n\n`
    + `## Beat 2: B (1.5s-3.0s)\n- recipe: window-dolly from=1.0 to=2.0 target=scene2\n\n## Beat 3: C (3.0s-4.5s)\n`;
  write(sbOverlap);
  const overlapRun = runAssemble();
  ok('assemble: a beat camera: overlapping a camera-kind recipe: window is refused, both named',
    overlapRun.status !== 0 && /window-dolly/.test(overlapRun.stderr) && /diveIn/.test(overlapRun.stderr));

  const sbClean = `---\nduration: 4.5s\n---\n\n## Beat 1: A (0s-1.5s)\n- camera: diveIn tx=960 ty=300 to=1.4\n\n`
    + `## Beat 2: B (1.5s-3.0s)\n- recipe: window-dolly from=1.5 to=2.5 target=scene2\n\n## Beat 3: C (3.0s-4.5s)\n`;
  write(sbClean);
  const cleanRun = runAssemble();
  ok('assemble: a beat camera: and a camera-kind recipe: with non-overlapping windows both build',
    cleanRun.status === 0 && /1 camera move/.test(cleanRun.stdout));
  const built = JSON.parse(fs.readFileSync(`${base}.json`, 'utf8'));
  ok('assemble: the built cameraMove carries only the beat-declared leg (the recipe leg is added later, at render expand)',
    Array.isArray(built.cameraMove) && built.cameraMove.length === 1 && built.cameraMove[0].move === 'diveIn');
  ok('assemble: the recipe line still lands in recipes[]', Array.isArray(built.recipes) && built.recipes.length === 1 && built.recipes[0].recipe === 'window-dolly');

  fs.rmSync(tmp, { recursive: true, force: true });
}


// ---- contract.mjs: the camera: field, and the extended transition_in: syntax --------------------
// harness/lib/contract.mjs parseCameraLine/parseTransitionIn are the ONE reader storyboard-check.mjs
// and assemble.mjs both go through; asserted here so a change to either never ships un-tested.
{
  const beat = (name, extra) => ({ name, ...extra });

  // a real move name, with params, resolves clean
  const push = parseCameraLine('slowPush to=1.08');
  ok('contract: camera: a real move name with a param resolves', push.move === 'slowPush' && push.params.to === 1.08);

  // a shot-word phrase resolves to its move, through the SAME CAMERA_WORDS the engine reads
  const word = parseCameraLine('push in to=1.1');
  ok('contract: camera: a camera-word phrase resolves to its move name', word.move === 'slowPush' && word.params.to === 1.1);

  // a decisive but wrong single token is an ERROR naming the near miss
  const typo = parseCameraLine('slowPussh to=1.08');
  ok('contract: camera: a decisive typo is an error naming the near miss', !!typo.error && /slowPush/.test(typo.error));

  // a param the move's own signature does not read is an ERROR
  const badParam = parseCameraLine('slowPush too=1.08');
  ok('contract: camera: an unknown param is an error naming the move\'s real ones', !!badParam.error && /"too"/.test(badParam.error) && /start, dur, from, to, ease/.test(badParam.error));

  // free prose (never a decisive attempt) is reported as PROSE, not silently dropped
  const prose = parseCameraLine('the camera pushes in slowly on the card');
  ok('contract: camera: free prose is reported as prose, never silently dropped', prose.prose === true);
  const near = nearestCameraMoves(prose.text, 3);
  ok('contract: camera: nearestCameraMoves names 3 real moves for a prose line', near.length === 3 && near.every((n) => typeof n.blurb === 'string' && n.blurb.length));

  // unset is null, the same "no opinion" convention as parseEdge
  ok('contract: camera: unset/none is null (no opinion)', parseCameraLine(null) === null && parseCameraLine('none') === null);

  // cameraErrors/cameraWarnings route decisive-wrong to errors and prose to warnings, never both
  const beats1 = [beat('A', { camera: 'slowPussh' }), beat('B', { camera: 'the camera drifts in' })];
  ok('contract: cameraErrors catches the decisive typo and not the prose', cameraErrors(beats1).length === 1 && /slowPussh/.test(cameraErrors(beats1)[0]));
  ok('contract: cameraWarnings catches the prose and not the typo', cameraWarnings(beats1).length === 1 && /drifts in/.test(cameraWarnings(beats1)[0]));

  // resolvedCamera is null for prose/errors/unset, and carries move+params when clean
  ok('contract: resolvedCamera is null for a beat with no clean resolution', resolvedCamera(beat('A', { camera: 'the camera drifts in' })) === null);
  const rc = resolvedCamera(beat('A', { camera: 'diveIn tx=960 ty=300' }));
  ok('contract: resolvedCamera carries move+params for a clean line', rc && rc.move === 'diveIn' && rc.params.tx === 960);

  // cameraContinuityErrors: two camera: legs either side of a cut-free (recipe:) boundary is refused,
  // because every camera move here resets x/y to identity at its own start key.
  const seamPair = [beat('A', { camera: 'diveIn tx=960 ty=300' }), beat('B', { camera: 'slowPush', recipe: 'flow-seam out=a in=b axis=x' })];
  ok('contract: cameraContinuityErrors refuses camera: on both sides of a no-cut seam', cameraContinuityErrors(seamPair).length === 1);
  // the same pairing across a REAL cut (no recipe:) is fine: a reset there is ordinary editing grammar
  const cutPair = [beat('A', { camera: 'diveIn tx=960 ty=300' }), beat('B', { camera: 'slowPush' })];
  ok('contract: cameraContinuityErrors says nothing across a real cut', cameraContinuityErrors(cutPair).length === 0);
  // one side declaring no camera: at all is never a conflict
  const oneSided = [beat('A', { camera: 'diveIn tx=960 ty=300' }), beat('B', { recipe: 'flow-seam out=a in=b axis=x' })];
  ok('contract: cameraContinuityErrors says nothing when only one side moves the camera', cameraContinuityErrors(oneSided).length === 0);

  // transition_in: extended syntax (timing=/dur=/dir=), and the fx: decisive marker unchanged
  const fx = parseTransitionIn('fx:cinematicZoom');
  ok('contract: transition_in: a bare fx: line still resolves', fx && fx.fx === 'cinematicZoom' && fx.timing === undefined);
  const fxExtra = parseTransitionIn('fx:whipPan timing=ramp dur=0.6 dir=left');
  ok('contract: transition_in: timing=/dur=/dir= all parse onto the resolved fx',
    fxExtra && fxExtra.fx === 'whipPan' && fxExtra.timing === 'ramp' && fxExtra.dur === 0.6 && fxExtra.dir === 'left');
  const badTiming = parseTransitionIn('fx:whipPan timing=zoop');
  ok('contract: transition_in: an unknown timing is an error naming the known ones', !!badTiming.error && /linear, smooth, out, snappy, pop, rush, brake, ramp, spring/.test(badTiming.error));
  ok('contract: transition_in: prose (no fx: marker) is not a decision', parseTransitionIn('whip pan into the grid') === null);

  const tNear = nearestTransitions('whip pan into the grid', 3);
  ok('contract: nearestTransitions names 3 real transitions for prose', tNear.length === 3 && tNear.every((n) => TRANSITIONS_NAMES_SEEN(n.name)));
  function TRANSITIONS_NAMES_SEEN(n) { return typeof n === 'string' && n.length > 0; }

  const tBeats = [beat('A', {}), beat('B', { transition_in: 'whip pan into the grid' })];
  ok('contract: transitionInWarnings reports unresolved prose, not silently', transitionInWarnings(tBeats).length === 1);
  const tBeats2 = [beat('A', {}), beat('B', { transition_in: 'fx:cinematicZoom' })];
  ok('contract: transitionInWarnings says nothing for a resolved fx: line', transitionInWarnings(tBeats2).length === 0);
  const rt = resolvedTransitionIn(beat('B', { transition_in: 'fx:whipPan dur=0.4' }));
  ok('contract: resolvedTransitionIn carries mech and the extra params', rt && rt.mech && rt.dur === 0.4);
  ok('contract: transitionInErrors ignores beat 1 (opens the film, not a boundary)', transitionInErrors([beat('A', { transition_in: 'fx:notreal' })]).length === 0);
}


// ---- harness/lib/waivers.mjs: a waiver excuses the instance it names, a bare one excuses the film ---
{
  ok('waivers: splitWaiver reads a bare code with no instance', JSON.stringify(splitWaiver('dead-air')) === JSON.stringify({ code: 'dead-air', instance: null }));
  ok('waivers: splitWaiver splits code@instance on the FIRST @', JSON.stringify(splitWaiver('dead-air@beat:3')) === JSON.stringify({ code: 'dead-air', instance: 'beat:3' }));
  ok('waivers: an instance may itself contain @ (an asset path); only the first @ is the separator', splitWaiver('missing-font@fonts/A@2x.woff2').instance === 'fonts/A@2x.woff2');

  // BARE still excuses every instance, unchanged behaviour: no existing film's waivers stop working.
  ok('waivers: a bare entry covers any instance of its code', waiverCovers('crossfade-mud', 'crossfade-mud', 'layer:3'));
  ok('waivers: a bare entry covers a finding with NO instance too', waiverCovers('crossfade-mud', 'crossfade-mud', undefined));
  ok('waivers: a bare entry never covers a different code', !waiverCovers('crossfade-mud', 'dead-air', undefined));

  // SCOPED excuses only the instance it names: a second instance of the SAME code is a new question.
  ok('waivers: a scoped entry covers its own instance', waiverCovers('dead-air@beat:3', 'dead-air', 'beat:3'));
  ok('waivers: a scoped entry does not cover a different instance of the same code', !waiverCovers('dead-air@beat:3', 'dead-air', 'beat:4'));
  ok('waivers: a scoped entry does not cover a finding with no instance at all', !waiverCovers('dead-air@beat:3', 'dead-air', undefined));

  ok('waivers: isWaivedBy is true when ANY entry in the list covers the finding', isWaivedBy(['off-font', 'dead-air@beat:3'], 'dead-air', 'beat:3'));
  ok('waivers: isWaivedBy is false when no entry covers the finding', !isWaivedBy(['off-font', 'dead-air@beat:3'], 'dead-air', 'beat:4'));
  ok('waivers: isWaivedBy of an empty list excuses nothing', !isWaivedBy([], 'dead-air', 'beat:3'));

  const g = groupWaivers(['off-font', 'dead-air@beat:3', 'dead-air@beat:5']);
  ok('waivers: groupWaivers separates bare codes', g.bare.has('off-font') && !g.bare.has('dead-air'));
  ok('waivers: groupWaivers collects every scoped instance under its code', [...g.scoped.get('dead-air')].sort().join(',') === 'beat:3,beat:5');

  // bareWaiverCoverage: what a BARE waiver hides, from the run's own finding records, never invented.
  const recs = [{ code: 'placeholder-word', at: '0.0s' }, { code: 'placeholder-word', at: '3.0s' }, { code: 'off-font', at: 'headline' }];
  const covBare = bareWaiverCoverage(['placeholder-word'], 'placeholder-word', recs);
  ok('waivers: bareWaiverCoverage counts every finding of the bare-waived code', covBare.count === 2);
  ok('waivers: bareWaiverCoverage names the instances when the gate provides them', covBare.instances.join(',') === '0.0s,3.0s' && covBare.hasInstanceData);
  ok('waivers: bareWaiverCoverage returns null when the code is not waived bare', bareWaiverCoverage(['placeholder-word@0.0s'], 'placeholder-word', recs) === null);
  const covNoAt = bareWaiverCoverage(['dead-air'], 'dead-air', [{ code: 'dead-air', at: undefined }, { code: 'dead-air', at: undefined }]);
  ok('waivers: a code whose gate names no instance still counts, honestly, with no instances to list', covNoAt.count === 2 && !covNoAt.hasInstanceData);
}

// A COUNT THAT FALLS IS A FINDING, and until now nothing looked at it. `fail === 0` exits 0 no matter
// how many assertions actually RAN, so a block that quietly stops running (an `await import` failing
// inside a swallowing catch, a section deleted in a merge, an early return added while debugging) takes
// its assertions with it and the run still prints a tick. That is absence read as a pass, in the file
// this repo relies on to notice absence read as a pass.
//
// A FLOOR AND NOT AN EXACT COUNT, deliberately: this file gains assertions most days, so an exact match
// would fail on every honest addition and be edited to fit within a week. The floor is raised when it is
// comfortably passed, the same way quality/baselines/arsenal-ratchet.json is stamped, and it is a number in the
// source rather than a file because a floor you can see while adding a test is a floor you remember.

// ---- harness/lib/claims-truth.mjs: a known-answer fixture, one false claim of each kind ------------
// A fixture STRING, not a tracked .md file: a tracked fixture with a deliberately false claim would be
// picked up by docs-drift.mjs's own repo-wide scan and fail the real gate for the wrong reason.
{
  const truth = deriveEngineTruth(repoRoot);
  ok('claims-truth: deriveEngineTruth reads 60 final / 30 draft off cmd/render/main.go', truth.finalFps === 60 && truth.draftFps === 30);
  ok('claims-truth: deriveEngineTruth reads 5 canvases off core/layout/safe.js', truth.canvasCount === 5);
  ok('claims-truth: deriveEngineTruth reads 24 layer types off core/layers/index.js', truth.layerCount === 24);

  // BT stands in for a backtick. A literal `make blueprints` in THIS file's own source would be
  // caught by the "gates: every make <target> a gate prints" check just below, since that check
  // scans every quality/gates/*.mjs file (this one included) for a backtick-quoted target. Building
  // the fixture from BT keeps the retired-name text out of this file's own source.
  const BT = String.fromCharCode(96);
  // The layer-type line is BUILT, not typed, for the same reason as BT above: a literal
  // "N layer types" in this file's own source is exactly the claim quality/gates/site-counts.mjs
  // hunts for across quality/gates/*.mjs, and it would report this fixture as a real stale count.
  const wrongLayerCount = truth.layerCount + 6;
  const FIXTURE = [
    'one rendered Short (1080x1920, 24fps).',                 // wrong fps, and only one number named
    'the engine now ships 6 canvases.',                        // wrong canvas count
    `an open canvas of ${wrongLayerCount} composable layer types.`, // wrong layer count
    `reach for ${BT}make blueprints${BT} to see the full roster.`, // retired name, live instruction
    'a plain separating line, about nothing in particular.',
    'the blueprints/ directory is gone, deleted last month.',  // history: same-sentence, must NOT fire
  ].join('\n');

  const numberFindings = findNumberClaims(FIXTURE, truth);
  ok('claims-truth fixture: exactly one fps finding', numberFindings.filter((c) => c.kind === 'fps').length === 1);
  ok('claims-truth fixture: exactly one canvas finding', numberFindings.filter((c) => c.kind === 'canvas').length === 1);
  ok('claims-truth fixture: exactly one layer finding', numberFindings.filter((c) => c.kind === 'layer').length === 1);
  ok('claims-truth fixture: no other number findings', numberFindings.length === 3);

  const retiredFindings = findRetiredNames(FIXTURE);
  ok('claims-truth fixture: exactly one retired-name finding (the live instruction, not the history line)',
    retiredFindings.length === 1 && retiredFindings[0].label === `${BT}make blueprints${BT}`);

  // printOnly: a bare mention with no print call is not a finding; the same line wrapped in
  // console.log IS. Proves the printOnly gate actually gates rather than always passing.
  const bare = `the WHY comment above still says ${BT}make blueprints${BT} for context.`;
  const printed = `console.log('reach for ${BT}make blueprints${BT} to see the full roster');`;
  ok('claims-truth: printOnly ignores a bare mention with no print call', findRetiredNames(bare, { printOnly: true }).length === 0);
  ok('claims-truth: printOnly catches the same name inside console.log(...)', findRetiredNames(printed, { printOnly: true }).length === 1);
}


// ---- harness/lib/safeguards.mjs: adaptive verdicts for overflow and clipped-text ----
{
  // overflow: under 1% of the box on its worst axis is rounding, tolerated and reported, not failed.
  const smallSpill = adaptFinding({ kind: 'overflow', a: 'x', pct: 0.0075, detail: 'content 402x100 clipped to 400x100' });
  ok('safeguards: overflow under 1% tolerates', smallSpill.adapted && smallSpill.adapted.verdict === 'tolerate');
  ok('safeguards: tolerated overflow prints an adapted line', /^adapted overflow:/.test(smallSpill.adapted.line));

  // overflow: a real spill above the 1% floor still fails, unmodified (no `.adapted`).
  const realSpill = adaptFinding({ kind: 'overflow', a: 'x', pct: 0.2, detail: 'content 480x100 clipped to 400x100' });
  ok('safeguards: overflow over 1% stays a hard fail', !realSpill.adapted);

  // clipped-text: ellipsis + overflow:hidden is designed truncation, reclassified and reported.
  const truncated = adaptFinding({ kind: 'clipped-text', a: 'headline', ellipsis: true, detail: 'mask is 4px too narrow' });
  ok('safeguards: ellipsis clipped-text reclassifies', truncated.adapted && truncated.adapted.verdict === 'reclassify');
  ok('safeguards: reclassified clipped-text prints an adapted line', /^adapted clipped-text:/.test(truncated.adapted.line));

  // clipped-text: a real mask-too-small bug (no ellipsis) still fails, unmodified.
  const realClip = adaptFinding({ kind: 'clipped-text', a: 'headline', ellipsis: false, detail: 'mask is 4px too narrow' });
  ok('safeguards: non-ellipsis clipped-text stays a hard fail', !realClip.adapted);

  // a code with no registry entry, or a finding missing the facts an entry needs, passes through.
  const noEntry = adaptFinding({ kind: 'safe', a: 'x', detail: 'off frame' });
  ok('safeguards: an unregistered code passes through unchanged', !noEntry.adapted);
  const noFacts = adaptFinding({ kind: 'overflow', a: 'x', detail: 'no pct on this one' });
  ok('safeguards: overflow with no pct fact does not apply', !noFacts.adapted);
}


// ---- safeguards: the new REGISTRY entries (build fix 10, adaptive safeguards wave 2) ----
{
  // small-text: wrapped text is skipped, unwrapped small text still fails.
  const wrapped = adaptFinding({ kind: 'small-text', px: 18, wrapped: true });
  ok('safeguards: small-text inside a screenshot/mock-UI wrapper is skipped', wrapped.adapted && wrapped.adapted.verdict === 'skip');
  const unwrapped = adaptFinding({ kind: 'small-text', px: 18, wrapped: false });
  ok('safeguards: small-text with no wrapper stays a hard fail', !unwrapped.adapted);

  // plain-slideshow: the storyboard's own NOT line waives it, an unexplained slideshow still fails.
  const notWaived = adaptFinding({ kind: 'plain-slideshow' }, { not: ['this film is deliberately a plain slideshow'] });
  ok('safeguards: plain-slideshow is skipped when the storyboard\'s NOT line names it', notWaived.adapted && notWaived.adapted.verdict === 'skip');
  const notSilent = adaptFinding({ kind: 'plain-slideshow' }, { not: ['no auto-playing audio'] });
  ok('safeguards: plain-slideshow stays a hard fail when NOT does not name it', !notSilent.adapted);

  // feature-poverty: below the short-film floor it is skipped, a full-length film still fails.
  const shortFilm = adaptFinding({ kind: 'feature-poverty' }, { durationSec: 9 });
  ok('safeguards: feature-poverty is skipped below the short-film floor', shortFilm.adapted && shortFilm.adapted.verdict === 'skip');
  const longFilm = adaptFinding({ kind: 'feature-poverty' }, { durationSec: 30 });
  ok('safeguards: feature-poverty stays a hard fail past the short-film floor', !longFilm.adapted);

  // ends-on-nothing: a brand/mark tail layer counts as content, a truly bare tail still fails.
  const brandTail = adaptFinding({ kind: 'ends-on-nothing', tailLayerKind: 'brand-mark' });
  ok('safeguards: ends-on-nothing reclassifies a closing brand/mark layer as content', brandTail.adapted && brandTail.adapted.verdict === 'reclassify');
  const bareTail = adaptFinding({ kind: 'ends-on-nothing', tailLayerKind: '' });
  ok('safeguards: ends-on-nothing stays a hard fail on a truly bare tail', !bareTail.adapted);

  // plan-overruns-render: a one-frame drift tolerates, a real overrun still fails.
  const oneFrame = adaptFinding({ kind: 'plan-overruns-render', driftFrames: 1 }, { fps: 30 });
  ok('safeguards: plan-overruns-render tolerates a one-frame drift', oneFrame.adapted && oneFrame.adapted.verdict === 'tolerate');
  const bigDrift = adaptFinding({ kind: 'plan-overruns-render', driftFrames: 45 }, { fps: 30 });
  ok('safeguards: plan-overruns-render stays a hard fail on a real overrun', !bigDrift.adapted);
}

const FLOOR = 1800;


  assert.equal(fail, 0, `${fail} of ${pass + fail} assertion(s) failed`);
  assert.ok(pass >= 209, `expected at least 209 assertions (the count this file was split with) to have run, saw ${pass}`);
});
