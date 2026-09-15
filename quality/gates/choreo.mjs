#!/usr/bin/env node
// quality/gates/choreo.mjs: HOW THIS FILM CHOREOGRAPHS MOTION, one beat at a time.
//
//   make choreo D=formats/scene/<film>.json [REF=<ref-clip-name>]
//   node quality/gates/choreo.mjs <film> [--ref <name>] [--json]
//
// REPORT ONLY, exit 0 always. It answers, per beat: which KINDS of motion are live at once (the frame
// side, from motion-floor's region classifier, and the scene side, from scene-timing's channel scan),
// which elements enter/hold/exit and which of those exits were never designed, where one element's
// exit hands off to another's entrance, how far apart concurrent motions start, and which declared
// exits are not EMPHASISED (owner rule: an exit should read faster than its own entrance - shorter,
// or an accelerating ease). Nothing here blocks a build: it is the surfacing step the choreography
// plan asks for, not a gate with a verdict.
//
// TWO READERS, ONE OWNER EACH. Frame classification lives in motion-floor.mjs (it already reads pixels
// for the motion floor); scene classification lives in scene-timing.mjs (it already models when a
// layer is on screen). This file imports both rather than re-deriving either, so a change to how a
// region is classified or how a layer's life is modelled has exactly one place to change it.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sceneTiming } from './scene-timing.mjs';
import { pullFrames, profile, primaryRegionAt } from './motion-floor.mjs';
import { parseStoryboard } from '../../harness/author/storyboard-parse.mjs';
import { parseEyeLine } from '../../harness/lib/contract.mjs';
import { EASINGS } from '../../core/motion/motion.js';
import { velocityAt } from '../../core/timeline/sequence.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function loadRef(mp4Name) {
  const cand = ['refs/_clips/' + mp4Name + '.mp4', 'refs/' + mp4Name + '.mp4', 'refs/' + mp4Name + '/' + mp4Name + '.mp4']
    .map((f) => path.join(ROOT, f)).find((f) => fs.existsSync(f));
  if (!cand) return null;
  const frames = pullFrames(cand);
  return frames ? profile(frames) : null;
}

/** Frame-side numbers for one window [start,end): union of kinds, mean local/global/regionCount. */
export function frameSummary(prof, start, end) {
  const rows = prof.filter((w) => w.t >= start && w.t < end);
  if (!rows.length) return null;
  const kinds = new Set();
  for (const r of rows) for (const k of r.kinds || []) kinds.add(k);
  const mean = (key) => +(rows.reduce((s, r) => s + r[key], 0) / rows.length).toFixed(2);
  return { kinds: [...kinds], local: mean('local'), global: mean('global'), regionCount: mean('regionCount'), primaryShare: mean('primaryShare') };
}

// ── EXIT EMPHASIS. Owner rule: "when things are exiting, increase their speed more to put emphasis
// on the exits" - stated as a standing default this harness always reaches for, not a per-film taste
// call. An exit reads as emphasised when EITHER it is clearly shorter than its own entrance, OR its
// own ease accelerates (the "ease-in / rush family": read off EASINGS itself, so a curve added there
// is picked up here with no second list to maintain). `easeInOutX` is EXCLUDED on purpose: it
// decelerates first, so a departure keyed to it still leaves the way it arrived, softly.
export const ACCEL_EASES = new Set([...Object.keys(EASINGS).filter((n) => /^easeIn(?!Out)/.test(n)), 'rush']);
// The owner's own default ratio, applied regardless of what any reference measures (see madera's
// grounding line in the CLI output below): an unemphasised exit is one that is not at least this much
// shorter than its entrance.
export const FAST_RATIO = 0.6;
export const SUGGESTED_EASE = 'rush'; // the engine's own name for "accelerate away" (core/motion/motion.js)

// SPEED_SAMPLE_DT: the lookback window velocityAt samples at each edge. Short enough to read the rate
// AT the edge rather than averaged over the whole enter/exit ramp, never longer than half that ramp
// (a `dt` past the segment's own end would sample motion outside it).
const SPEED_SAMPLE_DT = 0.05;
// A window under this is not worth measuring: rounding noise in the resolved pose would read as a
// real speed swing at 1-2 frames.
const SPEED_EPS = 1; // px/s

/** measuredSpeed(life, window): the layer's own measured speed (px/s) at the start and end of an
 * enter/exit window, sampled off its OWN motion track (velocityAt, core/timeline/sequence.js). Null
 * when there is nothing to measure: no keyed motion, no window, or the layer never keys position (a
 * fade-only layer has no travel to be fast or slow about). `motion` keyframe times are LOCAL to the
 * layer's own life, so the window is shifted by `life.start` before sampling. */
function measuredSpeed(life, window) {
  const dur = window.end - window.start;
  if (!life.motion || !(dur > 0) || !life.channels.includes('position')) return null;
  const dt = Math.min(SPEED_SAMPLE_DT, dur / 2);
  if (!(dt > 0)) return null;
  try {
    const localStart = window.start - life.start, localEnd = window.end - life.start;
    const start = +velocityAt(life.motion, localStart + dt, dt).speed.toFixed(1);
    const end = +velocityAt(life.motion, localEnd, dt).speed.toFixed(1);
    return { start, end };
  } catch { return null; }
}

/** Is this life's exit emphasised (owner rule), and what would fix it if not. Null when there is no
 * declared exit to grade (nothing to compare a duration or an ease against). Beside the authored
 * duration-ratio/ease proxy, also reads the layer's MEASURED speed: an exit that speeds up (its own
 * end faster than its own start) earns the pass on that alone, even with a symmetric duration and a
 * named ease neither side calls "accelerating". */
export function exitEmphasis(life) {
  if (!life.exit) return null;
  const enterDur = +(life.enter.end - life.enter.start).toFixed(3);
  const exitDur = +(life.exit.end - life.exit.start).toFixed(3);
  const fastEnough = enterDur > 0 && exitDur <= enterDur * FAST_RATIO + 1e-9;
  const accelerating = ACCEL_EASES.has(life.exit.ease);
  const speed = measuredSpeed(life, life.exit);
  const speedingUp = !!(speed && speed.end > speed.start + SPEED_EPS);
  return { id: life.id, enterDur, exitDur, ease: life.exit.ease || null,
    ok: fastEnough || accelerating || speedingUp,
    startSpeed: speed ? speed.start : null, endSpeed: speed ? speed.end : null,
    suggestDur: +(enterDur * FAST_RATIO).toFixed(2) };
}

/** entrance-not-settled: an entrance whose MEASURED end speed is not lower than its start speed, i.e.
 * it never decelerates into place. Null when there is nothing measured to grade (no keyed position, or
 * no enter window) - like exitEmphasis, a report, never a gate. */
export function entranceEmphasis(life) {
  if (!life.enter || life.enter.kind === 'none') return null;
  const enterDur = +(life.enter.end - life.enter.start).toFixed(3);
  const speed = measuredSpeed(life, life.enter);
  // A near-zero start speed has nothing to decelerate FROM (a hold, or a channel that only moves
  // elsewhere in the layer's life): grading it would flag every quiet entrance as "never settles".
  if (!speed || speed.start <= SPEED_EPS) return null;
  const settling = speed.end < speed.start - SPEED_EPS;
  return { id: life.id, enterDur, ok: settling, startSpeed: speed.start, endSpeed: speed.end };
}

// ── THE EYE-PLAN CHECK: where the primary motion region actually ends, against what the storyboard's
// own `eye:` line said would be there (engine-doctrine/CRAFT/DIRECTION.md, "Directing the eye"). A REPORT, exactly
// like the rest of this file: it names a measured fact and a stated intent, and leaves the verdict to a
// human wherever the plan names a LAYER rather than a region ("the prompt bar" has no frame-thirds
// reading without a layout lookup this file does not have); it verdicts only the beats whose `eye:`
// line names a region word outright.
const THIRD_WORDS = ['left', 'right', 'top', 'bottom', 'center', 'centre', 'middle'];

/** thirdsLabel(cx,cy) -> "top-left"/"center"/... : which of the frame's nine thirds a centroid (0..1
 * each axis) falls in, collapsing the dead centre to a single word. */
export function thirdsLabel(cx, cy) {
  const xl = cx < 1 / 3 ? 'left' : cx < 2 / 3 ? 'center' : 'right';
  const yl = cy < 1 / 3 ? 'top' : cy < 2 / 3 ? 'middle' : 'bottom';
  if (xl === 'center' && yl === 'middle') return 'center';
  if (yl === 'middle') return xl;
  if (xl === 'center') return yl;
  return `${yl}-${xl}`;
}

/** eyePlanCheck(frames, beat) -> null (no `eye:`, or it names no region word, or nothing rendered) |
 * {parsed, label, met}. `met` is null when the plan names a region word this label does not literally
 * repeat, true/false once it does; either way `label` is printed, since a measured fact is worth
 * reporting even where this file cannot judge it. */
export function eyePlanCheck(frames, beat) {
  if (!frames || !beat.eye) return null;
  const parsed = parseEyeLine(beat.eye, beat);
  if (!parsed || parsed.error) return null;
  const region = primaryRegionAt(frames, { start: beat.start, end: beat.end });
  if (!region) return { parsed, label: null, met: null };
  const label = thirdsLabel(region.cx, region.cy);
  const landLower = parsed.land.toLowerCase();
  const named = THIRD_WORDS.filter((w) => landLower.includes(w === 'centre' ? 'center' : w) || landLower.includes(w));
  const met = named.length ? named.some((w) => label.includes(w === 'centre' ? 'center' : w)) : null;
  return { parsed, label, met, region };
}

/** Late-half vs early-half local motion inside one window, a frame-side PROXY for "does this act's
 * motion intensify toward its exit". It is a proxy, not the authored duration ratio choreo grades
 * scene-side: pixels carry no per-element exit boundary, only a whole window of change. */
export function lateEarlyRatio(prof, start, end) {
  const rows = prof.filter((w) => w.t >= start && w.t < end);
  if (rows.length < 2) return null;
  const mid = start + (end - start) / 2;
  const early = rows.filter((w) => w.t < mid), late = rows.filter((w) => w.t >= mid);
  if (!early.length || !late.length) return null;
  const mean = (list) => list.reduce((s, w) => s + w.local, 0) / list.length;
  const e = mean(early);
  return e > 0 ? +(mean(late) / e).toFixed(2) : null;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const arg = args.find((a) => !a.startsWith('--')) || process.env.D;
  if (!arg) { console.error('usage: make choreo D=formats/scene/<film>.json [REF=<ref-clip-name>]'); process.exit(2); }
  const asJson = args.includes('--json');
  const base = String(arg).replace(/\.json$/, '');
  const slug = path.basename(base);
  const sceneFile = path.resolve(ROOT, base + '.json');
  if (!fs.existsSync(sceneFile)) { console.error(`no scene at ${sceneFile}`); process.exit(2); }
  const scene = JSON.parse(fs.readFileSync(sceneFile, 'utf8'));
  const T = sceneTiming(scene);

  // storyboard beats, when the film has one: the plan's own acts are what a choreography question is
  // usually asked ABOUT ("does beat 6 read as one thing or three"), and a continuous film with no
  // `cuts[]` (flow-seam, a single unbroken camera move) has exactly one scene-timing beat otherwise.
  const sbPath = [base + '.storyboard.md', path.join(ROOT, 'formats/scene', slug + '.storyboard.md')]
    .map((f) => path.resolve(ROOT, f)).find((f) => fs.existsSync(f));
  let beats = T.beatMotion.map((b) => ({ name: `beat ${b.index + 1}`, start: b.start, end: b.end }));
  const refIdx = args.indexOf('--ref');
  let refName = refIdx >= 0 ? args[refIdx + 1] : (process.env.REF || null);
  if (sbPath) {
    const src = fs.readFileSync(sbPath, 'utf8');
    const sb = parseStoryboard(src);
    if (sb.beats.some((b) => b.start != null && b.end != null)) {
      beats = sb.beats.filter((b) => b.start != null && b.end != null).map((b) => ({ name: b.name, start: b.start, end: b.end }));
    }
    if (!refName) {
      const m = /^reference\s*:\s*["']?([\w.-]+)/mi.exec(src);
      if (m) refName = m[1];
    }
  }

  const mp4 = path.join(ROOT, 'out', slug + '.mp4');
  const ourFrames = fs.existsSync(mp4) ? pullFrames(mp4) : null;
  const ourProf = ourFrames ? profile(ourFrames) : null;
  const refProf = refName ? loadRef(refName) : null;

  const unplanned = T.lives.filter((L) => !L.planned);
  const handoffFrom = new Set(T.handoffs.map((h) => h.from));
  // a layer with a REAL exit or a declared `becomes` that never landed a handoff: it leaves, and
  // nothing measured picks it up nearby. Held-to-the-end layers are not counted: nothing needs to
  // catch a life that simply runs out with the film.
  const missingHandoffs = T.lives.filter((L) => (L.exit || L.becomes) && !handoffFrom.has(L.id)
    && L.end < T.duration - 1e-6);

  // the beat whose window a time falls in, so a held pose can be named "beat M's move" instead of a
  // bare timestamp - falls back to the last beat for a leg that ends past every declared window.
  const beatAtTime = (t) => beats.findIndex((b) => t >= b.start - 1e-6 && t < b.end + 1e-6);

  const rows = beats.map((b, i) => {
    const scn = T.beatMotionAt(b.start, b.end);
    const frm = ourProf ? frameSummary(ourProf, b.start, b.end) : null;
    const ref = refProf ? frameSummary(refProf, b.start, b.end) : null;
    const entering = T.lives.filter((L) => L.start >= b.start && L.start < b.end);
    const refRatio = refProf ? lateEarlyRatio(refProf, b.start, b.end) : null;
    const eye = eyePlanCheck(ourFrames, b);
    const held = T.cameraStillHeldAt(b.start, b.end);
    let camStillHeld = null;
    if (held) {
      const heldSince = beatAtTime(held.legEndT);
      const p = held.pose;
      const poseStr = `s=${p.s.toFixed(2)}${(Math.abs(p.x) >= 1 || Math.abs(p.y) >= 1) ? `, x=${p.x.toFixed(0)} y=${p.y.toFixed(0)}` : ''}`;
      camStillHeld = `camera-still-held: beat ${i + 1} (${b.name}) plans a full-frame layer ("${held.layer}") `
        + `but the camera is still at ${poseStr} from ${heldSince >= 0 ? `beat ${heldSince + 1}'s` : 'a'} camera `
        + `move (ended ${held.legEndT}s); add a return: camera: slowPush to=1, or a window-dolly with `
        + `zoomTo=1, whichever the grammar supports.`;
    }
    return { ...b, scn, frm, ref, refRatio, eye, camStillHeld, entering: entering.map((L) => L.id) };
  });

  // CAMERA-COVERAGE-FLOOR: does the resolved camera (after recipe expansion, T.cameraLegSpans, the same
  // model beatMotionAt already uses) actually travel over the film, or did an appended leg just cover
  // its own few seconds while cameraAt held the last pose everywhere else (recipes/expand.mjs appends
  // recipe legs to hand legs; it does not chain them). `camKfs.length` under 2 means no camera array
  // was ever baked, so a camera-less film says nothing here. FULL_FRAME/40%/6s are read off the one
  // measured regression (vawe-flow-2: 4.2s of legs over 13.3s), not tuned further.
  const CAMERA_COVERAGE_FLOOR = 0.4, CAMERA_COVERAGE_MIN_DURATION = 6;
  let cameraCoverageFloor = null;
  if (T.scene.camera && Array.isArray(T.scene.camera) && T.scene.camera.length > 1 && T.duration > CAMERA_COVERAGE_MIN_DURATION) {
    const legs = [...T.cameraLegSpans].sort((a, b) => a[0] - b[0]);
    const covered = legs.reduce((s, [a, b]) => s + (b - a), 0);
    const coverage = T.duration > 0 ? covered / T.duration : 0;
    if (coverage < CAMERA_COVERAGE_FLOOR) {
      const gaps = [];
      let cursor = 0;
      for (const [a, b] of legs) { if (a > cursor) gaps.push([cursor, a]); cursor = Math.max(cursor, b); }
      if (cursor < T.duration) gaps.push([cursor, T.duration]);
      const spanStr = gaps.map(([a, b]) => `${+a.toFixed(2)}s-${+b.toFixed(2)}s`).join(' and ');
      cameraCoverageFloor = `camera-coverage-floor: the camera travels for ${covered.toFixed(2)}s of ${T.duration}s `
        + `(${Math.round(coverage * 100)}%, under the ${Math.round(CAMERA_COVERAGE_FLOOR * 100)}% floor); `
        + `camera holds still ${spanStr}. Recipe legs join hand-authored cameraMove legs back to back, `
        + `they do not replace covering the film; chain the legs so the camera moves across the gap.`;
    }
  }

  const exitChecks = T.lives.map(exitEmphasis).filter(Boolean);
  const notEmphasised = exitChecks.filter((c) => !c.ok);
  const entranceChecks = T.lives.map(entranceEmphasis).filter(Boolean);
  const notSettled = entranceChecks.filter((c) => !c.ok);
  // GROUNDING, not a gate on the default: the owner's rule applies regardless of what madera measures
  // (say so plainly), but the median late:early ratio is reported so the ratio is not asserted blind.
  const refRatios = rows.map((r) => r.refRatio).filter((v) => v != null);
  const refMedian = refRatios.length ? [...refRatios].sort((a, b) => a - b)[Math.floor(refRatios.length / 2)] : null;

  if (asJson) {
    console.log(JSON.stringify({
      slug, refName, beats: rows.map((r) => ({ ...r, eye: r.eye && { ...r.eye, region: r.eye.region || null } })),
      unplanned: unplanned.map((L) => L.id), missingHandoffs: missingHandoffs.map((L) => L.id),
      handoffs: T.handoffs, exitNotEmphasised: notEmphasised, entranceNotSettled: notSettled,
      refExitRatioMedian: refMedian, cameraCoverageFloor,
    }, null, 2));
    process.exit(0);
  }

  console.log(`\n  choreo · ${slug} · ${beats.length} beat(s)${refName ? ` · vs ${refName}` : ''}${ourProf ? '' : ' (no render at out/' + slug + '.mp4: scene side only)'}`);
  for (const r of rows) {
    console.log(`\n  ${r.name}  (${r.start}s-${r.end}s)`);
    console.log(`    scene:  ${r.scn.count} kind(s) at once: ${r.scn.kinds.join(', ') || 'none'}${r.scn.offsets.length ? `  offsets: ${r.scn.offsets.join(', ')}s` : ''}`);
    if (r.entering.length) console.log(`    enters: ${r.entering.join(', ')}`);
    if (r.frm) console.log(`    frame:  ${r.frm.kinds.join(', ') || 'none'}  local ${r.frm.local}  global ${r.frm.global}  regions ${r.frm.regionCount}  primary-share ${r.frm.primaryShare}`);
    if (r.ref) console.log(`    ${refName}: ${r.ref.kinds.join(', ') || 'none'}  local ${r.ref.local}  global ${r.ref.global}  regions ${r.ref.regionCount}  primary-share ${r.ref.primaryShare}${r.refRatio != null ? `  late:early motion ${r.refRatio}x` : ''}`);
    if (r.eye) {
      const { parsed, label, met } = r.eye;
      if (label == null) console.log(`    eye:    plan says land at "${parsed.land}" (device: ${parsed.device}), but nothing measured moved in this beat's render.`);
      else {
        const verdict = met == null ? '' : met ? `  -> eye plan MET: primary motion ends at ${label}, plan says land at "${parsed.land}"`
          : `  -> eye plan MISSED: primary motion ends at ${label}, plan says land at "${parsed.land}"`;
        console.log(`    eye:    primary motion ends ${label}${verdict}`);
      }
    }
    if (r.camStillHeld) console.log(`    ~ ${r.camStillHeld}`);
  }

  console.log('');
  if (unplanned.length) {
    console.log(`  ~ ${unplanned.length} layer(s) enter and are never designed to leave (no \`out\`, no cut-out, no becomes, and they end before the film does):`);
    for (const L of unplanned) console.log(`      ${L.id}  (${L.start}s-${L.end}s)  ->  give it \`out\` + \`exitDur\`, or a \`becomes\` into what replaces it`);
  } else {
    console.log('  ✓ every layer either leaves on its own terms or holds to the end');
  }
  if (missingHandoffs.length) {
    console.log(`  ~ ${missingHandoffs.length} exit(s) with nothing measured catching them nearby:`);
    for (const L of missingHandoffs) console.log(`      ${L.id} exits at ${L.exit ? L.exit.end : L.end}s  ->  name what replaces it in the same region, or a \`flow-seam\` recipe naming \`out\`/\`in\``);
  } else if (T.handoffs.length) {
    console.log(`  ✓ ${T.handoffs.length} handoff(s) found (${T.handoffs.filter((h) => h.declared).length} declared, ${T.handoffs.filter((h) => !h.declared).length} measured)`);
  }
  if (refMedian != null) {
    console.log(`  · ${refName}'s median late:early motion ratio is ${refMedian}x ${refMedian > 1 ? '(its own motion intensifies toward each act\'s exit)' : '(NOT clearly faster late in the act - honestly reported, this does not override the owner\'s default below)'}`);
  }
  if (notEmphasised.length) {
    console.log(`  ~ ${notEmphasised.length} exit(s) not emphasised (owner rule: an exit runs at most ${FAST_RATIO}x its own entrance, or eases with an accelerating curve, or measurably speeds up):`);
    for (const c of notEmphasised) {
      const measured = c.startSpeed != null ? `, measured ${c.startSpeed}px/s -> ${c.endSpeed}px/s` : '';
      console.log(`      ${c.id}  enter ${c.enterDur}s -> exit ${c.exitDur}s, ease ${c.ease || 'none'}${measured}  ->  set exitDur to ${c.suggestDur}s, or ease:"${SUGGESTED_EASE}"`);
    }
  } else if (exitChecks.length) {
    console.log(`  ✓ all ${exitChecks.length} declared exit(s) are emphasised (faster than their entrance, an accelerating ease, or measurably speeding up)`);
  }
  if (notSettled.length) {
    console.log(`  ~ ${notSettled.length} entrance(s) not settled (measured end speed is not lower than its start speed):`);
    for (const c of notSettled) console.log(`      ${c.id}  enter ${c.enterDur}s, measured ${c.startSpeed}px/s -> ${c.endSpeed}px/s  ->  ease into it (an ease-out curve), or slow the arrival`);
  } else if (entranceChecks.length) {
    console.log(`  ✓ all ${entranceChecks.length} measured entrance(s) settle (end speed lower than start speed)`);
  }
  if (cameraCoverageFloor) console.log(`  ~ ${cameraCoverageFloor}`);
  console.log('');
  process.exit(0);
}
