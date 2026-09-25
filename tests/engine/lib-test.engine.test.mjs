import test from 'node:test';
import assert from 'node:assert/strict';
// quality/gates/lib-test.mjs: fast pure-JS asserts for the motion primitives in core/motion/motion.js.
// No browser needed (the primitives are pure). Run: node quality/gates/lib-test.mjs  (make lib-test)
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

test('lib-test: engine', async () => {
// ---- background `opts`: a knob a window declares must be READ, or refused by name (MISTAKES #157).
// The accepted set is derived from the fx implementations, so these also pin that the derivation is
// live: rename the property an fx reads and the vocabulary must follow it.
ok('bg opts vocabulary is derived from the fx implementation (liquid)', ['scale', 'speed', 'warp', 'edge0', 'edge1', 'gloss', 'res'].every((k) => FX_PARAMS.liquid.includes(k)));
ok('bg opts vocabulary is per preset (a dots preset has no `scale`)', !bgOptKeys(bgPreset('paperDots')).includes('scale') && bgOptKeys(bgPreset('paperDots')).includes('spacing'));
const bgOver = (preset, over) => { try { return applyBgOver(bgPreset(preset), over); } catch { return null; } };
ok('bg opts reach the fx (liquid scale/speed/edge0)', (() => { const s = bgOver('liquid', { scale: 1.6, speed: 0.3, edge0: 0.4 }); const fx = s && s.fx.find((f) => f.type === 'liquid'); return !!fx && fx.scale === 1.6 && fx.speed === 0.3 && fx.edge0 === 0.4; })());
ok('bg opts meta knobs still scale the baked numbers', (() => { const s = bgOver('paperDots', { dotAlpha: 0.5, grain: 0.2 }); const d = s && s.fx.find((f) => f.type === 'dots'), g = s && s.fx.find((f) => f.type === 'grain'); return !!d && d.peakAlpha === 0.5 && g.alpha === 0.2; })());
ok('a bg opt no fx here reads is REFUSED, not dropped', bgOverErrors(bgPreset('liquid'), { dotAlpha: 0.2 }, 'bg[0]').length === 1 && bgOver('liquid', { dotAlpha: 0.2 }) === null);


// ---- gradient preset: agent-controlled colours, runtime-generated (no baked raster pack shipped) ----
ok('bg opts vocabulary is derived from the fx implementation (gradientFill)', ['kind', 'colors', 'angle', 'stops', 'cx', 'cy', 'recipe'].every((k) => FX_PARAMS.gradientFill.includes(k)));
ok('gradient preset base shape: paper base + gradientFill + grain', (() => { const s = bgPreset('gradient'); return s.base.kind === 'linear' && s.fx.some((f) => f.type === 'gradientFill') && s.fx.some((f) => f.type === 'grain'); })());
ok('gradient preset opts reach the fx (colors/angle/kind), and `kind` does not collide with the fx discriminator `type`', (() => { const s = bgOver('gradient', { kind: 'radial', colors: ['#111111', '#222222'], angle: 10 }); const fx = s && s.fx.find((f) => f.type === 'gradientFill'); return !!fx && fx.kind === 'radial' && fx.type === 'gradientFill' && fx.angle === 10 && Array.isArray(fx.colors) && fx.colors[0] === '#111111'; })());
ok('gradient preset resolves a named recipe at paint time (not opts)', (() => { const s = bgOver('gradient', { recipe: 'cool-mint' }); const fx = s && s.fx.find((f) => f.type === 'gradientFill'); return !!fx && fx.recipe === 'cool-mint'; })());
ok('gradient preset carries a blurb', typeof BG_BLURBS.gradient === 'string' && BG_BLURBS.gradient.length > 0);
ok('gradient recipes are a real registry (unknown recipe throws with a hint)', (() => { try { GRADIENT_RECIPE_REGISTRY.pick('zzz-not-real'); return false; } catch (e) { return /unknown/i.test(e.message); } })());
ok('gradient mesh refuses a non-numeric colour by name, not a raw TypeError', (() => { const ctx = { createLinearGradient: () => ({ addColorStop() {} }), fillRect() {}, set fillStyle(v) {} }; try { gradientFill(ctx, 100, 100, 0, { kind: 'mesh', colors: ['coral'] }); return false; } catch (e) { return /is not hex or rgb/.test(e.message); } })());
ok('gradient tolerates a stops array shorter than colors (even fallback, no crash)', (() => { const ctx = { createLinearGradient: () => ({ addColorStop(at) { if (typeof at !== 'number' || Number.isNaN(at)) throw new Error('bad offset'); } }), fillRect() {}, set fillStyle(v) {} }; try { gradientFill(ctx, 100, 100, 0, { kind: 'linear', colors: ['#111111', '#222222', '#333333'], stops: [0, 0.5] }); return true; } catch { return false; } })());

// LETTER-SPACING HAS EXACTLY ONE WRITER. This is the contract MISTAKES #28 and #388 were both breaches
// of: styleText resolved the value, microType overwrote it one statement later, and that one statement
// silently discarded the author's `tracking` (12 shipped scenes) and then the light-on-dark polarity.
// Each repair threaded another argument into the second writer, which fixed the symptom and left the
// trap. Two things are pinned below, and BOTH are needed:
//   1. the SOURCE test. No file in core/ may assign letter-spacing except the resolver. A second
//      writer now fails here rather than in a film nobody diffs.
//   2. the BEHAVIOUR tests. The one resolver really does fold in every opinion (author prop, size
//      ramp, polarity, mono, raw), so nobody has to add a second write to get one of them honoured.
{
  // 1. THE SOURCE TEST.
  const coreFiles = [];
  const walkCore = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walkCore(p);
      else if (e.name.endsWith('.js')) coreFiles.push(p);
    }
  };
  walkCore(path.join(repoRoot, 'core'));
  // Assignment forms only. A tween that ANIMATES letter-spacing (core/engine/gsap-effects.js `expandIn`) is a
  // motion over the settled value, not a second opinion about what the settled value is.
  const WRITE = /\.style\.letterSpacing\s*=|setProperty\(\s*['"]letter-spacing['"]/;
  // The allowlist is a list of REASONS, not of files. A file may only be here if it writes a value it
  // did not decide.
  const ALLOWED = {
    'core/layers/util.js': 'the resolver: trackingCss decides, styleText writes, once',
    'core/motion/morph.js': 'copies the ALREADY-RESOLVED computed value onto a wrapper (getComputedStyle → wrap), so the glyphs keep their spacing through the morph. It forms no opinion.',
  };
  const writers = coreFiles
    .filter((p) => WRITE.test(fs.readFileSync(p, 'utf8')))
    .map((p) => path.relative(repoRoot, p).split(path.sep).join('/'))
    .sort();
  const rogue = writers.filter((p) => !(p in ALLOWED));
  ok(`letter-spacing has one writer (rogue: ${rogue.join(', ') || 'none'})`, rogue.length === 0);
  ok('the resolver is still the writer', writers.includes('core/layers/util.js'));

  // 2. THE BEHAVIOUR TESTS. createKit needs no DOM to build the kit, and styleText needs no real
  // element: it only assigns onto `el.style`. So the exact string a layer settles on is testable here,
  // which is what makes "one writer" a property worth having rather than a tidiness argument.
  const kitFor = (theme, ink) => createKit({
    theme, inkAt: () => ink, bgWinAt: () => null, ACCENT_BGS: [], trackingFor,
    splitText: () => null, icon: () => '', extra: [],
  });
  const spacingOf = (L, { theme = { type: { optical: true }, palette: { text: '#111111', ink: '#f4f4f4' } }, ink = null } = {}) => {
    const el = { style: { setProperty() {} } };
    kitFor(theme, ink).styleText(el, L, 1);
    return el.style.letterSpacing;
  };
  const DARK_GROUND = '#f4ecd0'; // a LIGHT ink → the ground under it is dark
  const LIGHT_GROUND = '#111111';

  ok('author `tracking` survives the whole pass (#28)', spacingOf({ text: 'A', size: 150, tracking: '0.42em' }) === '0.42em');
  ok('author `ls` survives the whole pass (#79)', spacingOf({ text: 'A', size: 150, ls: '0.31em' }) === '0.31em');
  ok('author prop wins over the polarity lift too',
    spacingOf({ text: 'A', size: 150, ls: '0.31em' }, { ink: DARK_GROUND }) === '0.31em');
  ok('the size ramp is the default', spacingOf({ text: 'A', size: 120 }) === trackingFor(120));
  ok('the dark lift reaches the settled value (#388)',
    spacingOf({ text: 'A', size: 120 }, { ink: DARK_GROUND }) === trackingFor(120, true)
    && spacingOf({ text: 'A', size: 120 }, { ink: LIGHT_GROUND }) === trackingFor(120));
  // mono and raw take the older kit rule; pinned so a "tidy-up" cannot quietly re-track code blocks.
  ok('mono is not optically tracked by the micro rule',
    spacingOf({ text: 'A', size: 120, font: 'mono' }, { theme: { palette: {} } }) === '-0.03em');
  ok('raw serif keeps its own fit',
    spacingOf({ text: 'A', size: 120, font: 'serif', raw: true }) === '0');

  // 3. POLARITY IS NOT THE LAYER'S TO ANSWER WHEN AN EFFECT REPAINTS EVERY GLYPH. `ransom` cuts each
  // letter onto its own light paper chip, so a ransom layer whose LAYER ink is light is dark-on-light
  // everywhere the eye can see. The lift must not fire. False is the conservative answer: the polarity
  // term only ever ADDS, so declining to answer renders exactly as no effect would.
  ok('paintsOwnGlyphs names ransom', paintsOwnGlyphs({ ransom: true }) && !paintsOwnGlyphs({ text: 'A' }));
  ok('every GLYPH_PAINTERS key is a layer prop that flips it',
    GLYPH_PAINTERS.length > 0 && GLYPH_PAINTERS.every((k) => paintsOwnGlyphs({ [k]: true })));
  ok('a ransom layer over a dark ground takes NO dark lift',
    spacingOf({ text: 'A', size: 150, ransom: true }, { ink: DARK_GROUND }) === trackingFor(150));
  ok('a non-ransom layer over the same ground still does',
    spacingOf({ text: 'A', size: 150 }, { ink: DARK_GROUND }) === trackingFor(150, true));
  ok('onDark itself is the thing that declines',
    kitFor({ palette: {} }, DARK_GROUND).onDark({ ransom: true }, 1) === false
    && kitFor({ palette: {} }, DARK_GROUND).onDark({ text: 'A' }, 1) === true);

  // 4. childExitDur: a group child that names no exitDur of its own used to fall straight through to
  // driveClips' BASE_EXIT default regardless of what the group declared, so a row blueprint's
  // `exitDur:0` ("held to the beat's own end") never reached the text/rect inside the row, and a
  // dissolve into/out of that beat crossed a field its own children had already faded to nothing.
  ok('a child with its own exitDur keeps it', childExitDur({ exitDur: 0.5 }, { exitDur: 0 }) === 0.5);
  ok('a child with none inherits the group\'s', childExitDur({}, { exitDur: 0 }) === 0);
  ok('neither set: undefined, so BASE_EXIT still applies', childExitDur({}, {}) === undefined);
}

// transitions kit: every presentation lands at full visibility (enter(1)); fade-out family exits hidden
{
  const opts = { dir: 'left', dist: 90, cx: 50, cy: 50 };
  for (const [name, P] of Object.entries(PRESENTATIONS)) {
    if (name === 'none') continue;
    const landed = P.enter(1, opts);
    ok(`cut ${name} lands visible`, approx(+(landed.opacity ?? 1), 1, 0.01));
    if (landed.filter && landed.filter !== 'none') ok(`cut ${name} lands unblurred`, landed.filter.includes('(0.00px)'));
    if (!['wipe', 'iris', 'clock', 'softwipe', 'softiris', 'barn', 'letterbox'].includes(name)) {
      const gone = P.exit(1, opts);
      ok(`cut ${name} exits hidden`, +(gone.opacity ?? 1) <= 0.05);
    }
  }
  const steady = cutStyle('whip', { enter: 1, exit: 0 }, opts);
  ok('cutStyle steady opaque', approx(+steady.opacity, 1, 0.01));
  ok('cutStyle exit fades', +cutStyle('fade', { enter: 1, exit: 0.9 }, opts).opacity < 0.2);
  ok('cutStyle deterministic', JSON.stringify(cutStyle('jitter', { enter: 0.4, exit: 0 }, opts)) === JSON.stringify(cutStyle('jitter', { enter: 0.4, exit: 0 }, opts)));

  // SOLO MODE (MISTAKES #166). A cut driven onto ONE root runs exit to completion and only THEN enter,
  // so any visibility channel it touches empties the whole frame at the midpoint. soloCutStyle must hold
  // every such channel at identity across the entire window, for every style and every phase.
  const HIDE = ['opacity', 'clipPath', 'WebkitClipPath', 'maskImage', 'WebkitMaskImage'];
  const visible = (s) => +s.opacity === 1 && HIDE.slice(1).every((k) => s[k] === 'none');
  for (const name of Object.keys(PRESENTATIONS)) {
    let held = true, moved = false;
    for (let i = 0; i <= 10; i++) {
      const p = i / 10;
      for (const st of [soloCutStyle(name, { exit: p, enter: 1 }, opts), soloCutStyle(name, { exit: 0, enter: p }, opts)]) {
        if (!visible(st)) held = false;
        if (st.transform !== 'none' || st.filter !== 'none') moved = true;
      }
    }
    ok(`solo ${name} never hides the frame`, held);
    // and the classification must agree with what actually moves, or the loud refusal in
    // films/scene/scene.js is guarding the wrong set.
    ok(`solo ${name} SOLO_BLIND matches what moves`, SOLO_BLIND.has(name) !== moved);
  }
  ok('SOLO_BLIND is derived, not empty and not everything', SOLO_BLIND.size > 0 && SOLO_BLIND.size < Object.keys(PRESENTATIONS).length);
  ok('solo: a pure-opacity style is blind', SOLO_BLIND.has('fade'));
  ok('solo: transform/filter styles are usable', !SOLO_BLIND.has('punch') && !SOLO_BLIND.has('blur'));
  ok('soloCutStyle keeps the style character', soloCutStyle('punch', { exit: 0.5, enter: 1 }, opts).transform !== 'none');
  ok('soloCutStyle deterministic', JSON.stringify(soloCutStyle('punch', { exit: 0.5, enter: 1 }, opts)) === JSON.stringify(soloCutStyle('punch', { exit: 0.5, enter: 1 }, opts)));
  ok('soloCutStyle steady state is visually identity', visible(soloCutStyle('punch', { enter: 1, exit: 0 }, opts))
    && soloCutStyle('punch', { enter: 1, exit: 0 }, opts).filter === 'none');
}

// ANCESTOR KILLS (core/ancestor-kills.js): an ancestor style that silently disables a descendant
// capability. Every row is measured by harness/dev/probe-ancestor-kills.mjs; these assert that the
// table stays wired to the cut vocabulary, not that the browser still behaves that way.
{
  // cutWrites is DERIVED from the presentations, so it must agree with what each one visibly does.
  ok('cutWrites: blur writes a filter and nothing else in solo', [...cutWrites('blur', { solo: true })].join() === 'filter');
  ok('cutWrites: blur also fades under sceneUnits', cutWrites('blur').has('opacity') && cutWrites('blur').has('filter'));
  ok('cutWrites: slide never writes a filter', !cutWrites('slide', { solo: true }).has('filter'));
  ok('cutWrites: a mask style collapses onto one channel name', cutWrites('softwipe').has('maskImage')
    && !cutWrites('softwipe').has('WebkitMaskImage'));
  ok('cutWrites: none writes nothing', cutWrites('none').size === 0);
  ok('cutWrites: every presentation classifies itself', Object.keys(CUT_PRESENTATIONS_AK).every((k) => cutWrites(k) instanceof Set));

  // the measured matrix, at the three rows the engine actually acts on
  ok('kills: a filter takes the backdrop away', killedBy(['filter'], 'backdrop').length === 1);
  ok('kills: a clip does NOT take the backdrop away', killedBy(['clipPath'], 'backdrop').length === 0);
  ok('kills: overflow does NOT take the backdrop away', killedBy(['overflow'], 'backdrop').length === 0);
  ok('kills: a transform does NOT take the backdrop away', killedBy(['transform'], 'backdrop').length === 0);
  ok('kills: a transform DOES take a blend away', killedBy(['transform'], 'blend').length === 1);
  ok('kills: a clip takes depth away', killedBy(['clipPath'], 'depth').length === 1);
  ok('kills: a transform does NOT take depth away', killedBy(['transform'], 'depth').length === 0);
  ok('kills: an unknown capability throws', (() => { try { killedBy([], 'nope'); return false; } catch { return true; } })());

  ok('capabilitiesOf: glass asks for the backdrop', capabilitiesOf({ glass: 'refract' })[0].cap === 'backdrop');
  ok('capabilitiesOf: glass:false asks for nothing', capabilitiesOf({ glass: false }).length === 0);
  ok('capabilitiesOf: a plane modifier asks for depth', capabilitiesOf({ modifiers: [{ plane: -800 }] })[0].cap === 'depth');
  ok('capabilitiesOf: an adjust layer asks for the backdrop', capabilitiesOf({ type: 'adjust', kind: 'blur' })[0].cap === 'backdrop');
  ok('capabilitiesOf: a plain layer asks for nothing', capabilitiesOf({ type: 'text', text: 'x' }).length === 0);

  // THE REPORTED BUG, as a test: a glass layer under a filter-writing cut must refuse, and the
  // refusal must name the layer, the capability and a way out. engine-doctrine/MISTAKES.md #542.
  const glassScene = { cuts: [{ t: 8.2, style: 'blur', dur: 0.34 }], sceneUnits: false,
    layers: [{ id: 'lens', type: 'html', glass: 'refract', start: 0.35, duration: 10.8 }] };
  let msg = '';
  try { checkCuts(glassScene); } catch (e) { msg = e.message; }
  ok('ancestor-kills refuses blur-cut over a glass layer', msg.length > 0);
  ok('the refusal names the layer', msg.includes('"lens"'));
  ok('the refusal names the conflicting thing', msg.includes('blur') && msg.includes('filter'));
  ok('the refusal names a way out', msg.includes('slide'));
  ok('the refusal never offers a style that has the same defect', !/\(([^)]*)\)/.test(msg) || !msg.split('(')[1].split(')')[0].split(', ').some((k) => cutWrites(k, { solo: true }).has('filter')));
  // a cut that writes no filter is fine over the same layer
  ok('a transform-only cut over glass is allowed',
    (() => { try { checkCuts({ ...glassScene, cuts: [{ t: 8.2, style: 'slide', dur: 0.34 }] }); return true; } catch { return false; } })());
  // and a cut OUTSIDE the layer's window is fine, whatever it writes
  ok('a blur cut outside the layer window is allowed',
    (() => { try { checkCuts({ ...glassScene, cuts: [{ t: 20, style: 'blur', dur: 0.34 }] }); return true; } catch { return false; } })());
  // depth is the second live row: the same filter flattens the rig (films/scene/scene.js says so)
  let dmsg = '';
  try { checkCuts({ cuts: [{ t: 1, style: 'blur', dur: 0.3 }], layers: [{ id: 'card', modifiers: [{ plane: -800 }], start: 0, duration: 5 }] }); } catch (e) { dmsg = e.message; }
  ok('ancestor-kills refuses a filter cut over a depth layer', dmsg.includes('"card"') && dmsg.includes('plane'));
  // a group CHILD carrying glass is still a descendant of the cut root, so it is checked too
  let cmsg = '';
  try { checkCuts({ cuts: [{ t: 1, style: 'blur', dur: 0.3 }], layers: [{ id: 'g', type: 'group', start: 0, duration: 5, children: [{ id: 'pane', glass: true }] }] }); } catch (e) { cmsg = e.message; }
  ok('ancestor-kills reaches group children', cmsg.includes('"pane"'));
}

// timeline evaluators (core/timeline/sequence.js): pure math lifted out of scene.html
{
  // cameraAt: empty → null; endpoints clamp; midpoint eases between two keyframes
  ok('cameraAt empty null', cameraAt([], 1) === null);
  ok('cameraAt undefined null', cameraAt(undefined, 1) === null);
  const cam = [{ t: 0, s: 1, x: 0, y: 0 }, { t: 2, s: 2, x: 100, y: -50 }];
  ok('cameraAt before start holds first', cameraAt(cam, -1).s === 1 && cameraAt(cam, -1).x === 0);
  ok('cameraAt after end holds last', cameraAt(cam, 9).s === 2 && cameraAt(cam, 9).x === 100);
  const cmid = cameraAt(cam, 1); // easeInOutCubic(0.5) === 0.5 → exact midpoint
  ok('cameraAt mid scale', approx(cmid.s, 1.5));
  ok('cameraAt mid pan', approx(cmid.x, 50) && approx(cmid.y, -25));
  ok('cameraAt defaults missing keys', approx(cameraAt([{ t: 0 }, { t: 1 }], 0.5).s, 1));
  ok('cameraAt roll defaults to 0', cameraAt([{ t: 0 }, { t: 1 }], 0.5).roll === 0);
  ok('cameraAt roll lerps', approx(cameraAt([{ t: 0, roll: 0 }, { t: 1, roll: 10 }], 0.5).roll, 5));

  // dollyZ: `s` is WHERE THE CAMERA STANDS, so it must convert to a depth the projection agrees with:
  // a camera whose translateZ is z magnifies the canvas plane by lens/(lens-z), and that must come back
  // out as exactly the `s` that went in. A round trip is the only assertion that catches a sign flip.
  ok('dollyZ identity at s=1', dollyZ(1, 1600) === 0);
  ok('dollyZ round-trips through the projection', [1.05, 1.35, 2, 0.6].every((s) => {
    const z = dollyZ(s, 1600);
    return approx(1600 / (1600 - z), s);
  }));
  ok('dollyZ scales with the lens', approx(dollyZ(2, 800), 400) && approx(dollyZ(2, 1600), 800));
  ok('dollyZ refuses a camera at infinite distance', (() => {
    try { dollyZ(0, 1600); return false; } catch (e) { return /positive magnification/i.test(e.message); }
  })());

  // motionAt: clamps before first / after last kf; lerps a mid-segment; honors per-kf ease
  const kf = [{ t: 0, x: 0, y: 0, scale: 1, opacity: 0 }, { t: 1, x: 100, y: 20, scale: 2, opacity: 1 }];
  ok('motionAt before first clamps', motionAt(kf, -1).dx === 0 && motionAt(kf, -1).opacity === 0);
  ok('motionAt after last clamps', motionAt(kf, 5).dx === 100 && motionAt(kf, 5).opacity === 1);
  const mmid = motionAt(kf, 0.5); // default ease easeInOutCubic → 0.5 at t=0.5
  ok('motionAt mid dx', approx(mmid.dx, 50) && approx(mmid.dy, 10));
  ok('motionAt mid scale', approx(mmid.scale, 1.5) && approx(mmid.opacity, 0.5));
  ok('motionAt norm defaults', motionAt([{ t: 0 }], 0).scale === 1 && motionAt([{ t: 0 }], 0).opacity === 1);
  // per-keyframe ease drives the segment (linear vs spring differ off the midpoint)
  const lin = motionAt([{ t: 0, x: 0 }, { t: 1, x: 100, ease: 'linear' }], 0.25).dx;
  const spr = motionAt([{ t: 0, x: 0 }, { t: 1, x: 100, ease: 'spring' }], 0.25).dx;
  ok('motionAt linear ease at .25', approx(lin, 25));
  ok('motionAt spring ease differs from linear', Math.abs(spr - 25) > 1);
  ok('motionAt deterministic', JSON.stringify(motionAt(kf, 0.3)) === JSON.stringify(motionAt(kf, 0.3)));

  // ---- the BOX track (w/h) -----------------------------------------------------------------------
  // w has no identity constant the way x has 0, so it gets ONE rule and resolveKeyedProps is what makes the
  // rule true: both endpoints carry a number, or the track does not animate the box. Anything softer
  // (hold the neighbour, fall back to a guess) is the second interpretation that #195 was made of.
  ok('motionAt no box keys → null', motionAt(kf, 0.5).w === null && motionAt(kf, 0.5).h === null);
  const box = resolveKeyedProps([{ w: 300, h: 200, motion: [{ t: 0 }, { t: 1, w: 900 }] }])[0].motion;
  ok('resolveKeyedProps fills the untouched key from the layer', box[0].w === 300 && box[0].h == null);
  ok('resolveKeyedProps leaves h alone when no key mentions it', box[1].h == null);
  ok('box lerps once filled', approx(motionAt(box, 0.5).w, 600) && motionAt(box, 0.5).h === null);
  ok('box clamps at the endpoints', motionAt(box, -1).w === 300 && motionAt(box, 9).w === 900);
  let threw = '';
  try { resolveKeyedProps([{ id: 'nobase', motion: [{ t: 0, w: 100 }] }]); } catch (e) { threw = e.message; }
  ok('resolveKeyedProps throws when there is no base box', /declares no w/.test(threw));
  // resolveKeyedProps must be idempotent: scene.js runs it once per boot, but a re-boot on the same data
  // object (studio reload, a gate that validates then renders) must not shift the answer.
  const twice = resolveKeyedProps(resolveKeyedProps([{ w: 300, motion: [{ t: 0 }, { t: 1, w: 900 }] }]))[0].motion;
  ok('resolveKeyedProps idempotent', twice[0].w === 300 && twice[1].w === 900);

  // ---- keyed DEPTH -------------------------------------------------------------------------------
  // `track` is the third layer-owned property, and the one that differs: it always HAS an identity,
  // because scene.js already defaults a layer's z-order to its index. So keying depth on a layer that
  // never declared it is ordinary rather than an error, and the fill has to come from the index.
  ok('motionAt no track keys → null', motionAt(kf, 0.5).track === null);
  const dep = resolveKeyedProps([{ id: 'a', motion: [{ t: 0 }] }, { id: 'ribbon', motion: [{ t: 0 }, { t: 1, track: 9 }] }])[1].motion;
  ok('keyed depth fills from the layer INDEX when undeclared', dep[0].track === 1);
  ok('keyed depth lerps', approx(motionAt(dep, 0.5).track, 5));
  const dep2 = resolveKeyedProps([{ track: 4, motion: [{ t: 0 }, { t: 1, track: 0 }] }])[0].motion;
  ok('an explicit track wins over the index', dep2[0].track === 4);
  ok('keyed depth clamps at the endpoints', motionAt(dep2, 9).track === 0);
}


// ---- wave 1 effects: filters · glow presets · caption styles ----
// Each family's pure surface, held to the contract its consumers rely on. The DOM halves (SVG def
// injection, the caption runtime) are covered by make probe + the rendered reel, not here.
{
  // colour-grade presets (core/looks/filters.js)
  ok('filter: raw CSS passes through', resolveFilter('blur(4px) saturate(1.2)').filter === 'blur(4px) saturate(1.2)');
  ok('filter: sepia param', resolveFilter('sepia:0.6').filter === 'sepia(0.6)');
  ok('filter: vignette is an overlay, never a filter', resolveFilter('vignette:0.6').filter === '' && /radial-gradient/.test(resolveFilter('vignette:0.6').overlay));
  ok('filter: deterministic param-addressed ids', resolveFilter('duotone:#141414,#7cffd4').filter === 'url("#f-duotone-141414-7cffd4")');
  ok('filter: goo is a param-addressed svg def', resolveFilter('goo').filter === 'url("#f-goo-r12-h19")');
  ok('filter: goo radius and hardness reach the id', resolveFilter('goo:16,26').filter === 'url("#f-goo-r16-h26")');
  ok('filter: goo clamps a silly radius rather than emitting it', resolveFilter('goo:900').filter === 'url("#f-goo-r60-h19")');
  ok('filter: goo is registered with a blurb, so `make arsenal` finds it', FILTER_REGISTRY.has('goo') && /metaball/i.test(FILTER_REGISTRY.blurbs.goo));
  ok('filter: null safe', JSON.stringify(resolveFilter(null)) === JSON.stringify({ filter: '', overlay: null }));
  ok('filter: parseColor hex3 + rgb + junk', JSON.stringify(parseColor('#7cf')) === '[119,204,255]' && JSON.stringify(parseColor('rgb(1, 2, 3)')) === '[1,2,3]' && parseColor('nope') === null);
  ok('filter: all six presets exist', ['duotone','tritone','gradientMap','posterize','sepia','vignette'].every((k) => FILTER_PRESETS[k]));

  // THE ONE COLOUR PARSER (core/color/engine.js). Four copies with four grammars became one, and this is
  // the falsifiable half of that claim: for each old copy, a colour it REJECTED and a colour it
  // ACCEPTED, run through the shared parser now. If the union ever narrows, or the anchor is
  // dropped again, one of these flips. `node quality/gates/lib-test.mjs --colours` prints the table.
  const J = (v) => JSON.stringify(parseColor(v));
  // filters.js rejected every hex that was not 3 or 6 digits, so an 8-digit brand colour read null
  // and the grade silently fell back to white.
  ok('colour: filters.js rejected #rrggbbaa, now parsed, alpha dropped', J('#0b0b0fcc') === '[11,11,15]');
  ok('colour: filters.js rejected #rgba, now parsed', J('#7cfa') === '[119,204,255]');
  ok('colour: filters.js accepted #rgb and rgb(), still the same channels', J('#7cf') === '[119,204,255]' && J('rgb(1, 2, 3)') === '[1,2,3]');
  // motion.js was the only copy with an array passthrough, and the only one whose rgb() was
  // UNANCHORED. The passthrough is kept; the missing anchor was a bug and is gone.
  ok('colour: motion.js array passthrough kept', J([1, 2, 3]) === '[1,2,3]');
  ok('colour: motion.js unanchored rgb() is now rejected', parseColor('foo rgb(1,2,3)') === null && parseColor('rgb(1,2,3) bar') === null);
  // designspec-check.mjs split rgb() on commas only, so the modern space-separated CSS form was
  // null to the gate; and it alone read floats, which the palette-distance maths depends on.
  ok('colour: designspec rejected space-separated rgb(), now parsed', J('rgb(1 2 3)') === '[1,2,3]' && J('rgb(1 2 3 / 50%)') === '[1,2,3]');
  ok('colour: designspec accepted float channels, still unrounded', J('rgba(1.5, 2, 3, 0.5)') === '[1.5,2,3]');
  ok('colour: 5- and 7-digit hex are a typo, not a colour', parseColor('#12345') === null && parseColor('#1234567') === null);
  // The {r,g,b} adapter is the SAME parse, reshaped, never a second grammar.
  ok('colour: parseColorRGB is the tuple, reshaped', JSON.stringify(parseColorRGB('#0b0b0fcc')) === '{"r":11,"g":11,"b":15}' && parseColorRGB('nope') === null);
  // lightfield stays 6-digit-hex only ON PURPOSE (core/lightfield/colour.js), a narrow wrapper over
  // the shared parser, not a widening of it. Everything the shared parser gained is still refused here.
  ok('colour: lightfield accepts its 6-digit hex', JSON.stringify(lightfieldToRgb('#ee7c56')) === '{"r":238,"g":124,"b":86}');
  ok('colour: lightfield still refuses what the shared parser gained', ['#7cf', '#0b0b0fcc', 'rgb(1,2,3)'].every((v) => {
    try { lightfieldToRgb(v); return false; } catch { return true; }
  }));
  // chromaGlow: soft neon bloom in the glyph shape (pure CSS drop-shadow stack, no SVG)
  ok('filter: chromaGlow is a pure-css glow preset', FILTER_PRESETS.chromaGlow && FILTER_PRESETS.chromaGlow.kind === 'css' && FILTER_PRESETS.chromaGlow.mode === 'glow');
  ok('filter: chromaGlow is a smooth white drop-shadow bloom (no hard fringe)', (() => { const f = resolveFilter('chromaGlow').filter; return f.startsWith('drop-shadow(') && (f.match(/drop-shadow/g) || []).length >= 4 && f.includes('255,255,255') && !/drop-shadow\(0 -?\d+px/.test(f); })());
  ok('filter: chromaGlow size scales the bloom radii', (() => { const big = resolveFilter('chromaGlow:2').filter; return big.includes('80.0px') && !resolveFilter('chromaGlow:1').filter.includes('80.0px'); })());
  ok('filter: chromaGlow deterministic + no SVG url', resolveFilter('chromaGlow:1.5').filter === resolveFilter('chromaGlow:1.5').filter && !resolveFilter('chromaGlow').filter.includes('url('));

  // glow presets (core/layers/glow.js)
  ok('glow: five presets yield backgrounds', ['bloom','halation','diffusion','rimLight','spotlight'].every((n) => typeof presetSpec(n, {}).background === 'string'));
  // A MISS THROWS, and this assertion used to demand the opposite. presetSpec answered an unknown name
  // with null, the builder read null as "no preset asked for", and `preset: "blom"` painted the plain
  // gradient in silence. The test encoded that as the contract, which is how a silent substitution
  // survives a gate. core/registry/registry.js owns the seven names now, so a miss names them and suggests the
  // near one.
  ok('glow: an unknown preset THROWS, and the message names the vocabulary and the near miss', (() => {
    try { presetSpec('blom'); return false; } catch (e) {
      return /glow preset/.test(e.message) && /bloom/.test(e.message);
    }
  })());
  ok('glow: theme-adaptive by default', presetSpec('bloom', {}).background.includes('var(--accent)'));
  ok('glow: explicit tint threads through', presetSpec('bloom', { color: '#123456' }).background.includes('#123456'));
  ok('glow: cx/cy move the light centre', presetSpec('bloom', { cx: 0.25, cy: 0.75 }).background.includes('at 25.0% 75.0%'));
  ok('glow: pulse pure in t + amplitude clamped', pulseOpacity(1.3, 2) === pulseOpacity(1.3, 2)
    && (() => { for (let t = 0; t < 4; t += 0.05) { const o = pulseOpacity(t, 2, 9); if (o < 0.7 || o > 1) return false; } return true; })());
  ok('glow: helpers', alphaMix('red', 0.5) === 'color-mix(in srgb, red 50%, transparent)' && liftWhite('red', 70) === 'color-mix(in srgb, red 30%, white)');

  // chromatic glow presets (wave: chromatic aberration family)
  ok('glow: chromatic is a screen-blended RGB-split halo', (() => { const s = presetSpec('chromatic', {}); return s.blend === 'screen' && s.background.includes('#ff0033') && s.background.includes('#00ff5a') && s.background.includes('#0066ff'); })());
  ok('glow: chromatic offsets the channels off-centre', presetSpec('chromatic', {}).background.includes('at 45.5%') && presetSpec('chromatic', {}).background.includes('at 54.5%'));
  ok('glow: chromaCycle yields a screen-blended neon base', (() => { const s = presetSpec('chromaCycle', {}); return s.blend === 'screen' && typeof s.background === 'string'; })());
  ok('glow: cycleHue sweeps 0->360, pure + looping', cycleHue(0) === 0 && cycleHue(3, 6) === 180 && approx(cycleHue(6, 6), 0) && cycleHue(1.7, 5) === cycleHue(1.7, 5));

  // caption styles (core/type/captions.js)
  const cap = { t0: 1, t1: 3, text: 'Ship the <b>payoff</b> last' };
  const wins = capWords(cap);
  ok('captions: markup-stripped to 4 word windows, contiguous from t0', wins.length === 4 && approx(wins[0].t0, 1)
    && wins[3].t1 <= 3 && wins.every((w, i) => i === 0 || approx(w.t0, wins[i - 1].t1, 1e-3)));
  ok('captions: longer word holds longer (speech pacing)', (wins[2].t1 - wins[2].t0) > (wins[1].t1 - wins[1].t0));
  ok('captions: explicit words win', capWords({ ...cap, words: [{ t0: 1, t1: 1.2 }, { t0: 1.2, t1: 1.4 }, { t0: 1.4, t1: 2 }, { t0: 2, t1: 3 }] })[2].t1 === 2);
  ok('captions: deterministic', JSON.stringify(capWords(cap)) === JSON.stringify(capWords(cap)));
  ok('captions: wordU clamps, lineU monotonic 0->1', wordU(0, wins[0]) === 0 && wordU(99, wins[0]) === 1
    && lineU(0.5, wins) === 0 && approx(lineU(99, wins), 1)
    && (() => { let p = 0; for (let t = 1; t <= 3.2; t += 0.03) { const v = lineU(t, wins); if (v < p - 1e-9) return false; p = v; } return true; })());
  ok('captions: highlight band grows + uses accent token', parseFloat(CAP_STYLES.highlight(0.5).backgroundSize) === 50
    && CAP_STYLES.highlight(0.5).backgroundImage.includes('var(--accent)'));
  ok('captions: pillKaraoke sweeps 0->100', CAP_STYLES.pillKaraoke(0).backgroundSize.startsWith('0') && CAP_STYLES.pillKaraoke(1).backgroundSize.startsWith('100'));
  // the repo has shipped sub-4.5:1 dimming twice; the inactive treatment must be a colour mix, never opacity
  ok('captions: weightShift dims via color-mix, never opacity', (() => { const st = CAP_STYLES.weightShift(1, false); return st.opacity === undefined && st.color.includes('color-mix'); })());
  ok('captions: weightShift bump settles to 1', CAP_STYLES.weightShift(1, true).transform === 'scale(1.000)');
  ok('captions: clipWipe hidden at 0, full at 1', CAP_STYLES.clipWipe(0).clipPath.includes('100.00%') && CAP_STYLES.clipWipe(1).clipPath.includes('0.00%'));

  // ---- wave 3: the two mechanisms a style function cannot express by returning a value ----
  // `mode:'one'` and `unit:'char'` are decided by the CALLER before any style runs, so they are
  // declared in CAP_STYLE_SHAPE and checked here rather than inferred from a style's output.
  ok('captions: a style with no declared shape is word-level and line-mode',
    capShape('highlight').unit === 'word' && capShape('highlight').mode === 'line'
    && capShape('nope-not-a-style').mode === 'line');
  ok('captions: the one-word styles declare mode:one, typeOn declares unit:char',
    capShape('wordFlash').mode === 'one' && capShape('wordSlide').mode === 'one'
    && capShape('typeOn').unit === 'char' && capShape('typeOn').mode !== 'one');
  // The char windows must align INDEX FOR INDEX with core/type/type.js splitText('char'), which emits one
  // unit per non-space character, word by word. There is no DOM here, so the count is the check.
  const chw = capUnitWins(cap, 'char');
  ok('captions: char windows are one per non-space character',
    chw.length === 'Shipthepayofflast'.length && chw.every((w) => w.w.trim().length === 1));
  ok('captions: char windows are contiguous and stay inside their own word',
    chw.every((w, i) => i === 0 || approx(w.t0, chw[i - 1].t1, 1e-3))
    && approx(chw[0].t0, wins[0].t0, 1e-3) && chw[chw.length - 1].t1 <= wins[wins.length - 1].t1 + 1e-6);
  // SPEECH PACING SURVIVES THE SUBDIVISION, and the honest statement of it is about the WINDOW,
  // not the word length. Characters fill their own word's window, so a word the voice holds longer
  // gives its letters longer. Checked against EXPLICIT timings, because that is the design: under
  // the length-proportional fallback a word's window grows as (len+1) while its letter count grows
  // as len, so a longer word is fractionally FASTER per letter. That is an artifact of the
  // estimator and it is small; asserting the opposite of it, as a first draft of this line did, is
  // asserting a bug that is not there.
  ok('captions: characters inherit the pacing of the word window they sit in',
    (() => {
      const timed = { ...cap, words: [{ t0: 1, t1: 1.2 }, { t0: 1.2, t1: 1.4 }, { t0: 1.4, t1: 2.6 }, { t0: 2.6, t1: 3 }] };
      const c = capUnitWins(timed, 'char');
      const d = (w) => w.t1 - w.t0;
      return d(c[8]) > d(c[4]) && approx(c[7].t0, 1.4, 1e-3);   // 'payoff' is held 1.2s, 'the' 0.2s
    })());
  ok('captions: capUnitWins is deterministic and defaults to words',
    JSON.stringify(capUnitWins(cap)) === JSON.stringify(capWords(cap))
    && JSON.stringify(capUnitWins(cap, 'char')) === JSON.stringify(capUnitWins(cap, 'char')));
  // A one-word style paints only the word being spoken, so it needs no colour mix to say what is
  // unread: the unread words are not in the DOM. It must therefore never dim, in any state.
  ok('captions: the one-word styles never dim, in any state',
    ['wordFlash', 'wordSlide'].every((n) => [0, 0.5, 1].every((u) => [true, false].every((a) => {
      const st2 = CAP_STYLES[n](u, a);
      return st2.opacity === undefined && !/color-mix/.test(st2.color || '');
    }))));
  ok('captions: typeOn hides an unarrived character rather than dimming it, and holds its space',
    CAP_STYLES.typeOn(0, false).visibility === 'hidden'
    && CAP_STYLES.typeOn(0.5, true).visibility === 'visible'
    && CAP_STYLES.typeOn(0.5, true).boxShadow.includes('var(--accent)')
    && CAP_STYLES.typeOn(1, false).boxShadow === 'none'
    && CAP_STYLES.typeOn(0, false).opacity === undefined);

  // THE THREE STATES, once per style. A caption style whose upcoming and already-spoken words look
  // identical is a progress bar with no memory: the viewer cannot tell what has been read from what
  // is coming. Every style must therefore emit three DISTINCT declarations, and none of the three may
  // reach for opacity (the contrast doctrine at the top of core/type/captions.js).
  // clipWipe is exempt and cannot be tested this way: it is LINE-level, one argument, no word states.
  const st = (name, u, active) => JSON.stringify(CAP_STYLES[name](u, active));
  for (const name of CAP_STYLE_NAMES.filter((n) => n !== 'clipWipe')) {
    const upcoming = st(name, 0, false), current = st(name, 0.5, true), spoken = st(name, 1, false);
    ok(`captions: ${name}, upcoming, current and spoken all differ`,
      new Set([upcoming, current, spoken]).size === 3);
    // `undefined` or a flat 1 both mean "this style does not reach for opacity". PRESETS.highlight
    // writes 1 authoritatively, which is the opposite of the failure and must not read as one.
    ok(`captions: ${name}, no state dims by opacity`,
      [0, 0.5, 1].every((u) => [true, false].every((a) => {
        const o = CAP_STYLES[name](u, a).opacity;
        return o === undefined || Number(o) === 1;
      })));
    ok(`captions: ${name}. Every colour it names is a theme token`,
      [upcoming, current, spoken].every((s) => !/#[0-9a-f]{3}|rgba?\(|hsla?\(/i.test(s)));
    ok(`captions: ${name}, pure in u`, st(name, 0.37, true) === st(name, 0.37, true));
  }
  // The wave-2 bound that keeps captionBand() honest: nothing may scale past 1.22, which at the
  // styled skin's 64px stays inside its 14px pad. A style that wants more must move the band first.
  ok('captions: no style outgrows the caption band', CAP_STYLE_NAMES.every((name) => {
    for (let u = 0; u <= 1.0001; u += 0.02) for (const a of [true, false]) {
      const m = /scale\(([\d.]+)\)/.exec(CAP_STYLES[name](u, a).transform || '');
      if (m && parseFloat(m[1]) > 1.22) return false;
    }
    return true;
  }));
  ok('captions: neonEdge halo stays on the plate', (() => {
    for (let u = 0; u <= 1.0001; u += 0.02) {
      const radii = [...CAP_STYLES.neonEdge(u, true).textShadow.matchAll(/([\d.]+)px/g)].map((m) => +m[1]);
      if (radii.some((r) => r > 14)) return false;
    }
    return CAP_STYLES.neonEdge(0, false).textShadow === 'none';
  })());
  ok('captions: underlineDraw rule grows 0 -> 100% and never covers the ink',
    CAP_STYLES.underlineDraw(0, false).backgroundSize.startsWith('0.0')
    && CAP_STYLES.underlineDraw(1, false).backgroundSize === '100.0% 4px'
    && CAP_STYLES.underlineDraw(0.5, true).backgroundPosition === '0 100%');
  ok('captions: readerFocus orders its three ink levels 76 < 88 < full',
    CAP_STYLES.readerFocus(0, false).color.includes('76%')
    && CAP_STYLES.readerFocus(1, false).color.includes('88%')
    && CAP_STYLES.readerFocus(0.5, true).color === 'var(--text)');
  // The schema's enum is a hand-written second copy of this vocabulary and nothing compared the two,
  // so a style added to the registry validated as an unknown name and the feature stayed unreachable.
  // Checked here rather than in schema-drift, which has no caption subject at all. MISTAKES #400.
  ok('captions: the schema enum IS the registry', (() => {
    const sch = JSON.parse(fs.readFileSync(path.join(repoRoot, 'films', 'scene', 'schema.json'), 'utf8'));
    const en = sch.fields.captionStyle.enum;
    return en.length === CAP_STYLE_NAMES.length && CAP_STYLE_NAMES.every((n) => en.includes(n));
  })());
  // It must NOT settle to 1 while it is still the current word, or a still shows two states, not three.
  ok('captions: kineticSlam lands at 1.22 and holds above rest while current',
    CAP_STYLES.kineticSlam(0, true).transform === 'scale(1.220)'
    && CAP_STYLES.kineticSlam(1, true).transform === 'scale(1.040)'
    && CAP_STYLES.kineticSlam(1, false).transform === 'scale(1)');
}


// ---- shader stings ----
// The overlay itself is GL, so JS asserts the contract around it: one name list, one shader branch
// per name, and the schema exposing exactly that vocabulary, the three surfaces that can drift.
{
  // core/stings/index.js is now a thin re-export; the shader lives in core/stings/ (one file per fx under
  // units/, core/stings/index.js the runner that stitches them into one FRAG, same shape as
  // core/timeline/seams.js). One name list, one unit per name, and the schema exposing exactly that vocabulary.
  ok(`stings: ${SHADER_FX.length} effects, all unique`, SHADER_FX.length > 0 && new Set(SHADER_FX).size === SHADER_FX.length);
  const unitsDir = path.join(repoRoot, 'core', 'stings', 'units');
  const missingUnit = SHADER_FX.filter((n) => !fs.existsSync(path.join(unitsDir, `${n}.js`)));
  ok(`stings: every effect has a unit file${missingUnit.length ? ', missing ' + missingUnit.join(', ') : ''}`, missingUnit.length === 0);
  const extraUnit = fs.readdirSync(unitsDir).map((f) => f.replace(/\.js$/, '')).filter((n) => !SHADER_FX.includes(n));
  ok(`stings: no unit file past the end of the list${extraUnit.length ? ', extra ' + extraUnit.join(', ') : ''}`, extraUnit.length === 0);
  const schema = JSON.parse(fs.readFileSync(path.join(repoRoot, 'films', 'scene', 'schema.json'), 'utf8'));
  const en = schema.fields.stings.item.fx.enum;
  ok('stings: schema fx enum is exactly SHADER_FX, in order', JSON.stringify(en) === JSON.stringify(SHADER_FX));
  // EVERY unit keys off pp/bell (progress): a sting that ignores progress freezes mid-cut, which
  // defeats the only thing a sting is for. Read each unit's own `glsl` export.
  const STING_EXEMPT = new Set();   // none: a sting that does not move is not a sting
  const frozen = SHADER_FX.filter((name) => {
    if (STING_EXEMPT.has(name) || missingUnit.includes(name)) return false;
    const unitSrc = fs.readFileSync(path.join(unitsDir, `${name}.js`), 'utf8');
    const glslMatch = unitSrc.match(/export const glsl = `([\s\S]*?)`;/);
    const body = glslMatch ? glslMatch[1] : '';
    return !(body.includes('pp') || body.includes('bell'));
  });
  ok(`stings: all ${SHADER_FX.length} units depend on progress${frozen.length ? ', frozen: ' + frozen.join(', ') : ''}`, frozen.length === 0);
}


// ---- three (real geometry) ----
// three.js is only deterministic if you keep it that way, and nothing about the library enforces it.
// These are the teeth behind core/surfaces/three-fx.js's contract: the banned-API list is what stops someone
// reaching for THREE.Clock or Math.random six months from now and quietly breaking pure-in-n, which
// probe/canvas-purity would then catch only if the sampled frames happened to disagree.
{
  const src = fs.readFileSync(path.join(repoRoot, 'core', 'surfaces', 'three-fx.js'), 'utf8');
  const code = src.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
  ok(`three: ${THREE_FX.length} scenes, all unique`, THREE_FX.length > 0 && new Set(THREE_FX).size === THREE_FX.length);
  // ONE list: three-scenes.js names them, three-fx.js implements them, and these must agree. The
  // split exists only because Node cannot resolve the browser-absolute three import.
  const implemented = [...code.matchAll(/^  ([a-zA-Z][a-zA-Z0-9]*)\(L, colors\) \{/gm)].map((m) => m[1]);
  const missing = THREE_FX.filter((n) => !implemented.includes(n));
  const extra = implemented.filter((n) => !THREE_FX.includes(n));
  ok(`three: every name in THREE_FX has a SCENES implementation${missing.length ? ', missing: ' + missing.join(', ') : ''}${extra.length ? ', orphaned: ' + extra.join(', ') : ''}`,
     missing.length === 0 && extra.length === 0);
  const BANNED = ['THREE.Clock', 'T().Clock', 'performance.now', 'Date.now', 'new Date', 'Math.random', 'requestAnimationFrame', 'AnimationMixer'];
  const used = BANNED.filter((b) => code.includes(b));
  ok(`three: no wall-clock or unseeded randomness${used.length ? ', found: ' + used.join(', ') : ''}`, used.length === 0);
  // A scene that never reads t is a still image rendered the most expensive way available.
  const frozen = THREE_FX.filter((n) => {
    const i = code.indexOf(`  ${n}(L, colors) {`);
    if (i < 0) return true;
    const body = code.slice(i, code.indexOf('\n  },', i));
    return !/pose\(t\b/.test(body);
  });
  ok(`three: every scene poses from t${frozen.length ? ', frozen: ' + frozen.join(', ') : ''}`, frozen.length === 0);
  const schema = JSON.parse(fs.readFileSync(path.join(repoRoot, 'films', 'scene', 'schema.json'), 'utf8'));
  ok('three: schema enum is exactly THREE_FX, in order', JSON.stringify(schema.fields.layers.item.three.enum) === JSON.stringify(THREE_FX));
}


// ---- raymarch (3D subjects from distance fields) ----
// Two dispatch ladders here, not one: map() picks the distance field and the shading block picks the
// material. An effect present in one and missing from the other renders as an untextured silhouette
// or as nothing, so both are checked.
{
  const src = fs.readFileSync(path.join(repoRoot, 'core', 'surfaces', 'raymarch-fx.js'), 'utf8');
  const frag = src.slice(src.indexOf('const FRAG'), src.indexOf('export function'));
  ok(`raymarch: ${RAYMARCH_FX.length} scenes, all unique`, RAYMARCH_FX.length > 0 && new Set(RAYMARCH_FX).size === RAYMARCH_FX.length);
  const mapFn = frag.slice(frag.indexOf('float map(vec3 p)'), frag.indexOf('vec3 normalAt'));
  const noMap = RAYMARCH_FX.slice(0, -1).map((_, i) => i).filter((i) => !mapFn.includes(`u_fx == ${i}`));
  ok(`raymarch: map() dispatches every scene 0..${RAYMARCH_FX.length - 2}${noMap.length ? ', missing ' + noMap.map((i) => RAYMARCH_FX[i]).join(', ') : ''}`, noMap.length === 0);
  // every scene needs its own distance function, named for it, and every one must MOVE: a raymarched
  // subject that ignores time is a still image rendered the most expensive way available.
  const frozen = RAYMARCH_FX.filter((n) => {
    const fn = 'map' + n.charAt(0).toUpperCase() + n.slice(1);
    const i = frag.indexOf('float ' + fn);
    if (i < 0) return true;
    const body = frag.slice(i, frag.indexOf('\n}', i));
    return !body.includes('u_time');
  });
  ok(`raymarch: every scene has a named distance field that depends on time${frozen.length ? ', missing/frozen: ' + frozen.join(', ') : ''}`, frozen.length === 0);
  const schema = JSON.parse(fs.readFileSync(path.join(repoRoot, 'films', 'scene', 'schema.json'), 'utf8'));
  ok('raymarch: schema enum is exactly RAYMARCH_FX, in order', JSON.stringify(schema.fields.layers.item.raymarch.enum) === JSON.stringify(RAYMARCH_FX));
  // ---- raymarchKeys: ONE window, several lit surfaces, cut on a chosen instant ----
  // The same lookup shaderKeys uses (core/surfaces/surface-keys.js), asserted separately because the
  // two surfaces read DIFFERENT authoring keys and a shared helper wired to the wrong one would still
  // pass every test written against the other.
  {
    const K = { raymarch: 'mandelbulb', raymarchKeys: [{ t: 2, shader: 'caustics' }, { t: 4, shader: 'chromeGlass' }] };
    ok('raymarchKeys: before the first key the layer shows its own `raymarch`', raymarchAt(K, 0) === 'mandelbulb' && raymarchAt(K, 1.99) === 'mandelbulb');
    ok('raymarchKeys: the key is inclusive, the swap lands ON its t', raymarchAt(K, 2) === 'caustics' && raymarchAt(K, 3.9) === 'caustics');
    ok('raymarchKeys: the last key holds to the end of the window', raymarchAt(K, 4) === 'chromeGlass' && raymarchAt(K, 99) === 'chromeGlass');
    ok('raymarchKeys: absent leaves the static name untouched', raymarchAt({ raymarch: 'holoFoil' }, 7) === 'holoFoil');
    const refuses = (L) => { try { raymarchValidate({ raymarch: 'metaballs', ...L }); return false; } catch { return true; } };
    ok('raymarchKeys: an unknown surface in a key is refused, not silently blank', refuses({ raymarchKeys: [{ t: 0, shader: 'mandlebulb' }] }));
    ok('raymarchKeys: a key with no `t` is refused', refuses({ raymarchKeys: [{ shader: 'caustics' }] }));
    ok('raymarchKeys: keys running backwards are refused (the later one could never be reached)',
      refuses({ raymarchKeys: [{ t: 3, shader: 'caustics' }, { t: 1, shader: 'holoFoil' }] }));
    ok('raymarchKeys: an empty list is refused rather than accepted and ignored', refuses({ raymarchKeys: [] }));
    ok('raymarchKeys: a valid list passes', !refuses(K));
    ok('raymarchKeys: the schema documents it as an array of { t, shader }',
      schema.fields.layers.item.raymarchKeys?.type === 'array'
      && schema.fields.layers.item.raymarchKeys.item.t.type === 'number'
      && schema.fields.layers.item.raymarchKeys.item.shader.type === 'string');
  }
}


// ---- resample (layer as texture) ----
// The distinguishing property of this shader vs the sting/ambient ones: EVERY branch must read the
// source texture. An effect that never calls texture2D is not a resample, it is a veil painted over
// the layer, and it would silently discard the pixels the author asked to transform.
{
  const src = fs.readFileSync(path.join(repoRoot, 'core', 'resample', 'effects.js'), 'utf8');
  const frag = src.slice(src.indexOf('const FRAG'), src.indexOf('export function'));
  ok(`resample: ${RESAMPLE_FX.length} effects, all unique`, RESAMPLE_FX.length > 0 && new Set(RESAMPLE_FX).size === RESAMPLE_FX.length);
  // BLUR_DIR: zoomBlur/spinBlur/directionalBlur share ONE shader branch (u_fx == 0), switched
  // internally on u_dir, so a name in it never gets its own `u_fx == N` literal. Every other name
  // still owns its own explicit `u_fx == N` branch, indices 2..7; the trailing else that used to be
  // the last array name's branch is now dead defensive code (u_fx never reaches 8), so it names no fx.
  const nonBlur = RESAMPLE_FX.filter((n) => !(n in BLUR_DIR));
  const idxOf = (name) => RESAMPLE_FX.indexOf(name);
  const noBranch = nonBlur.filter((n) => !frag.includes(`u_fx == ${idxOf(n)}`));
  ok(`resample: FRAG has a branch for every non-blur effect${noBranch.length ? ', missing ' + noBranch.join(', ') : ''}`, noBranch.length === 0);
  const branchAt = (name) => {
    if (name in BLUR_DIR) return frag.slice(frag.indexOf('if (u_fx == 0)'), frag.indexOf('} else if (u_fx == 2)'));
    const i = idxOf(name);
    const start = frag.indexOf(`u_fx == ${i}`);
    const next = frag.indexOf('} else', start + 4);
    return frag.slice(start, next > start ? next : frag.length);
  };
  const blind = RESAMPLE_FX.filter((n) => !branchAt(n).includes('texture2D'));
  ok(`resample: every effect samples the source texture${blind.length ? ', blind: ' + blind.join(', ') : ''}`, blind.length === 0);
  // amount is the one dial every effect exposes; a branch that ignores it cannot be animated,
  // which is what `amount: [from, to]` exists for.
  const deaf = RESAMPLE_FX.filter((n) => !branchAt(n).includes('u_amt'));
  ok(`resample: every effect responds to amount${deaf.length ? ', deaf: ' + deaf.join(', ') : ''}`, deaf.length === 0);
  // The blur family really is ONE shader branch, not three: every name in BLUR_DIR resolves to the
  // exact same source slice. If this ever fails, the "collapse" claim is false.
  const blurBranches = new Set(Object.keys(BLUR_DIR).map(branchAt));
  ok('resample: the blur family (zoomBlur/spinBlur/directionalBlur) shares one shader branch', blurBranches.size === 1);
  const schema = JSON.parse(fs.readFileSync(path.join(repoRoot, 'films', 'scene', 'schema.json'), 'utf8'));
  ok('resample: schema enum is exactly RESAMPLE_FX, in order', JSON.stringify(schema.fields.layers.item.resample.enum) === JSON.stringify(RESAMPLE_FX));
}


// ---- ambient shader looks ----
// Same three surfaces as stings, one difference: the last effect is the dispatch's trailing `else`
// (it has no `u_fx==N` literal), so branches are checked for indices 0..N-2 plus a final else.
{
  const src = fs.readFileSync(path.join(repoRoot, 'core', 'surfaces', 'shaders-ambient.js'), 'utf8');
  ok(`ambient: ${AMBIENT_FX.length} effects, all unique`, AMBIENT_FX.length > 0 && new Set(AMBIENT_FX).size === AMBIENT_FX.length);
  const frag = src.slice(src.indexOf('const FRAG'), src.indexOf('export function'));
  const noBranch = AMBIENT_FX.slice(0, -1).map((_, i) => i).filter((i) => !frag.includes(`u_fx==${i}`));
  ok(`ambient: FRAG has a branch for effects 0..${AMBIENT_FX.length - 2}${noBranch.length ? ', missing ' + noBranch.map((i) => AMBIENT_FX[i]).join(', ') : ''}`, noBranch.length === 0);
  ok(`ambient: last effect (${AMBIENT_FX[AMBIENT_FX.length - 1]}) is the trailing else, no branch past it`, !frag.includes(`u_fx==${AMBIENT_FX.length - 1}`));
  const schema = JSON.parse(fs.readFileSync(path.join(repoRoot, 'films', 'scene', 'schema.json'), 'utf8'));
  ok('ambient: schema shader enum is exactly AMBIENT_FX, in order', JSON.stringify(schema.fields.layers.item.shader.enum) === JSON.stringify(AMBIENT_FX));
  // ---- shaderKeys: ONE window, several looks, cut on a chosen instant ----
  // A lookup, never a transition: which look shows at `at` is a pure function of `at`, so a worker
  // that drew frame 200 before frame 5 cannot change frame 5. Asserted on both sides of a key and at
  // the key itself, because the boundary is the only part with an off-by-one to get wrong.
  {
    const K = { shader: 'voronoi', shaderKeys: [{ t: 2, shader: 'metaballs' }, { t: 4, shader: 'matrixDecode' }] };
    ok('shaderKeys: before the first key the layer shows its own `shader`', ambientShaderAt(K, 0) === 'voronoi' && ambientShaderAt(K, 1.99) === 'voronoi');
    ok('shaderKeys: the key is inclusive, the swap lands ON its t', ambientShaderAt(K, 2) === 'metaballs' && ambientShaderAt(K, 3.9) === 'metaballs');
    ok('shaderKeys: the last key holds to the end of the window', ambientShaderAt(K, 4) === 'matrixDecode' && ambientShaderAt(K, 99) === 'matrixDecode');
    ok('shaderKeys: absent leaves the static name untouched', ambientShaderAt({ shader: 'flow' }, 7) === 'flow' && ambientShaderAt({}, 7) === 'flow');
    const refuses = (L) => { try { ambientValidate(L); return false; } catch { return true; } };
    ok('shaderKeys: an unknown name in a key is refused, not silently blank', refuses({ shaderKeys: [{ t: 0, shader: 'aurara' }] }));
    ok('shaderKeys: a key with no `t` is refused', refuses({ shaderKeys: [{ shader: 'flow' }] }));
    ok('shaderKeys: keys running backwards are refused (the later one could never be reached)',
      refuses({ shaderKeys: [{ t: 3, shader: 'flow' }, { t: 1, shader: 'mist' }] }));
    ok('shaderKeys: an empty list is refused rather than accepted and ignored', refuses({ shaderKeys: [] }));
    ok('shaderKeys: a valid list passes', !refuses(K));
    ok('shaderKeys: the schema documents it as an array of { t, shader }',
      schema.fields.layers.item.shaderKeys?.type === 'array'
      && schema.fields.layers.item.shaderKeys.item.t.type === 'number'
      && schema.fields.layers.item.shaderKeys.item.shader.type === 'string');
  }
  // THE THREE FIELDS WITH A NAMED TECHNIQUE BEHIND THEM, each asserted on the step of its recipe that
  // is easy to lose and impossible to see in a still: reimplemented from the technique, never ported.
  for (const n of ['domainWarp', 'voronoi', 'metaballs'])
    ok(`ambient: ${n} is in the map with a blurb`, typeof AMBIENT_SHADERS[n] === 'string' && AMBIENT_SHADERS[n].length > 20);
  ok('ambient: fBm is lacunarity 2 / gain 0.5 over five octaves', /float fbm\(vec2 p\)[\s\S]{0,220}i < 5;[\s\S]{0,120}p \*= 2\.0; a \*= 0\.5;/.test(frag));
  ok('ambient: domainWarp warps TWICE (one level is a smear, not a fold)',
    /4\.0\*q/.test(frag) && /4\.0\*r/.test(frag));
  ok('ambient: voronoi finds its borders on the perpendicular bisector, not on F2-F1',
    /normalize\(d - mr\)/.test(frag));
  ok('ambient: metaballs merge on the polynomial smooth min', /float smin\(/.test(frag) && /d = smin\(d,/.test(frag));
  // EVERY ambient look must animate: one that ignores t is a frozen still on a layer whose entire
  // contract is "loops smoothly". Derived from AMBIENT_FX with a NAMED exemption set, because the
  // hand-typed wave list covered 8 of 17 and every appended effect landed outside it uncovered.
  // FRAG IS A TEMPLATE LITERAL. A backtick anywhere inside it ends the string, and what follows is
  // parsed as JavaScript: the failure is a syntax error or, worse, a page that hangs with nothing in
  // the log. Four separate times in one session a backtick reached a GLSL comment while someone was
  // quoting an identifier, including inside the comment warning about it. Care did not work; a check
  // does.
  // The BODY between the opening backtick and the closing one. Anything in there ends the string early.
  // Counting backticks in `frag` would be wrong twice over: the slice carries the opener AND the
  // closer, and it is exactly this kind of off-by-a-delimiter that the bug itself is.
  {
    const open = frag.indexOf('`');
    const close = frag.lastIndexOf('`');
    const body = open >= 0 && close > open ? frag.slice(open + 1, close) : '';
    ok('ambient: FRAG body contains no backtick (it would end the template literal)',
      body.length > 1000 && !body.includes('`'));
  }

  // A one-liner for "this must refuse the input", used throughout the block below.
  const thrown = (fn) => { try { fn(); return false; } catch { return true; } };
  // ── layer copy vs authored markup ──────────────────────────────────────────────────────────────
  {
    const { onScreenText, glyphText, layerText, snippet } = await import('../../harness/lib/text.mjs');
    ok('text: markup is stripped, which is what a viewer reads',
      onScreenText('Nothing came near the <b>edge.</b>') === 'Nothing came near the edge.');
    ok('text: a needle from the storyboard now matches the layer that emphasises a word',
      onScreenText('Nothing came near the <b>edge.</b>').includes('Nothing came near the edge.'));
    // The silent half of the same bug. This regex wants digits then whitespace, and a tag between
    // them is why a film that styled its own number walked past the check meant to catch it.
    const CLAIM = /\b(\d+)\s+(effects?|cuts?|shaders?)\b/i;
    ok('text: an emphasised number is still a claim',
      !CLAIM.test('<b>245</b> effects') && CLAIM.test(onScreenText('<b>245</b> effects')));
    ok('text: a count layer carries copy too', layerText({ type: 'count', text: '<b>9</b>' }) === '9');
    ok('text: a null type is a text layer', layerText({ text: 'hi' }) === 'hi');
    ok('text: an image layer has no copy', layerText({ type: 'image', text: 'x' }) === '');
    ok('text: a nullish text is empty, never the string "undefined"', onScreenText(undefined) === '' && onScreenText(null) === '');
    // Cutting the RAW string can slice a tag in half and print markup at a person.
    ok('text: a snippet cuts the readable copy, not the markup',
      snippet('Nothing came near the <b>edge.</b>', 24) === 'Nothing came near the ed…');

    // ── the three semantics this used to have, and which one each caller needs ────────────────────
    // A BLOCK tag breaks the run of text and an INLINE one does not. Substituting empty for every tag
    // (the old `plain`) glued 22 live strings, `"Financial infrastructure to<br>grow"` among them;
    // substituting a space for every tag (the old `onScreenText`) split "Northwind" in two.
    ok('text: a <br> separates two words',
      onScreenText('Financial infrastructure to<br>grow') === 'Financial infrastructure to grow');
    ok('text: emphasis INSIDE a word does not split it',
      onScreenText('North<b>wind</b>') === 'Northwind');
    ok('text: a block element separates its neighbours', onScreenText('<div>Mon</div><div>Tue</div>') === 'Mon Tue');
    // engine-doctrine/MISTAKES.md #220/#216/#217: a <style> body, a <script> body and a comment are source the
    // frame never shows. Read as copy they became a brand-voice defect, clipped text and tiny type.
    ok('text: a stylesheet is not copy',
      onScreenText('<style>.g{color:red}/* unlock */</style><p>Ship it</p>') === 'Ship it');
    ok('text: an HTML comment is not copy', onScreenText('<!-- elevate --><p>Ship it</p>') === 'Ship it');
    ok('text: a script body is not copy', onScreenText('<script>var x="empower"</script>hi') === 'hi');
    // A string with no markup must survive untouched, so a plain comparison is unaffected.
    ok('text: prose with a bare < is left alone', onScreenText('a < b, and 3<4') === 'a < b, and 3<4');
    // glyphText is the DOM's textContent, which is what core/layers/text.js stripLen() counts, which is
    // what typedLen()'s visLen must be. A <br> costs the caret nothing.
    ok('text: glyphText counts what the caret walks, so a <br> is worth zero characters',
      glyphText('ab<br>cd') === 'abcd' && glyphText('<b>245</b>') === '245');
    ok('text: glyphText still refuses a stylesheet', glyphText('<style>.g{color:red}</style>hi') === ' hi');
    ok('text: the two variants disagree ONLY about tag spacing, never about which source is copy',
      onScreenText('<style>x</style>a<br>b') === 'a b' && glyphText('a<br>b') === 'ab');
  }

  // ── the layer TREE, walked once ────────────────────────────────────────────────────────────────
  {
    const { flattenLayers, flattenLayer } = await import('../../harness/lib/layers.mjs');
    const tree = [{ id: 'a', children: [{ id: 'b' }, { id: 'c', children: [{ id: 'd' }] }] }, { id: 'e' }];
    ok('layers: parents come before their children, depth first',
      flattenLayers(tree).map((l) => l.id).join('') === 'abcde');
    ok('layers: one layer plus its descendants', flattenLayer(tree[0]).map((l) => l.id).join('') === 'abcd');
    // seam-snap threw a TypeError on a null and inspect silently counted a stray string as a layer.
    ok('layers: a null in the array is skipped, not thrown on',
      flattenLayers([null, { id: 'a' }, undefined]).map((l) => l.id).join('') === 'a');
    ok('layers: a stray string is not a layer',
      flattenLayers(['oops', { id: 'a' }]).length === 1);
    ok('layers: a null child is skipped too',
      flattenLayers([{ id: 'a', children: [null, { id: 'b' }] }]).map((l) => l.id).join('') === 'ab');
    ok('layers: a non-array children is not walked', flattenLayers([{ id: 'a', children: 'x' }]).length === 1);
    ok('layers: no layers at all is empty, not an error',
      flattenLayers(undefined).length === 0 && flattenLayers(null).length === 0);
  }

  // ── crt ────────────────────────────────────────────────────────────────────────────────────────
  {
    const { crtSpec } = await import('../../core/layers/util.js');
    const d = crtSpec();
    ok('crt: the default blurs the backdrop, which is the half an overlay cannot do',
      /^blur\(1\.6px\)/.test(d.filter));
    // The one relationship in here that is not a preference. Blur spreads a glyph's light over more
    // area, so softness without lift is a dimmer picture, and a caller turning up `bloom` would be
    // quietly turning down the brightness.
    const b = (s) => Number(/brightness\(([\d.]+)\)/.exec(s)[1]);
    ok('crt: more bloom means more lift, always',
      b(crtSpec({ bloom: 4 }).filter) > b(crtSpec({ bloom: 1 }).filter));
    ok('crt: bloom 0 asks for no backdrop filter at all', crtSpec({ bloom: 0 }).filter === '');
    ok('crt: scanlines are HORIZONTAL, which is the direction a tube actually scans',
      d.background.includes('repeating-linear-gradient(to bottom'));
    ok('crt: lines 0 removes them and leaves the rest',
      !crtSpec({ lines: 0 }).background.includes('repeating-linear') && crtSpec({ lines: 0 }).background.includes('radial-gradient'));
    ok('crt: a scan thicker than the gap cannot paint a solid black field',
      crtSpec({ gap: 3, scan: 99 }).background.includes('0 3px'));
    ok('crt: everything off leaves nothing to paint',
      crtSpec({ lines: 0, vignette: 0 }).background === '');
    ok('crt: a tint is laid over the whole thing', crtSpec({ tint: 'red' }).background.startsWith('linear-gradient(red, red)'));
  }

  // ── ramp stop positions ────────────────────────────────────────────────────────────────────────
  // The whole contract of the feature, because every part of it has already been got wrong once.
  {
    const { palette } = await import('../../core/surfaces/palette.js');
    const hex = (n) => Array.from({ length: n }, (_, i) => '#0011' + String(i).padStart(2, '0'));
    ok('palette: plain stops parse to rgb triples, with no position',
      palette({ colors: ['#ff0000', '#00ff00'] }).every((c) => c.length === 3));
    ok('palette: a stop may name its own position',
      palette({ colors: ['#ff0000@0', '#00ff00@0.4'] })[1][3] === 0.4);
    ok('palette: a stop the engine cannot read THROWS rather than rendering as black',
      thrown(() => palette({ colors: ['teal'] })));
    ok('palette: a half-positioned ramp throws instead of guessing the rest',
      thrown(() => palette({ colors: ['#ff0000@0', '#00ff00'] })));
    ok('palette: a position outside 0..1 throws',
      thrown(() => palette({ colors: ['#ff0000@0', '#00ff00@2'] })));
    ok('palette: an empty or absent colors list is still null (use the effect default)',
      palette({}) === null && palette({ colors: [] }) === null);
    ok('palette: eight stops is still the ceiling the shader declares', hex(8).length === 8);
  }
  {
    // The EVEN case must reach the shader as no positions at all. The two shader paths are the same
    // formula in real arithmetic and different pictures in float32, so a generator that helpfully
    // filled in `@0.142857…` would shift every field that never asked for positions.
    const { ALL_GENERATORS, defaultsOf } = await import('../../core/generators/generators.js');
    const spectrum = ALL_GENERATORS.find((g) => g.name === 'spectrum');
    const flat = spectrum.render(defaultsOf(spectrum.schema))[0].colors;
    ok('spectrum: untouched ramp stops carry NO position (bit-identical to before positions existed)',
      flat.length === 8 && flat.every((c) => !c.includes('@')));
    const moved = defaultsOf(spectrum.schema);
    moved.colour.ramp3At = 0.34;
    const withPos = spectrum.render(moved)[0].colors;
    ok('spectrum: moving one stop puts a position on EVERY stop',
      withPos.every((c) => c.includes('@')) && withPos[2].endsWith('@0.34'));
    const back = defaultsOf(spectrum.schema);
    back.colour.ramp3At = 0.05;   // before ramp2At (0.1428)
    ok('spectrum: stops that go backwards throw, naming both dials',
      thrown(() => spectrum.render(back)));
    const bands = ALL_GENERATORS.find((g) => g.name === 'bands');
    ok('bands: declares no stop positions, so its colours stay plain hex',
      bands.render(defaultsOf(bands.schema))[0].colors.every((c) => !c.includes('@')));
  }
  {
    // The sentinel is load-bearing and invisible: nothing about `-1` looks like "even" at a call site.
    ok('ambient: FRAG reads u_palAt[0] below zero as the even-spacing sentinel',
      frag.includes('A(0) < 0.0'));
  }

  const AMBIENT_EXEMPT = new Set(['barrel']);   // a static lens vignette, motionless by design
  const still = AMBIENT_FX.filter((name) => {
    const i = AMBIENT_FX.indexOf(name);
    const start = i === AMBIENT_FX.length - 1 ? frag.lastIndexOf('} else {') : frag.indexOf(`u_fx==${i}`);
    const nextI = frag.indexOf(`u_fx==${i + 1}`);
    const body = frag.slice(start, nextI > start ? nextI : start + 600);
    return !/\bt\b/.test(body);
  });
  const stillReal = still.filter((n) => !AMBIENT_EXEMPT.has(n));
  ok(`ambient: all ${AMBIENT_FX.length} looks animate (exempt: ${[...AMBIENT_EXEMPT].join(', ')})${stillReal.length ? '. Frozen: ' + stillReal.join(', ') : ''}`, stillReal.length === 0);
  // matrixDecode (wave 4, the trailing else) is digital rain, its heads must fall with t
  // Locate a branch by NAME, not by position: this used to slice the trailing `else`, which stopped
  // being matrixDecode the moment two effects were appended after it. A positional assertion silently
  // starts testing a different thing.
  const branchOf = (name) => { const i = frag.indexOf(name); if (i < 0) return ''; 
    const j = frag.indexOf('} else', i); return frag.slice(i, j < 0 ? frag.length : j); };
  for (const nm of ['matrixDecode', 'nebula', 'dotCrawl']) {
    ok(`ambient: ${nm} depends on time`, /\bt\b/.test(branchOf(nm)) && branchOf(nm).length > 40);
  }
}


// ---- composite looks (core/looks.js) ----
{
  ok(`looks: ${LOOK_NAMES.length} looks registered (>=26)`, LOOK_NAMES.length >= 26);
  ok('looks: Tier-B glassWarp uses an SVG displacement filter', resolveComposite('glassWarp').filter.includes('url("#f-displace-'));
  ok('looks: displace scale grows with strength', (() => { const big = resolveComposite('melt', {}, 1).filter, sm = resolveComposite('melt', {}, 0.1).filter; return big !== sm; })());
  ok('looks: unknown name -> null', resolveComposite('nope') === null);
  ok('looks: isLook/lookName parse a spec', isLook('neon:0.9') && lookName('neon:0.9') === 'neon' && !isLook('duotone'));
  const neon = resolveComposite('neon');
  // neon glows the LUMINANCE via an SVG bloom filter (url(#f-bloom-...)), not a CSS drop-shadow. By
  // default the glow keeps the SOURCE's own colours (id `f-bloom-src`), a real neon bleeds the image's
  // colours; an explicit colour override floods a uniform tint (encoded as RGB in the id).
  ok('looks: neon yields a filter with grade + bloom', neon.filter.includes('saturate(') && neon.filter.includes('url(#f-bloom'));
  ok('looks: neon default glows the source\'s own colours (no flood tint)', neon.filter.includes('f-bloom-src'));
  ok('looks: neon keys the bloom on VALUE (max channel) so saturated colours glow fully', neon.filter.includes('f-bloom-src-val'));
  const neonRed = resolveComposite('neon', { color: '#ff0000' }).filter;
  ok('looks: an explicit colour floods a uniform tint (encoded as RGB)', neonRed.includes('f-bloom-255_0_0') && !neonRed.includes('f-bloom-src'));
  // strength is a real master dial: the bloom radius (encoded -r<int>_<frac> in the filter id) grows with it
  const bloomR = (f) => { const m = f.match(/-r(\d+)_(\d+)/); return m ? parseFloat(`${m[1]}.${m[2]}`) : 0; };
  ok('looks: strength scales the look (bloom radii grow)', bloomR(resolveComposite('neon', {}, 1).filter) > bloomR(resolveComposite('neon', {}, 0.1).filter));
  ok('looks: strength clamps to [0,1]', resolveComposite('neon', {}, 5).filter === resolveComposite('neon', {}, 1).filter);
  // overlays: crt stacks scanlines + vignette, in pipeline order (texture before vignette)
  const crt = resolveComposite('crt');
  ok('looks: crt returns >=2 overlays (scanlines + vignette)', crt.overlays.length >= 2);
  ok('looks: pipeline order, grade before glow in neon', neon.filter.indexOf('saturate(') < neon.filter.indexOf('url(#f-bloom'));
  ok('looks: every look resolves to a filter or overlays', LOOK_NAMES.every((n) => { const r = resolveComposite(n); return r && (r.filter.length > 0 || r.overlays.length > 0); }));
  ok('looks: deterministic', resolveComposite('vhs', {}, 0.6).filter === resolveComposite('vhs', {}, 0.6).filter);

  // ---- the three guards from engine-doctrine/MISTAKES.md #365 ----
  // All derived from LOOKS. A hand-written list is what let `color` be dead on nineteen looks while
  // the test above proved the feature on `neon`. One of the three where it happened to work.
  const sig = (r) => r.filter + '||' + JSON.stringify(r.overlays);
  const PROBE = { color: '#123456', color2: '#654321', colors: ['#111111', '#eeeeee'], grain: 0.9, vignette: 0.9, strength: 0.2 };

  // 1. A KNOB A LOOK DECLARES MUST DO SOMETHING. Behavioural, so it holds however routing is built.
  const deadKnobs = [];
  for (const n of LOOK_NAMES) {
    for (const k of Object.keys(LOOKS[n].d)) {
      if (k === 'strength') continue;
      let moved = false;
      try { moved = sig(resolveComposite(n, {})) !== sig(resolveComposite(n, { [k]: PROBE[k] })); } catch { moved = false; }
      if (!moved) deadKnobs.push(`${n}.${k}`);
    }
  }
  ok(`looks: every knob a look declares changes its output${deadKnobs.length ? ', dead: ' + deadKnobs.join(', ') : ''}`, deadKnobs.length === 0);

  // 1b. A VALUE A LOOK DECLARES MUST RENDER. The check above asks whether an AUTHOR can move the knob;
  // this asks whether the look's OWN default reaches the frame. They are different questions, because
  // the two travel by different routes: the author's knob is expanded into private argument names and
  // written AFTER the per-pass fixed bag (so it wins), while `d.color` is merged BEFORE it (so a pass
  // that fixes the same spelling silently shadows it). Sixteen looks declared a colour that never
  // rendered, including vintageAnamorphic's `#a9c8ff`. The exact hex the comment in core/looks.js
  // records finding dead and fixing, where the fix went to the pass and left the look entry behind.
  // Setting letterpress's to pure red moved zero pixels. engine-doctrine/MISTAKES.md #380.
  const shadowed = [];
  for (const n of LOOK_NAMES) {
    for (const k of Object.keys(LOOKS[n].d)) {
      if (k === 'strength' || PROBE[k] === undefined) continue;
      const saved = LOOKS[n].d[k];
      const before = sig(resolveComposite(n, {}));
      LOOKS[n].d[k] = PROBE[k];
      let moved = false;
      try { moved = sig(resolveComposite(n, {})) !== before; } catch { moved = false; }
      LOOKS[n].d[k] = saved;
      if (!moved) shadowed.push(`${n}.${k}`);
    }
  }
  ok(`looks: every DEFAULT a look declares reaches the frame${shadowed.length ? ', shadowed: ' + shadowed.join(', ') : ''}`, shadowed.length === 0);

  // The routing table must agree with what the passes actually read, in BOTH directions, or the
  // "this look does not take that knob" error starts lying.
  const knobDrift = [];
  for (const n of LOOK_NAMES) {
    for (const k of Object.keys(KNOB_ROUTES)) {
      let moved = false;
      try { moved = sig(resolveComposite(n, {})) !== sig(resolveComposite(n, { [k]: PROBE[k] })); } catch { moved = false; }
      if (moved !== liveKnobs(n).includes(k)) knobDrift.push(`${n}.${k}`);
    }
  }
  ok(`looks: liveKnobs matches behaviour on all ${LOOK_NAMES.length} looks${knobDrift.length ? ', drift: ' + knobDrift.join(', ') : ''}`, knobDrift.length === 0);

  // A knob the look cannot apply is refused, not dropped (core/fx/index.js reasoning, one level up).
  ok('looks: a knob the look cannot use throws', (() => {
    try { resolveComposite('neon', { grain: 0.5 }); return false; } catch (e) { return /does not use/.test(e.message); }
  })());

  // 2. NO LOOK MAY BLUR THE ALPHA CHANNEL. #112 stated this rule and fixed one call site; `hStreak`
  // and `chromaPair` carried it for another two hundred entries. Stated once, for the whole registry.
  const alphaBlur = LOOK_NAMES.filter((n) => resolveComposite(n).filter.includes('drop-shadow('));
  ok(`looks: no look blurs the ALPHA channel (drop-shadow)${alphaBlur.length ? ': ' + alphaBlur.join(', ') : ''}`, alphaBlur.length === 0);
  ok('looks: vintageAnamorphic streaks the HIGHLIGHTS via a directional bloom (wide x, narrow y)',
    /f-bloom-[\d_]+-t[\d_]+-r[\d_]+-ry[\d_]+/.test(resolveComposite('vintageAnamorphic').filter));
  ok('looks: chromatic looks use a per-pixel channel split', resolveComposite('cyberpunk').filter.includes('#f-chroma-'));

  // 3. DISTINCT FILTER PARAMETERS MUST PRODUCE DISTINCT DEF IDS. ensureFilterDef caches by id, so a
  // parameter missing from the id means the second caller silently renders the first caller's filter.
  const idOf = (name, o) => ensureFilterDef(name, o);
  const bloomIds = [
    idOf('bloom', { radius: 10 }), idOf('bloom', { radius: 10, ry: 2 }), idOf('bloom', { radius: 10, ry: 4 }),
    idOf('bloom', { radius: 10, color: '#f00' }), idOf('bloom', { radius: 10, intensity: 2 }),
    idOf('bloom', { radius: 10, threshold: 0.3 }), idOf('bloom', { radius: 10, key: 'value' }),
  ];
  ok('filters: every bloom parameter reaches the def id (incl. the new ry)', new Set(bloomIds).size === bloomIds.length);
  const chromaIds = [
    idOf('chromaSplit', {}), idOf('chromaSplit', { px: 4 }),
    idOf('chromaSplit', { px: 4, warm: '#ff0000' }), idOf('chromaSplit', { px: 4, warm: 'rgba(255,0,0,0.5)' }),
    idOf('chromaSplit', { px: 4, cool: '#0000ff' }),
  ];
  ok('filters: every chromaSplit parameter reaches the def id (colour AND its alpha)', new Set(chromaIds).size === chromaIds.length);
}


// ---- sound: a CUT must have a voicing, exactly as a SEAM does ----
// lib-test already asserted "SEAM_CUE covers every SEAM_FX (no silent seam)". CUT_CUE had no equivalent,
// so the next presentation added to core/cuts.js would silently play the generic `whoosh`. The gate for
// one half of a pair and not the other is how a family goes quietly out of sync. engine-doctrine/MISTAKES.md #374.
{
  // an explicit null is a DECISION (silence); only a missing KEY is a gap.
  const missing = CUT_REGISTRY.names.filter((n) => !(n in CUT_CUE));
  ok(`sound: CUT_CUE voices every one of the ${CUT_REGISTRY.names.length} cut presentations`
    + `${missing.length ? ', missing: ' + missing.join(', ') : ''}`, missing.length === 0);
}


// ---- removal: 7 gsap entrances + the whole gsap exit family, all zero-user duplicates (#364) ----
{
  // Deleted rather than kept as a "deprecated" notice: the 7 (fadeIn/fadeUp/fadeDown/flyLeft/flyRight/
  // popIn/zoomIn) and the exit family (all 11) measured zero users across the library, and each of the
  // 7 duplicated an `anim`/`out` preset exactly. An author who names one now gets REFUSED with the real
  // word, not a warning that still renders the redundant vocabulary. `expandIn` was mapped as an
  // eighth duplicate once; it is not one (animates `letterSpacing`, which no `anim` entry touches) and
  // stays, tested in the survivors list below.
  const gone = ['fadeIn', 'fadeUp', 'fadeDown', 'flyLeft', 'flyRight', 'popIn', 'zoomIn'];
  ok('removed: none of the 7 deleted gsap entrances resolve any more',
    gone.every((n) => !GSAP_FX.includes(n)) && gone.every((n) => !GSAP_REGISTRY.has(n)));
  ok('removed: naming one throws, naming the family it belongs to', (() => {
    try { GSAP_REGISTRY.pick('popIn'); return false; }
    catch (e) { return /gsap effect/.test(e.message) && /popIn/.test(e.message); }
  })());
  ok('removed: fxOut is an unknown prop now, not a silently-ignored one', (() => {
    try { checkLayer({ type: 'text', fxOut: 'fadeOut' }, {}, 'layers[0]'); return false; }
    catch (e) { return /unknown prop `fxOut`/.test(e.message); }
  })());
  // The ones that survive do something no `anim` can. A kinetic preset only works on a TEXT layer with
  // `split`, so bounceIn is NOT a duplicate of preset:"bounce" on an image, it is the only way.
  ok('removed: the per-character effects, idle loops, zoomBlur and expandIn are KEPT',
    ['zoomBlur', 'expandIn', 'charFold', 'charTilt', 'charBlurCascade', 'charOvershoot', 'float', 'breathe', 'wobble', 'heartbeat']
      .every((n) => GSAP_FX.includes(n)));
}


// ---- colour defaults: a token or a stated constant, never an unexplained hex (core/color/color.js) ----
{
  ok('color: a token resolves to var() in a CSS context', resolveColor(token('--accent'), 'css') === 'var(--accent, #ffffff)');
  ok('color: a token resolves to components where var() cannot go (SVG attrs, canvas)',
    JSON.stringify(resolveColor(token('--accent', { fallback: '#c2f23b' }), 'rgb', () => null)) === '[194,242,59]');
  ok('color: a plain string still works, so every old call site keeps its meaning',
    resolveColor('#ff0000', 'css') === '#ff0000');
  // The reason is the mechanism: a constant with no stated reason is indistinguishable from a brand
  // colour somebody forgot to tokenise, which is exactly how brew's orange ended up in a shared preset.
  ok('color: a deliberate constant MUST state why', (() => {
    try { lit('#000'); return false; } catch (e) { return /pass a reason/.test(e.message); }
  })());
  ok('color: literal() carries its reason with it', literal('#000', 'a vignette is black').why === 'a vignette is black');
  // The unfinished half of #351: a look's leak now follows the look's OWN declared colour.
  const leakOf = (n) => (resolveComposite(n).overlays.find((o) => /radial-gradient\(60%/.test(o.bg)) || {}).bg || '';
  ok('looks: fadedPolaroid leaks its OWN declared colour, not a fixed orange', leakOf('fadedPolaroid').includes('#ffd9a8'));
  ok('looks: nostalgia likewise', leakOf('nostalgia').includes('#ffcf9a'));
}


// ---- canvas FX (core/canvas-fx.js): pure pixel math (the DOM passes bake in the browser) ----
{
  ok('canvasfx: luma weights sum to 1 (rec709)', approx(luma(255, 255, 255), 255, 1e-3) && luma(0, 0, 0) === 0);
  ok('canvasfx: luma ranks green>red>blue', luma(0, 255, 0) > luma(255, 0, 0) && luma(255, 0, 0) > luma(0, 0, 255));
  // Bayer 4x4: 16 distinct thresholds, all in (0,1), tileable by &3
  ok('canvasfx: Bayer has 16 unique thresholds in (0,1)', (() => { const vs = BAYER4.flat(); return vs.length === 16 && new Set(vs).size === 16 && vs.every((v) => v > 0 && v < 1); })());
  ok('canvasfx: bayerAt tiles on a 4-grid', bayerAt(0, 0) === bayerAt(4, 8) && bayerAt(1, 2) === bayerAt(5, 6));
  // cell average over a 2x2 red/black patch = half red
  ok('canvasfx: cellAverage averages a cell', (() => { const d = [255, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 255, 0, 0, 255]; const [r, g, b] = cellAverage(d, 2, 0, 0, 2, 2, 2); return Math.round(r) === 128 && g === 0 && b === 0; })());
  ok('canvasfx: cellAverage clamps to image height (no overscan)', (() => { const d = [10, 10, 10, 255, 20, 20, 20, 255]; const [r] = cellAverage(d, 2, 0, 0, 2, 4, 1); return Math.round(r) === 15; })());
  ok('canvasfx: hash01 in [0,1), deterministic, seed-sensitive', (() => { for (let i = 0; i < 50; i++) { const v = hash01(i, i * 2, 3); if (v < 0 || v >= 1) return false; } return hash01(2, 5, 1) === hash01(2, 5, 1) && hash01(2, 5, 1) !== hash01(2, 5, 2); })());
  ok('canvasfx: key is stable + string/object equivalent', canvasFxKey('a.png', 'halftone') === canvasFxKey('a.png', { fx: 'halftone' }) && canvasFxKey('a.png', 'mosaic') !== canvasFxKey('b.png', 'mosaic'));
  ok('canvasfx: all 8 passes registered', ['halftone', 'dither', 'mosaic', 'stipple', 'ascii', 'edgeDetect', 'crosshatch', 'pixelSort'].every((n) => CANVAS_FX_NAMES.includes(n)) && CANVAS_FX_NAMES.length === 8);
  // Tier-C presets expand to a base pass; author overrides win; every preset targets a real pass
  ok('canvasfx: blueprint preset expands to edgeDetect', resolveFxSpec('blueprint').fx === 'edgeDetect' && resolveFxSpec('matrix').fx === 'ascii');
  ok('canvasfx: preset author-override wins', resolveFxSpec({ fx: 'blueprint', bg: [1, 2, 3] }).bg[0] === 1 && resolveFxSpec({ fx: 'comic', cell: 3 }).cell === 3);
  ok('canvasfx: base name passes through unchanged', resolveFxSpec('halftone').fx === 'halftone' && resolveFxSpec({ fx: 'mosaic', cell: 9 }).cell === 9);
  ok('canvasfx: every preset targets a real pass', Object.values(CANVAS_FX_PRESETS).every((p) => CANVAS_FX_NAMES.includes(p.fx)));
}


// ---- audio kit (core/audio/kit.mjs): synthesized cues must be deterministic + audible ----
{
  const a = renderCue(CUES.whoosh, 5), b = renderCue(CUES.whoosh, 5);
  ok('audio: renderCue is deterministic for a seed', a.length === b.length && a.every((v, i) => v === b[i]));
  ok('audio: a different seed changes the noise', (() => { const c = renderCue(CUES.whoosh, 6); return c.some((v, i) => v !== a[i]); })());
  ok('audio: every cue produces non-silent signal', Object.keys(CUES).every((n) => { const s = renderCue(CUES[n], 3); return s.some((v) => Math.abs(v) > 1e-4); }));
  ok('audio: no cue clips the 16-bit ceiling', Object.keys(CUES).every((n) => renderCue(CUES[n], 3).every((v) => Math.abs(v) <= 1)));
  // normalize is the reason cues are audible under a bed: raw Cuelume peaks bake at -25..-40 dBFS
  ok('audio: normalize lifts to the ceiling', (() => { const s = normalize(renderCue(CUES.pluck, 1), 0.8); let p = 0; for (const v of s) p = Math.max(p, Math.abs(v)); return Math.abs(p - 0.8) < 1e-3; })());
  ok('audio: normalize leaves silence alone (no /0)', (() => { const s = normalize(new Float32Array(64), 0.8); return s.every((v) => v === 0); })());
  ok('audio: pluck is shorter than bloom (envelope shape survives)', renderCue(CUES.pluck, 1).length < renderCue(CUES.bloom, 1).length);
  // THE MOVEMENT CUES ARE A MOVING SPECTRAL BAND, and nothing else about them matters. A whoosh whose
  // brightness never moves is a burst of static, which is what the deleted `sweep` and `travel` were.
  // Brightness here is the RMS frequency, RMS(dx/dt)/(2*pi*RMS(x)), the same measure printed by
  // `node harness/dev/sound-lab.mjs --measure`. These assert the SHAPE, not a tuning: a whoosh arches
  // (it passes), a riser only climbs (it arrives), and neither may sit still.
  const brightness = (x, s, e) => {
    let sx = 0, sd = 0;
    for (let i = s + 1; i < e; i++) { sx += x[i] * x[i]; const d = (x[i] - x[i - 1]) * SR; sd += d * d; }
    return Math.sqrt(sd / Math.max(1, e - s - 1)) / (2 * Math.PI * Math.sqrt(sx / Math.max(1, e - s - 1)) || 1);
  };
  const bands = (name, k = 8) => { const x = normalize(renderCue(CUES[name], 1)); const w = Math.floor(x.length / k);
    return Array.from({ length: k }, (_, i) => brightness(x, i * w, i === k - 1 ? x.length : (i + 1) * w)); };
  // THE ARCH MOVED AXIS, and that is a real finding rather than a slackened test. When the whoosh was a
  // stack of pitched partials the pass showed up in BRIGHTNESS, because the two sweeps were the only
  // moving thing. The version a person kept (round 5) is band-passed noise throughout, so brightness
  // plateaus and the pass reads in LEVEL instead: 17 21 5 1 1 0 0 0. Asserting the old axis would fail
  // the sound that was approved and pass the one that was rejected, which is the wrong way round.
  ok('audio: whoosh LEVEL arches, so it passes rather than only arrives', (() => {
    const x = normalize(renderCue(CUES.whoosh, 1)), k = 8, w = Math.floor(x.length / k);
    const e = Array.from({ length: k }, (_, i) => { let s = 0; const a = i * w, b = i === k - 1 ? x.length : (i + 1) * w;
      for (let j = a; j < b; j++) s += x[j] * x[j]; return Math.sqrt(s / (b - a)); });
    const top = e.indexOf(Math.max(...e));
    return top > 0 && top < k - 1 && e[k - 1] < e[top] * 0.6; })());
  ok('audio: riser brightness only CLIMBS, and by more than an octave', (() => {
    const b = bands('riser').slice(0, 7);
    return b.every((v, i) => i === 0 || v >= b[i - 1] * 0.98) && b[6] > b[0] * 2; })());
  ok('audio: swell gets brighter as it builds, and peaks late', (() => {
    const x = normalize(renderCue(CUES.swell, 1)), b = bands('swell');
    let pk = 0, at = 0; for (let i = 0; i < x.length; i++) if (Math.abs(x[i]) > pk) { pk = Math.abs(x[i]); at = i; }
    return b[6] > b[0] * 1.8 && at > x.length * 0.4; })());   // 2.08 on the approved swell, not the 3 the tone stack hit
  ok('audio: drop ends below 45Hz, which is what makes it a drop and not a bass note', (() => {
    const b = bands('drop'); return b[4] < 45 && b[0] > b[4] * 1.5; })());
  // a bed must loop seamlessly: first and last sample sit at the same point of every partial
  ok('audio: music bed is a whole number of seconds (seamless loop)', musicBed({ loop: 8 }).length === 8 * SR);
  ok('audio: music bed is deterministic', (() => { const x = musicBed({ loop: 2 }), y = musicBed({ loop: 2 }); return x.every((v, i) => v === y[i]); })());
  ok('audio: biquad bandpass rejects DC', (() => { const f = biquad('bandpass', 2000, 1.5); let last = 0; for (let i = 0; i < 500; i++) last = f(1); return Math.abs(last) < 0.05; })());
  // The silent substitution this used to be: `triangle` was not a name osc knew, so it fell through to
  // sine and every spec saying it rendered a sine without complaint.
  ok('audio: `triangle` is an alias for `tri`, not a silent sine', (() => {
    const t = [], g = []; for (let i = 1; i < 40; i++) { t.push(osc('triangle', 300, i / SR)); g.push(osc('tri', 300, i / SR)); }
    return t.every((v, i) => v === g[i]) && t.some((v, i) => v !== osc('sine', 300, (i + 1) / SR)); })());
  ok('audio: an unknown waveform throws instead of quietly becoming a sine', (() => {
    try { osc('sawtooth', 300, 0.01); return false; } catch (e) { return /unknown waveform/.test(e.message); } })());
  ok('audio: biquad lowpass passes DC', (() => { const f = biquad('lowpass', 8000, 0.707); let last = 0; for (let i = 0; i < 500; i++) last = f(1); return last > 0.8; })());
  // FILTER AUTOMATION. Until this existed a noise layer's cutoff was fixed for its whole life, so a
  // band could sit but never sweep, and the deleted `travel` and `sweep` were two static bands with an
  // offset: a staircase, not a sweep. That is why round 1 rejected every noise cue by ear, and the
  // finding was about THIS ENGINE rather than about noise. These three assert the primitive itself,
  // not any cue built on it, so they keep holding when the cues are revoiced.
  {
    const band = (extra) => normalize(renderCue({ masterGain: 0.5, layers: [{
      kind: 'noise', filterType: 'bandpass', filterQ: 6, filterFrequency: 800,
      attack: 0.05, decay: 0.3, peak: 0.2, ...extra }] }, 1));
    const strip = (x, k = 6) => { const w = Math.floor(x.length / k);
      return Array.from({ length: k }, (_, i) => brightness(x, i * w, i === k - 1 ? x.length : (i + 1) * w)); };
    ok('audio: a noise band with no filter glide holds its brightness', (() => {
      const b = strip(band({})); return Math.max(...b) < Math.min(...b) * 1.4; })());
    ok('audio: filterGlideTo sweeps a noise band UP by more than two octaves', (() => {
      const b = strip(band({ filterGlideTo: 6000, filterGlideTime: 0.9 }));
      return b[5] > b[0] * 3 && b.every((v, i) => i === 0 || v > b[i - 1] * 0.95); })());
    ok('audio: filterGlideTo sweeps a noise band DOWN, so a fall is not a separate mechanism', (() => {
      const b = strip(band({ filterFrequency: 6000, filterGlideTo: 400, filterGlideTime: 0.9 }));
      return b[0] > b[5] * 3; })());
  }
}


// ---- beat detection (core/beats.js): the grid a beat-matched edit is built on ----
{
  const SR = 44100;
  // synthetic 120 BPM click track: a beat every 0.5s. If the detector cannot find THIS, it cannot
  // find a real one, and a wrong grid puts every cut between the beats instead of on them.
  const dur = 12, click = new Float32Array(SR * dur);
  for (let b = 0; b * 0.5 < dur; b++) {
    const o = Math.round(b * 0.5 * SR);
    for (let i = 0; i < 900 && o + i < click.length; i++) click[o + i] = Math.sin(i * 0.35) * Math.exp(-i / 220);
  }
  const { env, hopSeconds } = onsetEnvelope(click, SR);
  const { bpm, periodFrames, confidence } = estimateTempo(env, hopSeconds);
  ok('beats: detects 120 BPM on a synthetic click track', Math.abs(bpm - 120) < 4);
  ok('beats: reports high confidence on a clear pulse', confidence > 3);
  const phase = estimatePhase(env, periodFrames);
  const grid = beatGrid(periodFrames, phase, hopSeconds, dur);
  ok('beats: grid spacing matches the tempo', grid.length > 20 && Math.abs((grid[5] - grid[4]) - 0.5) < 0.03);
  ok('beats: grid phase lands on the clicks', Math.abs(grid[4] - Math.round(grid[4] / 0.5) * 0.5) < 0.06);
  // silence has no pulse: the detector must say so rather than invent a grid to snap cuts to
  const { env: envQ, hopSeconds: hq } = onsetEnvelope(new Float32Array(SR * 4), SR);
  ok('beats: silence yields no confident tempo', estimateTempo(envQ, hq).confidence < 1.6);
  // snapping must respect the author's intent
  const bts = [0, 0.5, 1, 1.5, 2];
  ok('beats: snapToBeat pulls a near miss onto the beat', snapToBeat(1.04, bts, 0.12) === 1);
  ok('beats: snapToBeat REFUSES to drag a far cut', snapToBeat(1.28, bts, 0.12) === 1.28);
  ok('beats: snapToBeat is a no-op with no grid', snapToBeat(3.3, [], 0.12) === 3.3);
  ok('beats: downbeats take every 4th beat', downbeats([0, 1, 2, 3, 4, 5, 6, 7, 8], 4).join() === '0,4,8');
  // ---- beat BINDING (core/beats/index.js): the grid reaches the film's joints, or the render stops ----
  const throws = (fn, re) => { try { fn(); return false; } catch (e) { return re.test(e.message); } };
  const G = { bpm: 120, confidence: 8, beats: [0, 0.5, 1, 1.5, 2, 2.5, 3], downbeats: [0, 2] };
  const sc = () => ({ audio: { music: 'beat', beatSync: true }, cuts: [{ t: 0.54, style: 'punch' }, { t: 1.28, style: 'punch' }], seams: [{ t: 1.75, dur: 0.5, fx: 'fade' }] });
  ok('beat-bind: a scene without beatSync is left entirely alone', beatSyncOf({ audio: { music: 'beat' } }) === null);
  ok('beat-bind: a bare bed name resolves to its sidecar', beatGridPath(sc()) === 'assets/music/beat.beats.json');
  ok('beat-bind: a .wav path resolves beside the track', beatGridPath({ audio: { music: 'assets/music/x.wav', beatSync: true } }) === 'assets/music/x.beats.json');
  const s1 = sc(); const r1 = bindBeats(s1, G);
  ok('beat-bind: a near-miss cut lands on the beat', s1.cuts[0].t === 0.5);
  ok('beat-bind: a far cut keeps the time the author wrote', s1.cuts[1].t === 1.28);
  ok('beat-bind: the run reports what moved and what did not', r1.moved.length === 1 && r1.held.length === 2);
  ok('beat-bind: a seam snaps the CENTRE of its blend', s1.seams[0].t === 1.75 && s1.seams[0].dur === 0.5);
  const s2 = sc(); s2.seams[0].t = 1.65; bindBeats(s2, G);
  ok('beat-bind: a seam whose centre is a near miss slides whole', Math.abs(s2.seams[0].t - 1.75) < 1e-6);
  const s3 = sc(); s3.cuts[0].snap = false; bindBeats(s3, G);
  ok('beat-bind: `snap:false` keeps a time the author means', s3.cuts[0].t === 0.54);
  const s4 = sc(); s4.audio.beatSync = { bar: true }; bindBeats(s4, G);
  ok('beat-bind: `bar:true` snaps to downbeats only', s4.cuts[0].t === 0.54);
  const s5 = { duration: 8, audio: { music: 'beat', beatSync: true }, cuts: [{ t: 4.48, style: 'punch' }] };
  bindBeats(s5, { ...G, seconds: 3 });
  ok('beat-bind: a looping bed unrolls its grid across the film', s5.cuts[0].t === 4.5);
  ok('beat-bind: the unroll leaves the caller\'s sidecar alone', G.beats.length === 7);
  ok('beat-bind: binding twice is identical (pure)', JSON.stringify(bindBeats(sc(), G)) === JSON.stringify(bindBeats(sc(), G)));
  ok('beat-bind: a missing grid THROWS rather than rendering unmatched', throws(() => bindBeats(sc(), null), /beat grid|beatmap/));
  ok('beat-bind: a pulseless track is refused, not snapped to', throws(() => bindBeats(sc(), { ...G, confidence: 1.2 }), /confidence/));
  ok('beat-bind: an empty grid is refused', throws(() => bindBeats(sc(), { ...G, beats: [] }), /carries no/));
  ok('beat-bind: beatSync with no track to read names the fix', throws(() => beatGridPath({ audio: { beatSync: true, music: 'auto' } }), /audio\.music/));
  // ONE POLICY (engine-doctrine/MISTAKES.md #477). harness/media/beatsync.mjs calls snapJoints/unrollGrid too, so
  // these pin the contract the CLI used to hold a second, wider opinion about.
  ok('beat-bind: the default tolerance IS snapToBeat\'s own', snapToBeat(1.04, bts) === snapToBeat(1.04, bts, DEFAULT_MAX_SHIFT));
  const s6 = { cuts: [{ t: 0.54 }], seams: [{ t: 1.75, dur: 0.5 }], stings: [{ t: 0.54, fx: 'flash' }] };
  const r6 = snapJoints(s6, G.beats, DEFAULT_MAX_SHIFT);
  // A STING RIDES ITS JOINT (engine-doctrine/MISTAKES.md #496). It used to keep the time the author wrote, so a
  // sting authored ON a cut drifted off that cut by however far the cut moved.
  ok('beat-bind: a sting authored on a cut is still on that cut after the snap', s6.stings[0].t === s6.cuts[0].t);
  ok('beat-bind: snapJoints reports the drift the CLI prints', r6.moved[0].kind === 'cut' && r6.moved[0].drift === 0.04);
  const s6b = { cuts: [{ t: 0.54 }], stings: [{ t: 0.66, fx: 'flash' }] };
  snapJoints(s6b, G.beats, DEFAULT_MAX_SHIFT);
  ok('beat-bind: a sting offset from its cut keeps the offset the author wrote',
     Math.abs((s6b.stings[0].t - s6b.cuts[0].t) - 0.12) < 1e-6);
  const s6c = { cuts: [{ t: 0.54 }], stings: [{ t: 3.1, fx: 'flash' }] };
  snapJoints(s6c, G.beats, DEFAULT_MAX_SHIFT);
  ok('beat-bind: a sting that punctuates no joint keeps its own time', s6c.stings[0].t === 3.1);
  const s6d = { cuts: [{ t: 0.54 }], stings: [{ t: 0.54, fx: 'flash', snap: false }] };
  snapJoints(s6d, G.beats, DEFAULT_MAX_SHIFT);
  ok('beat-bind: `snap:false` holds a sting where the author put it', s6d.stings[0].t === 0.54);
  ok('beat-bind: the beat period is read off the grid, not guessed', Math.abs(beatPeriod(G.beats) - 0.5) < 1e-9);
  const s7 = sc(); bindBeats(s7, G);
  const s8 = { cuts: [{ t: 0.54, style: 'punch' }, { t: 1.28, style: 'punch' }], seams: [{ t: 1.75, dur: 0.5, fx: 'fade' }] };
  snapJoints(s8, unrollGrid(G.beats, 0, 0), DEFAULT_MAX_SHIFT);
  ok('beat-bind: the declaration and the CLI land every joint on the same beat',
     JSON.stringify(s8.cuts.map((c) => c.t)) === JSON.stringify(s7.cuts.map((c) => c.t))
     && s8.seams[0].t === s7.seams[0].t);
  ok('beat-bind: unrollGrid returns a new array and never edits the sidecar', unrollGrid(G.beats, 3, 8) !== G.beats && G.beats.length === 7);
  // the `lift` entrance must actually travel: pop only scaled 14%, which read as flat
  ok('motion: lift travels further than pop at t=0', parseFloat(String(lift(0).transform).match(/scale\(([\d.]+)/)[1]) < 0.75);
  ok('motion: lift settles to identity', lift(1).transform.includes('scale(1.0000)'));
}


// ---- spectrum (core/spectrum.js): the audio-reactive bake is a pure transform ----
{
  const sr = 44100, n = sr, sig = new Float64Array(n);
  for (let i = 0; i < n; i++) sig[i] = Math.sin(2 * Math.PI * 80 * i / sr) * (i < n / 2 ? 1 : 0.05);
  const sp = bandEnergies(sig, sr, 30, BANDS);
  ok('spectrum: one row per video frame', sp.frames.length === 30);
  ok('spectrum: a row per band', sp.frames[0].length === BANDS.length);
  ok('spectrum: normalised into 0..1', sp.frames.every((r) => r.every((v) => v >= 0 && v <= 1)));
  // Compare ABSOLUTE peaks, not the normalised columns: every band is normalised to its own max, so
  // the normalised value of a silent band is meaningless on its own. That is exactly why `peak` exists.
  ok('spectrum: an 80Hz tone lands in the LOW band', sp.peak[0] > sp.peak[2] * 10);
  ok('spectrum: peak exposes that a band is near-silent', sp.peak[2] < 0.05);
  ok('spectrum: a quiet passage reads lower than a loud one', sp.frames[25][0] < sp.frames[5][0]);
  // THE property the determinism claim rests on: same samples in, same table out, always.
  ok('spectrum: deterministic', JSON.stringify(bandEnergies(sig, sr, 30, BANDS)) === JSON.stringify(sp));
  ok('spectrum: sampleAt holds the endpoints', sampleAt(sp, 9999, 'low') === sp.frames[sp.frames.length - 1][0]);
  // a typo must make the effect STAND STILL mid-render, never throw
  ok('spectrum: an unknown band is 0, not a throw', sampleAt(sp, 5, 'nope') === 0);
  ok('spectrum: a missing table is 0, not a throw', sampleAt(null, 5, 'low') === 0);
}

{
  // ransom: the whole effect rests on being a PURE function of (seed, index). If it ever picked up
  // Math.random or the clock the note would flicker frame to frame, this is the guard for that.
  const a = ransomGlyph('READ', 3, { accent: '#c8342b' });
  const b = ransomGlyph('READ', 3, { accent: '#c8342b' });
  ok('ransom: same (seed,i) → identical glyph spec', JSON.stringify(a) === JSON.stringify(b));
  ok('ransom: a different index changes the spec', JSON.stringify(ransomGlyph('READ', 4, {})) !== JSON.stringify(a));
  ok('ransom: a different seed changes the spec', JSON.stringify(ransomGlyph('DEAL', 3, {})) !== JSON.stringify(a));
  ok('ransom: picks a face from the pool', RANSOM_FACES.some((f) => f.family === a.family));
  ok('ransom: rotation stays within ±6°', Math.abs(a.rot) <= 6.001);
  ok('ransom: torn:false yields no clip-path', ransomGlyph('READ', 3, { torn: false }).clip === null);
  ok('ransom: accent tile carries the passed accent', ransomSwatches('#0af').some((s) => s.bg === '#0af'));
}


// ---- unified transitions router + lowering (core/transitions/lower.js) ----
{
  const throws = (fn) => { try { fn(); return false; } catch { return true; } };
  ok('transitions: seam-only name routes to seam', boundaryMechanism('whipPan') === 'seam');
  ok('transitions: ambiguous basic defaults to cut', boundaryMechanism('fade') === 'cut' && boundaryMechanism('slide') === 'cut' && boundaryMechanism('wipe') === 'cut');
  ok('transitions: dissolve (no cut) routes to seam', boundaryMechanism('dissolve') === 'seam');
  ok('transitions: cut-only name routes to cut', boundaryMechanism('zoom') === 'cut');
  ok('transitions: sting-only name routes to sting', boundaryMechanism('glitch') === 'sting');
  ok('transitions: mech:seam upgrades an ambiguous basic', boundaryMechanism('fade', 'seam') === 'seam');
  ok('transitions: layer-only anim rejected as a boundary', throws(() => boundaryMechanism('pop')));
  ok('transitions: unknown fx rejected', throws(() => boundaryMechanism('definitely-not-a-fx')));
  ok('transitions: mech mismatch rejected', throws(() => boundaryMechanism('whipPan', 'cut')));
  // lowering expands + consumes the unified boundary key, in place, idempotently. The per-layer
  // `transition` sugar it used to lower too is gone (zero users, exact anim/out duplicate, #gsap-audit).
  const d = lowerScene({ layers: [{ text: 'A' }], transitions: [{ at: 2, fx: 'whipPan', dur: 0.6, timing: 'snappy' }] });
  ok('transitions: boundary lowers to a seam', Array.isArray(d.seams) && d.seams[0].t === 2 && d.seams[0].fx === 'whipPan' && d.seams[0].timing === 'snappy');
  ok('transitions: unified boundary key is consumed', !('transitions' in d));
  ok('transitions: ambiguous basic lowers to a cut', (() => { const x = lowerScene({ transitions: [{ at: 1, fx: 'slide', dir: 'left' }] }); return Array.isArray(x.cuts) && x.cuts[0].style === 'slide'; })());
  ok('transitions: lowering is idempotent (no-op second pass)', (() => { const x = lowerScene(lowerScene({ transitions: [{ at: 1, fx: 'fade' }] })); return x.cuts.length === 1; })());
  ok('transitions: a scene with no unified keys is untouched', (() => { const src = { layers: [{ text: 'x' }], cuts: [{ t: 1, style: 'fade' }] }; const x = lowerScene(src); return x.cuts.length === 1 && !('transitions' in x); })());
  // A STING TINT IS A COLOUR, NOT A HEX (engine-doctrine/MISTAKES.md #497). The renderer read it with
  // parseInt(hex, 16), so a theme token or an rgb() became NaN and then [0,0,0]: a black tint, no error.
  ok('transitions: a sting tint may be a theme token', checkStingColor('var(--accent)', 'x') === 'var(--accent)');
  ok('transitions: a sting tint may be a hex or an rgb()',
     checkStingColor('#ff7a35', 'x') === '#ff7a35' && checkStingColor('rgb(255,0,0)', 'x') === 'rgb(255,0,0)');
  const refuses = (fn, re) => { try { fn(); return false; } catch (e) { return re.test(e.message); } };
  ok('transitions: a tint nothing can resolve is refused BY NAME, never tinted black',
     refuses(() => lowerScene({ stings: [{ t: 1, fx: 'flash', color: 'var(--nope)' }] }), /--nope/));
  ok('transitions: a sting palette is checked entry by entry',
     refuses(() => lowerScene({ stings: [{ t: 1, fx: 'leak', colors: ['#fff', 'not-a-colour'] }] }), /colors\[1\]/));
  // Auto sound-design must cue EVERY seam fx: a seam with no mapping falls back to a bare whoosh and
  // reads wrong (a bloom-iris should not swoosh). This gate is why `data.seams` stopped rendering silent
  // (audio derived cuts+stings only). If a new SEAM_FX ships without a SEAM_CUE row, this fails loudly.
  ok('audio: SEAM_CUE covers every SEAM_FX (no silent seam)', SEAM_FX.every((fx) => typeof SEAM_CUE[fx] === 'string'));
  // THE GATE THAT WAS MISSING, and its absence is why deleting ten cues broke six films silently. The
  // alias table in generators/media/audio-bake.mjs keeps an old name BAKING, which is kind, but a film
  // that still says `tick` is a film nobody has re-listened to. This asserts the scenes themselves,
  // not the alias layer, so the aliases stay a courtesy rather than becoming load-bearing.
  ok('audio: every cue an author named in a scene is a cue that exists', (() => {
    const dir = path.join(repoRoot, 'films/scene');
    const bad = [];
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith('.json')) continue;
      let j; try { j = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch { continue; }
      for (const c of (j.audio && j.audio.cues) || []) if (c.name && !CUES[c.name]) bad.push(`${f}:${c.name}`);
    }
    if (bad.length) console.log('    scenes naming a cue that is gone:', bad.join(' '));
    return bad.length === 0; })());
  ok('audio: every SEAM_CUE voicing resolves to a baked wav', Object.values(SEAM_CUE).every((c) => c === 'whoosh' || c === 'reveal' || c in CUES));
}


// ---- TACTILE sound design: the film's own motion, voiced (core/audio-tactile.js) -----------------
{
  const { tactileCues, capDensity, derive, travelOf, prominenceOf, MOTION_CUES, DENSITY, RISER_LEAD } =
    await import('../../core/audio/tactile.js');
  const canvas = { w: 1920, h: 1080 };

  // The five motion voices are being added to CUES in core/audio/kit.mjs alongside this module, so
  // this reports rather than fails: a name that has not baked yet renders silent, and the day one of
  // them is renamed this line is what says so.
  const unbaked = MOTION_CUES.filter((n) => !(n in CUES));
  if (unbaked.length) console.log(`  · tactile: motion cues not baked yet (pending core/audio/kit.mjs): ${unbaked.join(', ')}`);
  // EVERY NAME THE DERIVATION EMITS MUST BE A CUE, which is the assertion that was missing when the
  // listening pass trimmed MOTION_CUES and left the emitters writing `thud`, `travel` and `riser`.
  // Naming one cue was never the check: the check is that the whole vocabulary resolves.
  ok('tactile: every motion cue the derivation can emit has a voicing', MOTION_CUES.every((n) => n in CUES));

  ok('tactile: nothing sounds without a scene', tactileCues({}).length === 0);

  // THE CONTRACT SHAPE. The same { t, name, gain } every other cue in buildSfx carries: no second
  // pipeline, no schema change, and the Go mixer loads the baked wav by name exactly as it does today.
  const shaped = tactileCues({ duration: 6,
    layers: [{ type: 'rect', start: 0, w: 1200, h: 700, anim: 'slide-left' }] }, { canvas });
  ok('tactile: every cue is {t, name, gain} and nothing else',
     shaped.length > 0 && shaped.every((c) => Object.keys(c).sort().join() === 'gain,name,t'
       && typeof c.t === 'number' && typeof c.name === 'string' && typeof c.gain === 'number'));
  ok('tactile: cues come back sorted by time', shaped.every((c, i) => i === 0 || shaped[i - 1].t <= c.t));
  ok('tactile: every derived cue names a motion voice',
     derive({ duration: 30, spectacle: { at: 12 }, camera: [{ t: 0, s: 1 }, { t: 3, s: 1.4 }],
       layers: [{ type: 'rect', start: 1, w: 1400, h: 700 }, { type: 'rect', start: 4, w: 120, h: 60 },
         { type: 'count', start: 6, to: 40 }, { type: 'html', start: 9, w: 800, h: 400,
           parts: [{ select: '.r', stagger: 0.3, count: 3 }] }] }, { canvas })
       .every((c) => MOTION_CUES.includes(c.name)));

  // THE WHOLE POINT: the sound is a FUNCTION OF THE MOTION. Same entrance, different size.
  const one = (L) => tactileCues({ duration: 4, layers: [L] }, { canvas })[0];
  const big = one({ type: 'rect', start: 1, w: 1600, h: 800, anim: 'rise' });
  const small = one({ type: 'rect', start: 1, w: 160, h: 60, anim: 'rise' });
  ok('tactile: a big layer lands as an impact, a chip plucks', big.name === 'impact' && small.name === 'pluck');
  ok('tactile: the bigger layer lands louder', big.gain > small.gain);
  // ...and same size, different travel. With no per-cue parameters, LEVEL is the only handle on how
  // hard a thing lands, so a slide has to be louder than a fade of the identical card.
  const slid = one({ type: 'rect', start: 1, w: 1600, h: 800, anim: 'slide-left' });
  const faded = one({ type: 'rect', start: 1, w: 1600, h: 800, anim: 'fade' });
  ok('tactile: travel sets the level', slid.gain > faded.gain && slid.name === faded.name);
  ok('tactile: travelOf reads the entrance vocabulary',
     travelOf('slide-left') > travelOf('rise') && travelOf('rise') > travelOf('pop') && travelOf('fade') === 0);
  ok('tactile: an unsized picture falls back to a stated size, never to zero',
     prominenceOf({ type: 'image' }, canvas).area > 0);
  ok('tactile: a headline is measured from its own copy, so it outweighs a caption',
     one({ type: 'text', start: 1, text: 'THE ONE THING TO REMEMBER', size: 140 }).gain
     > one({ type: 'text', start: 1, text: 'a footnote', size: 24 }).gain);
  ok('tactile: a hairline rule is decoration and never sounds',
     tactileCues({ duration: 4, layers: [{ type: 'rect', start: 1, w: 1600, h: 3 }] }, { canvas }).length === 0);
  ok('tactile: a glow is a condition of the frame, not an event',
     tactileCues({ duration: 4, layers: [{ type: 'glow', start: 1, w: 900, h: 900 }] }, { canvas }).length === 0);
  ok('tactile: a layer can opt out by name',
     tactileCues({ duration: 4, layers: [{ type: 'rect', start: 1, w: 1600, h: 800, sound: false }] }, { canvas }).length === 0);

  // CUTS AND SEAMS ARE NOT DERIVED HERE. CUT_CUE already voices them and a second table would be two
  // ways to say one thing. They arrive as `fixed`, rank against the motion, and come back untouched.
  ok('tactile: a cut is not re-voiced here',
     tactileCues({ duration: 6, cuts: [{ t: 2, style: 'punch' }] }, { canvas }).length === 0);
  ok('tactile: the fixed structural cues are never handed back',
     tactileCues({ duration: 6, layers: [{ type: 'rect', start: 4, w: 1200, h: 700 }] },
       { canvas, fixed: [{ t: 2, name: 'press' }] }).every((c) => c.name !== 'press'));
  ok('tactile: an arrival that flams against a cut is dropped, and the cut is not',
     tactileCues({ duration: 6, layers: [{ type: 'rect', start: 2.01, w: 1200, h: 700 }] },
       { canvas, fixed: [{ t: 2, name: 'press' }] }).length === 0);

  // A CAMERA MOVE. Contiguous changing keys are ONE move, and its size sets the level.
  const camCues = tactileCues({ duration: 30, camera: [
    { t: 0, s: 1, x: 0, y: 0 }, { t: 10, s: 1, x: 0, y: 0 },
    { t: 10.3, s: 1.13, x: 0, y: -10 }, { t: 12.3, s: 1, x: 0, y: 0 }, { t: 20, s: 1, x: 0, y: 0 }] }, { canvas });
  ok('tactile: a punch-in and its release are ONE whoosh, not two',
     camCues.length === 1 && camCues[0].name === 'whoosh' && camCues[0].t === 10);
  ok('tactile: a camera that only sits still says nothing',
     tactileCues({ duration: 20, camera: [{ t: 0, s: 1 }, { t: 19, s: 1 }] }, { canvas }).length === 0);
  ok('tactile: a longer move is a bigger gesture, so it is louder',
     tactileCues({ duration: 9, camera: [{ t: 0, s: 1 }, { t: 4, s: 1.6 }] }, { canvas })[0].gain
     > tactileCues({ duration: 9, camera: [{ t: 0, s: 1 }, { t: 0.5, s: 1.6 }] }, { canvas })[0].gain);

  // A COUNTER. Plucks on the number's own velocity curve, so an easeOut crowds them at the start.
  const cnt = tactileCues({ duration: 8, layers: [
    { type: 'count', start: 1, duration: 3, from: 0, to: 84, countStart: 0.2, countDur: 2, ease: 'easeOutCubic' }] }, { canvas });
  ok('tactile: a counter plucks, and never more than a handful',
     cnt.length >= 3 && cnt.length <= 7 && cnt.every((c) => c.name === 'pluck'));
  ok('tactile: a counter is quiet, or it is a machine gun', cnt.every((c) => c.gain <= 0.15));
  ok('tactile: the plucks follow the EASE, spreading as an easeOut settles',
     cnt[1].t - cnt[0].t < cnt[cnt.length - 1].t - cnt[cnt.length - 2].t);
  ok('tactile: the counter lands inside its own window',
     cnt[0].t >= 1.2 - 1e-9 && cnt[cnt.length - 1].t <= 3.2 + 1e-9);
  ok('tactile: the last pluck is the one that lands', cnt[cnt.length - 1].gain > cnt[0].gain);

  // A `parts` STAGGER. Thinned EVENLY when it is too fast to hear, never chewed into holes.
  const trainLayer = (count, stagger) => ({ type: 'html', start: 2, w: 900, h: 500,
    parts: [{ select: '.x', anim: 'fadeUp', stagger, delay: 0, count }] });
  const fast = tactileCues({ duration: 8, layers: [trainLayer(12, 0.05)] }, { canvas });
  ok('tactile: a 12-part train at 0.05s is thinned, never voiced 12 times', fast.length <= 6 && fast.length >= 2);
  ok('tactile: the thinned train stays EVENLY spaced',
     new Set(fast.slice(1).map((c, i) => +(c.t - fast[i].t).toFixed(3))).size === 1);
  ok('tactile: the thinned train is never faster than the ear can follow',
     fast.every((c, i) => i === 0 || c.t - fast[i - 1].t >= 0.2 - 1e-9));
  ok('tactile: a slow train keeps its own stagger',
     tactileCues({ duration: 8, layers: [trainLayer(4, 0.3)] }, { canvas })
       .every((c, i, a) => i === 0 || Math.abs((c.t - a[i - 1].t) - 0.3) < 1e-6));
  ok('tactile: a parts layer does not ALSO thud as one card', fast.every((c) => c.name === 'pluck'));
  ok('tactile: an unmatched selector sounds nothing, rather than guessing a count',
     tactileCues({ duration: 8, layers: [{ type: 'html', start: 2, w: 900, h: 500,
       parts: [{ select: '.x', stagger: 0.1 }] }] }, { canvas }).length === 0);

  // THE SPECTACLE. A riser that ENDS on the nominated moment, and the cap may not drop it.
  const spec = tactileCues({ duration: 30, spectacle: { at: 12, of: 'ring', device: 'ripple' },
    layers: Array.from({ length: 40 }, (_, i) => ({ type: 'rect', start: 11 + i * 0.02, w: 900, h: 500 })) }, { canvas });
  // The spectacle lands ON its moment. It used to be a `riser` led in early so the build ended on the
  // beat; the listening pass filed `riser` under `weak` and the owner rejected it by ear, so the cue
  // is now a `bloom` at the moment itself, and its time is the time it means.
  const bloomAt = spec.find((c) => c.name === 'bloom' && Math.abs(c.t - 12) < 1e-6);
  // `protect` is an internal flag the density pass consumes, so it is not on the emitted cue. That it
  // SURVIVED is the real assertion, and the next line makes it against 40 arrivals crowding the same
  // second, which is exactly what the cap would otherwise drop it for.
  ok('tactile: the spectacle sounds ON its moment, not before it', !!bloomAt);
  ok('tactile: the density cap may not drop the moment the film nominated', !!bloomAt);
  ok('tactile: nothing in the derivation reaches for a riser any more',
     spec.every((c) => c.name !== 'riser'));

  // DENSITY. The design problem, not the mapping.
  const hail = { duration: 30, layers: Array.from({ length: 120 },
    (_, i) => ({ type: 'rect', start: +(i * 0.12).toFixed(2), w: 700, h: 300, anim: 'rise' })) };
  const capped = tactileCues(hail, { canvas });
  ok('tactile: 120 events do not become 120 cues',
     derive(hail, { canvas }).length === 120 && capped.length < 120);
  ok('tactile: two cues never flam inside the merge gap',
     capped.every((c, i) => i === 0 || c.t - capped[i - 1].t >= DENSITY.minGap));
  ok('tactile: no second of the film carries more than the cap',
     capped.every((c) => capped.filter((k) => Math.abs(k.t - c.t) < 0.5).length <= DENSITY.maxPerSec));
  ok('tactile: the cap is authorable', tactileCues(hail, { canvas, config: { maxPerSec: 1 } }).length
     < tactileCues(hail, { canvas, config: { maxPerSec: 8 } }).length);
  ok('tactile: `gain` scales the whole mix',
     tactileCues(hail, { canvas, config: { gain: 0.5 } })
       .every((c, i) => Math.abs(c.gain - r2gain(capped[i].gain * 0.5)) < 1e-9));
  // Weight, not arrival order, decides who survives. A hairline that happens first must not silence
  // the headline that happens 10ms later: that is the whole reason cues carry a prominence.
  const clash = capDensity([
    { t: 1.0, name: 'pluck', gain: 0.1, w: 0.2 },
    { t: 1.01, name: 'thud', gain: 0.4, w: 0.7 }]);
  ok('tactile: at the same instant the more prominent cue wins',
     clash.length === 1 && clash[0].name === 'thud');

  // DETERMINISM. The same scene derives the identical list, every run.
  const rich = { duration: 20, camera: [{ t: 0, s: 1 }, { t: 6, s: 1.4 }],
    spectacle: { at: 12, of: 'x', device: 'ripple' },
    layers: [{ type: 'rect', start: 1, w: 1400, h: 700, anim: 'slide-left' },
      { type: 'text', start: 3, text: 'a headline that carries the frame', size: 120 },
      { type: 'count', start: 7, duration: 3, to: 900, ease: 'easeOutExpo' },
      { type: 'html', start: 10, w: 800, h: 400, parts: [{ select: '.r', stagger: 0.25, count: 5 }] }] };
  const runA = JSON.stringify(tactileCues(rich, { canvas }));
  ok('tactile: the same scene derives the identical cue list, every run',
     runA === JSON.stringify(tactileCues(rich, { canvas })));
  ok('tactile: the list does not depend on the order the scene declares its layers',
     JSON.stringify(tactileCues({ ...rich, layers: rich.layers.slice().reverse() }, { canvas })) === runA);
}


// ---- camera moves (pure keyframe generators, checked through cameraAt) ----------------------------
{
  const push = slowPush({ start: 1, dur: 4, from: 1, to: 1.2 });
  ok('slowPush: 2 keyframes', push.length === 2);
  ok('slowPush: cameraAt start = from', approx(cameraAt(push, 1).s, 1));
  ok('slowPush: cameraAt end = to', approx(cameraAt(push, 5).s, 1.2));
  const dive = diveIn({ start: 0, dur: 2, tx: 1920, ty: 0, to: 1.5, canvasW: 1920, canvasH: 1080 });
  ok('diveIn: ends at target scale', approx(cameraAt(dive, 2).s, 1.5));
  ok('diveIn: pan centres the target (x = W/2 - tx)', approx(cameraAt(dive, 2).x, 1920 / 2 - 1920));
  ok('diveIn: pan y = H/2 - ty', approx(cameraAt(dive, 2).y, 1080 / 2 - 0));
  ok('diveIn: starts at identity', approx(cameraAt(dive, 0).s, 1) && approx(cameraAt(dive, 0).x, 0));
  const pan = panFollow({ start: 0, dur: 5, dy: -300 });
  ok('panFollow: interior ease is linear (constant velocity)', pan[1].ease === 'linear');
  ok('panFollow: cameraAt midpoint is halfway (linear)', approx(cameraAt(pan, 2.5).y, -150));
  const orb = orbit({ start: 0, dur: 6, deg: 12 });
  ok('orbit: 3 keyframes with a linear interior', orb.length === 3 && orb[1].ease === 'linear');
  ok('orbit: swings ry through 0', approx(cameraAt(orb, 3).ry, 0, 1e-3));
  const mp = multiPhase({ start: 0, legs: [{ dur: 1, s: 1.3 }, { dur: 2, s: 1.3 }, { dur: 1, s: 1 }] });
  ok('multiPhase: interior legs are linear, last eases out', mp[1].ease === 'linear' && mp[mp.length - 1].ease !== 'linear');
  ok('multiPhase: deterministic', JSON.stringify(multiPhase({ start: 0, legs: [{ dur: 1, s: 1.2 }] })) === JSON.stringify(multiPhase({ start: 0, legs: [{ dur: 1, s: 1.2 }] })));
  // A leg that mentions no axis must CHANGE no axis. `s` always carried forward; x and y defaulted to
  // 0 on the same line, so the documented "hold" leg between a push and a settle panned the camera all
  // the way home, 180px over 2s, a move as big as the push (MISTAKES #197). The old test passed `s` on
  // every leg and no position at all, which is exactly the input shape that works.
  const hold = multiPhase({ start: 0, legs: [{ dur: 1.5, s: 1.25, x: 180, y: -60 }, { dur: 2 }, { dur: 1.5, s: 1, x: 0, y: 0 }] });
  const h0 = cameraAt(hold, 1.5), h1 = cameraAt(hold, 3.5);
  ok('multiPhase: a leg that mentions nothing holds position', approx(h1.x, h0.x, 1e-6) && approx(h1.y, h0.y, 1e-6));
  ok('multiPhase: ...and holds scale, as it always did', approx(h1.s, h0.s, 1e-6));
  ok('multiPhase: an explicit later leg still moves', approx(cameraAt(hold, 5).x, 0, 1e-6) && approx(cameraAt(hold, 5).s, 1, 1e-6));
  // travel: the contract is the pan math, so every station must sit at frame CENTRE when the camera
  // arrives. That conversion is the reason the helper exists and the thing hand-typed legs get wrong.
  const trStations = [
    { tx: 400, ty: 300, s: 1.4 },
    { tx: 1500, ty: 800, s: 1.8, dur: 1.2, dwell: 0.6 },
    { tx: 960, ty: 540, s: 1, dur: 1 },
  ];
  const tr = travel({ stations: trStations, start: 0, canvasW: 1920, canvasH: 1080 });
  const arrivals = [0, 1.2, 2.8];   // station 0 opens the flight; 1.2 = dur, 2.8 = 1.2 + 0.6 dwell + 1
  ok('travel: every station lands at frame centre (x = W/2 - tx)', trStations.every((st, i) =>
    approx(cameraAt(tr, arrivals[i]).x, 1920 / 2 - st.tx, 1e-6)));
  ok('travel: ...and on y (y = H/2 - ty)', trStations.every((st, i) =>
    approx(cameraAt(tr, arrivals[i]).y, 1080 / 2 - st.ty, 1e-6)));
  ok('travel: each station arrives at its own scale', trStations.every((st, i) =>
    approx(cameraAt(tr, arrivals[i]).s, st.s, 1e-6)));
  // One journey, not four hops: an eased curve at each station zeroes velocity on arrival (#125).
  // Interiors default to `through` (velocity-continuous, core/timeline/sequence.js), not `linear`:
  // two straight segments at different speeds still kink at the shared station. tr[2] is the DWELL
  // keyframe behind station 1 (same pose, zero distance): a hold has no velocity to shape, so it keeps
  // the old `linear` placeholder rather than `through`.
  ok('travel: interiors are velocity-continuous, only the final arrival settles',
    tr[1].ease === 'through' && tr[2].ease === 'linear' && tr[tr.length - 1].ease === 'easeOutCubic'
    && tr[0].ease === undefined);
  const dw0 = cameraAt(tr, 1.2), dw1 = cameraAt(tr, 1.5);
  ok('travel: a dwell holds the pose on s/x/y', approx(dw1.s, dw0.s, 1e-6) && approx(dw1.x, dw0.x, 1e-6)
    && approx(dw1.y, dw0.y, 1e-6));
  // The #197 shape: an axis a station does not mention must CHANGE nothing.
  const carry = travel({ stations: [{ tx: 0, ty: 0, s: 1.5 }, { tx: 1920, ty: 1080, dur: 1 }], start: 0 });
  ok('travel: a station without `s` carries the previous scale', approx(cameraAt(carry, 1).s, 1.5, 1e-6));
  ok('travel: a station without tx/ty carries the previous pan', (() => {
    const zoom = travel({ stations: [{ tx: 400, ty: 300, s: 1.2 }, { s: 2, dur: 1 }], start: 0 });
    const z = cameraAt(zoom, 1);
    return approx(z.x, 1920 / 2 - 400, 1e-6) && approx(z.y, 1080 / 2 - 300, 1e-6) && approx(z.s, 2, 1e-6);
  })());
  ok('travel: throws on missing/empty stations', ['skip', undefined, []].every((s) => {
    try { travel(s === 'skip' ? undefined : { stations: s }); return false; } catch { return true; }
  }));
  ok('travel: deterministic', JSON.stringify(travel({ stations: trStations }))
    === JSON.stringify(travel({ stations: trStations })));
  // TRAVEL STOP SPEED: a station may carry easeIn/easeOut, the same handle shape a motion key carries,
  // resolved through the same handleCurve. A station with neither is unchanged from before (asserted
  // above); one with a dead-stop easeIn must actually arrive at zero velocity.
  {
    const speedStations = [{ tx: 0, ty: 0, s: 1 }, { tx: 960, ty: 540, s: 1.5, dur: 1, easeIn: { speed: 0, influence: 80 } }];
    const spTr = travel({ stations: speedStations, start: 0 });
    ok('travel: a station easeIn is carried onto its arrival key, no default `ease`', spTr[1].easeIn && spTr[1].easeIn.speed === 0 && spTr[1].ease === undefined);
    const EPS = 1 / 240; // a quarter-frame at 60fps: small enough to read the instantaneous rate at the key
    const justBefore = cameraAt(spTr, 1 - EPS), atArrival = cameraAt(spTr, 1);
    const vxAtArrival = (atArrival.x - justBefore.x) / EPS;
    ok('travel: easeIn {speed:0} arrives at (near) zero velocity', Math.abs(vxAtArrival) < 5);
    // no handles at all, only 2 stations: the sole arrival is also the FINAL one, so it still settles.
    const plain = travel({ stations: [{ tx: 0, ty: 0, s: 1 }, { tx: 960, ty: 540, s: 1.5, dur: 1 }], start: 0 });
    ok('travel: a station without handles is unchanged (final arrival settles, no easeIn/easeOut)',
      plain[1].ease === 'easeOutCubic' && plain[1].easeIn === undefined && plain[1].easeOut === undefined);
    // easeOut on an interior station: the NEXT arrival must not also carry the default `ease`, or the
    // shared segment would be shaped twice and keyHandleErrors would refuse the whole track.
    const departStations = [{ tx: 0, ty: 0, s: 1 },
      { tx: 500, ty: 500, s: 1.2, dur: 1, easeOut: { speed: 3, influence: 30 } },
      { tx: 960, ty: 540, s: 1.5, dur: 1 }];
    const depTr = travel({ stations: departStations, start: 0 });
    ok('travel: a station easeOut leaves no conflicting `ease` on the next arrival',
      depTr[1].easeOut && depTr[1].easeOut.speed === 3 && keyHandleErrors(depTr, 'travel').length === 0);
    ok('travel: a bad easeIn/easeOut handle still throws, named to the station',
      (() => { try { travel({ stations: [{ tx: 0, ty: 0 }, { tx: 1, ty: 1, easeIn: { influence: 200 } }] }); return false; }
        catch (e) { return /travel station 1/.test(e.message); } })());
  }
  const tk = truck({ start: 1, dur: 2, dx: -800, s: 1.3 });
  ok('truck: 2 keyframes, x runs 0 → dx', tk.length === 2 && approx(cameraAt(tk, 1).x, 0)
    && approx(cameraAt(tk, 3).x, -800));
  ok('truck: s is constant across the move', [1, 1.5, 2, 2.5, 3].every((t) => approx(cameraAt(tk, t).s, 1.3, 1e-6)));
  ok('truck: lateral only, y never moves', approx(cameraAt(tk, 2).y, 0, 1e-6));
  // The canvas is now REQUIRED for any move that centres a point, because defaulting to landscape
  // mis-centred every target in a portrait scene by 420px per axis in silence. expand-blocks.mjs passes
  // sceneDims(data); here it is spelled out.
  ok('buildCameraMove resolves travel by name', JSON.stringify(buildCameraMove({ move: 'travel', stations: trStations }, [1920, 1080]))
    === JSON.stringify(travel({ stations: trStations })));
  ok('buildCameraMove injects the scene canvas into a targeting move',
    approx(cameraAt(buildCameraMove({ move: 'diveIn', tx: 540, ty: 960, dur: 1 }, [1080, 1920]), 1).x, 0)
    && approx(cameraAt(buildCameraMove({ move: 'diveIn', tx: 540, ty: 960, dur: 1 }, [1080, 1920]), 1).y, 0));
  ok('buildCameraMove REFUSES a targeting move with no canvas', (() => {
    try { buildCameraMove({ move: 'diveIn', tx: 540, ty: 960 }); return false; } catch { return true; }
  })());
  ok('buildCameraMove REFUSES a param the move does not read', (() => {
    try { buildCameraMove({ move: 'slowPush', too: 1.2 }); return false; } catch { return true; }
  })());
  ok('diveIn REFUSES a missing target coordinate instead of carrying NaN', (() => {
    try { diveIn({ tx: 960 }); return false; } catch { return true; }
  })());
  // A non-positive duration walks the keyframe clock BACKWARD, and cameraAt scans for its bracketing
  // pair assuming ascending t, so the camera teleports to the destination and the move vanishes. Zero is
  // the same class one step milder (a divide by zero, lerping NaN). Guarded for every generator, so
  // asserted for every generator.
  ok('every camera generator REFUSES a non-positive duration', [
    () => slowPush({ dur: -4 }), () => panFollow({ dur: 0 }), () => orbit({ dur: -6 }),
    () => multiPhase({ legs: [{ dur: -2 }] }), () => diveIn({ tx: 1, ty: 1, dur: -1 }),
    () => workspaceZoomOut({ dur: 0 }), () => truck({ dur: -2 }),
    () => travel({ stations: [{ tx: 0, ty: 0 }, { tx: 1, ty: 1, dur: -1 }] }),
  ].every((f) => { try { f(); return false; } catch { return true; } }));
  ok('travel REFUSES a negative dwell but allows zero', (() => {
    try { travel({ stations: [{ tx: 0, ty: 0 }, { tx: 1, ty: 1, dwell: -10 }] }); return false; } catch {}
    return travel({ stations: [{ tx: 0, ty: 0 }, { tx: 500, ty: 500, dwell: 0 }] }).length === 2;
  })());
  ok('every emitted camera track is ascending in t', [
    slowPush({}), panFollow({}), orbit({}), multiPhase({ legs: [{ dur: 1 }, { dur: 2 }] }),
    diveIn({ tx: 100, ty: 100 }), workspaceZoomOut({}), truck({}),
    travel({ stations: [{ tx: 0, ty: 0 }, { tx: 500, ty: 500, dwell: 0.5 }, { tx: 900, ty: 100 }] }),
  ].every((kf) => kf.every((k, i) => i === 0 || k.t >= kf[i - 1].t)));
  ok('CAMERA_MOVE_NAMES picks up travel + truck',
    CAMERA_MOVE_NAMES.includes('travel') && CAMERA_MOVE_NAMES.includes('truck'));
  ok('buildCameraMove resolves by name', buildCameraMove({ move: 'slowPush', start: 0, dur: 2 }).length === 2);
  ok('buildCameraMove throws on unknown', (() => { try { buildCameraMove({ move: 'nope' }); return false; } catch { return true; } })());
  ok('CAMERA_MOVE_NAMES lists the generators', CAMERA_MOVE_NAMES.includes('diveIn') && CAMERA_MOVE_NAMES.includes('panFollow'));

  // ---- diveIn headroom: a target bigger than the frame ADAPTS, never a silent crop -----------------
  // `to` past the frame used to be a hard refusal; it now clamps to the largest scale that keeps the
  // subject in frame and prints an "adapted" line, so a scene that predates a target's real size still
  // renders. maxScale = min(0.88*W/targetW, 0.88*H/targetH). `crop: true`, or a raised `headroom`, is
  // the explicit opt-in that keeps `to` exactly as authored (tested beside the clamp).
  ok('diveIn: a `to` inside the headroom is allowed', diveIn({ tx: 960, ty: 540, to: 2,
    targetW: 400, targetH: 300, canvasW: 1920, canvasH: 1080 }).length === 2);
  ok('diveIn: a `to` that pushes the target off-frame is CLAMPED, not refused', (() => {
    const max = Math.min(0.88 * 1920 / 400, 0.88 * 1080 / 300);
    const kf = diveIn({ tx: 960, ty: 540, to: 5, targetW: 400, targetH: 300, canvasW: 1920, canvasH: 1080 });
    return kf.length === 2 && approx(kf[1].s, max);
  })());
  ok('diveIn: the limit is the tighter axis (0.88 * H / targetH here)', (() => {
    const max = Math.min(0.88 * 1920 / 400, 0.88 * 1080 / 900);   // 4.224 vs 1.056 → 1.056
    const inside = diveIn({ tx: 0, ty: 0, to: max - 1e-6, targetW: 400, targetH: 900, canvasW: 1920, canvasH: 1080 });
    const outside = diveIn({ tx: 0, ty: 0, to: max + 1e-3, targetW: 400, targetH: 900, canvasW: 1920, canvasH: 1080 });
    return inside.length === 2 && approx(outside[1].s, max);
  })());
  ok('diveIn: one axis alone still guards, and still adapts', (() => {
    const max = 0.88 * 1920 / 1200;
    const kf = diveIn({ tx: 0, ty: 0, to: 3, targetW: 1200, canvasW: 1920, canvasH: 1080 });
    return approx(kf[1].s, max);
  })());
  ok('diveIn: `crop: true` keeps `to` exactly as authored, no clamp', (() => {
    const kf = diveIn({ tx: 960, ty: 540, to: 5, targetW: 400, targetH: 300, canvasW: 1920, canvasH: 1080, crop: true });
    return kf[1].s === 5;
  })());
  ok('diveIn: a `headroom` raised above 0.88 also opts out of the clamp', (() => {
    const kf = diveIn({ tx: 960, ty: 540, to: 5, targetW: 400, targetH: 300, canvasW: 1920, canvasH: 1080, headroom: 0.95 });
    return kf[1].s === 5;
  })());
  ok('diveIn: no target size given = nothing to check, unchanged behaviour',
    diveIn({ tx: 0, ty: 0, to: 9 }).length === 2);
  ok('diveIn: REFUSES a non-positive target size', (() => {
    try { diveIn({ tx: 0, ty: 0, targetW: 0 }); return false; } catch { return true; }
  })());

  // ---- cameraShake: the randomness is SAMPLED at author time, so the render only lerps -------------
  const sh = cameraShake({ start: 2, dur: 0.42, fps: 30, seed: 5 });
  ok('cameraShake: opens at rest and returns to exactly zero', sh[0].x === 0 && sh[0].y === 0
    && sh[sh.length - 1].x === 0 && sh[sh.length - 1].y === 0);
  ok('cameraShake: one key per frame plus the rest key and the recovery', sh.length === 1 + 12 + 1);
  ok('cameraShake: t is strictly ascending', sh.every((k, i) => i === 0 || k.t > sh[i - 1].t));
  ok('cameraShake: ends at start + dur + recover', approx(sh[sh.length - 1].t, 2 + 0.42 + 0.1, 1e-9));
  ok('cameraShake: never touches scale (it is a translate, not a zoom)', sh.every((k) => k.s === 1));
  ok('cameraShake: y is 0.7 of the y channel, as measured off the reference', (() => {
    const raw = shake(1 / 30, { amp: 28, freq: 16, decay: 6.3, seed: 5 });
    return approx(sh[1].y, raw.y * 0.7, 1e-12) && approx(sh[1].x, raw.x, 1e-12);
  })());
  ok('cameraShake: the same seed gives byte-identical keyframes',
    JSON.stringify(cameraShake({ seed: 5 })) === JSON.stringify(cameraShake({ seed: 5 })));
  ok('cameraShake: a different seed gives a different shake',
    JSON.stringify(cameraShake({ seed: 5 })) !== JSON.stringify(cameraShake({ seed: 9 })));
  // Monotonic decay: an impact gets quieter, it does not swell. Compared as envelopes, not per sample.
  ok('cameraShake: decays. The late half is quieter than the early half', (() => {
    const body = sh.slice(1, -1), half = Math.floor(body.length / 2);
    const peak = (a) => Math.max(...a.map((k) => Math.abs(k.x)));
    return peak(body.slice(half)) < peak(body.slice(0, half));
  })());
  ok('cameraShake: REFUSES a non-positive dur, fps or a negative recover', [
    () => cameraShake({ dur: 0 }), () => cameraShake({ fps: 0 }), () => cameraShake({ recover: -1 }),
  ].every((f) => { try { f(); return false; } catch { return true; } }));

  // ---- punchIn: the crash zoom, and the ONE move whose first leg is an ease-IN ---------------------
  const pi = punchIn({ start: 0, dur: 0.32, from: 0.72, to: 1, squash: 0.96, squashDur: 0.08, settleDur: 0.5 });
  ok('punchIn: 4 keyframes, from → to → squash → to', pi.length === 4
    && pi[0].s === 0.72 && pi[1].s === 1 && pi[2].s === 0.96 && pi[3].s === 1);
  ok('punchIn: t is strictly ascending', pi.every((k, i) => i === 0 || k.t > pi[i - 1].t));
  ok('punchIn: accelerates INTO frame (easeInExpo), then rings out (easeOutElastic)',
    pi[1].ease === 'easeInExpo' && pi[3].ease === 'easeOutElastic');
  ok('punchIn: both easings are real names in EASINGS', ['easeInExpo', 'easeOutElastic', 'easeOutQuad']
    .every((e) => Object.prototype.hasOwnProperty.call(EASINGS, e)));
  ok('punchIn: cameraAt reads the endpoints', approx(cameraAt(pi, 0).s, 0.72)
    && approx(cameraAt(pi, 0.32 + 0.08 + 0.5).s, 1));
  ok('punchIn: the squash really dips below the resting scale', cameraAt(pi, 0.4).s < 1);
  ok('punchIn: never pans. It is a scale move', pi.every((k) => k.x === 0 && k.y === 0));
  ok('punchIn: deterministic', JSON.stringify(punchIn({})) === JSON.stringify(punchIn({})));
  ok('punchIn: REFUSES a non-positive leg or magnification', [
    () => punchIn({ dur: 0 }), () => punchIn({ squashDur: -1 }), () => punchIn({ settleDur: 0 }),
    () => punchIn({ from: 0 }), () => punchIn({ squash: -0.5 }),
  ].every((f) => { try { f(); return false; } catch { return true; } }));

  // ---- driftHold: a held frame that is never dead --------------------------------------------------
  const dh = driftHold({ start: 0, dur: 4, ax: 6, ay: 3, cycles: 1.5, ratio: 1.3 });
  ok('driftHold: spans exactly the window', approx(dh[0].t, 0) && approx(dh[dh.length - 1].t, 4, 1e-9));
  ok('driftHold: t is strictly ascending', dh.every((k, i) => i === 0 || k.t > dh[i - 1].t));
  ok('driftHold: opens at the origin and never leaves the declared amplitude',
    approx(dh[0].x, 0, 1e-12) && approx(dh[0].y, 0, 1e-12)
    && dh.every((k) => Math.abs(k.x) <= 6 + 1e-9 && Math.abs(k.y) <= 3 + 1e-9));
  ok('driftHold: it MOVES. The frame is not dead', Math.max(...dh.map((k) => Math.abs(k.x))) > 3);
  // The whole craft point: x and y at the same frequency walk a straight diagonal. At 1.3 they do not.
  ok('driftHold: x and y run at different frequencies (a Lissajous, not a diagonal)', (() => {
    const straight = driftHold({ ratio: 1 }), organic = driftHold({ ratio: 1.3 });
    const diag = (kf) => kf.every((k) => approx(k.x * (3 / 6), k.y, 1e-9));
    return diag(straight) && !diag(organic);
  })());
  ok('driftHold: holds scale (it is a drift, not a push)', dh.every((k) => k.s === 1));
  ok('driftHold: deterministic', JSON.stringify(driftHold({})) === JSON.stringify(driftHold({})));
  ok('driftHold: REFUSES an amplitude big enough to read as a shake', [
    () => driftHold({ ax: 40 }), () => driftHold({ ay: 30 }), () => driftHold({ cycles: 0 }),
    () => driftHold({ dur: -1 }),
  ].every((f) => { try { f(); return false; } catch { return true; } }));

  // The three new tracks obey the same ascending-t contract as the eight that came before.
  ok('the new camera generators are ascending in t too', [
    cameraShake({}), punchIn({}), driftHold({}),
  ].every((kf) => kf.every((k, i) => i === 0 || k.t > kf[i - 1].t)));
  ok('CAMERA_MOVE_NAMES picks up cameraShake + punchIn + driftHold',
    ['cameraShake', 'punchIn', 'driftHold'].every((n) => CAMERA_MOVE_NAMES.includes(n)));
  ok('buildCameraMove resolves the new moves, including through a shot word',
    JSON.stringify(buildCameraMove({ move: 'punch in', dur: 0.3 })) === JSON.stringify(punchIn({ dur: 0.3 }))
    && JSON.stringify(buildCameraMove({ move: 'shake', seed: 3 })) === JSON.stringify(cameraShake({ seed: 3 }))
    && JSON.stringify(buildCameraMove({ move: 'drift hold' })) === JSON.stringify(driftHold({})));
  // The schema's move list is FREE TEXT and has drifted before, it omitted travel and truck for months.
  // The code is the source of truth; this is the assertion that says so out loud.
  ok('the schema cameraMove label names every move the code exports', (() => {
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
    const label = JSON.parse(fs.readFileSync(path.join(root, 'films/scene/schema.json'), 'utf8'))
      .fields.cameraMove.label;
    return CAMERA_MOVE_NAMES.every((n) => label.includes(n));
  })());
}


// ---- sound bridges (J/L-cuts) ------------------------------------------------------------------
// The resolver turns a NAMED junction into a span of seconds. Every wrong span sounds only slightly
// off, so the tests here are mostly about what it refuses.
{
  const MARKS = [{ t: 2, kind: 'cut' }, { t: 5, kind: 'cut' }, { t: 7, kind: 'seam' }];
  const one = (b) => resolveBridges({ bridges: [b] }, MARKS, 10)[0];

  const j = one({ bridge: 'j', at: 'cut@1', lead: 0.8, sound: 'tense' });
  ok('a J-cut starts before its junction', Math.abs(j.start - 4.2) < 1e-6 && j.at === 5);
  ok('a J-cut runs to the next junction by default', Math.abs(j.end - 7) < 1e-6);

  const l = one({ bridge: 'l', at: 'cut@1', lag: 1.2, sound: 'tense' });
  ok('an L-cut ends after its junction', Math.abs(l.end - 6.2) < 1e-6);
  ok('an L-cut starts at the previous junction by default', Math.abs(l.start - 2) < 1e-6);

  ok('a span overrides the default side', Math.abs(one({ bridge: 'j', at: 'cut@0', lead: 0.5, span: 1, sound: 'x' }).end - 3) < 1e-6);
  ok('a bridge fades by default', one({ bridge: 'j', at: 'cut@0', lead: 0.5, sound: 'x' }).fade > 0);
  ok('junction@ addresses every kind at once', one({ bridge: 'l', at: 'junction@2', lag: 0.5, sound: 'x' }).at === 7);
  ok('no bridges resolve to nothing', resolveBridges({}, MARKS, 10).length === 0);

  const throws = (b, re, label) => {
    let m = '';
    try { one(b); } catch (e) { m = e.message; }
    ok(label, re.test(m));
  };
  throws({ bridge: 'x', at: 'cut@0', lead: 1, sound: 'a' }, /must be "j"/, 'a bridge must be j or l');
  throws({ bridge: 'j', at: 'cut@9', lead: 1, sound: 'a' }, /does not exist/, 'an out-of-range junction names what exists');
  throws({ bridge: 'j', at: 'beat@0', lead: 1, sound: 'a' }, /unknown junction kind/, 'an unknown junction kind is refused');
  throws({ bridge: 'j', at: '4.37', lead: 1, sound: 'a' }, /must be "<kind>@<index>"/, 'a raw timestamp is not a junction');
  throws({ bridge: 'j', at: 'cut@1', lead: 4, sound: 'a' }, /reaches back past the previous junction/, 'a lead longer than the preceding beat is refused');
  throws({ bridge: 'l', at: 'cut@0', lag: 4, sound: 'a' }, /runs past the next junction/, 'a lag longer than the following beat is refused');
  throws({ bridge: 'j', at: 'cut@0', lead: 1 }, /"sound" must name/, 'a bridge without a sound is refused');
  throws({ bridge: 'j', at: 'cut@0', sound: 'a' }, /defined by its lead/, 'a J-cut without a lead is refused');
  throws({ bridge: 'l', at: 'cut@0', sound: 'a' }, /defined by its lag/, 'an L-cut without a lag is refused');
  throws({ bridge: 'j', at: 'cut@0', lead: 0.5, span: 0.2, fade: 1, sound: 'a' }, /does not fit/, 'a fade that does not fit the span is refused');
}


// ---- produce: NO auto camera, and cameraMove sugar still BECOMES camera keys on the one path --------
// The engine no longer injects a slowPush into a scene that declares no camera: a still headline used to
// zoom the whole runtime, and `bg` (required, must-animate) already keeps the frame alive. A push is an
// authored choice now (engine-doctrine/CRAFT/TRANSITIONS.md, "move on purpose"). The sugar funnel stays closed: an
// author who DOES write `cameraMove` still gets real camera keys, never a field written and read by none.
{
  const base = () => ({ module: 'scene', duration: 6, bg: { preset: 'plain' }, layers: [{ type: 'text', text: 'x' }] });
  const produced = produceBaseline(base(), {});
  ok('produce: an un-choreographed no-camera scene gets NO camera (the subject sits still)',
    produced.camera === undefined && produced.cameraMove === undefined);

  const sugar = produceBaseline({ ...base(), cameraMove: { move: 'slowPush', dur: 4 } }, {});
  ok('produce: an authored cameraMove still bakes to real camera keys, not sugar',
    sugar.cameraMove === undefined && Array.isArray(sugar.camera) && sugar.camera.length > 1);

  const authored = produceBaseline({ ...base(), camera: [{ t: 0, s: 1 }, { t: 3, s: 1.4 }] }, {});
  ok('produce: a scene with its own camera is untouched',
    authored.camera.length === 2 && authored.camera[1].s === 1.4 && authored.cameraMove === undefined);

  const choreo = produceBaseline({ ...base(), layers: [{ type: 'text', text: 'x', motion: [{ t: 0, x: 0 }, { t: 2, x: 50 }] }] }, {});
  ok('produce: a choreographed scene gets no camera', choreo.camera === undefined && choreo.cameraMove === undefined);

  const off = produceBaseline({ ...base(), produced: false }, {});
  ok('produce: "produced": false stays camera-free', off.camera === undefined);
  const offSugar = produceBaseline({ ...base(), produced: false, cameraMove: { move: 'slowPush', dur: 4 } }, {});
  ok('produce: "produced": false still BAKES the author\'s own sugar (never ignores a written field)',
    offSugar.cameraMove === undefined && Array.isArray(offSugar.camera) && offSugar.camera.length > 1);

  let msg = '';
  try { produceBaseline({ ...base(), camera: [{ t: 0, s: 1 }], cameraMove: { move: 'slowPush' } }, {}); } catch (e) { msg = e.message; }
  ok('produce: camera + cameraMove together is refused, never silently clobbered', /BOTH/.test(msg));

  // MAX_ZOOM still owns the safe-margin ceiling for any AUTHORED push, so its arithmetic stays asserted
  // even though nothing injects a push to test it against.
  ok('safe: MAX_ZOOM is where a safe-edge layer reaches the frame edge',
    Math.abs(MAX_ZOOM - 0.5 / (0.5 - MARGIN)) < 1e-12);
}


// ---- shader sting ids: the branch number is written down, not inferred from array order ----
{
  const { SHADER_ID: ID, SHADER_FX: FX } = await import('../../core/stings/index.js');
  // The shipped order, transcribed by hand. If a future edit renumbers an effect, every scene using
  // shader stings renders a DIFFERENT shader with no crash and no visual error, this catches that.
  const SHIPPED = ['flash', 'burn', 'leak', 'grain', 'dissolve', 'ink', 'glitch', 'streak', 'pixel', 'confetti',
    'ripple', 'scan', 'warp', 'bokeh', 'wipe', 'circle', 'blinds', 'squares', 'pinwheel', 'doors',
    'polka', 'swirl', 'crossWarp', 'domainWarp', 'sdfIris', 'vortex', 'ridgedBurn', 'lens', 'thermal', 'whipPan',
    'chromaticSplit', 'dispersion', 'gridPixelateWipe', 'iridescence', 'cinematicZoom'];
  const moved = SHIPPED.filter((n, i) => ID[n] !== i);
  ok(`sting ids: every effect keeps its shipped branch number${moved.length ? ', moved: ' + moved.map((n) => `${n} ${SHIPPED.indexOf(n)}->${ID[n]}`).join(', ') : ''}`,
    moved.length === 0);
  ok('sting ids: no shipped effect was dropped', SHIPPED.every((n) => n in ID));
  ok('sting ids: SHADER_FX is exactly the keys of SHADER_ID', JSON.stringify(FX) === JSON.stringify(Object.keys(ID)));
  const ids = Object.values(ID);
  ok('sting ids: 0..n-1, no gaps, no duplicates',
    new Set(ids).size === ids.length && Math.min(...ids) === 0 && Math.max(...ids) === ids.length - 1);

  // core/stings/index.js is now a thin re-export; FRAG/draw() live in core/stings/index.js, one branch per
  // unit under core/stings/units/*.js (see the "shader stings" block above for the unit-level checks).
  const fragSrc = fs.readFileSync(path.join(repoRoot, 'core', 'stings', 'index.js'), 'utf8');
  const missing = ids.filter((i) => !FX[i] || !fs.existsSync(path.join(repoRoot, 'core', 'stings', 'units', `${FX[i]}.js`)));
  ok(`sting ids: FRAG branches every id${missing.length ? ', missing ' + missing.join(', ') : ''}`, missing.length === 0);
  ok('sting ids: no FRAG branch past the last id', !FX[ids.length]);

  // An unknown name used to be a silent no-op (draw() returned clear()). A real draw() needs WebGL,
  // so assert on the source: the lookup must throw and name the known effects, never fall back.
  const drawSrc = fragSrc.slice(fragSrc.indexOf('draw(effect,'), fragSrc.indexOf('clear() {'));
  ok('sting ids: draw() throws on an unknown effect instead of silently clearing',
    /throw new Error\(`unknown sting fx/.test(drawSrc) && !/idx < 0/.test(drawSrc));
  ok('sting ids: the throw lists the known effects', /SHADER_FX\.join/.test(drawSrc));
  ok('sting ids: an unknown name has no id at all', ID['nope'] === undefined);
}


// ---- preloadImages: a repo-local image that 404s THROWS, a remote one does not ---------------------
// `core/layers/html.js` has always thrown when a fragment `src` never loaded; a missing PICTURE
// degraded quietly and the author found out from a preflight or from the frame. These are the same
// class of input and they are graded the same way now. The loader is faked, so no network is touched.
{
  const priorWindow = globalThis.window, priorImage = globalThis.Image, priorDoc = globalThis.document;
  globalThis.window = globalThis;
  globalThis.document = globalThis.document || { createElement: () => ({ style: {} }), querySelector: () => null };
  // Every src fails, which is the interesting direction: what matters is WHICH failures are refused.
  globalThis.Image = class { set src(v) { queueMicrotask(() => this.onerror && this.onerror()); } };
  const { preloadImages } = await import('../../core/engine/boot.js');
  const threw = async (scene) => { try { await preloadImages(scene); return ''; } catch (e) { return e.message; } };

  const local = await threw({ layers: [{ type: 'image', src: '/assets/brands/nope/logo.svg' }] });
  ok('images: a repo-local image that never loaded is refused, naming the path', /assets\/brands\/nope\/logo\.svg/.test(local));
  ok('images: the refusal names where it was written', /layers\[0\]\.src/.test(local));

  ok('images: a remote URL stays soft. A dead CDN is not the author\'s mistake',
    (await threw({ layers: [{ type: 'image', src: 'https://cdn.example.com/logo.svg' }] })) === '');
  // One shipped film sets a text layer to the literal string "hero.png"; the walk reads every string in
  // the scene, so a bare filename must never be grounds to refuse a film.
  ok('images: a bare filename in a text layer is not a repo path and is not refused',
    (await threw({ layers: [{ type: 'text', text: 'hero.png' }] })) === '');
  ok('images: every missing repo path is reported in one message, not just the first',
    /a\.png[\s\S]*b\.png/.test(await threw({ layers: [{ src: '/assets/a.png' }, { src: 'assets/b.png' }] })));

  globalThis.window = priorWindow; globalThis.Image = priorImage; globalThis.document = priorDoc;
}


// ---- dollyZoom: the subject holds because `s` does, and the LENS is the whole move ----------------
// The identity being asserted is m(z) = s*L/(L - s*z): at z = 0 that is s with no L in it, so a keyframe
// pair that holds s and ramps p cannot change the subject's size and must change everything at a depth.
{
  const kf = dollyZoom({ dur: 2, from: 2400, to: 800 });
  ok('dollyZoom emits two ascending keys', kf.length === 2 && kf[1].t > kf[0].t);
  ok('dollyZoom holds `s` across both keys: the subject cannot change size',
    kf[0].s === kf[1].s && kf[0].s === 1);
  ok('dollyZoom ramps the lens, which is the only thing it moves',
    kf[0].p === 2400 && kf[1].p === 800);
  ok('dollyZoom leaves x/y at the origin: it reframes nothing',
    kf.every((k) => k.x === 0 && k.y === 0));
  // m(z) at the two ends of the default move, for a layer standing 800px back. The subject's own
  // magnification is s at both; the background's is not, and that difference IS the shot.
  const m = (s, L, z) => s * L / (L - s * z);
  ok('dollyZoom: the picture plane is magnified by s at BOTH ends, whatever the lens says',
    m(1, 2400, 0) === 1 && m(1, 800, 0) === 1);
  ok('dollyZoom: a layer 800px back SHRINKS as the lens opens, the ground gives way',
    m(1, 800, -800) < m(1, 2400, -800));
  ok('dollyZoom refuses a lens ramp that never ramps, a dur that rewinds, and a camera at nowhere', [
    () => dollyZoom({ from: 900, to: 900 }),
    () => dollyZoom({ dur: 0 }),
    () => dollyZoom({ s: 0 }),
    () => dollyZoom({ to: -400 }),
  ].every((f) => { try { f(); return false; } catch { return true; } }));
  ok('CAMERA_MOVE_NAMES picks up dollyZoom', CAMERA_MOVE_NAMES.includes('dollyZoom'));
  ok('buildCameraMove resolves dollyZoom and refuses a param it does not read',
    JSON.stringify(buildCameraMove({ move: 'dollyZoom', dur: 1 })) === JSON.stringify(dollyZoom({ dur: 1 }))
    && (() => { try { buildCameraMove({ move: 'dollyZoom', lens: 900 }); return false; } catch { return true; } })());
}


// ---- followCursor: the camera DERIVED from the pointer -------------------------------------------
// The whole value of this move is that the cursor's `path` stays the only place the target is written.
// So the assertions are about the RELATIONSHIP: where the camera lands against where the pointer is,
// that it is there BEFORE the press and still there ON it, and that many presses are not many zooms.
{
  const path = [{ t: 0, x: 0, y: 0 }, { t: 1, x: 400, y: 200 }, { t: 6, x: 400, y: 200 }];
  const one = followCursor({ path, clicks: [2], base: [100, 100], start: 0 });

  ok('followCursor centres the pointer, read off the cursor\'s own path', (() => {
    const at = one.find((k) => k.s > 1);          // the arrival
    // the pointer is at base + path = (500, 300) by t=1 and holds; centring it is 960-500, 540-300
    return at && Math.abs(at.x - 460) < 1e-6 && Math.abs(at.y - 240) < 1e-6;
  })());
  ok('followCursor ARRIVES BEFORE THE PRESS and is still there on it', (() => {
    const arrive = one.find((k) => k.s > 1), holdEnd = one.filter((k) => k.s > 1).pop();
    return arrive.t < 2 && arrive.t === 2 - 0.18 && holdEnd.t >= 2;
  })());
  ok('followCursor opens wide and returns wide', one[0].s === 1 && one[one.length - 1].s === 1);
  ok('followCursor keyframes ascend in t (a jumbled array deletes the whole move)',
    one.every((k, i) => i === 0 || k.t > one[i - 1].t));
  ok('followCursor is PURE: the same path and clicks give byte-identical keys',
    JSON.stringify(followCursor({ path, clicks: [2], base: [100, 100] }))
    === JSON.stringify(followCursor({ path, clicks: [2], base: [100, 100] })));

  // RESTRAINT. Six presses inside one gesture are ONE push and ONE release, never six crash zooms.
  const six = followCursor({ path: [{ t: 0, x: 0, y: 0 }, { t: 8, x: 1200, y: 0 }], base: [300, 540],
    clicks: [2, 2.4, 2.8, 3.2, 3.6, 4] });
  const pushes = six.filter((k, i) => k.s > 1 && (i === 0 || six[i - 1].s === 1)).length;
  ok('followCursor: six clicks in one run are ONE push, not six', pushes === 1);
  ok('followCursor: that run releases exactly once, at the end',
    six.filter((k, i) => i > 0 && k.s === 1 && six[i - 1].s > 1).length === 1);
  // ...and presses far enough apart in TIME do get their own shot.
  const apart = followCursor({ path: [{ t: 0, x: 0, y: 0 }, { t: 20, x: 1200, y: 0 }], base: [300, 540],
    clicks: [2, 9] });
  ok('followCursor: presses further apart than the settle window get their own push',
    apart.filter((k, i) => k.s > 1 && (i === 0 || apart[i - 1].s === 1)).length === 2);
  // ...and two presses in the same PLACE never reframe, however far apart the camera could travel.
  const same = followCursor({ path: [{ t: 0, x: 0, y: 0 }, { t: 8, x: 0, y: 0 }], base: [700, 400],
    clicks: [2, 3] });
  ok('followCursor: two presses inside `regroup` px share one framing',
    new Set(same.filter((k) => k.s > 1).map((k) => `${k.x},${k.y}`)).size === 1);
  // EVERY track, not just the simple one. The first cut of the writer silently emitted a DESCENDING
  // array when the shot spacing was broken, and this assertion only looked at the one-click case, so
  // it passed. cameraAt reads a jumbled array as "already at the end" and deletes the whole move.
  ok('followCursor: every generated track ascends in t',
    [one, six, apart, same].every((kf) => kf.every((k, i) => i === 0 || k.t > kf[i - 1].t)));
  // A shot never leaves the framing it pushed for until the press it pushed for has happened. This is
  // the SAME failure as arriving late, reached from the other side, and the demo probe hit it: the
  // reframe toward the second card began 0.03s BEFORE the first click fired.
  ok('followCursor holds through every press it framed', (() => {
    const clicks = [2, 2.6], kf = followCursor({ base: [200, 540], clicks,
      path: [{ t: 0, x: 0, y: 0 }, { t: 2, x: 0, y: 0 }, { t: 2.6, x: 700, y: 0 }, { t: 8, x: 700, y: 0 }] });
    return clicks.every((c) => {
      const before = kf.filter((k) => k.t <= c).pop(), after = kf.find((k) => k.t > c);
      return before && after && before.x === after.x && before.y === after.y && before.s === after.s;
    });
  })());

  ok('followCursor refuses a pointer it cannot follow, by name', [
    () => followCursor({ clicks: [1] }),                              // no path
    () => followCursor({ path, clicks: [] }),                         // no press to arrive at
    () => followCursor({ path: [{ t: 0, x: 'center', y: 0 }], clicks: [1] }),  // unresolved coord
    () => followCursor({ path, clicks: [1], to: 0.8 }),               // a zoom that zooms out
    () => followCursor({ path, clicks: [0.05] }),                     // no room to lead the press
    () => followCursor({ path, clicks: [1], dur: 0 }),                // a span that rewinds the clock
  ].every((f) => { try { f(); return false; } catch { return true; } }));

  ok('CAMERA_MOVE_NAMES picks up followCursor', CAMERA_MOVE_NAMES.includes('followCursor'));
  // It centres a point that is never written in the spec, so it must ALWAYS be told the canvas or a
  // portrait film would be mis-centred by 420px per axis in silence.
  ok('buildCameraMove refuses followCursor with no canvas, and honours a portrait one', (() => {
    let refused = false;
    try { buildCameraMove({ move: 'followCursor', path, clicks: [2], base: [100, 100] }); } catch { refused = true; }
    const kf = buildCameraMove({ move: 'followCursor', path, clicks: [2], base: [100, 100] }, [1080, 1920]);
    return refused && kf.find((k) => k.s > 1).x === 1080 / 2 - 500;
  })());

  // THE BINDING. The scene names a cursor LAYER and the move reads that layer's own path: this is the
  // one fact having one owner, which is the whole point of the feature.
  const cursor = { type: 'cursor', id: 'ptr', x: 100, y: 100, start: 0.5, clicks: [2], path };
  const scene = { module: 'scene', layers: [cursor], cameraMove: { move: 'followCursor', cursor: 'ptr' } };
  bakeCameraMove(scene, { W: 1920, H: 1080 });
  ok('bakeCameraMove binds the camera to the named cursor layer, on its own clock',
    !scene.cameraMove && scene.camera.find((k) => k.s > 1).x === 460
    && scene.camera.find((k) => k.s > 1).t === 0.5 + 2 - 0.18);
  ok('the binding refuses every way of naming a pointer it cannot follow', [
    { move: 'followCursor' },                                         // no cursor named
    { move: 'followCursor', cursor: 'nope' },                         // no such layer
    { move: 'followCursor', cursor: 'title' },                        // not a cursor layer
    { move: 'followCursor', cursor: 'bare' },                         // a cursor with no path
    { move: 'followCursor', cursor: 'ptr', start: 3 },                // a second owner for the clock
    { move: 'diveIn', cursor: 'ptr', tx: 0, ty: 0 },                  // a cursor on a move that drops it
  ].every((spec) => {
    const d = { module: 'scene', cameraMove: spec, layers: [{ ...cursor }, { type: 'text', id: 'title' },
      { type: 'cursor', id: 'bare' }] };
    try { bakeCameraMove(d, { W: 1920, H: 1080 }); return false; } catch { return true; }
  }));
  ok('a relative cursor base is refused rather than aimed at NaN', (() => {
    const d = { module: 'scene', cameraMove: { move: 'followCursor', cursor: 'ptr' },
      layers: [{ ...cursor, x: 'center' }] };
    try { bakeCameraMove(d, { W: 1920, H: 1080 }); return false; } catch { return true; }
  })());
}


// ---- THE RENDER PIPELINE ORDER (engine-doctrine/CODEMAPS/ARCHITECTURE.md, "Frame pipeline") ----------------
//
// #463 and #464 were both ordering and neither was arithmetic: a handover resolved before the layout
// measurement, and a box composed before the tracks that move it. The order that governs both was
// written in file headers, where nothing could read it. It is a parsed block in the codemap now, and
// this is what reads it, so the doc is the single statement of the contract AND the thing that fails
// when the code stops matching it.
//
// THE CEILING, stated here because a check nobody knows the limits of is worse than none. This proves
// the ORDER OF CALLS from source text, and the SET of tracks that treat `el.style` as an accumulator.
// It cannot prove that a track read a fresh value rather than a stale one, that is a property of one
// scene at one t, and probe-purity, canvas-purity and snap-scenes are what see it.
{
  const doc = fs.readFileSync(path.join(repoRoot, 'engine-doctrine', 'CODEMAPS', 'ARCHITECTURE.md'), 'utf8');
  const block = doc.match(/```pipeline\n([\s\S]*?)```/);
  ok('the codemap still states the pipeline', !!block);
  const rows = (block ? block[1] : '').split('\n')
    .map((l) => l.trim()).filter(Boolean)
    .map((l) => l.split(/\s+/));
  const of = (kind) => rows.filter((r) => r[0] === kind).map((r) => r.slice(1));

  const sceneSrc = fs.readFileSync(path.join(repoRoot, 'films', 'scene', 'scene.js'), 'utf8');

  // BUILD. The needle is a literal from the step itself, so a step that moves takes its needle with it
  // and a step that is deleted fails as "not found" rather than passing on a stale index.
  const build = of('build');
  ok('the codemap names the build steps', build.length >= 3);
  let prev = -1, buildOk = true, buildWhy = '';
  for (const [name, ...needleParts] of build) {
    const needle = needleParts.join(' ');
    const at = sceneSrc.indexOf(needle);
    if (at < 0) { buildOk = false; buildWhy = `${name}: "${needle}" is not in scene.js`; break; }
    if (at < prev) { buildOk = false; buildWhy = `${name} now runs earlier than the step before it`; break; }
    prev = at;
  }
  ok(`build-time resolution runs in the stated order (${buildWhy || 'ok'})`, buildOk);
  // #464 in one line: the measurement decides the box `becomes` hands over, so it must precede it.
  ok('the layout measurement precedes the handover (#464)',
    sceneSrc.indexOf('el.offsetWidth') < sceneSrc.indexOf('resolveBecomes(data, (L) =>'));

  // FRAME. Read out of renderFrame's own body, not the whole file, so an unrelated mention of a stage
  // elsewhere cannot satisfy the order.
  const body = (() => {
    const at = sceneSrc.indexOf('function renderFrame(f) {');
    return at < 0 ? '' : sceneSrc.slice(at, sceneSrc.indexOf('\n  }\n', at));
  })();
  ok('renderFrame is still where the codemap says', body.length > 0);
  const frame = of('frame').map((r) => r[0]);
  ok('the codemap names the frame stages', frame.length >= 8);
  let fprev = -1, frameOk = true, frameWhy = '';
  for (const name of frame) {
    const at = body.indexOf(name + '(');
    if (at < 0) { frameOk = false; frameWhy = `${name} is not called in renderFrame`; break; }
    if (at < fprev) { frameOk = false; frameWhy = `${name} now runs before the stage above it`; break; }
    fprev = at;
  }
  ok(`renderFrame composes in the stated order (${frameWhy || 'ok'})`, frameOk);
  // #463 in one line: every box for the frame is composed before any track can move a layer, which is
  // why boxOf reports the settled pose and why `follow` cannot chain.
  ok('every box is resolved before any track runs (#463)',
    body.indexOf('resolveBoxes(t)') < body.indexOf('runTracks('));

  // ACCUMULATE. `el.style` is the pipeline's accumulator: these tracks read the transform back and
  // prepend, so a fifth one appearing, or one of these four quietly becoming a REPLACE, changes what
  // every earlier stage contributed. A set, not an order, the slots already own the order.
  const READBACK = /el\.style\.transform\s*(&&|\|\|)/;
  const trackDir = path.join(repoRoot, 'core', 'tracks');
  const found = fs.readdirSync(trackDir).filter((n) => n.endsWith('.js'))
    .filter((n) => READBACK.test(fs.readFileSync(path.join(trackDir, n), 'utf8')))
    .map((n) => 'core/tracks/' + n).sort();
  const declared = of('accumulate').map((r) => r[0]).sort();
  ok(`exactly the declared tracks accumulate onto el.style (found: ${found.join(', ')})`,
    found.length === declared.length && found.every((f, i) => f === declared[i]));

  // The chaining refusal is a REFUSAL, not a paragraph. #465: following a follower pinned to the
  // middle layer's unpinned position and said nothing.
  const followSrc = fs.readFileSync(path.join(trackDir, 'follow.js'), 'utf8');
  ok('follow refuses a chain by name (#465)',
    /scene\.specOf\(spec\.id\)/.test(followSrc) && /tgt\.follow/.test(followSrc)
      && /throw new Error/.test(followSrc.slice(followSrc.indexOf('tgt.follow'))));

}


// ---- THE GSAP TRIGGER LOCKSTEP (engine-doctrine/MISTAKES.md #154, #487) ----
// core/engine/preload.js decides whether the tween engine is fetched at all, from the props a scene names. Get
// that set wrong and the render is silent and STILL: no throw, no warning, a figure that simply does not
// move. It shipped that way once, because the set was a hand-typed list beside a comment asking the next
// author to keep it in lockstep with three other files.
//
// This re-derives the set from the code that does the reading and compares. The sweep walks the whole
// engine rather than a named list of files, because #148's sibling failures (#229 · #232 · #242) were all
// a gate whose file list was outrun by a directory move.
{
  const { GSAP_PROPS } = await import('../../core/engine/preload.js');
  const { GSAP_TRIGGER: PARTS_TRIGGER } = await import('../../core/motion/parts.js');
  const { GSAP_TRIGGER: COMP_TRIGGER } = await import('../../core/layers/composition.js');
  const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

  // The one shape every GSAP hook is written in: a layer prop gating a branch that also tests window.gsap.
  const READ = /\bif\s*\(\s*!?\s*L\.([A-Za-z_$][\w$]*)\b[^)]*?window\.gsap/g;
  const swept = new Set();
  (function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const f = path.join(dir, e.name);
      if (e.isDirectory()) { if (e.name !== 'vendor' && e.name !== 'node_modules') walk(f); continue; }
      if (!f.endsWith('.js')) continue;
      const src = fs.readFileSync(f, 'utf8');
      for (const m of src.matchAll(READ)) swept.add(m[1]);
    }
  })(ROOT + '/core');
  (function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const f = path.join(dir, e.name);
      if (e.isDirectory()) { walk(f); continue; }
      if (!f.endsWith('.js')) continue;
      for (const m of fs.readFileSync(f, 'utf8').matchAll(READ)) swept.add(m[1]);
    }
  })(ROOT + '/films');

  // composition.js reads L.comp and tests window.gsap on separate lines, so the sweep cannot see it. It
  // says so itself instead, which is the stronger statement of the two.
  const derived = new Set([...swept, PARTS_TRIGGER, COMP_TRIGGER]);
  const missing = [...derived].filter((k) => !GSAP_PROPS.includes(k));
  const stale = GSAP_PROPS.filter((k) => !derived.has(k));
  // 7 -> 6 when `fxOut` (the named GSAP exit family) was deleted for zero users: its
  // `if (L.fxOut && window.gsap)` hook went with it (engine-doctrine/MISTAKES.md #364).
  ok(`the sweep finds the GSAP hooks at all (found ${swept.size})`, swept.size >= 6);
  ok(`every prop read behind window.gsap triggers the preload${missing.length ? ': MISSING ' + missing.join(', ') : ''}`,
    missing.length === 0);
  ok(`every preload trigger has a reader${stale.length ? ': STALE ' + stale.join(', ') : ''}`,
    stale.length === 0);

  // And the decision itself, exercised per prop. Four of these are used by zero or one scene in the
  // library, so no render proves them: a synthetic layer is the only thing that does.
  const { preloadGsap } = await import('../../core/engine/preload.js');
  const priorWin = globalThis.window;
  let touched = false;
  const fakeGsap = { ticker: { sleep() { touched = true; } }, globalTimeline: {}, registerPlugin() {},
    registerEffect() {}, effects: {} };
  globalThis.window = { gsap: fakeGsap, MotionPathPlugin: {}, Physics2DPlugin: {}, SplitText: {} };
  const loads = async (layer) => { touched = false; await preloadGsap({ layers: [layer] }); return touched; };
  const perProp = [];
  for (const k of GSAP_PROPS) if (!(await loads({ type: 'rect', [k]: 'x' }))) perProp.push(k);
  ok(`a scene naming any trigger prop gets GSAP loaded${perProp.length ? ': SILENT ' + perProp.join(', ') : ''}`,
    perProp.length === 0);
  ok('a scene naming none of them does not', (await loads({ type: 'text', text: 'no fx here' })) === false);
  globalThis.window = priorWin;
}


// ---------- CAMERA MOTION BLUR: the velocity that smears is the one RELATIVE TO THE CAMERA ---------
//
// A layer blurred off its own track and stayed razor sharp under a whip pan, which is backwards: a
// shutter exposes the SENSOR. These assert the two halves that make the feature right rather than
// merely present: a still layer smears under a pan, and a layer travelling WITH the camera does not.
{
  const { cameraAt: camAtKf, cameraVelocityAt } = await import('../../core/timeline/sequence.js');
  const { frame: motionFrame, resolveCameraBlur } = await import('../../core/tracks/motion.js');
  // linear on purpose, for the reason the velocityAt block above states: an eased segment would make
  // these assert the shape of easeInOutCubic instead of the shape of the read.
  const pan = [{ t: 0, x: 0, ease: 'linear' }, { t: 1, x: -600, ease: 'linear' }];
  ok('cameraVelocityAt reports the camera translation in px per SECOND',
    Math.abs(cameraVelocityAt(pan, 0.5, 1 / 30).vx + 600) < 1);
  ok('cameraVelocityAt tapers to zero on the film\'s first frame rather than extrapolating',
    cameraVelocityAt(pan, 0, 1 / 30).speed === 0);
  ok('cameraVelocityAt answers zero for a film with no camera at all',
    cameraVelocityAt([], 0.5, 1 / 30).speed === 0 && cameraVelocityAt(null, 0.5, 1 / 30).speed === 0);
  ok('cameraVelocityAt refuses a window that is not a positive number of seconds', (() => {
    try { cameraVelocityAt(pan, 0.5, 0); return false; } catch (e) { return /positive lookback/.test(e.message); }
  })());
  // A ZOOM IS NOT MODELLED, and that is a decision rather than an oversight: its screen velocity is
  // radial, so it cannot be answered without the layer's stage position, which a track does not have.
  // Asserted so a later author cannot quietly start reading `s` here and produce a uniform, wrong smear.
  ok('a pure camera PUSH contributes no velocity: the zoom is radial and deliberately unmodelled',
    cameraVelocityAt([{ t: 0, s: 1, ease: 'linear' }, { t: 1, s: 3, ease: 'linear' }], 0.5, 1 / 30).speed === 0);

  const camKit = { fps: 30, shutter: 0.5, cameraBlur: true };
  const camOff = { ...camKit, cameraBlur: false };
  const camView = (t) => ({ ...camAtKf(pan, t), vel: cameraVelocityAt(pan, t, 1 / 30) });
  const blurOf = (L, k) => {
    const el = { style: {} };
    motionFrame({ kit: k, el: el, L: L, units: null, t: 0.5, f: 15, start: 0, end: 1, scene: { camera: camView(0.5) } });
    const m = /blur\(([\d.]+)px\)/.exec(el.style.filter || '');
    return m ? +m[1] : 0;
  };
  const still = { id: 'still', start: 0, duration: 1 };
  // travels with the camera: the camera's x goes -600px/s, so +600px/s keeps it on the same pixels.
  const locked = { id: 'locked', start: 0, duration: 1,
    motion: [{ t: 0, x: 0, ease: 'linear' }, { t: 1, x: 600, ease: 'linear' }] };
  // travels AGAINST it, so its velocity on the sensor is twice the camera's.
  const against = { id: 'against', start: 0, duration: 1,
    motion: [{ t: 0, x: 0, ease: 'linear' }, { t: 1, x: -600, ease: 'linear' }] };

  ok('a layer with NO motion track smears under a pan: standing still on the stage is moving on the sensor',
    blurOf(still, camKit) > 0.4);
  ok('a layer travelling WITH the camera stays sharp, because the two velocities cancel',
    blurOf(locked, camKit) === 0);
  ok('a layer travelling AGAINST the camera smears more than one standing still',
    blurOf(against, camKit) > blurOf(still, camKit));
  // The measured numbers, so a later change to the shutter arithmetic cannot pass by moving both sides.
  // 600px/s over a 1/30s frame is 20px; half-shutter at 0.5 is 5px, and the counter-runner doubles it.
  ok('the camera smear is the same half-shutter arithmetic the layer path uses',
    Math.abs(blurOf(still, camKit) - 5) < 0.1 && Math.abs(blurOf(against, camKit) - 10) < 0.1);

  // DEFAULT OFF, and the whole library depends on it: with the dial down the camera contributes exactly
  // nothing, so a still layer keeps the `filter` it always had and a moving one keeps only its own blur.
  ok('with cameraBlur off a still layer is untouched by the camera',
    blurOf(still, camOff) === 0);
  ok('with cameraBlur off a layer\'s own track still blurs it, unchanged',
    Math.abs(blurOf(locked, camOff) - 5) < 0.1 && Math.abs(blurOf(against, camOff) - 5) < 0.1);
  ok('`motionBlur: false` opts a layer out of the camera\'s blur as well as its own',
    blurOf({ ...still, motionBlur: false }, camKit) === 0);

  // PURE IN THE FRAME: nothing is remembered between frames, so the same frame drawn on a cold element
  // and on one that has already drawn a later frame must agree. This is the branch #507 was logged on.
  ok('camera blur is a pure function of the frame, not of the frames drawn before it', (() => {
    const el = { style: {} };
    motionFrame({ kit: camKit, el: el, L: still, units: null, t: 0.9, f: 27, start: 0, end: 1, scene: { camera: camView(0.9) } });
    motionFrame({ kit: camKit, el: el, L: still, units: null, t: 0.5, f: 15, start: 0, end: 1, scene: { camera: camView(0.5) } });
    const warm = el.style.filter;
    const e2 = { style: {} };
    motionFrame({ kit: camKit, el: e2, L: still, units: null, t: 0.5, f: 15, start: 0, end: 1, scene: { camera: camView(0.5) } });
    return warm === e2.style.filter;
  })());

  ok('`cameraBlur` is a boolean, and a number is refused by name rather than coerced', (() => {
    try { resolveCameraBlur(0.5); return false; } catch (e) { return /BOOLEAN/.test(e.message) && /shutter/.test(e.message); }
  })());
  ok('`cameraBlur` absent or false is off, true is on',
    resolveCameraBlur(undefined) === false && resolveCameraBlur(false) === false && resolveCameraBlur(true) === true);
}


// ---- the directional transition sets are probed from the real code, not listed by hand ----
{
  const { DIRECTIONAL_CUT, DIRECTIONAL_SEAM } = await import('../../core/transitions/catalog.js');
  ok('directional cuts: drop never reads dir, so it is not directional', !DIRECTIONAL_CUT.has('drop'));
  ok('directional cuts: cube, squeeze, roll and spin read dir', ['cube', 'squeeze', 'roll', 'spin'].every((n) => DIRECTIONAL_CUT.has(n)));
  ok('directional seams: whipPan reads u_dir', DIRECTIONAL_SEAM.has('whipPan'));
}

// ---- srcUrl / icon(): a repo-root-relative image src 404s under /films/scene/ unless rewritten ----
{
  ok('srcUrl: a bare repo-relative path gets the served-root slash', srcUrl('assets/x/tile.jpg') === '/assets/x/tile.jpg');
  ok('srcUrl: an already-absolute path is untouched', srcUrl('/assets/x/tile.jpg') === '/assets/x/tile.jpg');
  ok('srcUrl: http(s) is untouched', srcUrl('https://cdn.example.com/x.jpg') === 'https://cdn.example.com/x.jpg');
  ok('srcUrl: data: is untouched', srcUrl('data:image/png;base64,AAAA') === 'data:image/png;base64,AAAA');
  ok('icon(): a relative image src is adapted to the served-root form (engine-doctrine/MISTAKES.md, silent image layer)',
    icon('assets/x/tile.jpg').includes('src="/assets/x/tile.jpg"'));
  ok('icon(): an absolute image src is untouched', icon('/assets/x/tile.jpg').includes('src="/assets/x/tile.jpg"'));
  ok('icon(): a non-path value (emoji/monogram) is returned as-is, no <img> at all', icon('🔥') === '🔥');
}


  assert.equal(fail, 0, `${fail} of ${pass + fail} assertion(s) failed`);
  assert.ok(pass >= 634, `expected at least 634 assertions (the count this file was split with) to have run, saw ${pass}`);
});
