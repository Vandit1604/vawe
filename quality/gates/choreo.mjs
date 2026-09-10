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
import { pullFrames, profile } from './motion-floor.mjs';
import { parseStoryboard } from '../../harness/author/storyboard-parse.mjs';
import { EASINGS } from '../../core/motion/motion.js';

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

/** Is this life's exit emphasised (owner rule), and what would fix it if not. Null when there is no
 * declared exit to grade (nothing to compare a duration or an ease against). */
export function exitEmphasis(life) {
  if (!life.exit) return null;
  const enterDur = +(life.enter.end - life.enter.start).toFixed(3);
  const exitDur = +(life.exit.end - life.exit.start).toFixed(3);
  const fastEnough = enterDur > 0 && exitDur <= enterDur * FAST_RATIO + 1e-9;
  const accelerating = ACCEL_EASES.has(life.exit.ease);
  return { id: life.id, enterDur, exitDur, ease: life.exit.ease || null, ok: fastEnough || accelerating,
    suggestDur: +(enterDur * FAST_RATIO).toFixed(2) };
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
  const ourProf = fs.existsSync(mp4) ? profile(pullFrames(mp4) || []) : null;
  const refProf = refName ? loadRef(refName) : null;

  const unplanned = T.lives.filter((L) => !L.planned);
  const handoffFrom = new Set(T.handoffs.map((h) => h.from));
  // a layer with a REAL exit or a declared `becomes` that never landed a handoff: it leaves, and
  // nothing measured picks it up nearby. Held-to-the-end layers are not counted: nothing needs to
  // catch a life that simply runs out with the film.
  const missingHandoffs = T.lives.filter((L) => (L.exit || L.becomes) && !handoffFrom.has(L.id)
    && L.end < T.duration - 1e-6);

  const rows = beats.map((b) => {
    const scn = T.beatMotionAt(b.start, b.end);
    const frm = ourProf ? frameSummary(ourProf, b.start, b.end) : null;
    const ref = refProf ? frameSummary(refProf, b.start, b.end) : null;
    const entering = T.lives.filter((L) => L.start >= b.start && L.start < b.end);
    const refRatio = refProf ? lateEarlyRatio(refProf, b.start, b.end) : null;
    return { ...b, scn, frm, ref, refRatio, entering: entering.map((L) => L.id) };
  });

  const exitChecks = T.lives.map(exitEmphasis).filter(Boolean);
  const notEmphasised = exitChecks.filter((c) => !c.ok);
  // GROUNDING, not a gate on the default: the owner's rule applies regardless of what madera measures
  // (say so plainly), but the median late:early ratio is reported so the ratio is not asserted blind.
  const refRatios = rows.map((r) => r.refRatio).filter((v) => v != null);
  const refMedian = refRatios.length ? [...refRatios].sort((a, b) => a - b)[Math.floor(refRatios.length / 2)] : null;

  if (asJson) {
    console.log(JSON.stringify({
      slug, refName, beats: rows, unplanned: unplanned.map((L) => L.id), missingHandoffs: missingHandoffs.map((L) => L.id),
      handoffs: T.handoffs, exitNotEmphasised: notEmphasised, refExitRatioMedian: refMedian,
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
    console.log(`  ~ ${notEmphasised.length} exit(s) not emphasised (owner rule: an exit runs at most ${FAST_RATIO}x its own entrance, or eases with an accelerating curve):`);
    for (const c of notEmphasised) {
      console.log(`      ${c.id}  enter ${c.enterDur}s -> exit ${c.exitDur}s, ease ${c.ease || 'none'}  ->  set exitDur to ${c.suggestDur}s, or ease:"${SUGGESTED_EASE}"`);
    }
  } else if (exitChecks.length) {
    console.log(`  ✓ all ${exitChecks.length} declared exit(s) are emphasised (faster than their entrance, or an accelerating ease)`);
  }
  console.log('');
  process.exit(0);
}
