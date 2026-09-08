// assemble.mjs: `make assemble D=<film>`: ASSEMBLE. Writes the scene JSON from the storyboard's
// per-beat contract + the fragment files a scene fan-out (or one agent) already wrote:
//   - one `html` layer per scene, `src`-loaded, timed at the contract's start/end
//   - the continuous object: ONE layer with a hand-keyed `motion` track built from every beat's
//     object_in/object_out, resolved to px through the ENGINE's own resolveCoords
//     (scripts/lib/placement-resolve.mjs), never a second copy of that math
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
import { chainErrors, edges, parseMotion, motionErrors, SPEED_BAND, stagedSchedule, STAGE_S } from '../lib/contract.mjs';
import { resolvePx } from '../lib/placement-resolve.mjs';
import { resolveLook } from '../../core/registry/theme-contract.js';
import { isLightBg } from '../../core/motion/motion.js';
import { sceneDims } from '../../core/layout/safe.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const film = process.argv[2];
if (!film || !fs.existsSync(film)) { console.error('usage: node scripts/author/assemble.mjs <film.json>'); process.exit(1); }

const scene = JSON.parse(fs.readFileSync(film, 'utf8'));
const sbPath = storyboardPathFor(film);
if (!fs.existsSync(sbPath)) { console.error(`assemble: no storyboard at ${sbPath}`); process.exit(1); }
const sb = parseStoryboard(fs.readFileSync(sbPath, 'utf8'));
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

// ---- one html layer per beat ------------------------------------------------------------------
const [canvasW, canvasH] = sceneDims({ aspect });
const missing = [];
const htmlLayers = beats.map((b, i) => {
  const fragPath = path.join(dir, `${base}.scene${i + 1}.html`);
  if (!fs.existsSync(fragPath)) missing.push(path.relative(ROOT, fragPath));
  // track:1, NEVER 0: direction-floor.mjs (and other gates) treat any track-0 layer as the backdrop
  // lane, invisible to the content-coverage checks (feature-poverty, empty-beat, ends-on-nothing all
  // read as "no content" against a track-0 fragment even though it fills the frame).
  // w/h/x/y = the full canvas: an `html` layer with no declared box stays its wrapper's default
  // (near-zero), so a fragment written full-bleed (`position:absolute;inset:0`, the shape scenes.mjs's
  // briefs and preview-fragment.mjs both assume) would collapse to nothing at real render time even
  // though it previewed correctly (core/layers/html.js build(): w/h are the only thing that sizes it).
  // THE MOTION PLAN, consumed here and nowhere else: a beat's `motion:` entries become `parts[]` on
  // its own html layer, the SAME `select`/`anim` vocabulary a hand-authored parts block already takes
  // (core/motion/parts.js), so this is not a second motion mechanism, it is the storyboard filling in
  // the one the engine already has. `each`/`exitDur` come from the named speed band
  // (scripts/lib/contract.mjs SPEED_BAND), never a raw second written here.
  const motion = parseMotion(b.motion);
  const parts = motion.length ? motion.map((m) => ({
    select: m.selector, anim: m.kind, each: SPEED_BAND[m.inBand], out: true, exitDur: SPEED_BAND[m.outBand],
  })) : undefined;
  // STAGING: `start` is the SHIFTED, fully-resolved second (shiftedStart[i]), not the raw `b.start` a
  // flat build would have used, and not the relative-start STRING form ("scene1.end+0.05")
  // layers[].start also legally accepts. Measured trying it: `make beats`'s own coverage check and
  // `motion-director.mjs` (docs/CRAFT/SUBAGENT-BUDGET.md-adjacent tooling this file does not own) both
  // read `layers[].start` as a number in several places and mishandle a string one, one of them a
  // crash. `make assemble` owns exactly one film's numbers, resolving the reference itself and writing
  // the number is the same "one source of truth" the relative form buys a hand-author, without a
  // representation the rest of the toolchain cannot yet read. `id` stays on every layer regardless:
  // it is what a human (or a future resolver) uses to name "this scene's cause" when reading the film.
  return { id: `scene${i + 1}`, type: 'html', src: path.relative(ROOT, fragPath), start: shiftedStart[i], duration: +(b.end - b.start).toFixed(3), track: 1, x: 0, y: 0, w: canvasW, h: canvasH, ...(parts ? { parts } : {}) };
});
if (missing.length) {
  console.error(`assemble: missing fragment(s), run \`make scenes D=${film}\` for the briefs and write them first:`);
  for (const m of missing) console.error(`  ✗ ${m}`);
  process.exit(1);
}

// ---- the continuous object: one layer, a keyed motion track derived from the contract's edges -----
const chain = edges(beats);
let objectLayer = null;
let usesSize = false, usesRot = false, usesOpacity = false;
if (chain.length) {
  const first = chain[0];
  const base0 = resolvePx(first.in, { aspect, destination });
  // THE POSE, not only the position. w/h/rot/opacity are only written into a key when the chain
  // actually USES them (differs from the object's base pose somewhere), so a film with no pose beyond
  // x/y builds the exact same track it always did. `w`/`h` are the object's real size at that edge
  // (motion[].w/h are absolute, unlike x/y which are offsets); `rot`/`opacity` are absolute too.
  usesSize = chain.some((e) => e.in.w !== base0.w || e.in.h !== base0.h || e.out.w !== base0.w || e.out.h !== base0.h);
  usesRot = chain.some((e) => e.in.rot || e.out.rot);
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
    if (keys.length && keys[keys.length - 1].t === tt) keys[keys.length - 1] = key;
    else keys.push(key);
  };
  chain.forEach((e, i) => { pushKey(shiftedStart[i], e.in); pushKey(shiftedEnd[i], e.out); });
  objectLayer = {
    type: 'rect', track: 5, x: base0.x, y: base0.y, w: base0.w, h: base0.h,
    fill: 'var(--accent)', radius: 4,
    start: objStart, duration: +(shiftedEnd[chain.length - 1] - objStart).toFixed(3),
    // `sceneUnits: true` wraps each beat as its own unit, so nothing survives a cut unless it opts
    // out: `acrossBeats` attaches this layer to the camera instead of its beat wrapper
    // (scripts/gates/direction-floor.mjs), which is exactly what a continuous object needs to be.
    acrossBeats: true,
    motion: keys,
  };
}

// ---- bg: one window per beat, cycling the theme's own backdrop rotation --------------------------
// From the SHIFTED schedule: a staged junction moved where beat i actually starts, and the backdrop
// window has to change there too, or the bg would swap while the old beat's content is still on screen.
const backdrop = (look.backdrop && look.backdrop.length) ? look.backdrop : ['soft', 'accent'];
const bg = beats.map((b, i) => ({ from: shiftedStart[i], to: shiftedEnd[i], preset: backdrop[i % backdrop.length] }));

// ---- transitions: an explicit boundary at every internal cut, since a choreographed scene (this one
// always is, once it has an object layer) is skipped by produce.js's own auto-injection -------------
// mech:"seam", not the "cut" a bare fx name defaults to: a "cut" only transforms the scene ROOT (an
// opacity ramp over the whole stack), so two beats with DIFFERENT bg presets swap hard mid-ramp rather
// than blending, which is exactly the "hard swap disguised inside a soft transition" seam-forensics.mjs
// (#seam-split) exists to catch. "seam" is the real two-scene GPU blend, so the bg crossfades too.
// At the SHIFTED time, same reason as bg above: the cut has to land where the new beat's content does.
const transitions = beats.slice(1).map((b, i) => ({ at: shiftedStart[i + 1], fx: look.cuts.default || 'fade', mech: 'seam' }));

const out = {
  module: 'scene',
  theme: scene.theme,
  aspect,
  ...(destination ? { destination } : {}),
  duration: shiftedEnd[shiftedEnd.length - 1],
  sceneUnits: true,
  ...(scene.authoring ? { authoring: scene.authoring } : {}),   // preserve a hand-written waiver across re-assembles
  audio: scene.audio || { auto: true },
  bg,
  transitions,
  layers: objectLayer ? [...htmlLayers, objectLayer] : htmlLayers,
};

fs.writeFileSync(film, JSON.stringify(out, null, 1) + '\n');
console.log(`✓ assemble: ${beats.length} scene(s) → ${film}`);
console.log(`  ${htmlLayers.length} html fragment(s), ${objectLayer ? '1 continuous-object layer (' + chain[0].in.placement + ' → ' + chain[chain.length - 1].out.placement + ')' : 'no continuous object (film named none)'}`);
console.log(`  ${transitions.length} transition(s), bg turns through: ${backdrop.slice(0, beats.length).join(' → ')}`);
const motionCount = htmlLayers.reduce((n, l) => n + (l.parts ? l.parts.length : 0), 0);
console.log(`  ${motionCount} motion-plan entr${motionCount === 1 ? 'y' : 'ies'} from the storyboard (\`motion:\`), built into ${htmlLayers.filter((l) => l.parts).length} scene(s)' \`parts\``);
if (chain.length) {
  const poseBits = [usesSize && 'size', usesRot && 'rotation', usesOpacity && 'opacity'].filter(Boolean);
  console.log(`  pose: ${poseBits.length ? poseBits.join(' + ') + ' keyed alongside position' : 'position only (no beat declared a size/rot/op change)'}`);
}
console.log(`  ${staged} of ${htmlLayers.length - 1} junction(s) staged (\`trigger:\` names a cause): ${staged ? `+${STAGE_S}s each, inserted (film runs ${(staged * STAGE_S).toFixed(2)}s longer), not carved out of a beat` : 'none: no junction states a real cause'}.`);
if (staged) console.log(`  (resolved to real seconds, not left as "sceneN.end+${STAGE_S}": beats-check/motion-director read \`start\` as a number)`);
console.log(`  Next: make author-check D=${film}`);
