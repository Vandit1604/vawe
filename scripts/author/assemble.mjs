// assemble.mjs: `make assemble D=<film>`: ASSEMBLE. Writes the scene JSON from the storyboard's
// per-beat contract + the fragment files a scene fan-out (or one agent) already wrote:
//   - one `html` layer per scene (or per RUN of consecutive scenes sharing a `fragment:` file, see
//     below), `src`-loaded, timed at the contract's start/end, boxed full-bleed unless `fragment:`
//     names a placement
//   - the continuous object: ONE layer with a hand-keyed `motion` track built from every beat's
//     object_in/object_out, resolved to px through the ENGINE's own resolveCoords
//     (scripts/lib/placement-resolve.mjs), never a second copy of that math. Drawn as a rect UNLESS
//     the storyboard's `object:` line names a source ("the input bar -> path/to/bar.html"), in which
//     case it is that source's own layer type instead of the placeholder
//   - one `bg` window per beat, cycling the theme's own look.backdrop rotation
//   - explicit `transitions[]` at each beat boundary (look.cuts.default): produce.js's own cuts/
//     sceneUnits auto-injection (core/engine/produce.js) SKIPS any scene that already carries a
//     multi-key `motion` track ("choreographed"), which this film always does once it has a continuous
//     object, so this is the one place that injection has to be done by hand instead of left to the
//     engine.
// Kept THIN on purpose: no camera, no captions, no audio beyond `auto:true`. Everything else the
// engine already supplies once cuts + sceneUnits are on the page.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { storyboardPathFor } from '../gates/craft-checklist.mjs';
import { parseStoryboard, timeline } from './storyboard-parse.mjs';
import { chainErrors, edges, parseMotion, motionErrors, parseFragmentSpec, fragmentErrors, SPEED_BAND, stagedSchedule, STAGE_S } from '../lib/contract.mjs';
import { resolvePx } from '../lib/placement-resolve.mjs';
import { resolveLook } from '../../core/registry/theme-contract.js';
import { isLightBg } from '../../core/motion/motion.js';
import { sceneDims } from '../../core/layout/safe.js';
import { boundaryMechanism } from '../../core/transitions/lower.js';

// OWNERSHIP. Assemble owns what it GENERATES and nothing else: the html layer per beat, each stamped
// `id: scene<N>`, and the one continuous object it builds from the contract, stamped `id: object`. So
// the set it owns is nameable rather than guessed at from shape. Everything else in `layers[]` (a
// hand-keyed height ramp, a count that climbs, anything the per-beat contract has no vocabulary for)
// passes through untouched, appended after the generated layers in its original order, so a
// re-assemble is idempotent. A few film-level fields survive the same way through the allowlist below,
// which is an allowlist and not a blanket spread on purpose: `duration`, `bg`, `transitions` and
// `sceneUnits` are assemble's own and resurrecting a stale copy of them would be the worse bug.
//
// A PRESERVED LAYER CAN GO STALE, and staging makes that likelier: every caused junction shifts, so a
// layer that was correct before a re-assemble can now point at nothing. Carrying it silently would be
// worse than dropping it was, so each one is reported by name and any whose window falls outside the
// new film is warned about.
const PRESERVED_FILM_FIELDS = ['cameraMove'];

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const film = process.argv[2];
if (!film || !fs.existsSync(film)) { console.error('usage: node scripts/author/assemble.mjs <film.json>'); process.exit(1); }

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

const themeName = typeof scene.theme === 'string' ? scene.theme : (scene.theme && scene.theme.name) || 'default';
const themeFile = typeof scene.theme === 'object' ? null : path.join(ROOT, 'themes', `${themeName}.json`);
const theme = themeFile ? JSON.parse(fs.readFileSync(themeFile, 'utf8')) : scene.theme;
const look = resolveLook(theme, { isLightBg });
const aspect = scene.aspect || '16:9';
const destination = scene.destination;

const base = path.basename(film, '.json');
const dir = path.dirname(film);

// ---- STAGING: a documented cause becomes a mechanical stagger, inserted, not carved out -----------
// `trigger:` on beat i already answers WHAT MADE it happen (storyboard-check.mjs's causal chain); this
// is the one place that answer gets built instead of reported and discarded. `stagedSchedule`
// (scripts/lib/contract.mjs) is the ONE shifted timeline every block below builds from (bg, transitions,
// the object's keys, the total duration) and the ONE `storyboard-check.mjs` re-derives to grade this
// film against: two independent copies of "when does beat i really start" is exactly the drift
// CLAUDE.md calls a fork. A caused junction gets STAGE_S of REAL time INSERTED before it (every beat
// keeps its full planned duration; nothing is shrunk to make room). An uncaused junction is left as a
// plain absolute number: staging an undocumented cause would be inventing one, not reading one off the
// storyboard. A film with no `trigger:` at all reproduces the exact numbers it always did.
const { caused, shiftedStart, shiftedEnd } = stagedSchedule(beats);
const staged = caused.filter(Boolean).length;

// ---- one html layer per beat, or per RUN of consecutive beats sharing a `fragment:` file -----------
const [canvasW, canvasH] = sceneDims({ aspect });
const FULL_BLEED = { x: 0, y: 0, w: canvasW, h: canvasH };
const fragSpecs = beats.map((b) => parseFragmentSpec(b.fragment));
// The DEFAULT convention, unchanged: `<base>.scene<N>.html`. `fragment:` overrides it per beat; two
// consecutive beats naming the SAME override are a RUN (below), never two beats that merely happen to
// share the default (which never collide, one file per index).
// WHERE A NAMED FRAGMENT LIVES. Both spellings are real and they resolve against different roots:
// every storyboard in this repo that names one writes it ROOT-relative
// (`formats/scene/_film.beat.html`), while a bare filename means the film's own directory, which is
// the only reading that works for a film assembled outside formats/scene at all. A separator is the
// deterministic tell between them, so neither has to be guessed. Unnamed keeps the `make scenes`
// convention. A trailing parenthetical note after the path is stripped.
const fragPathOf = (i) => {
  const named = (fragSpecs[i].path || '').split(/\s+\(/)[0].trim();
  if (!named) return path.join(dir, `${base}.scene${i + 1}.html`);
  return named.includes('/') ? path.resolve(ROOT, named) : path.join(dir, named);
};
// `fragment: @ <placement>@<w>x<h>` boxes the layer instead of full-bleed. `parseEdge`'s own error
// case is already refused above (fragmentErrors), so a present edge here is always clean.
const boxOf = (i) => (fragSpecs[i].edge ? resolvePx(fragSpecs[i].edge, { aspect, destination }) : FULL_BLEED);

// RUNS: a shared `fragment:` file across consecutive beats is ONE component, alive across the cut, not
// torn down and rebuilt as two layers (that destroy/recreate is the measured cause of a film reading as
// a slideshow, docs/MISTAKES.md #603 for the truncation failure mode of the fix below). A run needs
// BOTH beats to name the SAME explicit override: the default path is unique per index and can never
// collide on its own.
const runs = [];
for (let i = 0; i < beats.length; ) {
  let j = i;
  while (j + 1 < beats.length && fragSpecs[i].path && fragSpecs[j + 1].path && fragPathOf(i) === fragPathOf(j + 1)) j++;
  runs.push([i, j]);
  i = j + 1;
}

const missing = [];
const htmlLayers = runs.map(([i, j]) => {
  const merged = j > i;
  const fragPath = fragPathOf(i);
  if (!fs.existsSync(fragPath)) missing.push(path.relative(ROOT, fragPath));
  const box = boxOf(i);

  // A PLACEMENT CHANGE INSIDE A SHARED RUN becomes a `motion` key on this ONE layer, never a second
  // layer: the whole point of the run is that the DOM never gets torn down. Keyed the same way the
  // continuous object is (scripts/lib/placement-resolve.mjs resolvePx, x/y as OFFSETS from the layer's
  // own base box, w/h absolute only when the box's size actually changes).
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

  // track:1, NEVER 0: direction-floor.mjs (and other gates) treat any track-0 layer as the backdrop
  // lane, invisible to the content-coverage checks (feature-poverty, empty-beat, ends-on-nothing all
  // read as "no content" against a track-0 fragment even though it fills the frame).
  // w/h/x/y default to the full canvas: an `html` layer with no declared box stays its wrapper's
  // default (near-zero), so a fragment written full-bleed (`position:absolute;inset:0`, the shape
  // scenes.mjs's briefs and preview-fragment.mjs both assume) would collapse to nothing at real render
  // time even though it previewed correctly (core/layers/html.js build(): w/h are the only thing that
  // sizes it). `fragment: @ <placement>` (boxOf above) is the one way to ask for less than that.
  //
  // THE MOTION PLAN, consumed here and nowhere else: a beat's `motion:` entries become `parts[]` on
  // its own scene layer, the SAME `select`/`anim` vocabulary a hand-authored parts block already takes
  // (core/motion/parts.js), so this is not a second motion mechanism, it is the storyboard filling in
  // the one the engine already has. `each`/`exitDur` come from the named speed band
  // (scripts/lib/contract.mjs SPEED_BAND), never a raw second written here.
  //
  // SPREAD WITHIN A BEAT, OFFSET ACROSS A RUN. Two separate timing problems, and both are solved with
  // the `delay` that `parts[]` already has (formats/scene/scene.js reads it as `layer.start + delay`,
  // defaulting to 0.1), so this is not a second motion mechanism.
  //
  // SPREAD: measured against a real launch film, an assembled beat goes still after its first second,
  // because every `motion:` line fires at once inside that 0.1 default. The last entry now starts near
  // the beat's own end, proportional to the beat's duration. `each`/`exitDur` are untouched, so no
  // motion is invented, only re-timed. A single entry has nothing to spread against and keeps no
  // `delay` key at all, matching every pre-existing assembled film byte for byte.
  //
  // OFFSET: a run's later beats must still fire at their OWN wall-clock second, not the run's start,
  // so their entries carry the run offset on top of their own spread.
  //
  // `rest:` was considered for the spread and rejected: it names ambient HOLD motion, the "nothing
  // ever fully stops" idle that is explicitly ruled out here. This pass only ever moves a delay the
  // storyboard's own `motion:` already implied.
  //
  // WHAT THIS CANNOT DO: a part's `out` exit is anchored to the LAYER's end
  // (`layer.start + (layer.duration - exitDur)`, same file), which for a merged run is the run's last
  // beat, not each beat's own. So only the last beat in a run keeps its exit; an earlier beat's part
  // stays on screen rather than exiting at the wrong second. Expressing a per-part exit would take an
  // engine change, and this file does not make one.
  const parts = [];
  for (let k = i; k <= j; k++) {
    const motion = parseMotion(beats[k].motion);
    if (!motion.length) continue;
    const beatDuration = +(beats[k].end - beats[k].start).toFixed(3);
    const runOffset = merged ? shiftedStart[k] - shiftedStart[i] : 0;
    motion.forEach((m, mi) => {
      const each = SPEED_BAND[m.inBand];
      const exitDur = SPEED_BAND[m.outBand];
      // The latest a part can start and still finish its entrance before its own exit begins. A beat
      // too short for that budget collapses every delay to 0: the pre-existing behaviour, never a
      // negative number.
      const maxDelay = Math.max(0, beatDuration - each - exitDur);
      const spread = motion.length > 1 ? (mi / (motion.length - 1)) * maxDelay : null;
      // Merged: always an explicit delay, and an un-spread first entry keeps the engine's own 0.1
      // lead so it lands exactly where a lone beat's layer would have put it.
      const delay = merged ? +(runOffset + (spread ?? 0.1)).toFixed(3) : (spread == null ? null : +spread.toFixed(3));
      parts.push({
        select: m.selector, anim: m.kind, each,
        ...(!merged || k === j ? { out: true } : {}),
        exitDur,
        ...(delay != null ? { delay } : {}),
      });
    });
  }

  // STAGING: `start` is the SHIFTED, fully-resolved second (shiftedStart[i]), not the raw `b.start` a
  // flat build would have used, and not the relative-start STRING form ("scene1.end+0.05")
  // layers[].start also legally accepts. Measured trying it: `make beats`'s own coverage check and
  // `motion-director.mjs` (docs/CRAFT/SUBAGENT-BUDGET.md-adjacent tooling this file does not own) both
  // read `layers[].start` as a number in several places and mishandle a string one, one of them a
  // crash. `make assemble` owns exactly one film's numbers, resolving the reference itself and writing
  // the number is the same "one source of truth" the relative form buys a hand-author, without a
  // representation the rest of the toolchain cannot yet read. `id` stays on every layer regardless:
  // it is what a human (or a future resolver) uses to name "this scene's cause" when reading the film.
  // A run's `duration` runs shiftedEnd[j]-shiftedStart[i] (spans every beat it merged); a lone beat
  // keeps the ORIGINAL `b.end - b.start` formula rather than the algebraically-equal shifted-minus-
  // shifted form, because each side of that subtraction is independently rounded to 3dp and the two
  // paths can differ by a thousandth of a second on an unstaged, non-round beat, which would break
  // the byte-identical contract for every existing film that names no new syntax.
  const duration = merged ? +(shiftedEnd[j] - shiftedStart[i]).toFixed(3) : +(beats[i].end - beats[i].start).toFixed(3);
  return {
    id: `scene${i + 1}`, type: 'html', src: path.relative(ROOT, fragPath), start: shiftedStart[i], duration, track: 1,
    x: box.x, y: box.y, w: box.w, h: box.h,
    ...(motionKeys ? { motion: motionKeys } : {}),
    ...(merged ? { acrossBeats: true } : {}),
    ...(parts.length ? { parts } : {}),
  };
});
if (missing.length) {
  console.error(`assemble: missing fragment(s), run \`make scenes D=${film}\` for the briefs and write them first:`);
  for (const m of missing) console.error(`  ✗ ${m}`);
  process.exit(1);
}

// ---- WHAT THE OBJECT IS DRAWN AS. `object: <name> -> <src>` (storyboard-parse.mjs) names the real
// layer to build instead of assemble's own placeholder rect. `.html`/`.htm` becomes an `html` layer,
// `src`-loaded like every scene fragment; anything else (a raster, or an `.svg`) becomes an `image`
// layer: the `svg` LAYER TYPE has no `src` field at all (formats/scene/schema.json: it takes `d` and
// `viewBox`, a shape baked into the JSON, never a file), so a vector file loads the same way a raster
// does, through an `<img>` tag, which renders an .svg source correctly. Getting a REAL `svg`-type layer
// (draw-on, morph) out of a vector file would mean extracting its path data at assemble time, a second
// feature this task did not ask for and this file does not attempt.
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

// ---- the continuous object: one layer, a keyed motion track derived from the contract's edges -----
const chain = edges(beats);
let objectLayer = null;
let usesSize = false, usesRot = false, usesOpacity = false, usesRadius = false;
if (chain.length) {
  const first = chain[0];
  const base0 = resolvePx(first.in, { aspect, destination });
  // THE POSE, not only the position. w/h/rot/opacity are only written into a key when the chain
  // actually USES them (differs from the object's base pose somewhere), so a film with no pose beyond
  // x/y builds the exact same track it always did. `w`/`h` are the object's real size at that edge
  // (motion[].w/h are absolute, unlike x/y which are offsets); `rot`/`opacity` are absolute too.
  usesSize = chain.some((e) => e.in.w !== base0.w || e.in.h !== base0.h || e.out.w !== base0.w || e.out.h !== base0.h);
  usesRot = chain.some((e) => e.in.rot || e.out.rot);
  // A radius is keyed only when an edge actually names one. Unstated means the object keeps the
  // corner it was built with, matching the null identity radius carries in the engine's POSE table:
  // a track that never mentions radius must not start writing one.
  usesRadius = chain.some((e) => e.in.radius != null || e.out.radius != null);
  usesOpacity = chain.some((e) => e.in.opacity !== 1 || e.out.opacity !== 1);
  // Keyed on the SHIFTED schedule, not the storyboard's raw beat.start/end: the object's arrival has to
  // land where the beat visually starts NOW, staged junctions included, or it would reach its next pose
  // before (or after) the content it hands off to actually appears.
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
    // `fill` is a rect-only prop (formats/scene/schema.json byType.rect); an html/image layer refuses
    // an unknown prop, so the placeholder's fill is dropped the moment a real source replaces it.
    ...(objectType === 'rect' ? { fill: 'var(--accent)' } : { src: objectSrcRel }),
    radius: chain[0].in.radius ?? 4,
    start: objStart, duration: +(shiftedEnd[chain.length - 1] - objStart).toFixed(3),
    // `sceneUnits: true` wraps each beat as its own unit, so nothing survives a cut unless it opts
    // out: `acrossBeats` attaches this layer to the camera instead of its beat wrapper
    // (scripts/gates/direction-floor.mjs), which is exactly what a continuous object needs to be.
    acrossBeats: true,
    motion: keys,
  };
}

// ---- bg: one window per beat, cycling the theme's own backdrop rotation --------------------------
// A THEME THAT DECLARES ITS OWN ROTATION OWNS THE DECISION, and this pass must not restate it.
// `theme.bgDefault` as an array is the render-time rotation core/backgrounds/theme-rotation.js expands
// behind `{use:"theme"}`, one window per shot. Writing the presets out here instead would fork that
// decision: the theme would say one thing and every assembled film a copy of it, drifting the moment
// the brand changed its mind. `look.backdrop` is deliberately NOT that field (docs/CRAFT/THEME-LOOK.md
// says three times it is scaffold-only and never read at render), so it stays the fallback for a theme
// that declares no rotation at all. That fallback reads the SHIFTED schedule: a staged junction moved
// where beat i actually starts, and the backdrop has to turn there too, or the ground swaps while the
// previous beat's content is still on screen. The `{use:"theme"}` branch needs no times at all, since
// the engine binds each window to the joint the film already cut.
const rotation = Array.isArray(theme && theme.bgDefault) ? theme.bgDefault : null;
const backdrop = (look.backdrop && look.backdrop.length) ? look.backdrop : ['soft', 'accent'];
const bg = rotation
  ? [{ use: 'theme' }]
  : beats.map((b, i) => ({ from: shiftedStart[i], to: shiftedEnd[i], preset: backdrop[i % backdrop.length] }));

// ---- transitions: an explicit boundary at every internal cut, since a choreographed scene (this one
// always is, once it has an object layer) is skipped by produce.js's own auto-injection -------------
// mech:"seam", not the "cut" a bare fx name defaults to: a "cut" only transforms the scene ROOT (an
// opacity ramp over the whole stack), so two beats with DIFFERENT bg presets swap hard mid-ramp rather
// than blending, which is exactly the "hard swap disguised inside a soft transition" seam-forensics.mjs
// (#seam-split) exists to catch. "seam" is the real two-scene GPU blend, so the bg crossfades too.
// ...WHEN THE FX CAN BE ONE. `look.cuts.default` is DERIVED from the theme's own pace
// (core/registry/theme-contract.js), so a brisk brand resolves to `whip`, which is cut-only, and
// pairing it with mech:"seam" wrote a scene `make validate` refuses: "whip is not a seam". Asking
// boundaryMechanism instead of assuming keeps the crossfade wherever it is available and lets a
// cut-only family through as the cut it is, rather than making every fast theme unassemblable.
// The boundary lands at the SHIFTED time for the same reason the backdrop does: the cut has to arrive
// where the new beat's content arrives, not where a flat build would have put it.
const cutFx = look.cuts.default || 'fade';
let cutMech;
try { cutMech = boundaryMechanism(cutFx, 'seam'); } catch { cutMech = undefined; }
const transitions = beats.slice(1).map((b, i) => ({ at: shiftedStart[i + 1], fx: cutFx, ...(cutMech ? { mech: cutMech } : {}) }));

// ---- ownership: what this pass generated, against what the last one (or a hand edit) left behind ----
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

const out = {
  module: 'scene',
  theme: scene.theme,
  aspect,
  ...(destination ? { destination } : {}),
  duration: shiftedEnd[shiftedEnd.length - 1],
  sceneUnits: true,
  ...(scene.authoring ? { authoring: scene.authoring } : {}),   // preserve a hand-written waiver across re-assembles
  audio: scene.audio || { auto: true },
  ...Object.fromEntries(preservedFilmFields.map((k) => [k, scene[k]])),
  bg,
  transitions,
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
if (chain.length) {
  const poseBits = [usesSize && 'size', usesRot && 'rotation', usesOpacity && 'opacity', usesRadius && 'radius'].filter(Boolean);
  console.log(`  pose: ${poseBits.length ? poseBits.join(' + ') + ' keyed alongside position' : 'position only (no beat declared a size/rot/op change)'}`);
}
console.log(`  ${staged} of ${htmlLayers.length - 1} junction(s) staged (\`trigger:\` names a cause): ${staged ? `+${STAGE_S}s each, inserted (film runs ${(staged * STAGE_S).toFixed(2)}s longer), not carved out of a beat` : 'none: no junction states a real cause'}.`);
if (staged) console.log(`  (resolved to real seconds, not left as "sceneN.end+${STAGE_S}": beats-check/motion-director read \`start\` as a number)`);
if (preservedFilmFields.length) console.log(`  preserved film-level field(s): ${preservedFilmFields.join(", ")}`);
if (!preserved.length) console.log("  no hand-authored layers to preserve: everything in this film is generated from the storyboard.");
if (preserved.length) {
  console.log(`  preserved ${preserved.length} hand-authored layer(s) this contract has no vocabulary for: ${preserved.map(nameOf).join(", ")}`);
  // A preserved layer that rides the whole film is the SHAPE of a continuous object, so it is the one
  // worth pulling back into the contract rather than leaving as a permanent exception. Saying so is
  // the point of reporting at all: the gaps in the contract become visible instead of being papered over.
  const candidates = preserved.filter((l) => l.acrossBeats);
  if (candidates.length) console.log(`  (${candidates.map(nameOf).join(", ")} spans beats: a candidate for the continuous-object contract, not a permanent exception)`);
}
if (staleWarnings.length) { console.log("  STALE:"); for (const w of staleWarnings) console.log(w); }
console.log(`  Next: make author-check D=${film}`);
