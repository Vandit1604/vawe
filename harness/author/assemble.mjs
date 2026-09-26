import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { storyboardPathFor } from '../../quality/gates/craft-checklist.mjs';
import { parseStoryboard, timeline } from './storyboard-parse.mjs';
import { chainErrors, edges, parseMotion, motionErrors, parseFragmentSpec, fragmentErrors, SPEED_BAND, stagedSchedule, STAGE_S, parseMoveEntries, moveErrors, moveKeys, pathMotion, transitionInErrors, resolvedTransitionIn, parseRecipeLine, recipeErrors, cameraErrors, resolvedCamera, cameraContinuityErrors, arsenalCorpus, useErrors, useWarnings, resolvedUses, useSlotPath } from '../lib/contract.mjs';
import { resolvePx } from '../lib/placement-resolve.mjs';
import { resolveLook } from '../../core/registry/theme-contract.js';
import { isLightBg } from '../../core/color/engine.js';
import { expandThemeFile } from '../lib/theme-load.mjs';
import { sceneDims } from '../../core/layout/safe.js';
import { boundaryMechanism } from '../../core/transitions/lower.js';

const PRESERVED_FILM_FIELDS = ['camera'];


const USE_TOO_LATE = {
  'output target': 'aspect: set the film\'s top-level "aspect" (or --aspect on the CLI) before assemble runs, not per beat.',
  destination: 'destination: set the film\'s top-level "destination" before assemble runs, not per beat.',
};
const USE_SCENE_LEVEL_SLOT = new Set(['energy', 'captionStyle']);

/** ownLayerIdOf(runs) -> (beatIndex) -> the layer id THIS beat's own run built ("scene<run-start+1>"),
 * the default `on=` target every beat always has exactly one of. */
function ownLayerIdOf(runs) {
  return (k) => {
    const run = runs.find(([ri, rj]) => k >= ri && k <= rj);
    return run ? `scene${run[0] + 1}` : null;
  };
}

/** writeUseSlot(target, obj, params) -> error string | null. `obj` is useSlotPath(entry)'s skeleton,
 * one of three shapes a per-layer prop ever takes: plain ({key: value}), one-level-nested
 * ({key: {inner: value}}), or array-push ({key: [{inner: {}}]} or {key: [value]}). */
function writeUseSlot(target, obj, params) {
  const [topKey, topVal] = Object.entries(obj)[0];
  if (Array.isArray(topVal)) {
    if (!Array.isArray(target[topKey])) target[topKey] = [];
    const item = topVal[0];
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      if (Object.keys(params).length) return `"${topKey}[]" takes no key=value params on a bare value.`;
      target[topKey].push(item);
      return null;
    }
    const [innerKey, innerVal] = Object.entries(item)[0];
    target[topKey].push({ [innerKey]: { ...(innerVal && typeof innerVal === 'object' ? innerVal : {}), ...params } });
    return null;
  }
  if (topVal && typeof topVal === 'object') {
    if (!target[topKey] || typeof target[topKey] !== 'object') target[topKey] = {};
    Object.assign(target[topKey], topVal, params);
    return null;
  }
  if (Object.keys(params).length) return `"${topKey}: ${topVal}" is a plain value; it takes no key=value params.`;
  target[topKey] = topVal;
  return null;
}

/** applyLayerType(use, ctx) -> error string | null. `layer type` writes nothing (a layer's type is
 * fixed at creation): it only checks the `on=` layer already IS that type, per the owner's own rule. */
function applyLayerType({ entry, on }, ctx) {
  const targetId = on || ctx.ownId(ctx.k);
  const layer = ctx.layerById.get(targetId);
  if (!layer) return `use: "${entry.name}" on=${targetId || '(none)'}: no layer with that id.`;
  if (layer.type !== entry.name) {
    return `use: layer type "${entry.name}" on=${targetId}: that layer is type "${layer.type}", not `
      + `"${entry.name}". use: cannot change a layer's type; author it directly.`;
  }
  return null;
}

/** applySlotUse(use, obj, ctx) -> error string | null, for every kind reaching a real JSON slot: a bg
 * window, an audio cue, a `three` scene, a scene-level field decided once, or a per-layer prop
 * (default target: the beat's own run layer). */
function applySlotUse({ entry, on, params }, obj, ctx) {
  const topKey = Object.keys(obj)[0];
  if (topKey === 'bg') { ctx.extraBg.push({ from: ctx.start, to: ctx.end, ...obj.bg[0], ...params }); return null; }
  if (topKey === 'audio') { ctx.audioCues.push({ t: ctx.start, ...obj.audio.cues[0], ...params }); return null; }
  const targetId = on || ctx.ownId(ctx.k);
  if (topKey === 'three') {
    const layer = ctx.layerById.get(targetId);
    if (!layer) return `use: "${entry.name}" on=${targetId || '(none)'}: no layer with that id.`;
    layer.three = obj.three;
    return null;
  }
  if (!on && USE_SCENE_LEVEL_SLOT.has(topKey)) {
    const val = obj[topKey];
    const prev = ctx.sceneLevelSet[topKey];
    if (prev && prev.value !== val) {
      return `use: "${entry.name}" sets top-level ${topKey}="${val}", but beat ${prev.beat + 1} already set `
        + `it to "${prev.value}". A film-level field is decided once.`;
    }
    ctx.sceneLevelSet[topKey] = { value: val, beat: ctx.k };
    return null;
  }
  const layer = ctx.layerById.get(targetId);
  if (!layer) {
    return `use: "${entry.name}" on=${targetId || '(none)'}: no layer with that id. Known ids: `
      + `${[...ctx.layerById.keys()].join(', ') || '(none)'}.`;
  }
  return writeUseSlot(layer, obj, params);
}

/** writeUses(beats, corpus, layers) -> {extraBg, audioCues, sceneLevelSet, cameraBlurSet, useConflicts}.
 * The one call site every `use:` line's resolution reaches; each per-beat error is already impossible
 * for a line useErrors passed (assemble re-validates before this runs, same as every other field). */
function writeUses(beats, corpus, { htmlLayers, objectLayer, preserved, runs, shiftedStart, shiftedEnd, scene }) {
  const allLayers = objectLayer ? [...htmlLayers, objectLayer, ...preserved] : [...htmlLayers, ...preserved];
  const ctx = {
    layerById: new Map(allLayers.filter((l) => l && l.id).map((l) => [l.id, l])),
    ownId: ownLayerIdOf(runs),
    extraBg: [], audioCues: Array.isArray(scene.audio && scene.audio.cues) ? [...scene.audio.cues] : [],
    sceneLevelSet: {}, k: 0, start: 0, end: 0,
  };
  let cameraBlurSet = null;
  const useConflicts = [];
  beats.forEach((b, k) => {
    ctx.k = k; ctx.start = shiftedStart[k]; ctx.end = shiftedEnd[k];
    for (const use of resolvedUses(b, corpus)) {
      const { entry } = use;
      const prefix = `beat ${k + 1} (${b.name})`;
      let e = null;
      if (USE_TOO_LATE[entry.kind]) e = `${entry.name} (${entry.kind}): ${USE_TOO_LATE[entry.kind]}`;
      else if (entry.kind === 'camera dial') cameraBlurSet = cameraBlurSet || { beat: k };
      else if (entry.kind === 'layer type') e = applyLayerType(use, ctx);
      else {
        const obj = useSlotPath(entry);
        e = obj ? applySlotUse(use, obj, ctx)
          : `"${entry.name}" (${entry.kind}) has no plain JSON path (slot "${entry.slot}"): set it by hand where that field lives.`;
      }
      if (e) useConflicts.push(`${prefix} use: ${e}`);
    }
  });
  return { extraBg: ctx.extraBg, audioCues: ctx.audioCues, sceneLevelSet: ctx.sceneLevelSet, cameraBlurSet, useConflicts };
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const film = process.argv[2];
if (!film || !fs.existsSync(film)) { console.error('usage: node harness/author/assemble.mjs <film.json>'); process.exit(1); }

const scene = JSON.parse(fs.readFileSync(film, 'utf8'));
const sbPath = storyboardPathFor(film);
if (!fs.existsSync(sbPath)) { console.error(`assemble: no storyboard at ${sbPath}`); process.exit(1); }
const sbSrc = fs.readFileSync(sbPath, 'utf8');
const sb = parseStoryboard(sbSrc);
const { beats } = timeline(sb);

const errs = chainErrors(beats);
if (errs.length) {
  console.error(`assemble: the continuous-object contract does not chain (\`make contract D=${film}\` for detail):`);
  for (const e of errs) console.error(`  ✗ ${e}`);
  process.exit(1);
}
const motionErrs = motionErrors(beats);
if (motionErrs.length) {
  console.error(`assemble: the motion plan does not parse (\`make contract D=${film}\` for detail):`);
  for (const e of motionErrs) console.error(`  ✗ ${e}`);
  process.exit(1);
}
const fragmentErrs = fragmentErrors(beats);
if (fragmentErrs.length) {
  console.error(`assemble: a fragment: placement does not parse:`);
  for (const e of fragmentErrs) console.error(`  ✗ ${e}`);
  process.exit(1);
}
const moveErrs = moveErrors(beats);
if (moveErrs.length) {
  console.error(`assemble: a move: does not parse (\`make arsenal SHAPE=<name>\` lists the shapes):`);
  for (const e of moveErrs) console.error(`  ✗ ${e}`);
  process.exit(1);
}
const transitionInErrs = transitionInErrors(beats);
if (transitionInErrs.length) {
  console.error(`assemble: a transition_in does not name a real transition (\`make study-tool X=transitions\` for the catalog):`);
  for (const e of transitionInErrs) console.error(`  ✗ ${e}`);
  process.exit(1);
}
const recipeErrs = recipeErrors(beats);
if (recipeErrs.length) {
  console.error(`assemble: a recipe: does not parse (recipes/README.md for the catalog):`);
  for (const e of recipeErrs) console.error(`  ✗ ${e}`);
  process.exit(1);
}
const cameraErrs = cameraErrors(beats);
if (cameraErrs.length) {
  console.error(`assemble: a camera: does not parse (\`make arsenal Q="camera moves"\` for the catalog):`);
  for (const e of cameraErrs) console.error(`  ✗ ${e}`);
  process.exit(1);
}
const cameraContinuityErrs = cameraContinuityErrors(beats);
if (cameraContinuityErrs.length) {
  console.error(`assemble: a camera: pairing would snap at a cut-free (recipe:) seam:`);
  for (const e of cameraContinuityErrs) console.error(`  ✗ ${e}`);
  process.exit(1);
}

const themeName = typeof scene.theme === 'string' ? scene.theme : (scene.theme && scene.theme.name) || 'default';
const themeFile = typeof scene.theme === 'object' ? null : path.join(ROOT, 'themes', `${themeName}.json`);
const theme = themeFile ? expandThemeFile(JSON.parse(fs.readFileSync(themeFile, 'utf8'))) : scene.theme;
const look = resolveLook(theme, { isLightBg });
const aspect = scene.aspect || '16:9';
const destination = scene.destination;

const base = path.basename(film, '.json');
const dir = path.dirname(film);

const { caused, shiftedStart, shiftedEnd } = stagedSchedule(beats);
const staged = caused.filter(Boolean).length;

const [canvasW, canvasH] = sceneDims({ aspect });
const FULL_BLEED = { x: 0, y: 0, w: canvasW, h: canvasH };
const fragSpecs = beats.map((b) => parseFragmentSpec(b.fragment));
const fragPathOf = (i) => {
  const named = (fragSpecs[i].path || '').split(/\s+\(/)[0].trim();
  if (!named) return path.join(dir, `${base}.scene${i + 1}.html`);
  return named.includes('/') ? path.resolve(ROOT, named) : path.join(dir, named);
};
const boxOf = (i) => (fragSpecs[i].edge ? resolvePx(fragSpecs[i].edge, { aspect, destination }) : FULL_BLEED);

// a slideshow, engine-doctrine/MISTAKES.md #603 for the truncation failure mode of the fix below). A run needs
const runs = [];
for (let i = 0; i < beats.length; ) {
  let j = i;
  while (j + 1 < beats.length && fragSpecs[i].path && fragSpecs[j + 1].path && fragPathOf(i) === fragPathOf(j + 1)) j++;
  runs.push([i, j]);
  i = j + 1;
}

const missing = [];
const moveConflicts = [];
const movesBuilt = [];
const htmlLayers = runs.map(([i, j]) => {
  const merged = j > i;
  const fragPath = fragPathOf(i);
  const fragExists = fs.existsSync(fragPath);
  const recipeOnly = !merged && beats[i].recipe && !(beats[i].onscreen && beats[i].onscreen.length) && !fragSpecs[i].path && !fragExists;
  if (!fragExists && !recipeOnly) missing.push(path.relative(ROOT, fragPath));
  if (recipeOnly) return null;
  const box = boxOf(i);

  let motionKeys;
  if (merged) {
    const usesSize = Array.from({ length: j - i }, (_, k) => boxOf(i + 1 + k)).some((bx) => bx.w !== box.w || bx.h !== box.h);
    let prev = box;
    const keys = [{ t: 0, x: 0, y: 0, ...(usesSize ? { w: box.w, h: box.h } : {}) }];
    for (let k = i + 1; k <= j; k++) {
      const bx = boxOf(k);
      if (bx.x === prev.x && bx.y === prev.y && bx.w === prev.w && bx.h === prev.h) continue;
      keys.push({ t: +(shiftedStart[k] - shiftedStart[i]).toFixed(3), x: bx.x - box.x, y: bx.y - box.y, ...(usesSize ? { w: bx.w, h: bx.h } : {}) });
      prev = bx;
    }
    if (keys.length > 1) motionKeys = keys;
  }

  const moveDecls = [];
  const pathDecls = [];
  const holdDecls = [];
  const movePartsByBeat = new Map();
  for (let k = i; k <= j; k++) {
    for (const e of parseMoveEntries(beats[k].move)) {
      if (e.error) continue; // already refused above via moveErrors
      if (e.scope === 'layer') moveDecls.push({ k, mv: e });
      else if (e.scope === 'path') pathDecls.push({ k, mv: e });
      else if (e.scope === 'hold') holdDecls.push({ k, name: e.name });
      else if (e.scope === 'part') {
        if (!movePartsByBeat.has(k)) movePartsByBeat.set(k, []);
        movePartsByBeat.get(k).push(e);
      }
    }
  }
  let moveTrack;
  if (moveDecls.length > 1) {
    moveConflicts.push(`scene${i + 1}: beats ${moveDecls.map((d) => d.k + 1).join(' and ')} each declare a move:, but only one move: per shared-fragment run is supported. Pick one.`);
  } else if (moveDecls.length === 1 && pathDecls.length) {
    moveConflicts.push(`scene${i + 1}: beat ${moveDecls[0].k + 1} declares a LAYER move: and beat ${pathDecls[0].k + 1} declares a PATH move:, both of which key this run's own transform. Pick one.`);
  } else if (moveDecls.length === 1) {
    if (motionKeys) {
      moveConflicts.push(`scene${i + 1} (beat ${moveDecls[0].k + 1}) declares move:, but this run's fragment placement already changes across beats (a hand-keyed position track); combining move: with a placement change in the same run is not supported yet.`);
    } else {
      const { k, mv } = moveDecls[0];
      const beatDur = +(beats[k].end - beats[k].start).toFixed(3);
      const offset = merged ? +(shiftedStart[k] - shiftedStart[i]).toFixed(3) : 0;
      const raw = moveKeys(mv, beatDur);
      moveTrack = offset ? raw.map((kf) => ({ ...kf, t: +(kf.t + offset).toFixed(3) })) : raw;
      movesBuilt.push(`scene${i + 1} (beat ${k + 1}, ${mv.shape}:${mv.band})`);
    }
  }

  // PATH: scope 'path' flies this run's own layer along a named curve (MotionPathPlugin), the
  // `layers[].motionPath` field, never `motion[]`: same "spans the whole beat, never negotiable"
  // duration rule as LAYER scope, for the same reason (engine-doctrine/MISTAKES.md #610).
  let pathTrack;
  if (pathDecls.length > 1) {
    moveConflicts.push(`scene${i + 1}: beats ${pathDecls.map((d) => d.k + 1).join(' and ')} each declare a move: path curve, but only one per shared-fragment run is supported. Pick one.`);
  } else if (pathDecls.length === 1) {
    if (motionKeys) {
      moveConflicts.push(`scene${i + 1} (beat ${pathDecls[0].k + 1}) declares move:, but this run's fragment placement already changes across beats (a hand-keyed position track); combining move: with a placement change in the same run is not supported yet.`);
    } else {
      const { k, mv } = pathDecls[0];
      const beatDur = +(beats[k].end - beats[k].start).toFixed(3);
      pathTrack = pathMotion(mv, beatDur);
      movesBuilt.push(`scene${i + 1} (beat ${k + 1}, path ${mv.curve}:${mv.band})`);
    }
  }

  let idle;
  if (holdDecls.length > 1) {
    moveConflicts.push(`scene${i + 1}: beats ${holdDecls.map((d) => d.k + 1).join(' and ')} each declare move: hold:, but only one hold per shared-fragment run is supported. Pick one.`);
  } else if (holdDecls.length === 1) {
    idle = holdDecls[0].name;
    movesBuilt.push(`scene${i + 1} (beat ${holdDecls[0].k + 1}, hold:${idle})`);
  }

  const parts = [];
  for (let k = i; k <= j; k++) {
    const motion = [...parseMotion(beats[k].motion), ...(movePartsByBeat.get(k) || [])];
    if (!motion.length) continue;
    const beatDuration = +(beats[k].end - beats[k].start).toFixed(3);
    const runOffset = merged ? shiftedStart[k] - shiftedStart[i] : 0;
    motion.forEach((m, mi) => {
      const each = SPEED_BAND[m.inBand];
      const exitDur = SPEED_BAND[m.outBand];
      const maxDelay = Math.max(0, beatDuration - each - exitDur);
      const spread = motion.length > 1 ? (mi / (motion.length - 1)) * maxDelay : null;
      const delay = merged ? +(runOffset + (spread ?? 0.1)).toFixed(3) : (spread == null ? null : +spread.toFixed(3));
      parts.push({
        select: m.selector, anim: m.kind, each,
        ...(!merged || k === j ? { out: true } : {}),
        exitDur,
        ...(delay != null ? { delay } : {}),
      });
    });
  }

  const duration = merged ? +(shiftedEnd[j] - shiftedStart[i]).toFixed(3) : +(beats[i].end - beats[i].start).toFixed(3);
  return {
    id: `scene${i + 1}`, type: 'html', src: path.relative(ROOT, fragPath), start: shiftedStart[i], duration, track: 1,
    x: box.x, y: box.y, w: box.w, h: box.h,
    ...(motionKeys || moveTrack ? { motion: motionKeys || moveTrack } : {}),
    ...(pathTrack ? { motionPath: pathTrack } : {}),
    ...(merged ? { acrossBeats: true } : {}),
    ...(parts.length ? { parts } : {}),
    ...(idle ? { idle } : {}),
  };
}).filter(Boolean);
if (moveConflicts.length) {
  console.error(`assemble: a move: cannot be built:`);
  for (const e of moveConflicts) console.error(`  ✗ ${e}`);
  process.exit(1);
}
if (missing.length) {
  console.error(`assemble: missing fragment(s), run \`make scenes D=${film}\` for the briefs and write them first:`);
  for (const m of missing) console.error(`  ✗ ${m}`);
  process.exit(1);
}

let objectSrcRel = null, objectType = 'rect';
if (sb.objectSrc) {
  const objectSrcAbs = path.isAbsolute(sb.objectSrc) ? sb.objectSrc : path.join(ROOT, sb.objectSrc);
  if (!fs.existsSync(objectSrcAbs)) {
    console.error(`assemble: object: names a source that does not exist, write it first: ${sb.objectSrc}`);
    process.exit(1);
  }
  objectSrcRel = path.relative(ROOT, objectSrcAbs);
  const ext = path.extname(objectSrcAbs).toLowerCase();
  objectType = (ext === '.html' || ext === '.htm') ? 'html' : 'image';
}

const chain = edges(beats);
let objectLayer = null;
let usesSize = false, usesRot = false, usesOpacity = false, usesRadius = false;
if (chain.length) {
  const first = chain[0];
  const base0 = resolvePx(first.in, { aspect, destination });
  usesSize = chain.some((e) => e.in.w !== base0.w || e.in.h !== base0.h || e.out.w !== base0.w || e.out.h !== base0.h);
  usesRot = chain.some((e) => e.in.rot || e.out.rot);
  usesRadius = chain.some((e) => e.in.radius != null || e.out.radius != null);
  usesOpacity = chain.some((e) => e.in.opacity !== 1 || e.out.opacity !== 1);
  const objStart = shiftedStart[0];
  const keys = [];
  const pushKey = (t, edge) => {
    const p = resolvePx(edge, { aspect, destination });
    const tt = +(t - objStart).toFixed(3);
    const key = { t: tt, x: p.x - base0.x, y: p.y - base0.y };
    if (usesSize) { key.w = p.w; key.h = p.h; }
    if (usesRot) key.rot = edge.rot;
    if (usesOpacity) key.opacity = edge.opacity;
    if (usesRadius && edge.radius != null) key.radius = edge.radius;
    if (keys.length && keys[keys.length - 1].t === tt) keys[keys.length - 1] = key;
    else keys.push(key);
  };
  chain.forEach((e, i) => { pushKey(shiftedStart[i], e.in); pushKey(shiftedEnd[i], e.out); });
  objectLayer = {
    id: 'object', type: objectType, track: 5, x: base0.x, y: base0.y, w: base0.w, h: base0.h,
    ...(objectType === 'rect' ? { fill: 'var(--accent)' } : { src: objectSrcRel }),
    // render outright rather than let it look accepted and be dropped (engine-doctrine/MISTAKES.md #428). So a
    ...(objectType === 'rect'
      ? { radius: chain[0].in.radius ?? 4 }
      : (chain[0].in.radius != null ? { radius: chain[0].in.radius } : {})),
    start: objStart, duration: +(shiftedEnd[chain.length - 1] - objStart).toFixed(3),
    acrossBeats: true,
    motion: keys,
  };
}

const rotation = Array.isArray(theme && theme.bgDefault) ? theme.bgDefault : null;
const backdrop = (look.backdrop && look.backdrop.length) ? look.backdrop : ['soft', 'accent'];
const bg = rotation
  ? [{ use: 'theme' }]
  : beats.map((b, i) => ({ from: shiftedStart[i], to: shiftedEnd[i], preset: backdrop[i % backdrop.length] }));

const cutFx = look.cuts.default || 'fade';
let cutMech;
try { cutMech = boundaryMechanism(cutFx, 'seam'); } catch { cutMech = undefined; }
const runOf = (k) => runs.find(([ri, rj]) => rj > ri && k >= ri && k < rj);
const transitions = beats.slice(1).map((b, i) => {
  const swallowedBy = runOf(i);
  if (swallowedBy) {
    console.log(`  dropped transition at ${shiftedStart[i + 1]}s: inside scene${swallowedBy[0] + 1}'s shared-fragment run, nothing to join`);
    return null;
  }
  const named = resolvedTransitionIn(b);
  if (named) {
    let mech;
    try { mech = boundaryMechanism(named.fx, 'seam'); } catch { mech = undefined; }
    return { at: shiftedStart[i + 1], fx: named.fx, ...(mech ? { mech } : {}) };
  }
  if (b.recipe) return null;   // the recipe seam IS the boundary; no default cut on top of it
  return { at: shiftedStart[i + 1], fx: cutFx, ...(cutMech ? { mech: cutMech } : {}) };
}).filter(Boolean);

const recipes = beats
  .map((b, i) => ({ b, i }))
  .filter(({ b }) => b.recipe)
  .map(({ b, i }) => {
    const rp = parseRecipeLine(b.recipe);
    return { recipe: rp.name, at: shiftedStart[i], ...rp.slots, ...(Object.keys(rp.params).length ? { params: rp.params } : {}) };
  });

const cameraSpecs = [];
beats.forEach((b, i) => {
  const r = resolvedCamera(b);
  if (!r) return;
  const beatStart = shiftedStart[i];
  const beatDur = +(shiftedEnd[i] - shiftedStart[i]).toFixed(3);
  cameraSpecs.push({ i, spec: { move: r.move, start: r.params.start ?? beatStart, dur: r.params.dur ?? beatDur, ...r.params } });
});
const cameraConflicts = [];
if (cameraSpecs.length > 1) {
  const followLayerBeats = cameraSpecs.filter((c) => c.spec.move === 'followLayer');
  if (followLayerBeats.length) {
    console.error(`assemble: a camera: cannot be combined with another beat's camera::`);
    console.error(`  ✗ beat ${followLayerBeats[0].i + 1} (${beats[followLayerBeats[0].i].name}) declares `
      + `\`camera: followLayer ...\`, which tracks a live layer box at render time and cannot be one leg `
      + `among others (core/engine/produce.js bakeCameraMove). It must be the ONLY beat this film gives a `
      + `camera: line. Other beat(s) with a camera: line: ${cameraSpecs.filter((c) => c.spec.move !== 'followLayer').map((c) => c.i + 1).join(', ')}.`);
    process.exit(1);
  }
}
if (cameraSpecs.length) {
  const handCamera = Array.isArray(scene.camera) ? scene.camera : null;
  if (handCamera && handCamera.length) {
    const times = handCamera.map((k) => k && k.t).filter((t) => typeof t === 'number');
    const camMin = Math.min(...times), camMax = Math.max(...times);
    for (const { i, spec } of cameraSpecs) {
      const winEnd = +(spec.start + (spec.dur ?? 0)).toFixed(3);
      if (spec.start <= camMax && winEnd >= camMin) {
        cameraConflicts.push(`beat ${i + 1} (${beats[i].name}) camera: "${spec.move}" windows ${spec.start}s-${winEnd}s, `
          + `and this film already carries a hand-keyed \`camera[]\` spanning ${camMin}s-${camMax}s. Keep one: `
          + `drop the beat's camera: line, or remove/retime the hand-keyed camera.`);
      }
    }
  }
  for (let bi = 0; bi < beats.length; bi++) {
    const b = beats[bi];
    if (!b.recipe) continue;
    const rp = parseRecipeLine(b.recipe);
    if (rp.error || !rp.def || rp.def.kind !== 'camera') continue;
    const rFrom = Number(rp.slots.from), rTo = Number(rp.slots.to);
    if (!Number.isFinite(rFrom) || !Number.isFinite(rTo)) continue;   // recipeErrors already caught a missing/bad slot
    for (const { i, spec } of cameraSpecs) {
      const winEnd = +(spec.start + (spec.dur ?? 0)).toFixed(3);
      if (spec.start < rTo && winEnd > rFrom) {
        cameraConflicts.push(`beat ${i + 1} (${beats[i].name}) camera: "${spec.move}" windows ${spec.start}s-${winEnd}s, `
          + `and beat ${bi + 1} (${b.name})'s \`recipe: ${rp.name}\` (kind camera) windows ${rFrom}s-${rTo}s. `
          + `Both write into cameraMove, and the engine cannot referee two camera specs racing the same seconds `
          + `(bakeCameraMove concatenates in array order, cameraAt assumes ascending time). Move one, or drop one.`);
      }
    }
  }
}
if (cameraConflicts.length) {
  console.error(`assemble: a camera: move conflicts with this film's existing hand-keyed camera:`);
  for (const e of cameraConflicts) console.error(`  ✗ ${e}`);
  process.exit(1);
}

const newDuration = shiftedEnd[shiftedEnd.length - 1];
const ownedIds = new Set(htmlLayers.map((l) => l.id).concat(objectLayer ? [objectLayer.id] : []));
const prevLayers = Array.isArray(scene.layers) ? scene.layers : [];
const preserved = prevLayers.filter((l) => !(l && typeof l === 'object' && l.id && ownedIds.has(l.id)));
const nameOf = (l) => l.id || `${l.type || '?'}@${l.start ?? '?'}`;
const staleWarnings = [];
for (const l of preserved) {
  if (typeof l.start !== 'number' || typeof l.duration !== 'number') continue;   // no window to check
  const end = l.start + l.duration;
  if (l.start < -0.01 || end > newDuration + 0.01) {
    staleWarnings.push(`  ! "${nameOf(l)}" spans ${l.start}s to ${+end.toFixed(3)}s, outside the new film (0s to ${newDuration}s): its beat likely moved or was deleted. Review before shipping.`);
  }
}
const preservedFilmFields = PRESERVED_FILM_FIELDS.filter((k) => scene[k] !== undefined);

const useCorpus = await arsenalCorpus();
const useErrs = useErrors(beats, useCorpus);
if (useErrs.length) {
  console.error(`assemble: a use: line does not resolve (\`make arsenal Q="…"\` to search):`);
  for (const e of useErrs) console.error(`  ✗ ${e}`);
  process.exit(1);
}
for (const w of useWarnings(beats, useCorpus)) console.log(`  ! ${w}`);

const { extraBg, audioCues, sceneLevelSet, cameraBlurSet, useConflicts } =
  writeUses(beats, useCorpus, { htmlLayers, objectLayer, preserved, runs, shiftedStart, shiftedEnd, scene });
if (useConflicts.length) {
  console.error(`assemble: a use: line cannot be written:`);
  for (const e of useConflicts) console.error(`  ✗ ${e}`);
  process.exit(1);
}
const audioOut = audioCues.length ? { ...(scene.audio || { auto: true }), cues: audioCues } : (scene.audio || { auto: true });

const out = {
  module: 'scene',
  theme: scene.theme,
  aspect,
  ...(destination ? { destination } : {}),
  duration: shiftedEnd[shiftedEnd.length - 1],
  sceneUnits: true,
  ...(scene.authoring ? { authoring: scene.authoring } : {}),   // preserve a hand-written waiver across re-assembles
  audio: audioOut,
  ...Object.fromEntries(preservedFilmFields.map((k) => [k, scene[k]])),
  ...(cameraSpecs.length ? { cameraMove: cameraSpecs.map((c) => c.spec) }
    : (scene.cameraMove !== undefined ? { cameraMove: scene.cameraMove } : {})),
  ...(sceneLevelSet.energy ? { energy: sceneLevelSet.energy.value } : {}),
  ...(sceneLevelSet.captionStyle ? { captionStyle: sceneLevelSet.captionStyle.value } : {}),
  ...(cameraBlurSet ? { cameraBlur: true } : {}),
  bg: [...bg, ...extraBg],
  transitions,
  beats: beats.map((b, k) => ({ id: `scene${k + 1}`, start: shiftedStart[k], duration: +(shiftedEnd[k] - shiftedStart[k]).toFixed(3) })),
  ...(recipes.length ? { recipes } : {}),
  layers: objectLayer ? [...htmlLayers, objectLayer, ...preserved] : [...htmlLayers, ...preserved],
};

fs.writeFileSync(film, JSON.stringify(out, null, 1) + '\n');
console.log(`✓ assemble: ${beats.length} scene(s) → ${film}`);
console.log(`  ${htmlLayers.length} html fragment(s), ${objectLayer ? `1 continuous-object layer (${chain[0].in.placement} → ${chain[chain.length - 1].out.placement}, drawn as ${objectType}${objectSrcRel ? ': ' + objectSrcRel : ''})` : 'no continuous object (film named none)'}`);
const mergedRuns = runs.filter(([i, j]) => j > i);
if (mergedRuns.length) console.log(`  ${mergedRuns.length} shared-fragment run(s) kept alive across a cut: ${mergedRuns.map(([i, j]) => `scene${i + 1} (beats ${i + 1}-${j + 1})`).join(', ')}`);
console.log(`  ${transitions.length} transition(s), bg turns through: ${backdrop.slice(0, beats.length).join(' → ')}`);
const motionCount = htmlLayers.reduce((n, l) => n + (l.parts ? l.parts.length : 0), 0);
console.log(`  ${motionCount} motion-plan entr${motionCount === 1 ? 'y' : 'ies'} from the storyboard (\`motion:\`), built into ${htmlLayers.filter((l) => l.parts).length} scene(s)' \`parts\``);
console.log(`  ${movesBuilt.length} sustained move(s) from the storyboard (\`move:\`)${movesBuilt.length ? `: ${movesBuilt.join(', ')}` : ', no beat asked for one'}`);
console.log(`  ${recipes.length} recipe(s) from the storyboard (\`recipe:\`)${recipes.length ? `: ${recipes.map((r) => `${r.recipe}@${r.at}s`).join(', ')}` : ', no beat asked for one'}`);
console.log(`  ${cameraSpecs.length} camera move(s) from the storyboard (\`camera:\`)${cameraSpecs.length ? `: ${cameraSpecs.map((c) => `${c.spec.move}@${c.spec.start}s`).join(', ')}` : ', no beat asked for one'}`);
if (chain.length) {
  const poseBits = [usesSize && 'size', usesRot && 'rotation', usesOpacity && 'opacity', usesRadius && 'radius'].filter(Boolean);
  console.log(`  pose: ${poseBits.length ? poseBits.join(' + ') + ' keyed alongside position' : 'position only (no beat declared a size/rot/op change)'}`);
}
console.log(`  ${staged} of ${htmlLayers.length - 1} junction(s) staged (\`trigger:\` names a cause): ${staged ? `+${STAGE_S}s each, inserted (film runs ${(staged * STAGE_S).toFixed(2)}s longer), not carved out of a beat` : 'none: no junction states a real cause'}.`);
if (staged) console.log(`  (resolved to real seconds, not left as "sceneN.end+${STAGE_S}": beats-check/motion-director read \`start\` as a number)`);
if ([...preservedFilmFields, ...(!cameraSpecs.length && scene.cameraMove !== undefined ? ['cameraMove'] : [])].length) console.log(`  preserved film-level field(s): ${[...preservedFilmFields, ...(!cameraSpecs.length && scene.cameraMove !== undefined ? ['cameraMove'] : [])].join(", ")}`);
if (!preserved.length) console.log("  no hand-authored layers to preserve: everything in this film is generated from the storyboard.");
if (preserved.length) {
  console.log(`  preserved ${preserved.length} hand-authored layer(s) this contract has no vocabulary for: ${preserved.map(nameOf).join(", ")}`);
  const candidates = preserved.filter((l) => l.acrossBeats);
  if (candidates.length) console.log(`  (${candidates.map(nameOf).join(", ")} spans beats: a candidate for the continuous-object contract, not a permanent exception)`);
}
if (staleWarnings.length) { console.log("  STALE:"); for (const w of staleWarnings) console.log(w); }
console.log(`  Next: make author-check D=${film}`);
